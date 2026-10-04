import { z } from "zod";
import { isValidISODate } from "./dates";
import { buildIndex, findCycle, uncostedConsumptions } from "./engine";
import type { AppData } from "./types";

const isoDate = z.string().refine(isValidISODate, "Fecha inválida (YYYY-MM-DD)");
const ref = z.object({ kind: z.enum(["food", "recipe"]), id: z.string().min(1) });

const priceEntry = z.object({
  id: z.string().min(1),
  date: isoDate,
  presentation: z.string(),
  presentationQty: z.number().positive(),
  price: z.number().nonnegative(),
});

const macros = z.object({
  kcal: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
});

const food = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  unit: z.enum(["g", "ml", "unidad"]),
  prices: z.array(priceEntry),
  macros: macros.optional(),
});

const recipe = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  yields: z.number().positive(),
  items: z.array(z.object({ id: z.string().min(1), ref, qty: z.number().positive() })),
});

const consumption = z.object({
  id: z.string().min(1),
  date: isoDate,
  ref,
  qty: z.number().positive(),
});

export const exportLevels = ["foods", "recipes", "all"] as const;
export type ExportLevel = (typeof exportLevels)[number];

export const exportFileSchema = z.object({
  app: z.literal("trackeo-alimentos"),
  version: z.literal(1),
  level: z.enum(exportLevels),
  exportedAt: z.string(),
  data: z.object({
    foods: z.array(food),
    recipes: z.array(recipe).optional(),
    consumptions: z.array(consumption).optional(),
    settings: z.object({ typicalDayRecipeId: z.string().optional() }).optional(),
  }),
});

export type ExportFile = z.infer<typeof exportFileSchema>;

/** Valida integridad referencial y reglas de negocio. Devuelve la lista de errores (vacía = OK). */
export function validateData(data: AppData): string[] {
  const errors: string[] = [];
  const index = buildIndex(data);

  const dupes = (ids: string[], what: string) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`${what} con id duplicado: ${id}`);
      seen.add(id);
    }
  };
  dupes(data.foods.map((f) => f.id), "Alimento");
  dupes(data.recipes.map((r) => r.id), "Receta");
  dupes(data.consumptions.map((c) => c.id), "Consumo");

  const names = new Set<string>();
  for (const n of [...data.foods, ...data.recipes].map((x) => x.name.trim().toLowerCase())) {
    if (names.has(n)) errors.push(`Nombre repetido entre alimentos/recetas: "${n}"`);
    names.add(n);
  }

  const exists = (r: { kind: string; id: string }) =>
    r.kind === "food" ? index.foods.has(r.id) : index.recipes.has(r.id);

  for (const r of data.recipes) {
    for (const item of r.items) {
      if (!exists(item.ref)) errors.push(`La receta "${r.name}" usa un ingrediente inexistente`);
    }
  }
  const cycle = findCycle(data.recipes);
  if (cycle) {
    const path = cycle.map((id) => index.recipes.get(id)?.name ?? id).join(" → ");
    errors.push(`Dependencia cíclica entre recetas: ${path}`);
  }

  for (const c of data.consumptions) {
    if (!exists(c.ref)) errors.push(`Consumo del ${c.date} referencia un ítem inexistente`);
  }
  if (!cycle && errors.length === 0) {
    const uncosted = uncostedConsumptions(data);
    if (uncosted.length) {
      errors.push(
        `${uncosted.length} consumo(s) con fecha anterior al primer precio de algún alimento (ej. ${uncosted[0].date})`,
      );
    }
  }

  const typical = data.settings.typicalDayRecipeId;
  if (typical && !index.recipes.has(typical)) errors.push("La receta de día tipo no existe");

  return errors;
}

"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  buildIndex,
  findCycle,
  refName,
  uncostedConsumptions,
  unlinkConsumption,
  usagesOf,
} from "./engine";
import { formatDate } from "./format";
import { newId } from "./id";
import type { AppData, Consumption, Food, ISODate, Recipe, Ref } from "./types";
import { EMPTY_DATA } from "./types";

/** null = OK; string = mensaje de error para mostrar. */
export type ActionResult = string | null;

interface Store {
  data: AppData;
  upsertFood: (food: Food) => ActionResult;
  deleteFood: (id: string) => ActionResult;
  upsertRecipe: (recipe: Recipe) => ActionResult;
  deleteRecipe: (id: string) => ActionResult;
  addConsumption: (c: Omit<Consumption, "id">) => ActionResult;
  updateConsumption: (c: Consumption) => ActionResult;
  deleteConsumption: (id: string) => void;
  copyDay: (from: ISODate, to: ISODate) => ActionResult;
  unlinkConsumption: (id: string) => ActionResult;
  setTypicalDay: (recipeId: string | undefined) => void;
  replaceAll: (data: AppData) => void;
}

function nameTaken(data: AppData, name: string, exceptId: string): boolean {
  const n = name.trim().toLowerCase();
  return [...data.foods, ...data.recipes].some(
    (x) => x.id !== exceptId && x.name.trim().toLowerCase() === n,
  );
}

/** Reglas que deben cumplirse después de cualquier cambio. */
function checkTransition(prev: AppData, next: AppData): ActionResult {
  const cycle = findCycle(next.recipes);
  if (cycle) {
    const index = buildIndex(next);
    const path = cycle.map((id) => refName(index, { kind: "recipe", id })).join(" → ");
    return `Dependencia cíclica: ${path}`;
  }
  const before = new Set(uncostedConsumptions(prev).map((c) => c.id));
  const broken = uncostedConsumptions(next).filter((c) => !before.has(c.id));
  if (broken.length) {
    const index = buildIndex(next);
    const ex = broken[0];
    return (
      `Quedaría${broken.length > 1 ? `n ${broken.length} consumos` : " 1 consumo"} sin precio vigente ` +
      `(ej. ${formatDate(ex.date)} – ${refName(index, ex.ref)}). ` +
      `No se puede consumir un alimento antes de su primera fecha de precio.`
    );
  }
  return null;
}

function describeUsages(data: AppData, ref: Ref): string | null {
  const u = usagesOf(data, ref);
  const parts: string[] = [];
  if (u.recipes.length) parts.push(`recetas: ${u.recipes.map((r) => r.name).join(", ")}`);
  if (u.consumptions.length) parts.push(`${u.consumptions.length} consumo(s) registrados`);
  return parts.length ? `Está en uso (${parts.join("; ")}).` : null;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      /** Aplica el cambio solo si cumple las reglas. */
      const commit = (next: AppData): ActionResult => {
        const error = checkTransition(get().data, next);
        if (!error) set({ data: next });
        return error;
      };

      return {
        data: EMPTY_DATA,

        upsertFood: (food) => {
          const { data } = get();
          if (!food.name.trim()) return "El nombre es obligatorio.";
          if (nameTaken(data, food.name, food.id)) return `Ya existe "${food.name.trim()}".`;
          const prev = data.foods.find((f) => f.id === food.id);
          if (prev && prev.unit !== food.unit && describeUsages(data, { kind: "food", id: food.id })) {
            return "No se puede cambiar la unidad de un alimento que ya está en uso.";
          }
          for (const p of food.prices) {
            if (!(p.presentationQty > 0)) return "La cantidad por presentación debe ser mayor a 0.";
            if (!(p.price >= 0)) return "El precio no puede ser negativo.";
          }
          const dates = food.prices.map((p) => p.date);
          if (new Set(dates).size !== dates.length) return "Hay dos precios con la misma fecha.";
          const clean = { ...food, name: food.name.trim() };
          return commit({
            ...data,
            foods: prev
              ? data.foods.map((f) => (f.id === food.id ? clean : f))
              : [...data.foods, clean],
          });
        },

        deleteFood: (id) => {
          const { data } = get();
          const used = describeUsages(data, { kind: "food", id });
          if (used) return `No se puede eliminar. ${used}`;
          return commit({ ...data, foods: data.foods.filter((f) => f.id !== id) });
        },

        upsertRecipe: (recipe) => {
          const { data } = get();
          if (!recipe.name.trim()) return "El nombre es obligatorio.";
          if (nameTaken(data, recipe.name, recipe.id)) return `Ya existe "${recipe.name.trim()}".`;
          if (!(recipe.yields > 0)) return "Las porciones que rinde deben ser mayores a 0.";
          if (recipe.items.some((i) => !(i.qty > 0))) return "Todas las cantidades deben ser mayores a 0.";
          const exists = data.recipes.some((r) => r.id === recipe.id);
          const clean = { ...recipe, name: recipe.name.trim() };
          return commit({
            ...data,
            recipes: exists
              ? data.recipes.map((r) => (r.id === recipe.id ? clean : r))
              : [...data.recipes, clean],
          });
        },

        deleteRecipe: (id) => {
          const { data } = get();
          const used = describeUsages(data, { kind: "recipe", id });
          if (used) return `No se puede eliminar. ${used}`;
          return commit({
            ...data,
            recipes: data.recipes.filter((r) => r.id !== id),
            settings:
              data.settings.typicalDayRecipeId === id
                ? { ...data.settings, typicalDayRecipeId: undefined }
                : data.settings,
          });
        },

        addConsumption: (c) => {
          if (!(c.qty > 0)) return "La cantidad debe ser mayor a 0.";
          const { data } = get();
          return commit({ ...data, consumptions: [...data.consumptions, { ...c, id: newId() }] });
        },

        updateConsumption: (c) => {
          if (!(c.qty > 0)) return "La cantidad debe ser mayor a 0.";
          const { data } = get();
          return commit({
            ...data,
            consumptions: data.consumptions.map((x) => (x.id === c.id ? c : x)),
          });
        },

        deleteConsumption: (id) => {
          const { data } = get();
          set({ data: { ...data, consumptions: data.consumptions.filter((c) => c.id !== id) } });
        },

        copyDay: (from, to) => {
          const { data } = get();
          const rows = data.consumptions.filter((c) => c.date === from);
          if (!rows.length) return `No hay consumos el ${formatDate(from)}.`;
          return commit({
            ...data,
            consumptions: [
              ...data.consumptions,
              ...rows.map((c) => ({ ...c, id: newId(), date: to })),
            ],
          });
        },

        unlinkConsumption: (id) => {
          const { data } = get();
          const c = data.consumptions.find((x) => x.id === id);
          if (!c || c.ref.kind !== "recipe") return null;
          const replacement = unlinkConsumption(buildIndex(data), c);
          const pos = data.consumptions.indexOf(c);
          const consumptions = [...data.consumptions];
          consumptions.splice(pos, 1, ...replacement);
          return commit({ ...data, consumptions });
        },

        setTypicalDay: (recipeId) => {
          const { data } = get();
          set({ data: { ...data, settings: { ...data.settings, typicalDayRecipeId: recipeId } } });
        },

        replaceAll: (data) => set({ data }),
      };
    },
    {
      name: "trackeo-alimentos:v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ data: s.data }),
    },
  ),
);

export const useData = () => useStore((s) => s.data);

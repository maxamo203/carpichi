"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, NumberInput } from "@/components/common";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EditorSheet } from "@/components/editor-sheet";
import { RefPicker } from "@/components/ref-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayISO } from "@/lib/dates";
import {
  buildIndex,
  CycleError,
  costOfExpansion,
  expand,
  macrosOfExpansion,
  refName,
  refUnit,
  usagesOf,
  wouldCreateCycle,
} from "@/lib/engine";
import { formatMoney, formatQty, unitLabel } from "@/lib/format";
import { newId } from "@/lib/id";
import { useData, useStore } from "@/lib/store";
import type { Recipe, Ref } from "@/lib/types";

interface ItemDraft {
  id: string;
  ref: Ref | null;
  qty: number | null;
}

export function RecipeEditor({ recipeId, onClose }: { recipeId: string | "new" | null; onClose: () => void }) {
  return recipeId !== null ? <RecipeForm key={recipeId} recipeId={recipeId} onClose={onClose} /> : null;
}

function RecipeForm({ recipeId, onClose }: { recipeId: string; onClose: () => void }) {
  const data = useData();
  const upsertRecipe = useStore((s) => s.upsertRecipe);
  const deleteRecipe = useStore((s) => s.deleteRecipe);
  const existing = recipeId === "new" ? undefined : data.recipes.find((r) => r.id === recipeId);
  const [id] = useState(() => existing?.id ?? newId());
  const [name, setName] = useState(existing?.name ?? "");
  const [yields, setYields] = useState<number | null>(existing?.yields ?? 1);
  const [items, setItems] = useState<ItemDraft[]>(
    existing?.items ?? [{ id: newId(), ref: null, qty: null }],
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const today = todayISO();
  const index = buildIndex(data);

  const updateItem = (itemId: string, patch: Partial<ItemDraft>) =>
    setItems((xs) => xs.map((x) => (x.id === itemId ? { ...x, ...patch } : x)));

  const cycleReason = (ref: Ref) =>
    wouldCreateCycle(index, id, ref) ? "crearía un ciclo" : null;

  // Vista previa con el borrador aplicado (costo a hoy, macros, desglose).
  const preview = useMemo(() => {
    const draft: Recipe = {
      id,
      name,
      yields: yields && yields > 0 ? yields : 1,
      items: items
        .filter((i): i is ItemDraft & { ref: Ref; qty: number } => !!i.ref && !!i.qty && i.qty > 0)
        .map((i) => ({ id: i.id, ref: i.ref, qty: i.qty })),
    };
    const draftData = {
      foods: data.foods,
      recipes: [...data.recipes.filter((r) => r.id !== id), draft],
    };
    const idx = buildIndex(draftData);
    try {
      const perPortion = expand(idx, { kind: "recipe", id }, 1);
      const itemCosts = new Map(
        draft.items.map((i) => [i.id, costOfExpansion(idx, expand(idx, i.ref, i.qty), today)]),
      );
      return {
        idx,
        perPortion,
        cost: costOfExpansion(idx, perPortion, today),
        macros: macrosOfExpansion(idx, perPortion),
        itemCosts,
        yields: draft.yields,
      };
    } catch (e) {
      if (e instanceof CycleError) return null;
      throw e;
    }
  }, [data, id, name, yields, items, today]);

  const usages = existing ? usagesOf(data, { kind: "recipe", id: existing.id }) : null;

  const save = () => {
    const valid = items.filter((i) => i.ref);
    if (valid.length === 0) return toast.error("Agregá al menos un ingrediente.");
    if (valid.some((i) => !i.qty || i.qty <= 0)) return toast.error("Completá las cantidades.");
    if (!yields || yields <= 0) return toast.error("Las porciones que rinde deben ser mayores a 0.");
    const error = upsertRecipe({
      id,
      name,
      yields,
      items: valid.map((i) => ({ id: i.id, ref: i.ref!, qty: i.qty! })),
    });
    if (error) return toast.error(error);
    toast.success(existing ? "Receta actualizada" : "Receta creada");
    onClose();
  };

  return (
    <EditorSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={existing ? existing.name : "Nueva receta"}
      description="Los ingredientes pueden ser alimentos u otras recetas (en porciones). Un día completo también puede ser una receta."
      footer={
        <>
          <div>
            {existing && (
              <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2Icon /> Eliminar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={save}>Guardar</Button>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
          <Field label="Nombre">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus={!existing} />
          </Field>
          <Field label="Porciones que rinde">
            <NumberInput value={yields} onChange={setYields} />
          </Field>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium">Ingredientes</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItems((xs) => [...xs, { id: newId(), ref: null, qty: null }])}
            >
              <PlusIcon /> Agregar
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const cost = preview?.itemCosts.get(item.id);
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_6rem_3.5rem_2rem] items-center gap-2 sm:grid-cols-[1fr_6rem_3.5rem_6rem_2rem]"
                >
                  <RefPicker
                    value={item.ref}
                    onChange={(ref) => updateItem(item.id, { ref })}
                    disabledReason={cycleReason}
                  />
                  <NumberInput
                    aria-label="Cantidad"
                    value={item.qty}
                    onChange={(qty) => updateItem(item.id, { qty })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.ref ? unitLabel(refUnit(index, item.ref)) : ""}
                  </span>
                  <span className="tabular hidden text-right text-sm text-muted-foreground sm:block">
                    {cost ? (cost.ok ? formatMoney(cost.total) : "sin precio") : ""}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Quitar ingrediente"
                    onClick={() => setItems((xs) => xs.filter((x) => x.id !== item.id))}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {preview && (
          <section className="grid gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase">Costo total (hoy)</div>
              <div className="tabular text-lg font-semibold">
                {formatMoney(preview.cost.total * preview.yields)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase">Costo por porción</div>
              <div className="tabular text-lg font-semibold">{formatMoney(preview.cost.total)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase">Por porción</div>
              <div className="tabular text-sm">
                {preview.macros.incomplete.length === preview.perPortion.foods.size
                  ? "Sin macros cargados"
                  : `${formatQty(preview.macros.macros.kcal, 0)} kcal · P ${formatQty(preview.macros.macros.protein, 1)} · ` +
                    `C ${formatQty(preview.macros.macros.carbs, 1)} · G ${formatQty(preview.macros.macros.fat, 1)}`}
              </div>
              {preview.macros.incomplete.length > 0 && preview.macros.incomplete.length < preview.perPortion.foods.size && (
                <div className="text-xs text-muted-foreground">
                  Sin macros: {preview.macros.incomplete.map((f) => refName(preview.idx, { kind: "food", id: f })).join(", ")}
                </div>
              )}
            </div>
            {!preview.cost.ok && preview.cost.missingPrice.length > 0 && (
              <p className="text-sm text-amber-600 sm:col-span-3">
                Sin precio vigente hoy:{" "}
                {preview.cost.missingPrice.map((f) => refName(preview.idx, { kind: "food", id: f })).join(", ")}
              </p>
            )}
          </section>
        )}

        {preview && preview.perPortion.foods.size > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Ingredientes base por porción</summary>
            <table className="mt-2 w-full">
              <tbody>
                {[...preview.perPortion.foods.entries()].map(([foodId, qty]) => (
                  <tr key={foodId} className="border-b last:border-0">
                    <td className="py-1">{refName(preview.idx, { kind: "food", id: foodId })}</td>
                    <td className="tabular py-1 text-right">
                      {formatQty(qty)} {unitLabel(refUnit(preview.idx, { kind: "food", id: foodId }))}
                    </td>
                    <td className="tabular py-1 text-right text-muted-foreground">
                      {preview.cost.byFood.has(foodId) ? formatMoney(preview.cost.byFood.get(foodId)!) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}

        {usages && (usages.recipes.length > 0 || usages.consumptions.length > 0) && (
          <section className="text-sm text-muted-foreground">
            <h3 className="mb-1 font-medium text-foreground">Usada en</h3>
            {usages.recipes.length > 0 && <p>Recetas: {usages.recipes.map((r) => r.name).join(", ")}</p>}
            {usages.consumptions.length > 0 && (
              <p>{usages.consumptions.length} consumo(s) — editar la receta cambia el costo de esos días.</p>
            )}
          </section>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`¿Eliminar "${existing?.name}"?`}
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          const error = deleteRecipe(existing!.id);
          if (error) return toast.error(error);
          toast.success("Receta eliminada");
          onClose();
        }}
      />
    </EditorSheet>
  );
}

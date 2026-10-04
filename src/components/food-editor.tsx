"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Field, NativeSelect, NumberInput } from "@/components/common";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EditorSheet } from "@/components/editor-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isValidISODate, todayISO } from "@/lib/dates";
import { usagesOf } from "@/lib/engine";
import { formatMoney, unitLabel } from "@/lib/format";
import { newId } from "@/lib/id";
import { useData, useStore } from "@/lib/store";
import type { Food, Macros, Unit } from "@/lib/types";

interface PriceDraft {
  id: string;
  date: string;
  presentation: string;
  presentationQty: number | null;
  price: number | null;
}

type MacrosDraft = Record<keyof Macros, number | null>;

const MACRO_FIELDS: { key: keyof Macros; label: string }[] = [
  { key: "kcal", label: "kcal" },
  { key: "protein", label: "Proteínas (g)" },
  { key: "carbs", label: "Carbohidratos (g)" },
  { key: "fat", label: "Grasas (g)" },
];

/** `foodId`: id a editar, "new" para crear, null cerrado. El form se remonta por id para reiniciar el borrador. */
export function FoodEditor({ foodId, onClose }: { foodId: string | "new" | null; onClose: () => void }) {
  return foodId !== null ? <FoodForm key={foodId} foodId={foodId} onClose={onClose} /> : null;
}

function FoodForm({ foodId, onClose }: { foodId: string; onClose: () => void }) {
  const data = useData();
  const upsertFood = useStore((s) => s.upsertFood);
  const deleteFood = useStore((s) => s.deleteFood);
  const existing = foodId === "new" ? undefined : data.foods.find((f) => f.id === foodId);

  const [name, setName] = useState(existing?.name ?? "");
  const [unit, setUnit] = useState<Unit>(existing?.unit ?? "g");
  const [macros, setMacros] = useState<MacrosDraft | null>(existing?.macros ?? null);
  const [prices, setPrices] = useState<PriceDraft[]>(
    existing
      ? [...existing.prices].sort((a, b) => a.date.localeCompare(b.date))
      : [{ id: newId(), date: todayISO(), presentation: "", presentationQty: null, price: null }],
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const usages = existing ? usagesOf(data, { kind: "food", id: existing.id }) : null;
  const inUse = !!usages && (usages.recipes.length > 0 || usages.consumptions.length > 0);
  const u = unitLabel(unit);

  const updatePrice = (id: string, patch: Partial<PriceDraft>) =>
    setPrices((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const addPrice = () => {
    const last = [...prices].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
    setPrices((ps) => [
      ...ps,
      {
        id: newId(),
        date: todayISO(),
        presentation: last?.presentation ?? "",
        presentationQty: last?.presentationQty ?? null,
        price: last?.price ?? null,
      },
    ]);
  };

  const save = () => {
    for (const p of prices) {
      if (!isValidISODate(p.date)) return toast.error("Hay un precio con fecha inválida.");
      if (p.presentationQty == null || p.price == null)
        return toast.error("Completá cantidad y precio de cada presentación.");
    }
    let m: Macros | undefined;
    if (macros) {
      if (Object.values(macros).some((v) => v == null || v < 0))
        return toast.error("Completá los macros o quitálos.");
      m = macros as Macros;
    }
    const food: Food = {
      id: existing?.id ?? newId(),
      name,
      unit,
      macros: m,
      prices: prices
        .map((p) => ({ ...p, presentation: p.presentation.trim(), presentationQty: p.presentationQty!, price: p.price! }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
    const error = upsertFood(food);
    if (error) return toast.error(error);
    toast.success(existing ? "Alimento actualizado" : "Alimento creado");
    onClose();
  };

  return (
    <EditorSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={existing ? existing.name : "Nuevo alimento"}
      description="Los consumos usan el precio vigente a su fecha. No se puede consumir antes del primer precio."
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
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Nombre">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus={!existing} />
          </Field>
          <Field label="Unidad base" hint={inUse ? "En uso: no se puede cambiar" : undefined}>
            <NativeSelect value={unit} disabled={inUse} onChange={(e) => setUnit(e.target.value as Unit)}>
              <option value="g">gramos (g)</option>
              <option value="ml">mililitros (ml)</option>
              <option value="unidad">unidad</option>
            </NativeSelect>
          </Field>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium">Historial de precios</h3>
            <Button variant="outline" size="sm" onClick={addPrice}>
              <PlusIcon /> Agregar precio
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <div className="hidden grid-cols-[8.5rem_1fr_6rem_7rem_5.5rem_2rem] gap-2 px-1 text-xs text-muted-foreground sm:grid">
              <span>Desde</span>
              <span>Presentación</span>
              <span className="text-right">Cantidad ({u})</span>
              <span className="text-right">Precio</span>
              <span className="text-right">$ / {u}</span>
              <span />
            </div>
            {prices.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-2 items-center gap-2 rounded-lg border p-2 sm:grid-cols-[8.5rem_1fr_6rem_7rem_5.5rem_2rem] sm:border-0 sm:p-0"
              >
                <Input
                  type="date"
                  value={p.date}
                  onChange={(e) => updatePrice(p.id, { date: e.target.value })}
                />
                <Input
                  placeholder="ej. Paquete 500 g"
                  value={p.presentation}
                  onChange={(e) => updatePrice(p.id, { presentation: e.target.value })}
                />
                <NumberInput
                  aria-label="Cantidad por presentación"
                  value={p.presentationQty}
                  onChange={(n) => updatePrice(p.id, { presentationQty: n })}
                />
                <NumberInput
                  aria-label="Precio"
                  value={p.price}
                  onChange={(n) => updatePrice(p.id, { price: n })}
                />
                <span className="tabular text-right text-sm text-muted-foreground">
                  {p.price != null && p.presentationQty ? formatMoney(p.price / p.presentationQty) : "—"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar precio"
                  onClick={() => setPrices((ps) => ps.filter((x) => x.id !== p.id))}
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))}
            {prices.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin precios: no se va a poder registrar su consumo.</p>
            )}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium">
              Macros <span className="text-sm font-normal text-muted-foreground">(por {unit === "unidad" ? "unidad" : `100 ${unit}`}, opcional)</span>
            </h3>
            {macros ? (
              <Button variant="ghost" size="sm" onClick={() => setMacros(null)}>
                Quitar
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMacros({ kcal: null, protein: null, carbs: null, fat: null })}
              >
                <PlusIcon /> Cargar macros
              </Button>
            )}
          </div>
          {macros && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {MACRO_FIELDS.map(({ key, label }) => (
                <Field key={key} label={label}>
                  <NumberInput
                    value={macros[key]}
                    onChange={(n) => setMacros((m) => (m ? { ...m, [key]: n } : m))}
                  />
                </Field>
              ))}
            </div>
          )}
        </section>

        {usages && inUse && (
          <section className="text-sm text-muted-foreground">
            <h3 className="mb-1 font-medium text-foreground">En uso</h3>
            {usages.recipes.length > 0 && <p>Recetas: {usages.recipes.map((r) => r.name).join(", ")}</p>}
            {usages.consumptions.length > 0 && <p>{usages.consumptions.length} consumo(s) registrados</p>}
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
          const error = deleteFood(existing!.id);
          if (error) return toast.error(error);
          toast.success("Alimento eliminado");
          onClose();
        }}
      />
    </EditorSheet>
  );
}

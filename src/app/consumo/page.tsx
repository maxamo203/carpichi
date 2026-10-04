"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  LinkIcon,
  PlusIcon,
  Trash2Icon,
  UnlinkIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { NumberInput, PageHeader } from "@/components/common";
import { RefPicker } from "@/components/ref-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addDays, isValidISODate, monthOf, todayISO } from "@/lib/dates";
import {
  buildIndex,
  costAt,
  earliestDate,
  macrosOf,
  refName,
  refUnit,
  type Index,
} from "@/lib/engine";
import { formatDate, formatDateLong, formatMoney, formatMonth, formatQty, unitLabel } from "@/lib/format";
import { useData, useStore } from "@/lib/store";
import type { Consumption, ISODate, Ref } from "@/lib/types";
import { cn } from "@/lib/utils";

function missingPriceMessage(index: Index, ref: Ref, date: ISODate): string | null {
  const cost = costAt(index, ref, 1, date);
  if (cost.ok) return null;
  const first = earliestDate(index, ref);
  const names = cost.missingPrice.map((id) => refName(index, { kind: "food", id })).join(", ");
  if (first === null) return `Sin precio cargado para: ${names}.`;
  return `No hay precio vigente al ${formatDate(date)} para ${names}. Se puede registrar desde el ${formatDate(first!)}.`;
}

export default function ConsumoPage() {
  const data = useData();
  const { addConsumption, updateConsumption, deleteConsumption, unlinkConsumption } = useStore();
  const [date, setDate] = useState<ISODate>(todayISO());
  const [copyOpen, setCopyOpen] = useState(false);
  const index = buildIndex(data);

  const rows = useMemo(
    () => data.consumptions.filter((c) => c.date === date),
    [data.consumptions, date],
  );

  const dayTotals = useMemo(() => {
    const idx = buildIndex(data);
    const totals = new Map<ISODate, number>();
    for (const c of data.consumptions) {
      totals.set(c.date, (totals.get(c.date) ?? 0) + costAt(idx, c.ref, c.qty, c.date).total);
    }
    return totals;
  }, [data]);

  const month = monthOf(date);
  const monthDays = [...dayTotals.entries()]
    .filter(([d]) => monthOf(d) === month)
    .sort(([a], [b]) => b.localeCompare(a));
  const monthTotal = monthDays.reduce((s, [, t]) => s + t, 0);
  const dayTotal = dayTotals.get(date) ?? 0;

  const dayMacros = rows.reduce(
    (acc, c) => {
      const m = macrosOf(index, c.ref, c.qty);
      acc.kcal += m.macros.kcal;
      acc.protein += m.macros.protein;
      acc.carbs += m.macros.carbs;
      acc.fat += m.macros.fat;
      acc.incomplete ||= m.incomplete.length > 0;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0, incomplete: false },
  );

  return (
    <>
      <PageHeader
        title="Consumo diario"
        description="Registrá lo que comiste cada día. Las recetas quedan vinculadas: si editás la receta, cambian todos los días que la usan."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Día anterior" onClick={() => setDate(addDays(date, -1))}>
              <ChevronLeftIcon />
            </Button>
            <Input
              type="date"
              className="w-40"
              value={date}
              onChange={(e) => isValidISODate(e.target.value) && setDate(e.target.value)}
            />
            <Button variant="outline" size="icon" aria-label="Día siguiente" onClick={() => setDate(addDays(date, 1))}>
              <ChevronRightIcon />
            </Button>
            <Button variant="ghost" onClick={() => setDate(todayISO())}>
              Hoy
            </Button>
            <span className="text-sm text-muted-foreground">{formatDateLong(date)}</span>
            <Button variant="outline" className="ml-auto" onClick={() => setCopyOpen(true)}>
              <CopyIcon /> Copiar desde otro día
            </Button>
          </div>

          <div className="rounded-xl border">
            <div className="divide-y">
              {rows.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">Sin consumos este día.</p>
              )}
              {rows.map((c) => (
                <ConsumptionRow
                  key={c.id}
                  c={c}
                  index={index}
                  onChange={(qty) => {
                    const error = updateConsumption({ ...c, qty });
                    if (error) toast.error(error);
                  }}
                  onDelete={() => deleteConsumption(c.id)}
                  onUnlink={() => {
                    const error = unlinkConsumption(c.id);
                    if (error) toast.error(error);
                    else toast.success(`"${refName(index, c.ref)}" desvinculada: ahora son filas independientes`);
                  }}
                />
              ))}
            </div>
            <AddRow
              key={date}
              date={date}
              index={index}
              onAdd={(ref, qty) => {
                const error = addConsumption({ date, ref, qty });
                if (error) toast.error(error);
                return !error;
              }}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                {dayMacros.kcal + dayMacros.protein + dayMacros.carbs + dayMacros.fat > 0 && (
                  <>
                    {formatQty(dayMacros.kcal, 0)} kcal · P {formatQty(dayMacros.protein, 0)} g · C{" "}
                    {formatQty(dayMacros.carbs, 0)} g · G {formatQty(dayMacros.fat, 0)} g
                    {dayMacros.incomplete && " (hay alimentos sin macros)"}
                  </>
                )}
              </span>
              <span className="tabular text-base font-semibold">Total del día: {formatMoney(dayTotal)}</span>
            </div>
          </div>
        </div>

        <aside className="rounded-xl border p-4">
          <h2 className="font-medium capitalize">{formatMonth(month)}</h2>
          <p className="tabular mb-3 text-sm text-muted-foreground">
            {formatMoney(monthTotal)} en {monthDays.length} día(s)
          </p>
          <ul className="flex flex-col text-sm">
            {monthDays.map(([d, t]) => (
              <li key={d}>
                <button
                  className={cn(
                    "flex w-full justify-between rounded-md px-2 py-1 hover:bg-muted",
                    d === date && "bg-muted font-medium",
                  )}
                  onClick={() => setDate(d)}
                >
                  <span>{formatDate(d)}</span>
                  <span className="tabular">{formatMoney(t)}</span>
                </button>
              </li>
            ))}
            {monthDays.length === 0 && <li className="text-muted-foreground">Sin registros este mes.</li>}
          </ul>
        </aside>
      </div>

      <CopyDayDialog open={copyOpen} onOpenChange={setCopyOpen} target={date} />
    </>
  );
}

function ConsumptionRow({
  c,
  index,
  onChange,
  onDelete,
  onUnlink,
}: {
  c: Consumption;
  index: Index;
  onChange: (qty: number) => void;
  onDelete: () => void;
  onUnlink: () => void;
}) {
  const cost = costAt(index, c.ref, c.qty, c.date);
  const isRecipe = c.ref.kind === "recipe";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_4rem_4.5rem_4.5rem] sm:grid-cols-[minmax(0,1fr)_5.5rem_3.5rem_5.5rem_4.5rem] items-center gap-2 px-4 py-2">
      <span className="flex min-w-0 items-center gap-1.5">
        {isRecipe && <LinkIcon className="size-3.5 shrink-0 text-primary" aria-label="Receta vinculada" />}
        <span className="truncate">{refName(index, c.ref)}</span>
        {!isRecipe && (
          <span className="text-xs text-muted-foreground sm:hidden">{unitLabel(refUnit(index, c.ref))}</span>
        )}
      </span>
      <NumberInput
        aria-label="Cantidad"
        value={c.qty}
        onChange={(n) => n && n > 0 && onChange(n)}
      />
      <span className="hidden text-sm text-muted-foreground sm:block">{unitLabel(refUnit(index, c.ref))}</span>
      <span className={cn("tabular text-right text-sm", !cost.ok && "text-destructive")}>
        {cost.ok ? formatMoney(cost.total) : "sin precio"}
      </span>
      <span className="flex justify-end">
        {isRecipe && (
          <Button variant="ghost" size="icon" title="Desvincular (reemplazar por sus ingredientes)" onClick={onUnlink}>
            <UnlinkIcon />
          </Button>
        )}
        <Button variant="ghost" size="icon" aria-label="Eliminar" onClick={onDelete}>
          <Trash2Icon />
        </Button>
      </span>
    </div>
  );
}

function AddRow({
  date,
  index,
  onAdd,
}: {
  date: ISODate;
  index: Index;
  onAdd: (ref: Ref, qty: number) => boolean;
}) {
  const [ref, setRef] = useState<Ref | null>(null);
  const [qty, setQty] = useState<number | null>(null);
  const error = ref ? missingPriceMessage(index, ref, date) : null;
  const preview = ref && qty && qty > 0 && !error ? costAt(index, ref, qty, date).total : null;

  const submit = () => {
    if (!ref || !qty || qty <= 0 || error) return;
    if (onAdd(ref, qty)) {
      setRef(null);
      setQty(null);
    }
  };

  return (
    <form
      className="border-t px-4 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_4rem_4.5rem_4.5rem] sm:grid-cols-[minmax(0,1fr)_5.5rem_3.5rem_5.5rem_4.5rem] items-center gap-2">
        <RefPicker
          value={ref}
          onChange={(r) => {
            setRef(r);
            if (r.kind === "recipe" && qty == null) setQty(1);
          }}
        />
        <NumberInput aria-label="Cantidad" placeholder="Cant." value={qty} onChange={setQty} />
        <span className="hidden text-sm text-muted-foreground sm:block">{ref ? unitLabel(refUnit(index, ref)) : ""}</span>
        <span className="tabular text-right text-sm text-muted-foreground">
          {preview != null ? formatMoney(preview) : ""}
        </span>
        <Button type="submit" size="icon" className="justify-self-end" aria-label="Agregar" disabled={!ref || !qty || qty <= 0 || !!error}>
          <PlusIcon />
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </form>
  );
}

function CopyDayDialog({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ISODate;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <CopyDayForm key={target} target={target} onDone={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function CopyDayForm({ target, onDone }: { target: ISODate; onDone: () => void }) {
  const data = useData();
  const copyDay = useStore((s) => s.copyDay);
  const index = buildIndex(data);
  const datesWithData = useMemo(
    () => [...new Set(data.consumptions.map((c) => c.date))].filter((d) => d !== target).sort().reverse(),
    [data.consumptions, target],
  );
  const [from, setFrom] = useState<ISODate>(
    () => datesWithData.find((d) => d < target) ?? datesWithData[0] ?? addDays(target, -1),
  );
  const source = data.consumptions.filter((c) => c.date === from);

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Copiar día al {formatDate(target)}</DialogTitle>
        <DialogDescription>
          Se agregan copias independientes de los ítems: después podés modificarlas sin afectar el día original.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <Input type="date" value={from} onChange={(e) => isValidISODate(e.target.value) && setFrom(e.target.value)} />
        {datesWithData.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {datesWithData.slice(0, 6).map((d) => (
              <Button key={d} size="xs" variant={d === from ? "default" : "outline"} onClick={() => setFrom(d)}>
                {formatDate(d)}
              </Button>
            ))}
          </div>
        )}
        <ul className="max-h-48 overflow-y-auto rounded-lg border p-2 text-sm">
          {source.length === 0 && <li className="text-muted-foreground">Sin consumos ese día.</li>}
          {source.map((c) => (
            <li key={c.id} className="flex justify-between">
              <span>{refName(index, c.ref)}</span>
              <span className="tabular text-muted-foreground">
                {formatQty(c.qty)} {unitLabel(refUnit(index, c.ref))}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <DialogFooter>
        <Button
          disabled={source.length === 0}
          onClick={() => {
            const error = copyDay(from, target);
            if (error) return toast.error(error);
            toast.success(`${source.length} ítem(s) copiados`);
            onDone();
          }}
        >
          <CopyIcon /> Copiar {source.length} ítem(s)
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

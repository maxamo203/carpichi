"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, MonthPicker, NativeSelect, PageHeader, Stat } from "@/components/common";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { monthOf, todayISO } from "@/lib/dates";
import { buildIndex, refName, refUnit, shoppingList } from "@/lib/engine";
import { formatDate, formatMoney, formatQty, unitLabel } from "@/lib/format";
import { useData, useStore } from "@/lib/store";

export default function ComprasPage() {
  const data = useData();
  const setTypicalDay = useStore((s) => s.setTypicalDay);
  const today = todayISO();
  const [month, setMonth] = useState(monthOf(today));
  const index = buildIndex(data);
  const list = useMemo(() => shoppingList(data, month, today), [data, month, today]);
  const recipes = [...data.recipes].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title="Lista de compras"
        description="Expande la receta de día tipo hasta los alimentos base y calcula cuántas presentaciones comprar en el mes."
        actions={
          <>
            <NativeSelect
              value={data.settings.typicalDayRecipeId ?? ""}
              onChange={(e) => setTypicalDay(e.target.value || undefined)}
              aria-label="Receta de día tipo"
            >
              <option value="">Elegí la receta día tipo…</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </NativeSelect>
            <MonthPicker value={month} onChange={setMonth} />
          </>
        }
      />

      {!list ? (
        <EmptyState>
          Elegí una receta como día tipo (una receta que agrupe todo lo que comés en un día).{" "}
          {data.recipes.length === 0 && (
            <>
              Primero creala en <Link className="underline" href="/recetas">Recetas</Link>.
            </>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat
              label="A comprar"
              value={formatMoney(list.total)}
              hint="presentaciones enteras"
            />
            <Stat
              label="Consumido en el mes"
              value={formatMoney(list.consumedTotal)}
              hint={`${refName(index, { kind: "recipe", id: list.recipeId })} × ${list.days} días`}
            />
            <Stat label="Precios al" value={formatDate(list.priceDate)} className="col-span-2 lg:col-span-1" />
          </div>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alimento</TableHead>
                  <TableHead className="text-right">Necesario</TableHead>
                  <TableHead>Presentación</TableHead>
                  <TableHead className="text-right">Comprar</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.rows.map((row) => {
                  const ref = { kind: "food" as const, id: row.foodId };
                  const u = unitLabel(refUnit(index, ref));
                  return (
                    <TableRow key={row.foodId}>
                      <TableCell className="font-medium">{refName(index, ref)}</TableCell>
                      <TableCell className="tabular text-right">
                        {formatQty(row.qty, 1)} {u}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.presentation != null
                          ? `${row.presentation || "—"} (${formatQty(row.presentationQty!)} ${u})`
                          : "Sin precio"}
                      </TableCell>
                      <TableCell className="tabular text-right font-medium">
                        {row.presentations != null ? `× ${row.presentations}` : "—"}
                      </TableCell>
                      <TableCell className="tabular text-right">
                        {row.cost != null ? formatMoney(row.cost) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4}>Total</TableCell>
                  <TableCell className="tabular text-right">{formatMoney(list.total)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState, MonthPicker, PageHeader, Stat } from "@/components/common";
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
import { formatDate, formatMoney, formatMonth, formatQty, unitLabel } from "@/lib/format";
import { useData } from "@/lib/store";

export default function ComprasPage() {
  const data = useData();
  const today = todayISO();
  const [month, setMonth] = useState(monthOf(today));
  const index = buildIndex(data);
  const list = shoppingList(data, month, today);

  return (
    <>
      <PageHeader
        title="Lista de compras"
        description="Lo que necesitás para el mes completo según el estimado: lo que ya registraste más los días que faltan, repitiendo los días cargados."
        actions={<MonthPicker value={month} onChange={setMonth} />}
      />

      {!list ? (
        <EmptyState>
          No hay consumos registrados en <span className="capitalize">{formatMonth(month)}</span>. Cargá al menos un
          día en <Link className="underline" href="/consumo">Consumo</Link> para estimar el mes.
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat
              label="A comprar"
              value={formatMoney(list.total)}
              hint="presentaciones enteras, redondeando para arriba"
            />
            <Stat
              label="Consumo estimado del mes"
              value={formatMoney(list.consumedTotal)}
              hint={`${list.daysRegistered} día(s) registrados + ${list.daysEstimated} estimados`}
            />
            <Stat
              label="Precios al"
              value={formatDate(list.priceDate)}
              hint="precio y presentación vigentes a esa fecha"
              className="col-span-2 lg:col-span-1"
            />
          </div>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alimento</TableHead>
                  <TableHead className="text-right">Necesario en el mes</TableHead>
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

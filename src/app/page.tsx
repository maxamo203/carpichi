"use client";

import { AlertTriangleIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MoneyBarChart, MoneyHBarChart } from "@/components/charts";
import { EmptyState, MonthPicker, NativeSelect, PageHeader, Stat } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { daysInMonth, monthOf, todayISO } from "@/lib/dates";
import { buildIndex, monthlyTotals, monthSummary, refName, refUnit } from "@/lib/engine";
import {
  formatDate,
  formatMoney,
  formatMonth,
  formatMonthShort,
  formatPct,
  formatQty,
  unitLabel,
} from "@/lib/format";
import { useData, useStore } from "@/lib/store";

export default function ResumenPage() {
  const data = useData();
  const setTypicalDay = useStore((s) => s.setTypicalDay);
  const today = todayISO();
  const [month, setMonth] = useState(monthOf(today));
  const index = buildIndex(data);

  const summary = useMemo(() => monthSummary(data, month, today), [data, month, today]);
  const history = useMemo(() => monthlyTotals(data, month, 12), [data, month]);

  const dailyChart = useMemo(() => {
    const byDate = new Map(summary.daily.map((d) => [d.date, d.total]));
    return Array.from({ length: daysInMonth(month) }, (_, i) => {
      const date = `${month}-${String(i + 1).padStart(2, "0")}`;
      return { label: String(i + 1), value: byDate.get(date) ?? 0, tooltipLabel: formatDate(date) };
    });
  }, [summary.daily, month]);

  if (data.foods.length === 0) {
    return (
      <>
        <PageHeader title="Resumen" />
        <EmptyState>
          No hay datos todavía. Empezá cargando <Link className="underline" href="/alimentos">alimentos</Link>, o
          cargá los datos de ejemplo / importá un archivo desde <Link className="underline" href="/datos">Datos</Link>.
        </EmptyState>
      </>
    );
  }

  const typical = summary.typicalDay;
  const recipesSorted = [...data.recipes].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title="Resumen de gasto"
        description="Incluye lo consumido dentro de recetas: su gasto se reparte en los alimentos base."
        actions={<MonthPicker value={month} onChange={setMonth} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Gasto del mes" value={formatMoney(summary.total)} />
        <Stat label="Días registrados" value={summary.daysRegistered} hint={`de ${summary.daysInMonth}`} />
        <Stat label="Promedio por día" value={formatMoney(summary.avgPerDay)} />
        <Stat
          label="Proyección (promedio)"
          value={formatMoney(summary.projectionAvg)}
          hint={`promedio × ${summary.daysInMonth} días`}
        />
        <div className="col-span-2 rounded-xl border bg-card p-4 lg:col-span-1">
          <div className="text-xs font-medium text-muted-foreground uppercase">Proyección (día tipo)</div>
          <div className="tabular mt-1 text-2xl font-semibold">
            {typical ? (typical.ok ? formatMoney(typical.projection) : "—") : "—"}
          </div>
          <NativeSelect
            className="mt-2 w-full"
            value={data.settings.typicalDayRecipeId ?? ""}
            onChange={(e) => setTypicalDay(e.target.value || undefined)}
            aria-label="Receta de día tipo"
          >
            <option value="">Elegí la receta día tipo…</option>
            {recipesSorted.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </NativeSelect>
          {typical && (
            <div className="mt-1 text-xs text-muted-foreground">
              {typical.ok
                ? `${formatMoney(typical.costPerDay)}/día · precios al ${formatDate(typical.priceDate)}`
                : `Sin precio al ${formatDate(typical.priceDate)} para: ${typical.missingPrice
                    .map((id) => refName(index, { kind: "food", id }))
                    .join(", ")}`}
            </div>
          )}
        </div>
      </div>

      {summary.uncosted.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
          {summary.uncosted.length} consumo(s) de este mes no se pudieron costear por falta de precio vigente.
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gasto por día · <span className="capitalize">{formatMonth(month)}</span></CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyBarChart data={dailyChart} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gasto mensual · últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyBarChart
              data={history.map((h) => ({
                label: formatMonthShort(h.month),
                value: h.total,
                tooltipLabel: `${formatMonth(h.month)} · ${h.daysRegistered} día(s)`,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      {summary.foods.length > 0 ? (
        <>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Detalle por alimento</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alimento</TableHead>
                    <TableHead className="text-right">Consumo del mes</TableHead>
                    <TableHead className="text-right">Prom. por día</TableHead>
                    <TableHead className="text-right">Gasto del mes</TableHead>
                    <TableHead className="text-right">Gasto prom./día</TableHead>
                    <TableHead className="text-right">% del gasto</TableHead>
                    <TableHead className="text-right">Días que dura 1 present.</TableHead>
                    <TableHead className="text-right">Present. por mes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.foods.map((row) => {
                    const ref = { kind: "food" as const, id: row.foodId };
                    const u = unitLabel(refUnit(index, ref));
                    return (
                      <TableRow key={row.foodId}>
                        <TableCell className="font-medium">{refName(index, ref)}</TableCell>
                        <TableCell className="tabular text-right">{formatQty(row.qty, 1)} {u}</TableCell>
                        <TableCell className="tabular text-right">{formatQty(row.avgPerDay, 1)} {u}</TableCell>
                        <TableCell className="tabular text-right">{formatMoney(row.cost)}</TableCell>
                        <TableCell className="tabular text-right">{formatMoney(row.avgCostPerDay)}</TableCell>
                        <TableCell className="tabular text-right">{formatPct(row.pct)}</TableCell>
                        <TableCell className="tabular text-right">
                          {row.daysPerPresentation != null ? formatQty(row.daysPerPresentation, 1) : "—"}
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {row.presentationsPerMonth != null ? formatQty(row.presentationsPerMonth, 1) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-4 lg:grid-cols-[3fr_2fr]">
            <Card>
              <CardHeader>
                <CardTitle>Top alimentos por gasto</CardTitle>
              </CardHeader>
              <CardContent>
                <MoneyHBarChart
                  data={summary.foods.slice(0, 10).map((row) => ({
                    label: refName(index, { kind: "food", id: row.foodId }),
                    value: row.cost,
                    tooltipLabel: `${refName(index, { kind: "food", id: row.foodId })} · ${formatPct(row.pct)}`,
                  }))}
                />
              </CardContent>
            </Card>
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Macros promedio por día</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-4 gap-2 text-center">
                  {summary.macrosIncomplete.length === summary.foods.length ? (
                    <p className="col-span-4 text-left text-sm text-muted-foreground">
                      Cargá los macros de tus alimentos en{" "}
                      <Link className="underline" href="/alimentos">Alimentos</Link> para ver calorías y nutrientes.
                    </p>
                  ) : (
                  <>
                  {[
                    ["kcal", summary.macrosPerDay.kcal, ""],
                    ["Proteínas", summary.macrosPerDay.protein, " g"],
                    ["Carbos", summary.macrosPerDay.carbs, " g"],
                    ["Grasas", summary.macrosPerDay.fat, " g"],
                  ].map(([label, v, suffix]) => (
                    <div key={label as string}>
                      <div className="tabular text-lg font-semibold">
                        {formatQty(v as number, 0)}
                        {suffix}
                      </div>
                      <div className="text-xs text-muted-foreground">{label}</div>
                    </div>
                  ))}
                  {summary.macrosIncomplete.length > 0 && (
                    <p className="col-span-4 text-left text-xs text-muted-foreground">
                      Sin macros cargados:{" "}
                      {summary.macrosIncomplete.map((id) => refName(index, { kind: "food", id })).join(", ")}
                    </p>
                  )}
                  </>
                  )}
                </CardContent>
              </Card>
              {summary.recipes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recetas consumidas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Receta</TableHead>
                          <TableHead className="text-right">Porciones</TableHead>
                          <TableHead className="text-right">Prom./día</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.recipes.map((row) => (
                          <TableRow key={row.recipeId}>
                            <TableCell>{refName(index, { kind: "recipe", id: row.recipeId })}</TableCell>
                            <TableCell className="tabular text-right">{formatQty(row.portions)}</TableCell>
                            <TableCell className="tabular text-right">{formatQty(row.avgPerDay)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-6">
          <EmptyState>
            Sin consumos registrados en <span className="capitalize">{formatMonth(month)}</span>.{" "}
            <Link className="underline" href="/consumo">Registrar consumo</Link>
          </EmptyState>
        </div>
      )}
    </>
  );
}

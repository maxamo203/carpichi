"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/format";

const AXIS = { fontSize: 11, fill: "var(--muted-foreground)" };

function compactMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
  if (n >= 1_000) return `$${(n / 1_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}k`;
  return `$${n.toFixed(0)}`;
}

function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: unknown; payload?: BarDatum }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  // Con barras apiladas (real / estimado) cada día tiene solo una con valor.
  const entry = payload.find((p) => Number(p.value) > 0) ?? payload[0];
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="text-muted-foreground">{entry.payload?.tooltipLabel ?? label}</div>
      <div className="tabular font-semibold text-foreground">{formatMoney(Number(entry.value))}</div>
    </div>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  /** Valor estimado (se dibuja apilado, en tono claro). */
  estimated?: number;
  tooltipLabel?: string;
}

/** Barras verticales (gasto por día / por mes). Si hay valores estimados, se agregan como segunda serie. */
export function MoneyBarChart({ data, height = 220 }: { data: BarDatum[]; height?: number }) {
  const hasEstimate = data.some((d) => d.estimated);
  return (
    <>
      {hasEstimate && (
        <div className="mb-2 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-chart-1" /> Registrado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-chart-1/35" /> Estimado
          </span>
        </div>
      )}
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} tickFormatter={compactMoney} />
        <Tooltip content={MoneyTooltip} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
        <Bar dataKey="value" stackId="day" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        {hasEstimate && (
          <Bar
            dataKey="estimated"
            stackId="day"
            fill="var(--chart-1)"
            fillOpacity={0.35}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
    </>
  );
}

/** Barras horizontales de una sola serie (top alimentos por gasto). */
export function MoneyHBarChart({ data }: { data: BarDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 28 + 24)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compactMoney} />
        <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={110} />
        <Tooltip content={MoneyTooltip} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
        <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

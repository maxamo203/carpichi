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
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="text-muted-foreground">{payload[0].payload?.tooltipLabel ?? label}</div>
      <div className="tabular font-semibold text-foreground">{formatMoney(Number(payload[0].value))}</div>
    </div>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  tooltipLabel?: string;
}

/** Barras verticales de una sola serie (gasto por día / por mes). */
export function MoneyBarChart({ data, height = 220 }: { data: BarDatum[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} tickFormatter={compactMoney} />
        <Tooltip content={MoneyTooltip} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
        <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
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

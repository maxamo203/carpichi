"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addMonths } from "@/lib/dates";
import { formatMonth, formatQty, parseNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Input numérico que acepta coma decimal. `value` null = vacío/inválido. */
export function NumberInput({
  value,
  onChange,
  className,
  ...props
}: {
  value: number | null;
  onChange: (n: number | null) => void;
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "type">) {
  const [text, setText] = useState(value == null ? "" : formatQty(value, 6));
  const [prev, setPrev] = useState(value);
  // Si el valor cambia desde afuera, re-sincronizar el texto.
  if (value !== prev) {
    setPrev(value);
    const parsed = parseNumber(text);
    if (!(value == null && text === "") && parsed !== value) {
      setText(value == null ? "" : formatQty(value, 6));
    }
  }
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={cn("tabular text-right", className)}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseNumber(e.target.value);
        const next = Number.isFinite(n) ? n : null;
        setPrev(next);
        onChange(next);
      }}
    />
  );
}

export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={cn(
        "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover",
        className,
      )}
    />
  );
}

export function MonthPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" aria-label="Mes anterior" onClick={() => onChange(addMonths(value, -1))}>
        <ChevronLeftIcon />
      </Button>
      <label className="relative">
        <span className="pointer-events-none flex h-8 min-w-36 items-center justify-center rounded-lg border px-3 text-sm font-medium capitalize">
          {formatMonth(value)}
        </span>
        <input
          type="month"
          aria-label="Elegir mes"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
        />
      </label>
      <Button variant="outline" size="icon" aria-label="Mes siguiente" onClick={() => onChange(addMonths(value, 1))}>
        <ChevronRightIcon />
      </Button>
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <div className="text-xs font-medium text-muted-foreground uppercase">{label}</div>
      <div className="tabular mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm", className)}>
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

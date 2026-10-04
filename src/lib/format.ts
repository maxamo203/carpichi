import type { ISODate, MonthKey } from "./types";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function number(n: number, maxDecimals: number, minDecimals = 0): string {
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
}

/** Moneda genérica: `$` + número (sin código de moneda). Montos chicos con 2 decimales. */
export function formatMoney(n: number): string {
  const abs = Math.abs(n);
  const s = abs < 100 && abs !== 0 && !Number.isInteger(abs) ? number(abs, 2, 2) : number(abs, 0);
  return `${n < 0 ? "-" : ""}$${s}`;
}

export function formatQty(n: number, maxDecimals = 2): string {
  return number(n, maxDecimals);
}

export function formatPct(n: number): string {
  return `${number(n * 100, 1, 1)}%`;
}

export function formatDate(date: ISODate): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export function formatDateLong(date: ISODate): string {
  const [y, m, d] = date.split("-").map(Number);
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${wd[0].toUpperCase()}${wd.slice(1)} ${d} de ${MONTHS[m - 1]} ${y}`;
}

export function formatMonth(month: MonthKey): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function formatMonthShort(month: MonthKey): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${String(y).slice(2)}`;
}

export function unitLabel(unit: string): string {
  return unit === "unidad" ? "u." : unit;
}

/** Parsea números aceptando coma decimal. */
export function parseNumber(s: string): number {
  const t = s.trim().replace(/\s/g, "");
  if (!t) return NaN;
  // "1.234,5" → 1234.5 ; "12,5" → 12.5 ; "12.5" → 12.5 ; "274.000" → 274000
  const normalized = t.includes(",")
    ? t.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(t)
      ? t.replace(/\./g, "")
      : t;
  return Number(normalized);
}

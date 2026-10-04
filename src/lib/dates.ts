import type { ISODate, MonthKey } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function parseISODate(date: ISODate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function monthOf(date: ISODate): MonthKey {
  return date.slice(0, 7);
}

export function daysInMonth(month: MonthKey): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function firstDayOfMonth(month: MonthKey): ISODate {
  return `${month}-01`;
}

export function lastDayOfMonth(month: MonthKey): ISODate {
  return `${month}-${pad(daysInMonth(month))}`;
}

export function addMonths(month: MonthKey, delta: number): MonthKey {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function addDays(date: ISODate, delta: number): ISODate {
  const d = parseISODate(date);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

export function isValidISODate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return toISODate(parseISODate(date)) === date;
}

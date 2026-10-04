import {
  addMonths,
  daysInMonth,
  lastDayOfMonth,
  monthOf,
} from "./dates";
import { newId } from "./id";
import type {
  AppData,
  Consumption,
  Food,
  ISODate,
  Macros,
  MonthKey,
  PriceEntry,
  Recipe,
  Ref,
} from "./types";

// ---------------------------------------------------------------------------
// Índice
// ---------------------------------------------------------------------------

export interface Index {
  foods: Map<string, Food>;
  recipes: Map<string, Recipe>;
}

const indexCache = new WeakMap<object, Index>();

export function buildIndex(data: Pick<AppData, "foods" | "recipes">): Index {
  const cached = indexCache.get(data);
  if (cached) return cached;
  const index: Index = {
    foods: new Map(data.foods.map((f) => [f.id, f])),
    recipes: new Map(data.recipes.map((r) => [r.id, r])),
  };
  indexCache.set(data, index);
  return index;
}

export function refName(index: Index, ref: Ref): string {
  const item = ref.kind === "food" ? index.foods.get(ref.id) : index.recipes.get(ref.id);
  return item?.name ?? "(eliminado)";
}

export function refUnit(index: Index, ref: Ref): string {
  if (ref.kind === "recipe") return "porción";
  return index.foods.get(ref.id)?.unit ?? "";
}

export function sameRef(a: Ref, b: Ref): boolean {
  return a.kind === b.kind && a.id === b.id;
}

// ---------------------------------------------------------------------------
// Precios
// ---------------------------------------------------------------------------

export function sortedPrices(food: Food): PriceEntry[] {
  return [...food.prices].sort((a, b) => a.date.localeCompare(b.date));
}

/** Entrada de precio vigente en `date` (la última con fecha <= date), o null. */
export function priceAt(food: Food, date: ISODate): PriceEntry | null {
  let best: PriceEntry | null = null;
  for (const p of food.prices) {
    if (p.date <= date && (!best || p.date > best.date)) best = p;
  }
  return best;
}

export function latestPrice(food: Food): PriceEntry | null {
  let best: PriceEntry | null = null;
  for (const p of food.prices) {
    if (!best || p.date > best.date) best = p;
  }
  return best;
}

export function firstPriceDate(food: Food): ISODate | null {
  let first: ISODate | null = null;
  for (const p of food.prices) {
    if (!first || p.date < first) first = p.date;
  }
  return first;
}

export function unitCost(entry: PriceEntry): number {
  return entry.price / entry.presentationQty;
}

// ---------------------------------------------------------------------------
// Grafo de recetas
// ---------------------------------------------------------------------------

export class CycleError extends Error {
  constructor(public path: string[]) {
    super("Dependencia cíclica entre recetas");
  }
}

/**
 * ¿Agregar `candidate` como ingrediente de la receta `recipeId` crearía un ciclo?
 * Ocurre si candidate es la misma receta o si candidate (transitivamente) ya usa recipeId.
 */
export function wouldCreateCycle(index: Index, recipeId: string, candidate: Ref): boolean {
  if (candidate.kind === "food") return false;
  const seen = new Set<string>();
  const stack = [candidate.id];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === recipeId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const recipe = index.recipes.get(id);
    if (!recipe) continue;
    for (const item of recipe.items) {
      if (item.ref.kind === "recipe") stack.push(item.ref.id);
    }
  }
  return false;
}

/** Busca algún ciclo en el grafo de recetas. Devuelve los ids del ciclo o null. */
export function findCycle(recipes: Recipe[]): string[] | null {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const state = new Map<string, "visiting" | "done">();
  const path: string[] = [];

  const visit = (id: string): string[] | null => {
    const s = state.get(id);
    if (s === "done") return null;
    if (s === "visiting") return [...path.slice(path.indexOf(id)), id];
    state.set(id, "visiting");
    path.push(id);
    for (const item of byId.get(id)?.items ?? []) {
      if (item.ref.kind !== "recipe" || !byId.has(item.ref.id)) continue;
      const cycle = visit(item.ref.id);
      if (cycle) return cycle;
    }
    path.pop();
    state.set(id, "done");
    return null;
  };

  for (const r of recipes) {
    const cycle = visit(r.id);
    if (cycle) return cycle;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Expansión recursiva
// ---------------------------------------------------------------------------

export interface Expansion {
  /** Cantidad de cada alimento base (en su unidad). */
  foods: Map<string, number>;
  /** Porciones de cada receta involucrada (incluye la de nivel superior). */
  recipes: Map<string, number>;
  /** Referencias a alimentos/recetas que no existen. */
  missingRefs: Ref[];
}

function addTo(map: Map<string, number>, key: string, qty: number) {
  map.set(key, (map.get(key) ?? 0) + qty);
}

export function expand(index: Index, ref: Ref, qty: number): Expansion {
  const out: Expansion = { foods: new Map(), recipes: new Map(), missingRefs: [] };
  const walk = (r: Ref, q: number, stack: string[]) => {
    if (r.kind === "food") {
      if (!index.foods.has(r.id)) out.missingRefs.push(r);
      else addTo(out.foods, r.id, q);
      return;
    }
    const recipe = index.recipes.get(r.id);
    if (!recipe) {
      out.missingRefs.push(r);
      return;
    }
    if (stack.includes(r.id)) throw new CycleError([...stack, r.id]);
    addTo(out.recipes, r.id, q);
    const factor = q / recipe.yields;
    for (const item of recipe.items) walk(item.ref, item.qty * factor, [...stack, r.id]);
  };
  walk(ref, qty, []);
  return out;
}

// ---------------------------------------------------------------------------
// Costos
// ---------------------------------------------------------------------------

export interface CostResult {
  total: number;
  byFood: Map<string, number>;
  /** Alimentos sin precio vigente a esa fecha. */
  missingPrice: string[];
  missingRefs: Ref[];
  ok: boolean;
}

export function costOfExpansion(index: Index, exp: Expansion, date: ISODate): CostResult {
  const byFood = new Map<string, number>();
  const missingPrice: string[] = [];
  let total = 0;
  for (const [foodId, q] of exp.foods) {
    const entry = priceAt(index.foods.get(foodId)!, date);
    if (!entry) {
      missingPrice.push(foodId);
      continue;
    }
    const c = q * unitCost(entry);
    byFood.set(foodId, c);
    total += c;
  }
  return {
    total,
    byFood,
    missingPrice,
    missingRefs: exp.missingRefs,
    ok: missingPrice.length === 0 && exp.missingRefs.length === 0,
  };
}

export function costAt(index: Index, ref: Ref, qty: number, date: ISODate): CostResult {
  return costOfExpansion(index, expand(index, ref, qty), date);
}

/**
 * Primera fecha desde la que se puede registrar `ref` (todos sus alimentos base tienen precio).
 * null si algún alimento nunca tuvo precio; undefined si no tiene alimentos (sin restricción).
 */
export function earliestDate(index: Index, ref: Ref): ISODate | null | undefined {
  const exp = expand(index, ref, 1);
  let max: ISODate | undefined;
  for (const foodId of exp.foods.keys()) {
    const first = firstPriceDate(index.foods.get(foodId)!);
    if (!first) return null;
    if (!max || first > max) max = first;
  }
  return max;
}

// ---------------------------------------------------------------------------
// Macros
// ---------------------------------------------------------------------------

export interface MacrosResult {
  macros: Macros;
  /** Alimentos involucrados que no tienen macros cargados. */
  incomplete: string[];
}

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function macrosOfExpansion(index: Index, exp: Expansion): MacrosResult {
  const macros = { ...ZERO_MACROS };
  const incomplete: string[] = [];
  for (const [foodId, q] of exp.foods) {
    const food = index.foods.get(foodId)!;
    if (!food.macros) {
      incomplete.push(foodId);
      continue;
    }
    const factor = food.unit === "unidad" ? q : q / 100;
    macros.kcal += food.macros.kcal * factor;
    macros.protein += food.macros.protein * factor;
    macros.carbs += food.macros.carbs * factor;
    macros.fat += food.macros.fat * factor;
  }
  return { macros, incomplete };
}

export function macrosOf(index: Index, ref: Ref, qty: number): MacrosResult {
  return macrosOfExpansion(index, expand(index, ref, qty));
}

// ---------------------------------------------------------------------------
// Integridad
// ---------------------------------------------------------------------------

export interface Usages {
  recipes: Recipe[];
  consumptions: Consumption[];
}

export function usagesOf(data: AppData, ref: Ref): Usages {
  return {
    recipes: data.recipes.filter((r) => r.items.some((i) => sameRef(i.ref, ref))),
    consumptions: data.consumptions.filter((c) => sameRef(c.ref, ref)),
  };
}

/** Consumos que no se pueden costear (fecha anterior a algún precio o referencias rotas). */
export function uncostedConsumptions(data: AppData): Consumption[] {
  const index = buildIndex(data);
  return data.consumptions.filter((c) => {
    try {
      return !costAt(index, c.ref, c.qty, c.date).ok;
    } catch {
      return true;
    }
  });
}

/** Reemplaza una fila de consumo de receta por sus ingredientes directos (filas independientes). */
export function unlinkConsumption(index: Index, c: Consumption): Consumption[] {
  if (c.ref.kind !== "recipe") return [c];
  const recipe = index.recipes.get(c.ref.id);
  if (!recipe) return [c];
  const factor = c.qty / recipe.yields;
  return recipe.items.map((item) => ({
    id: newId(),
    date: c.date,
    ref: item.ref,
    qty: item.qty * factor,
  }));
}

// ---------------------------------------------------------------------------
// Resumen mensual
// ---------------------------------------------------------------------------

export interface FoodSummaryRow {
  foodId: string;
  qty: number;
  avgPerDay: number;
  cost: number;
  avgCostPerDay: number;
  pct: number;
  presentationQty: number | null;
  daysPerPresentation: number | null;
  presentationsPerMonth: number | null;
}

export interface RecipeSummaryRow {
  recipeId: string;
  portions: number;
  avgPerDay: number;
}

/** Totales y detalle de un conjunto de días (los registrados, o el mes completo estimado). */
export interface PeriodSummary {
  total: number;
  /** Días sobre los que se promedia. */
  days: number;
  foods: FoodSummaryRow[];
  recipes: RecipeSummaryRow[];
}

export interface MonthEstimate extends PeriodSummary {
  /** Días sin registro completados repitiendo en ciclo los días registrados. */
  filled: { date: ISODate; sourceDate: ISODate; total: number }[];
  filledTotal: number;
}

export interface MonthSummary {
  month: MonthKey;
  daysInMonth: number;
  total: number;
  daysRegistered: number;
  avgPerDay: number;
  typicalDay: {
    recipeId: string;
    priceDate: ISODate;
    costPerDay: number;
    projection: number;
    ok: boolean;
    missingPrice: string[];
  } | null;
  /** Lo efectivamente registrado. */
  real: PeriodSummary;
  /** Mes completo: lo registrado + los días faltantes estimados. null si no hay días registrados. */
  estimate: MonthEstimate | null;
  daily: { date: ISODate; total: number }[];
  macrosPerDay: Macros;
  macrosIncomplete: string[];
  uncosted: Consumption[];
}

/** Fecha de precios para proyecciones: hoy si el mes es actual o futuro; último día si ya pasó. */
export function projectionPriceDate(month: MonthKey, today: ISODate): ISODate {
  const last = lastDayOfMonth(month);
  return last < today ? last : today;
}

class Accumulator {
  foodQty = new Map<string, number>();
  foodCost = new Map<string, number>();
  recipePortions = new Map<string, number>();
  total = 0;

  add(exp: Expansion, cost: CostResult) {
    for (const [id, q] of exp.foods) addTo(this.foodQty, id, q);
    for (const [id, c] of cost.byFood) addTo(this.foodCost, id, c);
    for (const [id, p] of exp.recipes) addTo(this.recipePortions, id, p);
    this.total += cost.total;
  }

  summarize(index: Index, days: number, month: MonthKey): PeriodSummary {
    const dim = daysInMonth(month);
    const refDate = lastDayOfMonth(month);
    const per = (n: number) => (days ? n / days : 0);
    const foods: FoodSummaryRow[] = [...this.foodQty.entries()].map(([foodId, qty]) => {
      const food = index.foods.get(foodId)!;
      const entry = priceAt(food, refDate) ?? latestPrice(food);
      const cost = this.foodCost.get(foodId) ?? 0;
      const avg = per(qty);
      const pq = entry?.presentationQty ?? null;
      return {
        foodId,
        qty,
        avgPerDay: avg,
        cost,
        avgCostPerDay: per(cost),
        pct: this.total ? cost / this.total : 0,
        presentationQty: pq,
        daysPerPresentation: pq && avg ? pq / avg : null,
        presentationsPerMonth: pq ? (avg * dim) / pq : null,
      };
    });
    foods.sort((a, b) => b.cost - a.cost);
    const recipes: RecipeSummaryRow[] = [...this.recipePortions.entries()]
      .map(([recipeId, portions]) => ({ recipeId, portions, avgPerDay: per(portions) }))
      .sort((a, b) => b.portions - a.portions);
    return { total: this.total, days, foods, recipes };
  }
}

export function monthSummary(data: AppData, month: MonthKey, today: ISODate): MonthSummary {
  const index = buildIndex(data);
  const dim = daysInMonth(month);
  const real = new Accumulator();
  const full = new Accumulator();
  const byDate = new Map<ISODate, { exp: Expansion; date: ISODate }[]>();
  const dailyMap = new Map<ISODate, number>();
  const macroTotals = { ...ZERO_MACROS };
  const macrosIncomplete = new Set<string>();
  const uncosted: Consumption[] = [];

  for (const c of data.consumptions) {
    if (monthOf(c.date) !== month) continue;
    if (!dailyMap.has(c.date)) dailyMap.set(c.date, 0);
    if (!byDate.has(c.date)) byDate.set(c.date, []);
    let exp: Expansion;
    try {
      exp = expand(index, c.ref, c.qty);
    } catch {
      uncosted.push(c);
      continue;
    }
    byDate.get(c.date)!.push({ exp, date: c.date });
    const cost = costOfExpansion(index, exp, c.date);
    if (!cost.ok) uncosted.push(c);
    real.add(exp, cost);
    full.add(exp, cost);
    dailyMap.set(c.date, dailyMap.get(c.date)! + cost.total);
    const m = macrosOfExpansion(index, exp);
    m.incomplete.forEach((id) => macrosIncomplete.add(id));
    macroTotals.kcal += m.macros.kcal;
    macroTotals.protein += m.macros.protein;
    macroTotals.carbs += m.macros.carbs;
    macroTotals.fat += m.macros.fat;
  }

  const registered = [...dailyMap.keys()].sort();
  const daysRegistered = registered.length;

  // Estimado: cada día sin registro repite, en ciclo, los días registrados (en orden de fecha).
  // Se costea con el precio vigente en el día estimado; si no hay, con el del día original.
  let estimate: MonthEstimate | null = null;
  if (daysRegistered > 0) {
    const filled: MonthEstimate["filled"] = [];
    const missing = Array.from(
      { length: dim },
      (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
    ).filter((d) => !dailyMap.has(d));
    missing.forEach((date, i) => {
      const sourceDate = registered[i % daysRegistered];
      let dayTotal = 0;
      for (const item of byDate.get(sourceDate)!) {
        let cost = costOfExpansion(index, item.exp, date);
        if (!cost.ok) cost = costOfExpansion(index, item.exp, item.date);
        full.add(item.exp, cost);
        dayTotal += cost.total;
      }
      filled.push({ date, sourceDate, total: dayTotal });
    });
    estimate = {
      ...full.summarize(index, dim, month),
      filled,
      filledTotal: filled.reduce((s, f) => s + f.total, 0),
    };
  }

  let typicalDay: MonthSummary["typicalDay"] = null;
  const typicalId = data.settings.typicalDayRecipeId;
  if (typicalId && index.recipes.has(typicalId)) {
    const priceDate = projectionPriceDate(month, today);
    let cost: CostResult;
    try {
      cost = costAt(index, { kind: "recipe", id: typicalId }, 1, priceDate);
    } catch {
      cost = { total: 0, byFood: new Map(), missingPrice: [], missingRefs: [], ok: false };
    }
    typicalDay = {
      recipeId: typicalId,
      priceDate,
      costPerDay: cost.total,
      projection: cost.total * dim,
      ok: cost.ok,
      missingPrice: cost.missingPrice,
    };
  }

  const div = daysRegistered || 1;
  return {
    month,
    daysInMonth: dim,
    total: real.total,
    daysRegistered,
    avgPerDay: daysRegistered ? real.total / daysRegistered : 0,
    typicalDay,
    real: real.summarize(index, daysRegistered, month),
    estimate,
    daily: registered.map((date) => ({ date, total: dailyMap.get(date)! })),
    macrosPerDay: {
      kcal: macroTotals.kcal / div,
      protein: macroTotals.protein / div,
      carbs: macroTotals.carbs / div,
      fat: macroTotals.fat / div,
    },
    macrosIncomplete: [...macrosIncomplete],
    uncosted,
  };
}

/** Totales gastados de los `count` meses que terminan en `month` (inclusive). */
export function monthlyTotals(
  data: AppData,
  month: MonthKey,
  count: number,
): { month: MonthKey; total: number; daysRegistered: number }[] {
  const index = buildIndex(data);
  const months = Array.from({ length: count }, (_, i) => addMonths(month, i - count + 1));
  const totals = new Map(months.map((m) => [m, { total: 0, days: new Set<string>() }]));
  for (const c of data.consumptions) {
    const t = totals.get(monthOf(c.date));
    if (!t) continue;
    t.days.add(c.date);
    try {
      t.total += costAt(index, c.ref, c.qty, c.date).total;
    } catch {
      // ciclo: se ignora en el gráfico
    }
  }
  return months.map((m) => ({
    month: m,
    total: totals.get(m)!.total,
    daysRegistered: totals.get(m)!.days.size,
  }));
}

// ---------------------------------------------------------------------------
// Lista de compras
// ---------------------------------------------------------------------------

export interface ShoppingRow {
  foodId: string;
  /** Cantidad estimada para el mes completo. */
  qty: number;
  presentation: string | null;
  presentationQty: number | null;
  presentations: number | null;
  /** Costo de las presentaciones enteras a comprar. */
  cost: number | null;
  /** Costo de lo que se estima consumir (según el precio de cada día). */
  consumedCost: number;
}

export interface ShoppingList {
  daysRegistered: number;
  daysEstimated: number;
  priceDate: ISODate;
  rows: ShoppingRow[];
  total: number;
  consumedTotal: number;
}

/**
 * Lista de compras del mes a partir del estimado (lo registrado + los días faltantes
 * repitiendo en ciclo los registrados). null si el mes no tiene días registrados.
 */
export function shoppingList(data: AppData, month: MonthKey, today: ISODate): ShoppingList | null {
  const summary = monthSummary(data, month, today);
  const estimate = summary.estimate;
  if (!estimate) return null;
  const index = buildIndex(data);
  const priceDate = projectionPriceDate(month, today);
  let total = 0;
  const rows: ShoppingRow[] = estimate.foods.map(({ foodId, qty, cost: consumedCost }) => {
    const food = index.foods.get(foodId)!;
    const entry = priceAt(food, priceDate) ?? latestPrice(food);
    if (!entry) {
      return {
        foodId,
        qty,
        presentation: null,
        presentationQty: null,
        presentations: null,
        cost: null,
        consumedCost,
      };
    }
    // Tolerancia para no redondear 2.0000000001 a 3.
    const presentations = Math.ceil(qty / entry.presentationQty - 1e-9);
    const cost = presentations * entry.price;
    total += cost;
    return {
      foodId,
      qty,
      presentation: entry.presentation,
      presentationQty: entry.presentationQty,
      presentations,
      cost,
      consumedCost,
    };
  });
  rows.sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0));
  return {
    daysRegistered: summary.daysRegistered,
    daysEstimated: estimate.filled.length,
    priceDate,
    rows,
    total,
    consumedTotal: estimate.total,
  };
}

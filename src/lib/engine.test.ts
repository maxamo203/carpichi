import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildIndex,
  costAt,
  earliestDate,
  expand,
  findCycle,
  macrosOf,
  monthSummary,
  priceAt,
  shoppingList,
  uncostedConsumptions,
  unlinkConsumption,
  wouldCreateCycle,
} from "./engine";
import { buildExport, parseImport } from "./io";
import { sampleData } from "./test-fixtures";
import type { AppData, Food, Recipe } from "./types";

const r = (id: string) => ({ kind: "recipe" as const, id });
const f = (id: string) => ({ kind: "food" as const, id });

describe("precios por fecha", () => {
  const huevos: Food = {
    id: "h",
    name: "Huevos",
    unit: "unidad",
    prices: [
      { id: "2", date: "2026-11-03", presentation: "Maple", presentationQty: 30, price: 9000 },
      { id: "1", date: "2026-10-03", presentation: "Maple", presentationQty: 30, price: 6000 },
    ],
  };

  it("usa la última entrada con fecha <= a la consultada", () => {
    expect(priceAt(huevos, "2026-10-02")).toBeNull();
    expect(priceAt(huevos, "2026-10-03")?.price).toBe(6000);
    expect(priceAt(huevos, "2026-11-02")?.price).toBe(6000);
    expect(priceAt(huevos, "2026-11-03")?.price).toBe(9000);
    expect(priceAt(huevos, "2027-01-01")?.price).toBe(9000);
  });

  it("no se puede costear antes del primer precio", () => {
    const index = buildIndex({ foods: [huevos], recipes: [] });
    const before = costAt(index, f("h"), 6, "2026-10-01");
    expect(before.ok).toBe(false);
    expect(before.missingPrice).toEqual(["h"]);
    expect(costAt(index, f("h"), 6, "2026-10-10").total).toBe(1200);
    expect(costAt(index, f("h"), 6, "2026-11-10").total).toBe(1800);
  });
});

describe("datos de prueba", () => {
  const data = sampleData();
  const index = buildIndex(data);

  it("costos por porción", () => {
    expect(costAt(index, r("r-yogur-casero"), 1, "2026-10-01").total).toBeCloseTo(925);
    expect(costAt(index, r("r-pollo-arroz"), 1, "2026-10-01").total).toBeCloseTo(4637.5);
    expect(costAt(index, r("r-desayuno"), 1, "2026-10-01").total).toBeCloseTo(2068.33, 2);
    expect(costAt(index, r("r-merienda"), 1, "2026-10-01").total).toBeCloseTo(2458.33, 2);
    expect(costAt(index, r("r-atun-arroz"), 1, "2026-10-01").total).toBeCloseTo(1578.75);
  });

  it("el día 01/10 suma $15.062", () => {
    const s = monthSummary(data, "2026-10", "2026-10-03");
    expect(Math.round(s.total)).toBe(15062);
    expect(s.daysRegistered).toBe(1);
    // Con un solo día registrado, el estimado repite ese día todo el mes.
    expect(Math.round(s.estimate!.total)).toBe(466935);
    const pollo = s.real.foods.find((x) => x.foodId === "f-pollo")!;
    expect(pollo.qty).toBe(470);
    expect(pollo.cost).toBeCloseTo(4465);
    expect(pollo.daysPerPresentation).toBeCloseTo(1000 / 470);
    const lechePolvo = s.real.foods.find((x) => x.foodId === "f-leche-polvo")!;
    expect(lechePolvo.qty).toBeCloseTo(50 / 6);
    expect(s.uncosted).toEqual([]);
  });

  it("el estimado completa los días faltantes repitiendo en ciclo los registrados", () => {
    const two = structuredClone(data);
    // Día 2: solo 100 g de pollo ($950).
    two.consumptions.push({ id: "d2", date: "2026-10-02", ref: f("f-pollo"), qty: 100 });
    const s = monthSummary(two, "2026-10", "2026-10-03");
    const est = s.estimate!;
    expect(est.filled).toHaveLength(29);
    // Faltan 03..31: alternan día 1, día 2, día 1, ...
    expect(est.filled[0]).toMatchObject({ date: "2026-10-03", sourceDate: "2026-10-01" });
    expect(est.filled[1]).toMatchObject({ date: "2026-10-04", sourceDate: "2026-10-02" });
    expect(est.filled[28]).toMatchObject({ date: "2026-10-31", sourceDate: "2026-10-01" });
    // 29 días faltantes = 15 veces el día 1 + 14 veces el día 2.
    const day1 = s.daily[0].total;
    expect(est.filledTotal).toBeCloseTo(15 * day1 + 14 * 950);
    expect(est.total).toBeCloseTo(s.total + est.filledTotal);
    const pollo = est.foods.find((x) => x.foodId === "f-pollo")!;
    expect(pollo.qty).toBeCloseTo(470 * 16 + 100 * 15);
    expect(pollo.avgPerDay).toBeCloseTo(pollo.qty / 31);
    expect(pollo.presentationsPerMonth).toBeCloseTo(pollo.qty / 1000);
    expect(est.foods.reduce((sum, r) => sum + r.pct, 0)).toBeCloseTo(1);
  });

  it("los días estimados usan el precio vigente en su fecha", () => {
    const d = structuredClone(data);
    d.consumptions = [{ id: "x", date: "2026-10-01", ref: f("f-pollo"), qty: 1000 }];
    d.foods.find((x) => x.id === "f-pollo")!.prices.push({
      id: "p2",
      date: "2026-10-16",
      presentation: "1 kg",
      presentationQty: 1000,
      price: 12000,
    });
    const est = monthSummary(d, "2026-10", "2026-10-03").estimate!;
    // 02..15 a $9.500 (14 días) y 16..31 a $12.000 (16 días).
    expect(est.filledTotal).toBeCloseTo(14 * 9500 + 16 * 12000);
  });

  it("sin días registrados no hay estimado", () => {
    expect(monthSummary(data, "2026-11", "2026-10-03").estimate).toBeNull();
  });

  it("el día tipo proyecta con el calendario del mes", () => {
    const s = monthSummary(data, "2026-10", "2026-10-03");
    expect(s.typicalDay?.costPerDay).toBeCloseTo(s.total);
    expect(s.typicalDay?.projection).toBeCloseTo(s.total * 31);
    const nov = monthSummary(data, "2026-11", "2026-10-03");
    expect(nov.typicalDay?.projection).toBeCloseTo(s.total * 30);
  });

  it("expande recursivamente 3 niveles respetando las porciones que rinde", () => {
    const exp = expand(index, r("r-dia-entreno"), 2);
    expect(exp.recipes.get("r-yogur-casero")).toBe(2);
    expect(exp.foods.get("f-leche-polvo")).toBeCloseTo((50 / 6) * 2);
    expect(exp.foods.get("f-arroz")).toBe((115 + 77) * 2);
  });

  it("primera fecha disponible de una receta", () => {
    expect(earliestDate(index, r("r-dia-entreno"))).toBe("2026-10-01");
  });

  it("lista de compras: estimado del mes, presentaciones redondeadas hacia arriba", () => {
    // No depende de la receta de día tipo: sale de los días registrados.
    const noTypical = { ...data, settings: {} };
    const list = shoppingList(noTypical, "2026-10", "2026-10-03")!;
    expect(list.daysRegistered).toBe(1);
    expect(list.daysEstimated).toBe(30);
    const pollo = list.rows.find((x) => x.foodId === "f-pollo")!;
    expect(pollo.qty).toBe(470 * 31);
    expect(pollo.presentations).toBe(15);
    expect(pollo.cost).toBe(15 * 9500);
    expect(pollo.consumedCost).toBeCloseTo(470 * 31 * 9.5);
    const huevos = list.rows.find((x) => x.foodId === "f-huevos")!;
    expect(huevos.presentations).toBe(Math.ceil((6 * 31) / 30));
    expect(list.consumedTotal).toBeCloseTo(monthSummary(data, "2026-10", "2026-10-03").estimate!.total);
    expect(list.total).toBeGreaterThanOrEqual(list.consumedTotal);
  });

  it("lista de compras vacía si el mes no tiene días registrados", () => {
    expect(shoppingList(data, "2026-11", "2026-10-03")).toBeNull();
  });

  it("desvincular reemplaza la receta por sus ingredientes directos", () => {
    const rows = unlinkConsumption(index, {
      id: "x",
      date: "2026-10-05",
      ref: r("r-merienda"),
      qty: 2,
    });
    expect(rows.map((x) => [x.ref.id, x.qty])).toEqual([
      ["r-yogur-casero", 2],
      ["f-proteina", 20],
      ["f-avena", 60],
      ["f-banana", 2],
    ]);
  });
});

describe("ciclos", () => {
  const recipes: Recipe[] = [
    { id: "a", name: "A", yields: 1, items: [{ id: "1", ref: r("b"), qty: 1 }] },
    { id: "b", name: "B", yields: 1, items: [{ id: "2", ref: r("c"), qty: 1 }] },
    { id: "c", name: "C", yields: 1, items: [{ id: "3", ref: f("x"), qty: 1 }] },
  ];
  const index = buildIndex({ foods: [], recipes });

  it("detecta auto-referencia, ciclo directo e indirecto", () => {
    expect(wouldCreateCycle(index, "a", r("a"))).toBe(true);
    expect(wouldCreateCycle(index, "b", r("a"))).toBe(true);
    expect(wouldCreateCycle(index, "c", r("a"))).toBe(true);
    expect(wouldCreateCycle(index, "a", r("c"))).toBe(false);
    expect(wouldCreateCycle(index, "a", f("x"))).toBe(false);
  });

  it("findCycle encuentra ciclos en el grafo", () => {
    expect(findCycle(recipes)).toBeNull();
    const cyclic = recipes.map((x) =>
      x.id === "c" ? { ...x, items: [{ id: "3", ref: r("a"), qty: 1 }] } : x,
    );
    expect(findCycle(cyclic)).toEqual(["a", "b", "c", "a"]);
  });

  it("Merienda yogurt no puede ir dentro de Yogur casero", () => {
    const sampleIndex = buildIndex(sampleData());
    expect(wouldCreateCycle(sampleIndex, "r-yogur-casero", r("r-merienda"))).toBe(true);
    expect(wouldCreateCycle(sampleIndex, "r-merienda", r("r-yogur-casero"))).toBe(false);
  });
});

describe("macros", () => {
  it("escala por 100 g o por unidad y reporta faltantes", () => {
    const data: AppData = {
      version: 1,
      foods: [
        {
          id: "arroz",
          name: "Arroz",
          unit: "g",
          prices: [],
          macros: { kcal: 350, protein: 7, carbs: 78, fat: 1 },
        },
        {
          id: "huevo",
          name: "Huevo",
          unit: "unidad",
          prices: [],
          macros: { kcal: 70, protein: 6, carbs: 0, fat: 5 },
        },
        { id: "sal", name: "Sal", unit: "g", prices: [] },
      ],
      recipes: [
        {
          id: "r",
          name: "R",
          yields: 2,
          items: [
            { id: "1", ref: f("arroz"), qty: 200 },
            { id: "2", ref: f("huevo"), qty: 2 },
            { id: "3", ref: f("sal"), qty: 2 },
          ],
        },
      ],
      consumptions: [],
      settings: {},
    };
    const m = macrosOf(buildIndex(data), r("r"), 1);
    expect(m.macros.kcal).toBeCloseTo(350 + 70);
    expect(m.macros.protein).toBeCloseTo(7 + 6);
    expect(m.incomplete).toEqual(["sal"]);
  });
});

describe("export / import", () => {
  const data = sampleData();

  it("public/datos-ejemplo.json es un archivo importable", () => {
    const text = readFileSync(new URL("../../public/datos-ejemplo.json", import.meta.url), "utf8");
    const parsed = parseImport(text);
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
  });

  it("round-trip completo", () => {
    const file = buildExport(data, "all");
    const parsed = parseImport(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data).toEqual(data);
  });

  it("export creciente: solo alimentos deja recetas y consumo vacíos", () => {
    const file = buildExport(data, "foods");
    expect(file.data.recipes).toBeUndefined();
    const parsed = parseImport(JSON.stringify(file));
    expect(parsed.ok && parsed.data.recipes.length === 0 && parsed.data.foods.length).toBe(14);
  });

  it("rechaza ciclos, referencias rotas y consumos sin precio", () => {
    const cyclic = structuredClone(data);
    cyclic.recipes.find((x) => x.id === "r-yogur-casero")!.items.push({
      id: "z",
      ref: r("r-merienda"),
      qty: 1,
    });
    const p1 = parseImport(JSON.stringify(buildExport(cyclic, "all")));
    expect(p1.ok).toBe(false);
    if (!p1.ok) expect(p1.errors.join()).toMatch(/cíclica/);

    const broken = structuredClone(data);
    broken.consumptions.push({ id: "z", date: "2026-10-02", ref: f("nope"), qty: 1 });
    expect(parseImport(JSON.stringify(buildExport(broken, "all"))).ok).toBe(false);

    const early = structuredClone(data);
    early.consumptions.push({ id: "z", date: "2026-09-30", ref: f("f-arroz"), qty: 1 });
    expect(uncostedConsumptions(early)).toHaveLength(1);
    expect(parseImport(JSON.stringify(buildExport(early, "all"))).ok).toBe(false);
  });

  it("rechaza archivos que no son de la app", () => {
    expect(parseImport("{}").ok).toBe(false);
    expect(parseImport("no json").ok).toBe(false);
  });
});

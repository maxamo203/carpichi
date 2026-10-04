import type { AppData, Food, Recipe, Ref, Unit } from "./types";

const PRICE_DATE = "2026-10-01";

const food = (
  id: string,
  name: string,
  unit: Unit,
  presentation: string,
  presentationQty: number,
  price: number,
): Food => ({
  id,
  name,
  unit,
  prices: [{ id: `${id}-p1`, date: PRICE_DATE, presentation, presentationQty, price }],
});

const f = (id: string): Ref => ({ kind: "food", id });
const r = (id: string): Ref => ({ kind: "recipe", id });

const recipe = (id: string, name: string, yields: number, items: [Ref, number][]): Recipe => ({
  id,
  name,
  yields,
  items: items.map(([ref, qty], i) => ({ id: `${id}-i${i}`, ref, qty })),
});

/** Datos de ejemplo tomados del Excel original. */
export function seedData(): AppData {
  const foods: Food[] = [
    food("f-huevos", "Huevos", "unidad", "Maple", 30, 6000),
    food("f-avena", "Avena", "g", "Paquete 500 g", 500, 2000),
    food("f-leche", "Leche", "ml", "Sachet 1 L", 1000, 2300),
    food("f-nesquik", "Nesquik", "g", "Paquete 360 g", 360, 5000),
    food("f-pollo", "Pollo", "g", "1 kg", 1000, 9500),
    food("f-atun", "Atún", "g", "Lata 160 g", 160, 2500),
    food("f-arroz", "Arroz", "g", "Paquete 1 kg", 1000, 1500),
    food("f-leche-polvo", "Leche en polvo", "g", "Bolsa 800 g", 800, 12000),
    food("f-yogur", "Yogur original", "unidad", "Pote", 1, 2500),
    food("f-pasas", "Pasas de uva", "g", "Bolsa 1 kg", 1000, 5000),
    food("f-banana", "Banana", "unidad", "1 kg (~5 u.)", 5, 2500),
    food("f-manzana", "Manzana", "unidad", "1 kg (~6 u.)", 6, 3000),
    food("f-proteina", "Proteína", "g", "Doypack 3 kg", 3000, 274000),
    food("f-creatina", "Creatina", "g", "Pote 1 kg", 1000, 72300),
  ];

  const recipes: Recipe[] = [
    recipe("r-yogur-casero", "Yogur casero", 6, [
      [f("f-leche"), 1000],
      [f("f-leche-polvo"), 50],
      [f("f-yogur"), 1],
    ]),
    recipe("r-pollo-arroz", "Pollo con arroz", 1, [
      [f("f-pollo"), 470],
      [f("f-arroz"), 115],
    ]),
    recipe("r-desayuno", "Desayuno huevos", 1, [
      [f("f-huevos"), 6],
      [f("f-avena"), 50],
      [f("f-leche"), 200],
      [f("f-nesquik"), 15],
    ]),
    recipe("r-merienda", "Merienda yogurt", 1, [
      [r("r-yogur-casero"), 1],
      [f("f-proteina"), 10],
      [f("f-avena"), 30],
      [f("f-banana"), 1],
    ]),
    recipe("r-atun-arroz", "Atún con arroz", 1, [
      [f("f-atun"), 90],
      [f("f-arroz"), 115],
    ]),
    recipe("r-dia-entreno", "Día entreno", 1, [
      [r("r-desayuno"), 1],
      [r("r-pollo-arroz"), 1],
      [r("r-merienda"), 1],
      [f("f-proteina"), 30],
      [f("f-leche"), 250],
      [f("f-creatina"), 5],
      [f("f-banana"), 1],
      [f("f-pasas"), 40],
      [f("f-atun"), 90],
      [f("f-arroz"), 77],
    ]),
  ];

  const day: [Ref, number][] = [
    [r("r-desayuno"), 1],
    [r("r-pollo-arroz"), 1],
    [r("r-merienda"), 1],
    [f("f-proteina"), 30],
    [f("f-leche"), 250],
    [f("f-creatina"), 5],
    [f("f-banana"), 1],
    [f("f-pasas"), 40],
    [f("f-atun"), 90],
    [f("f-arroz"), 77],
  ];

  return {
    version: 1,
    foods,
    recipes,
    consumptions: day.map(([ref, qty], i) => ({ id: `c-${i}`, date: PRICE_DATE, ref, qty })),
    settings: { typicalDayRecipeId: "r-dia-entreno" },
  };
}

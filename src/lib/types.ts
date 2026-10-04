export type Unit = "g" | "ml" | "unidad";

/** Fecha en formato YYYY-MM-DD. */
export type ISODate = string;

/** Mes en formato YYYY-MM. */
export type MonthKey = string;

export interface PriceEntry {
  id: string;
  /** Desde esta fecha (inclusive) rige el precio. */
  date: ISODate;
  /** Descripción libre de la presentación, ej. "Paquete 500 g". */
  presentation: string;
  /** Cantidad de la presentación expresada en la unidad base del alimento. */
  presentationQty: number;
  /** Precio de la presentación. */
  price: number;
}

/** Macros por 100 g / 100 ml, o por 1 unidad. */
export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Food {
  id: string;
  name: string;
  unit: Unit;
  prices: PriceEntry[];
  macros?: Macros;
}

export type RefKind = "food" | "recipe";

export interface Ref {
  kind: RefKind;
  id: string;
}

export interface RecipeItem {
  id: string;
  ref: Ref;
  /** En la unidad base del alimento, o en porciones si es una receta. */
  qty: number;
}

export interface Recipe {
  id: string;
  name: string;
  /** Porciones que rinde. */
  yields: number;
  items: RecipeItem[];
}

export interface Consumption {
  id: string;
  date: ISODate;
  ref: Ref;
  qty: number;
}

export interface Settings {
  typicalDayRecipeId?: string;
}

export interface AppData {
  version: 1;
  foods: Food[];
  recipes: Recipe[];
  consumptions: Consumption[];
  settings: Settings;
}

export const EMPTY_DATA: AppData = {
  version: 1,
  foods: [],
  recipes: [],
  consumptions: [],
  settings: {},
};

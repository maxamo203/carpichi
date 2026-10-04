import { exportFileSchema, validateData, type ExportFile, type ExportLevel } from "./schema";
import type { AppData } from "./types";

export const LEVEL_LABELS: Record<ExportLevel, string> = {
  foods: "Alimentos",
  recipes: "Alimentos + recetas",
  all: "Todo (alimentos + recetas + consumo)",
};

/** Export creciente: cada nivel incluye al anterior. */
export function buildExport(data: AppData, level: ExportLevel, now = new Date()): ExportFile {
  return {
    app: "trackeo-alimentos",
    version: 1,
    level,
    exportedAt: now.toISOString(),
    data: {
      foods: data.foods,
      ...(level !== "foods" && { recipes: data.recipes }),
      ...(level === "all" && { consumptions: data.consumptions, settings: data.settings }),
    },
  };
}

export function exportFileName(level: ExportLevel, date: string): string {
  return `trackeo-alimentos-${level}-${date}.json`;
}

export type ParseResult =
  | { ok: true; data: AppData; level: ExportLevel; exportedAt: string }
  | { ok: false; errors: string[] };

/** Descarga y valida los datos de ejemplo servidos desde public/datos-ejemplo.json. */
export async function loadExampleData(): Promise<ParseResult> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  try {
    const res = await fetch(`${basePath}/datos-ejemplo.json`, { cache: "no-store" });
    if (!res.ok) return { ok: false, errors: [`No se pudo descargar el ejemplo (HTTP ${res.status})`] };
    return parseImport(await res.text());
  } catch {
    return { ok: false, errors: ["No se pudo descargar el ejemplo"] };
  }
}

/** Parsea y valida un archivo exportado. Lo que el archivo no incluye queda vacío. */
export function parseImport(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["El archivo no es un JSON válido"] };
  }
  const parsed = exportFileSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues
        .slice(0, 10)
        .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`),
    };
  }
  const file = parsed.data;
  const data: AppData = {
    version: 1,
    foods: file.data.foods,
    recipes: file.data.recipes ?? [],
    consumptions: file.data.consumptions ?? [],
    settings: file.data.settings ?? {},
  };
  const errors = validateData(data);
  if (errors.length) return { ok: false, errors };
  return { ok: true, data, level: file.level, exportedAt: file.exportedAt };
}

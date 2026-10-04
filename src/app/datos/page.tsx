"use client";

import { DownloadIcon, SparklesIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { todayISO } from "@/lib/dates";
import { buildExport, exportFileName, LEVEL_LABELS, parseImport } from "@/lib/io";
import { exportLevels, type ExportLevel } from "@/lib/schema";
import { seedData } from "@/lib/seed";
import { useData, useStore } from "@/lib/store";
import { EMPTY_DATA, type AppData } from "@/lib/types";

function download(data: AppData, level: ExportLevel) {
  const file = buildExport(data, level);
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = exportFileName(level, todayISO());
  a.click();
  URL.revokeObjectURL(url);
}

type Pending =
  | { kind: "import"; data: AppData; level: ExportLevel; fileName: string }
  | { kind: "seed" }
  | { kind: "clear" };

export default function DatosPage() {
  const data = useData();
  const replaceAll = useStore((s) => s.replaceAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const counts = `${data.foods.length} alimentos · ${data.recipes.length} recetas · ${data.consumptions.length} consumos`;

  const onFile = async (file: File) => {
    const result = parseImport(await file.text());
    if (!result.ok) {
      setErrors(result.errors);
      toast.error("El archivo no es válido");
      return;
    }
    setErrors([]);
    setPending({ kind: "import", data: result.data, level: result.level, fileName: file.name });
  };

  const confirmText = (() => {
    if (!pending) return { title: "", description: "" };
    if (pending.kind === "import") {
      const d = pending.data;
      const lost =
        pending.level === "foods"
          ? " El archivo solo trae alimentos: recetas y consumo quedarán vacíos."
          : pending.level === "recipes"
            ? " El archivo no trae consumo: el registro diario quedará vacío."
            : "";
      return {
        title: `¿Importar "${pending.fileName}"?`,
        description: `Se reemplazan TODOS los datos actuales (${counts}) por los del archivo: ${d.foods.length} alimentos, ${d.recipes.length} recetas, ${d.consumptions.length} consumos.${lost}`,
      };
    }
    if (pending.kind === "seed")
      return {
        title: "¿Cargar datos de ejemplo?",
        description: `Se reemplazan todos los datos actuales (${counts}) por los del Excel de ejemplo.`,
      };
    return {
      title: "¿Borrar todos los datos?",
      description: `Se eliminan ${counts}. Descargá un backup antes si lo querés conservar.`,
    };
  })();

  return (
    <>
      <PageHeader
        title="Datos"
        description="Todo se guarda en este navegador (localStorage). Descargá un backup para no perderlo."
      />
      <p className="mb-4 text-sm text-muted-foreground">Actualmente: {counts}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Descargar</CardTitle>
            <CardDescription>Cada nivel incluye al anterior (no hay recetas sin sus alimentos).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {exportLevels.map((level) => (
              <Button
                key={level}
                variant={level === "all" ? "default" : "outline"}
                className="justify-start"
                onClick={() => download(data, level)}
              >
                <DownloadIcon /> {LEVEL_LABELS[level]}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Importar</CardTitle>
            <CardDescription>Reemplaza todos los datos actuales por los del archivo.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void onFile(file);
              }}
            />
            <Button variant="outline" className="justify-start" onClick={() => fileRef.current?.click()}>
              <UploadIcon /> Elegir archivo…
            </Button>
            {errors.length > 0 && (
              <ul className="list-disc rounded-lg border border-destructive/40 bg-destructive/5 p-3 pl-6 text-sm text-destructive">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datos de ejemplo</CardTitle>
            <CardDescription>Alimentos, recetas y un día de consumo tomados del Excel original.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setPending({ kind: "seed" })}>
              <SparklesIcon /> Cargar ejemplo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Borrar todo</CardTitle>
            <CardDescription>Deja la app vacía en este navegador.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setPending({ kind: "clear" })}>
              <Trash2Icon /> Borrar todos los datos
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title={confirmText.title}
        description={confirmText.description}
        confirmLabel={pending?.kind === "clear" ? "Borrar" : "Reemplazar"}
        destructive
        onConfirm={() => {
          if (!pending) return;
          if (pending.kind === "import") replaceAll(pending.data);
          else if (pending.kind === "seed") replaceAll(seedData());
          else replaceAll(EMPTY_DATA);
          toast.success(
            pending.kind === "import" ? "Datos importados" : pending.kind === "seed" ? "Ejemplo cargado" : "Datos borrados",
          );
        }}
      />
    </>
  );
}

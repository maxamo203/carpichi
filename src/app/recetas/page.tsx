"use client";

import { PlusIcon, StarIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, PageHeader } from "@/components/common";
import { RecipeEditor } from "@/components/recipe-editor";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { todayISO } from "@/lib/dates";
import { buildIndex, costAt, macrosOf, usagesOf } from "@/lib/engine";
import { formatMoney, formatQty } from "@/lib/format";
import { useData } from "@/lib/store";

export default function RecetasPage() {
  const data = useData();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const today = todayISO();

  const rows = useMemo(() => {
    const index = buildIndex(data);
    return [...data.recipes]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((r) => {
        const ref = { kind: "recipe" as const, id: r.id };
        const cost = costAt(index, ref, 1, today);
        const macros = macrosOf(index, ref, 1);
        const usages = usagesOf(data, ref);
        return { recipe: r, cost, macros, usedIn: usages.recipes.length, consumed: usages.consumptions.length };
      });
  }, [data, today]);

  return (
    <>
      <PageHeader
        title="Recetas"
        description="Combiná alimentos y otras recetas. Las recetas se registran por porción y su costo se reparte en sus ingredientes."
        actions={
          <Button onClick={() => setEditing("new")}>
            <PlusIcon /> Nueva receta
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState>
          Todavía no hay recetas.{" "}
          {data.foods.length === 0 && (
            <>
              Primero cargá <Link className="underline" href="/alimentos">alimentos</Link>.
            </>
          )}
        </EmptyState>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receta</TableHead>
                <TableHead className="text-right">Rinde</TableHead>
                <TableHead className="text-right">Ingredientes</TableHead>
                <TableHead className="text-right">Costo total (hoy)</TableHead>
                <TableHead className="text-right">Costo / porción</TableHead>
                <TableHead className="text-right">kcal / porción</TableHead>
                <TableHead>Uso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ recipe, cost, macros, usedIn, consumed }) => (
                <TableRow key={recipe.id} className="cursor-pointer" onClick={() => setEditing(recipe.id)}>
                  <TableCell className="font-medium">
                    {recipe.name}
                    {data.settings.typicalDayRecipeId === recipe.id && (
                      <StarIcon className="ml-1.5 inline size-3.5 fill-amber-400 text-amber-400" aria-label="Día tipo" />
                    )}
                  </TableCell>
                  <TableCell className="tabular text-right">{formatQty(recipe.yields)}</TableCell>
                  <TableCell className="tabular text-right">{recipe.items.length}</TableCell>
                  <TableCell className="tabular text-right">
                    {cost.ok ? formatMoney(cost.total * recipe.yields) : <span className="text-amber-600">sin precio</span>}
                  </TableCell>
                  <TableCell className="tabular text-right font-medium">
                    {cost.ok ? formatMoney(cost.total) : "—"}
                  </TableCell>
                  <TableCell className="tabular text-right text-muted-foreground">
                    {macros.macros.kcal === 0 && macros.incomplete.length > 0 ? (
                      "—"
                    ) : (
                      <span title={macros.incomplete.length ? "Hay ingredientes sin macros" : undefined}>
                        {formatQty(macros.macros.kcal, 0)}
                        {macros.incomplete.length > 0 && "*"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {[usedIn && `en ${usedIn} receta(s)`, consumed && `${consumed} consumo(s)`]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <RecipeEditor recipeId={editing} onClose={() => setEditing(null)} />
    </>
  );
}

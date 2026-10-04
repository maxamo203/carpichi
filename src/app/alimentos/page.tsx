"use client";

import { PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, PageHeader } from "@/components/common";
import { FoodEditor } from "@/components/food-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { todayISO } from "@/lib/dates";
import { latestPrice, priceAt, unitCost } from "@/lib/engine";
import { formatDate, formatMoney, formatQty, unitLabel } from "@/lib/format";
import { useData } from "@/lib/store";

export default function AlimentosPage() {
  const data = useData();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [query, setQuery] = useState("");
  const today = todayISO();

  const foods = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...data.foods]
      .filter((f) => !q || f.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.foods, query]);

  return (
    <>
      <PageHeader
        title="Alimentos"
        description="Precio de la presentación que comprás, con fecha desde la que rige. El consumo se registra en la unidad base."
        actions={
          <Button onClick={() => setEditing("new")}>
            <PlusIcon /> Nuevo alimento
          </Button>
        }
      />

      {data.foods.length === 0 ? (
        <EmptyState>
          Todavía no cargaste alimentos. Creá uno o cargá los datos de ejemplo desde{" "}
          <Link className="underline" href="/datos">Datos</Link>.
        </EmptyState>
      ) : (
        <>
          <div className="relative mb-3 max-w-xs">
            <SearchIcon className="absolute top-2 left-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alimento</TableHead>
                  <TableHead>Presentación</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Costo / unidad</TableHead>
                  <TableHead>Vigente desde</TableHead>
                  <TableHead className="text-right">kcal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {foods.map((f) => {
                  const current = priceAt(f, today);
                  const upcoming = latestPrice(f);
                  const p = current ?? upcoming;
                  return (
                    <TableRow key={f.id} className="cursor-pointer" onClick={() => setEditing(f.id)}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p?.presentation ?? "—"}</TableCell>
                      <TableCell className="tabular text-right">
                        {p ? `${formatQty(p.presentationQty)} ${unitLabel(f.unit)}` : "—"}
                      </TableCell>
                      <TableCell className="tabular text-right">{p ? formatMoney(p.price) : "—"}</TableCell>
                      <TableCell className="tabular text-right">
                        {p ? `${formatMoney(unitCost(p))} / ${unitLabel(f.unit)}` : "—"}
                      </TableCell>
                      <TableCell>
                        {!p ? (
                          <span className="text-destructive">Sin precio</span>
                        ) : (
                          <>
                            {formatDate(p.date)}
                            {!current && <span className="ml-1 text-xs text-amber-600">(futuro)</span>}
                            {f.prices.length > 1 && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                · {f.prices.length} precios
                              </span>
                            )}
                          </>
                        )}
                      </TableCell>
                      <TableCell className="tabular text-right text-muted-foreground">
                        {f.macros ? formatQty(f.macros.kcal, 0) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <FoodEditor
        foodId={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

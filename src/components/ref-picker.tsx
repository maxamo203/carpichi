"use client";

import { BookOpenIcon, ChevronsUpDownIcon, PackageIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buildIndex, refName, sameRef } from "@/lib/engine";
import { unitLabel } from "@/lib/format";
import { useData } from "@/lib/store";
import type { Ref } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Combobox para elegir un alimento o una receta.
 * `disabledReason` permite deshabilitar opciones (ej. las que crearían un ciclo).
 */
export function RefPicker({
  value,
  onChange,
  disabledReason,
  placeholder = "Elegí alimento o receta…",
  className,
}: {
  value: Ref | null;
  onChange: (ref: Ref) => void;
  disabledReason?: (ref: Ref) => string | null;
  placeholder?: string;
  className?: string;
}) {
  const data = useData();
  const index = buildIndex(data);
  const [open, setOpen] = useState(false);

  const foods = useMemo(
    () => [...data.foods].sort((a, b) => a.name.localeCompare(b.name)),
    [data.foods],
  );
  const recipes = useMemo(
    () => [...data.recipes].sort((a, b) => a.name.localeCompare(b.name)),
    [data.recipes],
  );

  const option = (ref: Ref, name: string, unit: string) => {
    const reason = disabledReason?.(ref) ?? null;
    return (
      <CommandItem
        key={`${ref.kind}:${ref.id}`}
        value={`${name} ${ref.kind}:${ref.id}`}
        disabled={!!reason}
        data-checked={value ? sameRef(value, ref) : false}
        onSelect={() => {
          onChange(ref);
          setOpen(false);
        }}
      >
        {ref.kind === "food" ? <PackageIcon /> : <BookOpenIcon />}
        <span className="truncate">{name}</span>
        <span className="text-xs text-muted-foreground">{reason ?? unit}</span>
      </CommandItem>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn("w-full justify-between font-normal", className)}
          />
        }
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value ? refName(index, value) : placeholder}
        </span>
        <ChevronsUpDownIcon className="opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar…" />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            {foods.length > 0 && (
              <CommandGroup heading="Alimentos">
                {foods.map((f) => option({ kind: "food", id: f.id }, f.name, unitLabel(f.unit)))}
              </CommandGroup>
            )}
            {recipes.length > 0 && (
              <CommandGroup heading="Recetas">
                {recipes.map((r) => option({ kind: "recipe", id: r.id }, r.name, "porción"))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

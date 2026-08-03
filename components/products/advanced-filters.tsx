"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LOW_STOCK_THRESHOLD } from "@/lib/validators/product";

export type AdvancedFilterValues = {
  minPrice: string;
  maxPrice: string;
  lowStock: boolean;
};

/**
 * Filtros que no entran en la barra principal: rango de precio y stock bajo.
 *
 * Van en un popover con un botón "Aplicar" en vez de navegar en cada tecla:
 * un rango se escribe en varios pasos y aplicar el filtro con el mínimo a
 * medio tipear daría resultados que saltan mientras el usuario escribe.
 */
export function AdvancedFilters({
  values,
  onApply,
  onClear,
}: {
  values: AdvancedFilterValues;
  onApply: (values: AdvancedFilterValues) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AdvancedFilterValues>(values);

  const activeCount =
    (values.minPrice ? 1 : 0) + (values.maxPrice ? 1 : 0) + (values.lowStock ? 1 : 0);

  const invalidRange =
    draft.minPrice !== "" &&
    draft.maxPrice !== "" &&
    Number(draft.minPrice) > Number(draft.maxPrice);

  function handleOpenChange(next: boolean): void {
    // Al abrir se parte siempre de lo que hay aplicado, para no arrastrar un
    // borrador a medio escribir de la vez anterior.
    if (next) setDraft(values);
    setOpen(next);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <SlidersHorizontal className="size-4" />
          Más filtros
          {activeCount > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 space-y-4">
        <div className="space-y-2">
          <Label>Rango de precio</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="Mínimo"
              aria-label="Precio mínimo"
              value={draft.minPrice}
              onChange={(event) => setDraft({ ...draft, minPrice: event.target.value })}
            />
            <span className="text-muted-foreground text-sm">–</span>
            <Input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="Máximo"
              aria-label="Precio máximo"
              value={draft.maxPrice}
              onChange={(event) => setDraft({ ...draft, maxPrice: event.target.value })}
            />
          </div>
          {invalidRange && (
            <p className="text-destructive text-xs">El mínimo no puede ser mayor que el máximo.</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="lowStock"
            checked={draft.lowStock}
            onCheckedChange={(checked) => setDraft({ ...draft, lowStock: checked === true })}
          />
          <Label htmlFor="lowStock" className="font-normal">
            Sólo stock bajo (menos de {LOW_STOCK_THRESHOLD})
          </Label>
        </div>

        <div className="flex justify-between gap-2 border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onClear();
              setOpen(false);
            }}
            disabled={activeCount === 0}
          >
            Limpiar
          </Button>
          <Button
            size="sm"
            disabled={invalidRange}
            onClick={() => {
              onApply(draft);
              setOpen(false);
            }}
          >
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

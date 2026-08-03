"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { AdvancedFilters, type AdvancedFilterValues } from "@/components/products/advanced-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryWithCount } from "@/lib/types";

/** Valor del `<Select>` que representa "sin filtro" (no puede ser ""). */
const ALL = "__all__";

const SEARCH_DEBOUNCE_MS = 350;

/** Parámetros que cuentan como filtro y que borra el botón "Limpiar". */
const FILTER_KEYS = ["q", "categoryId", "status", "minPrice", "maxPrice", "lowStock"] as const;

export function ProductFilters({ categories }: { categories: CategoryWithCount[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQ = searchParams.get("q") ?? "";
  const [searchTerm, setSearchTerm] = useState(currentQ);
  const [syncedQ, setSyncedQ] = useState(currentQ);

  // Si la URL cambia por fuera (botón atrás, "limpiar"), el input la sigue.
  // Se ajusta durante el render en vez de en un efecto: React descarta el
  // render en curso y vuelve a empezar con el valor nuevo, sin el commit
  // intermedio ni la cascada de renders que provoca setState en useEffect.
  if (syncedQ !== currentQ) {
    setSyncedQ(currentQ);
    setSearchTerm(currentQ);
  }

  /** Reescribe la query string preservando el resto de los filtros. */
  function applyFilter(updates: Record<string, string | null>): void {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    // Cualquier cambio de filtro invalida la página actual.
    params.delete("page");

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  // Se espera a que el usuario deje de escribir para no navegar en cada tecla.
  useEffect(() => {
    if (searchTerm === currentQ) return;

    const timeout = setTimeout(() => {
      applyFilter({ q: searchTerm || null });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const hasFilters = FILTER_KEYS.some((key) => searchParams.get(key));

  const advancedValues: AdvancedFilterValues = {
    minPrice: searchParams.get("minPrice") ?? "",
    maxPrice: searchParams.get("maxPrice") ?? "",
    lowStock: searchParams.get("lowStock") === "true",
  };

  function clearAll(): void {
    applyFilter(Object.fromEntries(FILTER_KEYS.map((key) => [key, null])));
  }

  return (
    <div className="flex flex-wrap items-center gap-2" data-pending={isPending ? "" : undefined}>
      <div className="relative min-w-56 flex-1">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por nombre o SKU…"
          className="pl-9"
          aria-label="Buscar productos"
        />
      </div>

      <Select
        value={searchParams.get("categoryId") ?? ALL}
        onValueChange={(value) => applyFilter({ categoryId: value === ALL ? null : value })}
      >
        <SelectTrigger className="w-48" aria-label="Filtrar por categoría">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas las categorías</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={String(category.id)}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("status") ?? ALL}
        onValueChange={(value) => applyFilter({ status: value === ALL ? null : value })}
      >
        <SelectTrigger className="w-40" aria-label="Filtrar por estado">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los estados</SelectItem>
          <SelectItem value="active">Activo</SelectItem>
          <SelectItem value="discontinued">Descontinuado</SelectItem>
        </SelectContent>
      </Select>

      <AdvancedFilters
        values={advancedValues}
        onApply={(next) =>
          applyFilter({
            minPrice: next.minPrice || null,
            maxPrice: next.maxPrice || null,
            lowStock: next.lowStock ? "true" : null,
          })
        }
        onClear={() => applyFilter({ minPrice: null, maxPrice: null, lowStock: null })}
      />

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="size-4" />
          Limpiar
        </Button>
      )}
    </div>
  );
}

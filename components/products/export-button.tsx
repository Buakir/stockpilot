"use client";

import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * Descarga el catálogo filtrado.
 *
 * Es un `<a download>` y no un fetch: el navegador maneja la descarga con el
 * nombre que manda el `Content-Disposition`, sin blobs ni URLs temporales.
 * Se arrastran los filtros actuales para que el CSV coincida con lo que se ve.
 */
export function ExportButton() {
  const searchParams = useSearchParams();

  // La paginación no aplica al export: se llevan todas las filas que matchean.
  const params = new URLSearchParams(searchParams.toString());
  params.delete("page");
  params.delete("pageSize");

  const href = `/api/products/export${params.size > 0 ? `?${params.toString()}` : ""}`;

  return (
    <Button variant="outline" asChild>
      <a href={href} download>
        <Download className="size-4" />
        Exportar CSV
      </a>
    </Button>
  );
}

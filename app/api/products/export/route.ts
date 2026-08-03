import { type NextRequest } from "next/server";

import { toErrorResponse } from "@/lib/api-error";
import { toCsv, UTF8_BOM } from "@/lib/csv";
import { listProductsForExport } from "@/lib/queries/products";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import type { ProductWithCategory } from "@/lib/types";
import { parseProductQuery } from "@/lib/validators/product";

/**
 * Columnas del CSV.
 *
 * El orden y los nombres coinciden con los que espera la carga masiva, así que
 * un export se puede editar y volver a subir sin retocar el encabezado.
 */
const COLUMNS = [
  { key: "sku", header: "sku" },
  { key: "name", header: "nombre" },
  { key: "description", header: "descripcion" },
  { key: "category_name", header: "categoria" },
  { key: "price", header: "precio" },
  { key: "stock", header: "stock" },
  { key: "status", header: "estado" },
] as const satisfies ReadonlyArray<{ key: keyof ProductWithCategory; header: string }>;

/** GET /api/products/export — CSV del catálogo con los filtros aplicados. */
export async function GET(request: NextRequest) {
  try {
    await requireUser();

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = parseProductQuery(params);
    const products = await listProductsForExport(filters);

    const csv = UTF8_BOM + toCsv(products, COLUMNS);
    const filename = `stockpilot-productos-${formatDate(new Date()).replaceAll("/", "-")}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        // Es una descarga puntual sobre datos que cambian: no se cachea.
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

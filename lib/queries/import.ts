import "server-only";

import { badRequest } from "@/lib/api-error";
import { parseCsv } from "@/lib/csv";
import { query, withTransaction } from "@/lib/db";
import {
  importRowSchema,
  IMPORT_HEADERS,
  MAX_IMPORT_ROWS,
  type ImportHeader,
  type ImportReport,
  type ImportRow,
  type RejectedRow,
} from "@/lib/validators/import";
import { flattenZodError } from "@/lib/validators/utils";

/** Quita acentos y espacios del encabezado para tolerar "descripción"/"Descripcion". */
function normalizeHeader(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      // NFD separa la tilde en un carácter combinante; este rango los elimina.
      .replace(/[\u0300-\u036f]/g, "")
  );
}

/**
 * Importa productos desde un CSV.
 *
 * Estrategia: se valida **todo** el archivo primero y recién después se
 * insertan las filas válidas, en una única transacción. Así el resultado es
 * predecible — o entran todas las filas buenas o no entra ninguna — y el
 * usuario recibe el listado completo de rechazos en una sola pasada, en vez de
 * ir corrigiendo de a un error por intento.
 */
export async function importProductsFromCsv(csvText: string): Promise<ImportReport> {
  const rows = parseCsv(csvText);

  const headerRow = rows[0];
  if (!headerRow) throw badRequest("El archivo está vacío.");

  const headers = headerRow.map(normalizeHeader);
  const missing = IMPORT_HEADERS.filter((expected) => !headers.includes(expected));
  if (missing.length > 0) {
    throw badRequest(
      `Al encabezado le faltan columnas: ${missing.join(", ")}. Se esperan: ${IMPORT_HEADERS.join(", ")}.`,
    );
  }

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) throw badRequest("El archivo no tiene filas de datos.");
  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw badRequest(`El archivo tiene ${dataRows.length} filas; el máximo es ${MAX_IMPORT_ROWS}.`);
  }

  // Índice de cada columna esperada, para no depender del orden del archivo.
  const columnIndex = new Map(IMPORT_HEADERS.map((name) => [name, headers.indexOf(name)]));

  // Se resuelven categorías y SKUs existentes de una vez, en vez de una query
  // por fila: con 2000 filas eso serían 4000 idas a la base.
  const categories = await query<{ id: number; name: string }>("SELECT id, name FROM categories");
  const categoryByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id]));

  const existingSkus = await query<{ sku: string }>("SELECT sku FROM products");
  const takenSkus = new Set(existingSkus.map((row) => row.sku));

  const valid: Array<ImportRow & { category_id: number | null }> = [];
  const rejected: RejectedRow[] = [];
  const seenInFile = new Set<string>();

  dataRows.forEach((cells, index) => {
    // +2: el encabezado es la línea 1 y las filas empiezan en la 2.
    const line = index + 2;

    const raw: Record<ImportHeader, string> = Object.fromEntries(
      IMPORT_HEADERS.map((name) => [name, cells[columnIndex.get(name)!] ?? ""]),
    ) as Record<ImportHeader, string>;

    const parsed = importRowSchema.safeParse(raw);
    if (!parsed.success) {
      rejected.push({
        line,
        sku: raw.sku,
        errors: Object.values(flattenZodError(parsed.error)).flat(),
      });
      return;
    }

    const row = parsed.data;
    const errors: string[] = [];

    if (takenSkus.has(row.sku)) {
      errors.push(`Ya existe un producto con el SKU ${row.sku}.`);
    }
    if (seenInFile.has(row.sku)) {
      errors.push(`El SKU ${row.sku} está repetido dentro del archivo.`);
    }

    let categoryId: number | null = null;
    if (row.categoria) {
      const found = categoryByName.get(row.categoria.toLowerCase());
      if (found === undefined) {
        errors.push(`La categoría "${row.categoria}" no existe. Créala antes de importar.`);
      } else {
        categoryId = found;
      }
    }

    if (errors.length > 0) {
      rejected.push({ line, sku: row.sku, errors });
      return;
    }

    seenInFile.add(row.sku);
    valid.push({ ...row, category_id: categoryId });
  });

  if (valid.length > 0) {
    await withTransaction(async (client) => {
      for (const row of valid) {
        await client.query(
          `INSERT INTO products (sku, name, description, category_id, price, stock, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            row.sku,
            row.nombre,
            row.descripcion,
            row.category_id,
            row.precio,
            row.stock,
            row.estado,
          ],
        );
      }
    });
  }

  return { imported: valid.length, rejected, totalRows: dataRows.length };
}

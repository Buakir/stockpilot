import { z } from "zod";

import { PRODUCT_STATUSES, type ProductStatus } from "@/lib/types";
import { SKU_PATTERN } from "@/lib/validators/product";

/** Tope de filas por archivo: mantiene acotado el trabajo de una sola request. */
export const MAX_IMPORT_ROWS = 2_000;

/** Tope de tamaño del archivo (2 MB). */
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

/**
 * Encabezados esperados, en minúsculas y sin acentos.
 *
 * Coinciden con los que emite la exportación, así que un CSV exportado se
 * puede editar y volver a subir tal cual.
 */
export const IMPORT_HEADERS = [
  "sku",
  "nombre",
  "descripcion",
  "categoria",
  "precio",
  "stock",
  "estado",
] as const;

export type ImportHeader = (typeof IMPORT_HEADERS)[number];

/** Acepta el estado en inglés (como lo guarda la base) o en español. */
const STATUS_ALIASES: Record<string, ProductStatus> = {
  active: "active",
  activo: "active",
  discontinued: "discontinued",
  descontinuado: "discontinued",
};

/**
 * Convierte a número un valor escrito por una persona o exportado por la app.
 *
 * La coma **siempre** es el separador decimal: si aparece, los puntos son
 * separadores de miles ("12.990,50" → 12990.5). Sin coma, el punto es decimal
 * ("1250.5" → 1250.5), que es el formato que emite la exportación — así un CSV
 * exportado se puede volver a importar sin que los precios se multipliquen por
 * cien. Devuelve NaN si no es un número, y el esquema lo rechaza.
 */
function parseNumeric(input: string): number {
  const value = input.trim();
  if (value === "") return Number.NaN;

  const normalized = value.includes(",") ? value.replaceAll(".", "").replace(",", ".") : value;

  return Number(normalized);
}

/**
 * Una fila del CSV.
 *
 * Todo llega como string, así que la conversión es parte de la validación. Los
 * mensajes están redactados para mostrarse tal cual en el reporte de rechazos.
 */
export const importRowSchema = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(SKU_PATTERN, "SKU inválido: usa entre 2 y 32 caracteres A-Z, 0-9 y guiones."),
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(120, "El nombre no puede superar los 120 caracteres."),
  descripcion: z
    .string()
    .trim()
    .max(1000, "La descripción no puede superar los 1000 caracteres.")
    .optional()
    .transform((value) => (value ? value : null)),
  categoria: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  precio: z
    .string()
    .trim()
    .transform(parseNumeric)
    .pipe(
      z
        .number()
        .refine(Number.isFinite, "El precio debe ser un número.")
        .min(0, "El precio no puede ser negativo.")
        .max(9_999_999_999.99, "El precio es demasiado alto."),
    ),
  stock: z
    .string()
    .trim()
    .transform(parseNumeric)
    .pipe(
      z
        .number()
        .refine(Number.isFinite, "El stock debe ser un número.")
        .int("El stock debe ser un número entero.")
        .min(0, "El stock no puede ser negativo."),
    ),
  estado: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => STATUS_ALIASES[value])
    .refine(
      (value): value is ProductStatus => value !== undefined,
      `El estado debe ser uno de: ${PRODUCT_STATUSES.join(", ")} (o activo/descontinuado).`,
    ),
});

export type ImportRow = z.infer<typeof importRowSchema>;

/** Una fila que no se pudo importar, con su número de línea y el motivo. */
export type RejectedRow = {
  /** Número de línea en el archivo, contando el encabezado como línea 1. */
  line: number;
  sku: string;
  errors: string[];
};

export type ImportReport = {
  imported: number;
  rejected: RejectedRow[];
  totalRows: number;
};

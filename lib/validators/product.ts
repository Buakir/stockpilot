import { z } from "zod";

import { PRODUCT_STATUSES } from "@/lib/types";

/** Precio máximo representable por la columna NUMERIC(12,2). */
const MAX_PRICE = 9_999_999_999.99;

export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,31}$/;

const skuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(SKU_PATTERN, "El SKU debe tener entre 2 y 32 caracteres: A-Z, 0-9 y guiones.");

/**
 * Campos editables de un producto.
 *
 * Se usa como base tanto para crear (todos requeridos) como para editar
 * (`.partial()`), así una sola definición cubre los dos casos.
 */
const productFields = {
  sku: skuSchema,
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(120),
  description: z
    .string()
    .trim()
    .max(1000, "La descripción no puede superar los 1000 caracteres.")
    .nullish()
    // El input vacío del formulario llega como "": se guarda NULL, no "".
    .transform((value) => (value ? value : null)),
  category_id: z.coerce
    .number()
    .int()
    .positive("Seleccioná una categoría válida.")
    .nullish()
    .transform((value) => value ?? null),
  price: z.coerce
    .number()
    .min(0, "El precio no puede ser negativo.")
    .max(MAX_PRICE, "El precio es demasiado alto.")
    // NUMERIC(12,2): más decimales se truncarían silenciosamente en la base.
    // Se compara contra una tolerancia porque el producto por 100 no es exacto
    // en punto flotante: 10.99 * 100 da 1098.9999999999998, no 1099.
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9, {
      message: "El precio admite como máximo 2 decimales.",
    }),
  stock: z.coerce
    .number()
    .int("El stock debe ser un número entero.")
    .min(0, "El stock no puede ser negativo."),
  status: z.enum(PRODUCT_STATUSES),
};

export const createProductSchema = z.object(productFields);

/** En una edición parcial hay que enviar al menos un campo. */
export const updateProductSchema = z
  .object(productFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay cambios para guardar.",
  });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const PRODUCT_SORT_FIELDS = ["name", "sku", "price", "stock", "created_at"] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

/** Umbral por defecto para el filtro "stock bajo". */
export const LOW_STOCK_THRESHOLD = 10;

/**
 * Filtros del listado. Todo llega como string desde la query string, por eso
 * el `coerce`; los valores fuera de rango se recortan en vez de rechazarse,
 * para que una URL manipulada a mano no rompa la página.
 */
export const productQuerySchema = z.object({
  q: z.string().trim().max(120).optional().catch(undefined),
  categoryId: z.coerce.number().int().positive().optional().catch(undefined),
  status: z.enum(PRODUCT_STATUSES).optional().catch(undefined),
  minPrice: z.coerce.number().min(0).optional().catch(undefined),
  maxPrice: z.coerce.number().min(0).optional().catch(undefined),
  lowStock: z
    .union([z.literal("true"), z.literal("1"), z.literal("false"), z.literal("0")])
    .optional()
    .catch(undefined)
    .transform((value) => value === "true" || value === "1"),
  sort: z.enum(PRODUCT_SORT_FIELDS).default("created_at").catch("created_at"),
  order: z.enum(["asc", "desc"]).default("desc").catch("desc"),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20).catch(20),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

/** Parsea `searchParams` descartando los valores inválidos. */
export function parseProductQuery(params: Record<string, string | string[] | undefined>) {
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    flat[key] = Array.isArray(value) ? value[0] : value;
    if (flat[key] === "") delete flat[key];
  }
  return productQuerySchema.parse(flat);
}

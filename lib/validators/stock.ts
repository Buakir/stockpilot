import { z } from "zod";

/** Tope por movimiento: atrapa un cero de más al tipear una cantidad. */
const MAX_DELTA = 100_000;

export const adjustStockSchema = z.object({
  delta: z.coerce
    .number()
    .int("La cantidad debe ser un número entero.")
    .refine((value) => value !== 0, "La cantidad no puede ser cero.")
    .refine(
      (value) => Math.abs(value) <= MAX_DELTA,
      `La cantidad no puede superar las ${MAX_DELTA.toLocaleString("es-CL")} unidades.`,
    ),
  reason: z
    .string()
    .trim()
    .min(3, "Indicá el motivo del ajuste (mínimo 3 caracteres).")
    .max(200, "El motivo no puede superar los 200 caracteres."),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

/** Motivos frecuentes, para no obligar a escribirlos cada vez. */
export const COMMON_REASONS = [
  "Recepción de mercadería",
  "Venta en mostrador",
  "Ajuste por inventario físico",
  "Devolución de cliente",
  "Merma por daño",
  "Traspaso entre bodegas",
] as const;

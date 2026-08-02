import type { ZodError } from "zod";

/** Errores por campo, listos para pintar bajo cada input: `{ sku: ["..."] }`. */
export type FieldErrors = Record<string, string[]>;

/** Agrupa los issues de Zod por la ruta del campo al que corresponden. */
export function flattenZodError(error: ZodError): FieldErrors {
  const details: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (details[key] ??= []).push(issue.message);
  }
  return details;
}

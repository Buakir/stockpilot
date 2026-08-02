import { z } from "zod";

const categoryFields = {
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(80),
  description: z
    .string()
    .trim()
    .max(500, "La descripción no puede superar los 500 caracteres.")
    .nullish()
    .transform((value) => (value ? value : null)),
};

export const createCategorySchema = z.object(categoryFields);

export const updateCategorySchema = z
  .object(categoryFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay cambios para guardar.",
  });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

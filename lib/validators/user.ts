import { z } from "zod";

import { USER_ROLES } from "@/lib/types";

/** Mínimo razonable sin caer en reglas de composición que sólo molestan. */
const MIN_PASSWORD_LENGTH = 8;

const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
  .max(72, "La contraseña no puede superar los 72 caracteres.");

export const createUserSchema = z.object({
  email: z.email("Ingresá un email válido.").trim().toLowerCase(),
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(80),
  role: z.enum(USER_ROLES),
  password: passwordSchema,
});

/**
 * Edición parcial. La contraseña es opcional: si no viene, se deja la que
 * estaba, en vez de obligar a reescribirla para cambiar el nombre o el rol.
 */
export const updateUserSchema = z
  .object({
    email: z.email("Ingresá un email válido.").trim().toLowerCase(),
    name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(80),
    role: z.enum(USER_ROLES),
    password: passwordSchema.optional(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay cambios para guardar.",
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

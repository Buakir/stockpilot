import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { flattenZodError, type FieldErrors } from "@/lib/validators/utils";

/**
 * Error de aplicación con un status HTTP y un código estable.
 *
 * Todo lo que llegue al cliente pasa por acá. Cualquier otra excepción
 * (incluidos los errores crudos de PostgreSQL) se convierte en un 500 genérico
 * y sólo se registra en el servidor: nunca se filtra el mensaje original.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: FieldErrors,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (message: string, details?: FieldErrors): ApiError =>
  new ApiError(400, "BAD_REQUEST", message, details);

export const unauthorized = (message = "Necesitas iniciar sesión."): ApiError =>
  new ApiError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "No tienes permisos para realizar esta acción."): ApiError =>
  new ApiError(403, "FORBIDDEN", message);

export const notFound = (message = "El recurso no existe."): ApiError =>
  new ApiError(404, "NOT_FOUND", message);

export const conflict = (message: string): ApiError => new ApiError(409, "CONFLICT", message);

/** Forma del cuerpo de error que consume el cliente. */
export type ApiErrorBody = {
  error: { code: string; message: string; details?: FieldErrors };
};

/** Códigos de error de PostgreSQL que sí conviene traducir a un 4xx. */
const PG_ERROR_MESSAGES: Record<string, string> = {
  "23505": "Ya existe un registro con ese valor único.",
  "23503": "El registro referenciado no existe.",
  "23514": "Los datos no cumplen una restricción de la base de datos.",
};

function pgErrorCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code } = error as { code: unknown };
    return typeof code === "string" ? code : null;
  }
  return null;
}

/** Convierte cualquier excepción en una respuesta JSON segura. */
export function toErrorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details && { details: error.details }),
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Los datos enviados no son válidos.",
          details: flattenZodError(error),
        },
      },
      { status: 400 },
    );
  }

  const code = pgErrorCode(error);
  if (code && code in PG_ERROR_MESSAGES) {
    console.error("[api] error de base de datos", error);
    return NextResponse.json(
      { error: { code: "DB_CONSTRAINT", message: PG_ERROR_MESSAGES[code]! } },
      { status: 409 },
    );
  }

  console.error("[api] error no controlado", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Ocurrió un error inesperado." } },
    { status: 500 },
  );
}

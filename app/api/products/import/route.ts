import { NextResponse, type NextRequest } from "next/server";

import { badRequest, toErrorResponse } from "@/lib/api-error";
import { importProductsFromCsv } from "@/lib/queries/import";
import { requirePermission } from "@/lib/session";
import { MAX_IMPORT_BYTES } from "@/lib/validators/import";

/**
 * POST /api/products/import — carga masiva desde un CSV.
 *
 * Recibe `multipart/form-data` con el campo `file`. Requiere admin o manager.
 */
export async function POST(request: NextRequest) {
  try {
    await requirePermission("products:import");

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw badRequest("Adjuntá un archivo CSV en el campo 'file'.");
    }
    if (file.size === 0) {
      throw badRequest("El archivo está vacío.");
    }
    if (file.size > MAX_IMPORT_BYTES) {
      throw badRequest(
        `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo es ${MAX_IMPORT_BYTES / 1024 / 1024} MB.`,
      );
    }

    const report = await importProductsFromCsv(await file.text());
    return NextResponse.json(report);
  } catch (error) {
    return toErrorResponse(error);
  }
}

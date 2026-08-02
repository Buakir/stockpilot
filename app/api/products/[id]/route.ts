import { NextResponse, type NextRequest } from "next/server";

import { badRequest, conflict, notFound, toErrorResponse } from "@/lib/api-error";
import {
  deleteProduct,
  findProductBySku,
  getProductById,
  updateProduct,
} from "@/lib/queries/products";
import { requirePermission, requireUser } from "@/lib/session";
import { updateProductSchema } from "@/lib/validators/product";

type RouteContext = { params: Promise<{ id: string }> };

/** Convierte el segmento `[id]` en un entero, o lanza 400. */
async function parseId(context: RouteContext): Promise<number> {
  const { id } = await context.params;
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw badRequest("El identificador del producto no es válido.");
  }
  return parsed;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireUser();

    const product = await getProductById(await parseId(context));
    if (!product) throw notFound("El producto no existe.");

    return NextResponse.json(product);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** PATCH /api/products/[id] — edición parcial. Requiere admin o manager. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requirePermission("products:write");

    const id = await parseId(context);
    const body: unknown = await request.json();
    const input = updateProductSchema.parse(body);

    if (input.sku) {
      const existing = await findProductBySku(input.sku);
      if (existing && existing.id !== id) {
        throw conflict(`Ya existe otro producto con el SKU ${input.sku}.`);
      }
    }

    const product = await updateProduct(id, input);
    if (!product) throw notFound("El producto no existe.");

    return NextResponse.json(product);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** DELETE /api/products/[id] — sólo admin. */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await requirePermission("products:delete");

    const removed = await deleteProduct(await parseId(context));
    if (!removed) throw notFound("El producto no existe.");

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

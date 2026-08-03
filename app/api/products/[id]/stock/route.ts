import { NextResponse, type NextRequest } from "next/server";

import { badRequest, toErrorResponse } from "@/lib/api-error";
import { adjustStock, listMovementsByProduct } from "@/lib/queries/stock";
import { requirePermission, requireUser } from "@/lib/session";
import { adjustStockSchema } from "@/lib/validators/stock";

type RouteContext = { params: Promise<{ id: string }> };

async function parseId(context: RouteContext): Promise<number> {
  const { id } = await context.params;
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw badRequest("El identificador del producto no es válido.");
  }
  return parsed;
}

/** GET /api/products/[id]/stock — historial de movimientos del producto. */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireUser();
    const movements = await listMovementsByProduct(await parseId(context));
    return NextResponse.json(movements);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * POST /api/products/[id]/stock — ajusta el stock. Requiere admin o manager.
 *
 * El autor del movimiento sale de la sesión, nunca del body: si viniera del
 * cliente, cualquiera podría firmar un ajuste con el id de otro usuario.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission("stock:adjust");

    const id = await parseId(context);
    const body: unknown = await request.json();
    const input = adjustStockSchema.parse(body);

    const product = await adjustStock(id, input, user.id);
    return NextResponse.json(product);
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { NextResponse, type NextRequest } from "next/server";

import { conflict, toErrorResponse } from "@/lib/api-error";
import { createProduct, findProductBySku, listProducts } from "@/lib/queries/products";
import { requirePermission, requireUser } from "@/lib/session";
import { createProductSchema, parseProductQuery } from "@/lib/validators/product";

/** GET /api/products — listado filtrado y paginado. */
export async function GET(request: NextRequest) {
  try {
    await requireUser();

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = parseProductQuery(params);
    const result = await listProducts(filters);

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** POST /api/products — crea un producto. Requiere admin o manager. */
export async function POST(request: NextRequest) {
  try {
    await requirePermission("products:write");

    const body: unknown = await request.json();
    const input = createProductSchema.parse(body);

    // El índice único de la base es la garantía real; esto sólo permite dar un
    // mensaje que apunte al campo correcto en vez de un 409 genérico.
    if (await findProductBySku(input.sku)) {
      throw conflict(`Ya existe un producto con el SKU ${input.sku}.`);
    }

    const product = await createProduct(input);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

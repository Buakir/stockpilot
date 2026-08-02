import { NextResponse, type NextRequest } from "next/server";

import { badRequest, notFound, toErrorResponse } from "@/lib/api-error";
import { deleteCategory, updateCategory } from "@/lib/queries/categories";
import { requirePermission } from "@/lib/session";
import { updateCategorySchema } from "@/lib/validators/category";

type RouteContext = { params: Promise<{ id: string }> };

async function parseId(context: RouteContext): Promise<number> {
  const { id } = await context.params;
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw badRequest("El identificador de la categoría no es válido.");
  }
  return parsed;
}

/** PATCH /api/categories/[id] — requiere admin o manager. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requirePermission("categories:write");

    const id = await parseId(context);
    const body: unknown = await request.json();
    const input = updateCategorySchema.parse(body);

    const category = await updateCategory(id, input);
    if (!category) throw notFound("La categoría no existe.");

    return NextResponse.json(category);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** DELETE /api/categories/[id] — sólo admin. */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await requirePermission("categories:delete");

    const removed = await deleteCategory(await parseId(context));
    if (!removed) throw notFound("La categoría no existe.");

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

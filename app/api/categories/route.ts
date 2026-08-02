import { NextResponse, type NextRequest } from "next/server";

import { toErrorResponse } from "@/lib/api-error";
import { createCategory, listCategories } from "@/lib/queries/categories";
import { requirePermission, requireUser } from "@/lib/session";
import { createCategorySchema } from "@/lib/validators/category";

/** GET /api/categories — todas las categorías con su conteo de productos. */
export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await listCategories());
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** POST /api/categories — requiere admin o manager. */
export async function POST(request: NextRequest) {
  try {
    await requirePermission("categories:write");

    const body: unknown = await request.json();
    const input = createCategorySchema.parse(body);

    const category = await createCategory(input);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

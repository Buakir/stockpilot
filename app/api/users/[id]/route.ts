import { NextResponse, type NextRequest } from "next/server";

import { badRequest, conflict, toErrorResponse } from "@/lib/api-error";
import { deleteUser, findUserByEmail, updateUser } from "@/lib/queries/users";
import { requirePermission } from "@/lib/session";
import { updateUserSchema } from "@/lib/validators/user";

type RouteContext = { params: Promise<{ id: string }> };

async function parseId(context: RouteContext): Promise<number> {
  const { id } = await context.params;
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw badRequest("El identificador del usuario no es válido.");
  }
  return parsed;
}

/** PATCH /api/users/[id] — sólo admin. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requirePermission("users:manage");

    const id = await parseId(context);
    const body: unknown = await request.json();
    const input = updateUserSchema.parse(body);

    // Un admin que se quita a sí mismo el rol perdería el acceso en la
    // siguiente request, sin forma de revertirlo desde la propia app.
    if (id === actor.id && input.role !== undefined && input.role !== "admin") {
      throw conflict("No podés quitarte a vos mismo el rol de administrador.");
    }

    if (input.email !== undefined) {
      const existing = await findUserByEmail(input.email);
      if (existing && existing.id !== id) {
        throw conflict(`Ya existe otro usuario con el email ${input.email}.`);
      }
    }

    return NextResponse.json(await updateUser(id, input));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** DELETE /api/users/[id] — sólo admin. */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const actor = await requirePermission("users:manage");

    const id = await parseId(context);
    if (id === actor.id) {
      throw conflict("No podés eliminar tu propia cuenta.");
    }

    await deleteUser(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

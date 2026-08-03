import { NextResponse, type NextRequest } from "next/server";

import { conflict, toErrorResponse } from "@/lib/api-error";
import { createUser, findUserByEmail, listUsers } from "@/lib/queries/users";
import { requirePermission } from "@/lib/session";
import { createUserSchema } from "@/lib/validators/user";

/** GET /api/users — sólo admin. El hash nunca se expone. */
export async function GET() {
  try {
    await requirePermission("users:manage");
    return NextResponse.json(await listUsers());
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** POST /api/users — sólo admin. */
export async function POST(request: NextRequest) {
  try {
    await requirePermission("users:manage");

    const body: unknown = await request.json();
    const input = createUserSchema.parse(body);

    if (await findUserByEmail(input.email)) {
      throw conflict(`Ya existe un usuario con el email ${input.email}.`);
    }

    const user = await createUser(input);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

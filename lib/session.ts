import "server-only";

import { auth } from "@/lib/auth";
import { forbidden, unauthorized } from "@/lib/api-error";
import { can, type Permission } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

/** Usuario autenticado, o `null` si no hay sesión. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;

  return {
    id: Number(session.user.id),
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role,
  };
}

/** Igual que `getSessionUser`, pero lanza 401 si no hay sesión. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw unauthorized();
  return user;
}

/**
 * Puerta de entrada de toda API route mutante: exige sesión *y* permiso.
 *
 * La autorización se aplica acá, en el servidor. Ocultar botones en la UI es
 * sólo cosmético; esto es lo que realmente impide la acción.
 */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) throw forbidden();
  return user;
}

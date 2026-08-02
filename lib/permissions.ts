import type { UserRole } from "@/lib/types";

/**
 * Matriz de autorización.
 *
 * Es la única fuente de verdad sobre qué puede hacer cada rol: la usan tanto
 * las API routes (donde la autorización realmente se aplica) como la UI (para
 * ocultar acciones que el backend igual rechazaría).
 */
export const PERMISSIONS = {
  "products:read": ["admin", "manager", "viewer"],
  "products:write": ["admin", "manager"],
  "products:delete": ["admin"],
  "products:import": ["admin", "manager"],
  "categories:read": ["admin", "manager", "viewer"],
  "categories:write": ["admin", "manager"],
  "categories:delete": ["admin"],
  "stock:adjust": ["admin", "manager"],
  "users:manage": ["admin"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

/** ¿El rol tiene este permiso? */
export function can(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}

/** Etiquetas legibles para mostrar el rol en la UI. */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  manager: "Encargado",
  viewer: "Solo lectura",
};

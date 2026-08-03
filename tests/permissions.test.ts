import { describe, expect, it } from "vitest";

import { can, PERMISSIONS, type Permission } from "@/lib/permissions";
import { USER_ROLES, type UserRole } from "@/lib/types";

/**
 * La matriz de permisos escrita a mano, tal como está en el brief.
 *
 * Se declara de nuevo acá a propósito, en vez de derivarla de `PERMISSIONS`:
 * un test que se calcula desde el código que prueba pasa siempre, incluso si
 * alguien cambia el permiso por error. Esta tabla es la especificación.
 */
const EXPECTED: Record<Permission, readonly UserRole[]> = {
  "products:read": ["admin", "manager", "viewer"],
  "products:write": ["admin", "manager"],
  "products:delete": ["admin"],
  "products:import": ["admin", "manager"],
  "categories:read": ["admin", "manager", "viewer"],
  "categories:write": ["admin", "manager"],
  "categories:delete": ["admin"],
  "stock:adjust": ["admin", "manager"],
  "users:manage": ["admin"],
};

describe("can()", () => {
  const permissions = Object.keys(EXPECTED) as Permission[];

  it.each(permissions)("resuelve %s para los tres roles", (permission) => {
    for (const role of USER_ROLES) {
      const allowed = EXPECTED[permission].includes(role);
      expect(can(role, permission), `${role} → ${permission}`).toBe(allowed);
    }
  });

  it("niega todo si no hay rol (sesión ausente)", () => {
    for (const permission of permissions) {
      expect(can(undefined, permission)).toBe(false);
    }
  });

  it("el viewer no puede escribir, borrar, importar ni mover stock", () => {
    const forbidden: Permission[] = [
      "products:write",
      "products:delete",
      "products:import",
      "categories:write",
      "categories:delete",
      "stock:adjust",
      "users:manage",
    ];
    for (const permission of forbidden) {
      expect(can("viewer", permission)).toBe(false);
    }
  });

  it("el manager puede escribir pero no borrar ni gestionar usuarios", () => {
    expect(can("manager", "products:write")).toBe(true);
    expect(can("manager", "stock:adjust")).toBe(true);
    expect(can("manager", "products:import")).toBe(true);

    expect(can("manager", "products:delete")).toBe(false);
    expect(can("manager", "categories:delete")).toBe(false);
    expect(can("manager", "users:manage")).toBe(false);
  });

  it("el admin puede todo", () => {
    for (const permission of permissions) {
      expect(can("admin", permission)).toBe(true);
    }
  });
});

describe("PERMISSIONS", () => {
  it("no declara permisos de más ni de menos respecto de la especificación", () => {
    expect(Object.keys(PERMISSIONS).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it("sólo usa roles válidos", () => {
    for (const roles of Object.values(PERMISSIONS)) {
      for (const role of roles) {
        expect(USER_ROLES).toContain(role);
      }
    }
  });
});

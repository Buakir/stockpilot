import type { DefaultSession } from "next-auth";

import type { UserRole } from "@/lib/types";

/**
 * Extiende los tipos de Auth.js para que `session.user.role` y `token.role`
 * existan y estén tipados, en vez de tener que castear en cada uso.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
  }
}

/**
 * `next-auth/jwt` sólo reexporta `@auth/core/jwt`, así que la interfaz `JWT`
 * hay que ampliarla en el módulo donde está declarada de verdad.
 */
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

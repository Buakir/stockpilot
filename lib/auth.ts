import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/lib/auth.config";
import { queryOne } from "@/lib/db";
import type { UserRole } from "@/lib/types";
import { loginSchema } from "@/lib/validators/auth";

type UserRow = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  password_hash: string;
};

/**
 * Hash de descarte con el mismo costo que los reales.
 *
 * Si el email no existe igual comparamos contra este hash, para que un login
 * fallido tarde lo mismo con usuario inexistente que con contraseña incorrecta
 * y no se pueda enumerar cuentas midiendo el tiempo de respuesta.
 */
const DUMMY_HASH = "$2b$10$.Ji6CvtomGQZHSHR0x9WVOsoNbMk8gp18c1W83FhQBrWhIfpM2OW.";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await queryOne<UserRow>(
          `SELECT id, email, name, role, password_hash
             FROM users
            WHERE lower(email) = lower($1)`,
          [email],
        );

        const passwordMatches = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
        if (!user || !passwordMatches) return null;

        // Lo que se devuelve acá alimenta el JWT. Nunca incluir el hash.
        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});

import type { NextAuthConfig } from "next-auth";

/**
 * Configuración de Auth.js compartida entre el middleware y el servidor.
 *
 * El middleware corre en el runtime Edge, donde no existen ni `pg` ni `bcrypt`.
 * Por eso este archivo no declara providers: sólo lo que se necesita para leer
 * y validar el JWT. El provider de credenciales vive en `lib/auth.ts`, que sólo
 * se importa desde Node.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    /** Al iniciar sesión copia id y rol al token; después sólo lo propaga. */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? "";
        token.role = user.role;
      }
      return token;
    },
    /** Expone id y rol en `session.user` para los Server Components. */
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;

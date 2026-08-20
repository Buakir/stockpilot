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
  /**
   * Auth.js confía en el header `Host` sólo si detecta la plataforma leyendo
   * `process.env.VERCEL`. Si el proyecto no expone las variables de sistema de
   * Vercel, esa detección falla y toda ruta de `/api/auth/*` responde 500 con
   * `UntrustedHost`, aunque el resto de la app funcione.
   *
   * Declararlo acá hace que el despliegue no dependa de esa detección. Es
   * seguro porque la app vive detrás de un proxy que valida el `Host` contra
   * los dominios del proyecto; en un servidor expuesto directamente a
   * cabeceras arbitrarias habría que restringirlo.
   */
  trustHost: true,
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

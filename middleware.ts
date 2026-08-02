import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";

/**
 * Protección de rutas.
 *
 * Usa sólo `authConfig` (sin el provider de credenciales) porque el middleware
 * corre en Edge y no puede cargar `pg` ni `bcrypt`. Acá se decide *si hay
 * sesión*; el control de *qué puede hacer* cada rol se aplica en cada API route.
 */
const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = ["/login"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = Boolean(req.auth);
  const isPublicRoute = PUBLIC_ROUTES.includes(nextUrl.pathname);

  if (isPublicRoute) {
    // Alguien ya autenticado no tiene nada que hacer en /login.
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    // Se guarda el destino original para volver ahí después del login.
    const loginUrl = new URL("/login", nextUrl);
    if (nextUrl.pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  /**
   * Todo menos: las rutas internas de Auth.js, los assets de Next y los
   * archivos estáticos. Las rutas `/api/*` propias sí pasan por acá, para que
   * una request sin sesión no llegue nunca a tocar la base.
   */
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

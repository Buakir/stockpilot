"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import { loginSchema } from "@/lib/validators/auth";
import { flattenZodError, type FieldErrors } from "@/lib/validators/utils";

export type LoginState = {
  error?: string;
  fieldErrors?: FieldErrors;
};

/**
 * Sólo se acepta una ruta interna como destino post-login.
 *
 * `callbackUrl` viene de la query string, así que un atacante podría mandar
 * `?callbackUrl=https://sitio-falso` y usar el login como trampolín. Se exige
 * que empiece con "/" y no con "//" (que el navegador leería como host).
 */
function safeCallbackUrl(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: flattenZodError(parsed.error) };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Mensaje deliberadamente genérico: no revelamos si el email existe.
      return {
        error:
          error.type === "CredentialsSignin"
            ? "Email o contraseña incorrectos."
            : "No se pudo iniciar sesión. Intentá de nuevo.",
      };
    }
    // `signIn` señaliza el redirect exitoso lanzando NEXT_REDIRECT: hay que
    // dejarlo pasar para que Next lo procese.
    throw error;
  }

  return {};
}

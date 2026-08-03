"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * next-themes aplica la clase `.dark` sobre <html>, que es el selector que usa
 * el tema de shadcn (`@custom-variant dark (&:is(.dark *))`). Sin esto los
 * tokens oscuros de globals.css nunca se activan.
 *
 * En desarrollo la consola muestra "Encountered a script tag while rendering
 * React component": es el `<script>` que next-themes inyecta para fijar el tema
 * antes del primer pintado y evitar el flash de tema claro. El aviso sólo
 * existe en los builds de desarrollo de React —no está en los de producción— y
 * el script cumple su función durante el SSR, que es cuando importa.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

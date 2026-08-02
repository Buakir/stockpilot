"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * next-themes aplica la clase `.dark` sobre <html>, que es el selector que usa
 * el tema de shadcn (`@custom-variant dark (&:is(.dark *))`). Sin esto los
 * tokens oscuros de globals.css nunca se activan.
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

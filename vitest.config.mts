import path from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Los tests cubren lógica pura — permisos, validadores, CSV, formateo — así
 * que corren en Node sin base de datos ni servidor. El alias replica el `@/`
 * de tsconfig para que los imports sean los mismos que en la app.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
});

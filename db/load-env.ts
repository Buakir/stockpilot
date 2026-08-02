/**
 * Carga de variables de entorno para los scripts de Node (`migrate`, `seed`).
 *
 * Next.js lee `.env.local` automáticamente, pero un script suelto no: dotenv
 * sólo mira `.env`. Este módulo replica la precedencia de Next — `.env.local`
 * gana sobre `.env` — y debe importarse antes que cualquier módulo que lea
 * `process.env`.
 */
import path from "node:path";

import { config } from "dotenv";

config({ path: [path.join(process.cwd(), ".env.local"), path.join(process.cwd(), ".env")] });

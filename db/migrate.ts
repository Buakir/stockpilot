/**
 * Runner de migraciones.
 *
 * Aplica en orden alfabético los archivos de `db/migrations/*.sql` que todavía
 * no estén registrados en la tabla `schema_migrations`. Cada archivo corre
 * dentro de una transacción, así que una migración a medio aplicar no existe.
 *
 *   npm run db:migrate            aplica lo pendiente
 *   npm run db:migrate -- --reset borra el esquema y lo reconstruye desde cero
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import "./load-env";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

async function main(): Promise<void> {
  // El import es dinámico para que `load-env` ya haya poblado process.env
  // antes de que `lib/env` valide las variables.
  const { pool, withTransaction } = await import("../lib/db");

  const shouldReset = process.argv.includes("--reset");

  if (shouldReset) {
    console.log("⚠️  --reset: eliminando el esquema public y recreándolo");
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const applied = await pool.query<{ name: string }>("SELECT name FROM schema_migrations");
  const alreadyApplied = new Set(applied.rows.map((row) => row.name));

  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith(".sql")).sort();

  const pending = files.filter((file) => !alreadyApplied.has(file));

  if (pending.length === 0) {
    console.log("✅ No hay migraciones pendientes");
    await pool.end();
    return;
  }

  for (const file of pending) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    });
    console.log(`✅ Aplicada ${file}`);
  }

  console.log(`\n${pending.length} migración(es) aplicada(s)`);
  await pool.end();
}

main().catch((error: unknown) => {
  console.error("❌ Falló la migración:", error);
  process.exit(1);
});

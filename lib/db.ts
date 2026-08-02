import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

import { env } from "@/lib/env";

/**
 * Parsers de tipos de PostgreSQL.
 *
 * Por defecto `pg` devuelve NUMERIC y BIGINT como `string` para no perder
 * precisión. En este dominio (precios con 2 decimales y conteos de filas) los
 * valores caben de sobra en un `number` de JavaScript, así que los convertimos
 * acá una sola vez en lugar de castear en cada `SELECT`.
 */
types.setTypeParser(types.builtins.NUMERIC, (value) => Number.parseFloat(value));
types.setTypeParser(types.builtins.INT8, (value) => Number.parseInt(value, 10));

function createPool(): Pool {
  return new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

/**
 * En desarrollo Next.js recarga los módulos en cada cambio. Sin este cache
 * global cada recarga abriría un pool nuevo y agotaría las conexiones.
 */
const globalForDb = globalThis as unknown as { stockpilotPool?: Pool };

export const pool: Pool = globalForDb.stockpilotPool ?? createPool();

if (env.NODE_ENV !== "production") {
  globalForDb.stockpilotPool = pool;
}

/** Ejecuta una query parametrizada y devuelve todas las filas. */
export async function query<T extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params as unknown[]);
  return result.rows;
}

/** Ejecuta una query parametrizada y devuelve la primera fila, o `null`. */
export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Corre `fn` dentro de una transacción: commit si resuelve, rollback si lanza.
 * Se usa, por ejemplo, para ajustar el stock y registrar el movimiento de
 * auditoría de forma atómica.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

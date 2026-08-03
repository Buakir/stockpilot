import "server-only";

import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";

import { conflict, notFound } from "@/lib/api-error";
import { query, queryOne, withTransaction } from "@/lib/db";
import type { User } from "@/lib/types";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validators/user";

const BCRYPT_ROUNDS = 10;

/** Columnas que se exponen. El hash nunca sale de esta capa. */
const PUBLIC_COLUMNS = "id, email, name, role, created_at";

export async function listUsers(): Promise<User[]> {
  return query<User>(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY role ASC, name ASC`);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return queryOne<User>(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE lower(email) = lower($1)`, [
    email,
  ]);
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await queryOne<User>(
    `INSERT INTO users (email, name, role, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_COLUMNS}`,
    [input.email, input.name, input.role, passwordHash],
  );
  return user!;
}

/**
 * Bloquea las filas de admin y devuelve cuántas hay.
 *
 * `FOR UPDATE` sobre las filas concretas (no sobre un `count(*)`, que no se
 * puede bloquear) mantiene la cuenta estable hasta el commit. Sin esto, dos
 * admins degradándose a la vez podrían pasar ambos el chequeo de "queda otro"
 * y dejar el sistema sin ningún administrador.
 */
async function lockAndCountAdmins(client: PoolClient): Promise<number> {
  const result = await client.query<{ id: number }>(
    "SELECT id FROM users WHERE role = 'admin' FOR UPDATE",
  );
  return result.rows.length;
}

export async function updateUser(id: number, input: UpdateUserInput): Promise<User> {
  return withTransaction(async (client) => {
    const current = await client.query<{ role: string }>(
      "SELECT role FROM users WHERE id = $1 FOR UPDATE",
      [id],
    );
    const existing = current.rows[0];
    if (!existing) throw notFound("El usuario no existe.");

    // Quitarle el rol admin al último administrador dejaría la app sin nadie
    // que pueda gestionar usuarios ni borrar productos.
    if (existing.role === "admin" && input.role !== undefined && input.role !== "admin") {
      const admins = await lockAndCountAdmins(client);
      if (admins <= 1) {
        throw conflict("No se puede quitar el rol de administrador al único admin que queda.");
      }
    }

    const assignments: string[] = [];
    const params: unknown[] = [];

    const push = (column: string, value: unknown): void => {
      params.push(value);
      assignments.push(`${column} = $${params.length}`);
    };

    if (input.email !== undefined) push("email", input.email);
    if (input.name !== undefined) push("name", input.name);
    if (input.role !== undefined) push("role", input.role);
    if (input.password !== undefined) {
      push("password_hash", await bcrypt.hash(input.password, BCRYPT_ROUNDS));
    }

    if (assignments.length === 0) {
      const unchanged = await client.query<User>(
        `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`,
        [id],
      );
      return unchanged.rows[0]!;
    }

    params.push(id);
    const updated = await client.query<User>(
      `UPDATE users SET ${assignments.join(", ")}
        WHERE id = $${params.length}
        RETURNING ${PUBLIC_COLUMNS}`,
      params,
    );

    return updated.rows[0]!;
  });
}

export async function deleteUser(id: number): Promise<void> {
  await withTransaction(async (client) => {
    const target = await client.query<{ role: string }>(
      "SELECT role FROM users WHERE id = $1 FOR UPDATE",
      [id],
    );
    const existing = target.rows[0];
    if (!existing) throw notFound("El usuario no existe.");

    if (existing.role === "admin") {
      const admins = await lockAndCountAdmins(client);
      if (admins <= 1) {
        throw conflict("No se puede eliminar al único administrador.");
      }
    }

    // Los movimientos de stock del usuario sobreviven con user_id NULL
    // (ON DELETE SET NULL): la auditoría no se borra junto con la cuenta.
    await client.query("DELETE FROM users WHERE id = $1", [id]);
  });
}

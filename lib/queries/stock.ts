import "server-only";

import { conflict, notFound } from "@/lib/api-error";
import { query, withTransaction } from "@/lib/db";
import type { Product, StockMovementDetailed } from "@/lib/types";
import type { AdjustStockInput } from "@/lib/validators/stock";

/**
 * Ajusta el stock de un producto y deja el movimiento registrado.
 *
 * Las dos escrituras van en una transacción: o queda el stock nuevo *y* su
 * registro de auditoría, o no queda ninguno de los dos. Nunca un stock que
 * cambió sin que se sepa quién lo cambió.
 *
 * El `SELECT ... FOR UPDATE` bloquea la fila hasta el commit. Sin él, dos
 * ajustes simultáneos podrían leer el mismo stock inicial y el segundo pisaría
 * al primero (lost update): con 10 unidades, dos ventas de 6 pasarían las dos
 * y el stock quedaría en 4 en vez de rechazar la segunda.
 */
export async function adjustStock(
  productId: number,
  input: AdjustStockInput,
  userId: number,
): Promise<Product> {
  return withTransaction(async (client) => {
    const locked = await client.query<{ stock: number; name: string }>(
      "SELECT stock, name FROM products WHERE id = $1 FOR UPDATE",
      [productId],
    );

    const current = locked.rows[0];
    if (!current) throw notFound("El producto no existe.");

    const nextStock = current.stock + input.delta;
    if (nextStock < 0) {
      // Se valida acá para dar un mensaje útil. El CHECK (stock >= 0) de la
      // tabla sigue siendo la garantía real, incluso contra escrituras que no
      // pasen por esta función.
      throw conflict(
        `No hay stock suficiente: ${current.name} tiene ${current.stock} unidad(es) y se intentan descontar ${Math.abs(input.delta)}.`,
      );
    }

    const updated = await client.query<Product>(
      "UPDATE products SET stock = $1 WHERE id = $2 RETURNING *",
      [nextStock, productId],
    );

    await client.query(
      `INSERT INTO stock_movements (product_id, delta, reason, user_id)
       VALUES ($1, $2, $3, $4)`,
      [productId, input.delta, input.reason, userId],
    );

    return updated.rows[0]!;
  });
}

/** Historial de movimientos de un producto, del más reciente al más antiguo. */
export async function listMovementsByProduct(
  productId: number,
  limit = 50,
): Promise<StockMovementDetailed[]> {
  return query<StockMovementDetailed>(
    `SELECT m.id,
            m.product_id,
            m.delta,
            m.reason,
            m.user_id,
            m.created_at,
            p.name AS product_name,
            p.sku  AS product_sku,
            u.name AS user_name
       FROM stock_movements m
       JOIN products p ON p.id = m.product_id
       LEFT JOIN users u ON u.id = m.user_id
      WHERE m.product_id = $1
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT $2`,
    [productId, limit],
  );
}

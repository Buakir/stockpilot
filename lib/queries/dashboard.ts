import "server-only";

import { query, queryOne } from "@/lib/db";
import { LOW_STOCK_THRESHOLD } from "@/lib/validators/product";

export type DashboardStats = {
  total_products: number;
  active_products: number;
  inventory_value: number;
  out_of_stock: number;
  low_stock: number;
  total_categories: number;
};

/**
 * Métricas del dashboard en una sola pasada.
 *
 * Los `count(*) FILTER (WHERE ...)` de PostgreSQL permiten calcular varios
 * agregados condicionales sobre el mismo escaneo de la tabla, en vez de lanzar
 * una consulta por tarjeta.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const stats = await queryOne<DashboardStats>(
    `SELECT count(*)                                              AS total_products,
            count(*) FILTER (WHERE status = 'active')             AS active_products,
            coalesce(sum(price * stock), 0)                       AS inventory_value,
            count(*) FILTER (WHERE stock = 0)                     AS out_of_stock,
            count(*) FILTER (WHERE stock > 0 AND stock < $1)      AS low_stock,
            (SELECT count(*) FROM categories)                     AS total_categories
       FROM products`,
    [LOW_STOCK_THRESHOLD],
  );

  // Con una tabla vacía los agregados devuelven 0, nunca `null`.
  return (
    stats ?? {
      total_products: 0,
      active_products: 0,
      inventory_value: 0,
      out_of_stock: 0,
      low_stock: 0,
      total_categories: 0,
    }
  );
}

export type CategoryBreakdown = {
  category_id: number | null;
  category_name: string;
  product_count: number;
  inventory_value: number;
};

/** Productos y valor de inventario agrupados por categoría, para el gráfico. */
export async function getCategoryBreakdown(): Promise<CategoryBreakdown[]> {
  return query<CategoryBreakdown>(
    `SELECT c.id                                  AS category_id,
            coalesce(c.name, 'Sin categoría')     AS category_name,
            count(p.id)                           AS product_count,
            coalesce(sum(p.price * p.stock), 0)   AS inventory_value
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
      GROUP BY c.id, c.name
      ORDER BY product_count DESC, category_name ASC`,
  );
}

export type LowStockProduct = {
  id: number;
  sku: string;
  name: string;
  stock: number;
  category_name: string | null;
};

/** Los productos activos con menos stock: la lista accionable del dashboard. */
export async function getLowStockProducts(limit = 8): Promise<LowStockProduct[]> {
  return query<LowStockProduct>(
    `SELECT p.id, p.sku, p.name, p.stock, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'active' AND p.stock < $1
      ORDER BY p.stock ASC, p.name ASC
      LIMIT $2`,
    [LOW_STOCK_THRESHOLD, limit],
  );
}

import "server-only";

import { query, queryOne } from "@/lib/db";
import type { Paginated, Product, ProductWithCategory } from "@/lib/types";
import {
  LOW_STOCK_THRESHOLD,
  type CreateProductInput,
  type ProductQuery,
  type ProductSortField,
  type UpdateProductInput,
} from "@/lib/validators/product";

/**
 * Columnas por las que se permite ordenar.
 *
 * El nombre de una columna no puede ir como parámetro ($1) en SQL, así que la
 * única forma segura de aceptar un `sort` dinámico es mapearlo contra esta
 * lista blanca. Nunca se interpola el valor que llega del cliente.
 */
const SORT_COLUMNS: Record<ProductSortField, string> = {
  name: "p.name",
  sku: "p.sku",
  price: "p.price",
  stock: "p.stock",
  created_at: "p.created_at",
};

type ProductListRow = ProductWithCategory & { total_count: number };

/** Los filtros del listado, sin orden ni paginación. */
type ProductFilters = Pick<
  ProductQuery,
  "q" | "categoryId" | "status" | "minPrice" | "maxPrice" | "lowStock"
>;

/**
 * Construye la cláusula WHERE y acumula los parámetros en `params`.
 *
 * Vive aparte porque el listado y la exportación tienen que filtrar
 * exactamente igual: si divergieran, el CSV que baja el usuario no
 * coincidiría con la tabla que está viendo.
 */
function buildWhereClause(filters: ProductFilters, params: unknown[]): string {
  const conditions: string[] = [];

  /** Registra un parámetro y devuelve su placeholder ($1, $2, …). */
  const bind = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.q) {
    const pattern = bind(`%${filters.q}%`);
    conditions.push(`(p.name ILIKE ${pattern} OR p.sku ILIKE ${pattern})`);
  }
  if (filters.categoryId !== undefined) {
    conditions.push(`p.category_id = ${bind(filters.categoryId)}`);
  }
  if (filters.status !== undefined) {
    conditions.push(`p.status = ${bind(filters.status)}`);
  }
  if (filters.minPrice !== undefined) {
    conditions.push(`p.price >= ${bind(filters.minPrice)}`);
  }
  if (filters.maxPrice !== undefined) {
    conditions.push(`p.price <= ${bind(filters.maxPrice)}`);
  }
  if (filters.lowStock) {
    conditions.push(`p.stock < ${bind(LOW_STOCK_THRESHOLD)}`);
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
}

/**
 * Listado de productos con filtros combinables y paginación.
 *
 * El total de filas se calcula con `count(*) OVER ()` en la misma consulta:
 * una sola ida a la base en vez de un SELECT de datos más un SELECT de conteo
 * que tendrían que repetir exactamente el mismo WHERE.
 */
export async function listProducts(filters: ProductQuery): Promise<Paginated<ProductWithCategory>> {
  const params: unknown[] = [];
  const where = buildWhereClause(filters, params);

  const bind = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };

  const sortColumn = SORT_COLUMNS[filters.sort];
  const direction = filters.order === "asc" ? "ASC" : "DESC";
  const offset = (filters.page - 1) * filters.pageSize;

  const rows = await query<ProductListRow>(
    `SELECT p.id,
            p.sku,
            p.name,
            p.description,
            p.category_id,
            p.price,
            p.stock,
            p.status,
            p.created_at,
            p.updated_at,
            c.name AS category_name,
            count(*) OVER () AS total_count
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
      ORDER BY ${sortColumn} ${direction}, p.id DESC
      LIMIT ${bind(filters.pageSize)} OFFSET ${bind(offset)}`,
    params,
  );

  const total = rows[0]?.total_count ?? 0;

  return {
    // `total_count` es un detalle de la query, no parte del modelo.
    items: rows.map(({ total_count: _total, ...product }) => product),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

/**
 * Tope de filas por exportación.
 *
 * El CSV se arma completo en memoria antes de enviarlo, así que sin límite un
 * catálogo grande podría tumbar el proceso. 20.000 filas son ~2 MB de texto.
 */
export const EXPORT_ROW_LIMIT = 20_000;

/**
 * Productos que coinciden con los filtros, sin paginar, para exportar.
 *
 * Reutiliza `buildWhereClause`, así que el CSV contiene exactamente las mismas
 * filas que muestra la tabla con esos filtros.
 */
export async function listProductsForExport(filters: ProductQuery): Promise<ProductWithCategory[]> {
  const params: unknown[] = [];
  const where = buildWhereClause(filters, params);

  const sortColumn = SORT_COLUMNS[filters.sort];
  const direction = filters.order === "asc" ? "ASC" : "DESC";

  params.push(EXPORT_ROW_LIMIT);

  return query<ProductWithCategory>(
    `SELECT p.id,
            p.sku,
            p.name,
            p.description,
            p.category_id,
            p.price,
            p.stock,
            p.status,
            p.created_at,
            p.updated_at,
            c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
      ORDER BY ${sortColumn} ${direction}, p.id DESC
      LIMIT $${params.length}`,
    params,
  );
}

export async function getProductById(id: number): Promise<ProductWithCategory | null> {
  return queryOne<ProductWithCategory>(
    `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = $1`,
    [id],
  );
}

export async function findProductBySku(sku: string): Promise<Product | null> {
  return queryOne<Product>("SELECT * FROM products WHERE sku = $1", [sku]);
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const product = await queryOne<Product>(
    `INSERT INTO products (sku, name, description, category_id, price, stock, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.sku,
      input.name,
      input.description,
      input.category_id,
      input.price,
      input.stock,
      input.status,
    ],
  );
  // El INSERT ... RETURNING siempre devuelve una fila si no lanzó error.
  return product!;
}

/** Columnas actualizables, en el orden en que se arma el SET dinámico. */
const UPDATABLE_COLUMNS = [
  "sku",
  "name",
  "description",
  "category_id",
  "price",
  "stock",
  "status",
] as const satisfies ReadonlyArray<keyof UpdateProductInput>;

export async function updateProduct(
  id: number,
  input: UpdateProductInput,
): Promise<Product | null> {
  const assignments: string[] = [];
  const params: unknown[] = [];

  for (const column of UPDATABLE_COLUMNS) {
    if (!(column in input)) continue;
    params.push(input[column]);
    // El nombre de columna sale de UPDATABLE_COLUMNS, nunca del request.
    assignments.push(`${column} = $${params.length}`);
  }

  if (assignments.length === 0) return getProductById(id);

  params.push(id);

  return queryOne<Product>(
    `UPDATE products
        SET ${assignments.join(", ")}
      WHERE id = $${params.length}
      RETURNING *`,
    params,
  );
}

/** Devuelve `true` si borró algo, `false` si el id no existía. */
export async function deleteProduct(id: number): Promise<boolean> {
  const deleted = await queryOne<{ id: number }>(
    "DELETE FROM products WHERE id = $1 RETURNING id",
    [id],
  );
  return deleted !== null;
}

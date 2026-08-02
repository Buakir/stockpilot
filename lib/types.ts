/** Tipos de dominio. Cada uno refleja una fila tal como sale de PostgreSQL. */

export const USER_ROLES = ["admin", "manager", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PRODUCT_STATUSES = ["active", "discontinued"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export type User = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  created_at: Date;
};

export type Category = {
  id: number;
  name: string;
  description: string | null;
  created_at: Date;
};

/** Categoría con el conteo de productos asociados (para el listado). */
export type CategoryWithCount = Category & {
  product_count: number;
};

export type Product = {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category_id: number | null;
  price: number;
  stock: number;
  status: ProductStatus;
  created_at: Date;
  updated_at: Date;
};

/** Producto con el nombre de su categoría resuelto por JOIN. */
export type ProductWithCategory = Product & {
  category_name: string | null;
};

export type StockMovement = {
  id: number;
  product_id: number;
  delta: number;
  reason: string;
  user_id: number | null;
  created_at: Date;
};

/** Movimiento con los datos de quién y sobre qué producto, ya resueltos. */
export type StockMovementDetailed = StockMovement & {
  product_name: string;
  product_sku: string;
  user_name: string | null;
};

/** Resultado paginado genérico devuelto por las queries de listado. */
export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

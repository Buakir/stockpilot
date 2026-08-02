import "server-only";

import { query, queryOne } from "@/lib/db";
import type { Category, CategoryWithCount } from "@/lib/types";
import type { CreateCategoryInput, UpdateCategoryInput } from "@/lib/validators/category";

/** Todas las categorías con cuántos productos tiene cada una. */
export async function listCategories(): Promise<CategoryWithCount[]> {
  return query<CategoryWithCount>(
    `SELECT c.id,
            c.name,
            c.description,
            c.created_at,
            count(p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC`,
  );
}

export async function getCategoryById(id: number): Promise<Category | null> {
  return queryOne<Category>("SELECT * FROM categories WHERE id = $1", [id]);
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const category = await queryOne<Category>(
    `INSERT INTO categories (name, description)
     VALUES ($1, $2)
     RETURNING *`,
    [input.name, input.description],
  );
  return category!;
}

export async function updateCategory(
  id: number,
  input: UpdateCategoryInput,
): Promise<Category | null> {
  const assignments: string[] = [];
  const params: unknown[] = [];

  for (const column of ["name", "description"] as const) {
    if (!(column in input)) continue;
    params.push(input[column]);
    assignments.push(`${column} = $${params.length}`);
  }

  if (assignments.length === 0) return getCategoryById(id);

  params.push(id);

  return queryOne<Category>(
    `UPDATE categories
        SET ${assignments.join(", ")}
      WHERE id = $${params.length}
      RETURNING *`,
    params,
  );
}

/**
 * Borra la categoría. Los productos asociados no se pierden: la FK está
 * declarada `ON DELETE SET NULL`, así que quedan como "sin categoría".
 */
export async function deleteCategory(id: number): Promise<boolean> {
  const deleted = await queryOne<{ id: number }>(
    "DELETE FROM categories WHERE id = $1 RETURNING id",
    [id],
  );
  return deleted !== null;
}

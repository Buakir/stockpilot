/**
 * Seed de datos ficticios.
 *
 * Deja la base en un estado demo reproducible: 3 usuarios (uno por rol),
 * 8 categorías, ~140 productos y un historial de movimientos de stock
 * coherente con el stock actual de cada producto.
 *
 *   npm run db:seed
 *
 * Es destructivo sobre las tablas de datos (TRUNCATE), no sobre el esquema.
 */
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

import "./load-env";

import { CATALOG } from "./catalog";
import type { ProductStatus, UserRole } from "../lib/types";

/** Semilla fija: dos corridas del seed producen el mismo catálogo. */
const SEED = 20260802;
const PRODUCT_COUNT = 140;
const BCRYPT_ROUNDS = 10;

const DEMO_USERS: ReadonlyArray<{ email: string; name: string; role: UserRole }> = [
  { email: "admin@stockpilot.dev", name: "Alicia Admin", role: "admin" },
  { email: "manager@stockpilot.dev", name: "Marco Manager", role: "manager" },
  { email: "viewer@stockpilot.dev", name: "Valeria Viewer", role: "viewer" },
];

const MOVEMENT_REASONS = [
  "Recepción de mercadería",
  "Venta en mostrador",
  "Ajuste por inventario físico",
  "Devolución de cliente",
  "Merma por daño",
  "Traspaso entre bodegas",
] as const;

/** SKU legible y único: 3 letras de la categoría + correlativo. Ej. HEM-0042. */
function buildSku(categoryName: string, index: number): string {
  const prefix = categoryName
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase();
  return `${prefix}-${String(index).padStart(4, "0")}`;
}

/**
 * Precio de retail plausible, en pesos.
 *
 * Un rango uniforme entre 990 y 480.000 deja cintas de enmascarar a $370.000.
 * Con tramos ponderados la mayoría de los productos queda barata y sólo unos
 * pocos son caros, que es como se distribuye un catálogo real. El valor se
 * redondea para que termine en 90, como los precios de vitrina.
 */
function buildPrice(): number {
  const [min, max] = faker.helpers.weightedArrayElement<[number, number]>([
    { weight: 45, value: [990, 14_990] },
    { weight: 35, value: [14_990, 79_990] },
    { weight: 15, value: [79_990, 249_990] },
    { weight: 5, value: [249_990, 899_990] },
  ]);
  const raw = faker.number.int({ min, max });
  const step = raw < 20_000 ? 100 : 1_000;
  return Math.max(990, Math.round(raw / step) * step - 10);
}

async function main(): Promise<void> {
  // Import dinámico: `load-env` ya corrió, así que `lib/env` valida sin fallar.
  const { pool, withTransaction } = await import("../lib/db");

  faker.seed(SEED);

  const seedPassword = process.env.SEED_PASSWORD ?? "demo1234";
  const passwordHash = await bcrypt.hash(seedPassword, BCRYPT_ROUNDS);

  await withTransaction(async (client) => {
    // RESTART IDENTITY deja los SERIAL en 1 para que los ids sean estables.
    await client.query(
      "TRUNCATE stock_movements, products, categories, users RESTART IDENTITY CASCADE",
    );

    const userIds: number[] = [];
    for (const user of DEMO_USERS) {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [user.email, passwordHash, user.name, user.role],
      );
      userIds.push(rows[0]!.id);
    }

    const categoryIds: number[] = [];
    for (const category of CATALOG) {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO categories (name, description)
         VALUES ($1, $2)
         RETURNING id`,
        [category.name, category.description],
      );
      categoryIds.push(rows[0]!.id);
    }

    // Sólo admin y manager pueden mover stock, así que sólo ellos aparecen
    // como autores en la auditoría.
    const editorIds = userIds.slice(0, 2);

    for (let i = 1; i <= PRODUCT_COUNT; i += 1) {
      const categoryIndex = faker.number.int({ min: 0, max: CATALOG.length - 1 });
      const category = CATALOG[categoryIndex]!;
      const categoryId = categoryIds[categoryIndex]!;

      // ~12% descontinuados, y de esos la mayoría sin stock: da variedad a los
      // filtros y al panel de "sin stock" del dashboard.
      const status: ProductStatus =
        faker.number.int({ min: 1, max: 100 }) <= 12 ? "discontinued" : "active";
      const stock =
        status === "discontinued"
          ? faker.number.int({ min: 0, max: 5 })
          : faker.helpers.weightedArrayElement([
              { weight: 1, value: 0 },
              { weight: 2, value: faker.number.int({ min: 1, max: 9 }) },
              { weight: 7, value: faker.number.int({ min: 10, max: 320 }) },
            ]);

      const createdAt = faker.date.between({ from: "2025-01-01", to: "2026-07-15" });

      const item = faker.helpers.arrayElement(category.items);
      const variant = faker.helpers.arrayElement(category.variants);

      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO products (sku, name, description, category_id, price, stock, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
         RETURNING id`,
        [
          buildSku(category.name, i),
          `${item} ${variant}`,
          `${item} para uso ${faker.helpers.arrayElement(["profesional", "doméstico", "industrial", "general"])}. ` +
            `Línea ${category.name.toLowerCase()}, presentación ${variant}.`,
          categoryId,
          buildPrice(),
          stock,
          status,
          createdAt,
        ],
      );
      const productId = rows[0]!.id;

      // Historial: se generan N movimientos y el último se ajusta para que la
      // suma de deltas cuadre exactamente con el stock actual del producto.
      const movementCount = faker.number.int({ min: 0, max: 6 });
      if (movementCount === 0) continue;

      const deltas: number[] = [];
      for (let m = 0; m < movementCount - 1; m += 1) {
        deltas.push(faker.number.int({ min: -40, max: 60 }) || 1);
      }
      const balance = deltas.reduce((sum, delta) => sum + delta, 0);
      const closingDelta = stock - balance;
      // El CHECK de la tabla prohíbe delta = 0.
      deltas.push(closingDelta === 0 ? 1 : closingDelta);

      let movementDate = createdAt;
      for (const delta of deltas) {
        movementDate = faker.date.between({ from: movementDate, to: "2026-08-01" });
        await client.query(
          `INSERT INTO stock_movements (product_id, delta, reason, user_id, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            productId,
            delta,
            faker.helpers.arrayElement(MOVEMENT_REASONS),
            faker.helpers.arrayElement(editorIds),
            movementDate,
          ],
        );
      }

      // El último delta se calculó contra el stock objetivo, pero los deltas
      // intermedios pudieron dejar el producto "en negativo" en algún momento
      // del historial. Se fuerza el stock final al valor que ya se insertó.
      await client.query("UPDATE products SET stock = $1 WHERE id = $2", [stock, productId]);
    }
  });

  const summary = await pool.query<{ table_name: string; total: number }>(`
    SELECT 'users' AS table_name, count(*) AS total FROM users
    UNION ALL SELECT 'categories', count(*) FROM categories
    UNION ALL SELECT 'products', count(*) FROM products
    UNION ALL SELECT 'stock_movements', count(*) FROM stock_movements
  `);

  console.log("✅ Seed completado\n");
  for (const row of summary.rows) {
    console.log(`   ${row.table_name.padEnd(16)} ${row.total}`);
  }
  console.log("\n   Usuarios demo (contraseña: %s):", seedPassword);
  for (const user of DEMO_USERS) {
    console.log(`   ${user.role.padEnd(8)} ${user.email}`);
  }

  await pool.end();
}

main().catch((error: unknown) => {
  console.error("❌ Falló el seed:", error);
  process.exit(1);
});

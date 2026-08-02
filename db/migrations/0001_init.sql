-- 0001_init: esquema base de StockPilot.
-- users, categories, products y stock_movements.

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'viewer');
CREATE TYPE product_status AS ENUM ('active', 'discontinued');

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'viewer',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- El login busca por email en minúsculas; el índice funcional evita un seq scan
-- y refuerza que "Ana@x.com" y "ana@x.com" son la misma cuenta.
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));

CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  sku         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES categories (id) ON DELETE SET NULL,
  price       NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status      product_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX products_category_id_idx ON products (category_id);
CREATE INDEX products_status_idx ON products (status);
CREATE INDEX products_created_at_idx ON products (created_at DESC);

-- Búsqueda por nombre/SKU con ILIKE '%texto%'. Un B-tree no sirve para un
-- patrón que empieza con comodín, así que se usa un índice trigram sobre la
-- concatenación de ambos campos.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX products_search_trgm_idx ON products USING gin ((name || ' ' || sku) gin_trgm_ops);

CREATE TABLE stock_movements (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  delta      INTEGER NOT NULL CHECK (delta <> 0),
  reason     TEXT NOT NULL,
  -- Si se borra el usuario, el movimiento sobrevive: es un registro de auditoría.
  user_id    INTEGER REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX stock_movements_product_id_created_at_idx
  ON stock_movements (product_id, created_at DESC);

-- Mantiene products.updated_at sin depender de que cada UPDATE lo recuerde.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

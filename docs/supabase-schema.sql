-- ============================================================
-- leticIA — Supabase schema
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ─── Profiles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT        NOT NULL,
  user_name     TEXT,
  email         TEXT        NOT NULL,
  currency      TEXT        NOT NULL DEFAULT 'ARS',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: solo el dueño" ON profiles
  FOR ALL USING (auth.uid() = id);

-- ─── Productos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id                      BIGSERIAL   PRIMARY KEY,
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre                  TEXT        NOT NULL,
  precio_centavos         INTEGER     NOT NULL CHECK (precio_centavos > 0),
  activo                  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "productos: solo el dueño" ON productos
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_productos_user ON productos(user_id, activo);

-- ─── Insumos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insumos (
  id                      BIGSERIAL   PRIMARY KEY,
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre                  TEXT        NOT NULL,
  unidad                  TEXT        NOT NULL CHECK (unidad IN ('kg','g','L','ml','pza')),
  stock_mili              INTEGER     NOT NULL DEFAULT 0 CHECK (stock_mili >= 0),
  costo_unitario_centavos INTEGER,
  activo                  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insumos: solo el dueño" ON insumos
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_insumos_user ON insumos(user_id, activo);

-- ─── Receta items ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receta_items (
  producto_id   BIGINT  NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  insumo_id     BIGINT  NOT NULL REFERENCES insumos(id),
  cantidad_mili INTEGER NOT NULL CHECK (cantidad_mili > 0),
  PRIMARY KEY (producto_id, insumo_id)
);

ALTER TABLE receta_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receta_items: solo el dueño" ON receta_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM productos p WHERE p.id = producto_id AND p.user_id = auth.uid())
  );

-- ─── Ventas ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ventas (
  id              BIGSERIAL   PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendido_en      BIGINT      NOT NULL,
  dia             DATE        NOT NULL,
  total_centavos  INTEGER     NOT NULL CHECK (total_centavos > 0),
  metodo_pago     TEXT        NOT NULL CHECK (metodo_pago IN ('efectivo','tarjeta','transferencia','otro')),
  nota            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ventas: solo el dueño" ON ventas
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_ventas_user_dia ON ventas(user_id, dia);

-- ─── Venta items ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venta_items (
  id                       BIGSERIAL PRIMARY KEY,
  venta_id                 BIGINT    NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id              BIGINT    NOT NULL REFERENCES productos(id),
  cantidad                 INTEGER   NOT NULL CHECK (cantidad > 0),
  precio_unitario_centavos INTEGER   NOT NULL CHECK (precio_unitario_centavos > 0),
  costo_unitario_centavos  INTEGER
);

ALTER TABLE venta_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venta_items: solo el dueño" ON venta_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM ventas v WHERE v.id = venta_id AND v.user_id = auth.uid())
  );

CREATE INDEX idx_venta_items_venta ON venta_items(venta_id);

-- ─── Movimientos de insumo ───────────────────────────────────
CREATE TABLE IF NOT EXISTS movimientos_insumo (
  id                     BIGSERIAL   PRIMARY KEY,
  user_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insumo_id              BIGINT      NOT NULL REFERENCES insumos(id),
  tipo                   TEXT        NOT NULL CHECK (tipo IN ('compra','consumo')),
  cantidad_mili          INTEGER     NOT NULL,
  costo_total_centavos   INTEGER     NOT NULL DEFAULT 0,
  venta_id               BIGINT      REFERENCES ventas(id),
  dia                    DATE        NOT NULL DEFAULT CURRENT_DATE,
  creado_en              BIGINT      NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE movimientos_insumo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movimientos_insumo: solo el dueño" ON movimientos_insumo
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_movimientos_user_insumo ON movimientos_insumo(user_id, insumo_id, creado_en);

-- ─── Operations (ventas/compras/gastos manuales) ─────────────
CREATE TABLE IF NOT EXISTS operations (
  id         BIGSERIAL   PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN ('venta','compra','gasto')),
  concept    TEXT        NOT NULL,
  amount     INTEGER     NOT NULL CHECK (amount > 0),
  date       DATE        NOT NULL,
  note       TEXT,
  category   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operations: solo el dueño" ON operations
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_operations_user_date ON operations(user_id, date, id);
CREATE INDEX idx_operations_user_type ON operations(user_id, type, date);

-- ─── Settings ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key     TEXT NOT NULL,
  value   TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings: solo el dueño" ON settings
  FOR ALL USING (auth.uid() = user_id);

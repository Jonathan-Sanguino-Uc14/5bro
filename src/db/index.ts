import * as SQLite from 'expo-sqlite';
import { migrateFinancialData } from './financial-migration';

let connection: Promise<SQLite.SQLiteDatabase> | null = null;
function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!connection) {
    connection = SQLite.openDatabaseAsync('ventas.db').catch((error: unknown) => {
      connection = null;
      throw error;
    });
  }
  return connection;
}
let migrationTask: Promise<void> | null = null;

async function runMigrations(): Promise<void> {
  const database = await openDatabase();

  await database.execAsync('PRAGMA foreign_keys = ON;');

  const versionRow = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  let currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 1) {
    await database.execAsync('PRAGMA journal_mode = WAL;');
    await database.withTransactionAsync(async () => database.execAsync(`
      CREATE TABLE IF NOT EXISTS productos (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre          TEXT    NOT NULL,
        precio_centavos INTEGER NOT NULL,
        activo          INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS ventas (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        vendido_en     INTEGER NOT NULL,
        dia            TEXT    NOT NULL,
        total_centavos INTEGER NOT NULL,
        metodo_pago    TEXT    NOT NULL,
        nota           TEXT
      );

      CREATE TABLE IF NOT EXISTS venta_items (
        id                       INTEGER PRIMARY KEY AUTOINCREMENT,
        venta_id                 INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
        producto_id              INTEGER NOT NULL REFERENCES productos(id),
        cantidad                 INTEGER NOT NULL,
        precio_unitario_centavos INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ventas_dia          ON ventas(dia);
      CREATE INDEX IF NOT EXISTS idx_venta_items_venta   ON venta_items(venta_id);
      CREATE INDEX IF NOT EXISTS idx_venta_items_prod    ON venta_items(producto_id);
      PRAGMA user_version = 1;
    `));

    currentVersion = 1;
  }

  if (currentVersion < 2) {
    await database.withTransactionAsync(async () => database.execAsync(`
      ALTER TABLE venta_items ADD COLUMN costo_unitario_centavos INTEGER;

      CREATE TABLE IF NOT EXISTS insumos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        unidad TEXT NOT NULL CHECK (unidad IN ('kg', 'g', 'L', 'ml', 'pza')),
        stock_mili INTEGER NOT NULL DEFAULT 0 CHECK (stock_mili >= 0),
        costo_unitario_centavos INTEGER,
        activo INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS receta_items (
        producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
        insumo_id INTEGER NOT NULL REFERENCES insumos(id),
        cantidad_mili INTEGER NOT NULL CHECK (cantidad_mili > 0),
        PRIMARY KEY (producto_id, insumo_id)
      );

      CREATE TABLE IF NOT EXISTS movimientos_insumo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        insumo_id INTEGER NOT NULL REFERENCES insumos(id),
        tipo TEXT NOT NULL CHECK (tipo IN ('compra', 'consumo')),
        cantidad_mili INTEGER NOT NULL,
        costo_total_centavos INTEGER NOT NULL DEFAULT 0,
        venta_id INTEGER REFERENCES ventas(id),
        creado_en INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_receta_producto ON receta_items(producto_id);
      CREATE INDEX IF NOT EXISTS idx_movimientos_insumo ON movimientos_insumo(insumo_id, creado_en);
      PRAGMA user_version = 2;
    `));
  }
  await migrateFinancialData(database);
}

export async function getDatabase() {
  await migrateVentasDb();
  return openDatabase();
}

function migrateVentasDb(): Promise<void> {
  if (!migrationTask) {
    migrationTask = runMigrations().catch((error: unknown) => {
      migrationTask = null;
      throw error;
    });
  }
  return migrationTask;
}

export { migrateVentasDb };

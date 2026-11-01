import * as SQLite from 'expo-sqlite';

// A view keeps each event in its original table: no mirrored amounts to drift.
// Positive ids are manual entries; negative even/odd ids identify sales/purchases.
export const FINANCIAL_VIEW_SQL = `
CREATE VIEW IF NOT EXISTS financial_operations AS
SELECT id, type, concept, amount, date, note, category, created_at,
       'manual' AS source, id AS source_id
FROM operations
UNION ALL
SELECT -2*v.id, 'venta', 'Venta #' || v.id, v.total_centavos, v.dia,
       v.nota, 'mercancía', strftime('%Y-%m-%dT%H:%M:%fZ', v.vendido_en/1000.0, 'unixepoch'),
       'sale', v.id
FROM ventas v
UNION ALL
SELECT -2*m.id-1, 'compra', 'Compra de ' || i.nombre, m.costo_total_centavos,
       m.dia, NULL, 'mercancía', strftime('%Y-%m-%dT%H:%M:%fZ', m.creado_en/1000.0, 'unixepoch'),
       'inventory', m.id
FROM movimientos_insumo m JOIN insumos i ON i.id = m.insumo_id
WHERE m.tipo = 'compra';
`;

export async function migrateFinancialData(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`CREATE TABLE IF NOT EXISTS app_migrations (id TEXT PRIMARY KEY);`);
  const done = await database.getFirstAsync('SELECT id FROM app_migrations WHERE id = ?;', 'unified-finances-v1');
  if (done) return;

  // Read the legacy file without altering it. Commit rows and marker together,
  // so an interrupted migration can be retried without duplicating any event.
  const legacy = await SQLite.openDatabaseAsync('letica.db');
  try {
    await database.withTransactionAsync(async () => {
      await database.execAsync(`
        CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, business_name TEXT NOT NULL,
          email TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), user_name TEXT);
        CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE operations (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL,
          concept TEXT NOT NULL, amount INTEGER NOT NULL, date TEXT NOT NULL, note TEXT,
          category TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
        CREATE INDEX idx_operations_date ON operations(date, id);
        CREATE INDEX idx_operations_type_date ON operations(type, date, id);
        ALTER TABLE movimientos_insumo ADD COLUMN dia TEXT;
        UPDATE movimientos_insumo SET dia = date(creado_en / 1000, 'unixepoch', 'localtime');
        CREATE TRIGGER movimiento_local_date AFTER INSERT ON movimientos_insumo
        WHEN NEW.dia IS NULL BEGIN
          UPDATE movimientos_insumo SET dia = date(NEW.creado_en / 1000, 'unixepoch', 'localtime')
          WHERE id = NEW.id;
        END;
      `);
      for (const table of ['users', 'settings', 'operations']) {
        const exists = await legacy.getFirstAsync("SELECT name FROM sqlite_master WHERE type='table' AND name=?;", table);
        if (!exists) continue;
        const columns = await legacy.getAllAsync<{ name: string }>(`PRAGMA table_info(${table});`);
        const targetColumns = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table});`);
        const names = columns.map(c => c.name).filter(name => targetColumns.some(c => c.name === name));
        const quoted = names.map(name => `"${name}"`).join(', ');
        // Bound batches avoid holding the whole history in JS memory.
        for (let offset = 0; ; offset += 250) {
          const rows = await legacy.getAllAsync<Record<string, SQLite.SQLiteBindValue>>(
            `SELECT ${quoted} FROM ${table} ORDER BY rowid LIMIT 250 OFFSET ?;`, offset,
          );
          for (const row of rows) {
            await database.runAsync(`INSERT INTO ${table} (${quoted}) VALUES (${names.map(() => '?').join(',')});`,
              ...names.map(name => row[name]));
          }
          if (rows.length < 250) break;
        }
      }
      await database.execAsync(FINANCIAL_VIEW_SQL);
      await database.runAsync('INSERT INTO app_migrations (id) VALUES (?);', 'unified-finances-v1');
    });
  } finally {
    await legacy.closeAsync();
  }
}

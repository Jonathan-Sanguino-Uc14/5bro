// Runs production queries against real SQLite, without a device or native mocks
// for SQL behavior. Requires Node 22.13+ (node:sqlite).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const Module = require('node:module');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  module._compile(outputText, filename);
};

const databases = new Map();
let failImport = true;
function open(name) {
  if (databases.has(name)) return databases.get(name);
  const sql = new DatabaseSync(':memory:');
  const adapter = {
    sql,
    execAsync: async query => sql.exec(query),
    getFirstAsync: async (query, ...args) => sql.prepare(query).get(...args) ?? null,
    getAllAsync: async (query, ...args) => sql.prepare(query).all(...args),
    runAsync: async (query, ...args) => {
      if (failImport && query.startsWith('INSERT INTO operations ("')) {
        failImport = false;
        throw new Error('Simulated interrupted import');
      }
      const result = sql.prepare(query).run(...args);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    withTransactionAsync: async work => {
      sql.exec('BEGIN');
      try { await work(); sql.exec('COMMIT'); }
      catch (error) { sql.exec('ROLLBACK'); throw error; }
    },
    withExclusiveTransactionAsync: async work => adapter.withTransactionAsync(() => work(adapter)),
    closeAsync: async () => {},
  };
  databases.set(name, adapter);
  return adapter;
}
const originalLoad = Module._load;
Module._load = function(name, parent, isMain) {
  if (name === 'expo-sqlite') return { openDatabaseAsync: async name => open(name) };
  if (name === 'react-native') return { Platform: { OS: 'android' } };
  return originalLoad.call(this, name, parent, isMain);
};

test('financial migration, totals, stock, pagination and CSV', async t => {
  const legacy = open('letica.db');
  legacy.sql.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, business_name TEXT, email TEXT, created_at TEXT);
    INSERT INTO users VALUES (7, 'Mi negocio', NULL, '2026-01-01');
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
    INSERT INTO settings VALUES ('theme', 'dark');
    CREATE TABLE operations (id INTEGER PRIMARY KEY, type TEXT, concept TEXT, amount INTEGER,
      date TEXT, note TEXT, category TEXT, created_at TEXT);
    INSERT INTO operations VALUES (1, 'venta', 'Venta manual', 1000, '2026-10-27', NULL, NULL, '2026-10-27 12:00:00');
    INSERT INTO operations VALUES (2, 'gasto', 'Renta', 300, '2026-10-27', NULL, NULL, '2026-10-27 12:00:00');
  `);
  const { getDatabase, migrateVentasDb } = require('../src/db/index.ts');
  const { migrateFinancialData } = require('../src/db/financial-migration.ts');
  const operations = require('../src/lib/operations.ts');
  const queries = require('../src/db/queries.ts');
  const { financialCSV, csvCell } = require('../src/lib/csv.ts');
  const { isValidLocalDate, todayLocalISO, getWeekRange } = require('../src/lib/dates.ts');
  let db;

  await t.test('interrupted migration rolls back and retries without duplication', async () => {
    await assert.rejects(migrateVentasDb(), /interrupted/);
    assert.equal(open('ventas.db').sql.prepare('SELECT COUNT(*) AS n FROM app_migrations').get().n, 0);
    db = await getDatabase();
    await migrateFinancialData(db);
    assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM operations').get().n, 2);
    assert.equal(db.sql.prepare('SELECT id FROM users').get().id, 7);
    assert.equal(db.sql.prepare('SELECT value FROM settings').get().value, 'dark');
    assert.equal(legacy.sql.prepare('SELECT COUNT(*) AS n FROM operations').get().n, 2);
  });

  await t.test('sale, inventory purchases and manual entries reconcile without counting consumption twice', async () => {
    const product = await queries.createProducto('Pan "especial"', 500, [
      { nombre: 'Harina', unidad: 'kg', cantidadPorUnidadMili: 100, compraInicialMili: 1000, costoCompraCentavos: 200 },
    ]);
    const sale = await queries.createVenta({ items: [{ productoId: product.id, cantidad: 2, precioUnitarioCentavos: 500 }], metodoPago: 'efectivo' });
    // Fixture historical date, independent of the test runner's actual clock.
    db.sql.prepare("UPDATE ventas SET dia='2026-10-27' WHERE id=?").run(sale);
    db.sql.exec("UPDATE movimientos_insumo SET dia='2026-10-27'");
    const totals = await operations.getDayMetrics('2026-10-27');
    assert.deepEqual(totals, { ventas: 2000, compras: 200, gastos: 300, gananciaEstimada: 1500, count: 4 });
    const metrics = await queries.getMetricsByRange('2026-10-27', '2026-10-27');
    assert.equal(metrics.totalCentavos, totals.ventas);
    assert.equal(metrics.gananciaEstimada, totals.gananciaEstimada);
    assert.equal(metrics.numVentas, 2);
    assert.equal(metrics.costoEstimadoCentavos, null); // manual sale's cost is unknown
    assert.equal(metrics.ventasPorDia[0].totalCentavos, totals.ventas);
    const rows = await operations.getOperations(-1);
    assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
    const purchase = rows.find(row => row.source === 'inventory');
    await assert.rejects(operations.deleteOperation(purchase.id), /inventario/);
    assert.equal((await queries.getInsumos())[0].stockMili, 800);
    await operations.deleteOperation(-2 * sale);
    assert.equal((await queries.getInsumos())[0].stockMili, 1000);
    assert.equal((await operations.getDayMetrics('2026-10-27')).ventas, 1000);
  });

  await t.test('failed or concurrent sales cannot corrupt inventory', async () => {
    const item = { productoId: 1, cantidad: 20, precioUnitarioCentavos: 500 };
    const before = db.sql.prepare('SELECT COUNT(*) AS n FROM ventas').get().n;
    await assert.rejects(queries.createVenta({ items: [item], metodoPago: 'efectivo' }), /Stock insuficiente/);
    assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM ventas').get().n, before);
    const results = await Promise.allSettled([1, 2].map(() => queries.createVenta({
      items: [{ ...item, cantidad: 6 }], metodoPago: 'efectivo',
    })));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal((await queries.getInsumos())[0].stockMili, 400);
  });

  await t.test('search reaches older records and pagination has no duplicates', async () => {
    for (let i = 0; i < 230; i++) await operations.createOperation({ type: 'gasto', concept: `Registro ${i}`, amount: 1, date: '2026-10-28' });
    assert.equal((await operations.getOperations(50, undefined, { search: 'Renta' }))[0].id, 2);
    const all = await operations.getOperations(-1);
    const paged = [];
    for (let offset = 0; offset < all.length; offset += 50) paged.push(...await operations.getOperations(50, undefined, { offset }));
    assert.deepEqual(paged.map(row => row.id), all.map(row => row.id));
    const totals = await operations.getOperationDayTotals();
    assert.equal(totals.reduce((sum, row) => sum + row.count, 0), all.length);
    const filtered = await operations.getOperationDayTotals('gasto', 'Renta');
    assert.equal(filtered[0].salidas, 300);
    assert.equal(filtered[0].count, 1);
    const expenses = await operations.getOperations(-1, 'salida');
    assert.ok(expenses.some(row => row.type === 'compra'));
    assert.ok(expenses.some(row => row.type === 'gasto'));
    assert.ok(expenses.every(row => row.type !== 'venta'));
    const expenseTotals = await operations.getOperationDayTotals('salida');
    assert.equal(expenseTotals.reduce((sum, row) => sum + row.count, 0), expenses.length);
  });

  await t.test('AI reads the same current totals as metrics, including later writes', async () => {
    const { buildBusinessSummary } = require('../src/lib/financial-summary.ts');
    const before = await buildBusinessSummary('Negocio');
    await operations.createOperation({ type: 'gasto', concept: 'Nuevo gasto', amount: 101, date: todayLocalISO() });
    const after = await buildBusinessSummary('Negocio');
    assert.equal(after.today.gastos, before.today.gastos + 101);
    assert.deepEqual(after.today, await operations.getDayMetrics(todayLocalISO()));
    assert.deepEqual(after.week, await operations.getRangeMetrics(getWeekRange().startDia, todayLocalISO()));
  });

  await t.test('invalid dates and unsafe amounts are rejected', async () => {
    assert.equal(isValidLocalDate('2026-02-30'), false);
    assert.equal(isValidLocalDate('2024-02-29'), true);
    await assert.rejects(operations.createOperation({ type: 'venta', concept: 'x', amount: 1.2, date: '2026-10-27' }));
    await assert.rejects(operations.createOperation({ type: 'venta', concept: 'x', amount: 100, date: '2026-02-30' }));
    await assert.rejects(queries.createVenta({ items: [], metodoPago: 'efectivo' }));
  });

  await t.test('CSV escapes quotes, newlines and formula-like user text', async () => {
    assert.equal(csvCell('Pan "especial", grande\nsegunda línea'), '"Pan ""especial"", grande\nsegunda línea"');
    assert.equal(csvCell('=1+1'), '"\'=1+1"');
    const csv = financialCSV(await operations.getOperations(-1));
    assert.ok(csv.startsWith('\uFEFF'));
    assert.ok(csv.includes('Renta'));
    assert.ok(csv.includes('Compra de Harina'));
  });

  await t.test('an existing sales database keeps its historical sales and purchases', async () => {
    const old = open('upgrade-fixture.db');
    old.sql.exec(`
      CREATE TABLE ventas (id INTEGER PRIMARY KEY, vendido_en INTEGER, dia TEXT, total_centavos INTEGER, nota TEXT);
      CREATE TABLE insumos (id INTEGER PRIMARY KEY, nombre TEXT);
      CREATE TABLE movimientos_insumo (id INTEGER PRIMARY KEY, insumo_id INTEGER, tipo TEXT, costo_total_centavos INTEGER, creado_en INTEGER);
      INSERT INTO ventas VALUES (42, 1793102400000, '2026-10-27', 9876, 'histórica');
      INSERT INTO insumos VALUES (9, 'Azúcar');
      INSERT INTO movimientos_insumo VALUES (81, 9, 'compra', 1234, 1793102400000);
    `);
    await migrateFinancialData(old);
    await migrateFinancialData(old);
    const sale = await old.getFirstAsync("SELECT * FROM financial_operations WHERE source='sale';");
    assert.equal(sale.amount, 9876);
    assert.equal(sale.source_id, 42);
    assert.equal(sale.date, '2026-10-27');
    const purchase = await old.getFirstAsync("SELECT * FROM financial_operations WHERE source='inventory';");
    assert.equal(purchase.amount, 1234);
    assert.equal(purchase.source_id, 81);
    assert.match(purchase.date, /^\d{4}-\d{2}-\d{2}$/);
  });
});

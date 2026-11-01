import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
const env = parseEnv(readFileSync('.env.server.local', 'utf8'));
const app = parseEnv(readFileSync('.env.local', 'utf8'));
const p = { ventas: 10000, compras: 2000, gastos: 1000, gananciaEstimada: 7000, count: 3 };
try {
  const response = await fetch(app.EXPO_PUBLIC_AI_URL, {
    method: 'POST', signal: AbortSignal.timeout(45000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.AI_DEV_TOKEN}` },
    body: JSON.stringify({ message: 'Prueba con datos ficticios. Dime el balance estimado de hoy en una frase.', history: [], summary: { businessName: 'Prueba de conexion', currentDate: '2026-10-27', today: p, week: p, month: { ...p, daysWithRecords: 1 } } })
  });
  console.log('HTTP ' + response.status);
  console.log(JSON.stringify(await response.json()));
  if (!response.ok) process.exitCode = 1;
} catch (error) { console.log('Connection failed: ' + (error.cause?.code || error.name)); process.exitCode = 1; }

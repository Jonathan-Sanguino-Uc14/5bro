import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
const serverPath = '.env.server.local';
if (existsSync(serverPath)) {
  console.log('La configuración del servidor ya existe; no se sobrescribió. Consulta docs/ai-setup.md.');
} else {
  const token = randomBytes(32).toString('hex');
  writeFileSync(serverPath, `OPENAI_API_KEY=\nOPENAI_MODEL=gpt-4.1-mini\nAI_HOST=127.0.0.1\nAI_PORT=8787\nAI_DEV_TOKEN=${token}\n`);
  const appEnv = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
  if (!/^EXPO_PUBLIC_AI_URL=/m.test(appEnv)) appendFileSync('.env.local', '\nEXPO_PUBLIC_AI_URL=http://127.0.0.1:8787/chat\n');
  if (!/^EXPO_PUBLIC_AI_DEV_TOKEN=/m.test(appEnv)) appendFileSync('.env.local', `EXPO_PUBLIC_AI_DEV_TOKEN=${token}\n`);
  console.log('Configuración creada. Completa OPENAI_API_KEY en .env.server.local y ejecuta npm run ai:dev. No compartas la clave en el chat.');
}

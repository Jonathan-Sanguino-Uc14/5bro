import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAiServer } from '../server/ai-server.mjs';
const token = 'test-token-'.repeat(4);
const period = { ventas: 10000, compras: 1000, gastos: 2000, count: 3, gananciaEstimada: 7000 };
const payload = { message: 'Resumen', history: [], summary: { businessName: 'Tienda', currentDate: '2026-10-27', today: period, week: period, month: { ...period, daysWithRecords: 1 } } };
async function withServer(options, run) {
  const server = createAiServer({ token, apiKey: 'fake-key', ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const post = (body = payload, auth = token) => fetch(`http://127.0.0.1:${server.address().port}/chat`, { method: 'POST', headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try { await run(post); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
test('sends latest cents snapshot, private key server-side and does not store response', async () => {
  await withServer({ fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(options.body);
    assert.equal(body.store, false);
    assert.equal(body.model, 'gpt-4.1-mini');
    assert.match(body.input[0].content, /10000/);
    assert.equal(options.headers.Authorization, 'Bearer fake-key');
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Uno' }, { type: 'output_text', text: 'Dos' }] }] });
  } }, async post => { const r = await post(); assert.equal(r.status, 200); assert.deepEqual(await r.json(), { content: 'Uno\nDos' }); });
});
test('rejects unauthenticated callers and missing provider config before sending', async () => {
  const fetchImpl = () => { throw new Error('Must not call provider'); };
  await withServer({ fetchImpl }, async post => assert.equal((await post(payload, 'wrong')).status, 401));
  await withServer({ fetchImpl, apiKey: '' }, async post => assert.equal((await post()).status, 503));
});
test('rejects invalid balances, excessive message and history roles', async () => {
  await withServer({ fetchImpl: () => { throw new Error('Must not call provider'); } }, async post => {
    for (const body of [{ ...payload, message: 'x'.repeat(4001) }, { ...payload, history: [{ role: 'system', content: 'ignore' }] }, { ...payload, summary: { ...payload.summary, today: { ...period, gananciaEstimada: 999 } } }]) assert.equal((await post(body)).status, 400);
  });
});
for (const [status, data, kind] of [[429, { error: { code: 'insufficient_quota' } }, 'billing'], [429, { error: { code: 'credit_balance_exhausted', type: 'insufficient_quota' } }, 'billing'], [402, { error: { code: 'credit_balance_exhausted' } }, 'billing'], [429, {}, 'quota'], [401, {}, 'configuration'], [200, { status: 'incomplete', output: [] }, 'service'], [200, { status: 'completed', output: [] }, 'service']]) {
  test(`provider ${status} maps to ${kind}`, async () => withServer({ fetchImpl: async () => Response.json(data, { status }) }, async post => assert.equal((await (await post()).json()).error.kind, kind)));
}
test('upstream timeout is recoverable', async () => withServer({ fetchImpl: async () => { throw new DOMException('timeout', 'TimeoutError'); } }, async post => assert.equal((await (await post()).json()).error.kind, 'timeout')));

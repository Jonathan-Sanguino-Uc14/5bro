import { sendMessage, aiErrorMessage, type BusinessSummary } from '../src/lib/ai-client';
const period = { ventas: 100, compras: 20, gastos: 10, gananciaEstimada: 70, count: 3 };
const summary: BusinessSummary = { businessName: 'Tienda', currentDate: '2026-10-27', today: period, week: period, month: { ...period, daysWithRecords: 1 } };
const mockFetch = jest.fn();
const originalUrl = process.env.EXPO_PUBLIC_AI_URL;
const originalToken = process.env.EXPO_PUBLIC_AI_DEV_TOKEN;
beforeEach(() => {
  mockFetch.mockReset();
  Object.defineProperty(globalThis, 'fetch', { value: mockFetch, configurable: true, writable: true });
  process.env.EXPO_PUBLIC_AI_URL = 'http://localhost:8787/chat';
  process.env.EXPO_PUBLIC_AI_DEV_TOKEN = 'test-only-token';
});
afterAll(() => {
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_AI_URL; else process.env.EXPO_PUBLIC_AI_URL = originalUrl;
  if (originalToken === undefined) delete process.env.EXPO_PUBLIC_AI_DEV_TOKEN; else process.env.EXPO_PUBLIC_AI_DEV_TOKEN = originalToken;
});
test('missing config is explicit and does not call network', async () => {
  delete process.env.EXPO_PUBLIC_AI_URL;
  expect(await sendMessage('Hola', [], summary)).toEqual({ ok: false, error: { kind: 'configuration' } });
  expect(mockFetch).not.toHaveBeenCalled();
});
test('sends snapshot to backend without provider credentials', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ content: 'Balance estimado: $0.70' }) });
  expect((await sendMessage('Resumen', [], summary)).ok).toBe(true);
  const [url, options] = mockFetch.mock.calls[0];
  expect(url).toBe('http://localhost:8787/chat');
  expect(JSON.parse(options.body)).toEqual({ message: 'Resumen', history: [], summary });
  expect(options.headers).not.toHaveProperty('x-api-key');
});
test('billing error remains distinct from connection failure', async () => {
  mockFetch.mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: { kind: 'billing' } }) });
  expect(await sendMessage('Hola', [], summary)).toEqual({ ok: false, error: { kind: 'billing' } });
  expect(aiErrorMessage({ kind: 'billing' })).toContain('facturación');
});
test('rejects empty and malformed successful replies', async () => {
  for (const content of ['', null, 42]) {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ content }) });
    expect(await sendMessage('Hola', [], summary)).toEqual({ ok: false, error: { kind: 'service' } });
  }
});
test('network rejection becomes recoverable typed error', async () => {
  mockFetch.mockRejectedValue(new TypeError('Network failed'));
  expect(await sendMessage('Hola', [], summary)).toEqual({ ok: false, error: { kind: 'network' } });
});
test('rejects oversized questions before network call', async () => {
  expect(await sendMessage('x'.repeat(4001), [], summary)).toEqual({ ok: false, error: { kind: 'invalid' } });
  expect(mockFetch).not.toHaveBeenCalled();
});

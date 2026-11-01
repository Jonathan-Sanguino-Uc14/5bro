import { formatCents, parsePesosInput, formatCentsCompact } from '../src/lib/money';

describe('formatCents', () => {
  test('formats zero', () => expect(formatCents(0)).toBe('$0,00'));
  test('formats simple amount', () => expect(formatCents(150)).toBe('$1,50'));
  test('formats thousands', () => expect(formatCents(150000)).toBe('$1.500,00'));
  test('formats millions', () => expect(formatCents(10000000)).toBe('$100.000,00'));
  test('handles negative', () => expect(formatCents(-500)).toBe('-$5,00'));
});

describe('parsePesosInput', () => {
  test('empty string returns 0', () => expect(parsePesosInput('')).toBe(0));
  test('parses decimal with period', () => expect(parsePesosInput('12.50')).toBe(1250));
  test('parses decimal with comma', () => expect(parsePesosInput('12,50')).toBe(1250));
  test('parses integer pesos', () => expect(parsePesosInput('100')).toBe(10000));
  test('strips $ prefix', () => expect(parsePesosInput('$5.00')).toBe(500));
  test('handles invalid returns 0', () => expect(parsePesosInput('abc')).toBe(0));
});

describe('formatCentsCompact', () => {
  test('formats zero', () => expect(formatCentsCompact(0)).toBe('$0'));
  test('formats thousands', () => expect(formatCentsCompact(1500000)).toBe('$15.000'));
  test('handles negative', () => expect(formatCentsCompact(-100000)).toBe('-$1.000'));
});

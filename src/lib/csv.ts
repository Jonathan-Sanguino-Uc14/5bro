import type { Operation } from './operations';

export function csvCell(value: string | number): string {
  const text = String(value);
  // Prevent a user-entered concept from becoming a spreadsheet formula.
  const safe = typeof value === 'string' && /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function financialCSV(operations: Operation[]): string {
  return '\uFEFF' + [
    ['id', 'fecha', 'tipo', 'concepto', 'monto', 'categoria', 'nota', 'origen'].map(csvCell).join(','),
    ...operations.map(op => [op.id, op.date, op.type, op.concept, (op.amount / 100).toFixed(2),
      op.category ?? '', op.note ?? '', op.source ?? 'manual'].map(csvCell).join(',')),
  ].join('\r\n');
}

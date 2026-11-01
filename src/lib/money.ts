/**
 * Format centavos to display string: 150000 → "$1.500,00"
 * Spanish format: period=thousands, comma=decimal, $ prefix
 */
export function formatCents(centavos: number): string {
  const negative = centavos < 0;
  const abs = Math.abs(centavos);
  const str = (abs / 100).toFixed(2);
  const [intPart, decPart] = str.split('.');
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}$${formatted},${decPart}`;
}

/**
 * Parse user input string (in pesos) to centavos integer.
 * "12.50" → 1250, "1.500,50" → 150050, "" → 0, invalid → 0
 * Handles: comma or period as decimal separator, thousands separators
 */
export function parsePesosInput(input: string): number {
  if (!input) return 0;

  // Strip $ and spaces
  let clean = input.replace(/\$|\s/g, '');
  if (!clean) return 0;

  // Determine decimal separator: look for last . or , followed by exactly 1 or 2 digits at end
  const lastComma = clean.lastIndexOf(',');
  const lastPeriod = clean.lastIndexOf('.');

  let integerPart: string;
  let decimalPart: string;

  if (lastComma > lastPeriod) {
    // comma is the decimal separator
    const afterComma = clean.slice(lastComma + 1);
    if (afterComma.length <= 2 && /^\d+$/.test(afterComma)) {
      integerPart = clean.slice(0, lastComma).replace(/\./g, '');
      decimalPart = afterComma.padEnd(2, '0');
    } else {
      // treat as integer pesos
      integerPart = clean.replace(/[.,]/g, '');
      decimalPart = '00';
    }
  } else if (lastPeriod > lastComma) {
    // period is the decimal separator
    const afterPeriod = clean.slice(lastPeriod + 1);
    if (afterPeriod.length <= 2 && /^\d+$/.test(afterPeriod)) {
      integerPart = clean.slice(0, lastPeriod).replace(/,/g, '');
      decimalPart = afterPeriod.padEnd(2, '0');
    } else {
      // treat as integer pesos (thousands separators only)
      integerPart = clean.replace(/[.,]/g, '');
      decimalPart = '00';
    }
  } else {
    // no decimal separator
    integerPart = clean.replace(/[.,]/g, '');
    decimalPart = '00';
  }

  if (!/^\d*$/.test(integerPart) || !/^\d{2}$/.test(decimalPart)) return 0;
  if (!integerPart && !decimalPart) return 0;

  const fullStr = `${integerPart || '0'}.${decimalPart}`;
  const parsed = parseFloat(fullStr);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

/**
 * Format centavos to compact form for small spaces: 1500000 → "$15.000"
 */
export function formatCentsCompact(centavos: number): string {
  const negative = centavos < 0;
  const abs = Math.abs(centavos);
  const pesos = Math.round(abs / 100);
  const formatted = pesos.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}$${formatted}`;
}

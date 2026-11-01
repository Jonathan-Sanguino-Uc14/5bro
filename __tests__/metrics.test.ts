import {
  calcularTicketPromedio,
  calcularComparacion,
  encontrarHoraPico,
  agruparVentasPorDia,
  calcularProductoTop,
} from '../src/lib/metrics';

describe('calcularTicketPromedio', () => {
  test('normal case', () => expect(calcularTicketPromedio(3000, 3)).toBe(1000));
  test('zero ventas returns 0, not NaN', () => expect(calcularTicketPromedio(0, 0)).toBe(0));
  test('rounds correctly', () => expect(calcularTicketPromedio(1000, 3)).toBe(333));
});

describe('calcularComparacion', () => {
  test('growth case', () => expect(calcularComparacion(1100, 1000)).toBe(10));
  test('decline case', () => expect(calcularComparacion(900, 1000)).toBe(-10));
  test('no prior data returns null', () => expect(calcularComparacion(500, 0)).toBeNull());
  test('same value returns 0', () => expect(calcularComparacion(1000, 1000)).toBe(0));
});

describe('encontrarHoraPico', () => {
  test('finds hour with max sales', () => {
    const data = [
      { hora: 9, totalCentavos: 500 },
      { hora: 14, totalCentavos: 1800 },
      { hora: 10, totalCentavos: 300 },
    ];
    expect(encontrarHoraPico(data)).toBe(14);
  });
  test('empty returns null', () => expect(encontrarHoraPico([])).toBeNull());
});

describe('agruparVentasPorDia', () => {
  test('aggregates same day', () => {
    const ventas = [
      { dia: '2024-10-26', totalCentavos: 1000 },
      { dia: '2024-10-26', totalCentavos: 500 },
      { dia: '2024-10-27', totalCentavos: 800 },
    ];
    const result = agruparVentasPorDia(ventas);
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.dia === '2024-10-26')?.totalCentavos).toBe(1500);
  });
  test('sorts by dia ASC', () => {
    const ventas = [
      { dia: '2024-10-27', totalCentavos: 100 },
      { dia: '2024-10-25', totalCentavos: 200 },
    ];
    const result = agruparVentasPorDia(ventas);
    expect(result[0].dia).toBe('2024-10-25');
  });
});

describe('calcularProductoTop', () => {
  test('finds product with most quantity', () => {
    const ventas = [
      {
        id: 1,
        vendidoEn: 0,
        dia: '2024-10-26',
        totalCentavos: 1000,
        metodoPago: 'efectivo' as const,
        nota: null,
        items: [
          {
            id: 1,
            ventaId: 1,
            productoId: 1,
            cantidad: 3,
            precioUnitarioCentavos: 100,
            costoUnitarioCentavos: null,
            productoNombre: 'Café',
          },
          {
            id: 2,
            ventaId: 1,
            productoId: 2,
            cantidad: 1,
            precioUnitarioCentavos: 700,
            costoUnitarioCentavos: null,
            productoNombre: 'Torta',
          },
        ],
      },
      {
        id: 2,
        vendidoEn: 0,
        dia: '2024-10-26',
        totalCentavos: 500,
        metodoPago: 'tarjeta' as const,
        nota: null,
        items: [
          {
            id: 3,
            ventaId: 2,
            productoId: 1,
            cantidad: 2,
            precioUnitarioCentavos: 100,
            costoUnitarioCentavos: null,
            productoNombre: 'Café',
          },
        ],
      },
    ];
    const top = calcularProductoTop(ventas);
    expect(top?.nombre).toBe('Café');
    expect(top?.cantidad).toBe(5);
  });
  test('returns null for empty ventas', () => expect(calcularProductoTop([])).toBeNull());
});

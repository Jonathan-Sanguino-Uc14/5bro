import { getRevealGeometry } from '../src/lib/theme-transition';

describe('theme reveal coverage', () => {
  test.each([
    [320, 568, 280, 410], [430, 932, 370, 700], [1024, 1366, 900, 900],
    [1366, 768, 0, 0], [390, 844, 195, 422],
  ])('covers every corner for %sx%s from (%s,%s)', (width, height, x, y) => {
    const geometry = getRevealGeometry({ width, height }, { x, y });
    for (const cornerX of [0, width]) {
      for (const cornerY of [0, height]) {
        expect(geometry.radius).toBeGreaterThan(Math.hypot(cornerX - x, cornerY - y));
      }
    }
    expect(geometry.x).toBe(x);
    expect(geometry.y).toBe(y);
  });
  test('clamps stale origins after resizing and handles invalid measurements', () => {
    const clamped = getRevealGeometry({ width: 320, height: 568 }, { x: 900, y: -20 });
    expect(clamped).toMatchObject({ x: 320, y: 0 });
    const invalid = getRevealGeometry({ width: NaN, height: -1 }, { x: Infinity, y: NaN });
    expect(invalid).toMatchObject({ width: 0, height: 0, x: 0, y: 0 });
    expect(Number.isFinite(invalid.radius)).toBe(true);
  });
});

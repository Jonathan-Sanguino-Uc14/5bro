/** Root-local logical pixels; cover the farthest corner plus antialiasing. */
export function getRevealGeometry(
  size: { width: number; height: number },
  origin: { x: number; y: number },
) {
  const width = Math.max(0, Number.isFinite(size.width) ? size.width : 0);
  const height = Math.max(0, Number.isFinite(size.height) ? size.height : 0);
  const x = Math.max(0, Math.min(width, Number.isFinite(origin.x) ? origin.x : width / 2));
  const y = Math.max(0, Math.min(height, Number.isFinite(origin.y) ? origin.y : height / 2));
  return { width, height, x, y, radius: Math.ceil(Math.hypot(
    Math.max(x, width - x), Math.max(y, height - y),
  )) + 2 };
}

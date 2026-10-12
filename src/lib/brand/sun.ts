/**
 * The rising-sun mark: a vermilion disc (r = 15 in a 32×32 box) cut by two
 * gentle waves instead of straight horizon lines. Pure path data, so it can be
 * used in React components and in next/og images alike.
 */
const CX = 16;
const CY = 16;
const R = 15;
const AMP = 0.75; // wave height
const BUMPS = 4; // half-waves across the disc

const f = (n: number) => Number(n.toFixed(3));
const halfWidth = (y: number) => Math.sqrt(R * R - (y - CY) ** 2);

/** Smooth wave from left to right (or right to left) at height y, ending exactly on the circle. */
function wave(y: number, dir: 1 | -1) {
  const w = halfWidth(y);
  const [x0, x1] = dir === 1 ? [CX - w, CX + w] : [CX + w, CX - w];
  const step = (x1 - x0) / BUMPS;
  // First bump goes up when drawn left→right; the reversed path must start with the last bump's direction.
  const firstUp = dir === 1 ? true : BUMPS % 2 === 0 ? false : true;
  let d = `Q${f(x0 + step / 2)} ${f(y + (firstUp ? -2 : 2) * AMP)} ${f(x0 + step)} ${f(y)}`;
  for (let i = 2; i <= BUMPS; i++) d += ` T${f(x0 + step * i)} ${f(y)}`;
  return { start: `${f(x0)} ${f(y)}`, end: `${f(x1)} ${f(y)}`, d };
}

function arc(toY: number, toLeft: boolean, sweep: 0 | 1, large: 0 | 1) {
  const x = toLeft ? CX - halfWidth(toY) : CX + halfWidth(toY);
  return `A${R} ${R} 0 ${large} ${sweep} ${f(x)} ${f(toY)}`;
}

// Cut lines (top/bottom edge of each white wave), matching the original proportions.
const Y1 = 20;
const Y2 = 21.6;
const Y3 = 24.2;
const Y4 = 25.4;

const top = (() => {
  const w = wave(Y1, 1);
  return `M${w.start} ${w.d} ${arc(Y1, true, 0, 1)}Z`;
})();

const band = (() => {
  const a = wave(Y2, 1);
  const b = wave(Y3, -1);
  return `M${a.start} ${a.d} ${arc(Y3, false, 1, 0)} ${b.d} ${arc(Y2, true, 1, 0)}Z`;
})();

const bottom = (() => {
  const w = wave(Y4, 1);
  return `M${w.start} ${w.d} ${arc(Y4, true, 1, 0)}Z`;
})();

export const SUN_PATHS = [top, band, bottom] as const;

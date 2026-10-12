/**
 * The rising-sun mark: a vermilion disc (r = 15 in a 32×32 box) cut by two
 * thin Mount Fuji silhouettes (flat summit, gently curving slopes), so the
 * sun rises behind layered mountains. Pure path data, usable in React
 * components and in next/og images alike.
 */
const CX = 16;
const CY = 16;
const R = 15;

const f = (n: number) => Number(n.toFixed(3));
const halfWidth = (y: number) => Math.sqrt(R * R - (y - CY) ** 2);
const mirror = (x: number) => 2 * CX - x;

// Base mountain: feet on the circle at FOOT_Y, flat summit at SUMMIT_Y.
const FOOT_Y = 21.4;
const SUMMIT_Y = 14.6;
const SUMMIT_HALF = 2.1;

/** Mountain outline shifted down by `dy`, drawn left→right (dir 1) or right→left (dir -1). */
function ridge(dy: number, dir: 1 | -1) {
  const fy = FOOT_Y + dy;
  const sy = SUMMIT_Y + dy;
  const lx = CX - halfWidth(fy);
  const ax = CX - SUMMIT_HALF;
  const h = fy - sy;
  // Concave Fuji slope: gentle near the foot, steep near the summit.
  const c1 = [lx + (ax - lx) * 0.55, fy - h * 0.12];
  const c2 = [ax - (ax - lx) * 0.16, sy + h * 0.38];
  const pt = (p: number[]) => `${f(p[0]!)} ${f(p[1]!)}`;
  const m = (p: number[]) => [mirror(p[0]!), p[1]!];
  const L = pt([lx, fy]);
  const A = pt([ax, sy]);
  const B = pt([mirror(ax), sy]);
  const Rt = pt([mirror(lx), fy]);
  if (dir === 1) return { start: L, fy, d: `C${pt(c1)} ${pt(c2)} ${A} L${B} C${pt(m(c2))} ${pt(m(c1))} ${Rt}` };
  return { start: Rt, fy, d: `C${pt(m(c1))} ${pt(m(c2))} ${B} L${A} C${pt(c2)} ${pt(c1)} ${L}` };
}

function arcTo(y: number, toLeft: boolean, sweep: 0 | 1, large: 0 | 1) {
  const x = toLeft ? CX - halfWidth(y) : CX + halfWidth(y);
  return `A${R} ${R} 0 ${large} ${sweep} ${f(x)} ${f(y)}`;
}

// Offsets of the four outlines: top piece, white gap, band, white gap, bottom piece.
const D1 = 0;
const D2 = D1 + 1.5;
const D3 = D2 + 2.3;
const D4 = D3 + 1.2;

const top = (() => {
  const r = ridge(D1, 1);
  return `M${r.start} ${r.d} ${arcTo(r.fy, true, 0, 1)}Z`;
})();

const band = (() => {
  const a = ridge(D2, 1);
  const b = ridge(D3, -1);
  return `M${a.start} ${a.d} ${arcTo(b.fy, false, 1, 0)} ${b.d} ${arcTo(a.fy, true, 1, 0)}Z`;
})();

const bottom = (() => {
  const r = ridge(D4, 1);
  return `M${r.start} ${r.d} ${arcTo(r.fy, true, 1, 0)}Z`;
})();

export const SUN_PATHS = [top, band, bottom] as const;

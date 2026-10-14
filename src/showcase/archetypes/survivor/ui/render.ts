/**
 * Paints one frame of the floor onto a 2D canvas. Reads arena state; writes nothing back.
 * The camera is locked to the double. Colours are the costume's, as literals, because a
 * canvas cannot read CSS variables per draw.
 */
import { ANCHORS, CONE_HALF_ANGLE } from '../data';
import {
  SHOT_RADIUS,
  WORLD_HALF,
  orbitBottles,
  type ArenaState,
  type Extra,
} from '../modules/sim/arena';

const C = {
  floor: '#1b1815',
  grid: 'rgba(236,229,216,0.035)',
  wall: '#2a2522',
  hazardA: '#f2a73a',
  hazardB: '#110f0d',
  tapeBlue: '#4b8fd6',
  tapeYellow: '#d9b84a',
  chalk: '#ece5d8',
  tungsten: '#f2a73a',
  squib: '#d8452f',
  gold: '#ffd56b',
  nitrate: '#b9b3a7',
  bottle: 'rgba(120, 200, 150, 0.9)',
} as const;

const KIND_FILL: Record<Extra['kind']['id'], string> = {
  grunt: '#6c655e',
  biker: '#8d5b3b',
  bruiser: '#4b4541',
  henchman: '#2c2b30',
};

/** Floor marks: actors' T-marks taped at fixed world spots. */
const MARKS: { x: number; y: number; blue: boolean; rot: number }[] = (() => {
  const out = [];
  let seed = 1234567;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 90; i++) {
    out.push({
      x: (rnd() * 2 - 1) * WORLD_HALF,
      y: (rnd() * 2 - 1) * WORLD_HALF,
      blue: rnd() < 0.5,
      rot: rnd() * Math.PI,
    });
  }
  return out;
})();

export function renderArena(
  ctx: CanvasRenderingContext2D,
  a: ArenaState,
  w: number,
  h: number,
): void {
  const p = a.player;
  const ox = w / 2 - p.x;
  const oy = h / 2 - p.y;

  ctx.fillStyle = C.floor;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(ox, oy);

  drawGrid(ctx, p.x, p.y, w, h);
  drawMarks(ctx, p.x, p.y, w, h);
  drawWalls(ctx);
  drawShot(ctx, a);

  // reels
  for (const r of a.reels) {
    if (Math.abs(r.x - p.x) > w / 2 + 20 || Math.abs(r.y - p.y) > h / 2 + 20) continue;
    ctx.fillStyle = r.gold ? C.gold : C.nitrate;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.value >= 2 ? 6 : 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b1815';
    ctx.beginPath();
    ctx.arc(r.x, r.y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // fx under bodies
  for (const f of a.fx) {
    const k = f.life / f.max;
    if (f.kind === 'ring') {
      ctx.strokeStyle = `rgba(242,167,58,${0.7 * k})`;
      ctx.lineWidth = 6 * k + 1;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (1.05 - 0.35 * k), 0, Math.PI * 2);
      ctx.stroke();
    } else if (f.kind === 'cone') {
      const g = ctx.createRadialGradient(f.x, f.y, 10, f.x, f.y, f.r);
      g.addColorStop(0, `rgba(255,213,107,${0.75 * k})`);
      g.addColorStop(0.6, `rgba(216,69,47,${0.55 * k})`);
      g.addColorStop(1, 'rgba(216,69,47,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.arc(f.x, f.y, f.r, f.angle - CONE_HALF_ANGLE, f.angle + CONE_HALF_ANGLE);
      ctx.closePath();
      ctx.fill();
    }
  }

  // extras
  for (const e of a.extras) {
    if (Math.abs(e.x - p.x) > w / 2 + 40 || Math.abs(e.y - p.y) > h / 2 + 40) continue;
    const r = e.kind.radius;
    ctx.fillStyle = e.flash > 0 ? C.chalk : KIND_FILL[e.kind.id];
    ctx.beginPath();
    ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (e.kind.id === 'henchman') {
      ctx.fillStyle = C.squib;
      ctx.fillRect(e.x - 1.5, e.y - 2, 3, 7);
    }
    if (e.kind.id === 'biker') {
      ctx.fillStyle = '#d9b84a';
      ctx.fillRect(e.x - r + 2, e.y - 2, (r - 2) * 2, 3);
    }
    if (e.kind.id === 'bruiser' && e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - r, e.y - r - 8, r * 2, 3);
      ctx.fillStyle = C.squib;
      ctx.fillRect(e.x - r, e.y - r - 8, (r * 2 * Math.max(0, e.hp)) / e.maxHp, 3);
    }
  }

  // tracers and pops over bodies
  for (const f of a.fx) {
    const k = f.life / f.max;
    if (f.kind === 'tracer') {
      ctx.strokeStyle = f.heavy ? `rgba(255,213,107,${k})` : `rgba(236,229,216,${0.85 * k})`;
      ctx.lineWidth = f.heavy ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(f.x2, f.y2);
      ctx.stroke();
    } else if (f.kind === 'pop') {
      ctx.fillStyle = f.gold ? `rgba(255,213,107,${0.6 * k})` : `rgba(236,229,216,${0.35 * k})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 16 * (1.3 - k), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // bottles
  for (const slot of a.rigs) {
    if (slot.def.shape !== 'orbit') continue;
    for (const b of orbitBottles(a, slot)) {
      ctx.fillStyle = C.bottle;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(236,229,216,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // the double: a lit figure with a heading notch
  const glow = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 90);
  glow.addColorStop(0, 'rgba(242,167,58,0.18)');
  glow.addColorStop(1, 'rgba(242,167,58,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.hurt > 0 ? C.squib : C.chalk;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.tungsten;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.facing) * 6, p.y + Math.sin(p.facing) * 6);
  ctx.lineTo(p.x + Math.cos(p.facing) * 19, p.y + Math.sin(p.facing) * 19);
  ctx.stroke();

  ctx.restore();

  // vignette: the lens, not the stage
  const v = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.35,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.75,
  );
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);

  drawShotArrow(ctx, a, w, h);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
): void {
  const step = 160;
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const x0 = Math.floor((px - w / 2) / step) * step;
  const y0 = Math.floor((py - h / 2) / step) * step;
  for (let x = x0; x < px + w / 2; x += step) {
    ctx.moveTo(x, py - h / 2);
    ctx.lineTo(x, py + h / 2);
  }
  for (let y = y0; y < py + h / 2; y += step) {
    ctx.moveTo(px - w / 2, y);
    ctx.lineTo(px + w / 2, y);
  }
  ctx.stroke();
}

function drawMarks(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
): void {
  ctx.lineWidth = 4;
  for (const m of MARKS) {
    if (Math.abs(m.x - px) > w / 2 + 30 || Math.abs(m.y - py) > h / 2 + 30) continue;
    ctx.strokeStyle = m.blue ? 'rgba(75,143,214,0.28)' : 'rgba(217,184,74,0.24)';
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.rot);
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 14);
    ctx.stroke();
    ctx.restore();
  }
}

let hazard: CanvasPattern | null = null;

function drawWalls(ctx: CanvasRenderingContext2D): void {
  if (!hazard) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 40;
    const t = tile.getContext('2d')!;
    t.fillStyle = C.hazardB;
    t.fillRect(0, 0, 40, 40);
    t.fillStyle = C.hazardA;
    for (const o of [-40, 0, 40]) {
      t.beginPath();
      t.moveTo(o, 40);
      t.lineTo(o + 20, 40);
      t.lineTo(o + 60, 0);
      t.lineTo(o + 40, 0);
      t.fill();
    }
    hazard = ctx.createPattern(tile, 'repeat');
  }
  const W = WORLD_HALF;
  const band = 40;
  ctx.fillStyle = hazard!;
  ctx.beginPath();
  ctx.rect(-W - band, -W - band, (W + band) * 2, (W + band) * 2);
  ctx.rect(-W, -W, W * 2, W * 2);
  ctx.fill('evenodd');
  ctx.fillStyle = '#0c0b0a';
  ctx.beginPath();
  ctx.rect(-W - band - 2000, -W - band - 2000, (W + band + 2000) * 2, (W + band + 2000) * 2);
  ctx.rect(-W - band, -W - band, (W + band) * 2, (W + band) * 2);
  ctx.fill('evenodd');
}

/** The shot: a viewfinder frame drifting over the floor. */
function drawShot(ctx: CanvasRenderingContext2D, a: ArenaState): void {
  const { x, y } = a.shot;
  const r = SHOT_RADIUS;
  const hw = r * 1.15;
  const hh = r * 0.68;
  ctx.fillStyle = 'rgba(242,167,58,0.05)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(236,229,216,0.55)';
  ctx.lineWidth = 2;
  const L = 22;
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x + sx * hw, y + sy * hh - sy * L);
    ctx.lineTo(x + sx * hw, y + sy * hh);
    ctx.lineTo(x + sx * hw - sx * L, y + sy * hh);
    ctx.stroke();
  }
  const blink = Math.floor(a.t * 2) % 2 === 0;
  if (blink) {
    ctx.fillStyle = C.squib;
    ctx.beginPath();
    ctx.arc(x - hw + 14, y - hh + 14, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(236,229,216,0.7)';
  ctx.font = '700 12px "Nimbus Sans Narrow", "Arial Narrow", sans-serif';
  ctx.fillText(`REC  ×${ANCHORS.shotMult}`, x - hw + 24, y - hh + 18);
}

/** When the shot drifts off-camera, an edge tick points back to it. */
function drawShotArrow(ctx: CanvasRenderingContext2D, a: ArenaState, w: number, h: number): void {
  const dx = a.shot.x - a.player.x;
  const dy = a.shot.y - a.player.y;
  if (Math.abs(dx) < w / 2 - 40 && Math.abs(dy) < h / 2 - 40) return;
  const ang = Math.atan2(dy, dx);
  const ex = w / 2 + Math.cos(ang) * (w / 2 - 30);
  const ey = h / 2 + Math.sin(ang) * (h / 2 - 30);
  ctx.save();
  ctx.translate(Math.max(24, Math.min(w - 24, ex)), Math.max(24, Math.min(h - 24, ey)));
  ctx.rotate(ang);
  ctx.fillStyle = 'rgba(242,167,58,0.85)';
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(-6, -7);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

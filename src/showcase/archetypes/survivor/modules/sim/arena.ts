/**
 * The floor: one take's real-time arena as a pure state step.
 *
 * `stepArena(state, input, mods, dt)` is the only thing that moves a take. The take
 * module's tick and the probes call it identically, so a probe measures the game and not a
 * re-implementation. Real-time positioning and collision are consumer-side by the engine's
 * design (`docs/api/INDEX.md` § Task → API tier, "Deliberately absent"); this is not a
 * bypass.
 *
 * The defining mechanic is in `fireRigs`: every rig fires on its own clock, and the only
 * input is a movement vector. Position, and the heading movement leaves behind, is the
 * whole aim.
 */
import { weightedPick } from '@open-loop/engine';
import {
  ANCHORS,
  CAST,
  CONE_HALF_ANGLE,
  SCRIPT,
  LEVEL_GAIN,
  MARK_KILLS,
  RATING_DEPTH,
  RIG_BY_ID,
  arrivalRate,
  contactDps,
  eligibleExtras,
  extraHp,
  rivalHp,
  rivalJackpot,
  EXTRAS,
  leadHp,
  RATING_GUESTS,
  RATING_SET_PIECES,
  orbitCount,
  rigBaseDamage,
  sceneAt,
  type ExtraKind,
  type GuestId,
  type SetPieceId,
  type RigDef,
  type RigId,
} from '../../data';

// ─── Geometry ───────────────────────────────────────────────────────────────

/** Half-width of the square soundstage. */
export const WORLD_HALF = 1300;
export const PLAYER_RADIUS = 12;
/** Base walking speed, world units per second. */
export const BASE_SPEED = 150;
/** Base reel pickup reach. */
export const BASE_PICKUP = 60;
/** Arrivals appear in this ring around the double: off-camera, but never far. */
export const SPAWN_RING = [ANCHORS.spawnRadius - 50, ANCHORS.spawnRadius + 50] as const;
/** A floor this crowded admits nobody new — a frame-rate guard, not a design cap. */
export const MAX_EXTRAS = 1000;
/** Share of arrivals cast into the arc ahead of a moving double — running
 *  away runs into the next wave instead of out of the scene. */
export const AHEAD_SHARE = 0.4;
const AHEAD_HALF_ARC = 1.05;
/** The shot: a drifting camera frame. Kills inside it pay shotMult. */
export const SHOT_RADIUS = 150;
const SHOT_ORBIT = 240;
const SHOT_DRIFT_SPEED = 55;
const SHOT_SWING = 0.13;
const REEL_PULL_SPEED = 430;
const REEL_COLLECT = 14;
const ORBIT_SPIN = 3.2;
const ORBIT_BOTTLE_RADIUS = 9;
/** Still means slower than this; the Dolly Rifle's bonus reads it. */
export const STILL_SPEED = 4;

// ─── State ──────────────────────────────────────────────────────────────────

export interface Extra {
  id: number;
  kind: ExtraKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  /** Seconds until breakaway bottles may hit this extra again. */
  orbitCd: number;
  /** Seconds of hit flash left, for the renderer. */
  flash: number;
  /** A staged body's part in the script; absent for the crowd. */
  role?: 'lead' | 'rival' | 'strike-crew';
  /** A set piece's fixed velocity: it marches across the set instead of closing on the double. */
  march?: { x: number; y: number };
  /** Seconds before it leaves the set without dropping a reel. */
  life?: number;
  /** Reels a rival drops when downed before it leaves. */
  jackpot?: number;
}

export interface Reel {
  x: number;
  y: number;
  value: number;
  gold: boolean;
  pulled: boolean;
}

export interface RigSlot {
  def: RigDef;
  level: number;
  /** Seconds until ready; held at 0 while no target qualifies. */
  cd: number;
}

export type Fx =
  | {
      kind: 'tracer';
      x: number;
      y: number;
      x2: number;
      y2: number;
      heavy: boolean;
      life: number;
      max: number;
    }
  | { kind: 'ring'; x: number; y: number; r: number; life: number; max: number }
  | { kind: 'cone'; x: number; y: number; r: number; angle: number; life: number; max: number }
  | { kind: 'pop'; x: number; y: number; gold: boolean; life: number; max: number };

export interface ArenaStats {
  kills: number;
  reelsDropped: number;
  reelsBanked: number;
  inShotKills: number;
  damageTaken: number;
  /** Seconds spent with at least one extra in contact. */
  contactSeconds: number;
  peakExtras: number;
  /** Rivals downed before their scene ended, and those that walked. */
  jackpots: number;
  rivalsWalked: number;
  /** Extras the MAX_EXTRAS guard turned away. */
  turnedAway: number;
  spawned: number;
}

/** In the can when the lead falls; a wipeout; or struck when the strike crew reaches the double. */
/** A chalk mark on the set: kills inside it fill it, and a filled mark cuts the lead's part. */
export interface Mark {
  x: number;
  y: number;
  kills: number;
  filled: boolean;
  /** Take seconds at which it filled; null while open. */
  filledAt: number | null;
}

/** A staged moment rolled for this take: a set piece or a guest star, and when it plays. */
export interface Cue {
  at: number;
  what: SetPieceId | GuestId;
  played: boolean;
}

export type TakeEnd = 'cut' | 'wipeout' | 'struck';

export interface ArenaState {
  t: number;
  rating: number;
  rng: () => number;
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    facing: number;
    speed: number;
    hurt: number;
  };
  extras: Extra[];
  reels: Reel[];
  rigs: RigSlot[];
  fx: Fx[];
  shot: { x: number; y: number };
  spawnAcc: number;
  nextId: number;
  /** The lead once it has walked on, with the hp it walked on with. */
  lead: Extra | null;
  leadHp0: number;
  /** Strike-crew members on set. */
  strikeCrew: number;
  /** The rival on set, until it is downed or walks. */
  rival: Extra | null;
  marks: Mark[];
  cues: Cue[];
  stats: ArenaStats;
  ended: TakeEnd | null;
}

/** Desired movement, each axis in [-1, 1]. The player's only input. */
export interface ArenaInput {
  mx: number;
  my: number;
}

/** Multipliers the engine's chains resolve each tick. */
export interface ArenaMods {
  damage: number;
  fireRate: number;
  moveSpeed: number;
  pickup: number;
  maxHp: number;
  /** Scale on contact damage — a tuning knob, never derived. */
  contact: number;
}

export function createArena(opts: {
  rng: () => number;
  rating: number;
  startRig: RigId;
  maxHp: number;
}): ArenaState {
  return {
    t: 0,
    rating: opts.rating,
    rng: opts.rng,
    player: { x: 0, y: 0, hp: opts.maxHp, maxHp: opts.maxHp, facing: 0, speed: 0, hurt: 0 },
    extras: [],
    reels: [],
    rigs: [{ def: RIG_BY_ID[opts.startRig], level: 1, cd: 0.5 }],
    fx: [],
    shot: { x: SHOT_ORBIT, y: 0 },
    spawnAcc: 0,
    nextId: 1,
    lead: null,
    leadHp0: 0,
    strikeCrew: 0,
    rival: null,
    marks: rollMarks(opts.rng),
    cues: rollCues(opts.rng, opts.rating),
    stats: {
      kills: 0,
      reelsDropped: 0,
      reelsBanked: 0,
      inShotKills: 0,
      damageTaken: 0,
      contactSeconds: 0,
      peakExtras: 0,
      turnedAway: 0,
      jackpots: 0,
      rivalsWalked: 0,
      spawned: 0,
    },
    ended: null,
  };
}

/** Marks at rolled spots on the floor, apart from each other. */
function rollMarks(rng: () => number): Mark[] {
  const out: Mark[] = [];
  const [lo, hi] = SCRIPT.markDistance;
  const base = rng() * Math.PI * 2;
  for (let i = 0; i < SCRIPT.marks; i++) {
    const a = base + (i * Math.PI * 2) / SCRIPT.marks + (rng() - 0.5) * 0.8;
    const r = lo + rng() * (hi - lo);
    out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, kills: 0, filled: false, filledAt: null });
  }
  return out;
}

/**
 * The take's cues: the rating's set pieces and its guest events, each in its own minute
 * window before the climax, at a rolled second inside it, from the script's first minutes.
 */
function rollCues(rng: () => number, rating: number): Cue[] {
  const minutes = Math.floor(ANCHORS.takeSeconds / ANCHORS.sceneSeconds);
  const draw = (from: number, n: number): number[] => {
    const pool = Array.from({ length: minutes - from }, (_, i) => from + i);
    const out: number[] = [];
    for (let i = 0; i < n && pool.length; i++)
      out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]!);
    return out;
  };
  const at = (minute: number) => (minute + 0.1 + rng() * 0.5) * ANCHORS.sceneSeconds;
  const cues: Cue[] = [];
  const pieces = RATING_SET_PIECES[rating]!;
  draw(SCRIPT.setPieceFrom, pieces.length).forEach((m, i) =>
    cues.push({ at: at(m), what: pieces[i]!, played: false }),
  );
  for (const m of draw(SCRIPT.guestFrom, RATING_GUESTS[rating]!))
    cues.push({ at: at(m), what: rng() < SCRIPT.rivalShare ? 'rival' : 'mob', played: false });
  return cues.sort((a, b) => a.at - b.at);
}

export function currentScene(s: ArenaState): number {
  return sceneAt(s.t, RATING_DEPTH[s.rating]);
}

// ─── Step ───────────────────────────────────────────────────────────────────

/** Advance the floor by dt. Returns the reel value banked this step. */
export function stepArena(s: ArenaState, input: ArenaInput, mods: ArenaMods, dt: number): number {
  if (s.ended) return 0;
  s.t += dt;
  const scene = currentScene(s);

  syncMaxHp(s, mods.maxHp);
  movePlayer(s, input, mods.moveSpeed, dt);
  moveShot(s, dt);
  spawnExtras(s, scene, dt);
  stageScript(s, scene);
  moveExtras(s, dt);
  const struck = resolveContact(s, scene, mods.contact, dt);
  fireRigs(s, mods, dt);
  const banked = collectReels(s, mods.pickup, dt);
  ageFx(s, dt);

  s.stats.peakExtras = Math.max(s.stats.peakExtras, s.extras.length);
  if (s.player.hp <= 0) s.ended = struck ? 'struck' : 'wipeout';
  else if (s.lead && s.lead.hp <= 0) s.ended = 'cut';
  return banked;
}

/** A stamina page or padding raises max health; the raise arrives as health. */
function syncMaxHp(s: ArenaState, maxHp: number): void {
  if (maxHp !== s.player.maxHp) {
    if (maxHp > s.player.maxHp) s.player.hp += maxHp - s.player.maxHp;
    s.player.maxHp = maxHp;
    s.player.hp = Math.min(s.player.hp, maxHp);
  }
}

function movePlayer(s: ArenaState, input: ArenaInput, speedMult: number, dt: number): void {
  const p = s.player;
  let { mx, my } = input;
  // Input is the boundary: a non-finite vector would poison every position.
  if (!Number.isFinite(mx) || !Number.isFinite(my)) mx = my = 0;
  const len = hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }
  const speed = BASE_SPEED * speedMult;
  p.x = clamp(p.x + mx * speed * dt, -WORLD_HALF, WORLD_HALF);
  p.y = clamp(p.y + my * speed * dt, -WORLD_HALF, WORLD_HALF);
  p.speed = Math.min(len, 1) * speed;
  if (len > 0.05) p.facing = Math.atan2(my, mx);
  p.hurt = Math.max(0, p.hurt - dt);
}

/** The camera dollies round the double on a slow swing, so the shot is always
 *  reachable and never where you are standing for long. */
function moveShot(s: ArenaState, dt: number): void {
  const a = s.t * SHOT_SWING;
  const tx = clamp(s.player.x + Math.cos(a) * SHOT_ORBIT, -WORLD_HALF, WORLD_HALF);
  const ty = clamp(s.player.y + Math.sin(a) * SHOT_ORBIT, -WORLD_HALF, WORLD_HALF);
  const dx = tx - s.shot.x;
  const dy = ty - s.shot.y;
  const d = hypot(dx, dy);
  const step = SHOT_DRIFT_SPEED * dt * (d > 300 ? 3 : 1);
  if (d > step) {
    s.shot.x += (dx / d) * step;
    s.shot.y += (dy / d) * step;
  } else {
    s.shot.x = tx;
    s.shot.y = ty;
  }
}

function spawnExtras(s: ArenaState, scene: number, dt: number): void {
  s.spawnAcc += arrivalRate(scene) * dt;
  const kinds = eligibleExtras(scene).map((k) => ({ item: k, weight: k.weight }));
  while (s.spawnAcc >= 1) {
    if (s.extras.length >= MAX_EXTRAS) {
      const away = Math.floor(s.spawnAcc);
      s.stats.turnedAway += away;
      s.spawnAcc -= away;
      break;
    }
    s.spawnAcc -= 1;
    const kind = weightedPick(kinds, s.rng)!;
    const ahead = s.player.speed > STILL_SPEED && s.rng() < AHEAD_SHARE;
    const angle = ahead
      ? s.player.facing + (s.rng() * 2 - 1) * AHEAD_HALF_ARC
      : s.rng() * Math.PI * 2;
    const r = SPAWN_RING[0] + s.rng() * (SPAWN_RING[1] - SPAWN_RING[0]);
    const hp = extraHp(scene) * kind.hpFactor;
    s.extras.push({
      id: s.nextId++,
      kind,
      x: clamp(s.player.x + Math.cos(angle) * r, -WORLD_HALF, WORLD_HALF),
      y: clamp(s.player.y + Math.sin(angle) * r, -WORLD_HALF, WORLD_HALF),
      hp,
      maxHp: hp,
      orbitCd: 0,
      flash: 0,
    });
    s.stats.spawned++;
  }
}

function crowdBody(s: ArenaState, kind: ExtraKind, scene: number, x: number, y: number): Extra {
  const hp = extraHp(scene) * kind.hpFactor;
  const e: Extra = { id: s.nextId++, kind, x, y, hp, maxHp: hp, orbitCd: 0, flash: 0 };
  s.extras.push(e);
  s.stats.spawned++;
  return e;
}

const KIND = Object.fromEntries(EXTRAS.map((k) => [k.id, k])) as Record<ExtraKind['id'], ExtraKind>;

/** Stages one cue around where the double stands now. */
function playCue(s: ArenaState, what: Cue['what'], scene: number): void {
  const p = s.player;
  const from = s.rng() * Math.PI * 2;
  const ux = Math.cos(from);
  const uy = Math.sin(from);
  const R = ANCHORS.spawnRadius;
  switch (what) {
    case 'stampede': {
      // A column three abreast, aimed through where the double stands.
      const v = SCRIPT.stampedeSpeed;
      const life = (2 * R + SCRIPT.stampedeBodies * 10) / v;
      for (let i = 0; i < SCRIPT.stampedeBodies; i++) {
        const lane = (i % 3) - 1;
        const back = Math.floor(i / 3) * 30;
        const e = crowdBody(
          s,
          KIND.biker,
          scene,
          p.x + ux * (R + back) - uy * lane * 26,
          p.y + uy * (R + back) + ux * lane * 26,
        );
        e.march = { x: -ux * v, y: -uy * v };
        e.life = life;
      }
      return;
    }
    case 'wall': {
      // A line across the set with one gap, sweeping through where the double stands.
      const v = SCRIPT.wallSpeed;
      const gapAt = (s.rng() * 2 - 1) * 250;
      const life = (2 * R) / v;
      for (let o = -SCRIPT.wallHalfWidth; o <= SCRIPT.wallHalfWidth; o += SCRIPT.wallSpacing) {
        if (Math.abs(o - gapAt) < SCRIPT.wallGap / 2) continue;
        const e = crowdBody(s, KIND.grunt, scene, p.x + ux * R - uy * o, p.y + uy * R + ux * o);
        e.march = { x: -ux * v, y: -uy * v };
        e.life = life;
      }
      return;
    }
    case 'ring': {
      const n = Math.round((2 * Math.PI * SCRIPT.ringRadius) / SCRIPT.ringSpacing);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        crowdBody(
          s,
          KIND.grunt,
          scene,
          p.x + Math.cos(a) * SCRIPT.ringRadius,
          p.y + Math.sin(a) * SCRIPT.ringRadius,
        );
      }
      return;
    }
    case 'mob': {
      const n = Math.round(SCRIPT.mobSeconds * arrivalRate(scene));
      const kinds = eligibleExtras(scene).map((k) => ({ item: k, weight: k.weight }));
      for (let i = 0; i < n; i++) {
        const a = from + (s.rng() * 2 - 1) * 0.6;
        const r = SPAWN_RING[0] + s.rng() * (SPAWN_RING[1] - SPAWN_RING[0]);
        crowdBody(
          s,
          weightedPick(kinds, s.rng)!,
          scene,
          p.x + Math.cos(a) * r,
          p.y + Math.sin(a) * r,
        );
      }
      return;
    }
    case 'rival': {
      const e = castOnRing(s, 'rival', rivalHp(scene));
      e.life = (Math.floor(s.t / ANCHORS.sceneSeconds) + 1) * ANCHORS.sceneSeconds - s.t;
      e.jackpot = rivalJackpot(scene);
      s.rival = e;
      return;
    }
  }
}

/** Casts a staged body on the spawn ring around the double. */
function castOnRing(s: ArenaState, role: NonNullable<Extra['role']>, hp: number): Extra {
  const angle = s.rng() * Math.PI * 2;
  const r = SPAWN_RING[0] + s.rng() * (SPAWN_RING[1] - SPAWN_RING[0]);
  const e: Extra = {
    id: s.nextId++,
    kind: CAST[role],
    x: clamp(s.player.x + Math.cos(angle) * r, -WORLD_HALF, WORLD_HALF),
    y: clamp(s.player.y + Math.sin(angle) * r, -WORLD_HALF, WORLD_HALF),
    hp,
    maxHp: hp,
    orbitCd: 0,
    flash: 0,
    role,
  };
  s.extras.push(e);
  return e;
}

/** The climax: the set clears and the lead walks on; past the strike call the strike crew follows. */
function stageScript(s: ArenaState, scene: number): void {
  for (const cue of s.cues) {
    if (cue.played || s.t < cue.at) continue;
    cue.played = true;
    playCue(s, cue.what, scene);
  }
  if (!s.lead && s.t >= ANCHORS.takeSeconds) {
    // The set clears for the lead's entrance: the crowd walks off without reels, and the
    // arrivals start again around the duel.
    s.extras = [];
    s.spawnAcc = 0;
    s.leadHp0 = leadHp(s.rating);
    const filled = s.marks.filter((m) => m.filled).length;
    s.lead = castOnRing(s, 'lead', s.leadHp0 * (1 - SCRIPT.markCut * filled));
  }
  const strikeAt = ANCHORS.takeSeconds + SCRIPT.strikeAfter * ANCHORS.sceneSeconds;
  if (s.t >= strikeAt + s.strikeCrew * SCRIPT.strikeEvery) {
    castOnRing(s, 'strike-crew', Infinity);
    s.strikeCrew++;
  }
}

// The shoulder grid: bodies bucketed into 40-unit cells as index lists threaded through one
// array, rebuilt each step. It spans the floor plus a margin for set pieces marching off it;
// a body beyond the margin buckets into the edge cell, which only costs it a few distance
// checks.
const SHOULDER_CELL = 40;
const SHOULDER_SPAN = Math.ceil((WORLD_HALF + 1000) / SHOULDER_CELL) * SHOULDER_CELL;
const SHOULDER_COLS = Math.ceil((2 * SHOULDER_SPAN) / SHOULDER_CELL);
const shoulderHead = new Int32Array(SHOULDER_COLS * SHOULDER_COLS);
let shoulderNext = new Int32Array(1024);
// Positions and radii mirrored into flat arrays: the neighbour loop is the step's hot path.
let shoulderX = new Float64Array(1024);
let shoulderY = new Float64Array(1024);
let shoulderR = new Float64Array(1024);

function shoulderCell(v: number): number {
  const c = Math.floor((v + SHOULDER_SPAN) / SHOULDER_CELL);
  return c < 0 ? 0 : c >= SHOULDER_COLS ? SHOULDER_COLS - 1 : c;
}

/** Extras close on the double and shoulder each other apart (bucketed). */
function moveExtras(s: ArenaState, dt: number): void {
  const p = s.player;
  const xs = s.extras;
  const n = xs.length;
  if (shoulderNext.length < n) {
    shoulderNext = new Int32Array(n * 2);
    shoulderX = new Float64Array(n * 2);
    shoulderY = new Float64Array(n * 2);
    shoulderR = new Float64Array(n * 2);
  }
  const bx = shoulderX;
  const by = shoulderY;
  const br = shoulderR;
  shoulderHead.fill(-1);
  // Threaded back to front, so each cell lists its bodies in floor order.
  for (let i = n - 1; i >= 0; i--) {
    const e = xs[i]!;
    bx[i] = e.x;
    by[i] = e.y;
    br[i] = e.kind.radius;
    const c = shoulderCell(e.y) * SHOULDER_COLS + shoulderCell(e.x);
    shoulderNext[i] = shoulderHead[c]!;
    shoulderHead[c] = i;
  }
  let left = false;
  for (let i = 0; i < n; i++) {
    const e = xs[i]!;
    if (e.life !== undefined) {
      e.life -= dt;
      if (e.life <= 0) left = true;
    }
    if (e.march) {
      e.x += e.march.x * dt;
      e.y += e.march.y * dt;
      bx[i] = e.x;
      by[i] = e.y;
      e.orbitCd = Math.max(0, e.orbitCd - dt);
      e.flash = Math.max(0, e.flash - dt);
      continue;
    }
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = hypot(dx, dy) || 1;
    let vx = (dx / d) * e.kind.speed;
    let vy = (dy / d) * e.kind.speed;
    const ex = e.x;
    const ey = e.y;
    const er = br[i]!;
    const cx = shoulderCell(ex);
    const cy = shoulderCell(ey);
    for (let ox = -1; ox <= 1; ox++) {
      const x = cx + ox;
      if (x < 0 || x >= SHOULDER_COLS) continue;
      for (let oy = -1; oy <= 1; oy++) {
        const y = cy + oy;
        if (y < 0 || y >= SHOULDER_COLS) continue;
        for (let j = shoulderHead[y * SHOULDER_COLS + x]!; j >= 0; j = shoulderNext[j]!) {
          if (j === i) continue;
          const sx = ex - bx[j]!;
          const sy = ey - by[j]!;
          const sd2 = sx * sx + sy * sy;
          const min = er + br[j]!;
          if (sd2 > 0 && sd2 < min * min) {
            const sd = Math.sqrt(sd2);
            const push = ((min - sd) / min) * 90;
            vx += (sx / sd) * push;
            vy += (sy / sd) * push;
          }
        }
      }
    }
    e.x += vx * dt;
    e.y += vy * dt;
    bx[i] = e.x;
    by[i] = e.y;
    e.orbitCd = Math.max(0, e.orbitCd - dt);
    e.flash = Math.max(0, e.flash - dt);
  }
  if (left) {
    s.extras = s.extras.filter((e) => {
      if (e.life === undefined || e.life > 0 || e.hp <= 0) return true;
      if (e.role === 'rival') {
        s.stats.rivalsWalked++;
        s.rival = null;
      }
      return false;
    });
  }
}

/** Presses touching bodies against the double and deals their contact. True when the strike crew touched. */
function resolveContact(s: ArenaState, scene: number, contactScale: number, dt: number): boolean {
  const p = s.player;
  let touching = 0;
  let struck = false;
  for (const e of s.extras) {
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const d = hypot(dx, dy) || 1;
    const min = contactRange(e);
    if (d < min) {
      if (e.role === 'strike-crew') struck = true;
      else touching += e.kind.contact ?? 1;
      // Bodies don't overlap the double; they press against it.
      e.x = p.x + (dx / d) * min;
      e.y = p.y + (dy / d) * min;
    }
  }
  if (touching > 0) {
    const dmg = contactDps(scene) * contactScale * touching * dt;
    p.hp -= dmg;
    p.hurt = 0.15;
    s.stats.damageTaken += dmg;
    s.stats.contactSeconds += dt;
  }
  if (struck) p.hp = 0;
  return struck;
}

// ─── Fire: automatic, positioning-only ──────────────────────────────────────

// TODO(expansion): cooldown dispatch over a def set (candidate-primitives.md). Each rig's
// clock runs down, holds at ready while nothing qualifies, and fires on the first tick
// something does. createTimedProgress owns its ref and ticks itself, so it cannot live here.
function fireRigs(s: ArenaState, mods: ArenaMods, dt: number): void {
  const still = s.player.speed < STILL_SPEED;
  for (const slot of s.rigs) {
    const dmg = rigBaseDamage(slot.def) * LEVEL_GAIN ** (slot.level - 1) * mods.damage;
    if (slot.def.shape === 'orbit') {
      orbitHits(s, slot, dmg);
      continue;
    }
    const rate = mods.fireRate * (still ? slot.def.stillBonus : 1);
    slot.cd -= dt * rate;
    if (slot.cd > 0) continue;
    if (activate(s, slot, dmg)) slot.cd += slot.def.cooldown;
    else slot.cd = 0;
  }
  if (s.extras.some((e) => e.hp <= 0)) reapExtras(s);
}

/** One activation. False when nothing qualifies, so the rig holds ready. */
function activate(s: ArenaState, slot: RigSlot, dmg: number): boolean {
  const p = s.player;
  const reach = slot.def.reach;
  switch (slot.def.shape) {
    case 'nearest': {
      const t = pickExtra(s, reach, (_e, d) => -d);
      if (!t) return false;
      hit(t, dmg);
      s.fx.push({
        kind: 'tracer',
        x: p.x,
        y: p.y,
        x2: t.x,
        y2: t.y,
        heavy: false,
        life: 0.08,
        max: 0.08,
      });
      return true;
    }
    case 'heaviest': {
      const t = pickExtra(s, reach, (e) => e.hp);
      if (!t) return false;
      hit(t, dmg);
      s.fx.push({
        kind: 'tracer',
        x: p.x,
        y: p.y,
        x2: t.x,
        y2: t.y,
        heavy: true,
        life: 0.18,
        max: 0.18,
      });
      return true;
    }
    case 'ring': {
      const inRing = s.extras.filter((e) => dist(e, p) <= reach + e.kind.radius);
      if (inRing.length === 0) return false;
      for (const e of inRing) hit(e, dmg);
      s.fx.push({ kind: 'ring', x: p.x, y: p.y, r: reach, life: 0.3, max: 0.3 });
      return true;
    }
    case 'heading-cone': {
      const caught = inCone(s.extras, p, p.facing, reach);
      if (caught.length === 0) return false;
      for (const e of caught) hit(e, dmg);
      s.fx.push({ kind: 'cone', x: p.x, y: p.y, r: reach, angle: p.facing, life: 0.35, max: 0.35 });
      return true;
    }
    default:
      return false;
  }
}

/**
 * The extras a cone from `from` along `facing` catches. The Pyro Gag fires through it, and
 * the steering policy scores candidate headings through `coneBearings` and `inArc`, the
 * same test split in two, so the two cannot disagree.
 */
export function inCone(
  extras: readonly Extra[],
  from: { x: number; y: number },
  facing: number,
  reach: number,
): Extra[] {
  return extras.filter((e) => {
    const d = dist(e, from);
    if (d > reach + e.kind.radius) return false;
    return inArc(Math.atan2(e.y - from.y, e.x - from.x), facing);
  });
}

/** Bearings from `from` of the extras inside a cone's reach, for testing many facings. */
export function coneBearings(
  extras: readonly Extra[],
  from: { x: number; y: number },
  reach: number,
): number[] {
  const out: number[] = [];
  for (const e of extras)
    if (dist(e, from) <= reach + e.kind.radius) out.push(Math.atan2(e.y - from.y, e.x - from.x));
  return out;
}

/** Whether a bearing lies inside the cone along `facing`. */
export function inArc(bearing: number, facing: number): boolean {
  return Math.abs(angleDiff(bearing, facing)) <= CONE_HALF_ANGLE;
}

/** Distance at which an extra touches the double. */
export function contactRange(e: Extra): number {
  return e.kind.radius + PLAYER_RADIUS;
}

/** Bottle positions for a breakaway slot — shared with the renderer. */
export function orbitBottles(s: ArenaState, slot: RigSlot): { x: number; y: number }[] {
  const n = orbitCount(slot.level);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = s.t * ORBIT_SPIN + (i * Math.PI * 2) / n;
    out.push({
      x: s.player.x + Math.cos(a) * slot.def.reach,
      y: s.player.y + Math.sin(a) * slot.def.reach,
    });
  }
  return out;
}

function orbitHits(s: ArenaState, slot: RigSlot, dmg: number): void {
  const bottles = orbitBottles(s, slot);
  for (const e of s.extras) {
    if (e.orbitCd > 0) continue;
    for (const b of bottles) {
      if (dist(e, b) < e.kind.radius + ORBIT_BOTTLE_RADIUS) {
        hit(e, dmg);
        e.orbitCd = slot.def.cooldown;
        break;
      }
    }
  }
}

/**
 * The target a single-target rig fires on. The crew plays to the cast: a staged body in
 * reach is taken before the crowd, and the score ranks the rest.
 */
function pickExtra(
  s: ArenaState,
  reach: number,
  score: (e: Extra, d: number) => number,
): Extra | null {
  if (s.lead && s.lead.hp > 0 && dist(s.lead, s.player) <= reach) return s.lead;
  let best: Extra | null = null;
  let bestScore = -Infinity;
  for (const e of s.extras) {
    if (e.hp <= 0 || e.role === 'strike-crew') continue;
    const d = dist(e, s.player);
    if (d > reach) continue;
    if (e.role === 'rival') return e;
    const sc = score(e, d);
    if (sc > bestScore) {
      bestScore = sc;
      best = e;
    }
  }
  return best;
}

function hit(e: Extra, dmg: number): void {
  if (e.role === 'strike-crew') return;
  e.hp -= dmg;
  e.flash = 0.1;
}

/** The dead drop reels where they fell; inside the shot, the reel is gold. */
function reapExtras(s: ArenaState): void {
  const survivors: Extra[] = [];
  for (const e of s.extras) {
    if (e.hp > 0) {
      survivors.push(e);
      continue;
    }
    if (e.role === 'lead') {
      s.fx.push({ kind: 'pop', x: e.x, y: e.y, gold: true, life: 0.25, max: 0.25 });
      s.stats.kills++;
      continue;
    }
    if (e.role === 'rival') {
      s.reels.push({ x: e.x, y: e.y, value: e.jackpot ?? 0, gold: true, pulled: false });
      s.fx.push({ kind: 'pop', x: e.x, y: e.y, gold: true, life: 0.25, max: 0.25 });
      s.stats.kills++;
      s.stats.jackpots++;
      s.rival = null;
      s.stats.reelsDropped += e.jackpot ?? 0;
      continue;
    }
    chalk(s, e);
    const inShot = dist(e, s.shot) <= SHOT_RADIUS;
    const value = e.kind.hpFactor * (inShot ? ANCHORS.shotMult : 1);
    s.reels.push({ x: e.x, y: e.y, value, gold: inShot, pulled: false });
    s.fx.push({ kind: 'pop', x: e.x, y: e.y, gold: inShot, life: 0.25, max: 0.25 });
    s.stats.kills++;
    s.stats.reelsDropped += value;
    if (inShot) s.stats.inShotKills++;
  }
  s.extras = survivors;
}

/** A kill inside an open mark counts toward it; a mark that fills cuts the lead's part. */
function chalk(s: ArenaState, e: Extra): void {
  for (const m of s.marks) {
    if (m.filled || dist(e, m) > SCRIPT.markRadius) continue;
    if (++m.kills < MARK_KILLS) return;
    m.filled = true;
    m.filledAt = s.t;
    if (s.lead) s.lead.hp -= SCRIPT.markCut * s.leadHp0;
    return;
  }
}

/** Reels inside pickup reach fly to the double. Reels never expire. */
function collectReels(s: ArenaState, pickupMult: number, dt: number): number {
  const p = s.player;
  const reach = BASE_PICKUP * pickupMult;
  let banked = 0;
  const left: Reel[] = [];
  for (const r of s.reels) {
    const d = dist(r, p);
    if (!r.pulled && d <= reach) r.pulled = true;
    if (r.pulled) {
      if (d <= REEL_COLLECT) {
        banked += r.value;
        continue;
      }
      const step = Math.min(d, REEL_PULL_SPEED * dt);
      r.x += ((p.x - r.x) / d) * step;
      r.y += ((p.y - r.y) / d) * step;
    }
    left.push(r);
  }
  s.reels = left;
  s.stats.reelsBanked += banked;
  return banked;
}

function ageFx(s: ArenaState, dt: number): void {
  for (const f of s.fx) f.life -= dt;
  s.fx = s.fx.filter((f) => f.life > 0);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return hypot(a.x - b.x, a.y - b.y);
}

function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Math.hypot is several times slower in V8 and nothing here needs its overflow guard. */
function hypot(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

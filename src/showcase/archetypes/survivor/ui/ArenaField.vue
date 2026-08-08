<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';
import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { useModule } from '@/composables/useModule';
import { ArenaKey } from '../modules/arena';
import { ARENA_BALANCE } from '../data/arena';
import { DEVICES } from '../data/devices';
import type { ArenaState } from '../modules/sim/types';

/**
 * The arena field — a read-only projection of the arena sim onto a pixi/webgl
 * surface. It OWNS its frame loop (pixi's ticker → RAF) and reads the sim's
 * `shallowRef` as a plain value each frame, so rendering runs decoupled from
 * both Vue's reactive re-render and the fixed-step engine tick. It never writes
 * sim state.
 *
 * Pixi objects live in plain `let`s, never Vue refs — a reactive proxy corrupts
 * pixi's internal bookkeeping.
 *
 * ─── Third receipt on the pixi-field-projection recipe ───
 *
 * `/work/studio/candidate-recipes-ui.md` carries this shape at N=2 (skirmish,
 * primordial) with cadence-versus-smoothing as its open question: skirmish eases
 * exponentially toward truth and is fine at 20 Hz; primordial snapshots
 * prev+curr per step and tweens at the intra-step blend factor because at 4 Hz
 * easing reads as lag. This arena steps at 20 Hz too and it takes NEITHER branch
 * — see § Smoothing, which is where the recipe's open question gets its real
 * discriminator.
 *
 * Two divergences from the prior two receipts, both structural rather than
 * stylistic, and both worth carrying into the dive:
 *
 * 1. **The camera scrolls.** Skirmish and primordial fit a whole bounded field
 *    into the canvas, so their world container carries a static fit. Here the
 *    map is 8000 × 5200 against a screenful-sized view, so the world container
 *    carries a *moving* camera offset instead. The recipe's "one container owns
 *    the fit + unit scale so nothing else does math" still holds — it just owns
 *    a camera rather than a fit. A moving camera also breaks both stock fit
 *    rules: see `resize`.
 * 2. **Two entity populations with different lifetimes.** Specimens are capped
 *    (`entityBudget`) and keyed by id like skirmish's units. Motes are NOT
 *    despawned by the sim — only collected — so an unbanked mote persists for
 *    the whole run and the population grows unbounded across an 8000 × 5200
 *    floor. They render from a viewport-culled sprite pool rather than a
 *    per-entity sprite map, which is the part of this recipe the prior two
 *    receipts never needed.
 */

const arena = useModule(ArenaKey);
const host = useTemplateRef<HTMLDivElement>('host');
const wash = useTemplateRef<HTMLDivElement>('wash');

/**
 * The design view, in sim units — a screenful, not a hard crop. `resize` matches
 * its AREA rather than either axis, so the amount of floor on screen (and with it
 * the apparent size of a body) is the same on a square host and a 3:1 one.
 *
 * Sized against what the sim actually simulates rather than against the operator.
 * Specimens live out to 1.4 × the spawn annulus — 1064 units — and are culled
 * beyond it, so a view of 1000 × 560 showed a quarter of the live population at
 * best: the HUD read "399 on the floor" over a field with a dozen dots on it, and
 * the escalation the whole archetype is about never appeared on screen.
 *
 * The cost is that spawns now happen INSIDE the view instead of just outside it,
 * which is what `data/arena.ts` § Why the annulus assumed. Paid for in the
 * renderer rather than in the geometry — see `SPAWN_FADE_SECONDS`.
 */
const VIEW_WIDTH = 1600;
const VIEW_HEIGHT = 900;

/** How long a new specimen takes to fade up, in seconds. Long enough that a body
 *  appearing inside the view coalesces rather than pops. */
const SPAWN_FADE_SECONDS = 0.5;

/**
 * ─── Smoothing: dead reckoning, not easing ───
 *
 * Every rendered body carries a velocity measured off the last two sim samples
 * and INTEGRATES it at frame rate; the sim sample is used to correct the
 * accumulated error, not to supply the motion. So the render position is
 * `∫v dt` with a decaying error term rather than a chase toward a value that
 * only moves 20 times a second.
 *
 * Easing was the wrong branch here, and the reason is not the cadence. An
 * exponential chase has a time constant (`1/k`); when that is anywhere near the
 * step interval, the render velocity ripples WITHIN each step — fast just after
 * a sample lands, slow just before the next — and 20 samples a second means 20
 * of those ripples a second. Skirmish gets away with it because nothing it eases
 * is load-bearing for motion perception: a static fit, no camera, no hand on the
 * keys. Here the eased value drove the CAMERA, so the ripple was applied to the
 * whole floor at once, and a player pressing D felt the world breathe rather
 * than scroll.
 *
 * The discriminator the recipe's open question actually wants is therefore not
 * "how fast does the sim step" but **what does the smoothed value drive** — a
 * decoration, or the camera and the body the player is steering. Dead reckoning
 * costs one extra vector per entity and is correct at any cadence.
 *
 * Measured on one WASD walk, both filters replayed over the same sim trace, as
 * frame-to-frame camera speed against a 120 u/s walk: the old chase ran a 15.3%
 * coefficient of variation (sd 17.9, p05–p95 98–138 u/s), dead reckoning runs
 * 2.5% (sd 3.0, p05–p95 115–127). Six times less ripple, and the residual is
 * frame-pacing rather than the filter.
 */
/** Rate (1/s) at which accumulated prediction error is pulled out. It corrects
 *  error only — motion comes from the integrated velocity — so there is no
 *  steady-state lag to trade against, unlike an easing constant. */
const CORRECTION = 12;
/**
 * Cap on how far ahead of the last sim sample a body may be predicted, in real
 * seconds. The floor genuinely stops — a pending draft holds it (`../modules/run.ts`),
 * and a background tab throttles the tick — and unbounded prediction would walk
 * four hundred bodies off the map while nothing was simulating.
 */
const MAX_LEAD = 0.12;
/**
 * Sample-to-sample distance above which a body is treated as having been placed
 * rather than having moved: a fresh run recentres the operator, and a splitter's
 * fragments appear beside a corpse. Deriving a velocity from those puts a body
 * on a trajectory it was never on.
 */
const TELEPORT = 400;

/** How long a device-discharge flash stays on screen, in seconds. */
const FLASH_SECONDS = 0.18;

/**
 * Specimen silhouettes.
 *
 * Colour and size alone did not separate the tiers: five soft dots in five
 * greens, at three sizes, over a dark floor, read as one substance at any
 * density that matters. So each tier gets a SHAPE, which is the channel that
 * survives both the squint and the 400-body census — and the shape says what the
 * thing does. A splitter is drawn hollow because it is about to become four
 * things; a warden is spiked because it is the one you do not walk through.
 */
const TIER_STYLE: Record<string, { color: number; radius: number; shape: SpecimenShape }> = {
  'mote-fly': { color: 0x8ee89f, radius: 9, shape: 'dot' },
  crawler: { color: 0x459d5b, radius: 14, shape: 'blob' },
  splitter: { color: 0xbdf05a, radius: 12, shape: 'hollow' },
  'splitter-fragment': { color: 0xbdf05a, radius: 7.5, shape: 'hollow' },
  warden: { color: 0xff8a2b, radius: 23, shape: 'spiked' },
};
const FALLBACK_STYLE = { color: 0x5bc46f, radius: 11, shape: 'blob' as const };

type SpecimenShape = 'dot' | 'blob' | 'hollow' | 'spiked';

const DEVICE_BY_ID = new Map(DEVICES.map((d) => [d.id, d]));

let app: Application | null = null;
let ro: ResizeObserver | null = null;
/** World container: children are positioned in SIM units; it carries the camera
 *  offset and the sim→pixel scale so nothing else does coordinate math. */
let world: Container | null = null;
let moteLayer: Container | null = null;
let specimenLayer: Container | null = null;
let flashGfx: Graphics | null = null;
let operatorGfx: Graphics | null = null;
let fxGfx: Graphics | null = null;
let moteTex: Texture | null = null;
const shapeTex = new Map<SpecimenShape, Texture>();

/** Camera centre, in sim units. Pinned to the operator's RENDERED position — see
 *  `frame` — so the operator holds still and the floor is what moves. */
let camX = ARENA_BALANCE.mapWidth / 2;
let camY = ARENA_BALANCE.mapHeight / 2;
let scale = 1;

/**
 * A dead-reckoned body: the last sim sample (`s*`), the velocity measured off
 * the previous one (`v*`), and the integrated render position (`r*`).
 */
interface Reckoned {
  sx: number;
  sy: number;
  vx: number;
  vy: number;
  rx: number;
  ry: number;
}

/** Real seconds since the last observed sim sample. REAL, not sim: the dev speed
 *  buttons scale sim time and the render clock has to stay on the wall. */
let sinceStep = 0;

/** Take a new sim sample into a reckoned body, deriving its velocity. */
function sample(body: Reckoned, x: number, y: number, gap: number): void {
  const dx = x - body.sx;
  const dy = y - body.sy;
  if (dx * dx + dy * dy > TELEPORT * TELEPORT) {
    body.vx = 0;
    body.vy = 0;
    body.rx = x;
    body.ry = y;
  } else {
    body.vx = dx / gap;
    body.vy = dy / gap;
  }
  body.sx = x;
  body.sy = y;
}

/** Integrate one frame of motion and bleed off the prediction error. */
function reckon(body: Reckoned, dtSec: number, correction: number): void {
  body.rx += body.vx * dtSec;
  body.ry += body.vy * dtSec;
  body.rx += (body.sx + body.vx * sinceStep - body.rx) * correction;
  body.ry += (body.sy + body.vy * sinceStep - body.ry) * correction;
}

function reckonedAt(x: number, y: number): Reckoned {
  return { sx: x, sy: y, vx: 0, vy: 0, rx: x, ry: y };
}

/** The operator, dead-reckoned. The camera rides this, not the sim sample. */
let operator: Reckoned = reckonedAt(ARENA_BALANCE.mapWidth / 2, ARENA_BALANCE.mapHeight / 2);

/** Specimen sprites keyed by the sim's entity id, with their reckoned position
 *  and their remaining fade-in. */
const specimenSprites = new Map<number, { sprite: Sprite; body: Reckoned; fade: number }>();
/** Mote sprites are POOLED, not keyed: the population is unbounded and mostly
 *  offscreen, so each frame assigns visible motes to pool slots. */
const motePool: Sprite[] = [];

/** One live discharge flash. Direction is resolved at frame time — see below. */
interface Flash {
  defId: string;
  age: number;
  dirX: number;
  dirY: number;
}
let flashes: Flash[] = [];
/** Last seen cooldown timer per device slot, to detect a re-arm. */
let lastTimers: number[] = [];

function resize(): void {
  if (!app || !world) return;
  const { width: cw, height: ch } = app.screen;
  // Match AREA, not either axis. Neither fit rule works on a floor this shape:
  // `cover` crops the short axis, which is what buried the horde off-screen in a
  // wide host, and `contain` on that same host zooms out until bodies are dust to
  // satisfy a height nobody asked for. Equal-area keeps the apparent size of a
  // specimen — and the share of the floor a kill radius spans — constant, and
  // lets a wide window simply see wider. There is no letterbox to guard against:
  // the floor is 8000 × 5200 and every direction has more of it.
  scale = Math.sqrt((cw * ch) / (VIEW_WIDTH * VIEW_HEIGHT));
  world.scale.set(scale);
}

/**
 * Silhouette textures, generated once rather than shipped as assets. All drawn
 * white at 64 × 64 and tinted per tier at the sprite, so five shapes cost five
 * textures and no atlas.
 */
function makeShapeTexture(application: Application, shape: SpecimenShape | 'mote'): Texture {
  const g = new Graphics();
  const c = 32;
  switch (shape) {
    case 'dot':
    case 'mote':
      g.circle(c, c, 24).fill({ color: 0xffffff });
      g.circle(c, c, 31).fill({ color: 0xffffff, alpha: 0.3 });
      break;
    case 'blob':
      // A lit body with a darker core, so overlapping crawlers still read as a
      // count rather than as one puddle.
      g.circle(c, c, 30).fill({ color: 0xffffff, alpha: 0.32 });
      g.circle(c, c, 24).fill({ color: 0xffffff });
      g.circle(c, c, 11).fill({ color: 0x000000, alpha: 0.45 });
      break;
    case 'hollow':
      g.circle(c, c, 30).fill({ color: 0xffffff, alpha: 0.22 });
      g.circle(c, c, 22).stroke({ color: 0xffffff, width: 11 });
      break;
    case 'spiked':
      g.circle(c, c, 31).fill({ color: 0xffffff, alpha: 0.26 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const s = a + 0.16;
        const e = a - 0.16;
        g.moveTo(c + Math.cos(a) * 31, c + Math.sin(a) * 31)
          .lineTo(c + Math.cos(s) * 17, c + Math.sin(s) * 17)
          .lineTo(c + Math.cos(e) * 17, c + Math.sin(e) * 17)
          .closePath();
      }
      g.fill({ color: 0xffffff });
      g.circle(c, c, 19).fill({ color: 0xffffff });
      g.circle(c, c, 9).fill({ color: 0x000000, alpha: 0.5 });
      break;
  }
  const tex = application.renderer.generateTexture(g);
  g.destroy();
  return tex;
}

/** The floor: a slab grid drawn once across the whole map, plus the bulkhead
 *  that marks where containment actually ends. */
function buildFloor(): Container {
  const layer = new Container();
  const { mapWidth, mapHeight } = ARENA_BALANCE;

  layer.addChild(new Graphics().rect(0, 0, mapWidth, mapHeight).fill({ color: 0x141b18 }));

  // Slab joints. Deliberately low-contrast: they are texture, not information.
  const grid = new Graphics();
  const STEP = 200;
  for (let x = 0; x <= mapWidth; x += STEP) grid.moveTo(x, 0).lineTo(x, mapHeight);
  for (let y = 0; y <= mapHeight; y += STEP) grid.moveTo(0, y).lineTo(mapWidth, y);
  // Raised from 0x1b241f when the view widened: at the old zoom the joints were
  // 250 px apart and read as texture, at this one they are 126 px apart and read
  // as nothing at all, which leaves the floor a void with no sense of speed.
  grid.stroke({ color: 0x212d27, width: 1 });
  layer.addChild(grid);

  // Sector marks every 1000 units. These ARE information: the floor scrolls
  // under a locked camera, so without a coarse landmark at a scale bigger than
  // the view there is no read on whether the operator is crossing the map or
  // orbiting one spot — and crossing is a 60–120s decision
  // (`data/arena.ts` § Map size is derived).
  const sectors = new Graphics();
  const SECTOR = 1000;
  for (let x = SECTOR; x < mapWidth; x += SECTOR) {
    for (let y = SECTOR; y < mapHeight; y += SECTOR) {
      sectors
        .moveTo(x - 26, y)
        .lineTo(x + 26, y)
        .moveTo(x, y - 26)
        .lineTo(x, y + 26);
    }
  }
  sectors.stroke({ color: 0x33463d, width: 2 });
  layer.addChild(sectors);

  // The wall reads as a lit hazard edge, because reaching it is a real event —
  // the map is sized so a crossing costs 60–120s (`data/arena.ts` § Map size).
  layer.addChild(
    new Graphics()
      .rect(0, 0, mapWidth, mapHeight)
      .stroke({ color: 0xff8a2b, width: 6, alpha: 0.5 }),
  );
  return layer;
}

/**
 * Discharge flashes. The sim discards its activations, so the renderer detects a
 * fire by watching each device's cooldown timer re-arm (it counts down, then
 * jumps up). That keeps this a projection — no target selection is re-run here.
 *
 * What IS approximated is direction: `bolt` and `lance` aim at the nearest
 * specimen, resolved at frame time rather than at the sim step that fired, so a
 * flash can point a frame's worth of movement away from what the sim actually
 * hit. The flash says a device discharged in this shape, not who it killed.
 */
function collectFlashes(state: ArenaState): void {
  state.devices.forEach((rt, i) => {
    const previous = lastTimers[i];
    if (previous !== undefined && rt.timer > previous + 1e-6) {
      let dirX = state.operator.heading.x;
      let dirY = state.operator.heading.y;
      const def = DEVICE_BY_ID.get(rt.defId);
      if (def && (def.shape === 'bolt' || def.shape === 'lance')) {
        const near = nearestSpecimen(state, def.reach);
        if (near) {
          const d = Math.hypot(near.x - state.operator.x, near.y - state.operator.y) || 1;
          dirX = (near.x - state.operator.x) / d;
          dirY = (near.y - state.operator.y) / d;
        }
      }
      flashes.push({ defId: rt.defId, age: 0, dirX, dirY });
    }
    lastTimers[i] = rt.timer;
  });
  if (lastTimers.length > state.devices.length) lastTimers.length = state.devices.length;
}

function nearestSpecimen(state: ArenaState, reach: number): { x: number; y: number } | undefined {
  let best: { x: number; y: number } | undefined;
  let bestD2 = reach * reach;
  for (const s of state.specimens) {
    const dx = s.x - state.operator.x;
    const dy = s.y - state.operator.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestD2) {
      bestD2 = d2;
      best = s;
    }
  }
  return best;
}

/** Anchored to the operator's RENDERED position, not its sim sample — a discharge
 *  that came out of a point 6 units from the muzzle reads as a rendering fault. */
function drawFlashes(x: number, y: number, dtSec: number): void {
  const g = flashGfx;
  if (!g) return;
  g.clear();

  flashes = flashes.filter((f) => {
    f.age += dtSec;
    if (f.age >= FLASH_SECONDS) return false;
    const def = DEVICE_BY_ID.get(f.defId);
    if (!def) return true;

    const t = f.age / FLASH_SECONDS;
    const alpha = (1 - t) * 0.55;
    const angle = Math.atan2(f.dirY, f.dirX);

    // Every shape is drawn as a FRONT travelling out to reach, not as the volume
    // it covers. A filled wedge at the sprayer's reach is a third of the screen
    // going flat green four times a second, which reads as a UI artifact laid
    // over the game rather than as something the apparatus did — and it hides the
    // bodies it is supposed to be killing. The swept region stays, at an alpha
    // that only suggests it; the energy is in the leading edge.
    const front = 0.2 + 0.8 * t;

    switch (def.shape) {
      case 'pulse':
        // Radial swell out to reach — the shape is exactly what the sim takes.
        g.circle(x, y, def.reach * front).stroke({ color: 0x7fd6ff, width: 3, alpha });
        break;
      case 'cone': {
        // 120° wedge along the heading — `dispatch.ts` filters on dot ≥ 0.5.
        const half = Math.PI / 3;
        g.moveTo(x, y)
          .arc(x, y, def.reach, angle - half, angle + half)
          .lineTo(x, y)
          .fill({ color: 0x9ede4a, alpha: alpha * 0.13 });
        g.moveTo(
          x + Math.cos(angle - half) * def.reach * front,
          y + Math.sin(angle - half) * def.reach * front,
        )
          .arc(x, y, def.reach * front, angle - half, angle + half)
          .stroke({ color: 0xbdf05a, width: 3, alpha: alpha * 1.3 });
        break;
      }
      case 'lance': {
        // Tight line — `dispatch.ts` filters on dot ≥ 0.92, i.e. ±0.4 rad.
        const half = 0.4;
        g.moveTo(x, y)
          .arc(x, y, def.reach, angle - half, angle + half)
          .lineTo(x, y)
          .fill({ color: 0xdff4ff, alpha: alpha * 0.18 });
        g.moveTo(
          x + Math.cos(angle - half) * def.reach * front,
          y + Math.sin(angle - half) * def.reach * front,
        )
          .arc(x, y, def.reach * front, angle - half, angle + half)
          .stroke({ color: 0xffffff, width: 3, alpha: alpha * 1.4 });
        break;
      }
      case 'bolt':
      default:
        // A tracer with a bright head, so a single-target device still registers
        // against a field of four hundred bodies.
        g.moveTo(
          x + f.dirX * def.reach * Math.max(0, front - 0.3),
          y + f.dirY * def.reach * Math.max(0, front - 0.3),
        )
          .lineTo(x + f.dirX * def.reach * front, y + f.dirY * def.reach * front)
          .stroke({ color: 0xdff4ff, width: 2.5, alpha: alpha * 1.5 });
        break;
    }
    return true;
  });
}

/**
 * ─── Containment effects ───
 *
 * Everything a specimen's disappearance means, drawn. The sim emits no events —
 * it computes deaths and collections and moves on — and this component is a
 * projection that never writes back, so the effects are DIFFED out of state,
 * exactly the way discharge flashes already are.
 *
 * The diff runs on sim steps only (20 Hz), not on frames (60 Hz), because
 * nothing it looks at changes between steps and a per-frame id sweep over four
 * hundred bodies is two thirds waste.
 */
interface Puff {
  x: number;
  y: number;
  age: number;
}
let puffs: Puff[] = [];
/** Live puffs kept. A late-run second can retire dozens of bodies at once, and
 *  past this the screen is white rather than informative. */
const MAX_PUFFS = 48;
const PUFF_SECONDS = 0.3;

/** Decays to 0; drives the operator glyph's intake pulse on banked income. */
let collectPulse = 0;
/** Decays to 0; drives the operator flash and the CSS hurt wash. */
let hurtPulse = 0;

let lastSimTime = -1;
let lastBanked = 0;
let lastHp = Infinity;

function drawPuffs(dtSec: number): void {
  const g = fxGfx;
  if (!g) return;
  g.clear();
  puffs = puffs.filter((p) => {
    p.age += dtSec;
    if (p.age >= PUFF_SECONDS) return false;
    const t = p.age / PUFF_SECONDS;
    g.circle(p.x, p.y, 6 + t * 26).stroke({
      color: 0xdff4ff,
      width: 2 * (1 - t),
      alpha: 0.5 * (1 - t),
    });
    return true;
  });
}

/**
 * The operator glyph — now the only persistent apparatus on screen.
 *
 * The two range rings this used to sit inside are gone. `r_kill` and `r_collect`
 * are still the top coupling of the economy (`../data/arena.ts` § Balance), but
 * they are *stated* by what happens at them — bodies coming apart at one radius,
 * motes vanishing at the other — and a pair of standing circles said the same
 * thing continuously, at the size of a third of the screen, for ten hours. What
 * the rings were carrying that events do not is income feedback; that moved onto
 * this glyph as the intake pulse below.
 *
 * ─── The pixi path trap, because it bit this exact function ───
 * `GraphicsContext.stroke()` does not begin a new path: it clears the active one
 * and re-seeds it with a `moveTo` to the LAST POINT of what it just stroked
 * (`GraphicsContext._initNextPathLocation`). So `.lineTo(…).stroke(…).arc(…)`
 * draws a connecting chord from the end of the line to the start of the arc,
 * silently, in the arc's colour — which is what put a green hook across the
 * operator's hull. Every stroked element below therefore starts from either a
 * closed primitive (`circle`) or an explicit `moveTo`.
 */
function drawOperator(state: ArenaState, x: number, y: number): void {
  const g = operatorGfx;
  if (!g) return;
  const { hp, maxHp } = state.operator;
  const frac = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  const heading = state.operator.heading;
  const angle = Math.atan2(heading.y, heading.x);
  const hurt = hurtPulse;

  g.clear();

  // Hull.
  g.circle(x, y, 13).fill({ color: 0x0a0d0c });
  g.circle(x, y, 13).stroke({ color: hurt > 0 ? 0xff4d4d : 0xdff4ff, width: 2.5 + hurt * 2 });

  // Condition ring: drains and reddens rather than sitting as a bar, so the one
  // thing that ends the run is read where the eye already is. A full ring is
  // drawn as a `circle`, not an arc of exactly 2π — a start angle equal to its
  // end angle is the degenerate case, and which way it resolves is not ours.
  const tone = frac > 0.35 ? 0x5bc46f : 0xff4d4d;
  if (frac >= 0.999) {
    g.circle(x, y, 19).stroke({ color: tone, width: 3, alpha: 0.9 });
  } else if (frac > 0) {
    const from = -Math.PI / 2;
    g.moveTo(x + Math.cos(from) * 19, y + Math.sin(from) * 19)
      .arc(x, y, 19, from, from + Math.PI * 2 * frac)
      .stroke({ color: tone, width: 3, alpha: 0.9 });
  }

  // Heading pip — which way the cone and the next dive point. It sweeps rather
  // than teleports (`../modules/sim/steering.ts` § MAX_TURN_RATE), so it is a
  // tell about where the operator is committing rather than a strobe.
  //
  // Hung OUTSIDE the condition ring and drawn last. Inside, it spanned 9→22
  // against a ring occupying 17.5–20.5, so 1.5 units of it were visible and the
  // glyph had no facing at all — which mattered less while two range circles
  // were on screen giving the apparatus a presence, and matters a great deal now
  // that this is the whole of it.
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  g.moveTo(x + cos * 21, y + sin * 21)
    .lineTo(x + cos * 30, y + sin * 30)
    .stroke({ color: 0xdff4ff, width: 3 });
  // A tip, so the facing survives the squint at the size this glyph actually is.
  g.moveTo(x + cos * 36, y + sin * 36)
    .lineTo(x + cos * 28 - sin * 5, y + sin * 28 + cos * 5)
    .lineTo(x + cos * 28 + sin * 5, y + sin * 28 - cos * 5)
    .fill({ color: 0xdff4ff, alpha: 0.85 });

  // Intake pulse — the one thing the collect ring was carrying that the floor
  // does not already say. It fires on banked income and expands out through
  // roughly where the aperture is, so the radius is still shown, just only at
  // the moment it did something.
  if (collectPulse > 0) {
    g.circle(x, y, 18 + (1 - collectPulse) * 30).stroke({
      color: 0xf2d675,
      width: 1 + collectPulse * 2.5,
      alpha: 0.7 * collectPulse,
    });
  }

  if (hurt > 0) {
    g.circle(x, y, 24 + (1 - hurt) * 12).stroke({
      color: 0xff4d4d,
      width: 2.5,
      alpha: 0.55 * hurt,
    });
  }
}

function frame(dtSec: number): void {
  if (!world || !moteLayer || !specimenLayer || !moteTex || !app) return;
  const state = arena.state.value;
  const correction = 1 - Math.exp(-CORRECTION * dtSec);

  // ─── sim-step diff: new sample, income banked, damage taken ───
  const stepped = state.time !== lastSimTime;
  // How much real time the sample that just landed covers. Clamped low against a
  // frame that happens to sit on top of a tick, and it is what makes every
  // velocity below a per-REAL-second quantity — so the dev speed buttons scale
  // the motion instead of desynchronising the prediction from it.
  const gap = Math.max(sinceStep + dtSec, 1 / 240);
  sinceStep = stepped ? 0 : Math.min(sinceStep + dtSec, MAX_LEAD);
  if (stepped) {
    lastSimTime = state.time;
    sample(operator, state.operator.x, state.operator.y, gap);
    if (state.stats.motesBanked > lastBanked) collectPulse = 1;
    lastBanked = state.stats.motesBanked;
    if (state.operator.hp < lastHp - 1e-9) hurtPulse = 1;
    lastHp = state.operator.hp;
  }
  reckon(operator, dtSec, correction);
  // Framerate-independent decay, same form as the position easing.
  collectPulse *= Math.exp(-6 * dtSec);
  hurtPulse *= Math.exp(-4.5 * dtSec);
  if (collectPulse < 0.01) collectPulse = 0;
  if (hurtPulse < 0.01) hurtPulse = 0;
  if (wash.value) wash.value.style.setProperty('--hurt', hurtPulse.toFixed(3));

  // ─── camera ───
  // Pinned to the operator's reckoned position rather than chasing it. A second
  // smoothing stage on top of a body that is already smooth adds nothing but its
  // own lag, and pinning is what makes the operator the still point: everything
  // the eye tracks during a dive is the floor sliding past a fixed glyph.
  camX = operator.rx;
  camY = operator.ry;
  const { width: cw, height: ch } = app.screen;
  world.x = cw / 2 - camX * scale;
  world.y = ch / 2 - camY * scale;

  // ─── motes, from a viewport-culled pool ───
  const halfW = cw / scale / 2 + 40;
  const halfH = ch / scale / 2 + 40;
  let used = 0;
  for (const m of state.motes) {
    if (Math.abs(m.x - camX) > halfW || Math.abs(m.y - camY) > halfH) continue;
    let sprite = motePool[used];
    if (!sprite) {
      sprite = new Sprite(moteTex);
      sprite.anchor.set(0.5);
      sprite.tint = 0xf2d675;
      moteLayer.addChild(sprite);
      motePool[used] = sprite;
    }
    // Motes never move, so they are placed rather than eased.
    sprite.visible = true;
    sprite.x = m.x;
    sprite.y = m.y;
    // Motes are income, so they have to survive the squint that the specimens
    // around them also have to survive — a 3-unit dot did not.
    const r = 4.6 + Math.min(3.2, m.value * 0.6);
    sprite.width = r * 2;
    sprite.height = r * 2;
    used++;
  }
  for (let i = used; i < motePool.length; i++) motePool[i].visible = false;

  // ─── specimens, keyed by id and dead-reckoned ───
  const seen = new Set<number>();
  for (const s of state.specimens) {
    seen.add(s.id);
    let rec = specimenSprites.get(s.id);
    if (!rec) {
      const style = TIER_STYLE[s.tierId] ?? FALLBACK_STYLE;
      const sprite = new Sprite(shapeTex.get(style.shape) ?? moteTex);
      sprite.anchor.set(0.5);
      sprite.tint = style.color;
      sprite.width = style.radius * 2;
      sprite.height = style.radius * 2;
      sprite.alpha = 0;
      specimenLayer.addChild(sprite);
      rec = { sprite, body: reckonedAt(s.x, s.y), fade: 0 }; // arrivals snap to spawn
      specimenSprites.set(s.id, rec);
    } else if (stepped) {
      sample(rec.body, s.x, s.y, gap);
    }
    reckon(rec.body, dtSec, correction);
    rec.sprite.x = rec.body.rx;
    rec.sprite.y = rec.body.ry;
    if (rec.fade < 1) {
      rec.fade = Math.min(1, rec.fade + dtSec / SPAWN_FADE_SECONDS);
      rec.sprite.alpha = rec.fade;
    }
  }
  // A specimen leaves the census two ways, and only one of them is an event: it
  // died inside the apparatus, or the view left it behind at 1.4 × the spawn
  // annulus. The distance tells them apart with room to spare — kills land inside
  // `killRadius`, despawns beyond a thousand units — so the puff never fires for
  // something that merely scrolled away.
  const puffRange2 = Math.pow(ARENA_BALANCE.killRadius * 1.3, 2);
  for (const [id, rec] of specimenSprites) {
    if (seen.has(id)) continue;
    const dx = rec.body.rx - state.operator.x;
    const dy = rec.body.ry - state.operator.y;
    if (dx * dx + dy * dy <= puffRange2 && puffs.length < MAX_PUFFS) {
      puffs.push({ x: rec.body.rx, y: rec.body.ry, age: 0 });
    }
    rec.sprite.destroy();
    specimenSprites.delete(id);
  }

  collectFlashes(state);
  drawFlashes(operator.rx, operator.ry, dtSec);
  drawPuffs(dtSec);
  drawOperator(state, operator.rx, operator.ry);
}

onMounted(async () => {
  const el = host.value;
  if (!el) return;

  const application = new Application();
  await application.init({
    resizeTo: el,
    backgroundColor: 0x0a0d0c,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  if (host.value !== el) {
    // Unmounted while awaiting init — discard rather than attach an orphan.
    application.destroy(true);
    return;
  }
  app = application;
  el.appendChild(app.canvas);
  moteTex = makeShapeTexture(app, 'mote');
  for (const shape of ['dot', 'blob', 'hollow', 'spiked'] as const) {
    shapeTex.set(shape, makeShapeTexture(app, shape));
  }

  world = new Container();
  app.stage.addChild(world);
  world.addChild(buildFloor());

  moteLayer = new Container();
  world.addChild(moteLayer);
  specimenLayer = new Container();
  world.addChild(specimenLayer);
  flashGfx = new Graphics();
  world.addChild(flashGfx);
  fxGfx = new Graphics();
  world.addChild(fxGfx);
  operatorGfx = new Graphics();
  world.addChild(operatorGfx);

  const start = arena.state.value.operator;
  operator = reckonedAt(start.x, start.y);
  sinceStep = 0;
  camX = start.x;
  camY = start.y;
  lastHp = start.hp;
  lastBanked = arena.state.value.stats.motesBanked;
  lastSimTime = arena.state.value.time;

  resize();
  ro = new ResizeObserver(() => resize());
  ro.observe(el);

  app.ticker.add((tk) => frame(tk.deltaMS / 1000));
});

onBeforeUnmount(() => {
  ro?.disconnect();
  ro = null;
  specimenSprites.clear();
  motePool.length = 0;
  flashes = [];
  puffs = [];
  lastTimers = [];
  app?.destroy(true, { children: true });
  app = null;
  world = null;
  moteLayer = null;
  specimenLayer = null;
  flashGfx = null;
  fxGfx = null;
  operatorGfx = null;
  moteTex = null;
  shapeTex.clear();
});
</script>

<template>
  <div
    ref="host"
    class="arena-field"
    role="img"
    aria-label="Containment floor — the operator, the specimens closing on them, and the reagent motes left where specimens died"
  />
  <!-- Emergency wash + vignette. CSS rather than a pixi layer: it never changes,
       so it has no business being redrawn 60 times a second, and keeping it out
       of the world container means it does not scroll with the floor.

       The one thing that does change is `--hurt`, written straight to the style
       attribute from the frame loop rather than through a Vue ref — a reactive
       number driving a re-render every frame is a whole component's worth of
       work to move one opacity. -->
  <div ref="wash" class="arena-field__wash" aria-hidden="true" />
</template>

<style scoped>
.arena-field {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--hall);
}
.arena-field :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.arena-field__wash {
  --hurt: 0;
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(
      ellipse 62% 62% at 50% 50%,
      rgba(255, 138, 43, 0.05) 0%,
      rgba(10, 13, 12, 0) 55%
    ),
    radial-gradient(ellipse 78% 78% at 50% 50%, rgba(5, 7, 6, 0) 45%, rgba(5, 7, 6, 0.72) 100%);
}

/* Contact wash. A second layer rather than a fourth stop on the vignette, so the
   frame loop writes ONE custom property and the compositor does the rest — no
   gradient is re-interpolated per frame. */
.arena-field__wash::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: var(--hurt);
  background: radial-gradient(
    ellipse 70% 70% at 50% 50%,
    rgba(255, 77, 77, 0) 35%,
    rgba(255, 77, 77, 0.3) 100%
  );
}
</style>

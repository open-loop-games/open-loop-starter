<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';
import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { useModule } from '@/composables/useModule';
import { ArenaKey } from '../modules/arena';
import { MetaKey } from '../modules/meta';
import { ARENA_BALANCE } from '../data/arena';
import { DEVICES } from '../data/devices';
import { collectRadius } from '../modules/sim/step';
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
 * easing reads as lag. This arena steps at 20 Hz, so it takes the easing branch
 * and confirms it — see § Smoothing below.
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
const meta = useModule(MetaKey);
const host = useTemplateRef<HTMLDivElement>('host');
const wash = useTemplateRef<HTMLDivElement>('wash');

/**
 * The design view, in sim units — a screenful, not a hard crop. `resize` matches
 * its AREA rather than either axis, so the amount of floor on screen (and with it
 * the apparent size of a body) is the same on a square host and a 3:1 one.
 *
 * Sized against what the sim actually simulates rather than against the rings.
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
 * ─── Smoothing ───
 * Render position eases toward sim truth at this rate (1/s), framerate-independent
 * via `1 - e^(-k·dt)`. At the 20 Hz sim step a 50 ms staleness worst case is
 * below the ~100 ms where easing starts reading as input lag, so easing is the
 * right branch here and no prev/curr snapshot pair is needed. That is this
 * build's answer to the recipe's open question, and it agrees with skirmish.
 */
const SMOOTH = 18;
/** The camera lags the operator slightly more than entities lag their truth, so
 *  the floor slides rather than snapping when the steering policy reverses. */
const CAMERA_SMOOTH = 9;

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
let ringGfx: Graphics | null = null;
let flashGfx: Graphics | null = null;
let operatorGfx: Graphics | null = null;
let fxGfx: Graphics | null = null;
let moteTex: Texture | null = null;
const shapeTex = new Map<SpecimenShape, Texture>();

/** Eased camera centre, in sim units. */
let camX = ARENA_BALANCE.mapWidth / 2;
let camY = ARENA_BALANCE.mapHeight / 2;
let scale = 1;
/** Wall-clock seconds since mount; drives the ring sweep and the notch drift. */
let phase = 0;

/** Specimen sprites keyed by the sim's entity id, with their eased position and
 *  their remaining fade-in. */
const specimenSprites = new Map<number, { sprite: Sprite; rx: number; ry: number; fade: number }>();
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
  // specimen — and the share of the screen the kill ring occupies — constant, and
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
 * The two-ring operator glyph — the archetype's signature element.
 *
 * `r_collect` against `r_kill` is the top coupling in this game
 * (`data/arena.ts` § Balance): kills land at the outer edge, motes land where
 * the specimen died, and the collect ring is smaller, so banking income means
 * looping back through the space just cleared. Drawing both rings with the gap
 * between them shaded makes that transaction the most legible thing on screen
 * rather than an invariant buried in a constants file.
 */
/** Radians per second the kill-ring sweep rotates. Slow on purpose: it says the
 *  apparatus is live, it is not asking for attention every second for ten hours. */
const SWEEP_RATE = 0.5;

function drawRings(state: ArenaState, phase: number, collectPulse: number): void {
  const g = ringGfx;
  if (!g) return;
  const { x, y } = state.operator;
  const kill = ARENA_BALANCE.killRadius;
  const collect = liveCollectRadius(state);
  g.clear();

  // ─── the ash annulus, drawn as a place ───
  // The band between "killed here" and "banked here" IS the top coupling of this
  // economy (`../data/arena.ts` § Balance). Two outlines left it as the emptiness
  // between them; radial spokes make it a floor you can see you have to re-cross.
  // Hung from the kill boundary inward rather than grown from the aperture
  // outward: twenty-four lines converging on the small circle read as a
  // starburst centred on the operator, which is a second focal point three
  // centimetres from the first one.
  const SPOKES = 24;
  const spokeStart = collect + (kill - collect) * 0.55;
  for (let i = 0; i < SPOKES; i++) {
    const a = (i / SPOKES) * Math.PI * 2 + phase * 0.08;
    g.moveTo(x + Math.cos(a) * spokeStart, y + Math.sin(a) * spokeStart).lineTo(
      x + Math.cos(a) * kill,
      y + Math.sin(a) * kill,
    );
  }
  g.stroke({ color: 0x7fd6ff, width: 0.8, alpha: 0.06 });

  // ─── kill ring: an instrument boundary, not a circle ───
  // Dashed rather than solid because it is a THRESHOLD reading, and because a
  // continuous 360-unit outline at 36% of view width is the heaviest object on
  // the screen no matter how faint the line is. Broken into 48 marks it reads as
  // a graduation and stops competing with the bodies crossing it.
  const MARKS = 48;
  const span = ((Math.PI * 2) / MARKS) * 0.52;
  for (let i = 0; i < MARKS; i++) {
    const a = (i / MARKS) * Math.PI * 2;
    g.moveTo(x + Math.cos(a) * kill, y + Math.sin(a) * kill).arc(x, y, kill, a, a + span);
  }
  g.stroke({ color: 0x7fd6ff, width: 1.3, alpha: 0.3 });

  // Cardinal ticks — the graduation's decade marks, so the ring has an
  // orientation and the heading pip has something to be read against.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    g.moveTo(x + Math.cos(a) * (kill - 9), y + Math.sin(a) * (kill - 9)).lineTo(
      x + Math.cos(a) * (kill + 9),
      y + Math.sin(a) * (kill + 9),
    );
  }
  g.stroke({ color: 0x7fd6ff, width: 1.6, alpha: 0.4 });

  // The live sweep. One bright arc travelling the boundary, with two dimmer
  // segments trailing it — the whole animation budget of this screen, spent on
  // the one element that has to say "energised" for ten hours without blinking.
  const head = phase * SWEEP_RATE;
  for (let i = 0; i < 3; i++) {
    const from = head - i * 0.42 - 0.4;
    g.moveTo(x + Math.cos(from) * kill, y + Math.sin(from) * kill).arc(
      x,
      y,
      kill,
      from,
      from + 0.4,
    );
    g.stroke({ color: 0xdff4ff, width: 2, alpha: 0.34 - i * 0.11 });
  }

  // ─── collect ring: the intake aperture ───
  // Weighted the opposite way to the kill ring: this one is a PLACE, so it keeps
  // its fill and its crisp warm edge. It also answers — the ring thickens and
  // brightens for a moment each time it banks, which is the only feedback in the
  // game that income happened, and it lands where the eye already is.
  // A BAND inside the edge, not a filled disc. Reagents stack the aperture wide
  // — Reclaimant caps at ×1.94 — and a flat fill over that area is a mustard
  // blob covering half the floor, which inverts the hierarchy the two rings are
  // for. An inward-fading rim says "aperture" at every radius it can reach.
  g.circle(x, y, collect)
    .fill({ color: 0xf2d675, alpha: 0.05 + collectPulse * 0.06 })
    .circle(x, y, Math.max(0, collect - 16))
    .cut();
  g.circle(x, y, collect).stroke({
    color: 0xf2d675,
    width: 1.6 + collectPulse * 2.2,
    alpha: 0.62 + collectPulse * 0.38,
  });

  // Intake notches, counter-rotating against the sweep. Machinery, and a second
  // read on the aperture's size as reagents widen it mid-run.
  const NOTCHES = 8;
  for (let i = 0; i < NOTCHES; i++) {
    const a = (i / NOTCHES) * Math.PI * 2 - phase * 0.3;
    g.moveTo(x + Math.cos(a) * collect, y + Math.sin(a) * collect).lineTo(
      x + Math.cos(a) * (collect - 8),
      y + Math.sin(a) * (collect - 8),
    );
  }
  g.stroke({ color: 0xf2d675, width: 2, alpha: 0.45 + collectPulse * 0.4 });
}

/**
 * Reach the sim's own collect-radius rule rather than restating it, so the ring
 * cannot drift from what actually banks a mote.
 *
 * `collectRadius` reads exactly two things off its params object — the reagent
 * chain (which lives on `state`) and `metaCollect` — so the rest is filler. The
 * meta multiplier is fixed for the duration of a run (the shop is between-runs
 * only), which is why reading it live here matches what the run opened with.
 */
const RING_PARAM_FILLER = {
  engage: 0,
  eta: 0,
  speedMul: 1,
  dpsMul: 1,
  toughnessMul: 1,
  metaSurvival: 1,
  metaYield: 1,
  random: () => 0,
} as const;

function liveCollectRadius(state: ArenaState): number {
  return collectRadius(state, { ...RING_PARAM_FILLER, metaCollect: meta.collectMul.value });
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

function drawFlashes(state: ArenaState, dtSec: number): void {
  const g = flashGfx;
  if (!g) return;
  g.clear();
  const { x, y } = state.operator;

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

/** Decays to 0; drives the collect ring's answer to income. */
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

function drawOperator(state: ArenaState): void {
  if (!operatorGfx) return;
  const { x, y, hp, maxHp } = state.operator;
  const frac = maxHp > 0 ? Math.max(0, hp / maxHp) : 0;
  const heading = state.operator.heading;
  const angle = Math.atan2(heading.y, heading.x);
  const hurt = hurtPulse;

  operatorGfx
    .clear()
    .circle(x, y, 13)
    .fill({ color: 0x0a0d0c })
    .circle(x, y, 13)
    .stroke({ color: hurt > 0 ? 0xff4d4d : 0xdff4ff, width: 2.5 + hurt * 2 })
    // Heading pip — which way the cone and the next dive point. It sweeps rather
    // than teleports now (`../modules/sim/steering.ts` § MAX_TURN_RATE), so it is
    // a tell about where the operator is committing rather than a strobe.
    .moveTo(x + Math.cos(angle) * 9, y + Math.sin(angle) * 9)
    .lineTo(x + Math.cos(angle) * 22, y + Math.sin(angle) * 22)
    .stroke({ color: 0xdff4ff, width: 2.5 })
    // Condition ring: drains and reddens rather than sitting as a bar, so the
    // one thing that ends the run is read where the eye already is.
    .arc(x, y, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac)
    .stroke({ color: frac > 0.35 ? 0x5bc46f : 0xff4d4d, width: 3, alpha: 0.9 });

  if (hurt > 0) {
    operatorGfx
      .circle(x, y, 24 + (1 - hurt) * 12)
      .stroke({ color: 0xff4d4d, width: 2.5, alpha: 0.55 * hurt });
  }
}

function frame(dtSec: number): void {
  if (!world || !moteLayer || !specimenLayer || !moteTex || !app) return;
  const state = arena.state.value;
  const k = 1 - Math.exp(-SMOOTH * dtSec);
  const ck = 1 - Math.exp(-CAMERA_SMOOTH * dtSec);
  phase += dtSec;

  // ─── sim-step diff: income banked, damage taken ───
  const stepped = state.time !== lastSimTime;
  if (stepped) {
    lastSimTime = state.time;
    if (state.stats.motesBanked > lastBanked) collectPulse = 1;
    lastBanked = state.stats.motesBanked;
    if (state.operator.hp < lastHp - 1e-9) hurtPulse = 1;
    lastHp = state.operator.hp;
  }
  // Framerate-independent decay, same form as the position easing.
  collectPulse *= Math.exp(-6 * dtSec);
  hurtPulse *= Math.exp(-4.5 * dtSec);
  if (collectPulse < 0.01) collectPulse = 0;
  if (hurtPulse < 0.01) hurtPulse = 0;
  if (wash.value) wash.value.style.setProperty('--hurt', hurtPulse.toFixed(3));

  // ─── camera ───
  camX += (state.operator.x - camX) * ck;
  camY += (state.operator.y - camY) * ck;
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

  // ─── specimens, keyed by id and eased toward truth ───
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
      rec = { sprite, rx: s.x, ry: s.y, fade: 0 }; // new arrivals snap to spawn
      specimenSprites.set(s.id, rec);
    }
    rec.rx += (s.x - rec.rx) * k;
    rec.ry += (s.y - rec.ry) * k;
    rec.sprite.x = rec.rx;
    rec.sprite.y = rec.ry;
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
    const dx = rec.rx - state.operator.x;
    const dy = rec.ry - state.operator.y;
    if (dx * dx + dy * dy <= puffRange2 && puffs.length < MAX_PUFFS) {
      puffs.push({ x: rec.rx, y: rec.ry, age: 0 });
    }
    rec.sprite.destroy();
    specimenSprites.delete(id);
  }

  collectFlashes(state);
  drawRings(state, phase, collectPulse);
  drawFlashes(state, dtSec);
  drawPuffs(dtSec);
  drawOperator(state);
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
  ringGfx = new Graphics();
  world.addChild(ringGfx);
  specimenLayer = new Container();
  world.addChild(specimenLayer);
  flashGfx = new Graphics();
  world.addChild(flashGfx);
  fxGfx = new Graphics();
  world.addChild(fxGfx);
  operatorGfx = new Graphics();
  world.addChild(operatorGfx);

  const start = arena.state.value.operator;
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
  ringGfx = null;
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

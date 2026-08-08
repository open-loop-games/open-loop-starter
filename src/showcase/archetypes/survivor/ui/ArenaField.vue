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
 *    map is 8000 × 5200 against a ~1000 × 560 view, so the world container
 *    carries a *moving* camera offset instead. The recipe's "one container owns
 *    the fit + unit scale so nothing else does math" still holds — it just owns
 *    a camera rather than a fit.
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

/** Sim units visible across the canvas. `data/arena.ts` sizes the spawn annulus
 *  to sit just outside this, so changing it changes what "offscreen" means. */
const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 560;

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

const TIER_STYLE: Record<string, { color: number; radius: number }> = {
  'mote-fly': { color: 0x5bc46f, radius: 7 },
  crawler: { color: 0x2f7a41, radius: 11 },
  splitter: { color: 0x9ede4a, radius: 8 },
  'splitter-fragment': { color: 0x9ede4a, radius: 5 },
  warden: { color: 0xff8a2b, radius: 17 },
};
const FALLBACK_STYLE = { color: 0x5bc46f, radius: 8 };

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
let dotTex: Texture | null = null;

/** Eased camera centre, in sim units. */
let camX = ARENA_BALANCE.mapWidth / 2;
let camY = ARENA_BALANCE.mapHeight / 2;
let scale = 1;

/** Specimen sprites keyed by the sim's entity id, with their eased position. */
const specimenSprites = new Map<number, { sprite: Sprite; rx: number; ry: number }>();
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
  // Cover rather than contain: the view is a window onto a larger floor, so
  // letterboxing would show hall the operator can actually walk into.
  scale = Math.max(cw / VIEW_WIDTH, ch / VIEW_HEIGHT);
  world.scale.set(scale);
}

/**
 * A soft-edged dot, generated once rather than shipped as an asset. Everything
 * on this floor is a lit blob, so one white texture tinted per tier covers
 * specimens and motes both.
 */
function makeDotTexture(application: Application): Texture {
  const g = new Graphics().circle(32, 32, 26).fill({ color: 0xffffff });
  g.circle(32, 32, 32).fill({ color: 0xffffff, alpha: 0.28 });
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
  grid.stroke({ color: 0x1b241f, width: 1 });
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
function drawRings(state: ArenaState): void {
  const g = ringGfx;
  if (!g) return;
  const { x, y } = state.operator;
  const kill = ARENA_BALANCE.killRadius;
  const collect = liveCollectRadius(state);

  // The kill ring is a BOUNDARY and the collect ring is a PLACE, so they get
  // different weights: the outer one is the faintest line that still reads at a
  // squint, the inner one is crisp and warm. Weighting them equally made the
  // outer disc dominate the screen at the ~36%-of-view-width it genuinely
  // occupies, which buried the transaction it was drawn to expose.
  g.clear()
    .circle(x, y, kill)
    .fill({ color: 0x7fd6ff, alpha: 0.016 })
    .circle(x, y, kill)
    .stroke({ color: 0x7fd6ff, width: 1.1, alpha: 0.26 })
    .circle(x, y, collect)
    .fill({ color: 0xf2d675, alpha: 0.05 })
    .circle(x, y, collect)
    .stroke({ color: 0xf2d675, width: 1.6, alpha: 0.62 });
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

    switch (def.shape) {
      case 'pulse':
        // Radial swell out to reach — the shape is exactly what the sim takes.
        g.circle(x, y, def.reach * (0.35 + 0.65 * t)).stroke({
          color: 0x7fd6ff,
          width: 3,
          alpha,
        });
        break;
      case 'cone':
        // 120° wedge along the heading — `dispatch.ts` filters on dot ≥ 0.5.
        g.moveTo(x, y)
          .arc(x, y, def.reach, angle - Math.PI / 3, angle + Math.PI / 3)
          .lineTo(x, y)
          .fill({ color: 0x9ede4a, alpha: alpha * 0.5 });
        break;
      case 'lance':
        // Tight line — `dispatch.ts` filters on dot ≥ 0.92, i.e. ±0.4 rad.
        g.moveTo(x, y)
          .arc(x, y, def.reach, angle - 0.4, angle + 0.4)
          .lineTo(x, y)
          .fill({ color: 0xdff4ff, alpha: alpha * 0.6 });
        break;
      case 'bolt':
      default:
        g.moveTo(x, y)
          .lineTo(x + f.dirX * def.reach, y + f.dirY * def.reach)
          .stroke({ color: 0xdff4ff, width: 2.5, alpha });
        break;
    }
    return true;
  });
}

function drawOperator(state: ArenaState): void {
  if (!operatorGfx) return;
  const { x, y, hp, maxHp } = state.operator;
  const frac = maxHp > 0 ? Math.max(0, hp / maxHp) : 0;
  const heading = state.operator.heading;
  const angle = Math.atan2(heading.y, heading.x);

  operatorGfx
    .clear()
    .circle(x, y, 13)
    .fill({ color: 0x0a0d0c })
    .circle(x, y, 13)
    .stroke({ color: 0xdff4ff, width: 2.5 })
    // Heading pip — which way the cone and the next dive point.
    .moveTo(x + Math.cos(angle) * 9, y + Math.sin(angle) * 9)
    .lineTo(x + Math.cos(angle) * 22, y + Math.sin(angle) * 22)
    .stroke({ color: 0xdff4ff, width: 2.5 })
    // Condition ring: drains and reddens rather than sitting as a bar, so the
    // one thing that ends the run is read where the eye already is.
    .arc(x, y, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac)
    .stroke({ color: frac > 0.35 ? 0x5bc46f : 0xff4d4d, width: 3, alpha: 0.9 });
}

function frame(dtSec: number): void {
  if (!world || !moteLayer || !specimenLayer || !dotTex || !app) return;
  const state = arena.state.value;
  const k = 1 - Math.exp(-SMOOTH * dtSec);
  const ck = 1 - Math.exp(-CAMERA_SMOOTH * dtSec);

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
      sprite = new Sprite(dotTex);
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
      const sprite = new Sprite(dotTex);
      sprite.anchor.set(0.5);
      sprite.tint = style.color;
      sprite.width = style.radius * 2;
      sprite.height = style.radius * 2;
      specimenLayer.addChild(sprite);
      rec = { sprite, rx: s.x, ry: s.y }; // new arrivals snap to spawn
      specimenSprites.set(s.id, rec);
    }
    rec.rx += (s.x - rec.rx) * k;
    rec.ry += (s.y - rec.ry) * k;
    rec.sprite.x = rec.rx;
    rec.sprite.y = rec.ry;
  }
  for (const [id, rec] of specimenSprites) {
    if (!seen.has(id)) {
      rec.sprite.destroy();
      specimenSprites.delete(id);
    }
  }

  collectFlashes(state);
  drawRings(state);
  drawFlashes(state, dtSec);
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
  dotTex = makeDotTexture(app);

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
  operatorGfx = new Graphics();
  world.addChild(operatorGfx);

  const start = arena.state.value.operator;
  camX = start.x;
  camY = start.y;

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
  lastTimers = [];
  app?.destroy(true, { children: true });
  app = null;
  world = null;
  moteLayer = null;
  specimenLayer = null;
  ringGfx = null;
  flashGfx = null;
  operatorGfx = null;
  dotTex = null;
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
       of the world container means it does not scroll with the floor. -->
  <div class="arena-field__wash" aria-hidden="true" />
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
</style>

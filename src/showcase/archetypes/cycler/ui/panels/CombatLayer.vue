<script setup lang="ts">
import { onMounted, onBeforeUnmount, useTemplateRef } from 'vue';
import { Application, Container, Graphics } from 'pixi.js';
import { getBuild, getCycle } from '../../modules';

/**
 * CombatLayer — the descending-warhead / Lance-beam cosmetic over the field's
 * radar sky (studio/open-loop-starter#22 leaf 1; the pixi layer `DefenseField.vue`
 * stubbed with "combat layer pending"). It is a pure read-only projection of the
 * rate model: the sim gives an AGGREGATE salvo `W_N` and realized clear-rate `C`
 * per wave, never per-warhead events, so warheads carry NO tactical state. Spawn
 * cadence tracks `pressure`; each mark's fate (intercepted vs leak-through) is drawn
 * against the closed-form cleared fraction `min(1, C/W_N)` read each frame — the
 * same C-vs-W_N envelope the kernel resolves, sampled as discrete marks. It never
 * writes sim state (per #22's resolved combat-fidelity decision: literal-aggregate).
 *
 * Adopts `skirmish/ui/PlayField.vue`'s pattern: self-contained, no props, pull
 * module state each frame; pixi handles in module-scope `let`/`const` (never Vue
 * refs — a reactive proxy corrupts pixi's internal bookkeeping); own the ticker;
 * full async-mount guard + teardown. Positions are normalized [0,1] mapped to the
 * live canvas each frame, so a resize needs no world-container relayout. The canvas
 * is `pointer-events: none` so the board below stays clickable.
 */

const cycle = getCycle();
const build = getBuild();
const host = useTemplateRef<HTMLDivElement>('host');

// Phosphor-terminal palette (mirrors the archetype's --cyc-* tokens).
const AMBER = 0xffb000; // an inbound warhead
const CRIT = 0xff4d5e; // a saturation (boss) warhead + a leak-through line hit
const BEAM = 0x54a9ff; // a Lance directed-energy beam

const MAX_WARHEADS = 48;
const DESCEND = 0.9; // normalized units/sec; a mark falls sky-top → line in ~1.1s

/** A descending mark. `fate` is fixed at spawn from the aggregate cleared fraction. */
interface Warhead {
  g: Graphics;
  x: number; // normalized [0,1] across the sky
  y: number; // normalized [0,1] top → line
  vy: number;
  fate: 'intercept' | 'leak';
  interceptY: number; // where a beam catches an 'intercept' mark
}
/** A short-lived beam/flash/impact graphic that fades (and optionally grows) out. */
interface Fx {
  g: Graphics;
  life: number;
  max: number;
  grow: boolean;
}

let app: Application | null = null;
let warheadLayer: Container | null = null;
let fxLayer: Container | null = null;
const warheads: Warhead[] = [];
const fxs: Fx[] = [];
let spawnTimer = 0;

function drawWarhead(g: Graphics, color: number): void {
  // A bright head with a falling trail — a warhead streak, drawn once. Sized to
  // read on the 132px sky: a hot white core inside a colored diamond + a trail.
  g.clear();
  g.moveTo(0, -6).lineTo(0, -22).stroke({ width: 2, color, alpha: 0.5 });
  g.poly([0, -7, 4, 0, 0, 7, -4, 0]).fill({ color, alpha: 1 });
  g.circle(0, 0, 1.8).fill({ color: 0xffffff, alpha: 0.9 });
}

function spawnWarhead(leakFrac: number, boss: boolean): void {
  const g = new Graphics();
  drawWarhead(g, boss ? CRIT : AMBER);
  warheadLayer!.addChild(g);
  warheads.push({
    g,
    x: 0.05 + Math.random() * 0.9,
    y: 0,
    vy: DESCEND * (0.82 + Math.random() * 0.36),
    fate: Math.random() < leakFrac ? 'leak' : 'intercept',
    interceptY: 0.3 + Math.random() * 0.34,
  });
}

/** A vertical Lance beam rising from the line to the intercept point. */
function beam(x: number, toY: number, W: number, H: number): void {
  const g = new Graphics();
  const px = x * W;
  g.moveTo(px, H)
    .lineTo(px, toY * H)
    .stroke({ width: 6, color: BEAM, alpha: 0.28 });
  g.moveTo(px, H)
    .lineTo(px, toY * H)
    .stroke({ width: 2, color: BEAM, alpha: 0.95 });
  fxLayer!.addChild(g);
  fxs.push({ g, life: 0.26, max: 0.26, grow: false });
}

/** A burst — an intercept flash (blue) or a leak-through line impact (red). */
function burst(x: number, y: number, color: number, W: number, H: number): void {
  const g = new Graphics();
  g.circle(0, 0, 4).fill({ color, alpha: 0.9 });
  g.x = x * W;
  g.y = y * H;
  fxLayer!.addChild(g);
  fxs.push({ g, life: color === CRIT ? 0.4 : 0.2, max: color === CRIT ? 0.4 : 0.2, grow: true });
}

function frame(dt: number): void {
  if (!app || !warheadLayer) return;
  const W = app.screen.width;
  const H = app.screen.height;

  const phase = cycle.phase.value;
  const running = cycle.runState.value === 'running';
  const salvoDescends = running && (phase === 'inbound' || phase === 'saturation');
  const boss = phase === 'saturation';

  // The aggregate envelope: cleared fraction min(1, C/W_N); the rest leaks. Read
  // realized clearRate (not the cMax ceiling) so under-fielding Lances shows as
  // more leak-through — the live C-vs-W_N split, sampled as spawn fates.
  const salvo = cycle.salvo.value;
  const cleared = salvo.gt(0) ? Math.min(1, build.clearRate.value.div(salvo).toNumber()) : 1;
  const leakFrac = Math.max(0, Math.min(1, 1 - cleared));
  const pressure = Math.min(1, Math.max(0, cycle.pressure.value));

  if (salvoDescends && warheads.length < MAX_WARHEADS) {
    spawnTimer -= dt;
    const interval = Math.max(0.11, 0.34 - 0.22 * pressure); // steeper pressure → denser salvo
    while (spawnTimer <= 0 && warheads.length < MAX_WARHEADS) {
      spawnTimer += interval;
      spawnWarhead(leakFrac, boss);
    }
  } else {
    spawnTimer = 0; // STANDBY / OVERRUN: no new marks; the sky clears between waves
  }

  for (let i = warheads.length - 1; i >= 0; i--) {
    const w = warheads[i];
    w.y += w.vy * dt;
    if (w.fate === 'intercept' && w.y >= w.interceptY) {
      beam(w.x, w.interceptY, W, H);
      burst(w.x, w.interceptY, BEAM, W, H);
      w.g.destroy();
      warheads.splice(i, 1);
      continue;
    }
    if (w.y >= 1) {
      burst(w.x, 0.98, CRIT, W, H); // a survivor reaches the defended line
      w.g.destroy();
      warheads.splice(i, 1);
      continue;
    }
    w.g.x = w.x * W;
    w.g.y = w.y * H;
  }

  for (let i = fxs.length - 1; i >= 0; i--) {
    const f = fxs[i];
    f.life -= dt;
    if (f.life <= 0) {
      f.g.destroy();
      fxs.splice(i, 1);
      continue;
    }
    const t = f.life / f.max;
    f.g.alpha = t;
    if (f.grow) f.g.scale.set(1 + (1 - t) * 2.4);
  }
}

onMounted(async () => {
  const el = host.value;
  if (!el) return;

  const application = new Application();
  await application.init({
    resizeTo: el,
    backgroundAlpha: 0, // transparent — the CSS radar sky shows through
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  if (host.value !== el) {
    // Unmounted while awaiting init — discard.
    application.destroy(true);
    return;
  }
  app = application;
  el.appendChild(app.canvas);

  warheadLayer = new Container();
  fxLayer = new Container();
  app.stage.addChild(fxLayer); // beams/impacts under the marks
  app.stage.addChild(warheadLayer);

  app.ticker.add((tk) => frame(tk.deltaMS / 1000));
});

onBeforeUnmount(() => {
  for (const w of warheads) w.g.destroy();
  for (const f of fxs) f.g.destroy();
  warheads.length = 0;
  fxs.length = 0;
  app?.destroy(true, { children: true });
  app = null;
  warheadLayer = null;
  fxLayer = null;
});
</script>

<template>
  <div ref="host" class="cyc-combat" aria-hidden="true" />
</template>

<style scoped>
.cyc-combat {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.cyc-combat :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>

<!--
  PestLayer — the canvas over the planting board: the silver trail the pests
  will follow, the moonlit line moths will fly when one of the next three
  nights brings them, the reach of the plant in hand or the plant looked at,
  the sticky ground round every trap, and the pests and shots themselves.
  Moths fly above everything else, wings beating. A
  read-only projection of the plot run: it never writes sim state, and the
  board under it takes every click.

  Follows the field-projection pattern of `skirmish/ui/PlayField.vue`: pixi
  handles in plain `let`s (a Vue reactive proxy corrupts pixi's bookkeeping),
  the component owns its ticker, an async-mount guard, full teardown. Bodies
  ease toward the 20 Hz sim sample; they are decorations, so a chase is enough.
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';
import { Application, Container, Graphics } from 'pixi.js';
import type { PestKind, PlantId } from '../../data';
import { getGarden, type Pest, type PlotRun, type Shot } from '../../modules';

const props = defineProps<{
  run: PlotRun;
  tool: PlantId | null;
  hover: { x: number; y: number } | null;
  selected: number | null;
}>();

const garden = getGarden();
const host = useTemplateRef<HTMLDivElement>('host');

// Mirrors the archetype's --wg-* tokens; a canvas cannot read custom properties per frame cheaply.
const TRAIL = 0xc9d6dc;
const LANTERN = 0xe8a94a;
const TRAP = 0xe3c63c;
const LOSS = 0xd0573f;
const SEEDLING = 0x9ccc65;
const COMPOST = 0x8a6a45;
const MOON = 0xb9b3d6;
const EASE = 18;

interface Body {
  /** Positioned at the pest; holds the turning body and the upright health bar. */
  root: Container;
  g: Graphics;
  hp: Graphics;
  rx: number;
  ry: number;
  lastHp: number;
}
interface Fx {
  g: Graphics;
  life: number;
  max: number;
}

let app: Application | null = null;
let trailG: Graphics | null = null;
let reachG: Graphics | null = null;
let pestLayer: Container | null = null;
let shotLayer: Container | null = null;
let skyLayer: Container | null = null;
let clock = 0;
let fxLayer: Container | null = null;
const bodies = new Map<number, Body>();
const shots = new Map<number, { g: Graphics; shot: Shot }>();
const fxs: Fx[] = [];
let trailKey = '';
let reachKey = '';

function drawPest(g: Graphics, kind: PestKind, c: number): void {
  switch (kind) {
    case 'slug':
      g.ellipse(0, 0, c * 0.26, c * 0.11).fill(0x8c7a5e);
      g.circle(c * 0.22, -c * 0.02, c * 0.07).fill(0x9c8a6c);
      g.moveTo(c * 0.26, -c * 0.06)
        .lineTo(c * 0.33, -c * 0.14)
        .stroke({ width: 1.2, color: 0x9c8a6c });
      break;
    case 'mouse':
      g.moveTo(-c * 0.14, 0)
        .quadraticCurveTo(-c * 0.3, c * 0.1, -c * 0.36, -c * 0.02)
        .stroke({ width: 1.2, color: 0x9a7e66 });
      g.ellipse(0, 0, c * 0.17, c * 0.1).fill(0x7b6250);
      g.circle(c * 0.15, -c * 0.06, c * 0.05).fill(0x9a7e66);
      g.circle(c * 0.2, 0, c * 0.02).fill(0x191510);
      break;
    case 'beetle':
      g.ellipse(0, 0, c * 0.2, c * 0.15).fill(0x3d2a1c);
      g.moveTo(-c * 0.2, 0)
        .lineTo(c * 0.16, 0)
        .stroke({ width: 1, color: 0x6b4a2e });
      g.ellipse(-c * 0.04, -c * 0.06, c * 0.08, c * 0.03).fill({ color: 0xc9a46a, alpha: 0.35 });
      g.circle(c * 0.2, 0, c * 0.06).fill(0x2a1d14);
      break;
    case 'aphid':
      g.ellipse(0, 0, c * 0.08, c * 0.055).fill(0x9ccc65);
      g.circle(c * 0.07, 0, c * 0.03).fill(0x7aa84a);
      g.circle(-c * 0.05, -c * 0.02, c * 0.015).fill({ color: 0xffffff, alpha: 0.5 });
      break;
    case 'moth':
      g.ellipse(-c * 0.02, -c * 0.15, c * 0.11, c * 0.15).fill({ color: 0xcfc6ae, alpha: 0.92 });
      g.ellipse(-c * 0.02, c * 0.15, c * 0.11, c * 0.15).fill({ color: 0xcfc6ae, alpha: 0.92 });
      g.circle(-c * 0.03, -c * 0.15, c * 0.03).fill(0xe7e2d6);
      g.circle(-c * 0.03, c * 0.15, c * 0.03).fill(0xe7e2d6);
      g.ellipse(0, 0, c * 0.12, c * 0.035).fill(0x8a7f68);
      break;
    case 'badger':
      g.ellipse(0, 0, c * 0.4, c * 0.22).fill(0x3a3a3a);
      g.ellipse(c * 0.36, 0, c * 0.14, c * 0.12).fill(0xe7e2d6);
      g.moveTo(c * 0.26, -c * 0.05)
        .lineTo(c * 0.48, -c * 0.03)
        .stroke({ width: c * 0.05, color: 0x191510 });
      g.moveTo(c * 0.26, c * 0.05)
        .lineTo(c * 0.48, c * 0.03)
        .stroke({ width: c * 0.05, color: 0x191510 });
      break;
  }
}

function drawHp(g: Graphics, p: Pest, c: number): void {
  g.clear();
  if (p.hp >= p.maxHp) return;
  const w = c * (p.kind === 'badger' ? 0.7 : p.kind === 'aphid' ? 0.22 : 0.42);
  const y = -c * (p.kind === 'badger' ? 0.36 : p.kind === 'aphid' ? 0.14 : 0.3);
  g.rect(-w / 2, y, w, 3).fill({ color: 0x191510, alpha: 0.8 });
  g.rect(-w / 2, y, w * Math.max(0, p.hp / p.maxHp), 3).fill(SEEDLING);
}

function puff(x: number, y: number, color: number, r: number): void {
  const g = new Graphics();
  g.circle(0, 0, r).stroke({ width: 2, color, alpha: 0.9 });
  g.x = x;
  g.y = y;
  fxLayer!.addChild(g);
  fxs.push({ g, life: 0.45, max: 0.45 });
}

function redrawTrail(c: number): void {
  const run = props.run;
  const route = run.route();
  const moths = run.phase === 'build' && run.preview(3).some((n) => n.kind === 'moth');
  const key = `${run.phase}|${moths}|${route.map((p) => `${p.x},${p.y}`).join(';')}|${c}`;
  if (key === trailKey) return;
  trailKey = key;
  const g = trailG!;
  g.clear();
  if (moths) {
    // Dashes of moonlight along the straight line the moths will fly.
    const line = run.flightLine();
    for (let i = 0; i + 1 < line.length; i++) {
      const a = line[i];
      const b = line[i + 1];
      g.moveTo((a.x + 0.5) * c + c * 0.2, (a.y + 0.5) * c)
        .lineTo((b.x + 0.5) * c - c * 0.2, (b.y + 0.5) * c)
        .stroke({ width: 1.5, color: MOON, alpha: 0.5, cap: 'round' });
    }
  }
  if (route.length < 2) return;
  const alpha = props.run.phase === 'build' ? 0.32 : 0.16;
  g.moveTo((route[0].x + 0.5) * c, (route[0].y + 0.5) * c);
  for (const p of route.slice(1)) g.lineTo((p.x + 0.5) * c, (p.y + 0.5) * c);
  g.stroke({ width: c * 0.18, color: TRAIL, alpha: alpha * 0.5, cap: 'round', join: 'round' });
  g.moveTo((route[0].x + 0.5) * c, (route[0].y + 0.5) * c);
  for (const p of route.slice(1)) g.lineTo((p.x + 0.5) * c, (p.y + 0.5) * c);
  g.stroke({ width: 2, color: TRAIL, alpha: alpha * 1.6, cap: 'round', join: 'round' });
  // Glints: a slime trail catches the light in places.
  route.forEach((p, i) => {
    if (i % 3 !== 1) return;
    g.circle((p.x + 0.5) * c + ((i * 7) % 5) - 2, (p.y + 0.5) * c + ((i * 11) % 5) - 2, 1.6).fill({
      color: 0xffffff,
      alpha: alpha * 1.8,
    });
  });
}

function redrawReach(c: number): void {
  const run = props.run;
  const specs = garden.specs.value;
  const rings: { x: number; y: number; r: number; color: number; fill: boolean }[] = [];
  for (const p of run.plants.values()) {
    if (p.def === 'trap')
      rings.push({ x: p.x, y: p.y, r: run.plantRange(p), color: TRAP, fill: true });
  }
  const looked = props.selected === null ? undefined : run.plants.get(props.selected);
  if (looked && run.plantRange(looked) > 0) {
    rings.push({
      x: looked.x,
      y: looked.y,
      r: run.plantRange(looked),
      color: LANTERN,
      fill: false,
    });
  } else if (props.tool && props.hover && specs[props.tool].range > 0) {
    rings.push({
      x: props.hover.x,
      y: props.hover.y,
      r: specs[props.tool].range,
      color: LANTERN,
      fill: false,
    });
  }
  const key = `${rings.map((r) => `${r.x},${r.y},${r.r},${r.color}`).join(';')}|${c}`;
  if (key === reachKey) return;
  reachKey = key;
  const g = reachG!;
  g.clear();
  for (const r of rings) {
    const cx = (r.x + 0.5) * c;
    const cy = (r.y + 0.5) * c;
    if (r.fill) g.circle(cx, cy, r.r * c).fill({ color: r.color, alpha: 0.06 });
    g.circle(cx, cy, r.r * c).stroke({ width: 1.5, color: r.color, alpha: r.fill ? 0.3 : 0.75 });
  }
}

function frame(dt: number): void {
  if (!app || !pestLayer || !shotLayer || !skyLayer || !fxLayer) return;
  clock += dt;
  const run = props.run;
  const c = app.screen.width / run.grid.width;
  redrawTrail(c);
  redrawReach(c);

  const k = 1 - Math.exp(-EASE * dt);
  const live = new Set<number>();
  for (const p of run.pests) {
    if (!p.alive) continue;
    live.add(p.id);
    let b = bodies.get(p.id);
    if (!b) {
      const root = new Container();
      const g = new Graphics();
      drawPest(g, p.kind, c);
      const hp = new Graphics();
      root.addChild(g, hp);
      (p.flying ? skyLayer : pestLayer).addChild(root);
      b = { root, g, hp, rx: p.px, ry: p.py, lastHp: -1 };
      bodies.set(p.id, b);
    }
    const dx = p.px - b.rx;
    const dy = p.py - b.ry;
    b.rx += dx * k;
    b.ry += dy * k;
    if (Math.abs(dx) + Math.abs(dy) > 0.002) b.g.rotation = Math.atan2(dy, dx);
    if (p.flying) b.g.scale.y = 0.45 + 0.55 * Math.abs(Math.sin(clock * 14 + p.id));
    b.root.x = b.rx * c;
    b.root.y = b.ry * c;
    if (b.lastHp !== p.hp) {
      b.lastHp = p.hp;
      drawHp(b.hp, p, c);
    }
  }
  for (const [id, b] of bodies) {
    if (live.has(id)) continue;
    const atSeedbed = Math.hypot(b.rx - run.seedbed.x - 0.5, b.ry - run.seedbed.y - 0.5) < 0.8;
    puff(b.root.x, b.root.y, atSeedbed ? LOSS : COMPOST, c * (atSeedbed ? 0.45 : 0.25));
    b.root.destroy({ children: true });
    bodies.delete(id);
  }

  const flying = new Set<number>();
  for (const s of run.shots) {
    flying.add(s.id);
    let e = shots.get(s.id);
    if (!e) {
      const g = new Graphics();
      if (s.splash > 0) {
        g.circle(0, 0, c * 0.09).fill(0xc8312a);
        g.circle(c * 0.03, -c * 0.02, c * 0.025).fill(0x191510);
      } else if (s.form === 'hawk') {
        // A pipistrelle, wings swept back.
        g.poly([
          c * 0.1,
          0,
          -c * 0.02,
          -c * 0.16,
          -c * 0.06,
          -c * 0.05,
          -c * 0.1,
          0,
          -c * 0.06,
          c * 0.05,
          -c * 0.02,
          c * 0.16,
        ]).fill(MOON);
      } else {
        g.poly([c * 0.12, 0, -c * 0.08, -c * 0.04, -c * 0.08, c * 0.04]).fill(0x8a6a45);
      }
      shotLayer.addChild(g);
      e = { g, shot: s };
      shots.set(s.id, e);
    }
    e.shot = s;
    e.g.x = s.px * c;
    e.g.y = s.py * c;
    if (s.splash === 0) {
      const target = s.targetId === null ? null : run.pests.find((u) => u.id === s.targetId);
      e.g.rotation = Math.atan2((target?.py ?? s.ay) - s.py, (target?.px ?? s.ax) - s.px);
    }
  }
  for (const [id, e] of shots) {
    if (flying.has(id)) continue;
    if (e.shot.splash > 0) puff(e.shot.ax * c, e.shot.ay * c, 0xc8312a, e.shot.splash * c);
    e.g.destroy();
    shots.delete(id);
  }

  for (let i = fxs.length - 1; i >= 0; i--) {
    const f = fxs[i];
    f.life -= dt;
    const t = 1 - f.life / f.max;
    f.g.alpha = 1 - t;
    f.g.scale.set(0.6 + t * 0.6);
    if (f.life <= 0) {
      f.g.destroy();
      fxs.splice(i, 1);
    }
  }
}

onMounted(async () => {
  const el = host.value;
  if (!el) return;
  const application = new Application();
  await application.init({
    resizeTo: el,
    backgroundAlpha: 0,
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
  trailG = new Graphics();
  reachG = new Graphics();
  pestLayer = new Container();
  shotLayer = new Container();
  skyLayer = new Container();
  fxLayer = new Container();
  app.stage.addChild(trailG, reachG, fxLayer, pestLayer, shotLayer, skyLayer);
  app.ticker.add((tk) => frame(tk.deltaMS / 1000));
});

onBeforeUnmount(() => {
  bodies.clear();
  shots.clear();
  fxs.length = 0;
  app?.destroy(true, { children: true });
  app = null;
  trailG = reachG = null;
  pestLayer = shotLayer = skyLayer = fxLayer = null;
});
</script>

<template>
  <div ref="host" class="wg-pests" aria-hidden="true" />
</template>

<style scoped>
.wg-pests {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.wg-pests :deep(canvas) {
  display: block;
}
</style>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, useTemplateRef } from 'vue';
import { Application, Assets, Container, Graphics, Sprite, TilingSprite, Texture } from 'pixi.js';
import { useModule } from '@/composables/useModule';
import { TacticalKey, SIDES, type Side } from '../modules';
import { FIELD, BASE_HP, type UnitTypeId } from '../data/tactical';
import unitUrl from '../assets/unit-soldier.png';
import keepUrl from '../assets/keep.png';
import groundUrl from '../assets/ground-grass.png';

/**
 * The render layer (bone #4) — a pure read-only projection of the tactical sim
 * onto a pixi/webgl field. It OWNS its frame loop (pixi's ticker → RAF) and
 * reads the sim's reactive refs as plain values each frame, so render runs
 * decoupled from both Vue's reactive re-render and the fixed-step engine tick:
 * the sim is authoritative at ~20Hz, this interpolates toward it at display
 * rate. It never writes sim state — the Spring-shaped separation (sim resolves,
 * render draws) made literal.
 *
 * Pixi objects are held in plain `let`s, never Vue refs — wrapping them in a
 * reactive proxy corrupts pixi's internal bookkeeping.
 */

const tactical = useModule(TacticalKey);
const host = useTemplateRef<HTMLDivElement>('host');

// Heraldry — the faction read. Light-gray sprites (unit + keep) tint cleanly to
// these; everything else on the field is earthen so the two hosts pop.
const TINT: Record<Side, number> = { a: 0xd9524b, b: 0x4f86d6 };
const TYPE_SCALE: Record<UnitTypeId, number> = {
  trooper: 1.0,
  archer: 0.88,
  cavalry: 1.25,
};

const TYPE_TINT: Record<Side, Record<UnitTypeId, number>> = {
  a: {
    trooper: 0xd9524b,
    archer: 0xf27d74,
    cavalry: 0x9e241e,
  },
  b: {
    trooper: 0x4f86d6,
    archer: 0x7da8ed,
    cavalry: 0x275296,
  },
};
// Display sizes in FIELD units (the world container carries field→pixel scale).
const UNIT_SIZE = 4.6;
const KEEP_SIZE = 13;
const TEX_PX = 64; // source sprite edge
// Render position eases toward sim truth at this rate (1/s); framerate-independent
// via 1 - e^(-k·dt). High enough to feel tight, low enough to smooth the 20Hz step.
const SMOOTH = 16;

let app: Application | null = null;
let ro: ResizeObserver | null = null;
let unitTex: Texture;
/** World container: children are positioned in FIELD units; it holds the
 *  letterbox offset + uniform field→pixel scale so nothing else does math. */
let world: Container | null = null;
let unitLayer: Container | null = null;
const keeps = {} as Record<Side, { sprite: Sprite; bar: Graphics }>;
/** Rendered unit sprites keyed by the sim's globally-unique unit id, with the
 *  eased render position that lags the authoritative sim position. */
const sprites = new Map<number, { sprite: Sprite; rx: number; ry: number }>();

/** Fit the FIELD rect into the current canvas with uniform scale + centering. */
function layoutWorld(): void {
  if (!app || !world) return;
  const { width: cw, height: ch } = app.screen;
  const pad = 0.04 * Math.min(cw, ch);
  const scale = Math.min((cw - 2 * pad) / FIELD.width, (ch - 2 * pad) / FIELD.height);
  world.scale.set(scale);
  world.x = (cw - FIELD.width * scale) / 2;
  world.y = (ch - FIELD.height * scale) / 2;
}

function frame(dtSec: number): void {
  if (!world || !unitLayer) return;
  const k = 1 - Math.exp(-SMOOTH * dtSec);

  // Keeps: static position, health bar + fade track baseHp.
  for (const side of SIDES) {
    const frac = Math.max(0, tactical.baseHp[side].value / BASE_HP);
    const keep = keeps[side];
    keep.sprite.alpha = 0.55 + 0.45 * frac; // wounded keep dims
    const bw = KEEP_SIZE;
    const bx = keep.sprite.x - bw / 2;
    const by = keep.sprite.y - KEEP_SIZE * 0.72;
    keep.bar
      .clear()
      .rect(bx, by, bw, 1.4)
      .fill({ color: 0x000000, alpha: 0.4 })
      .rect(bx, by, bw * frac, 1.4)
      .fill({ color: TINT[side], alpha: 0.95 });
  }

  // Units: reconcile sprite set against the live arrays, then ease toward truth.
  const seen = new Set<number>();
  for (const side of SIDES) {
    const facing = side === 'a' ? 1 : -1;
    const s = (UNIT_SIZE / TEX_PX) * facing;
    for (const u of tactical.units[side].value) {
      seen.add(u.id);
      let rec = sprites.get(u.id);
      if (!rec) {
        const typeScale = TYPE_SCALE[u.type] ?? 1.0;
        const sprite = new Sprite(unitTex);
        sprite.anchor.set(0.5, 0.5);
        sprite.scale.set(s * typeScale, (UNIT_SIZE / TEX_PX) * typeScale);
        sprite.tint = TYPE_TINT[side][u.type] ?? TINT[side];
        unitLayer.addChild(sprite);
        rec = { sprite, rx: u.x, ry: u.y }; // new units snap to spawn
        sprites.set(u.id, rec);
      }
      rec.rx += (u.x - rec.rx) * k;
      rec.ry += (u.y - rec.ry) * k;
      rec.sprite.x = rec.rx;
      rec.sprite.y = rec.ry;
    }
  }
  for (const [id, rec] of sprites) {
    if (!seen.has(id)) {
      rec.sprite.destroy();
      sprites.delete(id);
    }
  }
}

onMounted(async () => {
  const el = host.value;
  if (!el) return;

  const application = new Application();
  await application.init({
    resizeTo: el,
    backgroundColor: 0x2b2620, // dusk earth, so the tan field reads warm not white
    antialias: false,
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

  const [unit, keepTexLoaded, ground] = await Promise.all([
    Assets.load<Texture>(unitUrl),
    Assets.load<Texture>(keepUrl),
    Assets.load<Texture>(groundUrl),
  ]);
  for (const t of [unit, keepTexLoaded, ground]) t.source.scaleMode = 'nearest'; // crisp pixel art
  unitTex = unit;

  world = new Container();
  app.stage.addChild(world);

  // Earthen ground tiled across the field, with a faint border to seat it.
  const groundTile = new TilingSprite({
    texture: ground,
    width: FIELD.width,
    height: FIELD.height,
  });
  groundTile.tileScale.set(6 / TEX_PX); // ~6 field-units per tile
  groundTile.tint = 0xb7a888;
  world.addChild(groundTile);
  world.addChild(
    new Graphics()
      .rect(0, 0, FIELD.width, FIELD.height)
      .stroke({ color: 0x000000, alpha: 0.35, width: 0.6 }),
  );

  // Keeps — one per side at its base position, tinted, with a health bar above.
  for (const side of SIDES) {
    const sprite = new Sprite(keepTexLoaded);
    sprite.anchor.set(0.5, 0.5);
    sprite.setSize(KEEP_SIZE, KEEP_SIZE);
    sprite.tint = TINT[side];
    sprite.x = tactical.basePos[side].x;
    sprite.y = tactical.basePos[side].y;
    world.addChild(sprite);
    const bar = new Graphics();
    world.addChild(bar);
    keeps[side] = { sprite, bar };
  }

  unitLayer = new Container();
  world.addChild(unitLayer);

  layoutWorld();
  ro = new ResizeObserver(() => layoutWorld());
  ro.observe(el);

  app.ticker.add((tk) => frame(tk.deltaMS / 1000));
});

onBeforeUnmount(() => {
  ro?.disconnect();
  ro = null;
  sprites.clear();
  app?.destroy(true, { children: true });
  app = null;
  world = null;
  unitLayer = null;
});
</script>

<template>
  <div ref="host" class="play-field" aria-label="Skirmish battlefield" role="img" />
</template>

<style scoped>
.play-field {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  border-radius: var(--radius);
  overflow: hidden;
  background: #2b2620;
}
.play-field :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>

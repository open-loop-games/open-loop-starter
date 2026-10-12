<!--
  ChartPanel — the fogged chart, the story's signature. Every charted tile the
  huntsman can walk to and still get home from is lit and fenced by a dashed
  tallow contour, the "last light". Ground past it dims; ground whose terrain
  needs gear he lacks is hatched. Hovering a tile previews the route and prints
  both jerky costs.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { MAP_H, MAP_W, TERRAIN, speciesById } from '../../data';
import { getHuntsman, getWold } from '../../modules';

const wold = getWold();
const man = getHuntsman();
const hovered = ref<number | null>(null);

const FEATURE_GLYPH: Record<string, string> = {
  lodge: '⌂',
  waystone: '△',
  lookout: '⩚',
  cache: '✱',
  lair: '✦',
};

type Reach = 'tether' | 'beyond' | 'barred' | 'none';

interface TileView {
  i: number;
  explored: boolean;
  cls: string[];
  glyph: string;
  glyphCls: string;
  pips: number;
  title: string;
}

/** Jerky from here to each tile and from each tile home; the tether is where the two fit in the satchel. */
const fields = computed(() => {
  void wold.mapVersion.value;
  void man.pos.value;
  void wold.camps.value.length;
  void wold.stepCost.value;
  return { here: man.hereField(), home: wold.homeField() };
});

const supply = computed(() => toNumber(man.supply.value));

const view = computed<TileView[]>(() => {
  void wold.mapVersion.value;
  const { here, home } = fields.value;
  const inTether = (i: number) =>
    Number.isFinite(here[i]) && here[i] + home[i] <= supply.value + 1e-9;
  const pos = man.pos.value;
  const out: TileView[] = [];
  for (let i = 0; i < wold.tiles.length; i++) {
    const t = wold.tiles[i];
    const x = i % MAP_W;
    const y = Math.floor(i / MAP_W);
    const explored = wold.grid.explored[i] === 1;
    const cls: string[] = [];
    let glyph = '';
    let glyphCls = '';
    let pips = 0;
    let title = 'Unknown country';
    if (explored) {
      cls.push(t.blocked ? 'blocked' : t.terrain);
      let reach: Reach = 'none';
      if (!t.blocked) {
        if (!wold.hasGearFor(t)) reach = 'barred';
        else reach = inTether(i) ? 'tether' : 'beyond';
      }
      cls.push(`r-${reach}`);
      if (reach === 'tether') {
        for (const [dx, dy, side] of [
          [0, -1, 't'],
          [1, 0, 'r'],
          [0, 1, 'b'],
          [-1, 0, 'l'],
        ] as const) {
          const nx = x + dx;
          const ny = y + dy;
          // The last light marks open, charted ground you cannot reach and return from — not rocks or fog.
          if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
          const ni = ny * MAP_W + nx;
          const nt = wold.tiles[ni];
          const inside =
            nt.blocked || wold.grid.explored[ni] === 0 || (wold.hasGearFor(nt) && inTether(ni));
          if (!inside) cls.push(`edge-${side}`);
        }
      }
      const terrain = TERRAIN[t.band];
      title = t.blocked ? terrain.obstacle : terrain.displayName;
      if (t.feature) {
        glyph = FEATURE_GLYPH[t.feature];
        glyphCls = `f-${t.feature}`;
        if (t.feature === 'waystone' && wold.isCamp(i)) {
          glyph = '▲';
          glyphCls += ' camp';
          title += ' · camp';
        } else if (
          (t.feature === 'cache' || t.feature === 'lookout') &&
          wold.looted.value.includes(i)
        ) {
          glyphCls += ' spent';
        }
        title += ` · ${t.feature === 'lair' ? 'the Hart’s lair' : t.feature}`;
      } else if (t.herd) {
        const s = speciesById.get(t.herd)!;
        pips = wold.stock.value[i];
        glyph = s.glyph;
        glyphCls = s.dangerous ? 'q-danger' : 'q-timid';
        if (pips === 0) glyphCls += ' spent';
        title += ` · ${s.displayName} ×${pips}`;
      }
      if (!t.blocked && !wold.hasGearFor(t)) title += ` · needs ${terrain.needs}`;
    } else {
      cls.push('fog');
    }
    if (x === pos.x && y === pos.y) cls.push('hunter');
    out.push({ i, explored, cls, glyph, glyphCls, pips, title });
  }
  return out;
});

const preview = computed(() => {
  const i = hovered.value;
  if (i == null) return null;
  const route = man.routeTo({ x: i % MAP_W, y: Math.floor(i / MAP_W) });
  const { here, home } = fields.value;
  return {
    cells: new Set((route ?? []).map((c) => c.y * MAP_W + c.x)),
    ok: route != null,
    out: here[i],
    back: home[i],
    label: view.value[i].title,
  };
});

function click(i: number): void {
  man.walkTo({ x: i % MAP_W, y: Math.floor(i / MAP_W) });
}
</script>

<template>
  <section class="chart">
    <div
      class="board"
      :style="{ gridTemplateColumns: `repeat(${MAP_W}, var(--sp-tile))` }"
      @mouseleave="hovered = null"
    >
      <Button
        v-for="v in view"
        :key="v.i"
        as="div"
        class="tile"
        :class="[...v.cls, { route: preview?.cells.has(v.i) }]"
        :title="v.title"
        :aria-label="v.title"
        @mouseenter="hovered = v.i"
        @click="click(v.i)"
      >
        <span v-if="v.glyph" class="glyph" :class="v.glyphCls">{{ v.glyph }}</span>
        <span v-if="v.pips > 1" class="pips"><i v-for="k in v.pips" :key="k" /></span>
      </Button>
    </div>
    <div class="readout">
      <template v-if="preview && preview.ok">
        <span class="where">{{ preview.label }}</span>
        <span class="sp-num"
          >walk <b>{{ Math.round(preview.out * 10) / 10 }}</b></span
        >
        <span class="sp-num"
          >home from there <b>{{ Math.round(preview.back * 10) / 10 }}</b></span
        >
        <span :class="preview.out + preview.back <= supply ? 'ok' : 'warn'">
          {{
            preview.out + preview.back <= supply
              ? 'within the tether'
              : 'past the tether — you will not walk back'
          }}
        </span>
      </template>
      <template v-else-if="preview">
        <span class="where">{{ preview.label }}</span>
        <span class="dim">no charted way there</span>
      </template>
      <template v-else>
        <span class="dim">
          The lit ground is what your jerky can reach and still bring you home. Click a tile to
          walk.
        </span>
      </template>
    </div>
  </section>
</template>

<style scoped>
.chart {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.board {
  /* Tiles shrink to fit the column: 22 gaps, the padding and the border take 40px. */
  --sp-tile: min(27px, calc((100cqw - 40px) / 23));
  display: grid;
  grid-auto-rows: var(--sp-tile);
  gap: 1px;
  padding: 8px;
  background: var(--sp-fog);
  border: 1px solid var(--sp-bark-edge);
  box-shadow: inset 0 0 40px #000;
  user-select: none;
}
.tile {
  position: relative;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: var(--sp-fog);
  transition: opacity 400ms ease-out;
}
.tile.fog {
  cursor: default;
}
.meadow {
  background: var(--sp-ground-meadow);
}
.forest {
  background: var(--sp-ground-forest);
}
.marsh {
  background: var(--sp-ground-marsh);
}
.snow {
  background: var(--sp-ground-snow);
}
.deepwood {
  background: var(--sp-ground-deepwood);
}
.blocked {
  background: var(--sp-ground-blocked);
  cursor: default;
}
.blocked::after {
  content: '';
  position: absolute;
  inset: 9px;
  border-radius: 50%;
  background: #1c1a15;
}
/* beyond the tether: the ground dims to ash */
.r-beyond {
  opacity: 0.42;
}
.r-barred {
  opacity: 0.26;
  background-image: repeating-linear-gradient(45deg, transparent 0 4px, #0006 4px 6px);
  cursor: not-allowed;
}
/* the last-light contour around the tether */
.r-tether::after {
  content: '';
  position: absolute;
  inset: -1px;
  border: 0 dashed var(--sp-tallow);
  pointer-events: none;
}
.edge-t::after {
  border-top-width: 2px;
}
.edge-b::after {
  border-bottom-width: 2px;
}
.edge-l::after {
  border-left-width: 2px;
}
.edge-r::after {
  border-right-width: 2px;
}
.route {
  outline: 1px solid var(--sp-ember);
  outline-offset: -4px;
}
.tile:not(.fog):not(.blocked):hover {
  filter: brightness(1.25);
}

.glyph {
  font-weight: 600;
  font-size: 15px;
  line-height: 1;
  color: var(--sp-birch);
  pointer-events: none;
}
.q-timid {
  font-style: italic;
}
.q-danger {
  color: var(--sp-rust);
  font-weight: 700;
}
.f-lodge {
  color: var(--sp-tallow);
  font-size: 18px;
}
.f-waystone {
  color: var(--sp-birch-dim);
}
.f-waystone.camp {
  color: var(--sp-tallow);
}
.f-lookout,
.f-cache {
  color: var(--sp-frost);
}
.f-lair {
  color: #f3f0e6;
  font-size: 17px;
  text-shadow: 0 0 6px #fff8;
}
.spent {
  opacity: 0.35;
}
.pips {
  position: absolute;
  top: 3px;
  right: 3px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  pointer-events: none;
}
.pips i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--sp-tallow-deep);
}
.hunter::before {
  content: '';
  position: absolute;
  inset: 3px;
  border: 2px solid var(--sp-tallow);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--sp-tallow);
  pointer-events: none;
}

.readout {
  min-height: 22px;
  display: flex;
  gap: 14px;
  font-size: 14px;
  color: var(--sp-birch-dim);
}
.readout b {
  color: var(--sp-birch);
  font-weight: 600;
}
.where {
  color: var(--sp-birch);
  font-weight: 600;
}
.ok {
  color: var(--sp-tallow);
}
.warn {
  color: var(--sp-rust);
}
.dim {
  color: var(--sp-ash);
  font-style: italic;
}
</style>

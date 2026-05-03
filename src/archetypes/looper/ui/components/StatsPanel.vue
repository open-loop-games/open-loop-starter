<script setup lang="ts">
/**
 * StatsPanel — 9-stat progression column with grid + radar views.
 *
 * Dual purple/orange bars per stat (level --progress-exp / talent
 * --progress-talent) with reka HoverCard tooltips. RadioGroup toggles
 * between a flex-wrap grid and a canvas radar chart (~60 LOC of
 * canvas 2d, no chart-library dep).
 *
 * Slim demo carries no skills, buffs, or soulstones — the Squirrel-style
 * sections in the canonical idle-loops-ng panel are dropped here.
 *
 * Reference: idle-loops-ng/src/ui/components/StatsPanel.vue,
 * idle-loops-omsi/loops/views/main.view.js (statsgraph.js).
 */

import { computed, onMounted, ref, watch } from 'vue';
import {
  HoverCardContent,
  HoverCardPortal,
  HoverCardRoot,
  HoverCardTrigger,
  RadioGroupIndicator,
  RadioGroupItem,
  RadioGroupRoot,
} from 'reka-ui';
import { formatWhole } from 'open-loop-engine';
import { useStats } from '../../composables/useStats';

const {
  stats: statDefs,
  getStatLevel,
  getTalentLevel,
  getTalentMult,
  getStatXPProgress,
  getTalentXPProgress,
  getLevelXPWindow,
  getTalentXPWindow,
} = useStats();

const statList = statDefs.map((s) => s.id);

type ViewMode = 'grid' | 'radar';
const viewMode = ref<ViewMode>('grid');

interface StatTooltip {
  name: string;
  level: string;
  levelXp: string;
  levelPct: string;
  talentLevel: string;
  talentXp: string;
  talentPct: string;
  talentMult: string;
  totalMult: string;
}

const statTooltips = computed<Record<string, StatTooltip>>(() => {
  const out: Record<string, StatTooltip> = {};
  for (const name of statList) {
    const levelXP = getLevelXPWindow(name);
    const talentXP = getTalentXPWindow(name);
    const talentMult = getTalentMult(name);
    out[name] = {
      name,
      level: formatWhole(getStatLevel(name)),
      levelXp: `${formatWhole(levelXP.current)} / ${formatWhole(levelXP.needed)}`,
      levelPct: `${(getStatXPProgress(name) * 100).toFixed(1)}%`,
      talentLevel: formatWhole(getTalentLevel(name)),
      talentXp: `${formatWhole(talentXP.current)} / ${formatWhole(talentXP.needed)}`,
      talentPct: `${(getTalentXPProgress(name) * 100).toFixed(1)}%`,
      talentMult: `×${talentMult.toFixed(2)}`,
      // Slim demo: no soulstones, so totalBonusXP === talentMult.
      totalMult: `×${talentMult.toFixed(2)}`,
    };
  }
  return out;
});

// ── Radar chart — minimal canvas draw ──────────────────────────────────────

const canvasRef = ref<HTMLCanvasElement | null>(null);
const RADAR_SIZE = 260;
const RADAR_PAD = 36;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function drawRadar() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) / 2 - RADAR_PAD;
  const axes = statList.length;

  ctx.clearRect(0, 0, w, h);

  // OMSI normalization (statsgraph.js:74-94): scale bonus% into the level
  // range via radarModifier = highestLevel / highestXPpct so both polygons
  // fill comparable space at any game stage. Fallback to 1 to avoid NaN.
  const levels: number[] = [];
  const bonusPcts: number[] = [];
  let highestLevel = 0;
  let highestXP = 0;
  for (const name of statList) {
    const lvl = getStatLevel(name).toNumber();
    const bonusPct = (getTalentMult(name).toNumber() - 1) * 100;
    levels.push(lvl);
    bonusPcts.push(bonusPct);
    if (lvl > highestLevel) highestLevel = lvl;
    if (bonusPct > highestXP) highestXP = bonusPct;
  }
  const radarModifier = highestLevel === 0 || highestXP === 0 ? 1 : highestLevel / highestXP;
  const bonuses = bonusPcts.map((p) => p * radarModifier);
  const maxVal = Math.max(1, highestLevel, ...bonuses);

  ctx.strokeStyle = 'rgba(160, 160, 180, 0.25)';
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 4; ring++) {
    const r = (radius * ring) / 4;
    ctx.beginPath();
    for (let i = 0; i < axes; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / axes;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(160, 160, 180, 0.35)';
  ctx.fillStyle = 'rgba(220, 220, 230, 0.85)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < axes; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / axes;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
    const labelX = cx + Math.cos(a) * (radius + 16);
    const labelY = cy + Math.sin(a) * (radius + 16);
    ctx.fillText(statList[i], labelX, labelY);
  }

  const drawPoly = (values: number[], color: string) => {
    ctx.beginPath();
    for (let i = 0; i < axes; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / axes;
      const r = maxVal > 0 ? (values[i] / maxVal) * radius : 0;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color + '33';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  drawPoly(bonuses, cssVar('--progress-talent'));
  drawPoly(levels, cssVar('--progress-exp'));
}

onMounted(() => {
  if (viewMode.value === 'radar') drawRadar();
});

watch(viewMode, (mode) => {
  if (mode === 'radar') requestAnimationFrame(drawRadar);
});

const radarPulse = computed(() => {
  let acc = 0;
  for (const name of statList) {
    acc += getStatLevel(name).toNumber() + getTalentMult(name).toNumber();
  }
  return acc;
});

watch(radarPulse, () => {
  if (viewMode.value === 'radar') drawRadar();
});
</script>

<template>
  <section
    class="stats-panel"
    data-testid="stats-panel"
  >
    <header class="panel-header">
      <h4 class="section-title">
        Stats
      </h4>
      <RadioGroupRoot
        v-model="viewMode"
        class="view-toggle"
        :default-value="'grid'"
      >
        <RadioGroupItem
          value="grid"
          class="view-button"
          aria-label="Grid view"
        >
          <RadioGroupIndicator />
          Grid
        </RadioGroupItem>
        <RadioGroupItem
          value="radar"
          class="view-button"
          aria-label="Radar view"
        >
          <RadioGroupIndicator />
          Radar
        </RadioGroupItem>
      </RadioGroupRoot>
    </header>

    <section
      v-if="viewMode === 'grid'"
      class="stats-grid"
    >
      <HoverCardRoot
        v-for="name in statList"
        :key="name"
      >
        <HoverCardTrigger as-child>
          <div
            class="stat-tile"
            :data-testid="`stat-${name}`"
          >
            <div class="stat-tile-header">
              <span class="stat-name">{{ name }}</span>
              <span
                class="stat-level"
                :data-testid="`stat-level-${name}`"
              >{{
                formatWhole(getStatLevel(name))
              }}</span>
              <span
                class="stat-talent"
                :data-testid="`stat-talent-${name}`"
              >
                T{{ formatWhole(getTalentLevel(name)) }}
              </span>
            </div>
            <div class="stat-bars">
              <div class="bar-track">
                <div
                  class="bar-fill level-fill"
                  :style="{ width: getStatXPProgress(name) * 100 + '%' }"
                />
              </div>
              <div class="bar-track">
                <div
                  class="bar-fill talent-fill"
                  :style="{ width: getTalentXPProgress(name) * 100 + '%' }"
                />
              </div>
            </div>
          </div>
        </HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent
            class="hovercard"
            :side-offset="8"
          >
            <div class="hc-title">
              {{ statTooltips[name]?.name }}
            </div>
            <dl class="hc-rows">
              <div class="hc-row">
                <dt>Level</dt>
                <dd>{{ statTooltips[name]?.level }}</dd>
              </div>
              <div class="hc-row">
                <dt>Level XP</dt>
                <dd>{{ statTooltips[name]?.levelXp }} ({{ statTooltips[name]?.levelPct }})</dd>
              </div>
              <div class="hc-row">
                <dt>Talent</dt>
                <dd>{{ statTooltips[name]?.talentLevel }}</dd>
              </div>
              <div class="hc-row">
                <dt>Talent XP</dt>
                <dd>{{ statTooltips[name]?.talentXp }} ({{ statTooltips[name]?.talentPct }})</dd>
              </div>
              <div class="hc-row">
                <dt>Talent mult</dt>
                <dd>{{ statTooltips[name]?.talentMult }}</dd>
              </div>
              <div class="hc-row total">
                <dt>Total bonus</dt>
                <dd>{{ statTooltips[name]?.totalMult }}</dd>
              </div>
            </dl>
            <p class="hc-note">
              <em>Level resets each loop and cuts action cost. Talent persists and speeds up
                XP-gain.</em>
            </p>
          </HoverCardContent>
        </HoverCardPortal>
      </HoverCardRoot>
    </section>

    <section
      v-else
      class="radar-view"
    >
      <canvas
        ref="canvasRef"
        :width="RADAR_SIZE"
        :height="RADAR_SIZE"
        class="radar-canvas"
      />
      <div class="radar-legend">
        <span class="legend-swatch level" /> Level <span class="legend-swatch talent" /> Bonus XP
        (%)
      </div>
    </section>
  </section>
</template>

<style scoped>
.stats-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-height: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--gap-sm);
  border-bottom: 1px solid var(--color-border);
}

.section-title {
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  margin: 0;
}

.view-toggle {
  display: flex;
  gap: 2px;
}

.view-button {
  padding: 3px 10px;
  font-size: 0.75em;
  font-weight: 600;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.view-button:hover {
  background: var(--color-surface-hover);
}

.view-button[data-state='checked'] {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.stats-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stat-tile {
  flex: 1 1 110px;
  min-width: 100px;
  max-width: 160px;
  padding: 6px 8px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: help;
}

.stat-tile-header {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.stat-name {
  font-weight: 700;
  font-size: 0.85em;
  flex: 1 1 auto;
}

.stat-level {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--progress-exp);
}

.stat-talent {
  font-size: 0.72em;
  color: var(--progress-talent);
  font-variant-numeric: tabular-nums;
}

.stat-bars {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
}

.bar-track {
  height: 5px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 0.15s linear;
}

.level-fill {
  background: var(--progress-exp);
}

.talent-fill {
  background: var(--progress-talent);
}

.radar-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap-sm);
}

.radar-canvas {
  display: block;
  width: 260px;
  height: 260px;
}

.radar-legend {
  display: flex;
  align-items: center;
  gap: var(--gap);
  font-size: 0.75em;
  color: var(--color-text-muted);
}

.legend-swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: middle;
}

.legend-swatch.level {
  background: var(--progress-exp);
}

.legend-swatch.talent {
  background: var(--progress-talent);
}

:global(.hovercard) {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 10px 14px;
  min-width: 220px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  font-size: 0.82em;
  z-index: 100;
}

:global(.hovercard .hc-title) {
  font-weight: 700;
  font-size: 1em;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
}

:global(.hovercard .hc-rows) {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 12px;
  margin: 0;
}

:global(.hovercard .hc-row) {
  display: contents;
}

:global(.hovercard .hc-row dt) {
  color: var(--color-text-muted);
}

:global(.hovercard .hc-row dd) {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

:global(.hovercard .hc-row.total dt),
:global(.hovercard .hc-row.total dd) {
  font-weight: 700;
  padding-top: 3px;
  border-top: 1px solid var(--color-border);
  margin-top: 3px;
}

:global(.hovercard .hc-note) {
  margin: 6px 0 0;
  font-size: 0.9em;
  color: var(--color-text-muted);
}
</style>

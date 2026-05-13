<script setup lang="ts">
import { computed } from 'vue';
import { useLane, useMatch } from '../../composables';
import { useModule } from '@/composables/useModule';
import { TugDataKey, type Side, type UnitInstance } from '../../modules';

/**
 * Declared-invention front-line indicator. Renders a horizontal lane with
 * both fortresses on opposite ends; per-side unit dots positioned by their
 * lane position; a frontline marker at the foremost position per side.
 *
 * Position convention (matches `lane.ts`): player spawns at 0 (left), AI
 * spawns at `laneLength` (right). `useLane().normalize(pos)` collapses to
 * 0..1 left→right.
 */
const lane = useLane();
const data = useModule(TugDataKey);
const match = useMatch();

const playerLabel = 'Terran';
const aiLabel = 'Protoss';

interface DotView {
  id: string;
  side: Side;
  archetypeId: string;
  leftPct: number;
  hpPct: number;
}

function dotsFor(side: Side, units: ReadonlyArray<UnitInstance>): DotView[] {
  const out: DotView[] = [];
  for (const u of units) {
    const def = data.units.find((d) => d.id === u.archetypeId);
    if (!def) continue;
    out.push({
      id: u.id,
      side,
      archetypeId: u.archetypeId,
      leftPct: lane.normalize(u.position) * 100,
      hpPct: Math.max(0, Math.min(1, u.hp / def.hp)) * 100,
    });
  }
  return out;
}

const playerDots = computed(() => dotsFor('player', lane.units.player.value));
const aiDots = computed(() => dotsFor('ai', lane.units.ai.value));

const playerFrontPct = computed(() => lane.normalize(lane.frontline.player.value) * 100);
const aiFrontPct = computed(() => lane.normalize(lane.frontline.ai.value) * 100);

const matchTimeLabel = computed(() => {
  const sec = Math.floor(match.matchTimeElapsed.value);
  const min = Math.floor(sec / 60);
  return `${min}:${String(sec % 60).padStart(2, '0')}`;
});
</script>

<template>
  <div class="lane-strip">
    <div class="lane-strip__chrome">
      <span class="lane-strip__label lane-strip__label--player">
        {{ playerLabel }}
      </span>
      <span class="lane-strip__match-time">
        Match {{ matchTimeLabel }} — pivots {{ match.counterPivotsThisMatch.value }}
      </span>
      <span class="lane-strip__label lane-strip__label--ai">
        {{ aiLabel }}
      </span>
    </div>
    <div class="lane-strip__lane">
      <div class="lane-strip__fortress lane-strip__fortress--left" />
      <div class="lane-strip__fortress lane-strip__fortress--right" />
      <div
        class="lane-strip__frontline lane-strip__frontline--player"
        :style="{ left: playerFrontPct + '%' }"
        :title="`${playerLabel} frontline`"
      />
      <div
        class="lane-strip__frontline lane-strip__frontline--ai"
        :style="{ left: aiFrontPct + '%' }"
        :title="`${aiLabel} frontline`"
      />
      <div
        v-for="dot in playerDots"
        :key="dot.id"
        class="lane-strip__dot lane-strip__dot--player"
        :style="{ left: dot.leftPct + '%' }"
        :title="dot.archetypeId"
      >
        <div
          class="lane-strip__dot-hp"
          :style="{ width: dot.hpPct + '%' }"
        />
      </div>
      <div
        v-for="dot in aiDots"
        :key="dot.id"
        class="lane-strip__dot lane-strip__dot--ai"
        :style="{ left: dot.leftPct + '%' }"
        :title="dot.archetypeId"
      >
        <div
          class="lane-strip__dot-hp"
          :style="{ width: dot.hpPct + '%' }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.lane-strip {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--gap-sm) var(--gap);
}

.lane-strip__chrome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85em;
  color: var(--color-text-muted, var(--color-text));
}

.lane-strip__label--player {
  color: var(--color-primary, #4a9eff);
  font-weight: 600;
}

.lane-strip__label--ai {
  color: var(--color-danger, #e54c4c);
  font-weight: 600;
}

.lane-strip__match-time {
  font-variant-numeric: tabular-nums;
}

.lane-strip__lane {
  position: relative;
  flex: 1 1 auto;
  min-height: 64px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: calc(var(--radius) * 0.5);
}

.lane-strip__fortress {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
}

.lane-strip__fortress--left {
  left: 0;
  background: var(--color-primary, #4a9eff);
  border-radius: calc(var(--radius) * 0.5) 0 0 calc(var(--radius) * 0.5);
}

.lane-strip__fortress--right {
  right: 0;
  background: var(--color-danger, #e54c4c);
  border-radius: 0 calc(var(--radius) * 0.5) calc(var(--radius) * 0.5) 0;
}

.lane-strip__frontline {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  pointer-events: none;
  opacity: 0.6;
}

.lane-strip__frontline--player {
  background: var(--color-primary, #4a9eff);
}

.lane-strip__frontline--ai {
  background: var(--color-danger, #e54c4c);
}

.lane-strip__dot {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  transition: left 0.1s linear;
}

.lane-strip__dot--player {
  top: 35%;
  background: var(--color-primary, #4a9eff);
}

.lane-strip__dot--ai {
  top: 65%;
  background: var(--color-danger, #e54c4c);
}

.lane-strip__dot-hp {
  height: 3px;
  background: rgba(255, 255, 255, 0.85);
  align-self: flex-end;
  width: 100%;
}
</style>

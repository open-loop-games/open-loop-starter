<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from '@open-loop/engine';
import { useModule } from '@/composables/useModule';
import { PrimaryLifetimeKey, SceneKey, getAutoProducers, getUnlocks } from '../../modules';
import { useFormatting } from '@/composables/useFormatting';
import Tooltip from '@/ui/components/Tooltip.vue';
import type { UnlockDef } from '../../data/types';

const unlocks = getUnlocks();
const buildings = getAutoProducers();
const scene = useModule(SceneKey);
const lifetime = useModule(PrimaryLifetimeKey);
const { format } = useFormatting();

type Kind = 'producer' | 'scene' | 'affordance';

interface Cell {
  id: string;
  def: UnlockDef;
  label: string;
  earned: boolean;
  reveals: string;
  kind: Kind;
}

function kindOf(def: UnlockDef): Kind {
  if (def.reveals.kind === 'producer') return 'producer';
  if (def.reveals.kind === 'scene-variant') return 'scene';
  return 'affordance';
}

function describeReveals(def: UnlockDef): string {
  const r = def.reveals;
  if (r.kind === 'producer') {
    const producer = buildings.getEntry(r.producerId)?.def;
    return producer ? `Reveals the ${producer.name}` : `Reveals producer ${r.producerId}`;
  }
  if (r.kind === 'scene-variant') {
    const variant = scene.getVariant(r.variantId);
    return variant ? `Reveals the ${variant.label} scene` : `Reveals scene ${r.variantId}`;
  }
  switch (r.affordance) {
    case 'achievement-grid':
      return 'Opens the Garden Almanac';
    case 'welcome-back':
      return 'Welcomes you back after time away';
    case 'prestige':
      return 'Unlocks prestige';
  }
}

const cells = computed<Cell[]>(() =>
  unlocks.getAll().map((entry) => {
    const def = entry.def;
    const earned = entry.purchasable.active.value === true;
    return {
      id: def.id,
      def,
      label: earned ? def.label : 'unfound',
      earned,
      reveals: describeReveals(def),
      kind: kindOf(def),
    };
  }),
);

const earnedCount = computed(() => cells.value.filter((c) => c.earned).length);

function progressLabel(def: UnlockDef, earned: boolean): string {
  const current = Decimal.fromValue(lifetime.value);
  const target = Decimal.fromValue(def.threshold);
  if (current.gte(target)) return 'Reached';
  const targetText = earned ? format(target, 0) : '??';
  return `${format(current, 0)} / ${targetText} sprouts lifetime`;
}
</script>

<template>
  <section class="discoveries">
    <header class="discoveries__head">
      <h3 class="discoveries__title">
        Discoveries
      </h3>
      <span class="discoveries__count">
        <span class="discoveries__count-value">{{ earnedCount }}</span>
        <span class="discoveries__count-of">of</span>
        <span class="discoveries__count-value">{{ cells.length }}</span>
      </span>
    </header>
    <ul class="discoveries__cells">
      <Tooltip
        v-for="c in cells"
        :key="c.id"
        :side-offset="6"
      >
        <li
          class="specimen"
          :data-earned="c.earned ? 'true' : 'false'"
          :data-kind="c.kind"
          :data-testid="`unlock-${c.id}`"
          tabindex="0"
        >
          <span
            class="specimen__kind"
            aria-hidden="true"
          >
            <svg
              v-if="c.kind === 'producer'"
              viewBox="0 0 16 16"
            >
              <path
                d="M8 14 V 6 M5 9 Q 8 6 8 9 M11 9 Q 8 6 8 9"
                stroke="currentColor"
                stroke-width="1.1"
                fill="none"
              />
            </svg>
            <svg
              v-else-if="c.kind === 'scene'"
              viewBox="0 0 16 16"
            >
              <rect
                x="2"
                y="3"
                width="12"
                height="10"
                stroke="currentColor"
                stroke-width="1"
                fill="none"
              />
              <path
                d="M3 11 L 7 7 L 9 9 L 13 6"
                stroke="currentColor"
                stroke-width="1"
                fill="none"
              />
            </svg>
            <svg
              v-else
              viewBox="0 0 16 16"
            >
              <path
                d="M3 4 H 13 V 11 L 8 14 L 3 11 Z"
                stroke="currentColor"
                stroke-width="1"
                fill="none"
              />
            </svg>
          </span>
          <span class="specimen__label">{{ c.label }}</span>
          <span
            v-if="c.earned"
            class="specimen__stamp"
            aria-hidden="true"
          >&#10003;</span>
        </li>
        <template #content>
          <div class="cell-tip">
            <div class="cell-tip__name">
              {{ c.earned ? c.def.label : 'Hidden discovery' }}
            </div>
            <div
              v-if="c.earned"
              class="cell-tip__reveals"
            >
              {{ c.reveals }}
            </div>
            <div class="cell-tip__progress">
              {{ progressLabel(c.def, c.earned) }}
            </div>
          </div>
        </template>
      </Tooltip>
    </ul>
  </section>
</template>

<style scoped>
.discoveries {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  background: transparent;
  border: none;
}

.discoveries__head {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 14px;
  padding: 4px 0 6px;
}

.discoveries__title {
  font-family: var(--font-display, Georgia, serif);
  font-style: italic;
  font-weight: 500;
  font-size: 0.78em;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--almanac-moss, var(--color-text-muted));
  margin: 0;
}

.discoveries__count {
  font-family: var(--font-body, Georgia, serif);
  font-style: italic;
  font-size: 1em;
  color: var(--almanac-pencil, var(--color-text-muted));
  font-variant-numeric: tabular-nums oldstyle-nums;
}

.discoveries__count-value {
  color: var(--almanac-evergreen, var(--color-text));
  font-weight: 600;
}

.discoveries__count-of {
  margin: 0 4px;
  opacity: 0.7;
}

.discoveries__head::after {
  content: '';
}

.discoveries__cells {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
}

.discoveries__head {
  position: relative;
}

.discoveries__head + .discoveries__cells::before {
  content: '';
  display: block;
  grid-column: 1 / -1;
  height: 1px;
  background: var(--almanac-rule, var(--color-border));
  opacity: 0.5;
  margin-bottom: 6px;
}

/* ─── Specimen card ──────────────────────────────────────────────────── */
.specimen {
  position: relative;
  display: grid;
  grid-template-columns: 18px 1fr;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  min-height: 48px;
  background: var(--almanac-cream, var(--color-surface));
  border: 1px solid var(--almanac-rule, var(--color-border));
  border-radius: 2px;
  font-family: var(--font-body, Georgia, serif);
  font-size: 1em;
  color: var(--almanac-pencil, var(--color-text-muted));
  cursor: default;
  transition:
    color 140ms ease-out,
    border-color 140ms ease-out;
}

.specimen:focus-visible {
  outline: 2px solid var(--almanac-evergreen, var(--color-primary));
  outline-offset: -2px;
}

.specimen[data-earned='false'] {
  background:
    repeating-linear-gradient(
      135deg,
      transparent 0,
      transparent 6px,
      rgba(168, 158, 139, 0.06) 6px,
      rgba(168, 158, 139, 0.06) 7px
    ),
    var(--almanac-paper, var(--color-bg));
  border-style: dashed;
  border-color: var(--almanac-rule-soft, rgba(168, 158, 139, 0.32));
}

.specimen[data-earned='false'] .specimen__label {
  font-style: italic;
  color: var(--almanac-pencil, var(--color-text-muted));
  opacity: 0.65;
}

.specimen[data-earned='true'] {
  color: var(--almanac-evergreen, var(--color-text));
  border-color: var(--almanac-rule, var(--color-border));
}

.specimen[data-earned='true'] .specimen__label {
  font-family: var(--font-display, Georgia, serif);
  font-style: italic;
  font-weight: 500;
  color: var(--almanac-evergreen, var(--color-text));
}

.specimen__kind {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  color: inherit;
}

.specimen__kind svg {
  width: 100%;
  height: 100%;
  display: block;
}

.specimen[data-earned='true'][data-kind='producer'] .specimen__kind {
  color: var(--almanac-moss-bright, var(--color-success));
}

.specimen[data-earned='true'][data-kind='scene'] .specimen__kind {
  color: var(--almanac-moss, var(--color-text-muted));
}

.specimen[data-earned='true'][data-kind='affordance'] .specimen__kind {
  color: var(--almanac-stamp, var(--color-danger));
}

.specimen__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.95em;
}

.specimen__stamp {
  position: absolute;
  top: 4px;
  right: 6px;
  font-family: var(--font-display, Georgia, serif);
  font-size: 0.85em;
  color: var(--almanac-stamp, var(--color-danger));
  opacity: 0.65;
  transform: rotate(-8deg);
  pointer-events: none;
}

/* ─── Tooltip body ───────────────────────────────────────────────────── */
.cell-tip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: var(--font-body, Georgia, serif);
}

.cell-tip__name {
  font-family: var(--font-display, Georgia, serif);
  font-style: italic;
  font-weight: 500;
  font-size: 1.05em;
}

.cell-tip__reveals {
  opacity: 0.92;
  font-size: 1em;
}

.cell-tip__progress {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--almanac-rule-soft, rgba(168, 158, 139, 0.32));
  font-style: italic;
  font-variant-numeric: tabular-nums oldstyle-nums;
  font-size: 0.92em;
  opacity: 0.85;
}
</style>

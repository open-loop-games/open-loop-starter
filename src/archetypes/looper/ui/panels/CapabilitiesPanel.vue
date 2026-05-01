<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from 'open-loop-engine';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import Tooltip from '@/ui/components/Tooltip.vue';
import { useFormatting } from '@/composables/useFormatting';
import { useCapabilities } from '../../composables/useCapabilities';
import { useArc } from '../../composables/useArc';
import { useLooperData } from '../../composables/useLooperData';

const capabilities = useCapabilities();
const arc = useArc();
const data = useLooperData();
const { format } = useFormatting();

const averageTalent = computed(() => arc.averageTalentMultiplier.value);
const costDivisor = computed(() => new Decimal(data.balance.costDivisor).toNumber());

interface TierStats {
  level: number;
  xp: number;
  xpForCurrent: number;
  xpForNext: number;
  segment: number;
  intoSegment: number;
  fraction: number;
}

// Capabilities `xpToLevel` is `floor(sqrt(max(1, xp)) / 2)`. Inverse without
// the floor: smallest xp at level N is `4 N²`. Closed-form keeps the panel
// free of engine Formula imports — same pattern as TownColumnPanel.
function xpForLevel(level: number): number {
  return 4 * level * level;
}

function tierStats(level: number, xp: number): TierStats {
  const lvl = Math.max(0, Math.floor(level));
  const base = xpForLevel(lvl);
  const next = xpForLevel(lvl + 1);
  const segment = Math.max(1, next - base);
  const xpClamped = Math.max(0, xp);
  const intoSegment = Math.max(0, xpClamped - base);
  return {
    level: lvl,
    xp: xpClamped,
    xpForCurrent: base,
    xpForNext: next,
    segment,
    intoSegment,
    fraction: Math.max(0, Math.min(1, intoSegment / segment)),
  };
}

interface DisplayRow {
  id: string;
  name: string;
  description: string;
  level: TierStats;
  talent: TierStats;
  talentMultiplier: number;
  costReduction: number;
}

const displayRows = computed<DisplayRow[]>(() =>
  capabilities.value.map((row) => {
    const lvl = tierStats(
      new Decimal(row.levelLevel.value).toNumber(),
      new Decimal(row.levelXp.value).toNumber(),
    );
    const tal = tierStats(
      new Decimal(row.talentLevel.value).toNumber(),
      new Decimal(row.talentXp.value).toNumber(),
    );
    return {
      id: row.def.id,
      name: row.def.name,
      description: row.def.description ?? '',
      level: lvl,
      talent: tal,
      talentMultiplier: new Decimal(row.talentMultiplier.value).toNumber(),
      costReduction: 1 + lvl.level / costDivisor.value,
    };
  }),
);
</script>

<template>
  <section
    class="capabilities-panel"
    data-testid="capabilities-panel"
  >
    <header class="capabilities-panel__header">
      <h3>Capabilities</h3>
      <span class="capabilities-panel__retention">
        avg ×<strong data-testid="avg-talent">{{ averageTalent.toFixed(3) }}</strong>
      </span>
    </header>

    <ul class="capabilities-list">
      <li
        v-for="row in displayRows"
        :key="row.id"
        class="capabilities-list__item"
        :data-testid="`capability-${row.id}`"
      >
        <Tooltip side="right">
          <div class="capabilities-list__row">
            <header class="capabilities-list__head">
              <span class="capabilities-list__name">{{ row.name }}</span>
              <span class="capabilities-list__multiplier">
                ×{{ format(row.talentMultiplier, 2) }}
              </span>
            </header>
            <div class="capabilities-list__levels">
              <span class="capabilities-list__tier">
                <span class="capabilities-list__tier-label">lvl</span>
                <span
                  class="capabilities-list__tier-value"
                  :data-testid="`capability-level-level-${row.id}`"
                >{{ row.level.level }}</span>
              </span>
              <span class="capabilities-list__tier capabilities-list__tier--talent">
                <span class="capabilities-list__tier-label">talent</span>
                <span
                  class="capabilities-list__tier-value"
                  :data-testid="`capability-talent-level-${row.id}`"
                >{{ row.talent.level }}</span>
              </span>
            </div>
            <ProgressBar
              :value="row.level.fraction"
              :max="1"
              :data-testid="`capability-level-bar-${row.id}`"
            />
            <p class="capabilities-list__xp">
              {{ format(row.level.intoSegment, 2) }} /
              {{ format(row.level.segment, 0) }} xp
            </p>
          </div>
          <template #content>
            <strong>{{ row.name }}</strong>
            <p
              v-if="row.description"
              class="cap-tooltip__desc"
            >
              {{ row.description }}
            </p>
            <dl class="cap-tooltip__grid">
              <dt>Level</dt>
              <dd>
                {{ row.level.level }}
                <span class="muted">
                  · {{ format(row.level.intoSegment, 2) }} /
                  {{ format(row.level.segment, 0) }} xp
                </span>
              </dd>
              <dt>Cost ÷</dt>
              <dd>×{{ row.costReduction.toFixed(2) }}</dd>
              <dt>Talent</dt>
              <dd>
                {{ row.talent.level }}
                <span class="muted">
                  · {{ format(row.talent.intoSegment, 3) }} /
                  {{ format(row.talent.segment, 0) }} xp
                </span>
              </dd>
              <dt>XP rate</dt>
              <dd>×{{ format(row.talentMultiplier, 3) }}</dd>
            </dl>
            <p class="cap-tooltip__hint">
              Level resets each loop and cuts action cost. Talent persists and
              speeds up XP-gain — faster Level training next loop.
            </p>
          </template>
        </Tooltip>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.capabilities-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  min-height: 0;
}

.capabilities-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.capabilities-panel__header h3 {
  font-size: 0.95em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted, var(--color-text));
}

.capabilities-panel__retention {
  font-size: 0.85em;
  color: var(--color-text-muted, var(--color-text));
  font-variant-numeric: tabular-nums;
}

.capabilities-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.capabilities-list__item {
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, var(--radius));
}

.capabilities-list__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--gap-sm);
  cursor: help;
}

.capabilities-list__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.capabilities-list__name {
  font-weight: 600;
}

.capabilities-list__multiplier {
  font-size: 0.85em;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted, var(--color-text));
}

.capabilities-list__levels {
  display: flex;
  gap: var(--gap);
  font-size: 0.85em;
}

.capabilities-list__tier {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.capabilities-list__tier-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted, var(--color-text));
  font-size: 0.78em;
}

.capabilities-list__tier-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.capabilities-list__tier--talent .capabilities-list__tier-value {
  color: var(--color-primary);
}

.capabilities-list__xp {
  margin: 0;
  font-size: 0.75em;
  color: var(--color-text-muted, var(--color-text));
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.cap-tooltip__desc {
  margin: 4px 0;
  font-size: 0.85em;
  color: var(--color-text-muted, var(--color-text));
}

.cap-tooltip__grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 10px;
  margin: 6px 0 4px 0;
  font-size: 0.85em;
}

.cap-tooltip__grid dt {
  color: var(--color-text-muted, var(--color-text));
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.85em;
}

.cap-tooltip__grid dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.cap-tooltip__grid .muted {
  color: var(--color-text-muted, var(--color-text));
  font-size: 0.9em;
}

.cap-tooltip__hint {
  margin: 6px 0 0 0;
  font-size: 0.78em;
  font-style: italic;
  color: var(--color-text-muted, var(--color-text));
}
</style>

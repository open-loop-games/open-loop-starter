<!--
  NightPanel — Phase III: the stakeout. The night is replayed as a grid of
  places by hours; the player posts clerks on watches, and the clock resolves
  each hour as it passes. A watch the board's cards point at is marked with
  the suspect's name; a watch already seen shows a tick; a watch known to be
  empty is crossed out. Too many empty watches in one night break the model.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import ProducerList from '@/ui/compositions/ProducerList.vue';
import UpgradeGrid from '@/ui/compositions/UpgradeGrid.vue';
import {
  CARD_BY_ID,
  HOURS,
  PEOPLE,
  PLACES,
  SUSPECTS,
  SUSPECT_AT,
  watchKey,
  type Hour,
} from '../../data';
import { getAutomation, getBoard, getNight } from '../../modules';
import { cardOnce, cardRow, type CardExtra } from '../cards';
import { nightClock, whole } from '../format';
import IndexCard from '../components/IndexCard.vue';
import Ledger from '../components/Ledger.vue';

const night = getNight();
const board = getBoard();
const { tiers } = getAutomation();

const ledger = computed(() => [
  { label: 'accounts', value: whole(night.accounts.value) },
  { label: 'unfiled tonight', value: whole(night.unfiled.value) },
  { label: 'clerks posted', value: `${night.plan.value.length} / ${night.roster.value}` },
  {
    label: 'alibis holding',
    value: `${night.held.value.length} / ${SUSPECTS.length}`,
    automated: tiers.hasReached('planning'),
  },
]);

/** Who the board's pinned cards place at each watch. */
const hinted = computed(() => {
  const out: Record<string, string> = {};
  for (const id of board.pins.value) {
    if (!id) continue;
    const c = CARD_BY_ID[id];
    if (c.who !== 'ada') out[watchKey(c.where, c.when)] = PEOPLE[c.who];
  }
  return out;
});

const grid = computed(() =>
  PLACES.map((p) => ({
    place: p,
    cells: HOURS.map((_, h) => {
      const key = watchKey(p.id, h as Hour);
      const seen = night.seen.value[key] ?? 0;
      const tonight = night.tonight.value.includes(key);
      return {
        key,
        hint: hinted.value[key] ?? (seen > 0 ? PEOPLE[SUSPECT_AT[key]] : null),
        seen,
        tonight,
        empty: night.empty.value.includes(key),
        posted: night.plan.value.includes(key),
        past: h < night.resolved.value,
      };
    }),
  })),
);

const strainPips = computed(() =>
  Array.from({ length: night.strainCap.value }, (_, i) => i < night.strain.value),
);

const rows = [
  cardRow('roster', night.rosterPlace, {
    title: 'Put another clerk on nights',
    description: 'One more watch a night, and a little more strain the model can carry.',
    unit: 'accounts',
    owned: () => `${night.roster.value} on nights`,
  }),
];

// Insomnia shows once the first alibi holds.
const insomnia = cardOnce('insomnia', night.insomnia, {
  title: 'Stop sleeping',
  description: 'Coffee, cold water, the radiator off. Everything runs twice as fast.',
  unit: 'accounts',
});
const cards = computed(() =>
  !night.insomnia.active.value && night.held.value.length > 0 ? [insomnia] : [],
);

const heldNames = computed(() => new Set(night.held.value));
const cleared = (id: string) => heldNames.value.has(id as never);
const cap = computed(() => new Decimal(night.strainCap.value).toNumber());
</script>

<template>
  <section class="nc-phase">
    <div class="nc-nightclock" aria-label="Night clock">
      <span class="time nc-num">{{ nightClock(night.progress.value) }}</span>
      <ProgressBar :value="night.progress.value" />
      <span class="nc-label">
        18:00 &mdash; 06:00 &middot; night {{ night.cycle.count.value + 1 }}
      </span>
    </div>
    <Ledger :entries="ledger" />

    <div class="nc-stakeout" role="grid" aria-label="Stakeout">
      <span class="corner" />
      <span
        v-for="(hour, h) in HOURS"
        :key="hour"
        class="hour nc-label nc-num"
        :class="{ now: h === night.resolved.value }"
      >
        {{ hour }}
      </span>
      <template v-for="row in grid" :key="row.place.id">
        <span class="place">{{ row.place.displayName }}</span>
        <Button
          v-for="cell in row.cells"
          :key="cell.key"
          class="nc-watch"
          :class="{
            posted: cell.posted,
            hinted: !!cell.hint,
            seen: cell.seen > 0,
            tonight: cell.tonight,
            empty: cell.empty,
            past: cell.past,
          }"
          :aria-label="`${row.place.displayName} at ${cell.key.split('@')[1]}`"
          :aria-pressed="cell.posted"
          @click="night.toggle(cell.key)"
        >
          <span v-if="cell.hint" class="who">{{ cell.hint }}</span>
          <span v-if="cell.seen > 0 || cell.tonight" class="tick" aria-hidden="true">✓</span>
          <span v-else-if="cell.empty" class="cross" aria-hidden="true">×</span>
          <span v-if="cell.posted" class="clerk" aria-hidden="true" />
        </Button>
      </template>
    </div>

    <div class="nc-strain" :class="{ danger: night.strain.value >= cap - 1 && cap > 1 }">
      <span class="nc-label">Strain</span>
      <span class="pips" aria-hidden="true">
        <span v-for="(on, i) in strainPips" :key="i" class="pip" :class="{ on }" />
      </span>
      <span class="note">
        {{ cap }} empty watches in one night break the model and lose the night.
      </span>
    </div>

    <ProducerList :rows="rows" cost-label="" bulk-mode-source="none">
      <template #row="{ row, purchase }">
        <IndexCard :card="row.extra as CardExtra" :can="row.canPurchase(1)" @buy="purchase()" />
      </template>
    </ProducerList>
    <UpgradeGrid v-if="cards.length" :cards="cards" :columns="1" reveal="inline">
      <template #card="{ card }">
        <IndexCard
          :card="card.extra as CardExtra"
          :can="card.canPurchase.value"
          @buy="card.purchase()"
        />
      </template>
    </UpgradeGrid>

    <ul class="nc-suspects" aria-label="Suspects">
      <li v-for="s in SUSPECTS" :key="s.id" :class="{ cleared: cleared(s.id) }">
        <span class="name">{{ s.name }}</span>
        <span class="role">{{ s.role }}</span>
        <span v-if="cleared(s.id)" class="nc-stamp reassigned">Alibi holds</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.nc-nightclock {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 2px 16px;
}
.nc-nightclock :deep(.olui-progress-bar) {
  --progress-bar-fill: var(--nc-sodium);
  --progress-bar-track: var(--nc-soot-edge);
}
.nc-nightclock .time {
  grid-row: span 2;
  font-size: 34px;
  color: var(--nc-sodium);
}
.nc-stakeout {
  display: grid;
  grid-template-columns: 112px repeat(6, 1fr);
  gap: 4px;
  padding: 10px;
  background: #101318;
  border: 1px solid var(--nc-soot-edge);
}
.hour {
  text-align: center;
  padding-bottom: 2px;
}
.hour.now {
  color: var(--nc-sodium);
}
.place {
  align-self: center;
  font-size: 15px;
  color: var(--nc-carbon);
}
.nc-watch {
  position: relative;
  height: 46px;
  padding: 3px 4px;
  border: 1px solid #232831;
  border-radius: 1px;
  background: #161a20;
  color: var(--nc-carbon);
  opacity: 1;
  cursor: pointer;
  display: grid;
  align-content: center;
  justify-items: center;
}
.nc-watch:hover {
  border-color: var(--nc-manila-dim);
}
.nc-watch.past {
  background: #12151a;
}
.nc-watch.hinted .who {
  font-size: 13px;
  font-weight: 600;
  color: var(--nc-manila);
}
.nc-watch.seen .who {
  color: var(--nc-lamp);
}
.tick {
  font-family: var(--nc-face-typed);
  font-size: 13px;
  color: var(--nc-lamp);
}
.nc-watch.tonight:not(.seen) .tick {
  color: var(--nc-sodium);
}
.cross {
  font-family: var(--nc-face-typed);
  font-size: 18px;
  color: var(--nc-carbon-faint);
}
.nc-watch.posted {
  border-color: var(--nc-sodium);
  box-shadow: inset 0 0 0 1px rgba(224, 163, 70, 0.35);
}
.clerk {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--nc-sodium);
}
.nc-strain {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  color: var(--nc-carbon);
}
.pips {
  display: flex;
  gap: 4px;
}
.pip {
  width: 14px;
  height: 14px;
  border: 1px solid var(--nc-carbon-faint);
  border-radius: 1px;
}
.pip.on {
  background: var(--nc-stamp);
  border-color: var(--nc-stamp);
}
.nc-strain.danger .note {
  color: var(--nc-stamp);
}
.nc-suspects {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: grid;
  gap: 3px;
}
.nc-suspects li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 14px;
  padding: 4px 2px;
  border-bottom: 1px dashed var(--nc-soot-edge);
}
.nc-suspects .role {
  color: var(--nc-carbon);
  font-size: 15px;
}
.nc-suspects .cleared .name {
  color: var(--nc-lamp);
}
</style>

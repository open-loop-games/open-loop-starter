<script setup lang="ts">
import { computed } from 'vue';
import { getAchievementsCategory, getAchievementPoints } from '../modules';
import type { AchievementGroupId } from '../data';

defineProps<{ onClose?: () => void }>();

const cat = getAchievementsCategory();
const ap = getAchievementPoints();

interface DisplayEntry {
  id: string;
  name: string;
  description: string;
  rewardSummary: string;
  earned: boolean;
  pointValue: number;
}

interface DisplayGroup {
  id: AchievementGroupId;
  title: string;
  entries: DisplayEntry[];
}

const GROUP_TITLES: Record<AchievementGroupId, string> = {
  firstOwnedCoin: 'Workers',
  secondOwnedCoin: 'Investments',
  thirdOwnedCoin: 'Printers',
  fourthOwnedCoin: 'Mints',
  fifthOwnedCoin: 'Alchemies',
  prestigeCount: 'Prestige Count',
  prestigePointGain: 'Prestige Point Gain',
  accelerators: 'Accelerators',
  multipliers: 'Multipliers',
  acceleratorBoosts: 'Accelerator Boosts',
  transcensionCount: 'Transcension Count',
  transcendPointGain: 'Transcend Point Gain',
  challenge1: 'Challenge 1',
  challenge2: 'Challenge 2',
  challenge3: 'Challenge 3',
  challenge4: 'Challenge 4',
  challenge5: 'Challenge 5',
  ungrouped: 'Ungrouped',
};

const GROUP_ORDER: AchievementGroupId[] = [
  'firstOwnedCoin',
  'secondOwnedCoin',
  'thirdOwnedCoin',
  'fourthOwnedCoin',
  'fifthOwnedCoin',
  'accelerators',
  'multipliers',
  'acceleratorBoosts',
  'prestigeCount',
  'prestigePointGain',
  'transcensionCount',
  'transcendPointGain',
  'challenge1',
  'challenge2',
  'challenge3',
  'challenge4',
  'challenge5',
];

const groups = computed<DisplayGroup[]>(() => {
  const byGroup = new Map<AchievementGroupId, DisplayEntry[]>();
  for (const entry of cat.getAll()) {
    const def = entry.def;
    const earned = entry.achievement.earned.value;
    const rewardSummary =
      def.effects.length === 0 ? '—' : def.effects.map((e) => e.description).join('; ');
    const display: DisplayEntry = {
      id: def.id,
      name: def.name,
      description: def.description,
      rewardSummary,
      earned,
      pointValue: def.pointValue,
    };
    const arr = byGroup.get(def.group) ?? [];
    arr.push(display);
    byGroup.set(def.group, arr);
  }
  const groupedOrdered: DisplayGroup[] = [];
  for (const g of GROUP_ORDER) {
    const entries = byGroup.get(g);
    if (entries && entries.length > 0) {
      groupedOrdered.push({ id: g, title: GROUP_TITLES[g], entries });
    }
  }
  return groupedOrdered;
});

const ungrouped = computed<DisplayEntry[]>(() => {
  const result: DisplayEntry[] = [];
  for (const entry of cat.getAll()) {
    const def = entry.def;
    if (def.group !== 'ungrouped') continue;
    const earned = entry.achievement.earned.value;
    const rewardSummary =
      def.effects.length === 0 ? '—' : def.effects.map((e) => e.description).join('; ');
    result.push({
      id: def.id,
      name: def.name,
      description: def.description,
      rewardSummary,
      earned,
      pointValue: def.pointValue,
    });
  }
  return result;
});

const earnedCount = computed(() => cat.earnedCount.value);
const totalCount = computed(() => cat.totalCount);
const apValue = computed(() => ap.value);
</script>

<template>
  <div class="achievements-modal">
    <header class="achievements-modal__head">
      <h2>Achievements</h2>
      <p class="achievements-modal__summary">
        {{ earnedCount }} / {{ totalCount }} earned · {{ apValue }} AP
      </p>
      <button
        v-if="onClose"
        class="achievements-modal__close"
        @click="onClose?.()"
      >
        Close
      </button>
    </header>

    <section
      v-for="group in groups"
      :key="group.id"
      class="achievements-modal__group"
    >
      <h3 class="achievements-modal__group-title">
        {{ group.title }}
      </h3>
      <ul class="achievements-modal__list">
        <li
          v-for="entry in group.entries"
          :key="entry.id"
          :class="['achievements-modal__row', { 'is-earned': entry.earned }]"
          :title="entry.rewardSummary"
        >
          <span class="achievements-modal__row-status">{{ entry.earned ? '✓' : '·' }}</span>
          <span class="achievements-modal__row-name">{{ entry.name }}</span>
          <span class="achievements-modal__row-desc">{{ entry.description }}</span>
          <span class="achievements-modal__row-points">{{ entry.pointValue }} AP</span>
        </li>
      </ul>
    </section>

    <section
      v-if="ungrouped.length > 0"
      class="achievements-modal__group"
    >
      <h3 class="achievements-modal__group-title">
        Ungrouped
      </h3>
      <ul class="achievements-modal__list">
        <li
          v-for="entry in ungrouped"
          :key="entry.id"
          :class="['achievements-modal__row', { 'is-earned': entry.earned }]"
          :title="entry.rewardSummary"
        >
          <span class="achievements-modal__row-status">{{ entry.earned ? '✓' : '·' }}</span>
          <span class="achievements-modal__row-name">{{ entry.name }}</span>
          <span class="achievements-modal__row-desc">{{ entry.description }}</span>
          <span class="achievements-modal__row-points">{{ entry.pointValue }} AP</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.achievements-modal {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  padding: var(--gap);
}
.achievements-modal__head {
  display: flex;
  align-items: baseline;
  gap: var(--gap);
}
.achievements-modal__head h2 {
  margin: 0;
}
.achievements-modal__summary {
  margin: 0;
  color: var(--color-text-muted);
  flex: 1 1 auto;
}
.achievements-modal__close {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--gap-sm) var(--gap);
  cursor: pointer;
}
.achievements-modal__group {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.achievements-modal__group-title {
  margin: 0;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}
.achievements-modal__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.achievements-modal__row {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: var(--gap-sm);
  align-items: baseline;
  padding: 4px var(--gap-sm);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text-muted);
}
.achievements-modal__row.is-earned {
  background: var(--color-bg-alt, var(--color-bg));
  color: var(--color-text);
  border-color: var(--color-accent, var(--color-border));
}
.achievements-modal__row-status {
  width: 1.25em;
  text-align: center;
  font-weight: 700;
}
.achievements-modal__row-name {
  font-weight: 600;
}
.achievements-modal__row-desc {
  color: inherit;
  opacity: 0.85;
}
.achievements-modal__row-points {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--color-text-muted);
}
</style>

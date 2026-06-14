<script setup lang="ts">
import { computed, ref } from 'vue';
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui';
import {
  getCoinUpgrades,
  getPrestigeUpgrades,
  getTranscendUpgrades,
  getTranscendPoints,
} from '../modules';
import { toUpgradeCellData } from '../composables/use-producer-row';
import { useLatchOnce } from '@/composables/useLatchOnce';
import { UpgradeGrid } from '@/ui/compositions';

const coinUpgrades = getCoinUpgrades();
const prestigeUpgrades = getPrestigeUpgrades();
const transcendUpgrades = getTranscendUpgrades();
const transcendPoints = getTranscendPoints();

const transcendUnlocked = useLatchOnce(() => transcendPoints.cumulative?.value);

const coinCells = computed(() =>
  coinUpgrades
    .getAll()
    .map((e) =>
      toUpgradeCellData(
        e.purchasable,
        e.def.id,
        e.def.name,
        e.def.description,
        'coins',
        e.def.position,
      ),
    ),
);
const prestigeCells = computed(() =>
  prestigeUpgrades
    .getAll()
    .map((e) =>
      toUpgradeCellData(
        e.purchasable,
        e.def.id,
        e.def.name,
        e.def.description,
        'prestige points',
        e.def.position,
      ),
    ),
);
const transcendCells = computed(() =>
  transcendUpgrades
    .getAll()
    .map((e) =>
      toUpgradeCellData(
        e.purchasable,
        e.def.id,
        e.def.name,
        e.def.description,
        'transcend points',
        e.def.position,
      ),
    ),
);

const activeBand = ref<string>('coin');
</script>

<template>
  <div class="upgrades-panel">
    <TabsRoot
      v-model="activeBand"
      class="upgrades-panel__tabs"
    >
      <TabsList class="upgrades-panel__tab-list">
        <TabsTrigger
          value="coin"
          class="upgrades-panel__tab-trigger"
        >
          Coin (1-20)
        </TabsTrigger>
        <TabsTrigger
          value="prestige"
          class="upgrades-panel__tab-trigger"
        >
          Prestige (21-40)
        </TabsTrigger>
        <TabsTrigger
          v-if="transcendUnlocked"
          value="transcend"
          class="upgrades-panel__tab-trigger"
        >
          Transcend (41-60)
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="coin"
        class="upgrades-panel__tab-content"
      >
        <header class="upgrades-panel__head">
          <h3>Coin upgrades</h3>
          <p>One-time buys that boost coin production.</p>
        </header>
        <UpgradeGrid
          :cells="coinCells"
          :columns="5"
          reveal="inline"
        />
      </TabsContent>

      <TabsContent
        value="prestige"
        class="upgrades-panel__tab-content"
      >
        <header class="upgrades-panel__head">
          <h3>Prestige upgrades</h3>
          <p>Run-time loadout — bought with prestige points; resets on every prestige.</p>
        </header>
        <UpgradeGrid
          :cells="prestigeCells"
          :columns="5"
          reveal="inline"
        />
      </TabsContent>

      <TabsContent
        v-if="transcendUnlocked"
        value="transcend"
        class="upgrades-panel__tab-content"
      >
        <header class="upgrades-panel__head">
          <h3>Transcend upgrades</h3>
          <p>Bought with transcend points; resets on every transcend (band 41-60).</p>
        </header>
        <UpgradeGrid
          :cells="transcendCells"
          :columns="5"
          reveal="inline"
        />
      </TabsContent>
    </TabsRoot>
  </div>
</template>

<style scoped>
.upgrades-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
.upgrades-panel__tabs {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
.upgrades-panel__tab-list {
  display: flex;
  gap: var(--gap-sm);
}
.upgrades-panel__tab-trigger {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--gap-xs) var(--gap-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.85em;
}
.upgrades-panel__tab-trigger[data-state='active'] {
  background: var(--color-accent, var(--color-surface));
  color: var(--color-text);
  border-color: var(--color-accent, var(--color-border));
}
.upgrades-panel__tab-content {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
.upgrades-panel__head h3 {
  margin: 0 0 var(--gap-xs) 0;
  font-size: 0.95em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.upgrades-panel__head p {
  margin: 0;
  font-size: 0.85em;
  color: var(--color-text-muted);
}
@media (max-width: 720px) {
  .upgrades-panel :deep(.upgrade-grid) {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}
</style>

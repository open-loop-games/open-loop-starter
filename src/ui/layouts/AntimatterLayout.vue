<script setup lang="ts">
import { computed, ref } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { TabsBarShell } from '@/lib';
import { useModule } from '@/composables/useModule';
import { AntimatterDimensionsKey } from '@/modules/mods/antimatter-dimensions';
import HudBar from '@/ui/components/HudBar.vue';
import HudChip from '@/ui/components/HudChip.vue';
import ADDimensionsPanel from '@/ui/panels/ADDimensionsPanel.vue';
import ADPrestigePanel from '@/ui/panels/ADPrestigePanel.vue';
import ADInfinityUpgradesPanel from '@/ui/panels/ADInfinityUpgradesPanel.vue';
import ADChallengesPanel from '@/ui/panels/ADChallengesPanel.vue';
import ADEternityPanel from '@/ui/panels/ADEternityPanel.vue';
import ADEternityUpgradesPanel from '@/ui/panels/ADEternityUpgradesPanel.vue';

const ad = useModule(AntimatterDimensionsKey);

type TabId = 'antimatter' | 'infinity' | 'challenges' | 'eternity';

interface TabDef {
  id: TabId;
  label: string;
  enabled: boolean;
  hint?: string;
}

const activeTab = ref<TabId>('antimatter');

// Infinity tab unlocks on first infinity, Eternity on first eternity —
// both persistent flags in `'ad-meta'`.
const tabs = computed<TabDef[]>(() => [
  { id: 'antimatter', label: 'Antimatter', enabled: true },
  {
    id: 'infinity',
    label: 'Infinity',
    enabled: ad.hasReachedInfinity.value,
    hint: ad.hasReachedInfinity.value ? undefined : 'Unlocks at 1e308 antimatter',
  },
  {
    id: 'challenges',
    label: 'Challenges',
    enabled: ad.hasReachedInfinity.value,
    hint: ad.hasReachedInfinity.value ? undefined : 'Unlocks after first Infinity',
  },
  {
    id: 'eternity',
    label: 'Eternity',
    enabled: ad.hasReachedEternity.value,
    hint: ad.hasReachedEternity.value ? undefined : 'Unlocks at 1e1100 IP',
  },
]);

const antimatter = computed(() => format(Decimal.floor(ad.antimatter.value)));

const antimatterPerSec = computed(() => {
  const dim1 = ad.dims[0];
  return format(Decimal.mul(dim1.computedRate.value, dim1.count.value), 2);
});

const infinityPoints = computed(() => format(Decimal.floor(ad.infinityPoints.value)));
const eternityPoints = computed(() => format(Decimal.floor(ad.eternityPoints.value)));

const boostCount = computed(() => format(Decimal.floor(ad.boostCount.value)));
const galaxyCount = computed(() => format(Decimal.floor(ad.galaxyCount.value)));
const hasBoosts = computed(() => Decimal.gt(ad.boostCount.value, 0));
const hasGalaxies = computed(() => Decimal.gt(ad.galaxyCount.value, 0));

function formatDuration(totalSeconds: number): string {
  const s = Math.floor(totalSeconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const secs = s % 60;
  if (m < 60) return `${m}m ${secs}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

const infinityTimer = computed(() => formatDuration(ad.infinityTimer.value));
const eternityTimer = computed(() => formatDuration(ad.eternityTimer.value));
</script>

<template>
  <TabsBarShell class="ad-layout">
    <template #resources>
      <HudBar>
        <HudChip variant="big">
          ✴ {{ antimatter }}
        </HudChip>
        <HudChip variant="muted">
          {{ antimatterPerSec }}/s
        </HudChip>
        <HudChip
          v-if="hasBoosts"
          variant="stat"
        >
          ▲ {{ boostCount }} boosts
        </HudChip>
        <HudChip
          v-if="hasGalaxies"
          variant="stat"
        >
          ✦ {{ galaxyCount }} galaxies
        </HudChip>
        <HudChip
          v-if="ad.hasReachedInfinity.value"
          variant="stat"
        >
          ∞ {{ infinityPoints }} IP
        </HudChip>
        <HudChip
          v-if="ad.hasReachedInfinity.value"
          variant="muted"
        >
          ⏱ {{ infinityTimer }}
        </HudChip>
        <HudChip
          v-if="ad.hasReachedEternity.value"
          variant="stat"
        >
          ⧖ {{ eternityPoints }} EP
        </HudChip>
        <HudChip
          v-if="ad.hasReachedEternity.value"
          variant="muted"
        >
          ⏳ {{ eternityTimer }}
        </HudChip>
      </HudBar>
    </template>

    <template #tabs>
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="ad-tab"
        :class="{ active: activeTab === tab.id, disabled: !tab.enabled }"
        :disabled="!tab.enabled"
        :title="tab.hint"
        @click="tab.enabled && (activeTab = tab.id)"
      >
        {{ tab.label }}
      </button>
    </template>

    <ADDimensionsPanel v-if="activeTab === 'antimatter'" />
    <div
      v-else-if="activeTab === 'infinity'"
      class="infinity-body"
    >
      <ADPrestigePanel />
      <ADInfinityUpgradesPanel />
    </div>
    <ADChallengesPanel v-else-if="activeTab === 'challenges'" />
    <div
      v-else-if="activeTab === 'eternity'"
      class="eternity-body"
    >
      <ADEternityPanel />
      <ADEternityUpgradesPanel />
    </div>
  </TabsBarShell>
</template>

<style scoped>
.ad-tab {
  padding: var(--gap-sm) var(--gap);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.95em;
  font-weight: 500;
}
.ad-tab:hover:not(.disabled) {
  color: var(--color-text);
}
.ad-tab.active {
  color: var(--color-text);
  border-bottom-color: var(--color-primary);
}
.ad-tab.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.infinity-body,
.eternity-body {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
</style>

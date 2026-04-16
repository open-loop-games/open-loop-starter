<script setup lang="ts">
import { computed, ref } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { AntimatterDimensionsKey } from '@/modules/mods/antimatter-dimensions';
import HudBar from '@/ui/components/HudBar.vue';
import HudChip from '@/ui/components/HudChip.vue';
import ADDimensionsPanel from '@/ui/panels/ADDimensionsPanel.vue';
import ADPrestigePanel from '@/ui/panels/ADPrestigePanel.vue';
import ADInfinityUpgradesPanel from '@/ui/panels/ADInfinityUpgradesPanel.vue';

const ad = useModule(AntimatterDimensionsKey);

type TabId = 'antimatter' | 'infinity' | 'challenges' | 'eternity';

interface TabDef {
  id: TabId;
  label: string;
  enabled: boolean;
  hint?: string;
}

const activeTab = ref<TabId>('antimatter');

// Infinity tab unlocks on first infinity (persistent flag in `'ad-meta'`).
// Challenges/Eternity ship disabled — they light up in 4d/4e.
const tabs = computed<TabDef[]>(() => [
  { id: 'antimatter', label: 'Antimatter', enabled: true },
  {
    id: 'infinity',
    label: 'Infinity',
    enabled: ad.hasReachedInfinity.value,
    hint: ad.hasReachedInfinity.value ? undefined : 'Unlocks at 1e308 antimatter',
  },
  { id: 'challenges', label: 'Challenges', enabled: false, hint: 'Unlocks after first Infinity' },
  { id: 'eternity', label: 'Eternity', enabled: false, hint: 'Unlocks at 1e1100 IP' },
]);

const antimatter = computed(() => format(Decimal.floor(ad.antimatter.value)));

const antimatterPerSec = computed(() => {
  const dim1 = ad.dims[0];
  return format(Decimal.mul(dim1.computedRate.value, dim1.count.value), 2);
});

const infinityPoints = computed(() => format(Decimal.floor(ad.infinityPoints.value)));

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
</script>

<template>
  <div class="ad-layout">
    <HudBar>
      <HudChip variant="big">
        ✴ {{ antimatter }}
      </HudChip>
      <HudChip variant="muted">
        {{ antimatterPerSec }}/s
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
    </HudBar>

    <nav class="ad-tabs">
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
    </nav>

    <div class="ad-body">
      <ADDimensionsPanel v-if="activeTab === 'antimatter'" />
      <div
        v-else-if="activeTab === 'infinity'"
        class="infinity-body"
      >
        <ADPrestigePanel />
        <ADInfinityUpgradesPanel />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ad-layout {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
.ad-tabs {
  display: flex;
  gap: var(--gap-sm);
  border-bottom: 1px solid var(--color-border);
}
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
.infinity-body {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
</style>

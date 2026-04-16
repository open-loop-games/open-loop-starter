<script setup lang="ts">
import { computed, ref } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { AntimatterDimensionsKey } from '@/modules/mods/antimatter-dimensions';
import HudBar from '@/ui/components/HudBar.vue';
import HudChip from '@/ui/components/HudChip.vue';
import ADDimensionsPanel from '@/ui/panels/ADDimensionsPanel.vue';

const ad = useModule(AntimatterDimensionsKey);

type TabId = 'antimatter' | 'infinity' | 'challenges' | 'eternity';

interface TabDef {
  id: TabId;
  label: string;
  enabled: boolean;
  hint?: string;
}

// Infinity/Challenges/Eternity ship disabled — they light up in 4c/4d/4e.
const tabs: TabDef[] = [
  { id: 'antimatter', label: 'Antimatter', enabled: true },
  { id: 'infinity', label: 'Infinity', enabled: false, hint: 'Unlocks at 1e308 antimatter' },
  { id: 'challenges', label: 'Challenges', enabled: false, hint: 'Unlocks after first Infinity' },
  { id: 'eternity', label: 'Eternity', enabled: false, hint: 'Unlocks at 1e1100 IP' },
];

const activeTab = ref<TabId>('antimatter');

const antimatter = computed(() => format(Decimal.floor(ad.antimatter.value)));

const antimatterPerSec = computed(() => {
  const dim1 = ad.dims[0];
  return format(Decimal.mul(dim1.computedRate.value, dim1.count.value), 2);
});
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
</style>

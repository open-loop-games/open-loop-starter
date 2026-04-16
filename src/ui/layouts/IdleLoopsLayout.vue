<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { MultiColumnShell } from '@/lib';
import { useModule } from '@/composables/useModule';
import { IdleLoopsKey } from '@/modules/mods/idle-loops';
import HudBar from '@/ui/components/HudBar.vue';
import HudChip from '@/ui/components/HudChip.vue';
import ILQueueDisplay from '@/ui/panels/ILQueueDisplay.vue';
import ILBestOfPanel from '@/ui/panels/ILBestOfPanel.vue';
import ILRecommendationPanel from '@/ui/panels/ILRecommendationPanel.vue';
import ILAutomationControls from '@/ui/panels/ILAutomationControls.vue';

const il = useModule(IdleLoopsKey);

const manaDisplay = computed(() =>
  `${format(Decimal.floor(il.mana.value))} / ${format(il.maxMana)}`,
);

const manaPercent = computed(() =>
  Decimal.div(il.mana.value, il.maxMana).toNumber() * 100,
);

const loopCount = computed(() => format(il.loop.count.value));

const statEntries = computed(() =>
  il.stats.getAll().map((e) => ({
    id: e.def.id,
    name: e.def.description,
    level: new Decimal(e.skill.level.value).toNumber(),
    permanentBonus: e.skill.permanentBonus
      ? format(e.skill.permanentBonus.value, 2)
      : '0',
  })),
);
</script>

<template>
  <div class="il-layout">
    <HudBar>
      <HudChip>
        Loop #{{ loopCount }}
      </HudChip>
      <div class="il-mana-chip">
        <span>Mana: {{ manaDisplay }}</span>
        <div
          class="il-mana-bar"
          :style="{ width: manaPercent + '%' }"
        />
      </div>
      <div class="il-stats">
        <HudChip
          v-for="s in statEntries"
          :key="s.id"
          variant="stat"
          :title="`${s.name} (+${s.permanentBonus} permanent)`"
        >
          {{ s.id.toUpperCase() }} {{ s.level }}
        </HudChip>
      </div>
    </HudBar>

    <MultiColumnShell
      class="il-body"
      :columns="['1fr', '1fr', '1fr']"
    >
      <template #column-0>
        <ILQueueDisplay />
      </template>
      <template #column-1>
        <ILRecommendationPanel />
        <ILBestOfPanel />
      </template>
      <template #column-2>
        <ILAutomationControls />
      </template>
    </MultiColumnShell>
  </div>
</template>

<style scoped>
.il-layout {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-height: 0;
  flex: 1;
}
.il-mana-chip {
  position: relative;
  overflow: hidden;
  min-width: 180px;
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 0.9em;
  font-weight: 600;
}
.il-mana-bar {
  position: absolute;
  inset: 0;
  background: var(--color-accent, #4a6cf7);
  opacity: 0.2;
  transition: width 0.1s linear;
  pointer-events: none;
}
.il-stats {
  display: flex;
  gap: 4px;
  margin-left: auto;
  flex-wrap: wrap;
}
.il-body {
  flex: 1;
  min-height: 0;
}
</style>

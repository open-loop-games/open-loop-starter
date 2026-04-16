<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { MultiColumnShell } from '@/lib';
import { useModule } from '@/composables/useModule';
import { IdleLoopsKey } from '@/modules/mods/idle-loops';
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
    <header class="il-hud">
      <div class="il-chip">
        Loop #{{ loopCount }}
      </div>
      <div class="il-chip il-mana">
        Mana: {{ manaDisplay }}
        <div
          class="il-mana-bar"
          :style="{ width: manaPercent + '%' }"
        />
      </div>
      <div class="il-stats">
        <span
          v-for="s in statEntries"
          :key="s.id"
          class="il-stat-chip"
          :title="`${s.name} (+${s.permanentBonus} permanent)`"
        >
          {{ s.id.toUpperCase() }} {{ s.level }}
        </span>
      </div>
    </header>

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
.il-hud {
  display: flex;
  gap: var(--gap-sm, 8px);
  align-items: center;
  padding: var(--gap-sm, 8px) var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  flex-wrap: wrap;
}
.il-chip {
  padding: 4px 12px;
  border-radius: var(--radius-sm, 4px);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.9em;
}
.il-mana {
  position: relative;
  overflow: hidden;
  min-width: 180px;
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
.il-stat-chip {
  padding: 2px 8px;
  border-radius: var(--radius-sm, 4px);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  font-size: 0.75em;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted, var(--color-muted));
}
.il-body {
  flex: 1;
  min-height: 0;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { IdleLoopsKey } from '@/modules/mods/idle-loops';

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

const queueDisplay = computed(() =>
  il.queue.items.value.map((item, i) => ({
    id: item.id,
    index: i,
    active: i === il.queue.cursor && il.queue.currentItem?.id === item.id,
    def: il.actions.registry.get(item.id),
  })),
);

const progressPercent = computed(() =>
  il.actions.progress.percentComplete.value * 100,
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
    </header>

    <div class="il-body">
      <section class="il-stats">
        <h3>Stats</h3>
        <div
          v-for="stat in statEntries"
          :key="stat.id"
          class="il-stat-row"
        >
          <span class="il-stat-name">{{ stat.name }}</span>
          <span class="il-stat-level">Lv {{ stat.level }}</span>
          <span class="il-stat-bonus">(+{{ stat.permanentBonus }})</span>
        </div>
      </section>

      <section class="il-queue">
        <h3>Action Queue</h3>
        <div
          v-for="entry in queueDisplay"
          :key="entry.index"
          class="il-queue-item"
          :class="{ active: entry.active }"
        >
          <span>{{ entry.def?.display ?? entry.id }}</span>
          <div
            v-if="entry.active"
            class="il-progress-bar"
          >
            <div
              class="il-progress-fill"
              :style="{ width: progressPercent + '%' }"
            />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.il-layout {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md, 12px);
  padding: var(--gap-md, 12px);
  max-width: 600px;
}

.il-hud {
  display: flex;
  gap: var(--gap-sm, 8px);
  align-items: center;
}

.il-chip {
  padding: 4px 12px;
  border-radius: var(--radius-sm, 4px);
  background: var(--color-surface, #1a1a2e);
  color: var(--color-text, #eee);
  font-size: 0.9rem;
}

.il-mana {
  position: relative;
  overflow: hidden;
  flex: 1;
}

.il-mana-bar {
  position: absolute;
  inset: 0;
  background: var(--color-accent, #4a6cf7);
  opacity: 0.2;
  transition: width 0.1s linear;
}

.il-body {
  display: flex;
  gap: var(--gap-md, 12px);
}

.il-stats,
.il-queue {
  flex: 1;
}

.il-stats h3,
.il-queue h3 {
  margin: 0 0 var(--gap-sm, 8px);
  font-size: 0.85rem;
  text-transform: uppercase;
  color: var(--color-muted, #888);
}

.il-stat-row {
  display: flex;
  gap: var(--gap-sm, 8px);
  padding: 2px 0;
  font-size: 0.85rem;
}

.il-stat-name {
  flex: 1;
}

.il-stat-bonus {
  color: var(--color-muted, #888);
}

.il-queue-item {
  padding: 4px 8px;
  border-radius: var(--radius-sm, 4px);
  font-size: 0.85rem;
}

.il-queue-item.active {
  background: var(--color-surface, #1a1a2e);
}

.il-progress-bar {
  height: 3px;
  background: var(--color-border, #333);
  border-radius: 2px;
  margin-top: 2px;
  overflow: hidden;
}

.il-progress-fill {
  height: 100%;
  background: var(--color-accent, #4a6cf7);
  transition: width 0.05s linear;
}
</style>

<!--
  ScannerPanel — the police scanner: the last few lines of what happened, edged
  by kind. Under it, the Legends: the clippings the city keeps, opened as
  starter's `AchievementGrid` on the frame's modal stack.
-->
<script setup lang="ts">
import { computed, inject } from 'vue';
import { modalStackKey } from '@/lib';
import Button from '@/ui/components/Button.vue';
import AchievementGrid, { type AchievementCard } from '@/ui/components/AchievementGrid.vue';
import { getCore, getLegends } from '../../modules';

const core = getCore();
const legends = getLegends();
const stack = inject(modalStackKey)!;

const recent = computed(() => core.scanner.value.slice(-8).reverse());
const earned = computed(
  () => legends.legends.getAll().filter((e) => e.achievement.earned.value).length,
);

function openLegends() {
  const cards: AchievementCard[] = legends.legends.getAll().map((e) => ({
    id: e.def.id,
    displayName: e.achievement.earned.value ? e.def.title : '— unwritten —',
    description: e.def.description,
    earned: e.achievement.earned.value,
  }));
  const id = stack.push(AchievementGrid, {
    class: 'paragon-portal clippings',
    title: 'Legends',
    cards,
    onClose: () => stack.remove(id),
  });
}
</script>

<template>
  <section class="panel scanner">
    <span class="caption">Police scanner</span>
    <ol>
      <li v-for="line in recent" :key="line.seq" :class="line.kind">{{ line.text }}</li>
      <li v-if="recent.length === 0" class="quiet">Quiet night. Recruit your first patrol.</li>
    </ol>
    <Button v-if="earned > 0" class="act ghost legends reveal" @click="openLegends">
      Legends <span class="num">{{ earned }} / {{ legends.legends.getAll().length }}</span>
    </Button>
  </section>
</template>

<style scoped>
.scanner ol {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  font-size: 13px;
  line-height: 1.45;
}
.scanner li {
  border-left: 3px solid var(--newsprint-faint);
  padding-left: 8px;
  margin-bottom: 4px;
  color: var(--newsprint-dim);
}
.scanner li.reboot,
.scanner li.upgrade,
.scanner li.legend {
  border-color: var(--signal);
}
.scanner li.rewrite {
  border-color: var(--orbit);
}
.scanner li.elseworld-enter,
.scanner li.elseworld-complete,
.scanner li.elseworld-abandon {
  border-color: var(--cape);
}
.scanner li.automation {
  border-color: var(--steel);
}
.legends {
  margin-top: 8px;
  width: 100%;
}
</style>

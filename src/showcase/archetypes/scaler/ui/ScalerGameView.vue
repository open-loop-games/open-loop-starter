<!--
  ScalerGameView — the in-game subtree. Mounts under the root's post-start
  `v-else`, so the tier-module getters (`getPrestigePoints`, `getCoinProducers`,
  …) resolve here rather than at root setup, where they would run pre-`start()`.
  The root stays routing + chrome only; see `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { Decimal } from '@open-loop/engine';
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui';
import { AppFrame, TabsBarShell, useModalStack } from '@/lib';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import { ResourceHeaderStrip, type ResourceReadout } from '@/ui/compositions';
import { useLatchOnce } from '@/composables/useLatchOnce';
import { manifest } from '../manifest';
import BuildingsPanel from './BuildingsPanel.vue';
import UpgradesPanel from './UpgradesPanel.vue';
import PrestigePanel from './PrestigePanel.vue';
import RunesPanel from './RunesPanel.vue';
import TranscendPanel from './TranscendPanel.vue';
import ChallengesPanel from './ChallengesPanel.vue';
import AchievementsModal from './AchievementsModal.vue';
import {
  getCoinResource,
  getCoinProducers,
  getOfferings,
  getPrestigePoints,
  getPrestigeShards,
  getTranscendPoints,
  getTranscendShards,
} from '../modules';

const emit = defineEmits<{ return: [] }>();

const stack = useModalStack();

const activeTab = ref<string>('buildings');

const prestigePoints = getPrestigePoints();
const prestigeShards = getPrestigeShards();
const transcendPoints = getTranscendPoints();
const transcendShards = getTranscendShards();
const offerings = getOfferings();
const coins = getCoinResource();
const coinProducers = getCoinProducers();

const runesUnlocked = useLatchOnce(() => prestigePoints.cumulative?.value);
const transcendUnlocked = useLatchOnce(() => transcendPoints.cumulative?.value);
const offeringsUnlocked = useLatchOnce(() => prestigePoints.cumulative?.value);
const challengesUnlocked = transcendUnlocked;

const coinRate = computed(() => {
  let total = Decimal.dZero;
  for (const entry of coinProducers.getAll()) {
    total = Decimal.add(
      total,
      Decimal.mul(entry.producer.computedRate.value, entry.producer.count.value),
    );
  }
  return total;
});

const readouts = computed<ResourceReadout[]>(() => [
  {
    id: 'coins',
    label: 'coins',
    value: coins,
    rate: coinRate,
    highlight: ref<'normal' | 'deficit' | 'surplus'>('surplus'),
  },
  {
    id: 'prestige-points',
    label: 'PP',
    value: prestigePoints,
    hidden: computed(
      () => !(Decimal.gt(prestigePoints.value, 0) || Decimal.gt(prestigeShards.value, 0)),
    ),
  },
  {
    id: 'prestige-shards',
    label: 'shards',
    value: prestigeShards,
    hidden: computed(() => !Decimal.gt(prestigeShards.value, 0)),
  },
  {
    id: 'transcend-points',
    label: 'TP',
    value: transcendPoints,
    hidden: computed(
      () => !(Decimal.gt(transcendPoints.value, 0) || Decimal.gt(transcendShards.value, 0)),
    ),
  },
  {
    id: 'transcend-shards',
    label: 'transcend shards',
    value: transcendShards,
    hidden: computed(() => !Decimal.gt(transcendShards.value, 0)),
  },
  {
    id: 'offerings',
    label: 'offerings',
    value: offerings,
    hidden: computed(() => !offeringsUnlocked.value),
  },
]);

function openAchievements(): void {
  const id = stack.push(AchievementsModal, { onClose: () => stack.remove(id) }, 'lg');
}
</script>

<template>
  <AppFrame
    :stack="stack"
    :tooltip-delay="400"
  >
    <template #header>
      <SystemHeader
        :app-name="manifest.name"
        @return-to-slots="emit('return')"
      >
        <template #about>
          <h4 style="margin-bottom: 6px">
            Scaler — Antimatter Physics
          </h4>
          <p>
            Buy producers, watch costs scale, hit a prestige threshold, ascend. Every tier
            compresses the one below it. The headline is the multiplier you build.
          </p>
        </template>
      </SystemHeader>
    </template>
    <TabsRoot
      v-model="activeTab"
      class="scaler-tabs"
    >
      <TabsBarShell>
        <template #resources>
          <ResourceHeaderStrip :readouts="readouts" />
        </template>
        <template #tabs>
          <TabsList class="scaler-tabs__list">
            <TabsTrigger
              value="buildings"
              class="scaler-tabs__trigger"
            >
              Buildings
            </TabsTrigger>
            <TabsTrigger
              value="upgrades"
              class="scaler-tabs__trigger"
            >
              Upgrades
            </TabsTrigger>
            <TabsTrigger
              value="prestige"
              class="scaler-tabs__trigger"
            >
              Prestige
            </TabsTrigger>
            <TabsTrigger
              v-if="transcendUnlocked"
              value="transcend"
              class="scaler-tabs__trigger"
            >
              Transcend
            </TabsTrigger>
            <TabsTrigger
              v-if="runesUnlocked"
              value="runes"
              class="scaler-tabs__trigger"
            >
              Runes
            </TabsTrigger>
            <TabsTrigger
              v-if="challengesUnlocked"
              value="challenges"
              class="scaler-tabs__trigger"
            >
              Challenges
            </TabsTrigger>
          </TabsList>
          <button
            type="button"
            class="scaler-tabs__trigger scaler-tabs__trigger--button"
            @click="openAchievements"
          >
            Achievements
          </button>
        </template>
        <TabsContent
          value="buildings"
          class="scaler-tabs__content"
        >
          <BuildingsPanel />
        </TabsContent>
        <TabsContent
          value="upgrades"
          class="scaler-tabs__content"
        >
          <UpgradesPanel />
        </TabsContent>
        <TabsContent
          value="prestige"
          class="scaler-tabs__content"
        >
          <PrestigePanel />
        </TabsContent>
        <TabsContent
          v-if="transcendUnlocked"
          value="transcend"
          class="scaler-tabs__content"
        >
          <TranscendPanel />
        </TabsContent>
        <TabsContent
          v-if="runesUnlocked"
          value="runes"
          class="scaler-tabs__content"
        >
          <RunesPanel />
        </TabsContent>
        <TabsContent
          v-if="challengesUnlocked"
          value="challenges"
          class="scaler-tabs__content"
        >
          <ChallengesPanel />
        </TabsContent>
      </TabsBarShell>
    </TabsRoot>
  </AppFrame>
</template>

<style scoped>
.scaler-tabs {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}
.scaler-tabs__list {
  display: flex;
  gap: var(--gap-sm);
  flex-wrap: wrap;
}
.scaler-tabs__trigger {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--gap-sm) var(--gap);
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
}
.scaler-tabs__trigger[data-state='active'] {
  background: var(--color-accent, var(--color-surface));
  color: var(--color-text);
  border-color: var(--color-accent, var(--color-border));
}
.scaler-tabs__content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: var(--gap);
}
</style>

<!--
  DefenderGameView — the in-game subtree (the tower-defense board). Mounts under
  the root's post-start `v-else`, so module reads (the panels' getters, the
  end-game overlay) are all safe here. The root stays routing + chrome only;
  see `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { provide, ref } from 'vue';
import { AppFrame, useModalStack } from '@/lib';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import type { TowerId } from '../data/types';
import DefenderFrameLayout from './DefenderFrameLayout.vue';
import RoundStatusHeader from './panels/RoundStatusHeader.vue';
import TowerShop from './panels/TowerShop.vue';
import MapCanvas from './panels/MapCanvas.vue';
import EndGameOverlay from './panels/EndGameOverlay.vue';

const emit = defineEmits<{ return: [] }>();

// Placement state shared across TowerShop (selector) and MapCanvas (target).
// `null` = no tower selected; clicking a tower button sets it, clicking the
// map clears after a successful placement or on right-click. Provided here so
// shop + canvas can stay independent panels.
const selectedTowerType = ref<TowerId | null>(null);
provide('defender:selectedTowerType', selectedTowerType);

const stack = useModalStack();
</script>

<template>
  <AppFrame
    :stack="stack"
    :tooltip-delay="400"
  >
    <template #header>
      <SystemHeader
        app-name="Defender — Bloons"
        @return-to-slots="emit('return')"
      >
        <template #about>
          <h4 style="margin-bottom: 6px">
            Defender — Bloons
          </h4>
          <p>
            Place towers on buildable cells to pop bloons as they walk the path. Survive 10 rounds
            without losing all 40 lives. Stronger bloons (blue / green / yellow) shed into weaker
            children when popped — only red is the floor. Ice freezes; bombs splash and ignore the
            freeze; tack volleys cover short range; darts hit furthest-along-path.
          </p>
        </template>
      </SystemHeader>
    </template>
    <DefenderFrameLayout>
      <template #status>
        <RoundStatusHeader />
      </template>
      <template #map>
        <MapCanvas />
      </template>
      <template #shop>
        <TowerShop />
      </template>
    </DefenderFrameLayout>
  </AppFrame>
  <EndGameOverlay />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AppFrame, SingleColumnShell, useModalStack } from '@/lib';
import { getSlot } from '@/modules/ui-registry';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import { useGame } from '@/composables/useGame';
import { Screen } from '@/types';

const layout = computed(() => getSlot('game-layout'));

const stack = useModalStack();
const { engine, currentScreen } = useGame();

function returnToSlots() {
  engine.saveManager?.save();
  engine.stop();
  currentScreen.value = Screen.Slots;
}
</script>

<template>
  <AppFrame :stack="stack" :tooltip-delay="400">
    <template #header>
      <SystemHeader app-name="Open Loop Starter" @return-to-slots="returnToSlots">
        <template #about>
          <h4 style="margin-bottom: 6px">About</h4>
          <p>
            A minimal open-loop-engine consumer. Uses the starter's built-in shells, modal stack,
            and widget layer.
          </p>
        </template>
      </SystemHeader>
    </template>
    <SingleColumnShell max-width="800px">
      <component :is="layout" />
    </SingleColumnShell>
  </AppFrame>
</template>

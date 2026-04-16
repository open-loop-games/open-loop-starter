<script setup lang="ts">
import { computed } from 'vue';
import { AppFrame, SingleColumnShell, useModalStack } from '@/lib';
import Popover from '@/ui/components/Popover.vue';
import { getSlot } from '@/modules/ui-registry';
import VanillaLayout from '@/ui/layouts/VanillaLayout.vue';
import SavePanel from '@/ui/components/SavePanel.vue';
import SettingsPanel from '@/ui/components/SettingsPanel.vue';
import { useGame } from '@/composables/useGame';
import { Screen } from '@/types';

/**
 * The active mod contributes the `game-layout` slot during its install.
 * Fall back to the vanilla layout if nothing is registered.
 */
const layout = computed(() => getSlot('game-layout') ?? VanillaLayout);

const stack = useModalStack();
const { engine, currentScreen } = useGame();

const openSave = () => {
  const id = stack.push(SavePanel, { onClose: () => stack.remove(id) });
};

const openSettings = () => {
  const id = stack.push(SettingsPanel, { onClose: () => stack.remove(id) });
};

function returnToSlots() {
  engine.saveManager?.save();
  engine.stop();
  currentScreen.value = Screen.Slots;
}
</script>

<template>
  <AppFrame
    :stack="stack"
    :tooltip-delay="400"
  >
    <template #header>
      <div class="game-header">
        <button
          class="title-button"
          data-testid="return-to-slots"
          title="Save and return to save picker"
          @click="returnToSlots"
        >
          <h2>Open Loop Starter</h2>
        </button>
        <div class="header-actions">
          <Popover
            align="end"
            :side-offset="8"
          >
            <template #trigger>
              <button
                class="btn-sm"
                data-testid="open-info"
              >
                ?
              </button>
            </template>
            <h4 style="margin-bottom: 6px">
              About
            </h4>
            <p>
              A minimal open-loop-engine consumer. Uses the starter's
              built-in shells, modal stack, and widget layer.
            </p>
          </Popover>
          <button
            class="btn-sm"
            data-testid="open-save"
            @click="openSave"
          >
            Save
          </button>
          <button
            class="btn-sm"
            data-testid="open-settings"
            @click="openSettings"
          >
            Settings
          </button>
        </div>
      </div>
    </template>
    <SingleColumnShell max-width="800px">
      <component :is="layout" />
    </SingleColumnShell>
  </AppFrame>
</template>

<style scoped>
.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap) var(--gap-lg);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.game-header h2 {
  font-size: 1.1em;
}

.title-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  font: inherit;
}

.title-button:hover h2 {
  color: var(--color-primary);
}

.header-actions {
  display: flex;
  gap: var(--gap-sm);
}
</style>

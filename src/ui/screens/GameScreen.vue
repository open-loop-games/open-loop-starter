<script setup lang="ts">
import { computed } from 'vue';
import { AppFrame, SingleColumnShell, Popover, useModalStack } from 'open-loop-ui';
import { getSlot } from '@/modules/ui-registry';
import VanillaLayout from '@/ui/layouts/VanillaLayout.vue';
import SavePanel from '@/ui/components/SavePanel.vue';
import SettingsPanel from '@/ui/components/SettingsPanel.vue';

/**
 * The active mod contributes the `game-layout` slot during its install.
 * Fall back to the vanilla layout if nothing is registered.
 */
const layout = computed(() => getSlot('game-layout') ?? VanillaLayout);

const stack = useModalStack();

const openSave = () => {
  const id = stack.push(SavePanel, { onClose: () => stack.remove(id) });
};

const openSettings = () => {
  const id = stack.push(SettingsPanel, { onClose: () => stack.remove(id) });
};
</script>

<template>
  <AppFrame :stack="stack" :tooltip-delay="400">
    <template #header>
      <div class="game-header">
        <h2>Open Loop Starter</h2>
        <div class="header-actions">
          <Popover align="end" :side-offset="8">
            <template #trigger>
              <button class="btn-sm" data-testid="open-info">?</button>
            </template>
            <h4 style="margin-bottom: 6px">About</h4>
            <p>
              A minimal open-loop-engine consumer. Uses open-loop-ui shells,
              modal stack, and (as of Phase 2) the widget layer.
            </p>
          </Popover>
          <button class="btn-sm" data-testid="open-save" @click="openSave">Save</button>
          <button class="btn-sm" data-testid="open-settings" @click="openSettings">
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

.header-actions {
  display: flex;
  gap: var(--gap-sm);
}
</style>

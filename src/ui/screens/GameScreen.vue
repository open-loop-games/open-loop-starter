<script setup lang="ts">
import { ref, computed } from 'vue';
import { getSlot } from '@/modules/ui-registry';
import VanillaLayout from '@/ui/layouts/VanillaLayout.vue';
import SavePanel from '@/ui/components/SavePanel.vue';
import SettingsPanel from '@/ui/components/SettingsPanel.vue';

const showSave = ref(false);
const showSettings = ref(false);

/**
 * The active mod contributes the `game-layout` slot during its install.
 * Fall back to the vanilla layout if nothing is registered (e.g. mod omitted
 * the slot but the base game still needs rendering).
 */
const layout = computed(() => getSlot('game-layout') ?? VanillaLayout);
</script>

<template>
  <div class="game-screen">
    <header class="game-header">
      <h2>Open Loop Starter</h2>
      <div class="header-actions">
        <button class="btn-sm" @click="showSave = true">Save</button>
        <button class="btn-sm" @click="showSettings = true">Settings</button>
      </div>
    </header>

    <main class="game-content">
      <component :is="layout" />
    </main>

    <SavePanel v-if="showSave" @close="showSave = false" />
    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

<style scoped>
.game-screen {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

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

.game-content {
  flex: 1;
  padding: var(--gap-lg);
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}
</style>

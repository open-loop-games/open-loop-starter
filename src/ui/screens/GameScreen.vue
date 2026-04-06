<script setup lang="ts">
import { ref } from 'vue';
import SavePanel from '@/ui/components/SavePanel.vue';
import SettingsPanel from '@/ui/components/SettingsPanel.vue';

const showSave = ref(false);
const showSettings = ref(false);
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
      <p class="placeholder">
        Game content goes here. This is the starter template demo.
      </p>
      <p class="placeholder muted">
        Replace this screen with your game's UI.
      </p>
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--gap);
  padding: var(--gap-lg);
}

.placeholder {
  font-size: 1.1em;
}

.muted {
  color: var(--color-text-muted);
  font-size: 0.9em;
}
</style>

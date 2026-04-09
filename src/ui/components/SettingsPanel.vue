<script setup lang="ts">
import { useSettings } from '@/composables/useSettings';
import { NOTATION_OPTIONS } from '@/composables/useNotation';
import BaseModal from './BaseModal.vue';

const emit = defineEmits<{ close: [] }>();
const settings = useSettings();
</script>

<template>
  <BaseModal title="Settings" @close="emit('close')">
    <div class="settings-panel">
      <div class="setting-group">
        <h3>Display</h3>

        <label class="setting">
          <span>Theme</span>
          <select v-model="settings.theme.value">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </label>

        <label class="setting">
          <span>Number Notation</span>
          <select v-model="settings.notation.value">
            <option v-for="opt in NOTATION_OPTIONS" :key="opt.key" :value="opt.key">
              {{ opt.label }}
            </option>
          </select>
        </label>
      </div>

      <div class="setting-group">
        <h3>Game</h3>

        <label class="setting">
          <input v-model="settings.autoSave.value" type="checkbox" />
          Auto-save (every 60 seconds)
        </label>

        <label class="setting">
          <input v-model="settings.offlineProgress.value" type="checkbox" />
          Process offline progress on load
        </label>

        <label class="setting">
          <input v-model="settings.confirmOnClose.value" type="checkbox" />
          Confirm before closing tab
        </label>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap-lg);
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.setting-group h3 {
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: 2px;
}

.setting {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  cursor: pointer;
}

.setting span {
  min-width: 120px;
}

select {
  flex: 1;
  max-width: 260px;
}

input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
</style>

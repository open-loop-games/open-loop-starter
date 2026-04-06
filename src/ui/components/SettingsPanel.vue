<script setup lang="ts">
import { useSettings } from '@/composables/useSettings';
import BaseModal from './BaseModal.vue';

const emit = defineEmits<{ close: [] }>();
const settings = useSettings();
</script>

<template>
  <BaseModal title="Settings" @close="emit('close')">
    <div class="settings-panel">
      <label class="setting">
        <input v-model="settings.autoSave.value" type="checkbox" />
        Auto-save (every 60 seconds)
      </label>

      <label class="setting">
        <input v-model="settings.offlineProgress.value" type="checkbox" />
        Process offline progress on load
      </label>
    </div>
  </BaseModal>
</template>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

.setting {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  cursor: pointer;
}

input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
</style>

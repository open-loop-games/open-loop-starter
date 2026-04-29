<script setup lang="ts">
import { computed } from 'vue';
import { DialogTitle, SwitchRoot, SwitchThumb } from 'reka-ui';
import PanelLayout from '@/ui/components/PanelLayout.vue';
import Select, { type SelectOption } from '@/ui/components/Select.vue';
import { useSettings } from '@/composables/useSettings';
import { NOTATION_OPTIONS } from '@/composables/useNotation';

const emit = defineEmits<{ close: [] }>();
const settings = useSettings();

const themeOptions: ReadonlyArray<SelectOption> = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

const notationOptions = computed<ReadonlyArray<SelectOption>>(() =>
  NOTATION_OPTIONS.map((opt) => ({ value: opt.key, label: opt.label })),
);
</script>

<template>
  <PanelLayout class="settings-panel" data-testid="settings-panel" @close="emit('close')">
    <template #header>
      <DialogTitle as-child>
        <h3 class="olui-panel__title">Settings</h3>
      </DialogTitle>
    </template>
    <div class="setting-group">
      <h3>Display</h3>

      <label class="setting">
        <span>Theme</span>
        <Select v-model="settings.theme.value" :options="themeOptions" aria-label="Theme" />
      </label>

      <label class="setting">
        <span>Number Notation</span>
        <Select
          v-model="settings.notation.value"
          :options="notationOptions"
          aria-label="Number notation"
        />
      </label>
    </div>

    <div class="setting-group">
      <h3>Game</h3>

      <label class="setting setting--switch">
        <SwitchRoot v-model="settings.autoSave.value" class="olui-switch">
          <SwitchThumb class="olui-switch__thumb" />
        </SwitchRoot>
        Auto-save (every 60 seconds)
      </label>

      <label class="setting setting--switch">
        <SwitchRoot v-model="settings.offlineProgress.value" class="olui-switch">
          <SwitchThumb class="olui-switch__thumb" />
        </SwitchRoot>
        Process offline progress on load
      </label>
    </div>
  </PanelLayout>
</template>

<style scoped>
.settings-panel :deep(.olui-panel__body) {
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

.setting :deep(.olui-select__trigger) {
  flex: 1;
  max-width: 260px;
}

.setting--switch {
  cursor: pointer;
}
</style>

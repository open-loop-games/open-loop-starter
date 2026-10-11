<script setup lang="ts">
import { computed } from 'vue';
import { DialogTitle, SwitchRoot, SwitchThumb } from 'reka-ui';
import PanelLayout from '@/ui/components/PanelLayout.vue';
import Select, { type SelectOption } from '@/ui/components/Select.vue';
import { useModule } from '@/composables/useModule';
import { SettingsKey } from '@/modules/settings';
import { usePlayerPrefs } from '@/composables/usePlayerPrefs';
import { NOTATION_OPTIONS } from '@/composables/useNotation';

const emit = defineEmits<{ close: [] }>();
const settings = useModule(SettingsKey).settings;
const prefs = usePlayerPrefs();

const themeOptions: ReadonlyArray<SelectOption> = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

const notationOptions = computed<ReadonlyArray<SelectOption>>(() =>
  NOTATION_OPTIONS.map((opt) => ({ value: opt.id, label: opt.label })),
);

const autoSaveSeconds = computed<number>({
  get: () => Math.round(prefs.autoSaveIntervalMs.value / 1000),
  set: (sec) => {
    const clamped = Math.max(5, Math.min(600, Math.round(sec) || 60));
    prefs.autoSaveIntervalMs.value = clamped * 1000;
  },
});

const uiScalePercent = computed<number>({
  get: () => Math.round(prefs.uiScale.value * 100),
  set: (pct) => {
    prefs.uiScale.value = Math.max(0.75, Math.min(1.5, pct / 100));
  },
});
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
      <p class="setting-group__hint">Shared across every demo in the gallery.</p>

      <label class="setting">
        <span>Theme</span>
        <Select v-model="prefs.theme.value" :options="themeOptions" aria-label="Theme" />
      </label>

      <label class="setting">
        <span>Number Notation</span>
        <Select
          v-model="prefs.notation.value"
          :options="notationOptions"
          aria-label="Number notation"
        />
      </label>

      <label class="setting">
        <span>UI Scale</span>
        <input
          v-model.number="uiScalePercent"
          type="range"
          min="75"
          max="150"
          step="5"
          aria-label="UI scale"
        />
        <span class="setting__value">{{ uiScalePercent }}%</span>
      </label>
    </div>

    <div class="setting-group">
      <h3>Autosave</h3>
      <p class="setting-group__hint">Shared across every demo in the gallery.</p>

      <label class="setting setting--switch">
        <SwitchRoot v-model="prefs.autoSave.value" class="olui-switch">
          <SwitchThumb class="olui-switch__thumb" />
        </SwitchRoot>
        Enabled
      </label>

      <label class="setting">
        <span>Interval</span>
        <input
          v-model.number="autoSaveSeconds"
          type="number"
          min="5"
          max="600"
          step="5"
          :disabled="!prefs.autoSave.value"
          aria-label="Autosave interval seconds"
        />
        <span class="setting__value">seconds</span>
      </label>
    </div>

    <div class="setting-group">
      <h3>This Demo</h3>
      <p class="setting-group__hint">Saved with this demo only.</p>

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

.setting-group__hint {
  font-size: 0.78em;
  color: var(--color-text-muted);
  font-style: italic;
  margin: -4px 0 4px;
}

.setting {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  cursor: pointer;
}

.setting > span:first-child {
  min-width: 120px;
}

.setting__value {
  min-width: 56px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
  font-size: 0.9em;
}

.setting :deep(.olui-select__trigger) {
  flex: 1;
  max-width: 260px;
}

.setting input[type='range'] {
  flex: 1;
  max-width: 200px;
}

.setting input[type='number'] {
  width: 80px;
}

.setting--switch {
  cursor: pointer;
}
</style>

<!--
  SystemHeader — cross-demo header strip mounted by every archetype.

  Owns the title-button-back-to-slots, About popover, optional extra
  actions, and Save / Settings buttons. Slot the title for custom
  shopfronts (Producer's bakery markup); leave default for the standard
  h2-in-a-button shape.

  Also drives the engine's autosave from the player pref refs, by writing
  `engine.autoSaveInterval` (0 when the player turns autosave off) while
  the header is mounted. Theme, ui-scale, and notation
  are bound at app boot in usePlayerPrefs (page-lifetime, demo-agnostic).
-->
<script setup lang="ts">
import { inject, onUnmounted, watch } from 'vue';
import type { Engine } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import Popover from '@/ui/components/Popover.vue';
import SavePanel from '@/ui/components/SavePanel.vue';
import SettingsPanel from '@/ui/components/SettingsPanel.vue';
import { usePlayerPrefs } from '@/composables/usePlayerPrefs';
import { useModalStack } from '@/lib';

withDefaults(
  defineProps<{
    appName?: string;
  }>(),
  { appName: 'Open Loop Starter' },
);

const emit = defineEmits<{ returnToSlots: [] }>();

const engine = inject<Engine>('engine')!;
const stack = useModalStack();
const prefs = usePlayerPrefs();

watch(
  [prefs.autoSave, prefs.autoSaveIntervalMs],
  ([enabled, intervalMs]) => {
    engine.autoSaveInterval = enabled ? Math.max(0, intervalMs) : 0;
  },
  { immediate: true },
);
onUnmounted(() => {
  engine.autoSaveInterval = 0;
});

function openSave(): void {
  const id = stack.push(SavePanel, { onClose: () => stack.remove(id) });
}
function openSettings(): void {
  const id = stack.push(SettingsPanel, { onClose: () => stack.remove(id) });
}
</script>

<template>
  <header class="olui-system-header">
    <slot name="title" :return-to-slots="() => emit('returnToSlots')">
      <Button
        class="olui-system-header__title-btn"
        data-testid="return-to-slots"
        title="Save and return to save picker"
        @click="emit('returnToSlots')"
      >
        <h2>{{ appName }}</h2>
      </Button>
    </slot>
    <div class="olui-system-header__actions">
      <Popover align="end" :side-offset="8">
        <template #trigger>
          <Button class="btn-sm" data-testid="open-info" aria-label="About"> ? </Button>
        </template>
        <slot name="about">
          <h4 style="margin-bottom: 6px">
            {{ appName }}
          </h4>
        </slot>
      </Popover>
      <slot name="extra-actions" />
      <Button class="btn-sm" data-testid="open-save" @click="openSave"> Save </Button>
      <Button class="btn-sm" data-testid="open-settings" @click="openSettings"> Settings </Button>
    </div>
  </header>
</template>

<style scoped>
.olui-system-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap) var(--gap-lg);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.olui-system-header__title-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  font: inherit;
}

.olui-system-header__title-btn h2 {
  font-size: 1.1em;
}

.olui-system-header__title-btn:hover h2 {
  color: var(--color-primary);
}

.olui-system-header__actions {
  display: flex;
  gap: var(--gap-sm);
}
</style>

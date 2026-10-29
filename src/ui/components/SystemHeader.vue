<!--
  SystemHeader — the header strip every archetype mounts.

  Owns the title-button-back-to-slots, About popover, optional extra
  actions, and Save / Settings buttons. The default title is the app name and
  an optional subtitle inside the return button; slot `#title` only for markup
  that shape cannot hold. The About popover holds slot `#about`, then the
  game's `credits` (CreditList).

  Costume classes (stable API) — renames are breaking:
    .olui-system-header                the header strip
    .olui-system-header__heading       the page's h1, around the return button
    .olui-system-header__title-btn     the return-to-slots button
    .olui-system-header__title         the app name
    .olui-system-header__subtitle      the subtitle

  Also drives the engine's autosave from the player pref refs, by writing
  `engine.autoSaveInterval` (0 when the player turns autosave off) while
  the header is mounted. Theme, ui-scale, and notation
  are bound at app boot in usePlayerPrefs (page-lifetime, game-agnostic).
-->
<script setup lang="ts">
import { inject, onUnmounted, watch } from 'vue';
import type { Engine } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import Popover from '@/ui/components/Popover.vue';
import CreditList, { type GameCredit } from '@/ui/components/CreditList.vue';
import SavePanel from '@/ui/components/SavePanel.vue';
import SettingsPanel from '@/ui/components/SettingsPanel.vue';
import { usePlayerPrefs } from '@/composables/usePlayerPrefs';
import { modalStackKey } from '@/lib';

withDefaults(
  defineProps<{
    appName?: string;
    /** A line beside the app name, inside the return button. */
    subtitle?: string;
    /** The sourced assets the game ships, credited under the About text. */
    credits?: GameCredit[];
  }>(),
  { appName: 'Open Loop Starter', subtitle: undefined, credits: () => [] },
);

const emit = defineEmits<{ returnToSlots: [] }>();

const engine = inject<Engine>('engine')!;
// The frame's stack: the one its ModalStack renders.
const stack = inject(modalStackKey)!;
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
  stack.push(SavePanel);
}
function openSettings(): void {
  stack.push(SettingsPanel);
}
</script>

<template>
  <header class="olui-system-header">
    <slot name="title" :return-to-slots="() => emit('returnToSlots')">
      <h1 class="olui-system-header__heading">
        <Button
          class="olui-system-header__title-btn"
          data-testid="return-to-slots"
          title="Save and return to save picker"
          @click="emit('returnToSlots')"
        >
          <span class="olui-system-header__title">{{ appName }}</span>
          <span v-if="subtitle" class="olui-system-header__subtitle">{{ subtitle }}</span>
        </Button>
      </h1>
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
        <CreditList :credits="credits" />
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

.olui-system-header__heading {
  margin: 0;
  font: inherit;
}

.olui-system-header__title-btn {
  display: flex;
  align-items: baseline;
  gap: var(--gap-sm);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  font: inherit;
  text-align: left;
}

.olui-system-header__title {
  font-size: 1.1em;
  font-weight: 600;
}

.olui-system-header__title-btn:hover .olui-system-header__title {
  color: var(--color-primary);
}

.olui-system-header__subtitle {
  color: var(--color-text-muted);
  font-size: 0.9em;
}

.olui-system-header__actions {
  display: flex;
  gap: var(--gap-sm);
}
</style>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from 'vue';
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  VisuallyHidden,
} from 'reka-ui';
import type { Engine } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import PanelLayout from '@/ui/components/PanelLayout.vue';
import { useSave } from '@/composables/useSave';
import { SettingsKey } from '@/modules/settings';

const emit = defineEmits<{ close: [] }>();
const { save, exportSave, importSave, deleteSave, downloadSave, uploadSave } = useSave();

const engine = inject<Engine>('engine')!;
const settingsState = engine.tryInject(SettingsKey);
const liveTimestamp = settingsState?.lastSaveTimestamp;
const initialTimestamp = engine.saveManager?.peek()?.timestamp ?? 0;
const fallbackTimestamp = ref(initialTimestamp);
const lastSavedAt = computed(() => liveTimestamp?.value || fallbackTimestamp.value);

const now = ref(Date.now());
let nowTimer: number | null = null;
onMounted(() => {
  nowTimer = window.setInterval(() => {
    now.value = Date.now();
  }, 1000);
});
onUnmounted(() => {
  if (nowTimer != null) window.clearInterval(nowTimer);
});

const lastSavedLabel = computed(() => {
  const ts = lastSavedAt.value;
  if (!ts) return 'Never';
  const sec = Math.max(0, Math.round((now.value - ts) / 1000));
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(ts).toLocaleString();
});

function manualSave(): void {
  save();
  fallbackTimestamp.value = Date.now();
}

const exportText = ref('');
const importText = ref('');
const showImport = ref(false);
const showDeleteConfirm = ref(false);

function doExport(): void {
  exportText.value = exportSave();
}

function doCopy(): void {
  navigator.clipboard.writeText(exportText.value);
}

function doImport(): void {
  if (importSave(importText.value.trim())) {
    importText.value = '';
    showImport.value = false;
  }
}

function confirmDelete(): void {
  deleteSave();
  showDeleteConfirm.value = false;
}
</script>

<template>
  <PanelLayout class="save-panel" data-testid="save-panel" @close="emit('close')">
    <template #header>
      <DialogTitle as-child>
        <h3 class="olui-panel__title">Save Management</h3>
      </DialogTitle>
    </template>

    <section class="save-section">
      <div class="save-status">
        <span class="save-status__label">Last saved</span>
        <span class="save-status__value">{{ lastSavedLabel }}</span>
      </div>
      <Button class="btn-primary" data-testid="manual-save" @click="manualSave"> Save now </Button>
    </section>

    <hr class="save-divider" />

    <section class="save-section save-section--data">
      <h4 class="save-section__title">Data</h4>
      <div class="actions">
        <Button @click="doExport"> Export </Button>
        <Button @click="showImport = !showImport"> Import </Button>
        <Button @click="downloadSave"> Download File </Button>
        <Button @click="uploadSave"> Upload File </Button>
        <Button
          class="btn-danger btn-sm"
          data-testid="open-delete"
          @click="showDeleteConfirm = true"
        >
          Clear this slot
        </Button>
      </div>

      <div v-if="exportText" class="export-area">
        <textarea readonly :value="exportText" rows="4" />
        <Button class="btn-sm" @click="doCopy"> Copy to clipboard </Button>
      </div>

      <div v-if="showImport" class="import-area">
        <textarea v-model="importText" rows="4" placeholder="Paste save data here..." />
        <Button class="btn-primary btn-sm" :disabled="!importText.trim()" @click="doImport">
          Import
        </Button>
      </div>
    </section>

    <DialogRoot v-model:open="showDeleteConfirm">
      <DialogPortal>
        <DialogOverlay class="dialog-overlay" />
        <DialogContent class="dialog-content">
          <VisuallyHidden>
            <DialogTitle>Clear this save slot</DialogTitle>
            <DialogDescription>Confirm destructive save deletion</DialogDescription>
          </VisuallyHidden>
          <PanelLayout title="Clear this slot?" @close="showDeleteConfirm = false">
            <div class="confirm-body">
              <p>This wipes the active save slot. Other slots and other demos are untouched.</p>
              <div class="confirm-actions">
                <Button class="btn-sm" @click="showDeleteConfirm = false"> Cancel </Button>
                <Button
                  class="btn-sm btn-danger"
                  data-testid="confirm-delete"
                  @click="confirmDelete"
                >
                  Clear slot
                </Button>
              </div>
            </div>
          </PanelLayout>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </PanelLayout>
</template>

<style scoped>
.save-panel :deep(.olui-panel__body) {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

.save-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap);
}

.save-section--data {
  flex-direction: column;
  align-items: stretch;
  gap: var(--gap-sm);
}

.save-section__title {
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin: 0 0 4px;
}

.save-status {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.save-status__label {
  font-size: 0.78em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.save-status__value {
  font-size: 1em;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.save-divider {
  border: 0;
  border-top: 1px solid var(--color-border);
  margin: 0;
}

.actions {
  display: flex;
  gap: var(--gap-sm);
  flex-wrap: wrap;
}

.export-area,
.import-area {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

textarea {
  width: 100%;
}

.confirm-body {
  min-width: 280px;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--gap-sm);
}
</style>

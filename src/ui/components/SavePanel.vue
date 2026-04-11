<script setup lang="ts">
import { ref } from 'vue';
import { PanelLayout } from '@/lib';
import { useSave } from '@/composables/useSave';

const emit = defineEmits<{ close: [] }>();
const { save, exportSave, importSave, deleteSave, downloadSave, uploadSave } = useSave();

const exportText = ref('');
const importText = ref('');
const showImport = ref(false);
const confirmDelete = ref(false);

function doExport() {
  exportText.value = exportSave();
}

function doCopy() {
  navigator.clipboard.writeText(exportText.value);
}

function doImport() {
  if (importSave(importText.value.trim())) {
    importText.value = '';
    showImport.value = false;
  }
}

function doDelete() {
  if (confirmDelete.value) {
    deleteSave();
    confirmDelete.value = false;
  } else {
    confirmDelete.value = true;
    setTimeout(() => {
      confirmDelete.value = false;
    }, 3000);
  }
}
</script>

<template>
  <PanelLayout
    title="Save Management"
    class="save-panel"
    data-testid="save-panel"
    @close="emit('close')"
  >
    <div class="actions">
      <button
        class="btn-primary"
        @click="save"
      >
        Save
      </button>
      <button @click="doExport">
        Export
      </button>
      <button @click="showImport = !showImport">
        Import
      </button>
    </div>

    <div class="actions">
      <button @click="downloadSave">
        Download File
      </button>
      <button @click="uploadSave">
        Upload File
      </button>
      <button
        class="btn-danger btn-sm"
        @click="doDelete"
      >
        {{ confirmDelete ? 'Confirm Delete?' : 'Delete Save' }}
      </button>
    </div>

    <div
      v-if="exportText"
      class="export-area"
    >
      <textarea
        readonly
        :value="exportText"
        rows="4"
      />
      <button
        class="btn-sm"
        @click="doCopy"
      >
        Copy to clipboard
      </button>
    </div>

    <div
      v-if="showImport"
      class="import-area"
    >
      <textarea
        v-model="importText"
        rows="4"
        placeholder="Paste save data here..."
      />
      <button
        class="btn-primary btn-sm"
        :disabled="!importText.trim()"
        @click="doImport"
      >
        Import
      </button>
    </div>
  </PanelLayout>
</template>

<style scoped>
.save-panel :deep(.olui-panel__body) {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
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
</style>

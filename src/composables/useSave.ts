import { ref } from 'vue';
import { useGame } from './useGame';

export function useSave() {
  const { engine } = useGame();
  const mgr = engine.saveManager!;

  const status = ref<string>('');
  let statusTimer: ReturnType<typeof setTimeout> | null = null;

  function showStatus(msg: string) {
    status.value = msg;
    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      status.value = '';
    }, 2000);
  }

  function save() {
    mgr.save();
    showStatus('Saved');
  }

  function exportSave(): string {
    return mgr.exportSave();
  }

  function importSave(data: string): boolean {
    // Backup current save before overwriting
    try {
      const backup = mgr.exportSave();
      if (backup) {
        localStorage.setItem('open-loop-starter-import-backup', backup);
      }
    } catch {
      // No existing save to back up — that's fine
    }

    const result = mgr.importSave(data);
    showStatus(result.success ? 'Imported (backup saved)' : 'Import failed');
    return result.success;
  }

  function deleteSave() {
    mgr.deleteSave();
    showStatus('Save deleted');
  }

  function downloadSave() {
    const data = mgr.exportSave();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `save-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('Downloaded');
  }

  function uploadSave(): Promise<boolean> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return resolve(false);
        const reader = new FileReader();
        reader.onload = () => {
          const result = importSave(reader.result as string);
          resolve(result);
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  return { save, exportSave, importSave, deleteSave, downloadSave, uploadSave, status };
}

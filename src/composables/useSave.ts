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
    const result = mgr.importSave(data);
    showStatus(result.success ? 'Imported' : 'Import failed');
    return result.success;
  }

  function deleteSave() {
    mgr.deleteSave();
    showStatus('Save deleted');
  }

  return { save, exportSave, importSave, deleteSave, status };
}

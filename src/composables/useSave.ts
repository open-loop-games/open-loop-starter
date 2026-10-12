import { useGame } from './useGame';
import { useToasts } from './useToasts';

export function useSave() {
  const { engine } = useGame();
  const mgr = engine.saveManager!;
  const { addToast } = useToasts();

  function save() {
    mgr.save();
    // The settings module toasts "Saved" on the save manager's
    // `save:written`, so a save here needs no toast of its own.
  }

  function exportSave(): string {
    return mgr.exportSave();
  }

  function importSave(saveText: string): boolean {
    try {
      const backup = mgr.exportSave();
      if (backup) {
        localStorage.setItem('open-loop-starter-import-backup', backup);
      }
    } catch {
      // No existing save to back up — that's fine
    }

    const result = mgr.importSave(saveText);
    if (result.success) {
      addToast('Imported', 'Previous save backed up', 2500);
    } else {
      addToast('Import failed', 'Invalid save text', 4000);
    }
    return result.success;
  }

  function deleteSave() {
    mgr.deleteSave();
    addToast('Save deleted', '', 2000);
  }

  function downloadSave() {
    const saveText = mgr.exportSave();
    const blob = new Blob([saveText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `save-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Downloaded', '', 2000);
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

  return { save, exportSave, importSave, deleteSave, downloadSave, uploadSave };
}

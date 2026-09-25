import { SettingsKey } from '@/modules/settings';
import { useGame } from './useGame';
import { useToasts } from './useToasts';

export function useSave() {
  const { engine } = useGame();
  const mgr = engine.saveManager!;
  const { addToast } = useToasts();

  /**
   * Write the active slot and announce it. The announcement lives here rather
   * than in an `onSave` hook, because the engine runs those for exports too.
   * A slot protected by a failed load writes nothing, so it announces nothing.
   */
  function save() {
    if (mgr.isSlotProtected(mgr.activeSlotId)) return;
    mgr.save();
    const lastSaveTimestamp = engine.tryInject(SettingsKey)?.lastSaveTimestamp;
    if (lastSaveTimestamp) lastSaveTimestamp.value = Date.now();
    addToast('Saved', '', 1500);
  }

  function exportSave(): string {
    return mgr.exportSave();
  }

  function importSave(data: string): boolean {
    try {
      const backup = mgr.exportSave();
      if (backup) {
        localStorage.setItem('open-loop-starter-import-backup', backup);
      }
    } catch {
      // No existing save to back up — that's fine
    }

    const result = mgr.importSave(data);
    if (result.success) {
      addToast('Imported', 'Previous save backed up', 2500);
    } else {
      addToast('Import failed', 'Invalid save data', 4000);
    }
    return result.success;
  }

  function deleteSave() {
    mgr.deleteSave();
    addToast('Save deleted', '', 2000);
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

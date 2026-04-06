import { ref } from 'vue';

export function useUI() {
  const showSavePanel = ref(false);
  const showSettings = ref(false);
  const showMenu = ref(false);

  function closeAll() {
    showSavePanel.value = false;
    showSettings.value = false;
    showMenu.value = false;
  }

  return {
    showSavePanel,
    showSettings,
    showMenu,
    closeAll,
  };
}

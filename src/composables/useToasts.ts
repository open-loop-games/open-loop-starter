import { ref, type Ref } from 'vue';

export interface Toast {
  id: number;
  title: string;
  content: string;
  autoHideMs: number | false;
}

let nextId = 0;
const toasts: Ref<Toast[]> = ref([]);

function addToast(title: string, content: string, autoHideMs: number | false = 5000): number {
  const id = nextId++;
  toasts.value.push({ id, title, content, autoHideMs });
  if (autoHideMs !== false) {
    setTimeout(() => removeToast(id), autoHideMs);
  }
  return id;
}

function removeToast(id: number): void {
  const idx = toasts.value.findIndex((t) => t.id === id);
  if (idx !== -1) toasts.value.splice(idx, 1);
}

export function useToasts() {
  return { toasts, addToast, removeToast };
}

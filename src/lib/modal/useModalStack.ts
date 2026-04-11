import { shallowRef, type Component, type InjectionKey, type ShallowRef } from 'vue';

export interface ModalStackEntry {
  id: string;
  component: Component;
  props?: Record<string, unknown>;
}

export interface ModalStackApi {
  stack: ShallowRef<readonly ModalStackEntry[]>;
  push: (component: Component, props?: Record<string, unknown>) => string;
  pop: () => void;
  replace: (component: Component, props?: Record<string, unknown>) => string;
  clear: () => void;
  remove: (id: string) => void;
}

let nextId = 0;
const genId = () => `olui-modal-${++nextId}`;

export function useModalStack(): ModalStackApi {
  const stack = shallowRef<ModalStackEntry[]>([]);

  const push = (component: Component, props?: Record<string, unknown>) => {
    const id = genId();
    stack.value = [...stack.value, { id, component, props }];
    return id;
  };

  const pop = () => {
    if (stack.value.length === 0) return;
    stack.value = stack.value.slice(0, -1);
  };

  const replace = (component: Component, props?: Record<string, unknown>) => {
    const id = genId();
    const next = stack.value.slice(0, -1);
    next.push({ id, component, props });
    stack.value = next;
    return id;
  };

  const clear = () => {
    stack.value = [];
  };

  const remove = (id: string) => {
    const idx = stack.value.findIndex((e) => e.id === id);
    if (idx !== -1) stack.value = stack.value.filter((e) => e.id !== id);
  };

  return { stack, push, pop, replace, clear, remove };
}

export const modalStackKey: InjectionKey<ModalStackApi> = Symbol('olui.modalStack');

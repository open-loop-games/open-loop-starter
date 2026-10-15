import { computed, inject, type ComputedRef, type InjectionKey, type Ref } from 'vue';

/** The element portaled surfaces mount into; AppFrame provides its root. */
export const portalTargetKey: InjectionKey<Readonly<Ref<HTMLElement | null>>> =
  Symbol('olui.portalTarget');

/**
 * Where a modal, popover or select list portals to: the app frame, so a
 * costume class or `data-theme` on the frame or above it reaches the portaled
 * surface too. Outside a frame, and before it mounts, `body`.
 */
export function usePortalTarget(): ComputedRef<HTMLElement | 'body'> {
  const target = inject(portalTargetKey, null);
  return computed(() => target?.value ?? 'body');
}

import { onScopeDispose } from 'vue';

export interface WindowKeysOptions {
  /** Also deliver keyups, for held-key state. */
  up?: boolean;
  /** A press is dropped while this returns false. */
  when?: () => boolean;
  /** Runs when the window loses focus, to release held keys. */
  onBlur?: () => void;
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable ||
    // jsdom has no isContentEditable; the attribute check covers it there.
    target.closest('[contenteditable]:not([contenteditable="false"])') !== null
  );
}

/**
 * Listen for game hotkeys on the window for as long as the calling component
 * lives. Keys typed into a text field, a select or editable content never reach
 * the handler, so the base's own forms (save import, settings) stay typeable.
 *
 * @param handler - receives each key event, and whether the key went down.
 * @param options - keyups, a gate, and a release on blur.
 * @example
 * useWindowKeys((e) => { if (e.key === 'Escape') fitting.hand = null; });
 */
export function useWindowKeys(
  handler: (e: KeyboardEvent, down: boolean) => void,
  options: WindowKeysOptions = {},
): void {
  const { up = false, when, onBlur } = options;
  const deliver = (down: boolean) => (e: KeyboardEvent) => {
    if (isEditable(e.target) || (when && !when())) return;
    handler(e, down);
  };
  const listeners: [string, EventListener][] = [['keydown', deliver(true) as EventListener]];
  if (up) listeners.push(['keyup', deliver(false) as EventListener]);
  if (onBlur) listeners.push(['blur', onBlur]);

  for (const [type, fn] of listeners) window.addEventListener(type, fn);
  onScopeDispose(() => {
    for (const [type, fn] of listeners) window.removeEventListener(type, fn);
  });
}

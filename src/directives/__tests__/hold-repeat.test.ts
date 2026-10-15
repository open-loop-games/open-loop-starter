import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Button from '@/ui/components/Button.vue';

function press(el: Element, init: PointerEventInit = {}): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, ...init }));
}

describe('a held Button press', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires once by default', () => {
    const w = mount(Button, { slots: { default: 'Toggle' } });
    press(w.element);
    vi.advanceTimersByTime(1000);
    expect(w.emitted('click')).toHaveLength(1);
  });

  it('repeats when asked, for a buy button', () => {
    const w = mount(Button, { props: { repeat: true }, slots: { default: 'Buy' } });
    press(w.element);
    vi.advanceTimersByTime(1000);
    expect(w.emitted('click')!.length).toBeGreaterThan(1);
  });

  it('hands the click its event, so a modifier key reads at the press', () => {
    const w = mount(Button, { slots: { default: 'Raise' } });
    press(w.element, { shiftKey: true });
    const [event] = w.emitted<[PointerEvent]>('click')![0];
    expect(event.shiftKey).toBe(true);
  });
});

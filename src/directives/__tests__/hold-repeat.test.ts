import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Button from '@/ui/components/Button.vue';

function press(el: Element): void {
  el.dispatchEvent(new Event('pointerdown', { bubbles: true }));
}

describe('a held Button press', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('repeats by default', () => {
    const w = mount(Button, { slots: { default: 'Buy' } });
    press(w.element);
    vi.advanceTimersByTime(1000);
    expect(w.emitted('click')!.length).toBeGreaterThan(1);
  });

  it('fires once per press with repeat off', () => {
    const w = mount(Button, { props: { repeat: false }, slots: { default: 'Toggle' } });
    press(w.element);
    vi.advanceTimersByTime(1000);
    expect(w.emitted('click')).toHaveLength(1);
  });
});

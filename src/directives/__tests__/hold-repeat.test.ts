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

describe('a Button press from a script', () => {
  // jsdom has no setPointerCapture. A browser has one, and it throws for a
  // pointer id with no active pointer, which is what a scripted press carries.
  beforeEach(() => {
    HTMLElement.prototype.setPointerCapture = () => {
      throw new DOMException('No active pointer with the given id', 'NotFoundError');
    };
  });
  afterEach(() => {
    delete (HTMLElement.prototype as Partial<HTMLElement>).setPointerCapture;
  });

  it('fires on a pointerdown whose pointer the browser cannot capture', () => {
    const w = mount(Button, { slots: { default: 'Buy' } });
    press(w.element);
    expect(w.emitted('click')).toHaveLength(1);
  });

  it('fires on a bare click, as assistive tech and element.click() send', () => {
    const w = mount(Button, { slots: { default: 'Buy' } });
    (w.element as HTMLElement).click();
    expect(w.emitted('click')).toHaveLength(1);
  });

  it('fires once for a pointer press that ends in its click', () => {
    const w = mount(Button, { slots: { default: 'Buy' } });
    const el = w.element as HTMLElement;
    press(el);
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(w.emitted('click')).toHaveLength(1);
  });

  it('fires once for a Space press, whose click follows the keyup', () => {
    const w = mount(Button, { slots: { default: 'Buy' } });
    const el = w.element as HTMLElement;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
    el.click();
    expect(w.emitted('click')).toHaveLength(1);
  });

  it('fires again on a bare click after an earlier press has ended', () => {
    vi.useFakeTimers();
    const w = mount(Button, { slots: { default: 'Buy' } });
    const el = w.element as HTMLElement;
    // An Enter press sends no click of its own: the directive cancels it.
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    vi.runAllTimers();
    el.click();
    expect(w.emitted('click')).toHaveLength(2);
    vi.useRealTimers();
  });

  it('stays silent on a bare click when disabled', () => {
    const w = mount(Button, { props: { as: 'div', disabled: true }, slots: { default: 'Buy' } });
    (w.element as HTMLElement).click();
    expect(w.emitted('click')).toBeUndefined();
  });
});

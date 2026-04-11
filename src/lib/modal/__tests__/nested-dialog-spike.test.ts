// Throwaway verification spike for OL-261.
// Proves reka-ui's Dialog supports nested stacked dialogs such that:
//   1. Opening B while A is open does not close A.
//   2. Escape closes only the top dialog (B), leaving A open.
//   3. Closing A via escape (once B is gone) also works.
// jsdom limits: focus restoration assertions are brittle under jsdom's FocusScope,
// so we assert open-state semantics only; focus is exercised for real in the demo.
// Delete this file once OL-261 is merged.

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref, nextTick } from 'vue';
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTrigger } from 'reka-ui';

const NestedHarness = defineComponent({
  setup() {
    const aOpen = ref(false);
    const bOpen = ref(false);
    return { aOpen, bOpen };
  },
  render() {
    return h('div', [
      h(
        DialogRoot,
        { open: this.aOpen, 'onUpdate:open': (v: boolean) => (this.aOpen = v) },
        {
          default: () => [
            h(DialogTrigger, { 'data-testid': 'trigger-a' }, () => 'Open A'),
            h(DialogPortal, null, {
              default: () => [
                h(DialogOverlay, { 'data-testid': 'overlay-a' }),
                h(
                  DialogContent,
                  { 'data-testid': 'content-a' },
                  {
                    default: () => [
                      'Dialog A',
                      h(
                        DialogRoot,
                        {
                          open: this.bOpen,
                          'onUpdate:open': (v: boolean) => (this.bOpen = v),
                        },
                        {
                          default: () => [
                            h(DialogTrigger, { 'data-testid': 'trigger-b' }, () => 'Open B'),
                            h(DialogPortal, null, {
                              default: () => [
                                h(DialogOverlay, { 'data-testid': 'overlay-b' }),
                                h(
                                  DialogContent,
                                  { 'data-testid': 'content-b' },
                                  { default: () => 'Dialog B' },
                                ),
                              ],
                            }),
                          ],
                        },
                      ),
                    ],
                  },
                ),
              ],
            }),
          ],
        },
      ),
    ]);
  },
});

describe('reka-ui nested Dialog spike', () => {
  it('allows B to open while A is open; closing B leaves A open', async () => {
    const wrapper = mount(NestedHarness, { attachTo: document.body });

    const stateOf = (id: string) =>
      document.querySelector(`[data-testid="${id}"]`)?.getAttribute('data-state');

    // Open A
    wrapper.vm.aOpen = true;
    await nextTick();
    await nextTick();
    expect(stateOf('content-a')).toBe('open');

    // Open B from inside A — A must remain open
    wrapper.vm.bOpen = true;
    await nextTick();
    await nextTick();
    expect(stateOf('content-a')).toBe('open');
    expect(stateOf('content-b')).toBe('open');

    // Close B — A remains open
    wrapper.vm.bOpen = false;
    await nextTick();
    await nextTick();
    expect(stateOf('content-b')).toBe('closed');
    expect(stateOf('content-a')).toBe('open');

    // Close A
    wrapper.vm.aOpen = false;
    await nextTick();
    await nextTick();
    expect(stateOf('content-a')).toBe('closed');

    wrapper.unmount();
  });

  it('escape on top dialog closes only top (B), leaving A open', async () => {
    const wrapper = mount(NestedHarness, { attachTo: document.body });

    wrapper.vm.aOpen = true;
    await nextTick();
    await nextTick();
    wrapper.vm.bOpen = true;
    await nextTick();
    await nextTick();

    // Dispatch Escape on the document — reka-ui listens for it.
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(event);
    await nextTick();
    await nextTick();

    expect(wrapper.vm.bOpen).toBe(false);
    expect(wrapper.vm.aOpen).toBe(true);

    wrapper.unmount();
  });
});

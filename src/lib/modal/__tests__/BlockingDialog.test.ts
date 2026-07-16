import { describe, it, expect, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import BlockingDialog from '../BlockingDialog.vue';

// reka-ui AlertDialog portals its content to document.body, so assertions read
// the document rather than the wrapper subtree.
afterEach(() => {
  document.body.innerHTML = '';
});

describe('BlockingDialog', () => {
  it('renders nothing while closed', () => {
    mount(BlockingDialog, {
      props: { open: false, title: 'Game over' },
      slots: { default: () => h('p', 'You lost') },
    });
    expect(document.body.textContent).not.toContain('Game over');
    expect(document.body.textContent).not.toContain('You lost');
  });

  it('renders the title and slotted body while open', async () => {
    mount(BlockingDialog, {
      props: { open: true, title: 'Game over' },
      slots: { default: () => h('p', 'You lost') },
    });
    await flushPromises();
    expect(document.body.textContent).toContain('Game over');
    expect(document.body.textContent).toContain('You lost');
  });

  it('is blocking: no dismiss affordance is rendered', async () => {
    // The panel has no close button, and open is controlled with no
    // update handler — nothing in the DOM can flip it shut but the app.
    mount(BlockingDialog, {
      props: { open: true, title: 'Blocked' },
      slots: { default: () => h('button', 'Proceed') },
    });
    await flushPromises();
    const panel = document.querySelector('.olui-blocking-dialog__panel');
    expect(panel).not.toBeNull();
    // The only button is the one the game supplied in the slot.
    const buttons = document.querySelectorAll('.olui-blocking-dialog__panel button');
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toContain('Proceed');
  });
});

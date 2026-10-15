import { describe, it, expect, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import AppFrame from '../AppFrame.vue';
import { useModalStack } from '../../modal';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('AppFrame', () => {
  it('puts a class given to it on the frame element', () => {
    const w = mount(AppFrame, { attrs: { class: 'lights-out' } });
    expect(w.find('.olui-app-frame').classes()).toContain('lights-out');
  });

  it('mounts a pushed modal inside the frame, so the costume scope reaches it', async () => {
    const stack = useModalStack();
    mount(AppFrame, { props: { stack }, attrs: { class: 'lights-out' }, attachTo: document.body });
    await flushPromises();
    stack.push(defineComponent({ render: () => h('p', { class: 'note' }, 'Lights out.') }));
    await flushPromises();
    expect(document.querySelector('.lights-out .olui-modal-content .note')).not.toBeNull();
  });
});

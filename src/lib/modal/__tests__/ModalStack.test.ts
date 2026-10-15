import { describe, it, expect, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import ModalStack from '../ModalStack.vue';
import { useModalStack } from '../useModalStack';

// reka-ui Dialog portals its content to document.body, so assertions read
// the document rather than the wrapper subtree.
afterEach(() => {
  document.body.innerHTML = '';
});

const Closable = defineComponent({
  props: { onClose: { type: Function, required: true } },
  setup(props) {
    return () => h('button', { class: 'closer', onClick: () => props.onClose() }, 'Close');
  },
});

describe('ModalStack', () => {
  it('hands a pushed component an onClose that removes its own entry', async () => {
    const stack = useModalStack();
    mount(ModalStack, { props: { stack } });
    stack.push(Closable);
    await flushPromises();

    document.querySelector<HTMLButtonElement>('.closer')!.click();
    await flushPromises();
    expect(stack.stack.value).toHaveLength(0);
  });

  it('lets an explicit onClose prop win over the default', async () => {
    const stack = useModalStack();
    mount(ModalStack, { props: { stack } });
    let called = false;
    stack.push(Closable, {
      onClose: () => {
        called = true;
      },
    });
    await flushPromises();

    document.querySelector<HTMLButtonElement>('.closer')!.click();
    await flushPromises();
    expect(called).toBe(true);
    expect(stack.stack.value).toHaveLength(1);
  });
});

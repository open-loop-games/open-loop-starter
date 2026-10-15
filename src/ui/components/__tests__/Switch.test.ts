import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import Switch from '../Switch.vue';

function mountSwitch(initial: boolean, disabled = false) {
  const on = ref(initial);
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          Switch,
          { modelValue: on.value, 'onUpdate:modelValue': (v: boolean) => (on.value = v), disabled },
          { default: ({ on: state }: { on: boolean }) => (state ? 'On duty' : 'Sent home') },
        ),
    }),
  );
  return { on, wrapper };
}

describe('Switch', () => {
  it('flips its model on click, as a switch with its label inside the button', async () => {
    const { on, wrapper } = mountSwitch(false);
    const button = wrapper.get('.olui-switch');
    expect(button.attributes('role')).toBe('switch');
    expect(button.text()).toBe('Sent home');

    await button.trigger('click');
    expect(on.value).toBe(true);
    expect(button.attributes('aria-checked')).toBe('true');
    expect(button.text()).toBe('On duty');
  });

  it('does not flip while disabled', async () => {
    const { on, wrapper } = mountSwitch(false, true);
    await wrapper.get('.olui-switch').trigger('click');
    expect(on.value).toBe(false);
  });
});

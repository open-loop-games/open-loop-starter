import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { useWindowKeys, type WindowKeysOptions } from '../useWindowKeys';

const mounted: VueWrapper[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount();
  document.body.innerHTML = '';
});

function mountKeys(options?: WindowKeysOptions) {
  const seen: string[] = [];
  const View = defineComponent({
    setup() {
      useWindowKeys((e, down) => seen.push(`${down ? 'down' : 'up'}:${e.key}`), options);
      return () => h('div');
    },
  });
  const wrapper = mount(View);
  mounted.push(wrapper);
  return { seen, wrapper };
}

function press(key: string, target: EventTarget = window, type = 'keydown') {
  target.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
}

describe('useWindowKeys', () => {
  it('delivers window keydowns', () => {
    const { seen } = mountKeys();
    press('r');
    expect(seen).toEqual(['down:r']);
  });

  it('ignores keys typed into an editable field', () => {
    const { seen } = mountKeys();
    for (const tag of ['input', 'textarea', 'select']) {
      const field = document.body.appendChild(document.createElement(tag));
      press('r', field);
    }
    const editable = document.body.appendChild(document.createElement('div'));
    editable.setAttribute('contenteditable', 'true');
    press('r', editable);
    expect(seen).toEqual([]);
  });

  it('delivers keyups too when asked, for held keys', () => {
    const { seen } = mountKeys({ up: true });
    press('ArrowLeft');
    press('ArrowLeft', window, 'keyup');
    expect(seen).toEqual(['down:ArrowLeft', 'up:ArrowLeft']);
  });

  it('drops presses while its gate is closed', () => {
    let open = false;
    const { seen } = mountKeys({ when: () => open });
    press('a');
    open = true;
    press('b');
    expect(seen).toEqual(['down:b']);
  });

  it('runs onBlur when the window loses focus, to release held keys', () => {
    let released = 0;
    mountKeys({ onBlur: () => released++ });
    window.dispatchEvent(new Event('blur'));
    expect(released).toBe(1);
  });

  it('stops listening on unmount', () => {
    const { seen, wrapper } = mountKeys({ up: true });
    wrapper.unmount();
    mounted.length = 0;
    press('r');
    press('r', window, 'keyup');
    expect(seen).toEqual([]);
  });
});

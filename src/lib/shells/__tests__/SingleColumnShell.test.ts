import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SingleColumnShell from '../SingleColumnShell.vue';

describe('<SingleColumnShell />', () => {
  it('renders default slot content', () => {
    const wrapper = mount(SingleColumnShell, {
      slots: { default: '<p data-testid="content">hello</p>' },
    });
    expect(wrapper.find('[data-testid="content"]').exists()).toBe(true);
    expect(wrapper.find('.olui-single-column__inner').exists()).toBe(true);
  });

  it('applies default maxWidth', () => {
    const wrapper = mount(SingleColumnShell);
    const style = wrapper.element.getAttribute('style') ?? '';
    expect(style).toContain('--olui-single-column-max-width: 800px');
  });

  it('applies custom maxWidth prop', () => {
    const wrapper = mount(SingleColumnShell, { props: { maxWidth: '60ch' } });
    const style = wrapper.element.getAttribute('style') ?? '';
    expect(style).toContain('--olui-single-column-max-width: 60ch');
  });
});

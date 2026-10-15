import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ProgressBar from '../ProgressBar.vue';

const fills = (w: ReturnType<typeof mount>) =>
  w.findAll('.olui-progress-bar__fill').map((f) => {
    const style = (f.element as HTMLElement).style;
    const offset = style.getPropertyValue('--progress-bar-offset');
    const ratio = style.getPropertyValue('--progress-bar-ratio');
    return offset ? `${offset}+${ratio}` : ratio;
  });

describe('ProgressBar', () => {
  it('hands the fill its ratio to scale by, rather than a width', () => {
    const w = mount(ProgressBar, { props: { value: 3, max: 4 } });
    expect(fills(w)).toEqual(['0.75']);
    expect((w.get('.olui-progress-bar__fill').element as HTMLElement).style.width).toBe('');
    expect(w.attributes('data-state')).toBe('partial');
  });

  it('shifts each segment past the ones before it', () => {
    const w = mount(ProgressBar, { props: { segments: [{ value: 0.25 }, { value: 0.5 }] } });
    expect(fills(w)).toEqual(['0+0.25', '0.25+0.5']);
  });

  it('draws marks in the units of value and max, clamped to the track', () => {
    const w = mount(ProgressBar, { props: { value: 1, max: 20, marks: [5, Infinity] } });
    const lefts = w
      .findAll('.olui-progress-bar__mark')
      .map((m) => (m.element as HTMLElement).style.left);
    expect(lefts).toEqual(['25%', '100%']);
  });

  it('draws a mark as a position, or with its own class and title', () => {
    const w = mount(ProgressBar, {
      props: { value: 1, max: 4, marks: [1, { at: 2, class: 'ghost', title: 'last night' }] },
    });
    const marks = w.findAll('.olui-progress-bar__mark');
    expect(marks.map((m) => (m.element as HTMLElement).style.left)).toEqual(['25%', '50%']);
    expect(marks[1]!.classes()).toContain('ghost');
    expect(marks[1]!.attributes('title')).toBe('last night');
    expect(marks[0]!.attributes('title')).toBeUndefined();
  });

  it('fills from the right on request, its marks measured from the right too', () => {
    const w = mount(ProgressBar, { props: { value: 1, max: 4, marks: [1], from: 'right' } });
    expect(w.attributes('data-from')).toBe('right');
    expect((w.get('.olui-progress-bar__mark').element as HTMLElement).style.left).toBe('75%');
    expect(mount(ProgressBar, { props: { value: 1 } }).attributes('data-from')).toBe('left');
  });
});

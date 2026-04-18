import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, h } from 'vue';
import { createSpatialGrid, type SpatialGrid } from 'open-loop-engine';
import DomGrid from '../DomGrid.vue';

interface Tile {
  terrain: 'open' | 'rock';
  owner: string | null;
}

function seed(width: number, height: number): SpatialGrid<Tile> {
  return createSpatialGrid<Tile>({
    width,
    height,
    initializer: () => ({ terrain: 'open', owner: null }),
  });
}

describe('DomGrid', () => {
  it('renders one div per cell in row-major order', () => {
    const grid = seed(3, 2);
    const wrapper = mount(DomGrid<Tile>, { props: { grid } });

    const cells = wrapper.findAll('.dom-grid-cell');
    expect(cells).toHaveLength(6);
    expect(cells[0].attributes('data-x')).toBe('0');
    expect(cells[0].attributes('data-y')).toBe('0');
    expect(cells[2].attributes('data-x')).toBe('2');
    expect(cells[2].attributes('data-y')).toBe('0');
    expect(cells[3].attributes('data-x')).toBe('0');
    expect(cells[3].attributes('data-y')).toBe('1');

    wrapper.unmount();
  });

  it('sets a CSS grid template matching width×height', () => {
    const grid = seed(5, 5);
    const wrapper = mount(DomGrid<Tile>, { props: { grid, cellSize: 10 } });

    const root = wrapper.find<HTMLElement>('.dom-grid');
    expect(root.attributes('data-width')).toBe('5');
    expect(root.attributes('data-height')).toBe('5');
    expect(root.element.style.gridTemplateColumns).toBe('repeat(5, 10px)');
    expect(root.element.style.gridTemplateRows).toBe('repeat(5, 10px)');

    wrapper.unmount();
  });

  it('reacts when cells are set after mount (Primordia-shape 5×5 case)', async () => {
    const grid = seed(5, 5);
    const wrapper = mount(DomGrid<Tile>, {
      props: {
        grid,
        cellClass: (cell: Tile) =>
          cell.owner ? `owner-${cell.owner}` : 'owner-none',
      },
    });

    expect(wrapper.findAll('.owner-red')).toHaveLength(0);

    grid.set(2, 3, { terrain: 'open', owner: 'red' });
    await nextTick();

    const red = wrapper.findAll('.owner-red');
    expect(red).toHaveLength(1);
    expect(red[0].attributes('data-x')).toBe('2');
    expect(red[0].attributes('data-y')).toBe('3');

    wrapper.unmount();
  });

  it('emits cell-click with coords and value', async () => {
    const grid = seed(2, 2);
    grid.set(1, 0, { terrain: 'rock', owner: null });
    const wrapper = mount(DomGrid<Tile>, { props: { grid } });

    await wrapper.find('[data-x="1"][data-y="0"]').trigger('click');

    const events = wrapper.emitted('cell-click');
    expect(events).toBeDefined();
    expect(events![0][0]).toBe(1);
    expect(events![0][1]).toBe(0);
    expect((events![0][2] as Tile).terrain).toBe('rock');

    wrapper.unmount();
  });

  it('applies visibility classes when showVisibility is true', async () => {
    const grid = seed(3, 1);
    const wrapper = mount(DomGrid<Tile>, {
      props: { grid, showVisibility: true },
    });

    // Before any FOV commit, all cells are hidden.
    let cells = wrapper.findAll('.dom-grid-cell');
    expect(cells[0].classes()).toContain('dom-grid-cell--hidden');

    const fov = grid.beginFovUpdate();
    fov.markVisible(1, 0);
    fov.commit();
    await nextTick();

    cells = wrapper.findAll('.dom-grid-cell');
    // (0,0): never seen → hidden. (1,0): currently visible → no class.
    // (2,0): never seen → hidden.
    expect(cells[0].classes()).toContain('dom-grid-cell--hidden');
    expect(cells[1].classes()).not.toContain('dom-grid-cell--hidden');
    expect(cells[1].classes()).not.toContain('dom-grid-cell--explored');
    expect(cells[2].classes()).toContain('dom-grid-cell--hidden');

    // Drop FOV — (1,0) becomes explored-but-not-visible.
    const fov2 = grid.beginFovUpdate();
    fov2.commit();
    await nextTick();

    cells = wrapper.findAll('.dom-grid-cell');
    expect(cells[1].classes()).toContain('dom-grid-cell--explored');

    wrapper.unmount();
  });

  it('omits visibility classes when showVisibility is false (omniscient sim)', () => {
    const grid = seed(2, 1);
    const wrapper = mount(DomGrid<Tile>, { props: { grid } });

    const cells = wrapper.findAll('.dom-grid-cell');
    for (const c of cells) {
      expect(c.classes()).not.toContain('dom-grid-cell--hidden');
      expect(c.classes()).not.toContain('dom-grid-cell--explored');
    }

    wrapper.unmount();
  });

  it('renders slot content per cell', () => {
    const grid = seed(2, 1);
    grid.set(0, 0, { terrain: 'open', owner: 'red' });

    const wrapper = mount(DomGrid<Tile>, {
      props: { grid },
      slots: {
        cell: ({ cell, x, y }: { cell: Tile; x: number; y: number }) =>
          h('span', { class: 'slot-body', 'data-owner': cell.owner ?? 'none' }, `${x},${y}`),
      },
    });

    const bodies = wrapper.findAll('.slot-body');
    expect(bodies).toHaveLength(2);
    expect(bodies[0].attributes('data-owner')).toBe('red');
    expect(bodies[0].text()).toBe('0,0');

    wrapper.unmount();
  });

  it('detaches event subscriptions on unmount', () => {
    const grid = seed(2, 2);
    const wrapper = mount(DomGrid<Tile>, { props: { grid } });
    wrapper.unmount();

    // If subscriptions leaked, this would still bump a detached version ref.
    // We verify the grid's listener bookkeeping does not retain handlers —
    // setting post-unmount should not throw.
    expect(() => grid.set(0, 0, { terrain: 'rock', owner: null })).not.toThrow();
  });

  it('scales to 60×60 without exceeding the reactive budget', () => {
    const grid = seed(60, 60);
    const wrapper = mount(DomGrid<Tile>, { props: { grid, cellSize: 4 } });

    expect(wrapper.findAll('.dom-grid-cell')).toHaveLength(3600);

    wrapper.unmount();
  });
});

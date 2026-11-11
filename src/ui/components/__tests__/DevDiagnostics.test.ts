import { afterEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import DevDiagnostics from '../DevDiagnostics.vue';

function mountDock() {
  const engine = { tickDriver: { deltaMean: 0.05, speedMultiplier: 1 } };
  return mount(DevDiagnostics, { global: { provide: { engine } } });
}

async function press(w: ReturnType<typeof mountDock>, testId: string): Promise<void> {
  (w.get(`[data-testid="${testId}"]`).element as HTMLElement).click();
  await nextTick();
}

afterEach(() => sessionStorage.clear());

describe('DevDiagnostics', () => {
  it('starts as a chip, so it covers almost nothing of the game', () => {
    const w = mountDock();
    expect(w.find('[data-testid="dev-dock-open"]').exists()).toBe(true);
    expect(w.find('[data-testid="dev-speed-5x"]').exists()).toBe(false);
  });

  it('opens to the speed buttons and the workbench toggle, and collapses again', async () => {
    const w = mountDock();
    await press(w, 'dev-dock-open');
    expect(w.find('[data-testid="dev-speed-5x"]').exists()).toBe(true);
    expect(w.find('[data-testid="dev-workbench-toggle"]').exists()).toBe(true);

    await press(w, 'dev-dock-close');
    expect(w.find('[data-testid="dev-speed-5x"]').exists()).toBe(false);
  });

  it('stays open across a reload within the dev session', async () => {
    const first = mountDock();
    await press(first, 'dev-dock-open');
    first.unmount();

    const second = mountDock();
    expect(second.find('[data-testid="dev-speed-5x"]').exists()).toBe(true);
  });
});

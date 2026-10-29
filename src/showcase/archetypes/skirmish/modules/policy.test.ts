import { describe, expect, it } from 'vitest';
import { chooseRoute } from './policy';

const NARROWS = 0;
const DOCKS = 1;
const STEPS = 2;

describe('the route a seat sends its units by', () => {
  it('is the shortest when nothing is known to stand on the way', () => {
    expect(chooseRoute('p', STEPS, () => 'clear')).toHaveLength(2);
  });

  it('takes the equal route the enemy is not known to stand on', () => {
    const route = chooseRoute('p', STEPS, (place) => (place === NARROWS ? 'takeable' : 'clear'));
    expect(route).toEqual([DOCKS, STEPS]);
  });

  it('takes the equal route through an enemy it can take over one it cannot', () => {
    const route = chooseRoute('p', STEPS, (place) =>
      place === NARROWS ? 'strong' : place === DOCKS ? 'takeable' : 'clear',
    );
    expect(route).toEqual([DOCKS, STEPS]);
  });

  it('keeps the shortest route when every way is blocked', () => {
    const route = chooseRoute('p', STEPS, (place) =>
      place === NARROWS || place === DOCKS ? 'strong' : 'clear',
    );
    expect(route).toEqual([NARROWS, STEPS]);
  });
});

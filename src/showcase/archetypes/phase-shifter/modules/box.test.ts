import { beforeEach, describe, expect, it } from 'vitest';
import { toNumber } from '@open-loop/engine';
import { BOX_FRAGMENTS } from '../data';
import { boot, tick } from '../sim/harness';
import { getBox } from './box';
import { getCase } from './case';

const num = (r: { value: unknown }) => toNumber(r.value as number);

describe('the box', () => {
  beforeEach(() => boot());

  it('turns each page read into a note, by hand', () => {
    const box = getBox();
    const pages = num(box.pages);
    expect(box.read()).toBe(true);
    expect(num(box.pages)).toBe(pages - 1);
    expect(num(box.notes)).toBeGreaterThan(0);
  });

  it('gives up its fragments to the case log as it is read', () => {
    const box = getBox();
    const { lines } = getCase();
    const [, first] = BOX_FRAGMENTS[0];
    expect(lines.value).not.toContain(first);
    box.read();
    expect(lines.value).toContain(first);
  });

  it('is read by the clerks without a hand on it', async () => {
    const box = getBox();
    box.notes.value = 1000;
    box.clerk.purchase(1);
    const read = num(box.pagesRead);
    await tick(40);
    expect(num(box.pagesRead)).toBeGreaterThan(read);
  });
});

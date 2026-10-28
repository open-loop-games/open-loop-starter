import { describe, expect, it } from 'vitest';
import { formatRoute, parseRoute } from '../galleryRoute';

const known = (id: string) => ['packer', 'tug'].includes(id);

describe('parseRoute', () => {
  it('reads a story hash as its details, and /play as its live demo', () => {
    expect(parseRoute('#/packer', known)).toEqual({ view: 'story', id: 'packer', tab: 'details' });
    expect(parseRoute('#/tug/play', known)).toEqual({ view: 'story', id: 'tug', tab: 'demo' });
  });

  it('falls back to home for an empty or unknown hash', () => {
    expect(parseRoute('', known)).toEqual({ view: 'home' });
    expect(parseRoute('#/nope/play', known)).toEqual({ view: 'home' });
    expect(parseRoute('#/packer/sideways', known)).toEqual({ view: 'home' });
  });

  it('reads #/about', () => {
    expect(parseRoute('#/about', known)).toEqual({ view: 'about' });
  });
});

describe('formatRoute', () => {
  it('round-trips through parseRoute', () => {
    for (const hash of ['#/', '#/about', '#/packer', '#/tug/play']) {
      expect(formatRoute(parseRoute(hash, known))).toBe(hash);
    }
  });
});

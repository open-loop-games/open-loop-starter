import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GameCredit } from '@/ui/components/CreditList.vue';

const ARCHETYPES = join(process.cwd(), 'src/showcase/archetypes');

/** The stories that ship a sourced file: a font, a model, a sprite. */
const shipping = readdirSync(ARCHETYPES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(ARCHETYPES, d.name, 'assets')))
  .map((d) => d.name);

const creditModules = import.meta.glob<{ credits: GameCredit[] }>('./*/credits.ts', {
  eager: true,
});

describe('story credits', () => {
  it.each(shipping)('%s credits what it ships, and its About popover shows them', (story) => {
    expect(creditModules[`./${story}/credits.ts`]?.credits.length).toBeGreaterThan(0);
    const ui = join(ARCHETYPES, story, 'ui');
    const root = readdirSync(ui).find((f) => f.endsWith('AppRoot.vue'))!;
    expect(readFileSync(join(ui, root), 'utf8')).toMatch(/<SystemHeader[^>]*:credits="credits"/);
  });
});

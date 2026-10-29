/**
 * Each story's credits.ts is the source; two surfaces show it.
 *
 * - The About popover shows every entry.
 * - The story's games-site card (`credits` in the root game.json, written by hand) shows only
 *   what requires credit: every entry except a font whose license asks no attribution
 *   (SIL OFL or CC0). A font is an entry whose `what` ends in "font" or "fonts". Each card
 *   line is `<what>: <by> · <license>`, in credits.ts order.
 */
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

const cards: { id: string; credits?: string[] }[] = JSON.parse(
  readFileSync(join(process.cwd(), 'game.json'), 'utf8'),
).cards;

const NO_ATTRIBUTION = /^(SIL OFL|CC0)\b/;

/** The card lines a story's credits call for. */
function cardLines(credits: GameCredit[]): string[] {
  return credits
    .filter((c) => !(/\bfonts?$/.test(c.what) && NO_ATTRIBUTION.test(c.license)))
    .map((c) => `${c.what}: ${c.by} · ${c.license}`);
}

describe('story credits', () => {
  it.each(shipping)('%s credits what it ships, and its About popover shows them', (story) => {
    expect(creditModules[`./${story}/credits.ts`]?.credits.length).toBeGreaterThan(0);
    const ui = join(ARCHETYPES, story, 'ui');
    const root = readdirSync(ui).find((f) => f.endsWith('AppRoot.vue'))!;
    expect(readFileSync(join(ui, root), 'utf8')).toMatch(/<SystemHeader[^>]*:credits="credits"/);
  });

  it.each(cards.map((c) => c.id))("%s's games-site card credits what requires credit", (id) => {
    const credits = creditModules[`./${id}/credits.ts`]?.credits ?? [];
    expect(cards.find((c) => c.id === id)!.credits ?? []).toEqual(cardLines(credits));
  });
});

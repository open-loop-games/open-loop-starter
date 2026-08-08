// ─── Skeleton ───
// Cross-Run Meta — the notes that survive a containment failure, and what they
// buy (`../IDENTITY.md`). Notes accrue from kills and carry through EVERY run
// end, successful or not: this is a continuous accumulator, not a hard-reset
// prestige, and that distinction is the archetype's (see § Balance).
//
// Pure config. `../modules/` read it at construction;
// `../balance/survivor-projection.ts` projects the runs-to-buy ladder from it.

/**
 * Which side of the spine an upgrade touches. Load-bearing, not annotation:
 * `survival` upgrades are ladder-safe, `income` upgrades shift the XP ladder the
 * run is derived against. See § Balance.
 */
export type MetaSide = 'survival' | 'income';

export type MetaEffect =
  | 'damage'
  | 'toughness'
  | 'moveSpeed'
  | 'collectRadius'
  | 'moteYield'
  | 'revive';

export interface MetaUpgradeDef {
  id: string;
  name: string;
  blurb: string;
  effect: MetaEffect;
  side: MetaSide;
  /** Multiplier contributed per level. `revive` is binary and ignores this. */
  perLevel: number;
  maxLevel: number;
  /** Cost of level 1, in notes. Anchored to first-run payout; see § Balance. */
  baseCost: number;
}

/** Geometric cost ladder shared by every upgrade — the runs-to-buy shape. */
export const META_COST_RATIO = 1.9;

/** Notes per kill, before the mix. Multiplied by mean mote yield at payout. */
export const NOTES_PER_KILL = 0.12;

export const META_UPGRADES: MetaUpgradeDef[] = [
  {
    id: 'reinforced-weave',
    name: 'Reinforced Weave',
    blurb: 'The coat holds a little longer each time you rebuild it.',
    effect: 'toughness',
    side: 'survival',
    perLevel: 1.08,
    maxLevel: 5,
    baseCost: 300,
  },
  {
    id: 'refined-reagents',
    name: 'Refined Reagents',
    blurb: 'Cleaner stock. The apparatus notices.',
    effect: 'damage',
    side: 'survival',
    perLevel: 1.07,
    maxLevel: 5,
    baseCost: 320,
  },
  {
    id: 'field-boots',
    name: 'Field Boots',
    blurb: 'Purpose-built for leaving.',
    effect: 'moveSpeed',
    side: 'survival',
    perLevel: 1.05,
    maxLevel: 4,
    baseCost: 280,
  },
  {
    id: 'contingency-vial',
    name: 'Contingency Vial',
    blurb: 'One mistake, forgiven. Once.',
    effect: 'revive',
    side: 'survival',
    perLevel: 1,
    maxLevel: 1,
    baseCost: 1400,
  },
  {
    id: 'wider-aperture',
    name: 'Wider Aperture',
    blurb: 'Motes answer from further out.',
    effect: 'collectRadius',
    side: 'income',
    perLevel: 1.1,
    maxLevel: 4,
    baseCost: 360,
  },
  {
    id: 'assay-bonus',
    name: 'Assay Bonus',
    blurb: 'You have got better at reading what you scraped up.',
    effect: 'moteYield',
    side: 'income',
    perLevel: 1.08,
    maxLevel: 4,
    baseCost: 340,
  },
];

/** Cost of taking `upgrade` from `level` to `level + 1`. Geometric. */
export function upgradeCost(upgrade: MetaUpgradeDef, level: number): number {
  return Math.round(upgrade.baseCost * Math.pow(META_COST_RATIO, level));
}

/** Total notes to take `upgrade` from zero to `maxLevel`. */
export function totalCost(upgrade: MetaUpgradeDef): number {
  let sum = 0;
  for (let l = 0; l < upgrade.maxLevel; l++) sum += upgradeCost(upgrade, l);
  return sum;
}

/**
 * The compounded multiplier a fully-owned set contributes to one side. This is
 * the `runBaseline = ∏ (1 + effectᵢ)` term — the thing that makes yesterday's
 * death fund today's longer run.
 */
export function maxRunBaseline(side: MetaSide): number {
  return META_UPGRADES.filter((u) => u.side === side && u.effect !== 'revive').reduce(
    (product, u) => product * Math.pow(u.perLevel, u.maxLevel),
    1,
  );
}

/** Notes banked by a run that killed `kills` specimens at mean yield `yield`. */
export function notesForRun(kills: number, meanYield: number): number {
  return kills * meanYield * NOTES_PER_KILL;
}

// ─── Balance ────────────────────────────────────────────────────────────────
//   notes(run)   = kills · meanMoteYield · NOTES_PER_KILL
//   cost(ℓ)      = baseCost · META_COST_RATIO^ℓ
//   runBaseline  = ∏ᵢ perLevelᵢ^levelᵢ
//
// ─── The continuous accumulator is the archetype's, and it is deliberate ───
//
// Notes carry through a death. That is what separates this from a hard-reset
// prestige and it is why a failed run is still progress: the loop is "yesterday's
// twenty-minute death funds today's thirty-minute completion", not "win to
// advance". Removing it does not make the game harder, it makes failure worthless,
// which is a different game.
//
// ─── `side` decides whether an upgrade is ladder-safe ───
//
// This is the load-bearing classification in the file, and it follows from the
// flat-TTK design rather than from taste.
//
// Income is `spawnRate · engage · meanMoteYield · η` — it does NOT contain DPS.
// So a `survival` upgrade (damage, toughness, move speed) buys exactly what its
// name says and nothing else: more DPS shortens time-to-kill, which lowers
// residency, which lowers density, which lowers contact. Kill rate is set by how
// much the seat chooses to engage, so income is untouched and the XP ladder still
// means what it was derived to mean.
//
// An `income` upgrade is different in kind. `collectRadius` moves η and
// `moteYield` moves the yield term, both of which are inside the income the
// ladder was derived against, so owning them makes beats land earlier than the
// schedule says. At full investment that is ×1.46 on η and ×1.36 on yield — very
// nearly a DOUBLING of income against a run-1 ladder.
//
// That front-loading is intended: the meta arc is supposed to make later runs
// bloom faster, and it is bounded by `maxLevel` rather than drifting. It is not
// the collector bug wearing a hat — the difference is that this one is declared,
// capped, and derived. But it does mean two things a fork must not forget:
//
//   1. The ladder is derived for a ZERO-META run. Deriving it against a
//      mid-progression baseline instead would make run 1 unplayably slow.
//   2. Adding an income-side upgrade changes the whole meta arc's pacing, not
//      just its own line. Check the declared bound in the projection's meta
//      report before adding one, and prefer a survival-side effect when the
//      design is indifferent — it costs the schedule nothing.
//
// ─── Cost anchoring ───
//
// `baseCost` is anchored to the expected payout of a FIRST run — the one a player
// actually has when they first see the shop — so the opening purchase is roughly
// one run away rather than a wall. `META_COST_RATIO` at 1.9 is the runs-to-buy
// ladder: each level costs a bit under twice the last, so an upgrade's fifth
// level is an arc rather than an afternoon. The projection prints the ladder in
// runs; that table is the thing to read when this feels wrong, not the constants.
//
// `contingency-vial` is priced off the ladder deliberately. It is binary and it
// changes a run's shape rather than its rate, so pricing it as a level-1 tile
// would make it the obvious first buy and flatten the opening decision.
//
// ─── Known thin ───
//
// `NOTES_PER_KILL` is flat per kill and then multiplied by mean yield, so heavy
// tiers pay more only through the yield term. Whether a Warden should pay a
// premium *beyond* its motes — the "was that fight worth stopping for" question —
// is unanswered, and it is the kind of thing that decides whether elites read as
// obstacles or as opportunities. The corpus is unhelpful here: the exact
// per-enemy drop formula is flagged low-confidence in the source analyses.

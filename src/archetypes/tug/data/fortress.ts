import type { FortressDef } from './types';

// ─── Skeleton ───
// One fortress shape, applied symmetrically to both sides. Modeled as an
// immobile unit at each side's lane endpoint per the fortress-as-unit
// engagement model — opposing units engage at the wall and pump damage
// per tick instead of suiciding on arrival. SC2 Direct Strike source has
// fortresses with armor types and (in some variants) tower return-fire;
// the FortressDef shape supports both. Skeleton baseline ships a pure
// damage-sponge: no return fire, no resistance.

// ─── Costume ───
// Theme C SciFi Armada per archetypes/tug.md § 11. The fortress is the
// `Nexus` (per `TUG_THEME.fortressName`) — labels live in the theme,
// numbers live here.

// ─── Balance ───
// `hp: 5_000` matches the pre-fortress-as-unit constant the match module
// pinned to `data.balance.fortressHp`. `damagePerHit: 0` and empty
// resistance keep v1 gameplay identical to the prior shape (damage sponge,
// no return fire). Leaf 6's tuner perturbs `'fortress/hp'` against
// match-duration probes; resistance entries become tuner axes only when
// variants ship a non-empty default.

export const TUG_FORTRESS: FortressDef = {
  hp: 5_000,
  damagePerHit: 0,
  resistance: {},
};

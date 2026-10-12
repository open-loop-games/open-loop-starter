import type { RevisionDef } from './types';

// ─── Skeleton ───
// 19 revisions on three threshold families: 7 fleet-count, 8 per-class (one per
// class, all at the same depth), 4 lifetime-mass. Every predicate is a discrete
// step on a COUNT or a LIFETIME TOTAL — never on current production. That is a
// spine constraint, not a style preference; see § Balance.

// ─── Costume ───
// A revision is a firmware push. Crossing a replication milestone teaches the
// swarm something, and the swarm is one program, so the improvement lands on
// every probe at once — which is why the reward is global.

/** Applied when a `RevisionDef` omits its own multiplier. */
export const DEFAULT_REVISION_MULTIPLIER = 1.03;

/** Lifetime-mass revisions are rarer and worth more. */
const DEEP_REVISION_MULTIPLIER = 1.05;

export const REVISIONS: RevisionDef[] = [
  // ── 7 fleet-count ──
  {
    id: 'rev-quorum',
    displayName: 'Quorum',
    description: 'Ten probes agree on a build order.',
    goal: (s) => s.fleetSizeAtLeast(10),
  },
  {
    id: 'rev-consensus',
    displayName: 'Consensus',
    description: 'Twenty-five probes hold one shared plan.',
    goal: (s) => s.fleetSizeAtLeast(25),
  },
  {
    id: 'rev-lattice-sync',
    displayName: 'Lattice Sync',
    description: 'Fifty probes tick together.',
    goal: (s) => s.fleetSizeAtLeast(50),
  },
  {
    id: 'rev-standard-pattern',
    displayName: 'Standard Pattern',
    description: 'A hundred probes built from one template.',
    goal: (s) => s.fleetSizeAtLeast(100),
  },
  {
    id: 'rev-self-audit',
    displayName: 'Self-Audit',
    description: 'Two hundred and fifty probes check each other.',
    goal: (s) => s.fleetSizeAtLeast(250),
  },
  {
    id: 'rev-error-correction',
    displayName: 'Error Correction',
    description: 'Copy drift is detected and reverted at five hundred.',
    goal: (s) => s.fleetSizeAtLeast(500),
  },
  {
    id: 'rev-canonical-build',
    displayName: 'Canonical Build',
    description: 'A thousand probes. There is one right way to be a probe.',
    goal: (s) => s.fleetSizeAtLeast(1_000),
  },

  // ── 8 per-class, all at 25 units ──
  {
    id: 'rev-seed-doctrine',
    displayName: 'Seed Doctrine',
    description: 'Twenty-five Seeds. Dust is a solved problem.',
    goal: (s) => s.classCountAtLeast('seed', 25),
  },
  {
    id: 'rev-drone-doctrine',
    displayName: 'Drone Doctrine',
    description: 'Twenty-five Drones replicating unattended.',
    goal: (s) => s.classCountAtLeast('drone', 25),
  },
  {
    id: 'rev-foundry-doctrine',
    displayName: 'Foundry Doctrine',
    description: 'Twenty-five Foundries running the same smelt.',
    goal: (s) => s.classCountAtLeast('foundry', 25),
  },
  {
    id: 'rev-hauler-doctrine',
    displayName: 'Hauler Doctrine',
    description: 'Twenty-five Haulers on optimal transfer orbits.',
    goal: (s) => s.classCountAtLeast('hauler', 25),
  },
  {
    id: 'rev-ring-doctrine',
    displayName: 'Ring Doctrine',
    description: 'Twenty-five Rings. Moons are inventory.',
    goal: (s) => s.classCountAtLeast('ring', 25),
  },
  {
    id: 'rev-lathe-doctrine',
    displayName: 'Lathe Doctrine',
    description: 'Twenty-five Lathes. So are planets.',
    goal: (s) => s.classCountAtLeast('lathe', 25),
  },
  {
    id: 'rev-swarm-doctrine',
    displayName: 'Swarm Doctrine',
    description: 'Twenty-five Swarms drinking from twenty-five stars.',
    goal: (s) => s.classCountAtLeast('swarm', 25),
  },
  {
    id: 'rev-shell-doctrine',
    displayName: 'Shell Doctrine',
    description: 'Twenty-five Shells. The sky is going dark on schedule.',
    goal: (s) => s.classCountAtLeast('shell', 25),
  },

  // ── 4 lifetime-mass ──
  {
    id: 'rev-first-thousand',
    displayName: 'First Thousand',
    description: 'A thousand units of matter converted.',
    multiplier: DEEP_REVISION_MULTIPLIER,
    goal: (s) => s.lifetimeMassAtLeast(1e3),
  },
  {
    id: 'rev-first-million',
    displayName: 'First Million',
    description: 'A million. The swarm stops reporting individual probes.',
    multiplier: DEEP_REVISION_MULTIPLIER,
    goal: (s) => s.lifetimeMassAtLeast(1e6),
  },
  {
    id: 'rev-first-billion',
    displayName: 'First Billion',
    description: 'A billion. Nobody is counting probes any more.',
    multiplier: DEEP_REVISION_MULTIPLIER,
    goal: (s) => s.lifetimeMassAtLeast(1e9),
  },
  {
    id: 'rev-first-trillion',
    displayName: 'First Trillion',
    description: 'A trillion. The unit was chosen before it was needed.',
    multiplier: DEEP_REVISION_MULTIPLIER,
    goal: (s) => s.lifetimeMassAtLeast(1e12),
  },
];

// ─── Balance ────────────────────────────────────────────────────────────────
// The `revisions` chain — one of the four that multiply into every class's
// rate (`../IDENTITY.md` § Rate-function spine).
//
// ── The constraint that keeps the spine closed ──────────────────────────────
// Every predicate above is a DISCRETE STEP on a count or a lifetime total.
// This is load-bearing, and it is the archetype's most silent coupling.
//
// `design-playbook/modifier-chains.mdx` § When does state-dependence break the
// algebra: a multiplier that grows with the same state the rate depends on is
// formally `r(x)·f(x)`, which does not simplify and has no elementary
// cumulative. First-passage stops closing; the late-game shape becomes whatever
// the state-dependence produces.
//
// Threshold-keyed revisions dodge that entirely. BETWEEN thresholds the
// multiplier is CONSTANT, so `composition.mdx` § Modifier-product applies
// unchanged within the band; crossing one is a § Piecewise splice point with a
// precomputable regime cumulative. The composition closes as
// `piecewise(bands) × modifier-product(within band)` — but only because the
// steps are discrete.
//
// So: a revision reading "+1% per 10 mass/sec" would run fine, look reasonable
// in the UI, and take the archetype off the closed form. The projection would
// stop predicting the game and NOTHING WOULD RED. If a fork wants a continuous
// global multiplier, the spine has to be re-declared against a different
// bucket first — that is a spine decision, not a data edit.
//
// ── Sizing ──────────────────────────────────────────────────────────────────
// Full completion multiplies the chain by:
//
//   1.03^15 × 1.05^4 = 1.558 × 1.216 = 1.89×
//
// PROVISIONAL. The four chains are sized against each other in the balance
// pass, not independently; this one is deliberately the second-smallest so
// that revisions read as punctuation on the arc rather than as the arc. The
// splice points themselves are the design payload — a step the player feels —
// and their SPACING matters more than their size. Re-tune target: if the arc
// probe reports bands so long that a revision is forgotten before the next
// one is earned, move the thresholds, not the multipliers.
//
// The per-class family sits at one depth (25) on purpose: it makes handoff
// depth legible against `./curve.ts` § Flow-channel map, where 25 is late in
// Flow-upper. A class that never reaches 25 units under the shipping
// allocation rule is a class whose revision is dead content — that is a
// finding for the allocation probe, and the fix is the ladder, not this file.

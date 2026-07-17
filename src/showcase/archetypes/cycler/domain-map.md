# Cycler — domain language

Phase-alternation over shared state: a saturating capacity ceiling D_max races an exogenous, time-scheduled burn W(t). The run ends — and pays out — at the crossing; prestige re-pegs W₀ = D_max/H so run length stays authored while reach climbs.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **ConnectionShape** _(string-literal union)_ — `cross` · `diagonal` · `ring` · `reach`
- **PieceKind** _(string-literal union)_ — `reactor` · `lance` · `relay` · `pylon` · `bulwark`
- **PieceRole** _(string-literal union)_ — `producer` · `tower` · `booster` · `repair`
- **UpgradeKind** _(string-literal union)_ — `reach` · `g-bender`

## Definitions

`BuildBalance`, `BurnTier`, `CadenceBalance`, `DefenseBalance`, `PieceDef`, `PrestigeBalance`, `ThreatBalance`, `UpgradeBalance`, `UpgradeDef`

## Relationships

Field-name reference edges — untyped IDs in named fields that point at
another domain noun. (These are name-encoded, not type-encoded, so
type-graph tools like dependency-cruiser/findReferences miss them.)

- **BuildBalance** → `upgrade`

## Thin spots

Definitions with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`CadenceBalance`, `DefenseBalance`, `PieceDef`, `PrestigeBalance`, `ThreatBalance`, `BurnTier`

## Disambiguators (curated)

Hand-authored. The module-level concepts no single type owns — the
relationships structure cannot derive. Kept small and co-located in the
config so staleness stays visible against the generated surface above.

- **burn** — The exogenous pressure W(t) = W₀·g^((t−τ_setup)/T_g) — a pure function of run-time, never derived from within-run state. Its crossing of D_max ends the run.
- **the peg** — W₀ = D_max / H. Because D_max/W₀ = H always, run length N* = τ_setup + T_g·log_g(H) is directly authored; a power upgrade re-baselines W₀ and adds zero run length (reach, not pacing).
- **headroom** — H = D_max / W₀ — the difficulty lever. Sets run length directly; the peg holds it constant as D_max climbs.
- **burn tier** — A reach-gated pace preset overriding (g, T_g). Deeper tiers raise g — a steeper escalation, a shorter/sharper run. The g-bender upgrade is the mirror lever that bends g back toward 1.
- **merge** — The prestige boundary: on the crossing the run auto-banks sublinear Fragments (⌊∛production⌋ + ⌊∛endurance⌋), the player spends between runs, and the merge re-pegs for the next run.

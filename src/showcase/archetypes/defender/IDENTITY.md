# Defender — archetype identity (Bloons TD 1 first-arc port)

> **Wave-Pacing + Threat-Range Coverage + Cost Scaling** — commit static
> defenders before the threat arrives, then watch the outcome resolve. You are
> the architect, not a participant.

**Subtractive clone** (see `../README.md` § Two honest ways to source numbers):
balance constants are lifted verbatim from the decompiled Bloons TD 1 ActionScript
(`open-loop-research/reference-code/bloons-td-1/scripts/`), pinned at `tunable()`
reader sites with `BloonsTD.as:LINE` / `Tower.as:LINE` / `Bloon.as:LINE` citations
(§ Citations). Not the forward model — the older direct-cut-down path. Identity line
source: `archetypes/_identity.md` (Defender row).

## What this archetype is

You lay towers from a fixed roster before a wave arrives; you spend a small currency
pool on opening placements; then the wave walks a fixed path and you watch it resolve
without mid-wave commands. Between rounds you buy another tower, upgrade a range,
commit again. The texture is *tension held across a pause* — the wave is coming, you
have seconds to prepare, and once it starts the board tells you whether your
architectural decision was right. The strategic surface is **coverage composition
under cost pressure**: Dart is general-purpose, Tack cheap area-coverage near tight
bends, Bomb heavy splash single-target, Ice slows and softens the wave for downstream
towers. Money flows from per-pop drops + round-clear bonuses; you lose when too many
bloons leak past the exit.

> **NOT Placement-Adjacency.** BTD1's vanilla towers have area-of-effect (Tack
> 8-directional, Bomb radius) but no neighbour-*bonus* structure. The
> Placement-Adjacency shape (gem pairing, building-buff synergy) arrives later under a
> Defender–Packer hybrid with GemCraft as its exemplar (OL-1021 framing correction).

## Rate-function spine / bucket

**Bucket: none in the rate-function family — discrete-event survival.** Defender is
the honest case of a clone whose economy sits *outside* closed-form rate algebra:
there is no continuous income channel (§ Stasis bifurcation in
`archetypes/BALANCING-defender.md`), tower cost is **flat/linear** (no per-unit growth
in arc 1), and the wave schedule is fixed verbatim content, not a curve. Income is
per-pop drops (1/pop) plus a **linear-decreasing** round-clear bonus (`101 − round`),
run against an escalating fixed wave schedule. Because there is no rate spine, balance
here is **swept and measured**, not projected — methodology #3 (range-scale sensitivity
sweep) + #6 (survival-rate distribution) per `BALANCING.md § Bucket → methodology
lookup`. A fork that wants a projectable Defender adds a continuous economy; vanilla
BTD1 has none, and this port is honest about that.

## The loop — beat map

Rounds 1–10, measured (never authored). Round 1 onboarding (12 reds, a single Dart
suffices) → round 3 first blue-shed observed → round 6 first non-red shed wave (10
greens) → round 10 arc closure (35 greens). Money-budgeting tension peaks at rounds
7–9; round 10 resolves cleanly or fails on coverage gaps in the second half of the
path. Beat windows + predicates live in `balance/balance.ts` (`BEAT_WINDOWS`,
`ARC_BEATS`).

## Canonical exemplar + arc-1 scope (the clone ledger)

**Canonical exemplar:** Bloons TD 1 (2007 Flash), rounds 1–10 — 4 towers
(Dart / Tack / Bomb / Ice), 4 bloon types on a 1-HP shedding ladder
(red / blue / green / yellow), one Monkey-Lane path.

**Out of scope (arc 1):** the upgrade tree (`BloonsTD.as:808-815` ships costs; arc 1
stays on base towers); bloon ranks 5+ (pink/black/lead/camo/ceramic/MOAB) and rounds
11–50; Spikey + Super Monkey towers (`BloonsTD.as:804,807`); multiple maps (Monkey
Lane only).

## Engine fit (pattern → primitive)

| Pattern | Engine primitive | Note |
|---|---|---|
| Wave Pacing | round/wave sequencer over a fixed schedule | verbatim BTD1 content, not perturbable |
| Threat-Range Coverage | tower range × path × placement, discrete-event tick | the methodology-#3 sweep knob (`towers/<id>/rangeLaneUnits`) |
| Cost Scaling | per-tower flat cost + round-clear bonus | linear, no per-unit growth in arc 1 |
| Perturbation | `tunable()` reader sites keyed in `modules/tuning.ts` | verbatim AS constants pinned with citations |

## Balance model — three lanes (with an honest gap)

See `../README.md` § Balance. Defender carries the **lens/spec** but its Lane-2 probe
and Lane-3 lock are **specced, not yet wired** — a real gap, not a claim of coverage:

```
balance/balance.ts            (no probe script)          (no sim/ lock)
identity + beat windows +     Lane-2 probe: UNBUILT       Lane-3 lock: UNBUILT
predicates + methodology fit  (methodology #3 sweep +     (beat-window locks the
(the lens, made typed)         #6 survival distribution)   spec already defines)
```

`balance/balance.ts` holds `DEFENDER_IDENTITY` + `DEFENDER_PHASES` (identity, now also
narrated above) and `BEAT_WINDOWS` + `ARC_BEATS` + predicates (the Lane-3 lock spec).
It is currently **consumed by nothing** — the driving probe and the vitest lock that
would exercise it were never written (unlike the sibling ports, whose `balance.ts`
feeds a `solve.ts`/`run.ts`/`probes.ts`). Wiring the methodology #3/#6 probe and
promoting the beat windows to a `sim/*.probe.test.ts` lock is deferred balance work,
tracked in `archetypes/BALANCING-defender.md`; this migration only makes the identity
surface canonical and records the gap honestly.

## Citations

Verbatim BTD1 balance sources (all pinned at `tunable()` sites):

- Tower costs / ranges / starting money / max lives / sell rate: `BloonsTD.as:802-826`
- Wave compositions (arc 1 uses rounds 1–10 of 1–50): `BloonsTD.as:574+ BuildLevels()`
- Per-tower fire mechanics (attack rate, projectile speed, pierce): `Tower.as:178-216`
- Targeting policy (furthest-along-path, frozen-skip for non-bomb): `Tower.as:257-296`
- Bloon shedding (rank N → N-1 on pop): `Bloon.as:279-281`
- Lives-on-leak = bloon rank: `BloonsTD.as:1151`; money-per-pop = 1: `BloonsTD.as:1142`
- Round-clear bonus = `101 − round`: `BloonsTD.as:1174-1175`
- Ice freeze + thaw timeout: `Bloon.as:176`, `Tower.as:215`

## Cross-references

- Sibling clone: `src/showcase/archetypes/interlocker/`
- Methodology + balance kit: `../README.md`, `archetypes/BALANCING.md`,
  `archetypes/BALANCING-defender.md`
- Engine API: `open-loop-engine/docs/api/INDEX.md`, `consumer-guide.md`

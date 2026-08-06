# Balancing — Defender

Per-archetype balance log per `BALANCING.md § Graduating findings`. Records what was *learned* across Defender's balance passes — instrument-earning moments, methodology stresses, engine-surface gaps, drift signals, numerical surprises. Not chosen values (those live at `tunable()` sites), not beat windows (`balance/balance.ts`), not per-pass status or ticket IDs.

When an entry generalizes across archetypes, file a PR moving the abstracted rule into `BALANCING.md` and leave the worked example here.

## Methodology — AS scripts aren't the whole source; decompile the SWF

Phase 5a opened on the assumption that `open-loop-research/reference-code/bloons-td-1/scripts/` (the AS extraction under `__Packages/`) was the canonical source. It isn't — it's *one* extraction. The SWF carries additional authoritative data in non-script tags (stage header, MovieClip per-frame `Matrix tx/ty`, shape primitives) that the AS extract doesn't surface. Treating the AS as the whole source meant authoring stand-ins for anything not literally in `BloonsTD.as` / `Tower.as` / `Bloon.as` — and several of those stand-ins were wrong in ways that warped balance.

What the AS-only assumption missed, and what the SWF decompile (`ffdec` at `/usr/bin/ffdec`, output at `/tmp/btd1-xfl/`) actually provides:

| Datum | AS-only stand-in | SWF actual | Source |
| --- | --- | --- | --- |
| Frame rate | 30 fps (folkloric) | **40 fps** | `DOMDocument.xml frameRate="40"` |
| Stage dimensions | guessed ~580×400 px | **640×480 px** | `DOMDocument.xml width/height` |
| `spawnIntervalSec` | hardcoded 0.5 everywhere | per-round `(16 − round) / 40` | formula already in `BloonsTD.as:1002`; we'd just hardcoded a derivative |
| Bloon speeds | 30 / 45 / 60 / 90 px/s (wiki ratio 1 : 1.5 : 2 : 3) | **93.4 / 111.4 / 160.7 / 290.8 px/s** (ratio 1 : 1.19 : 1.72 : 3.11) | per-plain MovieClip `DOMFrame duration`: 914/766/531/293 frames @ 40 fps over 2137 px path |
| Path waypoints | hand-authored 14 integer-cell points (a guess at "monkey lane shape") | **19 waypoints** decimated via Douglas-Peucker (eps=10px) from 915 per-frame `Matrix tx/ty` entries | `LIBRARY/Symbol 10.xml` (plain1) Layer 2 timeline |
| Bomb splash radius | 30 px stand-in | **~40 px** (rectangular hitbox, modeled as circle of radius = half-major-dimension) | `Symbol 129` hitbit = `Symbol 43` (138×192 twips = 6.9×9.6 px) scaled `a=11.578, d=8.319` at explosion frame |

The methodological rule: when the upstream source is a binary asset with multiple extraction surfaces, **enumerate the surfaces before treating any one of them as canonical**. A `scripts/` directory pulled out by a script-only decompiler covers maybe 60% of what's load-bearing for balance; the rest lives in shape data, sprite timelines, sound buckets, and the file header. Pull all of it before declaring "verbatim from the source."

Two-scale coordinate system stays as the structural answer: placement grid coarse (20×15 cells) for game-feel; distance / range / speed in BTD1 pixels via `PathDef.cellSizePixels`. With the SWF-exact `cellSizePixels = 32`, the placement grid lands at 640×480 px — matches BTD1 stage *exactly* (vs. the 600×450 / cellSizePixels=30 first attempt against a guessed 580×400 stage).

- **Receipts:**
  - `decompile/README.md` has the WC3 tooling, but `ffdec` is system-installed at `/usr/bin/ffdec` (JPEXS Free Flash Decompiler v24.1.0); `ffdec -export xfl <out> <swf>` produces the full XFL tree.
  - `src/showcase/archetypes/defender/data/path.ts` — 19 plain1-extracted waypoints, header documents the extraction.
  - `src/showcase/archetypes/defender/data/bloons.ts` — speeds per `plainN` frame-count table in the header.
  - `src/showcase/archetypes/defender/data/towers.ts` — all `/30` → `/40` time conversions; bomb splash 40px.
  - `src/showcase/archetypes/defender/data/waves.ts` — per-round `spawnIntervalSecForRound(r) = (16 - r) / 40` helper.
  - `src/showcase/archetypes/defender/data/path.ts` `cellSizePixels: 32`; `src/showcase/archetypes/defender/data/types.ts` `PathDef.cellSizePixels` doc; `src/showcase/archetypes/defender/modules/map.ts` `pathTotalLength` + `positionAtDistance` scale by cellSizePixels + Bresenham rounds float waypoints; `src/showcase/archetypes/defender/modules/towers.ts` per-tick `tx/ty = (cell + 0.5) * cellSizePixels`; `src/showcase/archetypes/defender/ui/panels/MapCanvas.vue` viewBox + sizes in pixels.

- **Promotion candidate for BALANCING.md:** "When the upstream source is a compiled binary (SWF, .pak, .pck, packed bundles), enumerate the extraction surfaces — script source is rarely sufficient. Header / shape / sprite / sound / timing data carry load-bearing balance numbers that the script extraction doesn't surface. Before declaring 'verbatim from the source,' confirm every constant you've authored has a citation that resolves all the way back to the binary, not to a downstream wiki estimate or a Phase-N stand-in." Generalizes beyond Flash to any consumer porting from a packed binary asset (Godot .pck, WC3 .w3x, RPG Maker .json bundles, Unity scenes — see `decompile/README.md` for the related WC3 tooling).

## Cross-archetype convergence — override-path-vs-tunable rule

`BALANCING-tug.md § Architectural finding` flagged the deep-partial override path as redundant with `tunable()` + `TuningRegistry`. Tug carried both pre-redo and consolidated to `tunable()`-only post-OL-955.

Defender confirms N=2: greenfield from Phase 1 onward, no `data/balance.ts` parallel was ever authored. Every perturbable value is a `tunable()` reader site keyed under `towers/`, `bloons/`, or `economy/` (see `modules/tuning.ts` `DefenderTunableKey`). No deep-partial override mechanism; balance harness perturbations flow exclusively through `pushScope` on `DefenderTuningRegistryKey`.

- **Receipt:** `src/showcase/archetypes/defender/data/` directory shape — no `balance.ts` or `overrides.ts` alongside `bloons.ts` / `towers.ts` / `economy.ts` / `waves.ts` / `path.ts`.
- **Cross-link:** `BALANCING-tug.md § Architectural finding — deep-partial override redundant with tunable()`.
- **Promotion to `BALANCING.md`:** Ready as N=2. Phase 5c PR-amends `BALANCING.md § Where balance constants live` to lift the lesson from log-local to a cross-archetype rule. Wait for 5c so the audit + close-out lands as one PR rather than two.

## Cross-archetype convergence — data-shape-up-front dead-fields

`BALANCING-tug.md § Over-authoring finding` flagged 7 of 13 declared TugBalance fields as having no runtime reader — the override path made adding fields cheap, so the data shape over-grew.

Defender confirms N=2: every field in `data/{bloons.ts, towers.ts, economy.ts, waves.ts, path.ts}` has a module-side reader. The Phase 1 triage explicitly authored "only what consumers read" (per the umbrella OL-1021 description's convergence-question staging) and held the discipline through Phase 2 fan-out. Phase 5a audit confirms zero dead fields.

- **Receipt:** grep audit across `data/` → all fields appear in at least one module reader site.
- **Cross-link:** `BALANCING-tug.md § Over-authoring finding`.
- **Promotion to `BALANCING.md`:** Ready as N=2 (alongside override-path rule above; same PR-amendment lands both).

## Cross-archetype convergence — methodology-number rekey is a no-op

`BALANCING-ambient.md` (and producer's pass before it) noted that methodology-number framing (#1–#7) didn't require a rekey from the prior Tier-A/B/C taxonomy — the work was already framed against the methodology numbers from the start.

Defender confirms N=3: Phase 1 onward authored against #1–#7 directly (umbrella description's bucket-walk references methodology numbers; `balance/balance.ts` identity layer comments cite `BALANCING.md § Bucket → methodology lookup` by methodology number). Zero Tier-A/B/C residue in any file across the archetype.

- **Receipt:** grep audit across `src/showcase/archetypes/defender/` → no Tier-A/B/C references in identifiers, comments, or test descriptions.
- **Cross-link:** `BALANCING-ambient.md` methodology-rekey note + producer's pre-OL-954 framing.
- **Promotion to `BALANCING.md`:** Ready as N=3. Phase 5c rewrites the BALANCING.md § Theme 3 preamble to drop the methodology-rekey caveat as historical and confirm "all current archetypes author against #1–#7 from the start."

## Cross-archetype bifurcation — stasis-aware-tick verdict

`BALANCING-ambient.md` (post-OL-857) recorded that ambient's continuous-rate income through `getRate('seedlings')` made the `runUntil({mode: 'stasis-aware-tick'})` accessor safe to drop in — sim-bot runs terminated via predicate rather than artificial stasis-flag noise. The producer pass had recorded the OPPOSITE — `getRate('cookies')` only reports passive production, ignoring the click-taper income channel, so stasis-aware-tick fires `terminated: 'unreachable'` before the first click income lands.

Defender is the bifurcation tiebreaker per the umbrella's pre-staged convergence question. Outcome: **Defender confirms the bifurcation. Income is purely event-driven — there is no `getRate` channel.** The bloons module emits `bloon-popped` / `bloon-leaked` / `wave-cleared` events; the round module subscribes and mutates `money` / `lives` / `currentRound` via direct `addResource()` / `Persistent.value` writes (`modules/round.ts:121-144`). No producer-category, no chain.bind, no continuous-rate channel of any kind.

Stasis-aware-tick over a defender sim would see `getRate('money') = 0` at every tick and immediately classify the engine as stasis — *exactly* the producer wedge case from `BALANCING-producer.md § narrow runUntil({mode: 'stasis-aware-tick'}) inadequate for click-driven income channels`. The mode is **not safe** for defender. The right shape is one of the candidate primitives that entry tracks:

- Budget-bounded reachability oracle (`isReachable(engine, predicate, budget)`) — broader event-driven framing.
- Accessor variant lifting event-channel rates into `getRate('money') = avg-pops-per-sec × moneyPerPop` — couples accessor to the active wave's spawn schedule; wrong layer.

Defender's sim probes in Phase 5b will run `runUntil` in default `'tick'` mode and accept the budget-bounded termination flag the consumer wedge already absorbs.

- **Receipt:** `src/showcase/archetypes/defender/modules/round.ts:121-144` — event subscriber bodies. Verifiable by grep: zero `getRate` reader sites across defender modules.
- **Cross-link:** `BALANCING-producer.md § narrow runUntil stasis-aware-tick inadequate`, `BALANCING-ambient.md` ambient-side confirmation, `candidate-primitives.md § runUntil stasis-aware-tick`.
- **Promotion to `BALANCING.md`:** Bifurcation graduates. Phase 5c PR-amends `BALANCING.md § stasis-aware-tick adoption — zero out-of-band channel rule` to record the bifurcation explicitly: *event-driven income channels (defender, producer click-taper) bifurcate against continuous-rate channels (ambient, tug). The narrow-form stasis check is safe only for the latter; event-driven income consumers stay in default `'tick'` mode until a broader-form primitive lands.*

## What this pass did NOT learn (yet)

Phase 5a is pre-flight only. The methodology fit *survey* lands here; the methodology *application* (Phase 5b) hasn't happened, so the kit hasn't been stressed yet.

Known pre-staged unknowns Phase 5b will resolve:

- **Methodology #6 fit for tower DPS coverage.** The bucket-walk classifies tower placement + per-tick AoE timing + bloon-spawn-sequencer interactions as Discrete-event coupled (`BALANCING.md § The nine-bucket walk`). Methodology #6 (pure sim discovery) is the bucket's primary methodology. Phase 5b's `balance/probes.ts` will be the first in-tree consumer of methodology #6 as the SOLE methodology for a load-bearing subsystem (tug uses #3 + #5 + framework-correctness; scaler uses #1 + #2; producer uses #1 + #2; ambient uses #1; looper uses #7). If the kit covers it cleanly, no amendment. If a distribution-statistic shape Phase 5b reaches for isn't expressible in the kit, file the gap here.
- **Beat-4 instrumentation pattern.** `balance/balance.ts § beat-4 predicate` is a placeholder until Phase 5b authors `bot.ts` with a `onBloonPopped` subscriber that increments a shedding-event counter the bot exposes via injection. This pattern — "predicate that needs event-stream instrumentation from a sibling layer" — appears in tug's beat-3 (counter-pivot counter lives in match.ts, not lane.ts). The cross-archetype shape is "events-driven predicate uses an injection-key counter the consumer module owns." Not yet a generalized rule; promotion waits until N=3.

## Carry-forward to Phase 5b

- `balance/spec.ts` — likely not needed (defender is not predictor-seed-shaped per the identity-file judgment call in `BALANCING-producer.md`; the closed-form rate algebra doesn't apply).
- `balance/bot.ts` — deterministic placement policy + event-stream subscribers for instrumentation. Tug's `bot.ts` is the closest structural analog (spatial-entity bot with per-tick decision-making).
- `balance/probes.ts` — methodology #1 (cost-scaling regression locks) + methodology #3 (range-rescale sensitivity sweep, validating Phase 5a's chosen scalars) + methodology #6 (arc-1 survival-rate distribution across N=20 seeds).
- `sim/balance.probe.test.ts` — regression locks pinning chosen `tunable()` values with `toBeBetween` bounds, run on every CI cycle.

## Carry-forward to Phase 5c

- PR-amend `BALANCING.md`: lift override-path rule, dead-fields rule, methodology-rekey caveat removal, stasis-bifurcation finding. All four hit ready-to-promote status in this pass.
- Audit `candidate-primitives.md`: defender's static-path-list (`data/path.ts`) is the locked Phase 1 decision against a weighted grid distance field (now shipped as `SpatialGrid.distanceField`). The trigger — a consumer needing dynamic re-pathing under tower placement — is still unmet, so defender is a *candidate* receipt only: the qualifier is dynamic re-pathing, not spatial-pathfinding-as-a-mechanic.
- Close umbrella OL-1021 with the full commit graph + cross-archetype convergence-status table.

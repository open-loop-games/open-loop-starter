# Scaler — balance findings

> Sidecar to `archetypes/BALANCING.md`. This file captures balance findings *during* the scaler balance pass — observations, dead ends, instrument-earning moments, and signals worth flagging upstream. Some entries promote into `BALANCING.md` proper via PR; others stay here as archetype-local lore.
>
> Convention defined in `BALANCING.md § Theme 5 — Findings sidecars`.

## What goes here

Findings that future balance work — on this archetype or others — would benefit from reading. Specifically:

- **Instrument-earning moments.** When an existing tool didn't answer a question and a new one was added: what question, what shape, what cost vs. what payoff.
- **Methodology stress.** Where `BALANCING.md`'s framing felt inadequate against a real subsystem; what the framing was missing.
- **Engine-surface gaps.** Hand-rolls that emerged mid-flight; cross-link to `open-loop-engine/docs/candidate-primitives.md` for the convergence channel.
- **Drift signals.** When sim / predictor / walker disagreed, what the disagreement meant, how it resolved.
- **Numerical surprises.** Beats that wouldn't land for non-tuning reasons (e.g. integral-vs-discrete asymmetries, Decimal precision wells, modifier-chain order surprises).

## What does not go here

- Chosen knob values — live in `src/archetypes/scaler/data/*.ts`.
- Beat windows or predicates — live in `src/archetypes/scaler/balance/beats.ts`.
- Tickets / decisions — live in Vikunja.
- Per-pass status, phase IDs, task IDs — those rot. Comment hygiene per `/work/studio/CLAUDE.md` § Conventions.

The sidecar is for *what was learned*, not *what was decided*.

## Promotion to BALANCING.md

When a finding generalizes across archetypes, file a PR moving the abstracted rule into `BALANCING.md`. The sidecar entry stays as the worked example; `BALANCING.md` gets the cross-archetype framing. Producer's `balance.md` will get the same convention applied retroactively if/when its findings warrant it.

## Entry shape

```markdown
### <one-line summary>

**Subsystem:** antimatter | prestige | ECC | cross-tier
**What we hit:** the symptom in one paragraph.
**What we tried:** the path, including dead ends.
**What worked:** the resolution.
**Generalizable?** archetype-local | candidate for BALANCING.md | candidate for closed-form-progression upstream.
```

---

## Findings

### Automation tier promoted from optional to slim-port baseline — bot policy IS the autobuyer policy

**Subsystem:** cross-tier
**What we hit:** the interim sub-leaf-B bot installed a parallel `setupPolicyAutoPurchase` × 3 tiers + a hand-rolled upgrade-sweep loop in `balance/bot.ts`. Same shape the producer balance bot carries. Authoring it twice in two layers (sim and player flow) was structurally divergent — "what an autobuyer would do" got written in `bot.ts` instead of as canonical content. The greedy "if `tier.conversion?.canConvert.value === true` convert()" loop also fired from tick 1 because `prestige.createCostRequirement` uses `cost: () => coin.value` (`modules/prestige.ts:138`), making `canConvert` trivially true at any coin value. Reset wiped antimatter before any beat fired.
**What we tried:** removing the conversion loop fixed the immediate firing; but the deeper question remained — should the bot author auto-purchase policy at all, or should the autobuyers be canonical content the bot rides on top of?
**What worked:** scaler ships its automation tier as engine-module content under `modules/autobuyers/{antimatter,prestige,transcend}.ts`. Each autobuyer registers an `AutobuyerSpec` (id, unlock predicate, isActive Persistent toggle, optional bespoke `tick`). A registry module provides `AutobuyerMasterToggleKey` + `AutobuyerRegistryKey`. The shape lifts AD's class hierarchy (`AutobuyerState` / `IntervaledAutobuyerState`) into engine-module idiom (`autobuyer.js:4-175`); content set lifts Synergism's `Automation.ts:33-125` collapsed to per-tier sweeps. Bot rewrites to ~15 lines: flip master, walk registry, set every `isActive = true`. Unlock gates remain real — they read `Resource.cumulative` (no new state), and lift naturally as the sim crosses each tier-presence threshold.
**Generalizable?** candidate for cross-archetype shape. OL-855 backports the same shape into producer + ambient. At N=3 a `createAutoPurchaser` engine helper becomes a real candidate (currently filed as N=1 in `open-loop-engine/docs/candidate-primitives.md`); the AD class hierarchy itself is the more interesting graduation candidate than just the helper. Cross-link: scaler ticket OL-854.

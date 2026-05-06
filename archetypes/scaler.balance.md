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

*(populated during sub-leaves C / D / E)*

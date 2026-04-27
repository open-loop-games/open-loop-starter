---
title: Balance Guidance
date: '2026-04-27'
---

# Balance Guidance

Balance tooling and AI-opponent design guidance for Open Loop game consumers.

---

## AI variety — persona rosters

Any archetype with an AI-controlled entity (opponent, content agent, automation bot) benefits from shipping a **roster of N differentiated agents** rather than a single fixed behavior. The pattern is called AI rosters in the research library and appears in 80% of games with AI-controlled entities.

Two composition-cookbook writeups cover the implementation recipes:

- **[Parameterized personality](../../open-loop-research/practical/composition-cookbook/parameterized-personality.md)** — the parent recipe. N hand-authored param bundles; one decision function reads the active bundle. Covers difficulty-tier discipline, mode-roster composition, exploitability-as-design, believability calibration, and four evidence-cluster variations (V1 needs/mood, V2 memory-stream, V3 skill-library, V4 social-state). Start here for opponent-seat and content-agent-seat AI variety.

- **[Procedural personas](../../open-loop-research/practical/composition-cookbook/procedural-personas.md)** — specialization for search-based agents. N objective functions instead of N param bundles; behavior emerges from the search process. Start here for tester-seat agents and exploiter-role opponent design.

The engine-level worked example (with code) is in `open-loop-engine/docs/consumer-guide.md` § Persona-roster composition.

---

## Worked variety samples

Archetype-specific implementations:

- **Tug** — OL-726: parameterized-personality roster on `src/archetypes/tug/modules/opponent-bot.ts` (N≥3 distinct personas via `createRoundRobinStrategy` or `createConditionalStrategy`)
- **Defender/TD/Maul** — OL-727: wave-spawner variety via wave templates × tier dimensions × spawn tempo × type/elemental rotation
- **Solo-archetype bot** — OL-728: balance-bot variety demonstrating foundation works outside opponent seat (producer content-agent variation or idle-loop playtest-bot variation)

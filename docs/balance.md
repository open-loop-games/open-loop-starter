---
title: Balance guidance — starter index
date: '2026-09-09'
---

# Balance guidance

Where balance methodology lives for a starter fork, and what the shipped archetypes
already demonstrate. The methodology is the engine's; this file routes and indexes,
and states no rule of its own.

## Where the methodology lives

- `open-loop-engine/docs/consumer-guide-balance.md` — balancing an economy off a
  declared spine, and why a probe reports rather than asserts.
- `open-loop-engine/docs/consumer-guide-balance-automated-player.md` — balancing
  when an automated player plays the game. Read § Personas are a coverage axis,
  not a parameter to tune before adding a persona to move a number.
- `open-loop-engine/docs/consumer-guide-recipes.md` § Persona-roster composition —
  the engine substrate for a roster: `SequencerItem` carrying persona identity and
  its param bundle, and the sequencer's fill strategies.
- `.claude/rules/archetype-authoring.md` § Balance — where each surface lands — the
  starter's own placement contract: spine in `data/`, then projection, probe, suite.

## AI variety — where the shape comes from

An archetype with an AI-controlled seat can ship a roster of differentiated AI opponents
rather than one fixed behavior. The shape is described in
`open-loop-research/patterns/adjacent/ai-rosters.md`.

**Read its standing carefully.** It is an *adjacent* shape, not a library row — its
evidence sits outside the incremental corpus, drawn from game-AI sources, and
`open-loop-research/LIBRARY.md` holds that incremental games cannot test such shapes.
Its coverage figure is stated over the game-ai-variety subcorpus it was read from and
is calibration for that study, not a prevalence claim about incremental games. It is
not a row an identity line may cite.

Implementation recipes sit in research's composition cookbook:
`open-loop-research/practical/composition-cookbook/parameterized-personality.md` is
the parent — N hand-authored param bundles read by one decision function — and
`procedural-personas.md` beside it is the specialization for search-based agents.

## What the shipped archetypes demonstrate

- **Adversarial seats carry a persona roster.** `tug` holds parameter vectors over
  one decision architecture (`src/showcase/archetypes/tug/data/personality.ts`,
  `PersonaKey`), read by `modules/opponent-bot.ts`. `skirmish` scales its decision
  cadence per persona (`modules/automation.ts`) and ships rush against greedy.
- **Solo archetypes have player automation behind automation tiers, not an opponent roster.**
  `producer` holds a `modules/automation.ts` behind `AutomationTiers`. That is the automation-as-game-code convention, and it is what
  the balance harness drives — a different object from an opponent seat, and not a
  place a roster is owed.

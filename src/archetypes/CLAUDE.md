# CLAUDE.md — src/archetypes/

Each subdirectory `src/archetypes/<name>/` is a self-bootable first-arc port of one Tier-A canonical exemplar. Specs live at `archetypes/<name>.md` (relative to repo root); canonical template at `archetypes/_template.md`.

Before touching any file under this subtree, read the spec's § 5 (content scope + structural properties + demo arc beats). Spec § 5 names the canonical sources; the port runs against those bytes after they land locally.

## What the port is

A canonical-fidelity port of the exemplar's first-arc *behavior and data* into the archetype tree, running against `open-loop-engine`. The canonical signature — cost functions, scaling formulas, reset semantics, gate conditionals, cascade relations, modifier composition, conversion thresholds — comes over intact in canonical bytes. Substitutions touch only canonical-internal references that don't compile against the engine: exemplar state reads, exemplar globals, and cross-module imports against sibling exemplar files map to engine state, balance constants, sibling files in the port, or engine primitives where the engine has the shape.

The archetype's identity lives in canonical behavior. The port preserves shapes alongside values — byte-anchored, citation-guarded — so future readers can verify against canonical source.

## Phases

1. **Spec authoring.** `archetypes/<name>.md § 5` enumerates the canonical subsystems in first-arc scope, source ranges in `open-loop-research/reference-code/<name>/`, structural properties the running app must demonstrate, and the demo arc beats that close the port. Spec is its own leaf, upstream of code.

2. **Subsystem snapshot.** Canonical exemplar files port into the archetype tree using the exemplar's own file structure as the starting layout. Mechanic: peek the source with `head`, copy with `cp`, work against the local copy. Each landed file gets a file-header citation block naming canonical source files and line ranges. The snapshot stages canonical content for phase 3's iterative integration; engine substitutions land on local bytes during phase 3.

3. **Iterative integration.** Subsystem by subsystem, apply engine substitutions, integrate engine systems, and refactor toward the engine layer split. Substitutions touch what doesn't compile against the engine: exemplar state reads, globals, and cross-module imports map to engine state, balance constants, sibling files in the port, or engine primitives. The `data/modules/composables/ui` organization emerges through these refactors as engine wiring reveals where seams want to be cut. Inline tags mark declared inventions where a substitution diverges from canonical with reason.

4. **Walkthrough verification.** Closure: every demo arc beat from spec § 5 reachable in the running app on a fresh save. Typecheck-clean is necessary but not sufficient — the gate is observable behavior in the browser.

## Discipline

- **Behavior ports with data.** Cost functions, scaling formulas, reset semantics, gate conditionals, modifier composition come over as canonical bytes alongside numeric anchors. The canonical signature lives in the shapes.
- **Disk-to-disk byte landing.** `cp` lands canonical bytes locally before substitution work begins. `head` for a sanity peek of the source path; the local copy is the working surface from that point on. Reads against the local tree are cached.
- **Iterative, not one-shot.** Refactor toward the engine layer split incrementally as engine integration proceeds, subsystem by subsystem.
- **Substitutions touch what doesn't compile.** Replace exemplar-internal references — state, globals, cross-module imports — with engine equivalents per the archetype spec. Refactors and ergonomic passes are downstream of canonical fidelity.
- **Later-arc state ports as inert refs.** First-arc code that reads later-arc state copies the gate-conditional verbatim from canonical; the gate evaluates inert against default state.
- **Citation header on every ported file.** Names canonical source files and line ranges. Inline declared-invention tags where substitution diverges from canonical with reason. The header is the receipt — future readers verify the port via the cited bytes.
- **Sibling references.** Engine primitives at `open-loop-engine/docs/api/INDEX.md`. Layout shells at `src/lib/shells/`. Starter-root cross-archetype surfaces (`src/modules/`, `src/composables/`, `src/ui/`) stay archetype-agnostic — game-specific content lives only under `src/archetypes/<name>/`.
- **Cross-module reads via sibling import.** Default to module-level `getX()` accessors imported across the archetype tree. The engine's injection keys (`GameLoopKey`, category keys, `ChainRegistryKey`, `EffectSystemRegistryKey`) are the contract for engine-published surfaces — that's where `ctx.inject` belongs. A consumer-defined `InjectionKey` + `ctx.provide` earns its slot when a non-module reader needs the surface: a Vue SFC consuming via `useModule(Key)`, a composable bridging via `useModule(Key)`, a balance/sim harness reading via `engine.tryInject(Key)`, or the archetype re-exporting the Key through its index as a fork-API hook. Sibling-only Keys — every reader is a module in the same archetype that already imports the publisher — collapse to accessors; module `dependencies` arrays give the accessor live values at install time, no injection round-trip needed.

## Where to look first

| For | Read |
|-----|------|
| Which canonical subsystems are in first-arc scope | spec § 5 |
| Source ranges for ported subsystems | spec § 5 |
| Engine primitives the archetype uses | spec § 3 + `open-loop-engine/docs/api/INDEX.md` |
| Demo arc beats (completion gate) | spec § 5 |
| Predicted engine gaps surfacing during the port | spec § 7 |

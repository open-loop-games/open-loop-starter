# CLAUDE.md — src/archetypes/

Each subdirectory `src/archetypes/<name>/` is a self-bootable first-arc port of one Tier-A canonical exemplar. Specs live at `archetypes/<name>.md` (relative to repo root); canonical template at `archetypes/_template.md`.

Before touching any file under this subtree, read the spec's § 4 (byte-landing manifest + typed signatures) and § 5 (content scope + structural properties + demo arc beats).

## Port phases

Each archetype port flows from canonical exemplar to running app through four phases. Each phase consumes a specific input and produces a specific artifact; later phases consume what earlier phases produce.

1. **Spec authoring.** `archetypes/<name>.md § 5` names which canonical subsystems land in first arc and where their source bytes live in the exemplar tree at `open-loop-research/reference-code/<name>/`. The spec phase runs upstream of any code work; subsequent phases consume what the spec names. Spec authoring is its own leaf — separate from the data port.

2. **Data layer (`data/`).** Each `data/*.ts` is populated from canonical exemplar source by `cp` (or `sed -n 'A,Bp' source > dest` for a line range) per the byte-landing manifest in spec § 4. After the bytes land at every destination, an edit-in-place pass over each file fits the canonical bytes to the typed signatures defined alongside the manifest, adds the file-header citation block naming the canonical source files and line ranges, and tags declared inventions inline where a row diverges from canonical with reason. Ids, display names, numbers, and structural relationships preserve canonical fidelity.

3. **Engine layers (`modules/`, `composables/`, `ui/`, `sim/`, `boot.ts`).** Engine modules construct from `data/` via factory closures. Composables bridge module refs to UI when they earn the layer (`computed` / `watch` / cross-module synthesis). UI renders engine state. Sim probes beat timing per the spec's § 7 expectations. Boot wires the singleton + module registration + save/load + UI mount. First-arc code that reads later-arc state copies the gate-conditional verbatim from canonical and evaluates inert against default state.

4. **Walkthrough verification.** Completion gate: every demo arc beat from spec § 5 reachable in the running app on a fresh save. Typecheck-clean is necessary but not sufficient — the gate is observable behaviour in the browser.

## Discipline

- **Bytes precede edits in the data phase.** Every canonical-lifted file under `data/` is populated by a copy operation before any edit-in-place pass. Typed signatures and citation conventions are fitting targets the edit pass converges on.
- **Lens via comment sections.** Skeleton + Balance + Costume lenses inside each data file as `// ─── Skeleton ───`, `// ─── Balance ───`, `// ─── Costume ───` — not separate files, not codegen.
- **Layering.** `data/ → modules/ → composables/ → ui/`. Data never imports modules; composables and components never contain game logic.
- **Forks edit `data/*.ts` in place for tuning.** The runtime override path (`apply<Name>Overrides(base, overrides)`) exists for sim and workbench perturbation, not as a per-fork tuning surface.
- **Spec-first reductions.** Reductions during implementation route through a § 5 update first, with stated reason. Demo arc beats are the source of truth for what the running app must demonstrate.
- **Sibling references.** Engine primitives at `open-loop-engine/docs/api/INDEX.md`. Layout shells at `src/lib/shells/`. Starter-root cross-archetype surfaces (`src/modules/`, `src/composables/`, `src/ui/`) stay archetype-agnostic — game-specific content lives only under `src/archetypes/<name>/`.

## Where to look first

| For | Read |
|-----|------|
| Which canonical subsystems are in first-arc scope | spec § 5 |
| Which source ranges populate which destinations | spec § 4 byte-landing manifest |
| Typed signatures the edit-in-place pass fits to | spec § 4 |
| Engine primitives the archetype uses | spec § 3 + `open-loop-engine/docs/api/INDEX.md` |
| Demo arc beats (completion gate) | spec § 5 |
| Predicted engine gaps surfacing during the port | spec § 7 |

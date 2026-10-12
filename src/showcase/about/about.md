# Open Loop Starter

A quick-copy scaffold for prototyping incremental games on
[open-loop-engine](https://github.com/). The starter ships every
canonical archetype as a self-bootable demo; this gallery is the showcase
view over that catalogue.

## The trilogy

- **Research** — `open-loop-research` reads incremental games against their
  source and distils them into a pattern vocabulary, every entry a decision a
  designer makes: patterns (a mechanism you select), compositions (recurring
  bundles of them) and substrate (machinery nobody selects). No tiers and no
  prevalence gates — a pattern earns its place by being Selectable, Declinable
  and Irreducible. Source of truth for "is this pattern real?".
- **Engine** — `open-loop-engine` ships the primitives those
  patterns compose from: resources, modifier chains, formulas, save/load,
  the game loop, and the balance harness for simulation and balance work.
- **Starter** — this repo. The pattern language made legible: each
  archetype is a working demo of one game shape, its identity line naming
  the research patterns it composes and the pattern-coverage grade they give it, and its
  manifest naming the engine primitives it uses, the beats it expects,
  and the exemplars it descends from.

## How to fork

The starter is a template, not a library. A fork clones the repo and ejects
down to one game:

```bash
pnpm eject cycler --name "My Game"            # dry run: prints the plan
pnpm eject cycler --name "My Game" --execute  # builds on the cycler archetype
pnpm eject --clean --name "My Game" --execute # starts from the neutral _blank base
pnpm install && pnpm typecheck && pnpm test && pnpm lint
```

Eject moves the chosen archetype to `src/game/` and rewrites `main.ts` to boot
it. It deletes `src/showcase/` (gallery, about, sandbox and every other
archetype) and its own machinery. The fork's theme is the token values in
`src/styles/base.css`. `src/showcase/AGENTS.md` § Fork workflow has the full
list of what eject changes.

The gallery enumerates archetypes only through
`import.meta.glob('@/showcase/archetypes/*/index.ts')`. A lint
(`src/test/gallery-strip.test.ts`) checks that nothing under
`src/showcase/gallery/**` or `src/showcase/about/**` imports a specific
archetype. So an archetype directory can be added or deleted without breaking
the gallery.

## Authoring a new archetype

1. Copy `src/showcase/archetypes/_blank/` to `src/showcase/archetypes/<name>/`.
2. Register its line in `src/showcase/archetypes/_identity.md`, and write the
   line's `_docs/<line>.md`.
3. Rewrite `IDENTITY.md` and `BALANCING.md`. Each has every required section;
   `.claude/rules/archetype-authoring.md` says what each section contains.
4. Write `manifest.ts` with the typed `ArchetypeManifest` export (see
   `src/types.ts` for the shape), and re-export it from `index.ts`. The gallery
   finds it the next time it loads; it skips underscore-prefixed directories.
5. Update `domain-map.config.mjs`, and run `pnpm domain-map`.

Each archetype owns its theme assets (fonts, body CSS scope), modules and UI.
The gallery wraps every demo in a sandbox. The sandbox owns the
`body[data-archetype]` lifecycle and disposes both the engine and the Vue app
between demos. Archetypes still scope their own theme through the attribute,
so they work standalone after eject.

## Layering

```
data → modules → composables → ui
src/lib/  ← presentational only, no engine imports
src/ui/   ← engine-bridged (composables, sandbox, gallery panels)
```

Forks are free to rename, restructure, or delete any of `src/lib/`. It
is a real layer inside the scaffold but not an importable cross-package
library — extraction is deferred until multiple independent game UIs
converge on the same shape.

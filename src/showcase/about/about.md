# Open Loop Starter

A quick-copy scaffold for prototyping incremental games on the
[open-loop-engine](https://github.com/) runtime. The starter ships every
canonical archetype as a self-bootable demo; this gallery is the showcase
view over that catalogue.

## The trilogy

- **Research** — `open-loop-research` reads incremental games against their
  source and distils them into a pattern vocabulary, every entry a decision a
  designer makes: patterns (a mechanism you select), compositions (recurring
  bundles of them) and substrate (machinery nobody selects). No tiers and no
  prevalence gates — a pattern earns its place by being Selectable, Declinable
  and Irreducible. Source of truth for "is this pattern real?".
- **Engine** — `open-loop-engine` ships the runtime primitives those
  patterns compose from: resources, modifier chains, formulas, save/load,
  the game loop, harness systems for sim and balance work.
- **Starter** — this repo. The pattern language made legible: each
  archetype is a working demo of one game shape, its identity line naming
  the research patterns it composes and the pattern-coverage grade they give it, and its
  manifest naming the engine primitives it uses, the beats it expects,
  and the exemplars it descends from.

## How to fork

The starter is a template, not a library. Forks consume it by copying
the repo and stripping it down:

```bash
# 1. Fork & clone
gh repo create my-game --template open-loop/starter --private --clone
cd my-game

# 2. Pick one archetype (here: cycler) — delete the rest + the gallery
rm -rf src/showcase/archetypes/{ambient,tug,skirmish}
rm -rf src/gallery src/about

# 3. Wire main.ts to your one archetype
cat > src/main.ts <<'EOF'
import { createApp } from '@/showcase/archetypes/cycler';
import '@/lib/styles/reset.css';
import '@/lib/styles/tokens.css';
import './styles/base.css';
import './styles/theme-widgets.css';
const { mount } = createApp();
mount('#app');
EOF

# 4. Reskin: update src/styles/base.css tokens for your theme,
#    rename the archetype directory to your game name, and start
#    iterating on data/, modules/, ui/.
```

`src/gallery/` and `src/about/` are designed to delete cleanly. A
strip-cleanliness lint (`src/test/gallery-strip.test.ts`) asserts that
nothing under `src/gallery/**` hard-imports a specific archetype — only
the `import.meta.glob('@/showcase/archetypes/*/index.ts')` enumeration is
allowed. That keeps the strip step from cascading broken imports.

## Authoring a new archetype

1. Copy `src/archetypes/_template/` (or fork an existing archetype).
2. Author the doc at `archetypes/<name>.md` following `_template.md`.
3. Author `src/archetypes/<name>/manifest.ts` with the typed
   `ArchetypeManifest` export (see `src/types.ts` for the shape).
4. Re-export `manifest` from `src/archetypes/<name>/index.ts`. The
   gallery picks it up automatically the next time it loads.

Each archetype owns its own theme assets (fonts, body CSS scope), engine
modules, and UI. The gallery wraps every demo in a sandbox that owns the
`body[data-archetype]` lifecycle and tears down both engine and Vue app
between demos — but archetypes still scope their own theme via the
attribute so they work standalone in a forked single-archetype build.

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

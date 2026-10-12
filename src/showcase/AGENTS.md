# AGENTS.md — the stories

Conventions for `src/showcase/`, for every agent harness: Claude Code, Codex, opencode or any other. `CLAUDE.md` beside this file imports it rather than restating it, so this is the one home for the content; edit here.

This half is the demo/research surface — archetypes, gallery, about, sandbox — and it lives *inside* the strip boundary. `pnpm eject` deletes the tree and takes this file with it, so a fork inherits the root `AGENTS.md` and none of what follows. That is the point: what a fork must not inherit is documented where the deletion already reaches, rather than in a list eject has to keep in sync.

**The stories demonstrate the base.** The strip boundary is a one-way *import* cut, not a separation of concerns. A story that hand-rolls what a battery provides is a **story** defect — it teaches the next fork to hand-roll. A story that must fight a battery to say what it means is a **battery** defect: the stories are the generality test, and a documented bypass at the call site is that test reporting a failure.

The scaffold never imports across the boundary; an eslint rule enforces the one-way cut so the ejected game can't break (`eslint.config.js` holds the covered paths). The `_blank` skeleton lives under the boundary too — an underscore-prefixed authoring surface the gallery and the archetype list both filter out.

## Archetype demos (`src/showcase/archetypes/<name>/`)

Forkable best-practice implementations of the archetype set. Each archetype is a composition in research's pattern language (its identity line) carried by a rate-function balance spine, and is self-bootable with its own `data/`, `modules/`, `composables/`, `ui/`, `sim/`, and `boot.ts` — pre-wired engine boot, module registration, save/load, settings, notation, toasts, theme, and a working game skeleton.

This half is a research-output surface that happens to live inside starter. Maintenance discipline: research-grounding. An archetype is grounded in two things — the **pattern language** (the research patterns its identity line composes, cited by handle; `_identity.md` carries each line with its tier and the pattern-coverage grade that fixes what it may cite, and `_docs/<line>.md` carries the call on every exemplar) and a **rate-function balance spine** that *generates* its balance. A spine declares its coverage boundary: the named bucket its closed core lives in, where the closed form stops, and what measures the remainder. Full coverage is the simple case; partial coverage is ordinary. "No bucket" is not an available answer — an economy with no declared spine has no balance, it has values. Exemplar games validate that the composition ships in the wild — cited as a set, crosses and all — never lift targets. The bar for new archetype content is "would a new game forking this archetype want this on day one, and does its balance fall out of the declared spine?"

## Archetype convention

Each archetype under `src/showcase/archetypes/<name>/` is self-bootable and follows the same colocated shape:

```
src/showcase/archetypes/<name>/
├── data/            # Pure config. Typed defs + balance constants. Skeleton + balance
│                    # lens lives here as comment sections, not separate files.
├── modules/         # Engine modules; factory-constructed, closing over data.
├── composables/     # Vue composables when there's scoped Vue work or cross-module synthesis. Optional layer.
├── ui/              # Archetype-colocated screens + panels + components. Root
│                    # `*AppRoot.vue` is routing+chrome only; a `<XGameView>`
│                    # subtree owns all module reads (see root § Key Patterns).
├── sim/             # harness.ts + any suite spanning modules; probes live in balance/.
└── boot.ts          # createApp(overrides?) → { app, engine, mount }.
```

**Dependency direction (strict):** `data → modules → ui`, with composables between modules and ui when they earn the layer (see root § Layering). Data never imports from modules; composables and components never contain game logic.

**Archetype authoring rules live at** `.claude/rules/archetype-authoring.md` — paths-scoped to `src/showcase/archetypes/**`, so they load when you touch an archetype: the spine and its coverage boundary, directory shape, `IDENTITY.md` requirements, canonical `balance/` filenames, and landing discipline (walkthrough gate, phased landing). Claude Code loads it on the path match; no other harness loads `.claude/rules/` at all, so read it directly before authoring an archetype. `src/showcase/archetypes/README.md` is the reader-facing index of the set, not a methodology doc.

The root-vs-game-view split each archetype's `ui/` follows is `.claude/rules/app-root-discipline.md`, scoped to the `*AppRoot.vue` and `*GameView.vue` files themselves — same reading rule.

## Fork workflow

`pnpm eject <archetype> [--name <game>]` turns the starter into a single-game fork in one step: hoists your archetype to `src/game/`, rewrites `main.ts` to a single-archetype boot, repoints/prunes config, slims `types.ts`/`manifest.ts` to game identity, stubs the README, and deletes the entire demo/research surface (`src/showcase/` + the repo-root demo docs), the Claude-only `.claude/rules/` whose paths only ever matched the showcase tree, **and eject's own machinery** (`scripts/eject.mjs`, `src/test/eject.test.ts`, the `eject` script, the `@/showcase` eslint guard). The fork starts clean, green, and correctly-named. It's **dry-run by default** — it prints the plan and touches nothing; pass `--execute` to perform it. Implementation in `scripts/eject.mjs`, locked by `src/test/eject.test.ts`.

Two modes: `pnpm eject <archetype>` builds on a registered archetype (its archetype-named identifiers stay — honestly naming the composition you chose); `pnpm eject --clean` hoists the neutral `_blank` skeleton (generic `Game*` symbols) for a novel composition with no fitting archetype — the honest blank base, so there's no archetype content to gut. `--name` controls display casing (`--name "Cookie Tycoon"` → `Cookie Tycoon`); the package name + `GAME_ID` are slugified.

Because the eject test is deleted with the machinery, there is no self-checking green-after-eject invariant — the fork must run `pnpm install && pnpm typecheck && pnpm test && pnpm lint` itself (eject prints this).

**Manual post-fork steps eject leaves to judgment:** rewrite the root `AGENTS.md` from the starter's dual-character framing to your game (eject leaves it verbatim — a `--name` stub would lose too much); update `src/game/IDENTITY.md` and regenerate `domain-map.md` (`pnpm domain-map`) once you've reshaped `src/game/data`. (`.claude/CLAUDE.local.md` is gitignored and doesn't travel, so anything the starter kept there is yours to re-establish; eject removes the repo's own `.mcp.json`, so re-add whatever MCP servers your fork needs.)

# AGENTS.md — the stories

Conventions for `src/showcase/`, for every agent harness: Claude Code, Codex, opencode or any other. `CLAUDE.md` beside this file imports it rather than restating it. So this file is the one home for the content; edit here.

This half is the demo and research surface: archetypes, gallery, about and sandbox. It is *inside* the strip boundary. `pnpm eject` deletes the tree and this file with it. So a fork inherits the root `AGENTS.md` and none of what follows. That is the point. What a fork must not inherit is documented where the deletion already reaches. Eject then needs no list to keep in sync. Where the root `AGENTS.md` must describe the showcase for a starter reader, that text is wrapped in `<!-- eject:strip-start -->` / `<!-- eject:strip-end -->` markers, and eject removes it.

**The stories demonstrate the base.** The strip boundary is a one-way *import* cut, not a separation of concerns.

- A story that hand-rolls what a battery provides is a **story** defect, because it teaches the next fork to hand-roll.
- A story that must work around a battery to say what it means is a **battery** defect. The stories are the generality test. A documented bypass at the call site is that test reporting a failure.

The scaffold never imports across the boundary. An oxlint rule enforces the one-way cut, so the ejected game cannot break; `oxlint.config.ts` lists the covered paths. A second rule keeps renderers (`pixi.js`, `three`) out of the scaffold: a story imports its renderer in its own field component, so eject can drop the renderers a fork does not draw with. The `_blank` skeleton is under the boundary too. It is an underscore-prefixed authoring surface, and the gallery and the archetype list both filter it out.

## Archetype demos (`src/showcase/archetypes/<name>/`)

Forkable best-practice implementations of the archetype set. Each archetype is a research composition (its identity line) built on a rate-function balance spine. Each is self-bootable, with its own `data/`, `modules/`, `composables/`, `ui/`, `sim/`, `engine.ts` and `boot.ts`. Those give pre-wired engine boot, module registration, save/load, settings, notation, toasts, theme and a working game skeleton.

This half is a research-output surface inside starter. Its maintenance discipline is research grounding. An archetype is grounded in two things:

- **The pattern language:** the research composition its identity line states, with research patterns cited by handle, and the genres the story is in. `archetypes/README.md` maps each archetype to its genres. A genre's document in the studio's research library lists the games in it, so a story lists none of its own.
- **A rate-function balance spine** that *generates* its balance.

A spine declares its coverage boundary: the named bucket of its closed core, where the closed form stops, and what measures the remainder. Full coverage is the simple case; partial coverage is ordinary. "No bucket" is not an available answer. An economy with no declared spine has no balance; it has values. Exemplar games show that the research composition ships in real games. They are cited as a set, crosses included, and are never lift targets.

The bar for new archetype content is two questions:

- Would a new game that forks this archetype want this on day one?
- Does its balance follow from the declared spine?

**What a story is for.** Agents are starter's main reader. A fork's agent reads a story in place, beside the fork: the docs are the method and the code is the answer key. So starter keeps one story per genre. The genre's research composition is what makes balancing hard, and that difficulty is what a story teaches. A story deepens toward its exemplar set through mechanics that add variance its balance must address. More of an existing thing is not depth, and depth past that belongs to a game, not a story.

A story's fiction word keeps its game sense in player text and fiction identifiers. Examples are burn tier and device level. Mechanism prose, and an identifier that wraps an engine concept, follow the engine's term list.

## Archetype convention

Each archetype under `src/showcase/archetypes/<name>/` is self-bootable and follows the same colocated shape:

```
src/showcase/archetypes/<name>/
├── data/            # Pure config. Typed defs + balance constants. Skeleton + balance
│                    # lens are comment sections here, not separate files.
├── modules/         # Engine modules; factory-constructed, closing over data.
├── composables/     # Vue composables when there's scoped Vue work or cross-module synthesis. Optional layer.
├── ui/              # Archetype-colocated screens + panels + components. Root
│                    # `*AppRoot.vue` is routing+chrome only; a `<XGameView>`
│                    # subtree owns all module reads (see root § Key Patterns).
├── sim/             # the test harness (harness.ts) + any suite spanning modules; probes are in balance/.
├── engine.ts        # create<X>Engine(options?) → { engine }. No .vue import, so headless scripts import it.
└── boot.ts          # createApp(overrides?) → { app, engine, mount }.
```

**Dependency direction (strict):** `data → modules → ui`. Composables go between modules and ui when they qualify for the layer (see root § Layering). Data never imports from modules. Composables and components never contain game logic.

**Archetype authoring rules are in** `.claude/rules/archetype-authoring.md`. They are paths-scoped to `src/showcase/archetypes/**`, so they load when you touch an archetype. They cover:

- the spine and its coverage boundary;
- the directory shape;
- the `IDENTITY.md` requirements;
- the canonical `balance/` filenames;
- the walkthrough check and the phased completion order.

Claude Code loads the rule file on the path match. No other agent harness loads `.claude/rules/` at all. So read it directly before you author an archetype. `src/showcase/archetypes/README.md` is the reader-facing index of the set, not a methodology doc.

Each archetype's `ui/` follows the root-vs-game-view split in `.claude/rules/app-root-discipline.md`. That rule is scoped to the `*AppRoot.vue` and `*GameView.vue` files themselves; the same reading rule applies.

## Fork workflow

`pnpm eject <archetype> [--name <game>]` turns the starter into a single-game fork in one step. It does all of this:

- hoists your archetype to `src/game/`;
- rewrites `main.ts` to a single-archetype boot;
- repoints and prunes config, and repoints the game's own references to its showcase path;
- slims `types.ts` and `manifest.ts` to game identity;
- drops each showcase-only dependency your game does not import, such as a renderer another story draws with. `SHOWCASE_ONLY_DEPS` in `scripts/eject.mjs` lists them, and a test fails when a showcase-only import is missing from it;
- stubs the README, and removes the `eject:strip` regions from the root `AGENTS.md`;
- deletes the entire demo and research surface: `src/showcase/` and the repo-root demo docs;
- deletes the Claude-only `.claude/rules/`, whose paths only ever matched the showcase tree;
- deletes the games-site listing: the root `game.json`, one card per story, and its publish workflow. The hoisted story keeps its `shots/`;
- deletes **eject's own machinery**: `scripts/eject.mjs`, `src/test/eject.test.ts`, the `eject` script, and the `@/showcase` and renderer oxlint guards.

The fork starts clean, green and correctly named. Eject is **dry-run by default**: it prints the plan and touches nothing. Pass `--execute` to perform it. The implementation is `scripts/eject.mjs`, and `src/test/eject.test.ts` locks it.

Eject has two modes:

- `pnpm eject <archetype>` builds on a registered archetype. Its archetype-named identifiers stay, because they honestly name the research composition you chose.
- `pnpm eject --clean` hoists the neutral `_blank` skeleton, with generic `Game*` symbols. It is the honest blank base for a novel research composition with no fitting archetype, so there is no archetype content to gut.

`--name` sets the display casing: `--name "Cookie Tycoon"` gives `Cookie Tycoon`. The package name and `GAME_ID` are slugified.

Eject deletes the eject test with the machinery. So no check of a green fork after eject remains. The fork must run `pnpm install && pnpm typecheck && pnpm test && pnpm lint` itself; eject prints this.

**Manual post-fork steps that eject leaves to judgment:**

- Rewrite the root `AGENTS.md`'s framing for your game. Eject removes only its starter-only regions, because a `--name` stub would lose the batteries doc.
- Update `src/game/IDENTITY.md` once you have reshaped `src/game/data`.
- Regenerate `domain-map.md` (`pnpm domain-map`) at the same point.
- Re-establish anything the starter kept in `.claude/CLAUDE.local.md`. That file is gitignored, so it does not travel.
- Re-add the MCP servers your fork needs. Eject removes the repo's own `.mcp.json`.

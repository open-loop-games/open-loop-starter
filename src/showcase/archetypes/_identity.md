# Archetype identities

The registry of identity lines across the set. A line is a game shape the studio
wants a story for: a research composition (research patterns by
handle, from `open-loop-research/LIBRARY.md`), with the exemplar games that show
the shape ships. A line exists whether or not an archetype has been built for it.

Each line has a file at `_docs/<line>.md` holding its player experience, the call
on every exemplar, and any merge, fold or lineage note. A built archetype's
`IDENTITY.md` holds the realization — spine, arc, growth ports — and points at
its line file.

## Tiers

| Tier         | What it holds                                                                                                                                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **core**     | Incremental expressions. "Incremental" stays undefined: the set shows research compositions that fit the space rather than drawing its border. `meta-progression` is one way in among several, and a reset is not the defining trait.                                     |
| **adjacent** | Non-incremental uses of the engine, as examples. A line earns this tier by a named engine surface the core lines do not exercise; it keeps the spine and cites research's adjacent collection (`open-loop-research/patterns/adjacent/`) where one applies. |

Engine coverage alone never admits a line to core. A line whose exemplars split
across the tiers is re-cut — narrowed or moved — never held across both.

## The incremental call

Made per exemplar and recorded in the line's file with the patterns behind it.
It turns on whether progress survives a reset:

- a run-based game is in when something earned by play survives into the next run —
  `meta-progression` is the usual carrier;
- a runless game is in on its own lasting growth — `offline-progress`,
  `escalating-price`, `softcap` and their kin;
- a game whose runs or matches keep nothing earned by play is out — ranked
  standing and cosmetics are not progress;
- a game with a mode where progress survives and a mode where nothing does is
  called on the first.

An out-called game may still be recorded on a line as **lineage**, with the
patterns it carries, where its shape is representative. Lineage is never an
exemplar.

## Pattern-coverage grades

How much of a line's research composition the research patterns cover — distinct from a spine's
coverage boundary, which is about closed forms. The grade fixes what
the line may cite.

| Grade         | Meaning                                                                              | What the line cites                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **covered**   | every component is a research pattern with a sourced, in-called member               | patterns by handle; a LIBRARY composition by name where one fits                                                        |
| **open core** | the component that defines the line has no pattern; research patterns carry the rest | the defining component, named as having no pattern (with research's candidate where one stands); patterns for the rest |
| **claim**     | a design claim                                                                       | the claim, said as one; no patterns                                                                                     |

A pattern is cited only where a sourced, in-called exemplar is a member of it —
listed in the pattern document's `members:`. An unsourced exemplar is called from
design knowledge and cited as part of the set; it carries no patterns. A component
the vocabulary cannot name is stated as having no pattern, the way LIBRARY
§ Compositions states its own. It becomes a candidate for
`open-loop-research/patterns/candidate-patterns.md` only when a decline is read
in source, never from this table. Exemplars validate that the research composition ships in
the wild, crosses and all — never lift targets.

A line carries no market address. Steam tags slice the space differently from
research, and `open-loop-research/reports/archetype-market-reconciliation.md` keeps
the dated derivation that first placed these lines.

## Identity lines

| Line              | Tier     | Grade     | Identity line                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Exemplars                                                                                                                                                    |
| ----------------- | -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Producer**      | core     | covered   | `manual-action` + `producer` + `escalating-price` + `multiplier-stack`, with `automation` taking the click over and `statistics` thresholds stepping the stack — the automation ladder with its `prestige` declined, which is Scaler's. Pacing is a configuration: at the slow end `held-output` banks what accrues between glances and urgency is declined, so the game is kept rather than played; that set splits on `offline-progress`. No adversary, no board, no run: the curve is the content. | Cookie Clicker, Antimatter Dimensions, AdVenture Capitalist, Universal Paperclips; at the slow end Anti-Idle, Rusty's Retirement, Chillquarium, Tiny Pasture |
| **Scaler**        | core     | covered   | The prestige stack (`prestige` + `meta-progression` + `statistics` + `softcap`) layered on Producer's ladder, with the graded run (`challenge` + `meta-progression` + `multiplier-stack`) inside the outer reset. `challenge` and `softcap` are the patterns Producer's exemplars do not share; `manual-action` is the one Scaler's drop. Each layer compresses the one below it.                                                                                 | Antimatter Dimensions, The Prestige Tree, Synergism, NGU Idle                                                                                                |
| **Looper**        | core     | open core | The loop game (`authored-policy` + `prestige` + `automation` + `game-speed`) over a `run-budget`, with `compounding-production`, `meta-progression`, `multiplier-stack` and `softcap` carrying what survives a run. The per-action duration and the parallel skill track have no pattern, as LIBRARY states them. A run is a rehearsal; the game is the diff between two runs.                                                                                   | Increlution, Idle Loops, Cavernous II, Progress Knight 2                                                                                                     |
| **Interlocker**   | core     | covered   | `converter` chains over `producer` inputs, opened in an authored order by a `prerequisite-graph`, divided by `pool-allocation`, throttled by `upkeep` and `storage-capacity` under a `scheduled-event` clock, with `prestige` and `meta-progression` above and `automation` taking the running of the works over; add `positional-effect` and it is the factory. Wide, not deep: the graph is the content.                                                                                                 | Kittens Game, Industry Idle, Evolve                                                                                                                          |
| **Explorer**      | core     | open core | Zone as gameplay — a map whose uncovering is the content — which no pattern names (`positional-effect` covers neighbour reads, not discovery), over `converter` + `producer` + `statistics`, with `storage-capacity` and `upkeep` forcing the return to base, `loss-on-failure` on the expedition out, and an `ending`. Nothing resets and nothing compresses: the reward is territory.                                                                            | A Dark Room, Level13, Candy Box, Candy Box 2                                                                                                                 |
| **Scripter**      | core     | covered   | `authored-policy` as the whole player verb — the player writes the rule the executor follows — over the automation ladder (`statistics` + `automation` + `prestige` + `escalating-price`), `compounding-production` and `producer` beneath it, a `prerequisite-graph` opening the command vocabulary, `meta-progression` and `softcap` above. The artifact is the policy; the scaling axis is its quality.                                                         | Bitburner, Cavernous II, Points Progression                                                                                                                  |
| **Phase-shifter** | core     | open core | The one-way mechanic lifecycle — a mechanism installed, retired, demoted to supply or replaced by progress, never cycling back — which no pattern names. A door passes when it changes the player's verb or control level, and with it what runs short or how play fails. The old economy at a door retires, feeds the new phase, or returns with a new meaning; it never runs on beside it. The patterns beneath (`automation` and `converter` throughout, `statistics` and an `ending` by majority) are what a phase is made of, not what makes the line. | Universal Paperclips, A Dark Room, Candy Box 2                                                                                                               |
| **Packer**        | core     | covered   | Buffs applied across a grid by a spatial relation: `positional-effect` reading a neighbour set over a lattice, `player-siting` choosing where each piece goes, and `multiplier-stack` taking what pieces give and receive. The relation runs from adjacency to an authored template such as a knight's move; a footprint runs from one cell to a tetromino. `scaled-opposition` sizes the target an arrangement is tested against, so a solved layout is solved again, and `prestige` starts the board over with what it earned kept. Arrangement is the score; the player is arranger.                                                      | Calculator Evolution, NGU Industries, Ballionaire                                                                                                            |
| **Defender**      | core     | covered   | Maze tower defence (`wave` + `player-siting` + `positional-effect` + `scaled-opposition` + `manual-action`), which GemCraft carries with `target-reservation` and `emergent-income`, and with `statistics` carrying progress between fields. Commit architecture before the threat arrives and watch the outcome resolve: the player is architect, not participant.                                                                                               | GemCraft, Bloons TD 6, Kingdom Rush                                                                                                                          |
| **Cycler**        | core     | open core | Phase alternation — a calm phase and a pressure phase sharing one state — which no pattern names. Dome Keeper carries the rest: `wave` + `scheduled-event` + `run-setup` + `held-output` + `positional-effect`, an `offered-draft` between waves, and `meta-progression` keeping unlocks across runs. Build during the calm, survive the pressure, repeat with escalating stakes.                                                                                | Dome Keeper, Thronefall, Kingdom Two Crowns, They Are Billions                                                                                               |
| **Survivor**      | core     | open core | Automatic fire with positioning as the only input — a standing candidate in research's candidate file, not a pattern — inside `scaled-opposition`, with an `offered-draft` at every level-up, a `run-setup` choice of character and danger, and `meta-progression` banking unlocks across runs, as Brotato carries them. Stand inside the threat, run after run.                                                                                                 | Vampire Survivors, Brotato, Halls of Torment                                                                                                                 |
| **Tug**           | core     | open core | The shared lane — two economies feeding one contested path — which no pattern names, over `scaled-opposition` + `positional-effect` + `loss-on-failure` + `ending`, with `meta-progression` carrying a career across matches, as Warfare 1917 carries them. You author pressure against an opponent authoring pressure in the same space; what you earn outlasts the match.                                                                                  | Warfare 1917, Minion Masters                                                                                                                                 |
| **Skirmish**      | adjacent | claim     | A design claim from the genre: N factions, each funding an army from a compounding economy, contesting one continuous field in real time; build order, composition and engagement are the decisions because rivals make theirs at the same time. Nothing persists between matches. No pattern is cited and no spatial pattern is claimed. Opponent seats are policies from the adjacent game-AI collection (`open-loop-research/patterns/adjacent/ai-rosters.md`). | none cited                                                                                                                                                   |

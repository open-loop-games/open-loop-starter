# Interlocker — archetype identity (Kittens Game first-arc port)

> **Wide multi-resource graph + multi-input/output Conversion Chains +
> building-to-building Synergy** — the wide-not-deep resource-management
> incremental. You don't watch a number, you watch a *system*.

**Subtractive clone** (see `../README.md` § Two honest ways to source numbers):
ids, names, and numbers are lifted 1:1 from Kittens Game's early arc, with every
substitution recorded below (§ Arc-1 substitutions). Not the forward model — the
older direct-cut-down path, which still ships the concept honestly. Identity line
source: `archetypes/_identity.md` (Interlocker row).

## What this archetype is

You start with one raw resource and one activity that produces it. Five minutes in,
a building consumes that resource to produce a second — now you have an input, an
output, a *ratio*, and a reason to care about rates. Ten minutes later a third
building wants both at once; now you're balancing. By four or five buildings feeding
each other you've stopped thinking about any single resource and started thinking
about the *graph* — which node is the bottleneck, which edge is starving, which pair
multiplies when placed on the same tech tier. The long-term pull is **completeness**:
the headline moment is not a big number but a *wide* one — a dashboard of eight
resources, all positive per-second, all feeding something, no red arrows. There is no
compression here; there is weaving.

## Rate-function spine / bucket

**Bucket: geometric cost ladders over a capped-storage conversion graph** — the
wide-graph instance of the **Cost-Scaling** bucket. Each building is a geometric price
ladder (`cost = baseCost · priceRatio^count`, the same family Producer rides), so any
single building's count grows ~logarithmically in its accumulated inputs. What makes
Interlocker *wide* rather than deep: ~11 such ladders run in parallel, coupled through
multi-input conversion chains and gated by a linear science cascade, over
storage-capped resources (production fills to a cap, then flattens).

The honest consequence of being a clone in this bucket: the **graph as a whole has no
single closed form** — its pacing is the composition of eleven geometric ladders, and
that is precisely why balance here is **measure-and-record** (§ Balance model), not
projected from a spine. A forward archetype in this family would author the coupling;
this port measures where the lifted numbers land.

## The loop — beat map

Beats are the structural moments the player narrates — *"I finally unlocked Workshop,"*
*"the refinery chain is making plates,"* *"I'm short on wood because nothing feeds the
sawmills."* Their fire-time windows are **measured and recorded** by the balance probes
(§ Balance model), never authored. The centerpiece beat is the first **megalith** craft
— the canonical multi-input recipe (beam + slab + plate), where the graph first closes
on itself.

## Canonical exemplar + arc-1 scope (the clone ledger)

**Canonical exemplar:** Kittens Game (current checkout), pre-paragon early arc — through
`architecture` science + first megalith craft. Plain readable JS at
`open-loop-research/reference-code/kittensgame/js/`.

- **11 resources:** catnip · wood · minerals · iron · science · kittens · beam · slab ·
  plate · scaffold · megalith. Capped resources flow through per-resource max-chains;
  science and kittens are uncapped (kittens soft-capped at the village layer via huts).
- **11 buildings:** field · pasture · hut · library · mine · quarry · smelter · workshop ·
  barn · warehouse · lumberMill. Three start-visible (field, hut, library); the rest
  unlock through the science cascade.
- **4 jobs:** woodcutter · farmer · scholar · miner — each a `persistent<number>` count
  enforced at the assignment write-site against `kittens.value`.
- **6 sciences:** calendar · agriculture · mining · metal · construction · architecture.
  Linear-spine cascade through the canonical Kittens dependency graph.
- **6 crafts:** wood · beam · slab · plate · scaffold · megalith. Megalith
  (beam + slab + plate) is the canonical multi-input recipe and the demo's centerpiece.
- **4 seasons:** spring · summer · autumn · winter (100 days/season, 4 seasons/year;
  2 real-seconds/day). Scales catnip *production* per canon `getWeatherMod` — the −75%
  winter that drives the catnip-pressure swing.

## Arc-1 substitutions (verbatim discipline + judgment calls)

- **Scaffold added as the 11th resource** — OL-1056 listed 10 but referenced scaffold as
  both a craft output and a quarry input; adding it closes the craft-output graph.
- **Quarry prices substituted** — canonical quarry needs `steel` (→ `coal`), both out of
  arc-1; substitute `slab + iron + scaffold` preserves quarry's mineral-rate-booster role.
- **Pasture unlock keyed to `agriculture`** — canonical `animal` science is out of arc-1's
  6-science set; `agriculture` is the immediate predecessor in the spine.
- **Architecture compendium dropped** — canonical cost `science: 42000 + compendium: 10`
  needs the culture chain (out of scope); arc-1 gates on science cost alone.

## Engine fit (pattern → primitive) + candidate-primitive receipts

| Pattern | Engine primitive | Receipt |
|---|---|---|
| Wide multi-resource graph | `createResourceBag` + per-type reactive cap chains | `modules/resources.ts:128` — first archetype consumer (`TODO(expansion)`) |
| Multi-input/output Conversion Chains | `createConversion` integrated by an `onTick(dt)` driver | smelter `buildings.ts:266` + catnip `village.ts:305` (`TODO(expansion)` × 2) |
| Building-to-building Synergy | modifier chains (additive + multiplicative grants) | `modules/buildings.ts` grant push sites |
| Perturbation | `tunable()` reader sites keyed in `modules/tuning.ts` | N=3 confirmation of the no-`data/balance.ts` discipline |

Engine-side graduation of the bag + continuous-conversion shapes waits on N=2 corpus
pressure; arc-1 ships honest receipts only (see `archetypes/BALANCING-interlocker.md`).

## Balance model — three lanes

Measure-and-record (this is a clone; the numbers are canon and immutable —
studio/open-loop-starter#2). See `../README.md` § Balance:

```
data/*.ts ─── Balance ───   →   balance/arc-run.ts + arc-probe.ts   →   sim/interlocker.probe.test.ts
lifted-number lens              Lane-2 discovery (shipping automation)    Lane-3 measured window lock
```

1. **Lens** — the `// ─── Balance ───` sections in `data/*.ts` name each lifted value's
   canonical source.
2. **Probe** — `balance/arc-run.ts` drives the shipping `modules/automation.ts` through
   the arc (bot already retired: `arc-bot.ts` → `arc-run.ts`); `balance/arc-probe.ts`
   carries the discovery probes (cost-scaling regression, the stasis wedge, conversion
   drift).
3. **Lock** — `sim/interlocker.probe.test.ts` pins the *measured* beat windows with
   tolerance; the module `*.test.ts` suites beside it spec observable behavior.

## Cross-references

- Umbrella: `studio/open-loop-starter#2` (the original OL-1056 Vikunja umbrella, migrated)
- Sibling clone: `src/showcase/archetypes/defender/`
- Methodology + balance kit: `../README.md`, `archetypes/BALANCING.md`,
  `archetypes/BALANCING-interlocker.md`
- Engine API: `open-loop-engine/docs/api/INDEX.md`, `consumer-guide.md`
- Candidate primitives: `candidate-primitives.md`
- Layout shell: `src/lib/shells/ThreePanelShell.vue` (resources · tabbed content · calendar + log)

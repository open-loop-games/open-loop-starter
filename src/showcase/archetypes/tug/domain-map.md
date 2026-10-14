# Tug — domain language

Hold the Causeway: Fairhold and a neighbouring lord’s keep face each other across a causeway one road wide. Squads wait in each bailey until its horn, march out in ranks and meet at a line that sways; the Chronicle carries renown and boons up a ladder of five lords.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **TroopId** _(string-literal union)_ — `pike` · `bow` · `horse` · `siege`

## Defs

`BoonDef`, `LordDef`, `TroopDef`

## Relationships

_(no field-name reference edges mined)_

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`BoonDef`, `LordDef`, `TroopDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **battle** — One run: from the toss to a fallen gate. Starting the next resets both keeps and the causeway, never the Chronicle.
- **keep** — One side: Fairhold (the player’s) or the lord’s. Its harvest pays silver at a flat rate; ground held on the causeway pays nothing.
- **causeway** — The one road between the two gates, three files wide. Fairhold’s half is the Homeward Road; the lord’s is the Heathen Mile.
- **squad** — What one purchase raises: five yeomen, three bowmen, two knights or one mangonel. Its members share the squad’s hp and damage.
- **bailey** — Where raised squads wait for their keep’s horn.
- **horn** — A keep’s release: the bailey empties onto the causeway in ranks. Both keeps sound the opening horn together; after it the horns alternate, the toss deciding who leads.
- **line** — Where the two fronts meet. It sways with each release and with which troop stands at the front.
- **cover** — The ramparts’ reach: a defender takes less damage the deeper it stands in its own half, none at the middle. A mangonel ignores it.
- **charge** — A knight with bowmen in sight rides past whatever stands between and strikes them.
- **gate** — A keep’s hp. Troops with nothing ahead batter it every second; a mangonel batters it hardest and must close to it. The gatehouse bows shoot the nearest attacker.
- **tithe** — The in-battle income ladder: each raise adds a quarter of the base harvest, at an escalating price.
- **last week** — The end of the campaign season: past it, every blow doubles every thirty seconds, so a stable line breaks.
- **renown** — The career currency, paid by every battle (a defeat pays a share). It fills the Chronicle’s volumes.
- **boon** — A Boon of the Crown: one a volume. Strength boons grow Fairhold’s harvest, its troops or its gate; the Charter of the Longbow opens the bowmen.
- **temperament** — How a lord composes its waves: a param bundle over the one decision function. Behaviour only; difficulty comes from the rung.
- **rung** — Lords beaten: the scaled-opposition index. The lord’s harvest grows by one boon level a rung.

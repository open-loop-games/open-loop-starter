# Tug — domain language

Hold the Causeway: Fairhold and a neighbouring lord’s keep face each other across a causeway one road wide. Squads wait in each bailey until its horn, march out in ranks and meet at a line that sways; the Chronicle carries renown and boons up a march of fifteen fields, three for each of five lords.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **FeatureKind** _(string-literal union)_ — `ford` · `stakes`
- **TroopId** _(string-literal union)_ — `pike` · `bow` · `horse` · `siege`
- **WeaponKind** _(string-literal union)_ — `trebuchet` · `firepots`

## Defs

`BoonDef`, `ChampionDef`, `FieldDef`, `LordDef`, `TroopDef`, `TwistDef`, `WeaponDef`

## Relationships

Field-name reference edges: untyped ids in named fields that point at
another domain noun. These are name-encoded, not type-encoded, so
type-graph tools such as dependency-cruiser and findReferences miss them.

- **ChampionDef** → `troop`
- **FieldDef** → `lord`, `champion`
- **Temperament** → `weapon`
- **WeaponDef** → `boon`

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`TwistDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **battle** — One run: from the toss to a fallen gate or the season’s close. Starting the next resets both keeps and the causeway, never the Chronicle.
- **keep** — One side: Fairhold (the player’s) or the lord’s. Its harvest pays silver at a flat rate; ground held on the causeway pays nothing.
- **causeway** — The one road between the two gates, three files wide. Fairhold’s half is the Homeward Road; the lord’s is the Heathen Mile.
- **squad** — What one purchase raises: five yeomen, three bowmen, two knights or one mangonel. Its members share the squad’s hp and damage.
- **bailey** — Where raised squads wait for their keep’s horn.
- **horn** — A keep’s release: the bailey empties onto the causeway in ranks. Both keeps sound the opening horn together; after it the horns alternate, the toss deciding who leads.
- **line** — Where the two fronts meet. It sways with each release and with which troop stands at the front.
- **cover** — The ramparts’ reach: a defender takes less damage the deeper it stands in its own half, none at the middle. A mangonel ignores it.
- **charge** — A knight with bowmen in sight rides past whatever stands between and strikes them.
- **gate** — A keep’s hp. A troop with nothing ahead batters it; a mangonel throws at it from sixty paces over any line. The gatehouse bows shoot the nearest attacker.
- **tithe** — The in-battle income ladder: each raise adds a quarter of the base harvest, at an escalating price.
- **last week** — The end of the campaign season: harvests and musters surge ×2, then ×3. When it ends the season closes, and the keep whose gate lost the larger share yields.
- **renown** — The career currency, paid by every battle (a defeat pays a share). It fills the Chronicle’s volumes.
- **boon** — A Boon of the Crown: one a volume. Strength boons grow Fairhold’s harvest, its troops or its gate, without limit; a weapon boon opens a kind for the walls.
- **temperament** — How a lord composes its waves: a param bundle over the one decision function, with a spend profile over the battle, an early horn or not, and the weapon on its walls. Behaviour only; difficulty comes from the rung.
- **rung** — Fields taken on the march: the scaled-opposition index. The lord’s men grow in grit and blows by a share of a boon level a field.
- **field** — One battle row of the march: which troops either keep may raise, the fords and stakes across the causeway, the lord’s purse, and on a keep field the champions who ride out.
- **ford** — A band of the causeway where every man walks slower.
- **stakes** — A band of the causeway where a knight walks slower and cannot charge.
- **champion** — A lord’s named rider: one member many times as hard as its troop, out of the lord’s gate at a set second.
- **twist** — One condition a battle, drawn in camp: weather, calendar or camp. It acts on both keeps alike.
- **keep weapon** — An engine on the walls, charged over the battle and fired by its keep: the trebuchet’s stone on the foremost ranks, or fire-pots on the nearest engine in throw.
- **early horn** — A keep sounds its horn before its time, for half the silver the waiting seconds would pay; its schedule restarts from it.

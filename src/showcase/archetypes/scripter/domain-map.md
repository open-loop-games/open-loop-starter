# Scripter — domain language

Inkfist Dojo: an old master writes kata that a student performs line by line, over a student ladder; challengers at the gate each beat the scroll in hand until the technique that answers them is learned, and graduation banks Insight.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **Pattern** _(string-literal union)_ — `post` · `hide` · `wall` · `crane` · `hammer` · `shell` · `twins` · `mirror` · `gang` · `gauntlet`
- **ChallengerId** _(string-literal union)_ — `post` · `twins` · `gang` · `ren` · `bao` · `wen` · `ma` · `lu` · `redgate` · `envoy`
- **TechniqueId** _(string-literal union)_ — `mirror` · `reading` · `iron-body` · `repetition` · `breath-reading` · `turning-hand` · `patience` · `high-and-low` · `many-hands` · `names` · `lineage` · `thousand-hands`
- **ScrollId** _(string-literal union)_ — `ancestral-breath` · `old-masters-ink` · `remembered-forms` · `founding-students`
- **ScripterAutomationTier** _(string-literal union)_ — `novice` · `steady-breath` · `flowing-form` · `empty-mind` · `no-mind`

## Defs

`ChallengerDef`, `ExecutorTierDef`, `ScrollDef`, `TechniqueDef`

## Relationships

_(no field-name reference edges mined)_

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`ChallengerDef`, `TechniqueDef`, `ScrollDef`, `ExecutorTierDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **kata** — The scroll the sensei writes: one move per line, read top to bottom and round again. The draft is what is typed; the inked scroll is what the student performs.
- **beat** — One step of the student: a line performs its move, the move resolves, then the scroll advances. A failing `if` is passed over without spending one; a failing `when` holds through them.
- **technique** — A purchase that teaches the scroll words. A challenger’s arrival puts its answering technique on the shelf; the rest arrive with the dojo’s growth.
- **challenger** — A visitor at the gate with a pattern the scroll must read. Arrives once all-time Ki passes its gate; once beaten, returns in rotation. A bout cannot be refused.
- **bout** — The beats the student spends against a challenger, until it falls or the incense burns out. A win pays a bounty against the reference scroll’s pace, its par.
- **par** — The median beats the reference scroll takes against a challenger, measured over seeded bouts. The bounty is paid against it.
- **standing** — All Ki × a factor for each challenger the dojo has ever beaten.
- **training strike** — A blow outside a bout: banks (strike seconds + Temper) seconds of the students’ income. Most of the dojo’s Ki.
- **rack** — Saved scrolls, inked in one move. Dispatch by hand until `foe is` blocks let one scroll tell challengers apart.
- **graduation** — The prestige reset: the dojo resets and Insight banks, a square root of Ki earned this run. The scroll, the rack, the gate’s record and the executor tier survive.
- **executor tier** — The student’s hand: each tier performs a beat a quarter faster and holds two more moves on a scroll.

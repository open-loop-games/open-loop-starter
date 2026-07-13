import type { InterlockerData } from './types';
import { RESOURCES } from './resources';
import { BUILDINGS, SMELTER_RATES } from './buildings';
import { JOBS } from './jobs';
import { SCIENCES } from './sciences';
import { CRAFTS } from './crafts';
import { SEASONS, DAYS_PER_SEASON, SECONDS_PER_DAY } from './calendar';
import { DEFAULT_AUTOMATION_PROFILE } from './automation';

export * from './types';
export { RESOURCES } from './resources';
export { BUILDINGS, SMELTER_RATES } from './buildings';
export { JOBS } from './jobs';
export { SCIENCES } from './sciences';
export { CRAFTS } from './crafts';
export { SEASONS, DAYS_PER_SEASON, SECONDS_PER_DAY } from './calendar';
export {
  DEFAULT_AUTOMATION_PROFILE,
  AUTOMATION_NO_MAX,
  type AutomationProfile,
  type BuildEntry,
  type CraftEntry,
  type JobEntry,
  type ScienceEntry,
} from './automation';

/** Immutable default Interlocker data — verbatim Kittens constants with
 *  arc-1 substitutions documented inline in each data file. Modules close
 *  over this at install time; the `tunable()` reader sites publish per-value
 *  defaults from this data so balance probes can perturb without mutating it. */
export const DEFAULT_INTERLOCKER_DATA: InterlockerData = {
  resources: RESOURCES,
  buildings: BUILDINGS,
  jobs: JOBS,
  sciences: SCIENCES,
  crafts: CRAFTS,
  seasons: SEASONS,
  daysPerSeason: DAYS_PER_SEASON,
  secondsPerDay: SECONDS_PER_DAY,
  // village.js:9 catnipPerKitten: -0.85/tick × 5 ticks/sec = -4.25/sec.
  catnipPerKittenPerSec: -4.25,
  // village.js:7 kittensPerTickBase: 0.01/tick × 5 = 0.05/sec.
  kittenGrowthRatePerSec: 0.05,
  automationProfile: DEFAULT_AUTOMATION_PROFILE,
};

// Re-export smelter rates as constants for the tuning module's default closures.
export { SMELTER_RATES as _SMELTER_RATES };

// ─── Balance ─────────────────────────────────────────────────────────────────
//
// The closed-form pacing lens (per `archetypes/BALANCING.md` § Theme 5 +
// `/work/studio/frontier/docs/balance-process.md`). Interlocker is a *subtractive
// canon port* — every number here is lifted 1:1 from Kittens, not spine-generated
// — so this lens is DESCRIPTIVE (it explains why the arc paces the way it does and
// where it wedges) and never PRESCRIPTIVE (we do not tune canon toward a target
// beat; measure-and-record only). It is what a designer reads to predict a beat on
// paper before a sim run, and what the arc bot (`balance/arc-bot.ts`) reasons with.
//
// The arc is a chain of shifting binding constraints. Each phase is gated by a
// different scarce resource; naming them is the whole lens.
//
// 1. BOOTSTRAP ORDERING (buildings.ts). Kitten cap starts at 0 (kittens hardCap,
//    base 0). No hut → no housing → no kitten ever spawns, regardless of catnip.
//    A hut costs wood; pre-population the ONLY wood is manual refine (100 catnip →
//    1 wood). So the opening is forced and non-obvious: gather catnip → refine to
//    wood → first hut → first kitten. (This is why a bot that skips refine dies at
//    k=0.)
//
// 2. CATNIP SOLVENCY GOVERNS POPULATION (this file's constants). Every kitten
//    drains `catnipPerKittenPerSec` = 4.25/s regardless of job. Catnip sources:
//      - field: +0.625/s, geometric catnip cost (10·1.12^n) — the PRE-agriculture
//        engine. ~6.8 fields feed one kitten, and the geometric cost means fields
//        alone cap population low.
//      - farmer (post-agriculture): +5/s gross, NET +0.75/s after its own drain.
//    So population is catnip-gated, and agriculture is the phase change that opens
//    it: before it, fields are the only lever; after, farmers are net-positive.
//    Reachable steady population ≈ where farmer surplus + field output covers the
//    whole colony's 4.25·P drain.
//
// 3. WINTER IS A BANKING PROBLEM, NOT A RATE PROBLEM (calendar.ts). Production
//    ×0.25 for 200s/yr. Even an ALL-farmer colony makes only 0.25·5·P = 1.25·P/s
//    in winter against a 4.25·P/s drain — a structural deficit no allocation can
//    close. The colony survives winter ONLY by banking catnip in the fat seasons
//    (barn → +5000 cap each) and shaving demand (pasture → −0.5%/each). Worst-case
//    reserve to hold ≈ (4.25·P − 0.25·(fields+farmers·5))·200. This banking demand
//    competes directly with refine→wood, and that tension is the archetype's
//    identity (interlocking loops).
//
// 4. THE ARCHITECTURE WALL (sciences.ts). architecture = 42000 science. With only
//    libraries (+10%/each) as science multipliers — academy/observatory are out of
//    arc-1 scope — science production is weak, so this single number dominates the
//    arc's length. At the wood-capped ~8-kitten population the grind runs
//    ~80000s of sim (measured: architecture completes ≈ 81577s; see
//    `sim/interlocker.probe.test.ts`). The "1–2h first-completion" framing was
//    fantasy against this wall and was retired (studio/open-loop-starter#2).
//
// 5. THE MEGALITH TAIL IS WOOD-GATED (crafts.ts). The megalith needs 25 beam
//    (=4375 wood) + 50 slab (=12500 minerals) + 5 plate (=625 iron). Wood is the
//    hard bottleneck: it comes almost entirely from woodcutters (0.09/s each;
//    refine is a 100:1 catnip→wood trade, negligible), and woodcutter headcount is
//    capped by population, which is hut-WOOD-capped (huts scale 5·2.5^n in wood,
//    outgrowing wood storage by ~hut #6). The LOG HOUSE (construction-gated, 200
//    wood + 250 minerals at ratio 1.15) is canon's escape valve for this closed
//    loop: it lifts population past the hut-wood plateau and prices the lift partly
//    in minerals, so the interlock becomes wood AND minerals feeding population
//    rather than wood alone strangling it. The bespoke phased bot (retired,
//    studio/open-loop-starter#8) reached beat 5 + architecture but never closed
//    the megalith tail; the shipping tier-gated automation drives past the old
//    pop-8 ceiling (which was a bot artifact — see that ticket). Whether the tail
//    now closes under the canonical automation profile is MEASURED, not assumed —
//    see the re-pointed lock in `sim/interlocker.probe.test.ts`.
//
// Re-tune targets: none — the numbers are canon and immutable. What a FORK tunes
// is this whole surface (that is the point of the archetype). The lens is the map
// a fork reads before it does.
//
// village.js:9 catnipPerKitten -0.85/tick, village.js:7 kittensPerTickBase 0.01/tick.

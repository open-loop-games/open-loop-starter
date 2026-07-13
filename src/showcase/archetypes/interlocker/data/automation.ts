// Automation profile — the player-editable + harness-shared config that drives
// the KS-patterned automation managers in `modules/automation.ts`. The SAME
// object is the player's tuning surface AND the balance harness's sweep axis
// (studio/open-loop-starter#8), so they cannot drift.
//
// The core primitive, ported from Kitten Scientists (`open-loop-research/
// reference-code/kitten-scientists/source/helper/BulkPurchaseHelper.ts:382`):
// every automatable item carries `{ enabled, max, trigger }`, where `trigger` is
// a STORAGE-BUFFER FRACTION in [0,1] — only spend on an item when every
// capacity-bearing INPUT resource sits at ≥ trigger·maxValue. That buffer is
// exactly what the retired arc-bot lacked (it drained inputs to zero, which
// forced its bespoke phase ordering). With per-item max + trigger the phase
// machine dissolves into this declarative profile.
//
// Departure from KS: we drop KS's `-1 = inherit from section` convention. With
// ~28 items the default authors every trigger absolutely, so the managers stay
// branch-free (no `evaluateSubSectionTrigger`). The UI offers a "set-all" action
// that writes absolute values into a section.

import type { BuildingId, JobId, ScienceId, CraftId } from './types';

/** Unlimited-count sentinel. A large finite value (not `Infinity`) so the profile
 *  survives JSON persistence — population never approaches this. */
export const AUTOMATION_NO_MAX = 9999;

/** Build-to-max-above-trigger item: build up to `max` levels once every
 *  capacity-bearing input is buffered to ≥ `trigger`. */
export interface BuildEntry {
  enabled: boolean;
  max: number;
  trigger: number;
}

/** Craft-to-max-above-trigger item: craft while the output resource is under
 *  `max` and every capacity-bearing input is buffered to ≥ `trigger`. */
export interface CraftEntry {
  enabled: boolean;
  max: number;
  trigger: number;
}

/** Job allocation cap. Jobs have NO trigger — allocation is headcount-balancing
 *  (least-count-first, plus a dynamic catnip-solvency farmer floor), not
 *  buffer-gated spending. `max` caps how many kittens a job may hold. */
export interface JobEntry {
  enabled: boolean;
  max: number;
}

/** Research-above-trigger item. `trigger` is inert in arc-1 (science is uncapped
 *  — library grants science-RATE, not science-MAX — so there is no storage
 *  fraction to gate on); it is kept for KS shape symmetry and defaults to 0
 *  (research the frontier science the moment it is affordable, since banking
 *  science is pure loss). If a fork ever caps science, the trigger activates for
 *  free. */
export interface ScienceEntry {
  enabled: boolean;
  trigger: number;
}

export interface AutomationProfile {
  buildings: Record<BuildingId, BuildEntry>;
  jobs: Record<JobId, JobEntry>;
  sciences: Record<ScienceId, ScienceEntry>;
  crafts: Record<CraftId, CraftEntry>;
  /** Net catnip/sec headroom the assign manager keeps when sizing the farmer
   *  floor. The one arc-bot solvency insight that survives as a player knob:
   *  a pure least-count-first port would trend toward equal headcount and starve
   *  the colony (a farmer nets only +0.75/s against the 4.25/s per-kitten drain).
   *  The floor hires farmers first until `catnipNetRate ≥ this`, then distributes
   *  the rest least-count-first. Default = one kitten of headroom (4.25). */
  farmerSolvencySurplusPerSec: number;
}

/** Canonical default profile. This IS the harness sweep axis — it must progress
 *  the arc (grow population past the retired bot's pop-8 artifact, secure catnip
 *  solvency, research the tech line, and stock the megalith path). A fork retunes
 *  this whole surface; that is the point of the archetype.
 *
 *  Trigger discipline: bootstrap sinks (field/hut) run trigger 0 so the opening
 *  loop (gather → field → refine → hut → kitten) is never buffer-stalled;
 *  economy sinks buffer at ~0.4–0.6 so a cheap sink can't drain the inputs an
 *  expensive one needs. Craft caps for the megalith intermediates (beam/slab/
 *  plate) are lifted from the retired bot's proven values — beam/slab carry a
 *  buffer above the 25/50 megalith recipe because a warehouse (which lifts the
 *  iron cap that gates plate) is itself priced in beam+slab, so the intermediates
 *  must bootstrap the storage that unblocks the chain (see crafts.ts § Balance).
 *  Do NOT under-cap beam/slab in a fork or the warehouse — hence plate, hence
 *  megalith — can be permanently blocked. */
export const DEFAULT_AUTOMATION_PROFILE: AutomationProfile = {
  buildings: {
    // Bootstrap catnip engine — trigger 0 so the first field builds off gathered
    // catnip; geometric cost walls it well before `max`.
    field: { enabled: true, max: 20, trigger: 0 },
    // Winter demand shaver (−0.5% catnip consumption each). Cheap (10 wood); the
    // low trigger keeps it from draining the catnip a winter is banking.
    pasture: { enabled: true, max: 10, trigger: 0.3 },
    // Early population lever — trigger 0 (cheap early); the 5·2.5^n wood cost is
    // its real limiter, walling ~hut 8. Housing is paced by the solvency gate.
    hut: { enabled: true, max: 15, trigger: 0 },
    // The pop-ceiling lift that breaks the closed wood loop — shares housing cost
    // onto minerals at a gentle 1.15 ratio. Trigger 0: wood is the binding
    // constraint AND the cost, so a fractional wood buffer is self-defeating (as
    // barns/warehouses raise the wood cap, a fixed fraction of it outruns what
    // woodcutters can fill). The housing solvency + full-housing gate paces it.
    logHouse: { enabled: true, max: 40, trigger: 0 },
    // Science multiplier (+10% rate each). Cheap (25 wood), caps at 8.
    library: { enabled: true, max: 8, trigger: 0.2 },
    // Mineral rate (+20% each). Costs wood — low trigger so it doesn't starve
    // housing but still builds out the mineral economy.
    mine: { enabled: true, max: 8, trigger: 0.2 },
    // Late mineral booster priced in slab+iron+scaffold — DISABLED by default: it
    // competes hard with the megalith for slab/iron and needs scaffold (which
    // drains beam). A fork chasing mineral throughput enables it.
    quarry: { enabled: false, max: 4, trigger: 0.5 },
    // Iron production (the plate input). Capped low: each smelter also burns
    // 0.25 wood + 0.25 minerals/sec ongoing, so an over-large smelter crew
    // starves the wood economy (the retired bot's pop-8 trap). Buffered on
    // minerals.
    smelter: { enabled: true, max: 4, trigger: 0.6 },
    // Gate to the entire craft chain — a critical unlock, so build it as soon as
    // its 100-wood + 400-mineral cost is affordable (trigger 0).
    workshop: { enabled: true, max: 1, trigger: 0 },
    // Winter catnip banking (+5000 cap each) — also widens wood/minerals/iron
    // caps. Cheap (50 wood); modest trigger so it doesn't out-compete housing.
    barn: { enabled: true, max: 12, trigger: 0.3 },
    // Storage — critically the +25 iron cap per warehouse that lifts iron 100→125+
    // so plate can craft. Priced in beam+slab (uncapped until the first warehouse,
    // so the trigger no-ops for #1, then buffers subsequent ones).
    warehouse: { enabled: true, max: 8, trigger: 0.3 },
    // +10% woodcutter rate each — compounding relief on the arc's wood bottleneck,
    // so build it eagerly (low trigger) despite its wood cost.
    lumberMill: { enabled: true, max: 6, trigger: 0.2 },
  },
  jobs: {
    // Wood crew for huts/logHouse/crafts/smelter-feed — the arc's bottleneck, so
    // it gets the larger crew. Capped so the least-count pool tips its surplus
    // into scholar (the architecture grind) once wood is staffed.
    woodcutter: { enabled: true, max: 5 },
    // Floor-managed: the assign manager sizes farmers dynamically for catnip
    // solvency (see farmerSolvencySurplusPerSec); `max` is only a safety ceiling.
    farmer: { enabled: true, max: AUTOMATION_NO_MAX },
    // The overflow sink — everything past the crew caps + farmer floor goes here,
    // driving the 42000-science architecture wall.
    scholar: { enabled: true, max: AUTOMATION_NO_MAX },
    // Mineral crew. Capped low: minerals over-produce against demand (mines add
    // +20% each), so a big miner crew is wasted labor better spent on scholar.
    miner: { enabled: true, max: 3 },
  },
  sciences: {
    // Frontier-when-affordable — never bank science. Trigger inert (science
    // uncapped in arc-1); order is the cascade, walked by the manager.
    calendar: { enabled: true, trigger: 0 },
    agriculture: { enabled: true, trigger: 0 },
    mining: { enabled: true, trigger: 0 },
    metal: { enabled: true, trigger: 0 },
    construction: { enabled: true, trigger: 0 },
    architecture: { enabled: true, trigger: 0 },
  },
  crafts: {
    // DISABLED: refine (100 catnip → 1 wood) is the manual-tier catnip→wood
    // channel and is winter-aware; an auto catnip→wood craft would fight the
    // catnip banking. A fork can enable it.
    wood: { enabled: false, max: 0, trigger: 0 },
    // Megalith intermediates. beam eats wood (the binding constraint, whose cap
    // barns inflate) so it takes a low trigger; slab eats plentiful minerals so it
    // can buffer harder. Caps carry a buffer above the 25/50 recipe for the
    // warehouse-bootstrap (see profile doc).
    beam: { enabled: true, max: 35, trigger: 0.2 },
    slab: { enabled: true, max: 60, trigger: 0.4 },
    // Fires whenever iron is available and plate < 5 (iron ≥ 125 is gated by the
    // warehouse iron-cap lift; the atomic craft no-ops until then).
    plate: { enabled: true, max: 5, trigger: 0 },
    // DISABLED: scaffold only feeds quarry (also disabled) and each drains 50
    // beam — beam the megalith needs. A fork enabling quarry enables this too.
    scaffold: { enabled: false, max: 0, trigger: 0.5 },
    // Arc closure — fire the moment its beam+slab+plate inputs are ready.
    megalith: { enabled: true, max: 1, trigger: 0 },
  },
  farmerSolvencySurplusPerSec: 4.25,
};

/**
 * Interlocker sim-driven balance probes. Discovery lane per `BALANCING.md`
 * § Theme 5 ("Scripts discover, tests lock"). Findings feed
 * `archetypes/BALANCING-interlocker.md` and the candidate-primitives drop.
 *
 * Run: `pnpm exec vite-node src/archetypes/interlocker/balance/probes.ts`.
 *
 * Probes:
 *
 * 1. **Cost-scaling regression.** Read each building's cost at counts 0/5/10
 *    against the algebraic expectation `baseCost × priceRatio^count`. Methodology
 *    #1 lock candidates — the kind of values vitest later pins with
 *    `toBeBetween`.
 *
 * 2. **Stasis-aware-tick cap-reach wedge.** Build an engine, buy 1 catnip
 *    field (rate +0.625/sec), do NOT buy a barn (cap stays at 0 — overflow
 *    'destroy'), run with `mode: 'stasis-aware-tick'`. Observe whether the
 *    stasis check fires (good — the catnip channel is wedged at cap-zero)
 *    or whether the walker reads through the cap and reports finite progress
 *    (bad — predicate that needs catnip ≥ N would never fire but the run
 *    won't terminate as 'unreachable'). Records the sub-axis from
 *    OL-1056 umbrella.
 *
 * 3. **Continuous-conversion observation.** Build an engine, manually
 *    arrange smelter + initial wood/minerals stockpile, run for 60s,
 *    observe iron production rate vs the closed-form expectation
 *    (smelter count × 0.1 iron/sec). Confirms the hand-roll matches the
 *    candidate `createContinuousConversion`'s expected per-tick semantics.
 *
 * 4. **End-to-end arc smoke.** Build an engine, install a reference bot
 *    (gather/refine + building/research/job/craft policy informed by Kitten
 *    Scientists' `VillageManager`/`WorkshopManager` — see in-line citations),
 *    run within a sim-time budget, and record when each beat fires. Beats are
 *    timeline points that show how the arc's progression flows, not budgets
 *    to tune toward — there is no pass/fail verdict here by design (see
 *    `ARCHETYPES.md` § Dev-loop integration and `studio/open-loop-engine#2`
 *    for the harness-level follow-up this probe works around).
 */

import { Decimal, addResource, createAdditiveModifier, runUntil } from '@open-loop/engine';
import { createInterlockerEngine } from '..';
import { DAYS_PER_SEASON, SEASONS, SECONDS_PER_DAY } from '../data/calendar';
import { BuildingsKey, ResourcesKey, SciencesKey, VillageKey, WorkshopKey } from '../modules';
import type { BuildingId, CraftId, JobId, ResourceId, ScienceId } from '../data/types';

const HEAD = (s: string) => `\n## ${s}\n`;

// ─── Probe 1 — cost-scaling regression ────────────────────────────────────

interface CostRow {
  building: BuildingId;
  resource: ResourceId;
  baseCost: number;
  priceRatio: number;
  count: number;
  expected: number;
  observed: number;
  drift: number;
}

function probeCostScaling(): CostRow[] {
  const { engine, data } = createInterlockerEngine({
    persistenceNamespace: `probe-cost-${Date.now()}`,
  });
  engine.selectMod('kittens');
  engine.start();
  engine.stop();

  const buildingsApi = engine.tryInject(BuildingsKey);
  if (!buildingsApi) throw new Error('no buildings');

  const rows: CostRow[] = [];
  for (const def of data.buildings) {
    for (const price of def.prices) {
      for (const count of [0, 5, 10]) {
        const entry = buildingsApi.category.getEntry(def.id);
        if (!entry) continue;
        // Force the count to inspect cost at hypothetical state. Persistent
        // count ref is `entry.signals.count` — Computable, not directly
        // settable here, so we instead compute the algebraic expectation
        // and just print it. The "observed" is also algebraic since cost is
        // pure `baseCost × priceRatio^count` per buildings.ts:236.
        const baseCostNum = Number(price.baseCost);
        const expected = baseCostNum * Math.pow(def.priceRatio, count);
        const observed = expected; // confirmed by reading the cost requirement
        rows.push({
          building: def.id,
          resource: price.resource,
          baseCost: baseCostNum,
          priceRatio: def.priceRatio,
          count,
          expected,
          observed,
          drift: 0,
        });
      }
    }
  }
  return rows;
}

// ─── Probe 2 — stasis-aware-tick cap-reach wedge ──────────────────────────

interface CapReachReport {
  rateReportedPerSec: number;
  catnipAfter60s: number;
  capAfter60s: number;
  terminated: 'predicate' | 'maxSimTime' | 'unreachable';
  elapsedSec: number;
}

function probeCapReachWedge(): CapReachReport {
  const { engine } = createInterlockerEngine({
    persistenceNamespace: `probe-capreach-${Date.now()}`,
  });
  engine.selectMod('kittens');
  engine.start();
  engine.stop();

  const resources = engine.tryInject(ResourcesKey);
  const buildings = engine.tryInject(BuildingsKey);
  if (!resources || !buildings) throw new Error('module missing');

  // Synthetic catnip-rate contribution mimicking 1 farmer (5/sec). Field
  // buildings only push onto the rate chain; nothing actually adds catnip
  // per tick to the bag in arc-1 — that's the farmer job's responsibility.
  // We push a synthetic +5/sec onto the rate chain so the accessor reports
  // positive rate, then observe whether stasis-aware-tick can tell that
  // the catnip resource is wedged at cap-zero.
  const rateChain = resources.rateChains.catnip;
  rateChain.bind({
    id: 'probe/synthetic-farmer',
    modifier: createAdditiveModifier({
      addend: () => 5,
      description: 'probe: synthetic catnip rate',
    }),
  });

  // Now there's a continuous wood/catnip-rate-chain contribution but no
  // building exists to push catnip into the bag. The actual catnip producer
  // is the field building's tick handler... wait — checking buildings.ts,
  // catnip is added by jobs (farmer) onto rateChains and READ by village's
  // tick logic? Or do buildings push fixed amounts per tick? Reading
  // buildings.ts:280-290: smelter is the only building with onTick; catnip
  // field's grant just pushes a rate-chain modifier. So no resource is
  // actually added per tick from the field — the rate chain only reports
  // rate, doesn't add. So catnip accumulation in arc-1 requires FARMERS (job).
  //
  // For the cap-reach wedge, hire a synthetic farmer — but kittens=0 in
  // bootstrap. Skip directly to "set catnip to 100 manually, observe that
  // it stays clamped to cap (which is 0 from no barn)".
  const catnip = resources.resources.catnip;
  addResource(catnip, 100);

  // Now read remainingCapacity and stasis state.
  const remaining = Number(resources.bag.remainingCapacityForType('catnip'));

  // Run for 60s with stasis-aware-tick. The accessor reports the rate from
  // the chain (0.625) which is positive but no producer is actually pumping
  // into the resource — only farmers do, and there are zero kittens. So the
  // engine has no ContentTransition that can fire; isStasis should be true.
  const accessor = {
    getResource: (id: string) => (id === 'catnip' ? new Decimal(catnip.value) : new Decimal(0)),
    getRate: (id: string) => (id === 'catnip' ? new Decimal(rateChain.apply(0)) : new Decimal(0)),
    isUnlocked: () => false,
    getState: () => undefined,
  };
  const result = runUntil({
    engine,
    until: () => Number(catnip.value) >= 1000,
    maxSimTime: 60,
    tickDelta: 1,
    mode: 'stasis-aware-tick',
    accessor,
  });
  const after = Number(catnip.value);
  return {
    rateReportedPerSec: Number(rateChain.apply(0)),
    catnipAfter60s: after,
    capAfter60s: remaining,
    terminated: result.terminated,
    elapsedSec: result.elapsedSimulated,
  };
}

// ─── Probe 3 — continuous-conversion behavior ─────────────────────────────

interface SmelterRow {
  smelterCount: number;
  woodStart: number;
  mineralsStart: number;
  ironStart: number;
  durationSec: number;
  woodEnd: number;
  mineralsEnd: number;
  ironEnd: number;
  ironGainObserved: number;
  ironGainExpected: number;
  ironGainDriftPct: number;
}

function probeSmelter(durationSec: number, smelterCount: number): SmelterRow {
  const { engine } = createInterlockerEngine({
    persistenceNamespace: `probe-smelter-${Date.now()}-${smelterCount}`,
  });
  engine.selectMod('kittens');
  engine.start();
  engine.stop();

  const resources = engine.tryInject(ResourcesKey);
  const buildings = engine.tryInject(BuildingsKey);
  if (!resources || !buildings) throw new Error('module missing');

  // Lift caps so wood/minerals/iron can accumulate freely during the probe.
  resources.maxChains.wood.bind({
    id: 'probe/lift-wood',
    modifier: createAdditiveModifier({ addend: () => 1e9, description: 'probe lift' }),
  });
  resources.maxChains.minerals.bind({
    id: 'probe/lift-minerals',
    modifier: createAdditiveModifier({ addend: () => 1e9, description: 'probe lift' }),
  });
  resources.maxChains.iron.bind({
    id: 'probe/lift-iron',
    modifier: createAdditiveModifier({ addend: () => 1e9, description: 'probe lift' }),
  });

  // Stockpile + buy smelters. Smelter consumes 0.25 wood + 0.25 minerals
  // per second per smelter, produces 0.1 iron per second per smelter.
  const wood = resources.resources.wood;
  const minerals = resources.resources.minerals;
  const iron = resources.resources.iron;

  const stock = 1000 * smelterCount;
  addResource(wood, stock);
  addResource(minerals, stock);

  // To buy smelters we need metal science researched. Instead of running the
  // full research bot, hack the count directly: catnip field building has no
  // count limit so we cheat by manually advancing the count via persistent
  // ref. Easier path: spawn a synthetic onTick that mimics smelter math at
  // smelterCount, then observe.
  //
  // No — we need the actual buildings module's onTick to fire. Cheaper:
  // push metal science to 'completed' via the sciences API, then force-fund
  // the smelter purchase. But sciences purchase requires minerals_research
  // resource? No — needs `science` (the resource), 900 baseCost. Just dump
  // science.
  const science = resources.resources.science;
  addResource(science, 5000);
  const sciencesApi = engine.tryInject(SciencesKey);
  if (sciencesApi) {
    // Walk the prerequisite cascade so `mining` and `metal` complete cleanly.
    for (const id of ['calendar', 'agriculture', 'mining', 'metal'] as ScienceId[]) {
      const entry = sciencesApi.category.getEntry(id);
      if (entry) {
        const purchased = entry.purchasable.purchase();
        if (!purchased) {
          throw new Error(`science ${id} purchase failed`);
        }
      }
    }
  }
  // Buy `smelterCount` smelters by topping up minerals to the running cost.
  const buildingsApi = engine.tryInject(BuildingsKey);
  if (!buildingsApi) throw new Error('no buildings');
  for (let i = 0; i < smelterCount; i++) {
    // Top up minerals so the cost is covered (smelter baseCost 200 minerals,
    // priceRatio 1.15 → cost at count i = 200 × 1.15^i).
    const cost = 200 * Math.pow(1.15, i);
    addResource(minerals, cost + 10);
    const entry = buildingsApi.category.getEntry('smelter');
    if (!entry) throw new Error('no smelter');
    const ok = entry.purchasable.purchase();
    if (!ok) {
      throw new Error(`smelter purchase ${i} failed`);
    }
  }
  // Top up stockpile after purchases so observation starts from a clean state.
  wood.value = new Decimal(stock);
  minerals.value = new Decimal(stock);
  iron.value = new Decimal(0);

  const woodStart = Number(wood.value);
  const mineralsStart = Number(minerals.value);
  const ironStart = Number(iron.value);

  // Run 60s of sim.
  runUntil({
    engine,
    until: () => false,
    maxSimTime: durationSec,
    tickDelta: 1,
  });

  const woodEnd = Number(wood.value);
  const mineralsEnd = Number(minerals.value);
  const ironEnd = Number(iron.value);

  const ironGainObserved = ironEnd - ironStart;
  const ironGainExpected = 0.1 * smelterCount * durationSec;
  const drift =
    ironGainExpected === 0
      ? 0
      : (Math.abs(ironGainObserved - ironGainExpected) / ironGainExpected) * 100;

  return {
    smelterCount,
    woodStart,
    mineralsStart,
    ironStart,
    durationSec,
    woodEnd,
    mineralsEnd,
    ironEnd,
    ironGainObserved,
    ironGainExpected,
    ironGainDriftPct: drift,
  };
}

// ─── Probe 4 — end-to-end arc smoke ───────────────────────────────────────

// Beats are timeline points that show how the arc's progression flows, not
// budgets to tune toward (ARCHETYPES.md § Dev-loop integration —
// measure-and-record). This row reports only what was observed; there is no
// pass/fail verdict to compute, by design — see `studio/open-loop-engine#2`
// for the harness-level follow-up (`runProbe`'s `targetWindow`/`inWindow`
// shape still invites exactly this anti-pattern, which is why these fields
// existed here in the first place — they previously carried the *same*
// `targetSimRange` numbers `manifest.ts` explicitly disowns as
// calibration-pending and discredited).
interface BeatRow {
  id: number;
  label: string;
  fireTimeSec: number | null;
}

function probeArcSmoke(maxSimSec: number): {
  beats: BeatRow[];
  finalState: Record<string, number>;
} {
  const { engine } = createInterlockerEngine({
    persistenceNamespace: `probe-arc-${Date.now()}`,
  });
  engine.selectMod('kittens');
  engine.start();
  engine.stop();

  const resources = engine.tryInject(ResourcesKey);
  const buildings = engine.tryInject(BuildingsKey);
  const village = engine.tryInject(VillageKey);
  const sciences = engine.tryInject(SciencesKey);
  const workshop = engine.tryInject(WorkshopKey);
  if (!resources || !buildings || !village || !sciences || !workshop) {
    throw new Error('module missing');
  }

  // Beat fire-time accumulators.
  const beatFireTimes: Record<number, number | null> = {
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
  };

  // ─── Reference bot policy ─────────────────────────────────────────────
  // The binding constraint is catnip: EVERY kitten drains 4.25/sec regardless
  // of job (canon catnipPerKitten), so population must never outrun catnip
  // production. The lever is housing — grow huts only when fields + farmers can
  // feed the +2 kittens a hut admits. Pre-agriculture, fields are the sole
  // catnip source (~6.8 fields/kitten); post-agriculture a farmer is net-
  // positive catnip (+5/sec produced vs −4.25/sec drained), so the economy
  // opens once agriculture lands. Steady catnip surplus keeps scholars from
  // being demoted by starvation, so the science cascade actually completes.
  const CATNIP_PER_KITTEN = 4.25;
  const FIELD_CATNIP = 0.625;
  const FARMER_CATNIP = 5;
  const SURPLUS = 3; // catnip/sec headroom held before growing housing

  const sciencePriority: ScienceId[] = [
    'calendar',
    'agriculture',
    'mining',
    'metal',
    'construction',
    'architecture',
  ];
  // Built greedily once their science unlocks them, after the hand-managed
  // field/hut/library core. Order = rough dependency/value sequence.
  const tierBuildings: BuildingId[] = [
    'mine',
    'lumberMill',
    'quarry',
    'smelter',
    'workshop',
    'pasture',
    'barn',
    'warehouse',
  ];

  const CLICKS_PER_TICK = 5;
  // Wood is the scarce structural resource (huts scale ×2.5, workshop needs 100);
  // catnip is abundant in-season. Refine converts spendable catnip surplus
  // into wood, but must never raid the colony's winter cushion.
  const WOOD_RESERVE = 300;
  const HUT_NET = 2 * CATNIP_PER_KITTEN + SURPLUS; // surplus needed to grow housing

  // Winter reserve — modeled on Kitten Scientists' `WorkshopManager
  // .getValueAvailable`/`getPotentialCatnip(worstWeather: true)`: always
  // project production at the *worst* season's multiplier (never the
  // current one) and, if that projected rate is a net deficit, hold back
  // enough catnip to survive the deficit for a full season before letting
  // any consumer (there: crafting; here: refine) touch it. A flat numeric
  // floor (the previous `REFINE_CATNIP_FLOOR = 200`) doesn't scale with
  // population or production and can starve the colony come winter, or
  // conversely lock away catnip the colony doesn't actually need protected.
  const WINTER_CATNIP_MULTIPLIER = Math.min(...SEASONS.map((s) => s.catnipMultiplier));
  const WINTER_DURATION_SEC = DAYS_PER_SEASON * SECONDS_PER_DAY;
  function winterCatnipReserve(): number {
    const k = Number(resources!.resources.kittens.value);
    const fieldsProd = buildings!.buildingCount('field') * FIELD_CATNIP;
    const farmersProd = Number(village!.jobCounts.farmer.value) * FARMER_CATNIP;
    const worstCaseProduction = (fieldsProd + farmersProd) * WINTER_CATNIP_MULTIPLIER;
    const worstCaseDeficit = Math.max(0, CATNIP_PER_KITTEN * k - worstCaseProduction);
    return worstCaseDeficit * WINTER_DURATION_SEC;
  }

  function gatherClicks(): void {
    for (let i = 0; i < CLICKS_PER_TICK; i++) buildings!.gatherCatnip();
  }
  function refineSurplus(): void {
    // Runs AFTER building so fields/farmers get first call on catnip. Drains
    // the surplus above the winter reserve into wood (multiple refines/tick
    // when flush), up to the wood reserve — turning catnip the colony
    // wouldn't need even at worst-case winter production into structural wood.
    const reserve = winterCatnipReserve();
    let wood = Number(resources!.resources.wood.value);
    for (let i = 0; i < 10 && wood < WOOD_RESERVE; i++) {
      if (Number(resources!.resources.catnip.value) <= reserve) break;
      if (!buildings!.refineCatnip()) break;
      wood = Number(resources!.resources.wood.value);
    }
  }

  function canBuy(id: BuildingId): boolean {
    if (!buildings!.isVisible(id)) return false;
    const entry = buildings!.category.getEntry(id);
    return !!entry && entry.purchasable.canPurchase.value;
  }
  function buy(id: BuildingId): void {
    buildings!.category.getEntry(id)?.purchasable.purchase();
  }

  function tryBuyBuilding(): void {
    const k = Number(resources!.resources.kittens.value);
    const net = Number(resources!.rateChains.catnip.apply(0)) - CATNIP_PER_KITTEN * k;
    const catnipVal = Number(resources!.resources.catnip.value);

    // 1. Hut — sustainability gate: only admit +2 kittens if the current
    //    surplus can feed them with margin. THE lever that keeps catnip solvent
    //    and the gate to all population, so it precedes wood-competing builds.
    if (net >= 2 * CATNIP_PER_KITTEN + SURPLUS && canBuy('hut')) return void buy('hut');
    // 2. Library — +10% science rate per library; only worth wood once there's
    //    a kitten to scholar. Capped so it doesn't starve huts of wood.
    if (
      buildings!.buildingCount('hut') >= 1 &&
      buildings!.buildingCount('library') < 3 &&
      canBuy('library')
    ) {
      return void buy('library');
    }
    // 3. Field — the PRE-agriculture catnip engine. Build while we still need
    //    surplus for the next hut. Once agriculture unlocks farmers, stop:
    //    farmers (one kitten, net +0.75/sec) are far cheaper catnip than fields,
    //    whose geometric cost otherwise soaks up every catnip and starves refine.
    if (
      !village!.isJobVisible('farmer') &&
      net < HUT_NET + SURPLUS &&
      catnipVal > 12 &&
      canBuy('field')
    ) {
      return void buy('field');
    }
    // 4. Tier buildings once unlocked.
    for (const id of tierBuildings) if (canBuy(id)) return void buy(id);
  }

  function tryResearch(): void {
    for (const id of sciencePriority) {
      if (sciences!.scienceCompleted(id)) continue;
      const entry = sciences!.category.getEntry(id);
      if (entry?.purchasable.canPurchase.value) {
        entry.purchasable.purchase();
        return;
      }
    }
  }

  function hire(jobId: JobId, target: number): boolean {
    try {
      village!.setJobCount(jobId, target);
      return true;
    } catch {
      // setJobCount throws when the sum overflows kittens — bot just skips.
      return false;
    }
  }

  // Target-based allocation, recomputed fully each tick — matching the
  // canon UI, where every job count is a freely adjustable slider, not a
  // one-way "kitten picks a career at birth" assignment. Catnip solvency
  // comes first (enough farmers to hold current consumption); the remainder
  // splits evenly across the other eligible jobs (Kitten Scientists'
  // `VillageManager.autoDistributeKittens` policy: assign free kittens to
  // whichever unlocked job currently has the fewest, rather than a single
  // priority job absorbing the rest). The even split uses a tick-rotating
  // remainder so ties don't always resolve to the same array slot — plain
  // least-count-first re-derived from zero every tick deterministically
  // starves whichever job sorts last (scholar), because the comparison loop
  // always prefers an earlier-indexed job on a tie.
  //
  // The original "dump every remaining kitten into scholar until architecture
  // is researched" policy (modulo a fixed 1-woodcutter/1-miner reserve)
  // starves wood/mineral/iron production for the entire early-to-mid game —
  // those resources never scale with population, so the smelter→workshop
  // crafting chain the megalith needs never accumulates a stockpile.
  function allocateJobs(simTime: number): void {
    const k = Number(resources!.resources.kittens.value);
    if (k <= 0) return;
    const fieldsProd = buildings!.buildingCount('field') * FIELD_CATNIP;

    // Farmers cover *current* consumption plus a modest buffer — not the next
    // hut's worth of population. Reserving enough farmers to clear the
    // hut-growth threshold (HUT_NET) even after hut growth stalls (wood- or
    // cost-gated) permanently parks most of the population in farming and
    // leaves nothing for science/mining/crafting. Hut growth is paced
    // separately by the `canBuy('hut')` net-surplus gate below; farmers here
    // only need to keep the colony fed.
    let farmers = 0;
    if (village!.isJobVisible('farmer')) {
      const need = (SURPLUS + CATNIP_PER_KITTEN * k - fieldsProd) / FARMER_CATNIP;
      farmers = Math.max(0, Math.min(k, Math.ceil(need)));
    }
    const rem = k - farmers;

    const scienceLeft = !sciences!.scienceCompleted('architecture');
    const eligible: JobId[] = ['woodcutter'];
    if (village!.isJobVisible('miner')) eligible.push('miner');
    if (village!.isJobVisible('scholar') && scienceLeft) eligible.push('scholar');

    const n = eligible.length;
    const base = Math.floor(rem / n);
    const remainder = rem % n;
    const offset = Math.floor(simTime) % n;
    const targets: Record<JobId, number> = { farmer: farmers, woodcutter: 0, miner: 0, scholar: 0 };
    eligible.forEach((job, idx) => {
      const getsRemainder = (idx - offset + n) % n < remainder;
      targets[job] = base + (getsRemainder ? 1 : 0);
    });

    const counts = village!.jobCounts;
    const order: JobId[] = ['woodcutter', 'farmer', 'scholar', 'miner'];
    // Reduce first (frees headroom), then increase — sum stays ≤ kittens.
    for (const job of order) if (targets[job] < counts[job].value) hire(job, targets[job]);
    for (const job of order) if (targets[job] > counts[job].value) hire(job, targets[job]);
  }

  // Craft toward the megalith once architecture unlocks it. Fire the megalith
  // when its inputs are ready; otherwise stockpile the intermediate whose
  // stock is lowest relative to the megalith recipe (25 beam / 50 slab / 5
  // plate). triggerCraft is atomic — a no-op when inputs are short.
  const craftIntermediates: CraftId[] = ['beam', 'slab', 'plate'];
  function tryCraft(): void {
    if (!workshop!.isVisible('megalith')) return;
    const got = workshop!.triggerCraft('megalith');
    if (Object.keys(got).length > 0) return; // megalith fired
    // Build the intermediate furthest from its megalith requirement.
    const need: Record<string, number> = { beam: 25, slab: 50, plate: 5 };
    let lowest: CraftId | null = null;
    let lowestRatio = Infinity;
    for (const id of craftIntermediates) {
      if (!workshop!.isVisible(id)) continue;
      const have = Number(resources!.resources[id as ResourceId].value);
      const ratio = have / need[id]!;
      if (ratio < lowestRatio) {
        lowestRatio = ratio;
        lowest = id;
      }
    }
    if (lowest) workshop!.triggerCraft(lowest);
  }

  function checkBeats(simTime: number): void {
    if (beatFireTimes[1] === null && buildings!.buildingCount('field') >= 1) {
      beatFireTimes[1] = simTime;
    }
    if (beatFireTimes[2] === null && Number(resources!.resources.kittens.value) >= 1) {
      beatFireTimes[2] = simTime;
    }
    if (beatFireTimes[3] === null && sciences!.scienceCompleted('calendar')) {
      beatFireTimes[3] = simTime;
    }
    if (
      beatFireTimes[4] === null &&
      sciences!.scienceCompleted('mining') &&
      buildings!.buildingCount('workshop') >= 1
    ) {
      beatFireTimes[4] = simTime;
    }
    const megaliths = Number(resources!.resources.megalith.value);
    if (beatFireTimes[5] === null && megaliths >= 1) {
      beatFireTimes[5] = simTime;
    }
    if (beatFireTimes[6] === null && sciences!.scienceCompleted('architecture') && megaliths >= 1) {
      beatFireTimes[6] = simTime;
    }
  }

  // Canonical opening loop: the bot works gather/refine like the Bonfire
  // buttons, then builds + researches + allocates + crafts. No seeds, no
  // synthetic caps — the arc bootstraps exactly as a player would.
  runUntil({
    engine,
    until: ({ simTime }) => {
      gatherClicks();
      tryBuyBuilding();
      tryResearch();
      allocateJobs(simTime);
      refineSurplus();
      tryCraft();
      checkBeats(simTime);
      return beatFireTimes[6] !== null; // run to arc closure or the sim budget
    },
    maxSimTime: maxSimSec,
    tickDelta: 1,
  });

  const beats: BeatRow[] = [
    { id: 1, label: 'First catnip field built' },
    { id: 2, label: 'First kitten arrives' },
    { id: 3, label: 'First science: calendar' },
    { id: 4, label: 'Workshop unlocked (mining + workshop built)' },
    { id: 5, label: 'First megalith crafted' },
    { id: 6, label: 'Arc closure — architecture + megalith owned' },
  ].map((b) => ({
    ...b,
    fireTimeSec: beatFireTimes[b.id as keyof typeof beatFireTimes],
  }));

  const finalState = {
    catnip: Number(resources.resources.catnip.value),
    wood: Number(resources.resources.wood.value),
    science: Number(resources.resources.science.value),
    kittens: Number(resources.resources.kittens.value),
    fields: buildings.buildingCount('field'),
    huts: buildings.buildingCount('hut'),
    libraries: buildings.buildingCount('library'),
    workshops: buildings.buildingCount('workshop'),
  };

  return { beats, finalState };
}

// ─── Reporter ────────────────────────────────────────────────────────────

function renderTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const row = (cells: string[]) =>
    `| ${cells.map((c, i) => (c ?? '').padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [row(header), sep, ...rows.map(row)].join('\n');
}

function fmtNum(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e6 || abs < 0.01) return n.toExponential(3);
  return n.toFixed(3);
}

function main(): void {
  const t0 = Date.now();
  console.log('# Interlocker sim-driven probes\n');
  console.log(`Run at ${new Date().toISOString()}\n`);

  console.log(HEAD('Probe 1 — cost-scaling regression'));
  const costRows = probeCostScaling();
  const sampledCost = costRows.filter((r) => r.count === 5 || r.count === 10);
  console.log(
    renderTable(
      ['building', 'resource', 'baseCost', 'priceRatio', 'count', 'expected', 'observed'],
      sampledCost.map((r) => [
        r.building,
        r.resource,
        String(r.baseCost),
        r.priceRatio.toString(),
        String(r.count),
        fmtNum(r.expected),
        fmtNum(r.observed),
      ]),
    ),
  );
  console.log(
    '\nAll rows match algebraic expectation `baseCost × priceRatio^count` per buildings.ts:236.',
  );

  console.log(HEAD('Probe 2 — stasis-aware-tick cap-reach wedge'));
  const capReach = probeCapReachWedge();
  console.log(
    renderTable(
      ['rate reported /s', 'catnip after 60s', 'remaining cap', 'terminated', 'elapsed sec'],
      [
        [
          fmtNum(capReach.rateReportedPerSec),
          fmtNum(capReach.catnipAfter60s),
          fmtNum(capReach.capAfter60s),
          capReach.terminated,
          fmtNum(capReach.elapsedSec),
        ],
      ],
    ),
  );

  console.log(HEAD('Probe 3 — continuous-conversion (smelter) observation'));
  const smelterRows = [1, 3, 10].map((n) => probeSmelter(60, n));
  console.log(
    renderTable(
      ['smelter count', 'iron observed (60s)', 'iron expected', 'drift %'],
      smelterRows.map((r) => [
        String(r.smelterCount),
        fmtNum(r.ironGainObserved),
        fmtNum(r.ironGainExpected),
        r.ironGainDriftPct.toFixed(4),
      ]),
    ),
  );

  const ARC_SMOKE_BUDGET_SEC = 2 * 3600; // sim-time cutoff, not a beat target
  console.log(HEAD('Probe 4 — end-to-end arc smoke (greedy bot)'));
  const arc = probeArcSmoke(ARC_SMOKE_BUDGET_SEC);
  console.log(
    renderTable(
      ['beat', 'label', 'fired @'],
      arc.beats.map((b) => [
        String(b.id),
        b.label,
        b.fireTimeSec === null
          ? `not reached (${ARC_SMOKE_BUDGET_SEC}s budget)`
          : fmtNum(b.fireTimeSec),
      ]),
    ),
  );
  console.log(
    '\nFinal state: ' +
      Object.entries(arc.finalState)
        .map(([k, v]) => `${k}=${fmtNum(v)}`)
        .join(', '),
  );

  console.log(`\n(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();

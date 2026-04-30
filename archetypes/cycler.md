# Archetype: Cycler

> **One-line identity:** Phase-Alternation + Time Systems + Placement-Adjacency over shared state — build during the calm, survive the pressure, repeat with escalating stakes.
>
> **Status:** `candidate`

**Exemplars (validation, not clone targets):** [Kingdom Two Crowns](../../open-loop-research/analyses/complete/kingdom-two-crowns-analysis.md) (day↔night cadence; shared coin pool; diegetic phase signalling), [Thronefall](../../open-loop-research/analyses/complete/thronefall-analysis.md) (round counter; explicit build/defend labels; highest-rated modern distillation at 94% Steam), [Dome Keeper](../../open-loop-research/analyses/complete/dome-keeper-analysis.md) (dig↔defend; the mine is build space and threat corridor; spatial axis load-bearing). Additional Steam crystallization-cluster evidence in LIBRARY Phase-Alternation exemplars (Kingdom: Classic 2015 as formation moment, The Last Spell, 7 Days to Die, They Are Billions, The Riftbreaker, The King is Watching).

**Live consumer references (engine-usage grounding):** none in the ecosystem today. Cycler is `candidate` because the skeleton's composition-vs-primitive question — can `createLoop` + `createSequencer` + `Grant.when` carry the build/defend modifier-set swap without a dedicated `createPhase` primitive — resolves positively in theory per OL-568, but the first fork is what actually pressure-tests that. Graduation to `canonical` waits on ≥2 real theme passes plus ≥1 `TODO(expansion)` resolution on the parked `createPhaseMachine` sugar (§ 10). Phase-shifter (OL-544) is the cyclical-vs-one-way sibling; the two doc's § 2 paragraphs reciprocate the contrast.

---

## 1. Player experience

Cycler is the archetype of *breathing in and breathing out*. The game divides into two named phases — a calm build phase where you place infrastructure on a shared map and spend what you've earned, and a pressure phase where whatever you built gets tested against an escalating threat. The phases share everything: the same coin pile, the same walls, the same fortress topology. Phase A sets the board; Phase B reveals whether the board holds. The rhythm is cyclical — day becomes night becomes day, round becomes wave becomes round — and each cycle raises the stakes, so Phase A must outpace Phase B's escalation just enough to stay ahead.

A thirty-minute session spans three to six full cycles. The signature moments are the transitions — the sunset, the "wave incoming" countdown, the horn before the assault — and the inspection beats that follow a survived wave ("the east wall held; reinforce the north"). Unlike Producer you are not chasing a central number; unlike Defender you are not committing once to an architecture and watching it auto-resolve; unlike Survivor you are not inside the threat. You are the architect during Phase A and the auditor during Phase B, and the long-term pull is the compounding payoff of shared-state investment: the fortress that survived ten nights is *yours* in a way that no re-rolled run can match. Sessions end when the cycle finally overruns you, or — in campaign-closure variants — when the final wave is cleared and the run-arc closes.

---

## 2. Pattern composition

**Required patterns:**

- [Phase-Alternation](../../open-loop-research/patterns/tier-3-moderate/phase-alternation.md) — the headline pattern. Cyclical build↔defend alternation with shared state across the boundary. LIBRARY Variations 1 (Day/Night Timer), 2 (Round-Timer), 3 (Continuous Build with Wave Interrupt) each map to a `phaseCycleMode` fork. The archetype is named Cycler; the pattern retains its LIBRARY name Phase-Alternation.
- [Activity Systems](../../open-loop-research/patterns/tier-0-universal/activity-systems/) — two distinct Activity variations compose across the phase boundary. Phase A's activity is purchasing + placement; Phase B's activity is either auto-resolve observation (Thronefall, Kingdom) or minimal action-ability use (Dome Keeper's dome-interior shots, The Last Spell's hero actions). The Activity System is phase-aware — dispatchable actions carry a `when: () => phase.value === '<phase>'` gate.
- [Progression Systems](../../open-loop-research/patterns/tier-0-universal/progression-systems.md) — cross-cycle escalation. New enemy types unlock on cycle N, new upgrade tiers unlock on round milestones, new build slots open as the fortress grows. Progression gates are cycle-indexed, not sim-time-indexed.
- [Time Systems](../../open-loop-research/patterns/tier-1-foundation/time-systems.md) — phase timer is a Time Systems primitive. Day length, round length, or wave-interval duration governs both phases; transitions fire as time events.

**Cross-pattern properties engaged:**

- [Modifier Chains](../../open-loop-research/patterns/cross-pattern-properties/modifier-chains.md) — phase-scoped modifier sets. Build-phase income modifiers (gold per farm per day) and defend-phase combat modifiers (archer damage per night) live in separate chains, gated on the `phase` resource. The `Grant.when` mechanism (per OL-568) carries this without a new primitive.
- [Scaling Formulas](../../open-loop-research/patterns/cross-pattern-properties/scaling-formulas.md) — two independent formula families: per-cycle wave HP escalation (Loop 9) and per-building upgrade cost curves. Tuning discipline requires both families stay in scale; imbalance produces either "Phase B is a formality" or "Phase B always wins."
- [Cost Scaling](../../open-loop-research/patterns/cross-pattern-properties/cost-scaling.md) — building placement and upgrade purchase both drive build-phase economic decisions. Cost scaling interacts with cycle-indexed income to create the breathe-then-squeeze tension.
- [Quantity Tracking](../../open-loop-research/patterns/cross-pattern-properties/quantity-tracking.md) — cycles completed, waves cleared, buildings placed, cumulative gold earned. Progression gates predicate on `trackTotal` (cumulative) and current-cycle counters.

**Optional modifiers (fork may add):**

- **Spatial-primary build decisions** — Placement-Adjacency layered within Phase A. Thronefall fortress-layout, Kingdom Two Crowns coin-gathering patrol paths, Dome Keeper dig-path routing. The grid becomes the strategic substrate, not just a backdrop. Most commercially notable Cyclers adopt this; forks that want a simpler build-phase can skip.
- **Per-hero skill accumulation** — The Last Spell pattern. A hero or squad of heroes acquires skills across defend phases; the skill layer composes over the base Phase-Alternation cycle. Adds `createSkillCategory` to the § 3 surface.
- **Macro-campaign closure** — They Are Billions / 7 Days to Die pattern. The cyclical micro-loop nests inside a one-way macro arc — campaign ends, the calendar reaches a final day, the final wave is pre-announced. Toggled by the `endgameMode` structural fork (§ 5); does not convert the archetype to Phase-shifter — the micro-loop remains cyclical, the macro arc is a terminator, not a mode-switch.
- **Challenge-difficulty selectors** — "Ironman," "No Damage," "Permadeath" variants. Per-cycle or per-run challenges accept harder defend-phase conditions for bonus rewards. Composes `createChallengeCategory` on top of the base skeleton; fork-level add.
- **Cross-run prestige** — `prestigeMode: 'run-reset' | 'campaign'` analogous to Defender's shape. Meta-currency banked on run end feeds permanent upgrade nodes. Kingdom Two Crowns' multi-playthrough arc is the canonical example; Thronefall's unlock-roster across runs is a lighter variant.

**Contrast with Phase-shifter (OL-544).** These are two real patterns. Phase-shifter is **one-way** (A → B → C, irreversible; each phase qualitatively new; mode-swap UX replaces mechanics wholesale; A Dark Room, Universal Paperclips, Candy Box 2). Cycler is **cyclical** (A ↔ B ↔ A ↔ B; self-similar cycles; shared state carries across each cycle; timer-driven; Kingdom, Thronefall, Dome Keeper). Phase-shifter's engine posture is a phase-enum `createResource` + latched state-machine transition logic; Cycler's is the same phase-enum `createResource` + a `createSequencer` or `createTimeSystem` driving cyclical oscillation. Several Cyclers carry Phase-shifter-like macro arcs at the campaign scale (They Are Billions' progressive threat toward a campaign end-state; 7 Days to Die's implied endgame); several Phase-shifter games have Cycler-like micro loops within a phase (A Dark Room's day/night fire cadence within Phase 1). The **macro dominant reading determines the archetype filing** — if the arc terminates in a one-way transition that replaces the game's core commitment, it is Phase-shifter; if the core commitment is the cycle itself and macro closure is a terminator on top, it is Cycler. See `open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md` § 3D for the authoritative distinction; `phase-shifter.md` § 2 carries the reciprocal paragraph pointing back here.

**Novel-patterns cluster alignment:** n/a — Cycler is a crystallized composition of LIBRARY-established patterns (Phase-Alternation as the headline, Activity + Progression + Time as constituent tiers). The `novel-patterns-synthesis-v4.md` clusters do not define a novel pattern this archetype composes; Phase-Alternation itself graduated to Tier-3-moderate via OL-563 and is no longer emergent.

---

## 3. Engine surface

| Layer | Primitive | Role in this archetype |
|-------|-----------|------------------------|
| core | `createResource` | Phase-state enum (`phase.value === 'build' \| 'defend'`) + shared cross-phase resources (gold, population, fortress HP, cycle counter). Per OL-568 verified sufficient for shared-state discipline — the shared resource pool is exactly what `createResource` persistent values provide. |
| core | `createModifierChain` | Phase-scoped modifier chains. Build-phase income (gold per farm per day) and defend-phase combat (archer damage per night) live in separate chains; each chain's `Grant` entries carry `when: () => phase.value === '<phase>'`. This is the mechanism the LIBRARY Phase-Alternation pattern's "phase-transition modifier-set swap" resolves into — no dedicated phase primitive needed (OL-568 decision; see § 3 "Refused primitive" below). |
| core | `createMultiplicativeModifier` | Per-cycle escalation multipliers on defend-phase enemy HP and damage; per-cycle income multipliers on build-phase yields. Composes into phase-scoped chains. |
| core | `createAdditiveModifier` | Flat per-building contributions to phase-scoped chains (e.g., each archer tower adds fixed DPS during defend phase). |
| core | `createPolynomialFormula` | Building-cost and upgrade-cost curves. Each cycle raises costs as the fortress grows; wave-HP curves use separate polynomial coefficients. |
| core | `createLoop` | Cycle tracking — the outer cycle counter that fires on every completed build→defend→build round and stores cross-cycle escalation parameters (wave N HP multiplier, income-decay-per-cycle coefficient). |
| core | `createSequencer` | Phase-turn cadence — the primitive that fires the build→defend and defend→build transition events. Also drives wave composition within a defend phase (enemy waves inside a single Phase B, per Thronefall's multi-wave rounds). |
| core | `createTimeSystem` | Day-length and round-length timers for `phaseCycleMode: 'day-night'` and `'round-timer'` variants. The diegetic clock or HUD countdown that makes the transition player-legible. |
| core | `createTimedProgress` | Visible phase-timer displays — the sun-arc in Kingdom, the round-countdown bar in Thronefall, the wave-countdown in Dome Keeper. Renders the time remaining in the current phase as a progress bar; the phase-transition fires from `createSequencer`, not from `createTimedProgress` completion. |
| core | `persistent` | Cross-cycle state retention within a single run (cycle counter, cumulative gold, building-placement state) and — when `prestigeMode !== 'none'` — cross-run meta-progression. |
| systems | `createPurchasableCategory` | Building placement catalogue. Each building is purchasable during `phase === 'build'`; visibility/affordability gates predicate on current gold and cycle-indexed unlocks. |
| systems | `createReset` | Run reset for `prestigeMode === 'run-reset'` or `'campaign'` variants — banks meta-currency, returns to menu. Skeleton with `prestigeMode === 'none'` skips this (Thronefall's minimal unlock-roster fits here). |
| harness | `runHeadless` | Beat-timing sim tests — does the first complete cycle land in target window at default balance, does the first spatial-payoff beat fire within tolerance. |
| harness | `runMatrix` | Robustness probes across phase-duration, wave-HP-curve, and per-cycle-escalation axes. |

**Engine systems explicitly not used (required):**

- `createZoneSystem` — Cycler's spatial axis is a single shared map, not a staged zone progression. Dome Keeper's mine-vs-dome dual zone is a declared-invention fork detail (§ 9), not a skeleton commitment; most Cycler exemplars (Kingdom, Thronefall) are single-canvas.
- `createInventory` — no inventory mechanic in the base skeleton. Forks that layer per-unit equipment (The Last Spell heroes) may add it; the skeleton stays agnostic.
- `createChallengeCategory` — Ironman / No-Damage / Permadeath challenges are an optional-modifier fork, not a skeleton commitment. Adding one does not promote the Challenge pattern into the Cycler's required surface.

**Refused primitive (does not exist, not filed).** The most intuitive fit for Cycler would be a dedicated phase-state primitive — call it createPhase or createPhaseMachine — managing the phase boundary event, firing modifier-set activation, and enforcing shared-state discipline as a first-class concept. OL-568 investigated and decided **zero new primitives**: `createLoop` + `createSequencer` + `Grant.when` + `createResource` covers the modifier-set swap correctly. The declarative sugar is parked as a `TODO(expansion)` near `Grant.when` in `src/core/modifier.ts` per OL-568 § 4.2. This refusal is what makes Cycler's composition stress worth running — the archetype pressure-tests whether the raw `when`-gate path stays ergonomic at real consumer scale. See § 10 for the ergonomics gap this parks. Every primitive named in the § 3 table resolves in `open-loop-engine/docs/api/INDEX.md`.

**Primary stress axes:**

1. **`Grant.when` evaluation at phase-transition boundaries.** A Cycler consumer carries 2–4× the `Grant.when` surface area of a single-mode archetype — every modifier that contributes to only one phase's chain must be gated. The modifier-chain evaluation walks `when` each apply call; the stress is whether this stays correct and efficient with a `phase` resource toggling 3–10 times per minute under peak density.
2. **Shared-state discipline across the transition event.** Fortress HP, gold pool, building-placement state, and cycle counter all must read identically before and after the transition fires. The transition is not a state reset — it is a mode flip. `createResource` persistent values + `createSequencer`-fired phase event must not double-count, drop writes, or desynchronize the `phase` resource from downstream `when` gates.
3. **Cross-cycle escalation parameter storage.** Wave-N HP multipliers, income-decay-per-cycle coefficients, and unlocked-enemy-type sets live in `createLoop`'s cross-cycle state. As cycle-count grows, `createLoop` must expose these parameters to `createSequencer`'s wave-composition logic and to defend-phase modifier chains without leaking per-cycle state or double-applying escalation.
4. **Phase-timer legibility vs transition determinism.** `createTimeSystem` or `createSequencer` drives the transition; `createTimedProgress` displays it. Under offline-progress resumption, the phase-transition event must fire exactly once per cycle boundary even when sim-time jumps by multiple cycles. The debounce discipline lives in `createSequencer`'s configuration, not in the consumer.

---

## 4. Beat map

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 5. Data shape

Cycler's content lives under `src/archetypes/cycler/data/` as flat typed-array exports (`buildings.ts`, `enemies.ts`, `cycles.ts`, `progression.ts`, `themes.ts` if needed) plus a `types.ts` that names the definition interfaces. Inline building-behaviour, enemy-composition, and per-cycle escalation fields colocate with the definitions — no separate effect tables, no codegen. Lens discipline is enforced by comment sections inside each data file (`// ─── Skeleton ───`, `// ─── Balance ───`, `// ─── Costume ───`): skeleton counts (building-archetype count, enemy-archetype count, cycle-escalation-table length, `phaseCycleMode`, `endgameMode`, `prestigeMode`) are fork-of-skeleton decisions; balance constants (phase durations, HP curves, income curves, upgrade multipliers) are the tuning surface sim tests probe; costumes (building names, enemy names, phase-transition flavour copy) are theme-scoped.

```ts
// data/types.ts — typed definitions

export type PhaseId = 'build' | 'defend';

export type PhaseCycleMode =
  | 'day-night'          // diegetic clock — Kingdom, Kingdom Two Crowns, 7 Days to Die
  | 'round-timer'        // explicit round counter — Thronefall, Dome Keeper, Last Spell
  | 'continuous-interrupt'; // soft phase boundary — They Are Billions, Riftbreaker

export type EndgameMode =
  | 'open-ended'         // cyclical-forever until fortress falls — Kingdom Classic, Thronefall free-play
  | 'campaign-closure';  // one-way macro terminator on top of the cyclical micro-loop — They Are Billions, 7 Days to Die

export type PrestigeMode = 'none' | 'run-reset' | 'campaign';

export type BuildingRole = 'income' | 'defense' | 'support' | 'infrastructure';

export interface BuildingDef {
  id: string;                        // stable; used as save key
  name: string;                      // display (costume)
  role: BuildingRole;
  /**
   * Per-phase contribution. A building may be `income`-role active only in
   * Phase A (farms pay out during the day) or `defense`-role active only in
   * Phase B (archer towers fire during the night). `support` and
   * `infrastructure` roles may contribute to both phases via separate
   * modifier-chain entries.
   */
  phaseContribution: {
    build?: { goldPerTick?: DecimalSource; populationBonus?: DecimalSource };
    defend?: { damagePerSec?: DecimalSource; range?: number };
  };
  purchase: {
    baseCost: DecimalSource;         // first-placement cost
    costScaling: DecimalSource;      // per-instance multiplier (1.0 fixed / >1 escalating)
  };
  /** Optional adjacency-aura within N cells. Composes Placement-Adjacency optionally. */
  adjacencyAura?: {
    radius: number;
    buff: { damageMul?: DecimalSource; incomeMul?: DecimalSource; rangeMul?: DecimalSource };
  };
}

export interface EnemyDef {
  id: string;
  name: string;                      // costume
  baseHp: DecimalSource;             // multiplied by cycle-N HP-curve
  baseSpeed: number;                 // cells per second
  /** Cycle index at which this enemy first appears. 0 = available from cycle 1. */
  unlockCycle: number;
  bounty: DecimalSource;             // gold dropped / banked on kill
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  targetBuildingId: string;          // scopes to one building archetype
  tier: 1 | 2 | 3;
  cost: DecimalSource;
  effect: {
    damageMul?: DecimalSource;
    incomeMul?: DecimalSource;
    rangeMul?: DecimalSource;
  };
}

export interface CycleEscalation {
  /**
   * Cycle-indexed HP-curve. Length = max-cycle-count; each element multiplies
   * EnemyDef.baseHp for that cycle's defend phase. `createLoop` reads this
   * at each defend-phase transition.
   */
  hpCurve: DecimalSource[];
  /** Per-cycle enemy composition — enemies + counts in that cycle's waves. */
  waves: Array<{ enemyId: string; count: number; spawnIntervalSec: number }>[];
  /** Starting gold pool at run start. */
  startingGold: DecimalSource;
}

export interface CyclerBalance {
  buildPhaseDurationSec: DecimalSource;      // applies when phaseCycleMode !== 'continuous-interrupt'
  defendPhaseDurationSec: DecimalSource;     // applies when phaseCycleMode !== 'continuous-interrupt'
  perCycleIncomeGrowth: DecimalSource;       // multiplier applied to income per cycle (default 1.05)
  perCycleEnemyHpGrowth: DecimalSource;      // multiplier applied to enemy HP per cycle (default 1.12)
  upgradeCostScaling: DecimalSource;         // tier-N cost multiplier relative to tier-1 (default 2.5)
  adjacencyAuraStack: 'additive' | 'multiplicative';
  campaignClosureCycle?: number;             // only when endgameMode === 'campaign-closure'
}

export interface CyclerProgression {
  /** Structural fork. Editing this changes phase-transition semantics. */
  phaseCycleMode: PhaseCycleMode;
  /** Structural fork. Editing this changes whether the run has a terminator. */
  endgameMode: EndgameMode;
  /** Structural fork. Editing this changes run-lifecycle + meta-persistence. */
  prestigeMode: PrestigeMode;
  metaUpgradeNodeCount: number;              // 0 when prestigeMode === 'none'
}

export interface CyclerData {
  buildings: BuildingDef[];
  enemies: EnemyDef[];
  upgrades: UpgradeDef[];
  cycles: CycleEscalation;
  progression: CyclerProgression;
  balance: CyclerBalance;
}
```

**Override semantics:** `boot.ts` exports `createCyclerEngine(overrides?)` that accepts a flat-category deep-partial — `{ buildings?, enemies?, upgrades?, cycles?, progression?, balance? }` — with per-entity replacement keyed by `id` and deep-merge over balance and progression. Sim tests and workbench perturbation route through this factory. The addressable shape *is* the TypeScript type over the data; there is no synthetic vars layer and no codegen round-trip.

**Archetype code lives in** `src/archetypes/cycler/` as its own colocated tree (`data/`, `modules/`, `composables/`, `ui/`, `sim/`, `boot.ts`). See `open-loop-starter/CLAUDE.md § Archetype convention`.

---

## 6. Balance probes

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 7. Sim assertions

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 8. Content sketch

- **Resources:** 3 — gold (per-run, persistent across cycles, resets on run end when `prestigeMode !== 'none'`); population (per-run, feeds income + defender staffing); fortress HP (per-run, loss condition). Optional 4th: meta-currency (cross-run, `persistent`, only when `prestigeMode !== 'none'`).
- **Producers / Activities (buildings):** 6 building archetypes covering the four roles. Example naming (Day/Night Kingdom theme): farm (income), archer-tower (defense), barracks (support-adjacency), wall-segment (infrastructure), watchtower (support-range), workshop (income-compound). Six is slightly richer than Defender's 4 because Cycler needs both build-phase-active and defend-phase-active kinds; forks compress or expand.
- **Upgrades / Purchasables:** 3 tiers × 6 buildings = 18 building-scoped upgrades. Each binds to one building archetype and stacks into that building's phase-scoped modifier chain.
- **Progression gates:** cycle-indexed unlocks — cycle 3 unlocks tier-2 upgrades; cycle 6 unlocks the last 2 building archetypes; cycle 10 unlocks tier-3 upgrades. Campaign-closure variants set `campaignClosureCycle` between 15 and 25.
- **Enemies:** 5 archetypes — grunt (cycle 1 baseline), armoured (cycle 3, resists physical), fast (cycle 5, high speed / low HP), boss (cycle 8 and every 5 after, large HP pool), elite (cycle 12, mixes multiple resistances). Five is enough to force composition changes across the open-ended arc.
- **Achievements:** 0 in the skeleton — Cycler shares Defender's posture of not using Achievement Systems as a mechanical multiplier. Forks may add cosmetic achievements without touching the mechanical surface.

**Density target:** every beat in § 4 maps to at least one content entry. Beat 1 → first building placed × starting gold. Beat 2 → `createSequencer` phase-transition × first enemies visible in defend phase. Beat 3 → cycle 1 wave-survival × fortress HP readout. Beat 4 → second building type placed with adjacency-aura × visible spatial effect on cycle-2 wave. Beat 5 → tier-2 upgrade unlock (cycle 3) / armoured enemy (cycle 3). Beat 6 → campaign-closure enemy (cycle 15+) OR cycle-10 equilibrium signal for open-ended variants.

---

## 9. UI prescription

- **Primary shell:** `SingleColumnShell` — cites `subgenre-shell-mapping-2026.md § build-defend-cycler (N=3, N_classifiable=3)`. The `build-defend-cycler` sub-genre shows a moderate majority (2/3, 67%) for `single-column`: Kingdom Two Crowns and Thronefall both foreground the spatial substrate as a primarily horizontal or top-down canvas with minimal peripheral chrome. Starter's `SingleColumnShell` is the direct partial fit; the spatial substrate itself (the kingdom, the map) is the shell's main region with HUD chrome (cycle counter, resource readouts, phase-timer) docked top or bottom. Exemplar rows from `layout-audit-2026.md`: Kingdom Two Crowns (single-column, mobile-confirmed iOS/Android 2020), Thronefall (single-column, desktop), Dome Keeper (free-form, desktop).
- **Secondary shell:** `` `declared invention` `` — dual-zone canvas shape per Dome Keeper's `free-form` audit row. Dome Keeper's vertical shaft + separate dome zone registers as `free-form` in the audit because the two zones are spatially distinct but share one vertical canvas; no starter shell captures a two-zone single-canvas layout. Forks following the dig-and-defend pattern (or any variant where build-space and defend-space are spatially distinct but linked) adopt the declared-invention shape. Graduation threshold: two independent Cycler forks sharing dual-zone geometry. Until then, single-zone forks use `SingleColumnShell` and dual-zone forks carry the declared-invention tag with a one-line rationale.
- **Form-factor intent:** `responsive` — cites `layout-audit-2026.md` for Kingdom Two Crowns (`mobile_aware: yes`, form-factor `desktop` in corpus but with documented iOS/Android 2020 port at franchise scale) and Thronefall (`desktop`). The Kingdom franchise established mobile-native Cycler precedent; Dome Keeper and Thronefall anchor the desktop end. Skeleton claim: `responsive` supports both commitments; mobile-first forks adopt Kingdom Two Crowns' mobile-port precedent, desktop-first forks adopt Thronefall's minimal-HUD precedent.
- **ARIA-aligned widgets (lift targets):**
  - `Progress` — phase-timer display (sun arc / round countdown / wave-distance indicator). Cites `widget-vocabulary.md` Layer 1 (frequency 12).
  - `Dialog` — cycle-clear summary, upgrade-tree modal, campaign-complete screen. Cites `widget-vocabulary.md` Layer 1 (frequency 6).
  - `Tooltip` — building stat breakdowns on hover; adjacency-aura previews; enemy-type readouts. Cites `widget-vocabulary.md` Layer 1 (frequency 5).
  - `Toast` — phase-transition notifications, unlock notifications ("new enemy type: Armoured"). Cites `widget-vocabulary.md` Layer 1 (frequency 3).

  Lift from `@/lib` / reka-ui primitives; forks do not reimplement focus, portal, or a11y.
- **Domain widgets (per-fork implementation):**
  - wave counter / wave indicator — persistent HUD readout of current cycle + current wave-within-cycle. Cites `widget-vocabulary.md` Layer 2 (frequency 7; Batch 8 promotion). Cross-archetype widget — Defender and Survivor use it with different label semantics; Cycler's label is ordinal-cycle-plus-intra-cycle-wave.
  - placement grid / fixed slots — building placement surface. Cites `widget-vocabulary.md` Layer 2 (frequency 5; Batch 8 promotion). Thronefall's `building slot indicators` is the canonical Cycler row; Kingdom Two Crowns uses a free-form spatial layout without discrete slots, so this widget is fork-scoped to the `phaseCycleMode === 'round-timer'` family.
  - match HP bar / integrity bar — fortress HP / dome integrity as the primary loss condition. Cites `widget-vocabulary.md` Layer 2 (frequency 4; Batch 8 promotion). Dome Keeper's `dome integrity bar` is the canonical Cycler row.
  - action card / building card — building selection popover during build phase. Cites `widget-vocabulary.md` Layer 2 (frequency 4) — the building card holds name/icon/cost/role/phase-effect summary.

  Per-fork implementation — no pre-abstraction. Lift-first policy (OL-273 Phase 2): placement grid shapes vary meaningfully across Cycler exemplars (Thronefall's building slots vs Dome Keeper's dig-cell grid vs Kingdom Two Crowns' free-form placement), so a shared abstraction would leak assumptions. First two converging forks trigger graduation.
- **Layout detail:** primary canvas fills the majority of screen (kingdom map / fortress top-down / mine-vertical); HUD chrome docks top (cycle counter, resources, phase-timer) or bottom (building picker, fortress HP). Phase-transition overlays (`Dialog` for cycle-clear, `Toast` for phase-shift announcement) stack above the canvas without occluding it. Build-phase building-card popovers appear on build-spot tap/click.
- **Nav pattern:** single-screen in-run; an optional campaign-map / world-map screen sits external to the shell when `endgameMode === 'campaign-closure'` or `prestigeMode === 'campaign'`, typically reached via main-menu or a top-right button.
- **Declared-invention notes:** the secondary-shell dual-zone shape is declared-invention against *starter's 5 shells* — the audit row for Dome Keeper (`free-form`) is the evidence, but none of starter's five shells captures two spatially distinct zones sharing one canvas. Graduation threshold is two independent dual-zone Cycler forks. The primary-shell `SingleColumnShell` is a clean audit-backed majority, not declared-invention; the `build-defend-cycler` sub-genre's N=3 sample clears the ≥3 threshold for preliminary prescription but remains preliminary at this sample size (per `subgenre-shell-mapping-2026.md § Overall Commentary` on Batch 8 new sub-genres).

---

## 10. Predicted engine gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| `createPhaseMachine` declarative sugar | Medium | Per OL-568 decision, zero new primitives — `createLoop` + `createSequencer` + `Grant.when` covers Phase-Alternation correctness. But the consumer-side wiring ceremony ("declare phase resource + fan `when` gates across every phase-scoped modifier + coordinate the `createSequencer` transition fire") is the verbose path a `createPhaseMachine({ phases, transitions, onEnter })` sugar would compress. `TODO(expansion)` parked in `src/core/modifier.ts` near `Grant.when` per OL-568 § 4.2. Severity upgrades to **High** if the first Cycler fork finds the raw `when`-gate path materially verbose (convergent-gap rule: first consumer counts as 1 — but the prediction is strong enough to merit Medium-at-authoring). |
| Cycle-escalation parameter storage ergonomics | Medium | `createLoop` holds cross-cycle state (cycle counter, escalation coefficients, unlocked-enemy-type sets). Reading this into `createSequencer`'s wave-composition logic and into defend-phase modifier chains today means hand-wiring refs through the module. A `createCycleRegistry({ escalationTables, phaseScoped })` helper could unify; defer until a second Cycler fork confirms the pattern. |
| Offline-progress phase-transition debounce | Medium | Under offline resumption (sim-time jumps by multiple cycles), `createSequencer` must fire the phase-transition event exactly once per cycle boundary, not fast-forward all transitions in a single tick. The debounce discipline exists in `createSequencer` configuration; the stress is whether the consumer ceremony to wire it is obvious or requires a knowledge-transfer step. First fork profiles this; a `{ debounce: 'per-cycle' }` shortcut or documentation upgrade may resolve. |
| Diegetic-clock vs HUD-timer mapping | Low | `createTimeSystem` provides the clock, `createTimedProgress` renders it. Kingdom's sun-arc and Thronefall's round-countdown are visually different takes on the same underlying timer; today the consumer rebuilds both against the same primitive pair. A `createPhaseClockVisualizer({ style: 'arc' \| 'bar' \| 'segment' })` helper would compress, but this is a UI-layer concern more than an engine concern. Starter-level widget, not engine. |
| Dual-zone spatial composition | Low | Dome Keeper's mine-vs-dome dual zone is the declared-invention secondary-shell case (§ 9). Engine-wise, this is single `createTimeSystem` + two `createZoneSystem` instances coordinated by phase, and there is no missing primitive — the composition works today. Documented as a boundary case; not a skeleton commitment. |
| Modifier-chain evaluation cost at phase-transition density | Low | At 3–10 phase transitions per minute under peak density (Continuous Build with Wave Interrupt variant), `Grant.when` evaluation per-chain-apply may become noticeable. First Cycler fork profiles; likely still well within engine budget, but worth confirming. |

Convergent-gap rule: N/A — no live consumers yet. All gaps are hypotheses the first fork confirms or rejects. When the first fork lands, `createPhaseMachine` ergonomics is the most likely gap to upgrade to High per the convergent-rule (already flagged Medium in anticipation; upgrades formally only with the second consumer).

---

## 11. Themes

### Theme A — Day/Night Kingdom

- **Hook:** A medieval kingdom; daylight builds the realm, nightfall brings the assault. Coins, walls, archers. Direct Kingdom: Classic / Kingdom Two Crowns lineage. The palette shift and sun-arc phase-timer carry the archetype's legibility.
- **Resource mapping:** gold = coins; population = villagers/archers recruited from campfires; fortress HP = wall integrity; buildings = [farm, archer-tower, barracks, wall, watchtower, workshop]; enemies = [greedling, minion, breeder, lurker, boss-lurker].
- **Narrative framing:** minimal — diegetic flavour only (dusk horn, campfire-muster audio, dawn chorus). The cycle is the story.

### Theme B — Round-Timer Fortress

- **Hook:** A top-down strategic fortress in a stylized realm. Explicit round counter, explicit wave-start button, deliberate fortress-topology decisions. Direct Thronefall lineage; the distilled modern exemplar of the archetype.
- **Resource mapping:** gold = crowns; population = garrison; fortress HP = king's life; buildings = [gold-mine, wall-segment, bow-post, cannon-tower, supply-cart, shield-generator]; enemies = [raider, armoured-raider, scout, siege-engine, warlord].
- **Narrative framing:** light — between-round flavour cards hint at a kingdom being tested; campaign-closure variant ends with "The realm stands."

### Theme C — Deep Mine Defender

- **Hook:** Dig-and-defend. The mine is build area *and* threat corridor. Vertical canvas: dome at top, shaft descending below. Direct Dome Keeper lineage — the dual-zone declared-invention shell secondary is this theme's precedent.
- **Resource mapping:** gold = iron + cobalt + water (three-resource); population = n/a (single keeper); fortress HP = dome integrity; buildings = [drill-upgrade, turret, laser-array, shield-module, auto-pump, reactor]; enemies = [scuttler, winged-alien, armoured-alien, elite, boss-alien].
- **Narrative framing:** minimal — environmental (drill audio, alien screech). Campaign-closure variant: "The rescue arrives on cycle 25."

### Theme D — Orbital Outpost

- **Hook:** A space station at the frontier. Colonisation phase builds modules; raid phase repels incursions. Shared hull topology; `phaseCycleMode === 'round-timer'` by default.
- **Resource mapping:** gold = reactor energy + supply credits; population = crew; fortress HP = hull integrity; buildings = [cargo-bay, kinetic-turret, beam-lance, crew-quarters, shield-projector, drone-bay]; enemies = [asteroid-shard, raider, hive-drone, xenoform, dreadnought].
- **Narrative framing:** light — station-log entries between cycles; campaign-closure variant ends when the relief fleet arrives.

### Theme E — Six-Day Survival

- **Hook:** A survival-crafting settlement. Six-day build stretch followed by a Blood Moon horde night. `phaseCycleMode === 'day-night'` with a long build ratio; direct 7 Days to Die lineage.
- **Resource mapping:** gold = scrap + wood + meat; population = survivors; fortress HP = compound integrity; buildings = [forage-pit, spike-wall, watchtower, trap-cluster, workbench, generator]; enemies = [shambler, feral, radiated, horde-leader, mutated-horde-boss].
- **Narrative framing:** light — between-horde radio broadcasts describe the outside world; `endgameMode === 'open-ended'` by default; prestige variant unlocks harder biomes each run.

---

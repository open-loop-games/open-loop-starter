# Archetype: Survivor

> **One-line identity:** Wave Escalation + Cooldown-Rotation + Run-Scoped Upgrade Tree + Cross-Run Meta — stand inside a continuously escalating threat and respond in real time, run after run.
>
> **Status:** `candidate`

**Exemplars (validation, not clone targets):** [Vampire Survivors](../../open-loop-research/analyses/complete/vampire-survivors-analysis.md), [Brotato](../../open-loop-research/analyses/complete/brotato-analysis.md), [Halls of Torment](../../open-loop-research/analyses/complete/halls-of-torment-analysis.md), [Unnamed Space Idle](../../open-loop-research/analyses/complete/unnamed-space-idle-analysis.md) (partial, Survivor-adjacent idle variant). The Vampire Survivors 2022 release crystallized the modern sub-lineage; Brotato and Halls of Torment corroborate the shape across an 18-month window. Classic arena hold-out predecessors (Marine Arena, MineralZ, WC3 Survival subgenre 2003+) anchor the 23-year lineage but are not direct corpus analogues.

**Live consumer references (engine-usage grounding):** none in the ecosystem today. The first Survivor fork will confirm whether the auto-attack cooldown fan-out and XP-gem pickup surface stay as consumer-layer concerns or graduate to engine primitives (§ 10, convergent-gap rule). Defender (OL-574) is the adjacent-but-distinct archetype; the two share wave escalation but diverge on placement-commitment timing.

---

## 1. Player experience

Survivor is the archetype of *standing inside the threat*. You control a single character on a scrolling arena; enemies pour in from the edges and close toward you; your weapons fire automatically on cooldown and your only direct inputs are movement and per-level-up item choices. The texture of play is continuous reactive positioning — kite the horde, catch the XP gems, turn to feed the oncoming wave into your weapon's firing arc. Every thirty to ninety seconds, a level-up pauses combat and offers three or four item cards; you pick one, then the arena resumes with the threat a little denser and your build a little sharper. The player role is *participant*, not architect.

A thirty-minute session is roughly one complete run. Enemy composition escalates on a minute-mark schedule; by mid-run you are chasing specific weapon-passive pairings that trigger named *evolutions* — qualitative end-states that turn a level-8 base weapon into a distinct, stronger form. The run ends on a timer or on death, and run-earned currency flows into a between-runs shop of permanent bonuses. The long-term pull is the unlock cascade — new characters, weapons, stages, and modifier cards that reshape what future runs can build toward — plus a mechanical compound: each Power-Up makes the next run a little easier, so yesterday's 20-minute death becomes today's 30-minute completion.

---

## 2. Pattern composition

**Required patterns:**

- [Activity Systems](../../open-loop-research/patterns/tier-0-universal/activity-systems/) — auto-attack cadence. Each weapon fires on its own cooldown timer against the current threat set; the cadence is continuous-production, not click-instantaneous, and the threat-set drives per-tick damage resolution. Variation used: continuous production with cooldown gating.
- [Progression Systems](../../open-loop-research/patterns/tier-0-universal/progression-systems.md) — XP-gem level-up ladder + weapon-evolution gating. Levels come from gem collection; each level presents a 3–4 item choice that branches the in-run build tree; evolutions are threshold-gated on (weapon level 8 + specific passive held + chest dropped).
- [Prestige Systems](../../open-loop-research/patterns/tier-1-foundation/prestige-systems.md) — cross-run Power-Up ladder. Gold earned within runs (including failed runs) carries over and compounds into permanent stat multipliers applied to every future run. Variation used: continuous-accumulator — no reset gate on the receiving side, which distinguishes Survivor's Loop 1 surface from Defender's run-end-award model.
- [Loop/Cycle Systems](../../open-loop-research/patterns/tier-4-specialized/loop-mechanics.md) — run boundary with selective persistence. Weapon levels, XP, passives, and HP reset on run end; gold, unlocks, Power-Up levels, and Arcana roster persist. The 30-minute timer (or death) is the cycle boundary.

**Cross-pattern properties engaged:**

- [Modifier Chains](../../open-loop-research/patterns/cross-pattern-properties/modifier-chains.md) — damage resolves as base × weapon-level × passive-stack × character-bonus × Power-Up × Arcana. A mature mid-run build stacks 5–6 factors per weapon; six weapons fire concurrently. This is the archetype's dominant engine stress.
- [Scaling Formulas](../../open-loop-research/patterns/cross-pattern-properties/scaling-formulas.md) — enemy HP and density scale on a minute-mark schedule; XP-curve accelerates early then decelerates past level ~20. Two independent families operate in parallel and must stay in tune.
- [Cost Scaling](../../open-loop-research/patterns/cross-pattern-properties/cost-scaling.md) — Power-Up tier costs scale per level purchased; character and stage unlocks are fixed-threshold gates. The XP-to-level-up curve is also a cost-scaling surface (XP required per next level grows).
- [Quantity Tracking](../../open-loop-research/patterns/cross-pattern-properties/quantity-tracking.md) — per-weapon level (1–8), per-passive level, enemies killed (for unlock conditions), runs completed, gold banked. Many per-entity counters feed gates.

**Optional modifiers (fork may add):**

- **In-run shop variant** (Brotato, Halls of Torment pattern) — replace Vampire Survivors' level-up choice cards with an end-of-wave shop that lets the player spend material currency on discrete item purchases. Same Progression Systems pattern, different pacing of choice moments. `shopMode: 'level-up-cards' | 'wave-shop'` as the structural fork.
- **Arcana / modifier cards** — per-run rule-change cards unlocked by meta-progression milestones. Strategic layer on top of the base skeleton; shifts optimal build priorities. Independent of the shop variant.
- **Character roster** — multiple playable characters, each with a starting weapon and passive bonus, biasing runs toward specific build paths. Extends Progression Systems' unlock-cascade surface.
- **Stage variety** — multiple arena maps with distinct enemy rosters, hazard geometry, and hidden-content conditions. Extends Spatial-as-container without adding Placement-Adjacency.
- **Luck / rerolls / banish** — level-up-pool manipulation via a meta-unlockable currency (Rerolls, Skips, Banishes in Vampire Survivors). Adjusts the variance of the Progression Systems surface without changing its structure.

**Boundary: Survivor ↔ Defender.** Survivor and Defender share wave escalation and a survival framing but diverge on *the timing of placement commitment*. In Defender the player commits tower positions *before* enemies arrive; the board is authored, combat auto-resolves, the player is an architect. In Survivor the player is positioned *inside* the threat and responds in real time without pre-placement; movement and ability use are reactive, the player is a participant. See Defender's § 2 boundary paragraph ([defender.md](./defender.md)) for the reverse citation. Games at the boundary (Dome Keeper's dome-interior sequences; some Halls of Torment room-clear structure; Dota Hold Hero TD builds) are hybrids worth noting in prose rather than forced collapses.

**Novel-patterns cluster alignment:** n/a — Survivor is a composition of established LIBRARY patterns (Activity + Progression + Prestige + Loop/Cycle) rather than a cluster this archetype *defines*. The `novel-patterns-synthesis-v4.md` 12 clusters do not name continuous-threat + ability-rotation + run-upgrade without placement commitment as a distinct novel pattern; OL-575 follow-up #7 files a LIBRARY promotion candidate for Survivor as its own pattern entry once a second independent fork lands.

---

## 3. Engine surface

| Layer | Primitive | Role in this archetype |
|-------|-----------|------------------------|
| core | `createResource` | Player HP (per-run, resets on run end), XP (per-run, resets on level-up), gold (persistent cross-run). |
| core | `createModifierChain` | Per-weapon damage chain: base × weapon-level × passive-stack × character × Power-Up × Arcana. |
| core | `createSequencer` | Wave spawner — minute-mark enemy composition, boss waves, density escalation, the Reaper at run-end. |
| core | `persistent` | Meta-progression retention across runs: gold bank, Power-Up levels, character roster, weapon/stage/Arcana unlocks. |
| systems | `createSkillCategory` | Per-weapon and per-passive level tracks (level 1–8 for weapons; per-tier accumulators for passives). Dual-mode: in-run level-driven for weapons, cross-reset accumulator for meta-skills if a fork extends them. |
| systems | `createSlot` | Fixed-size loadout: 6 weapon slots + 6 passive slots; pick-N-from-M selection from the full pool. |
| systems | `createPurchasableCategory` | Between-runs Power-Up shop; character / weapon / stage unlock purchases via gold. |
| systems | `createAchievementCategory` | Unlock cascade — in-run conditions trigger character, weapon, and stage unlocks (kill 100,000 enemies → Krochi; survive 30:00 on Mad Forest → Red Death; etc.). |
| systems | `createReset` | Run reset — on death or at the 30:00 cap, flush per-run state, bank carry-over gold, return to menu. |
| harness | `runHeadless` | Beat-timing sim tests — does the first evolution land in target window at default balance, does the 30:00 arc complete with a viable build. |
| harness | `runMatrix` | Robustness probes across XP-curve, enemy-HP-curve, and Power-Up-cost axes. |

**Engine systems explicitly not used:** `createZoneSystem` — the arena is a fixed container, not a staged zone progression. Stage variety is a roster of independent arenas selected at run start, not a linear zone unlock chain the player walks through mid-run. `createLoop` — per-weapon cadence comes from `createSequencer` tick schedules on each weapon's cooldown; there is no shared free-running tick loop beyond the sim-time clock. `createChallengeCategory` — optional-difficulty constraints are handled as Arcana cards (`createSlot` selection) or as the Curse Power-Up (`createPurchasableCategory`), not as a first-class Challenge Systems surface.

**Primary stress axes:**

1. **Modifier-chain fan-out at cooldown cadence.** Six weapons firing on independent cooldowns (ranging from ~0.35s to ~1.4s) × 5–6 modifier factors × per-enemy damage resolution against hundreds of concurrent enemies. Chain evaluation must stay correct and cheap as Decimal values under peak density.
2. **Sequencer composition at minute-mark granularity.** Enemy composition changes every 1–2 minutes on a stage schedule (bats → zombies → plants → skeletons → elites → boss → …). The sequencer must advance composition correctly, fire boss waves on exact marks, and land the Reaper spawn at the run-end cap.
3. **Cross-run meta-accumulation under continuous-accrual semantics.** Unlike Defender or classic Prestige, gold accrues during the run and is banked on *any* run end (success or death). Persistence writes fire on sim events, not only on formal run-end; `persistent` must handle the continuous-accumulator pattern without double-counting.
4. **Slot selection under randomized offering pools.** The level-up choice pool is weighted by Luck, filtered by current loadout state (already-owned, already-maxed), and narrows as slots fill. `createSlot` + offering-pool logic must stay correct as the pool shrinks through the run.

---

## 4. Beat map

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 5. Data shape

Survivor's content lives under `src/archetypes/survivor/data/` as flat typed-array exports (`weapons.ts`, `passives.ts`, `enemies.ts`, `stages.ts`, `power-ups.ts`, `evolutions.ts`, `progression.ts`) plus a `types.ts` that names the definition interfaces. Weapon firing behaviour, passive stat deltas, and enemy spawn schedules colocate with their definitions — no separate effect tables, no codegen. Lens discipline is enforced by comment sections inside each data file (`// ─── Skeleton ───`, `// ─── Balance ───`, `// ─── Costume ───`): skeleton counts (weapon-roster size, passive-roster size, stage count, `runMode`, `shopMode`, `prestigeMode`) are fork-of-skeleton decisions; balance constants (XP curve, Power-Up scaling, enemy HP schedule, weapon cooldown defaults) are the tuning surface sim tests probe; costumes (weapon names, enemy names, stage flavour) are theme-scoped.

```ts
// data/types.ts — typed definitions

export type RunMode = 'continuous' | 'round-based';      // VS 30-min continuous vs Brotato discrete waves
export type ShopMode = 'level-up-cards' | 'wave-shop';   // VS offer cards vs Brotato between-wave shop
export type PrestigeMode = 'none' | 'run-reset' | 'continuous-accumulator';

export interface WeaponDef {
  id: string;
  name: string;                                          // costume
  baseDamage: DecimalSource;
  baseCooldownSec: DecimalSource;                        // time between auto-fires at level 1
  /** How the weapon chooses targets and projects damage. */
  firing: {
    pattern: 'arc' | 'projectile' | 'orbital' | 'area' | 'cross';
    projectileCount?: number;                            // level-1 baseline; growth on upgrade
    areaRadius?: number;                                 // for area/orbital patterns
    targeting?: 'nearest' | 'largest-group' | 'fixed-direction';
  };
  /** Per-level growth profile (level 1 → level 8). Any field absent means "no change at that tier." */
  levelGrowth: Partial<Record<
    'damageMul' | 'cooldownMul' | 'projectileBonus' | 'areaMul',
    DecimalSource[]                                      // length 7 (delta from lvl1 → lvl8)
  >>;
  /** Evolution prerequisite: pair with this passive, reach level 8, collect a chest. */
  evolvesInto?: {
    evolvedId: string;                                   // resolves in evolutions.ts
    requiresPassiveId: string;                           // resolves in passives.ts
  };
}

export interface PassiveDef {
  id: string;
  name: string;
  baseEffect: {
    damageMul?: DecimalSource;
    cooldownMul?: DecimalSource;
    hpMul?: DecimalSource;
    luck?: DecimalSource;
    magnetRadius?: DecimalSource;
    /** Extension point — forks add fields here without codegen */
    [custom: string]: DecimalSource | undefined;
  };
  /** Level 1 → level 5 additive stack on baseEffect. */
  maxLevel: number;
}

export interface EvolutionDef {
  id: string;
  name: string;
  baseWeaponId: string;                                  // resolves in weapons.ts
  requiresPassiveId: string;                             // resolves in passives.ts
  /** Evolved firing behaviour — may override pattern, targeting, multiplier curves. */
  firing: WeaponDef['firing'];
  damageMul: DecimalSource;                              // relative to level-8 base weapon
}

export interface EnemyDef {
  id: string;
  name: string;                                          // costume
  baseHp: DecimalSource;                                 // multiplied by stage HP-curve at minute N
  baseSpeed: number;                                     // grid units per second
  xpGemValue: DecimalSource;                             // XP dropped on kill
  goldDropChance: DecimalSource;                         // 0–1 probability
  flying?: boolean;                                      // bypasses some weapon arcs
  boss?: boolean;                                        // marks boss-wave entries; drops chests
}

export interface StageDef {
  id: string;
  name: string;                                          // costume
  /** Enemy-composition schedule keyed by minute-mark. Each entry adds enemies to the spawn pool. */
  waveSchedule: Array<{
    minuteMark: number;
    add: Array<{ enemyId: string; density: number }>;    // density = enemies-per-second at this mark
  }>;
  /** HP multiplier curve by minute. Length = runDurationMinutes; each element multiplies EnemyDef.baseHp. */
  hpCurve: DecimalSource[];
  /** Boss-wave spawn schedule. Each entry fires once at the named minute. */
  bossSchedule: Array<{ minuteMark: number; enemyId: string }>;
  /** Run length in simulated minutes (30 in VS base). */
  runDurationMinutes: number;
}

export interface PowerUpDef {
  id: string;
  name: string;
  description: string;                                   // costume / mechanical flavour
  effect: {
    damageMul?: DecimalSource;
    hpMul?: DecimalSource;
    moveSpeedMul?: DecimalSource;
    xpMul?: DecimalSource;
    goldMul?: DecimalSource;
    luck?: DecimalSource;
    magnetRadius?: DecimalSource;
    rerollsPerLevelUp?: number;
    skipsPerLevelUp?: number;
    banishesPerLevelUp?: number;
  };
  maxLevel: number;                                      // finite (5 in VS base) or Infinity (rerolls)
  /** Per-level gold cost curve. Length = maxLevel when finite; formula when Infinity. */
  costCurve: DecimalSource[] | ((level: number) => DecimalSource);
}

export interface CharacterDef {
  id: string;
  name: string;                                          // costume
  startingWeaponId: string;                              // resolves in weapons.ts
  passiveBonus: Partial<PassiveDef['baseEffect']>;       // flat buff granted at run start
  /** Unlock gate: fixed-threshold predicate evaluated against meta state. */
  unlock: {
    kind: 'default' | 'gold-purchase' | 'in-run-condition';
    goldCost?: DecimalSource;
    conditionId?: string;                                // resolves in achievements.ts
  };
}

export interface SurvivorBalance {
  /** XP required for level N — supports named curves or explicit array. */
  xpCurve: (level: number) => DecimalSource;
  /** Damage-chain order; engine asserts multiplication is commutative but stack order affects rounding. */
  modifierStackOrder: Array<'base' | 'weapon-level' | 'passive' | 'character' | 'power-up' | 'arcana'>;
  /** Luck → offer-pool weighting strength. Higher = rarer items more likely. */
  luckWeight: DecimalSource;
  /** Chest-drop rate per boss kill. */
  chestDropRate: DecimalSource;
  /** Gem magnetism base radius in world units. */
  baseMagnetRadius: DecimalSource;
}

export interface SurvivorProgression {
  /** Structural fork decision. Editing this forks run pacing. */
  runMode: RunMode;
  /** Structural fork decision. Editing this forks the level-up surface. */
  shopMode: ShopMode;
  /** Structural fork decision. 'continuous-accumulator' = VS-style gold persists through failures;
      'run-reset' = classic prestige; 'none' = single-run only. */
  prestigeMode: PrestigeMode;
  /** Weapon-slot cap. 6 in VS; 6 in Brotato. Forks may raise. */
  weaponSlots: number;
  /** Passive-slot cap. Typically matches weaponSlots. */
  passiveSlots: number;
  /** Number of unlock-cascade entries to ship at skeleton density. */
  unlockNodeCount: number;
}

export interface SurvivorData {
  weapons: WeaponDef[];
  passives: PassiveDef[];
  evolutions: EvolutionDef[];
  enemies: EnemyDef[];
  stages: StageDef[];
  powerUps: PowerUpDef[];
  characters: CharacterDef[];
  progression: SurvivorProgression;
  balance: SurvivorBalance;
}
```

**Override semantics:** `boot.ts` exports `createSurvivorEngine(overrides?)` that accepts a flat-category deep-partial — `{ weapons?, passives?, evolutions?, enemies?, stages?, powerUps?, characters?, progression?, balance? }` — with per-entity replacement keyed by `id` and deep-merge over progression and balance. Sim tests and workbench perturbation route through this factory. The addressable shape *is* the TypeScript type over the data; there is no synthetic vars layer and no codegen round-trip.

**Archetype code lives in** `src/archetypes/survivor/` as its own colocated tree (`data/`, `modules/`, `composables/`, `ui/`, `sim/`, `boot.ts`). See `open-loop-starter/CLAUDE.md § Archetype convention`.

---

## 6. Balance probes

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 7. Sim assertions

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 8. Content sketch

- **Resources:** 3 — HP (per-run, resets), XP (per-run, resets on level-up), gold (persistent cross-run). Plus per-run pickup currency (chests, magnet triggers) if the fork adds Brotato-style materials.
- **Weapons:** 8 archetypes — baseline arsenal spanning VS's firing-pattern taxonomy. Example naming (gothic theme): whip (arc), magic wand (homing projectile), garlic (area ring), king-bible (orbital), knife (forward throw), axe (lobbed AoE), cross (boomerang), lightning-ring (area burst). Eight is enough to support 4–5 evolution pairings at skeleton density; VS ships 45+ in base game — forks expand freely.
- **Passives:** 6 archetypes — one per evolution prerequisite slot plus utility. Example: spinach (+damage), empty-tome (-cooldown), bracer (+projectile-speed), candelabrador (+area), pummarola (+regen), attractorb (+magnet-radius). Six matches passive-slot cap.
- **Evolutions:** 5 pairings — each evolution binds one weapon + one passive → evolved weapon. Represents the archetype's primary composition surface at skeleton density.
- **Enemies:** 6 archetypes — grunt (baseline), runner (fast/weak), brute (slow/tanky), swarm (tiny/dense), elite (mid-run difficulty spike), boss (roaming; drops chests). Six forces real mid-run positioning decisions.
- **Stages:** 1 stage with a 30-minute wave schedule by default (Mad Forest baseline). Forks add stages freely; stage roster becomes a meta-progression unlock surface.
- **Power-Ups:** 8 tiles — damage, max-HP, recovery, magnet, move-speed, XP-gain, gold-gain, luck. Eight matches VS's base-game Power-Up roster density.
- **Characters:** 3 in the skeleton — default (balanced), damage-focused, survival-focused. Character as build-seed. Forks expand the roster and bind unlocks to achievements.
- **Unlock cascade:** 10 nodes — 2 stage unlocks, 3 character unlocks, 3 weapon unlocks, 2 Arcana-equivalent unlocks. Each node's trigger resolves in `createAchievementCategory`.
- **Achievements (ornamental):** 0 in the skeleton as mechanical multipliers — the unlock cascade above *is* the archetype's achievement surface. Forks may add cosmetic achievements separately.

**Density target:** every beat in § 4 maps to at least one content entry above. Beat 1 → weapons × enemies × stage wave 0:00. Beat 2 → weapons / passives (choice pool). Beat 3 → weapons (level growth). Beat 4 → evolutions (composition surface). Beat 5 → stage-clear (run-end). Beat 6 → power-ups. Beat 7 → power-ups + characters (compound effect across runs).

---

## 9. UI prescription

- **Primary shell:** `` `declared invention` `` — cites `subgenre-shell-mapping-2026.md § survivor-like (N=3, N_classifiable=2)`. Both classifiable exemplars (Vampire Survivors, Brotato) share a fullscreen-arena-canvas + peripheral-overlay-HUD shape; Halls of Torment lands `ambiguous` but visually matches. N_classifiable=2 is below the N=3 threshold for a named majority, so the sub-genre carries an "insufficient corpus" caveat — but the observed pattern is consistent and the methodology's own commentary tags Survivor alongside Defender as a candidate for declaring a canvas-centric structural primitive rather than forcing one of the existing shell buckets. None of starter's 5 shells (`SidebarMainShell`, `ThreePanelShell`, `SingleColumnShell`, `TabsBarShell`, `MultiColumnShell`) captures that; the audit's `free-form` bucket is consistently `declared invention` against starter today. Exemplar rows from `layout-audit-2026.md`: Vampire Survivors (free-form), Brotato (free-form), Halls of Torment (ambiguous).
- **Secondary shell:** `SingleColumnShell` — the weakest partial fit in starter for forks that want to trade the fullscreen canvas for a stacked HUD (wave timer on top, weapon strip in a band, stats below). No corpus row supports it directly, but it is the closest starter-native shape to the peripheral-HUD reading of the survivor-like layout; treat as a fallback for forks that explicitly decline the canvas-centric declared-invention primitive. `` `declared invention` `` on the secondary prescription as well.
- **Form-factor intent:** `responsive` — cites `layout-audit-2026.md` Brotato (`mobile_aware: yes`, `desktop` form-factor baseline) and Vampire Survivors (`mobile_aware: no` at audit time but commercially confirmed iOS/Android ports with Apple Design Award 2023). The commentary line in `subgenre-shell-mapping-2026.md` ("Archetype prescriptions for mobile-first shapes … will be making declared-invention claims rather than citing corpus majorities") applies: base prescription is responsive to honour the desktop exemplars plus the known mobile-port viability; forks committing mobile-first carry a `` `declared invention` `` flag on that choice.
- **ARIA-aligned widgets (lift targets):**
  - `Dialog` — level-up choice-card modal (pause-gated, 3–4 options). Between-runs menus: character select, Power-Up shop, stage select. Cites `widget-vocabulary.md` Layer 1 (frequency 6).
  - `Progress` — HP bar, XP bar, per-weapon cooldown indicators. Cites `widget-vocabulary.md` Layer 1 (frequency 12).
  - `Tooltip` — weapon + passive stat breakdowns on hover/long-press; evolution prerequisite hints. Cites `widget-vocabulary.md` Layer 1 (frequency 5).
  - `Toast` — pickup notifications (chest drops, Arcana grants, new-unlock flags). Cites `widget-vocabulary.md` Layer 1 (frequency 3).

  Lift from `@/lib` / reka-ui primitives; forks do not reimplement focus, portal, or a11y.
- **Domain widgets (per-fork implementation):**
  - canvas play area — scrolling arena canvas, the game's primary surface. Cites `widget-vocabulary.md` Layer 2 (frequency 14; 14 distinct visual forms across the corpus — no generalizable shape).
  - run timer (fixed-duration hard cap) — persistent HUD countdown/elapsed; primary tension widget for 30-min runs. Cites `widget-vocabulary.md` Layer 2 (frequency 3; Batch 8 promotion, Survivor-archetype-specific).
  - level-up choice cards (3–4 option modal) — the archetype's primary in-run decision surface. Cites `widget-vocabulary.md` Layer 2 (frequency 3; Batch 8 promotion; shared with Auto-battler).
  - weapon/passive inventory strip — icon-only 6+6-slot HUD band showing current loadout. `` `declared invention` `` against `widget-vocabulary.md` Layer 2 — no row; observed in VS bottom strip, Brotato loadout indicator, Halls of Torment cooldown icons, but the corpus has not yet promoted this to a named widget.
  - damage-number feedback — floating numeric text above hit enemies. `` `declared invention` `` against widget-vocabulary; a near-universal survivors-like affordance but not corpus-promoted.
  - XP-gem pickup trail — visual + magnetism particles on the canvas. `` `declared invention` `` — canvas-internal, not a DOM widget, but the visual affordance is load-bearing for the archetype.

  Per-fork implementation — no pre-abstraction. Lift-first policy (OL-273 Phase 2): the three Survivor analyses document distinct HUD layouts (VS bottom strip, Brotato loadout indicator with materials, Halls of Torment cooldown icon row) that resist a shared abstraction. First two converging forks trigger graduation.
- **Layout detail:** canvas or full-viewport play area fills the majority of screen; peripheral HUD sits in the margins — run timer top-right, HP + XP bars top-left, weapon/passive inventory strip bottom (mobile) or bottom-right (desktop). Level-up modal (`Dialog`) overlays full-screen on choice pauses. Between-runs menu is a separate shell-level screen (character select → stage select → Power-Up shop) and may adopt `SingleColumnShell` as a partial-fit for that non-arena screen.
- **Nav pattern:** no in-arena navigation widget. Between-runs screens use an implicit linear flow (menu → character → stage → play → results) rather than a persistent nav shell. Forks that want a meta-hub (a Vampire Survivors-style main menu with columns for Power-Ups / Characters / Stages / Arcana) may layer `TabsBarShell` over the between-runs surface without touching the in-arena canvas.
- **Declared-invention notes:** the canvas-centric primary shell is declared-invention against *starter's 5 shells*, not against the audit corpus — Batch 8 (2026-04-20) added 3 survivor-like rows covering the lineage (see primary-shell line). The sub-genre formally sits below the N=3 threshold for a named majority, but the observed pattern is 100% consistent across classifiable rows and the methodology explicitly flags Survivor as a declared-invention candidate. Graduation threshold: two independent Survivor forks sharing the arena-canvas + peripheral-HUD geometry. The first fork's implementation seeds the conversation about whether `ArenaHUDShell` (or similar) joins `src/lib/shells/`.

---

## 10. Predicted engine gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| Auto-attack-cooldown primitive | Low | Six weapons firing on independent cooldowns is a specific shape of `createSequencer` usage; a dedicated `createAutoAttackSet` helper could compress it. Defer until a second Survivor consumer converges on the same ergonomics per the engine ↔ game co-evolution discipline in `/work/studio/CLAUDE.md`. |
| XP-gem pickup + magnet primitive | Medium | Dense on-canvas pickup collection (hundreds of gems per run, radius-based magnetism, Attractorb-style radius scaling) is canvas-internal logic today. No engine primitive for "radius-gated collection trigger" — consumers build it on top of raw zone queries or per-entity ticks. Predict convergence; do not promote on first fork. |
| Continuous-accumulator meta-currency | Low | Gold persisting through run-end regardless of success/failure is architecturally distinct from run-end-award prestige. Today this lives in `persistent` + consumer-layer event wiring. Watch for whether `createReset` should grow a "carry-through" option vs. leaving it to consumers. |
| Evolution prerequisite graph | Medium | Evolution = (weapon at level 8) + (specific passive held) + (chest collected). Three-part predicate graph with per-pairing bindings. Consumer-layer today; a declarative "recipe" primitive (weapon + passive + trigger → evolved) could compress the evolutions-table wiring but risks over-specialization to this archetype. First fork confirms or rejects. |
| Offer-pool weighting under slot-state filtering | Medium | Level-up choice pool = all candidate items, filtered by already-owned / already-maxed state, weighted by Luck, then sampled. Today this composes `createSlot` + ad-hoc predicate filtering + Luck-as-scaling-formula. A unified `createWeightedOffer(pool, filters, weighting)` helper could reduce boilerplate; defer until the first fork profiles the complexity. |
| Reaper / run-end enforcement semantics | Low | "Unkillable enemy spawns at time T and ends the run on contact" is an unusual run-end trigger vs. HP-depletion-only. `createReset` is the right hook, but the triggering-entity wiring is consumer-side. Noted for parity with classic arena hold-outs (Marine Arena's zerg-infinitum endgame), not a pressing gap. |
| Stage-variety as flat roster vs. zone chain | Low | Survivor stages are a roster (pick one at run start), not a progression chain (`createZoneSystem`). Engine supports both shapes today; noted as a deliberate non-use to contrast with Defender's campaign mode. |

Convergent-gap rule: N/A — no live consumers yet. All gaps are hypotheses the first fork confirms or rejects.

---

## 11. Themes

### Theme A — Gothic Horror

- **Hook:** The canonical Vampire Survivors framing. A lone hunter in a cursed forest beats back waves of the damned with whips, wands, bibles, and holy water.
- **Resource mapping:** HP = vitality; XP = soul-shards; gold = coin; weapons = [whip, magic wand, garlic, king bible, knife, axe, cross, lightning ring]; enemies = [bat, zombie, plant, skeleton, elite-zombie, beholder]; stages = cursed-forest / haunted-library / bell-tower.
- **Narrative framing:** minimal — stage-intro bestiary cards; Reaper at 30:00 as implicit fate.

### Theme B — Cyberpunk Defence

- **Hook:** A rogue netrunner's consciousness holds the line while an autonomous-weapon suite fires back at an intrusion wave. The arena is an abstract data-space; enemies are packets, daemons, and ICE.
- **Resource mapping:** HP = hull integrity; XP = exploit-shards; gold = credits; weapons = [chaff-emitter, homing-worm, EMP-aura, drone-orbit, throwing-knife, plasma-arc, ricochet-blade, chain-lightning]; enemies = [packet-grunt, daemon-runner, ICE-wall, swarm-bot, kernel-elite, black-ICE boss]; stages = commercial-grid / government-mainframe / deepnet.
- **Narrative framing:** light — between-run comms logs from the hacker's runner-crew; stage intros as intrusion briefs.

### Theme C — Kaiju Mecha

- **Hook:** Pilot a giant mecha in a flattened city; you can move but you can't pause the fight. Missiles, railguns, and drone swarms fire automatically at the endless monster horde.
- **Resource mapping:** HP = armor; XP = salvage; gold = research budget; weapons = [chain-gun, missile-pod, railgun, plasma-cutter, flak-drone, ion-orb, shrapnel-burst, scatter-beam]; enemies = [drone-rat, crawler, behemoth, swarmlet, elite-kaiju, leviathan boss]; stages = port district / industrial zone / downtown / harbour.
- **Narrative framing:** medium — pilot radio chatter during runs; command-debrief between runs; stage-4+ unlock reveals the kaiju's origin.

### Theme D — Cozy Harvest

- **Hook:** Defend the farm. A scarecrow, a dog, a broom, and a kettle of enchanted tea hold back waves of pest-spirits. Warm colours; gentle sounds; death sends you back to the kitchen for tea and a restart.
- **Resource mapping:** HP = heart; XP = seeds; gold = jam-jars; weapons = [broom-swing, tea-kettle-steam, honey-aura, pie-lobber, rolling-pin, apple-toss, recipe-book, hearth-spark]; enemies = [aphid, slug, crow, rabbit-troop, garden-gnome elite, harvest-moon-wraith boss]; stages = kitchen-garden / orchard / wildflower-meadow.
- **Narrative framing:** light — journal entries between runs noting the day's harvest.

---

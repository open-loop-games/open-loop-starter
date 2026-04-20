# Archetype: Auto-battler

> **One-line identity:** Placement-Adjacency + Resource Accumulation + Prestige Systems + Loop/Cycle — draft from a shared pool, compose class/trait synergy, and watch the round resolve with zero mid-combat agency.
>
> **Status:** `candidate`

**Exemplars (validation, not clone targets):** [Super Auto Pets](../../open-loop-research/analyses/complete/super-auto-pets-analysis.md) (1D-slot degenerate case with shop/tier-gate canonical form; dual-cover with OL-577 Packer), [Dota Auto Chess](../../open-loop-research/analyses/complete/dota-auto-chess-analysis.md) (January 2019 genre-forming single-point origin; 2D hex grid with shared draft pool + interest economy; 359k all-time concurrent peak in the Dota 2 mod client), [Backpack Battles](../../open-loop-research/analyses/complete/backpack-battles-analysis.md) (shared-substrate sibling — Packer-archetype flagship that ships under the Steam "Auto Battler" tag; included for cross-substrate evidence of the shop + auto-resolve + roguelite-run cluster even though taxonomy § 3A separates it as Packer). Additional commission candidates (prework-recommended, not yet filed): Teamfight Tactics (Riot 2019; post-origin consolidation), Dota Underlords / Hearthstone Battlegrounds (Valve + Blizzard 2019 responses), Mechabellum (2024; counter-synergy variant). Taxonomy § 4 documents the 2019 single-point origin with zero pre-2019 corpus presence across WC3 UMS (101 maps) and Flash-era (45 entries).

**Live consumer references (engine-usage grounding):** none in the ecosystem today. The first Auto-battler fork will confirm whether the shared-pool draft + interest-economy + auto-resolve ceremony stays ergonomic at real consumer scale, or pressure-tests the `grid-placement-auto-resolve` substrate OL-568 parked as `TODO(expansion)` (§ 10). Packer (OL-577) is the shared-substrate-but-distinct sibling; the two docs' § 2 paragraphs reciprocate the contrast per taxonomy § 3A.

---

## 1. Player experience

Auto-battler is the archetype of *front-loaded commitment followed by watched resolution*. Each round opens with a thirty-second prep phase: the shop refreshes five unit offers drawn from a pool you share with seven opponents, and you spend the gold you've accumulated. You buy units — competing against opponents for the same limited supply — position them on your half of the board, and compose a roster whose class and trait tags cross synergy thresholds. You fish for copies to combine-up into higher-tier stars. You decide whether to spend now or hoard gold for the interest bonus at round-end. Then the timer runs out, combat resolves automatically in real time, and you watch. Your units move, attack, and trigger abilities according to whatever rules you composed them for; you cannot intervene. The outcome is the score of a decision you finished making before combat started.

A thirty- to forty-minute session is one full match — eight to twelve rounds, escalating from PvE creep waves through PvP brackets until seven of eight players are eliminated. A full first-completion arc spans one match plus the beginning of a second, so the player sees the compositional surface resolve against opponents *and* feels the meta-progression pull on the follow-up run. The signature moments are the draft-board tensions (the key piece you need was bought by opponent three; do you pivot or reroll?), the synergy-threshold triggers (the third Knight drops and the armour bonus cascades across your line), and the round where your preparation visibly delivered. The long-term pull is the synergy-chart mastery — memorising which tag thresholds stack, which piece orderings counter which compositions, which economic patterns (hoard-for-interest vs level-up-fast) dominate the current patch. The player role is *drafter*, not architect (that's Defender) and not arranger (that's Packer).

---

## 2. Pattern composition

**Required patterns:**

- [Placement-Adjacency](../../open-loop-research/patterns/tier-4-specialized/placement-adjacency.md) — spatial commitment substrate. Battlefield positions determine combat targeting (front-row engages first, back-row enters later), ability range, and some per-unit positional-trigger effects (SAP's "friend ahead / behind" abilities). LIBRARY calls this "shares the `grid-placement-auto-resolve` substrate primitive; parameterises on unit-trait-synergy rather than shape-adjacency-synergy" — the pairs-with note identifies Auto-battler as a secondary consumer of the pattern after Packer. Variation used: 2D grid with cell-position targeting (`gridMode: '2d-hex'` or `'2d-rect'`); SAP degenerates to `'1d-slot'`.
- [Resource Accumulation](../../open-loop-research/patterns/tier-0-universal/activity-systems/) — the interest-bearing gold economy. Gold accumulates round-over-round; unspent gold earns interest (canonically +1 per 10 held up to a cap); round-end spending decisions create the economic meta-game distinct from within-round drafting. The interest mechanic is Auto-battler's most distinctive economic invention — it is not present in Packer, Defender, Survivor, Cycler, or any OL-537 Wave-1 archetype. Activity Systems engage the draft + reroll interactions.
- [Progression Systems](../../open-loop-research/patterns/tier-0-universal/progression-systems.md) — two independent progression families: (a) within-round roster tiers (Tier 1–6 shop gates unlock per turn-count schedule) and (b) combine-up (three copies merge into 2-star, three 2-stars into 3-star). Progression is lateral (which roster combination unlocks which synergy tiers) rather than the single-vertical-ladder shape Producer uses.
- [Prestige Systems](../../open-loop-research/patterns/tier-1-foundation/prestige-systems.md) — cross-match meta progression. Match placement determines trophy / rank / hero-unlock advancement; unlock cascades open new heroes, stages, balance variants, or challenge modes. Variation used: `prestigeMode: 'run-reset'` in the classic PvP-ladder form; `'continuous-accumulator'` in the Super Auto Pets trophy-across-runs variant; `'campaign'` in the Hadean Tactics / Dragon Cliff PvE-roguelike form.
- [Loop/Cycle Systems](../../open-loop-research/patterns/tier-4-specialized/loop-mechanics.md) — match boundary with selective persistence. Within a match, gold + roster + interest reset per-round only on elimination; the match itself is the persistent loop cycle. Across matches, trophy points + unlocks + seasonal cosmetics carry over. The round-timer-gated prep/combat alternation is the inner cycle; the match is the outer cycle; the meta-ladder is the supra-cycle.

**Cross-pattern properties engaged:**

- [Modifier Chains](../../open-loop-research/patterns/cross-pattern-properties/modifier-chains.md) — per-unit damage chain: base × star-tier × item-attachments × trait-synergy × character-bonus × map-effect. A mature mid-match roster stacks 4–6 factors per unit; eight units fire concurrently. This is the archetype's dominant engine stress.
- [Scaling Formulas](../../open-loop-research/patterns/cross-pattern-properties/scaling-formulas.md) — three families operate in parallel: opponent HP per round (sawtooth; varies by pairing), interest-rate compounding (exponential up to cap), and tier-gate unlock curves (step function by round). All three must stay in tune or economic pressure unbalances.
- [Cost Scaling](../../open-loop-research/patterns/cross-pattern-properties/cost-scaling.md) — unit cost scales by tier (1 / 2 / 3 / 4 / 5 gold); reroll cost escalates within a round (1 → 2 → 3 gold); level-up cost scales per target level (4 / 8 / 12 XP gates). Three cost curves against per-round gold income define the economic tension.
- [Purchase Mechanics](../../open-loop-research/patterns/cross-pattern-properties/purchase-mechanics.md) — shop purchase + reroll + freeze + sell-back share the same affordability math at different scales. The sell-back mechanic (partial refund of purchase price + per-star-tier bonus) is load-bearing for pivot plays.
- [Quantity Tracking](../../open-loop-research/patterns/cross-pattern-properties/quantity-tracking.md) — per-unit count (for combine-up), per-trait threshold counter (for synergy activation), per-star-tier accumulator, gold held / spent / interest-earned. Many per-entity counters feed gates.

**Optional modifiers (fork may add):**

- **Shared-pool vs private-pool** — `poolMode: 'shared' | 'private'`. Dota Auto Chess, TFT, Dota Underlords use shared pool (all lobby players draw from the same supply; acquisition is competitive). Super Auto Pets uses private pool (each player's shop generates independently). Load-bearing structural fork: shared-pool requires pool-state synchronisation across the match; private-pool is per-player local state. Keeps Auto-battler shape either way; the SAP form is a 2021 simplification of the DAC origin.
- **PvP vs PvE `combatMode`** — `combatMode: 'pvp' | 'pve' | 'hybrid'`. Original Auto Chess + TFT + Underlords are PvP; Hadean Tactics, Dragon Cliff, and some PvE challenge modes use the same draft/prep/resolve shape against scripted encounters. Mechabellum and SAP have strong PvE modes alongside PvP. Auto-battler is *not* definitionally PvP — the shared commitments are draft + trait/class synergy + round economy + automated combat; opponent source (player snapshot, scripted fight, or both) is a fork axis.
- **Interest economy variants** — `interestMode: 'standard' | 'none' | 'streak-bonuses'`. DAC / TFT use +1 per 10 held up to +5 plus win/loss streak bonuses. SAP uses +1 per 3 held up to +5, no streak component. Mechabellum ships multiple variants across its modes. `interestMode: 'none'` is reserved for PvE-roguelike variants where the gold spine is simpler.
- **Combine-up chain depth** — `combineMode: 'three-tier' | 'two-tier' | 'flat'`. DAC / TFT / Underlords / SAP all use three-copy → 2-star, three-2-stars → 3-star (three-tier). Auto Gladiators and some shorter-match variants cap at 2-star (two-tier). Flat (no combine-up) is a boundary case pushing the archetype toward Tug shape.
- **Deckbuilder-adjacent acquisition** — `acquisitionMode: 'shop' | 'deck-draw' | 'hybrid-shop-draw'`. Storybook Brawl and The Bazaar (2025) layer deckbuilding on top of the shop — cards-drawn-per-round as the primary offer surface rather than a random shop. The Bazaar's early-access positioning explicitly crosses genre lines. These are hybrids, not collapses — the draft + trait synergy + round economy + automated combat commitments remain intact; the acquisition surface swaps from shop to deck.
- **Counter-synergy scoring** — Mechabellum's unit-countering model replaces class/trait *set* bonuses with unit-pair interactions (unit-type A hard-counters unit-type B). A different scoring shape — the synergy function reads pair-wise interactions across the rosters rather than threshold counts within one roster. Optional-modifier scope: forks adding counter-synergy layer it on top of the base trait/class threshold system rather than replacing it; a pure counter-synergy fork sits at the Auto-battler ↔ RTS boundary.

**Boundary: Auto-battler ↔ Packer.** Auto-battler and Packer share the `grid-placement-auto-resolve` substrate (taxonomy § 3A) but are distinct archetypes across three load-bearing axes: acquisition model (shared-pool draft with gold-interest rerolls, creating competitive acquisition, vs crafting from components / drop-based accretion / private shop), synergy model (class/trait membership counted over the roster, activating thresholds regardless of physical cell adjacency, vs shape-and-adjacency geometry where neighbour relationships *are* the trigger), and temporal model (round-timer-gated prep/combat alternation with an interest-bearing economy between rounds vs craft-then-deploy, often wave-paced rather than round-timed). Their historical lineages are fully disjoint: Auto-battler was nonexistent before January 2019's Dota Auto Chess single-point origin (taxonomy § 4; zero hits across 101 WC3 UMS maps + 45 Flash-era entries); Packer traces 22 continuous years from Gem TD (WC3 ~2003) through Backpack Battles (Steam 2025). Two genres that predate each other's existence by 16 years are not variants of the same idea. Super Auto Pets sits at the boundary — its shop/tier-gate/interest economy is Auto-battler-native *and* its 1D slot-ordering is a degenerate Packer spatial case; both archetypes cite it legitimately with clearly-labelled subsections (SAP analysis §§ "5-Slot Team as 1D Grid" / "Shop Phase + Combat Phase Alternation"). See `open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md` § 3A for the authoritative separation argument; `packer.md` § 2 carries the reciprocal paragraph pointing back here.

**Novel-patterns cluster alignment:** n/a — Auto-battler is a crystallised composition of LIBRARY-established patterns (Placement-Adjacency as the grid substrate, plus Resource Accumulation + Progression + Prestige + Loop/Cycle as constituent tiers). The `novel-patterns-synthesis-v4.md` clusters do not name draft + trait-synergy + round-timer-alternation as a distinct novel pattern — the synthesis does cite the 2019 genre-formation event but frames it as consolidation of existing patterns into a new commercial cluster rather than as a novel pattern of its own. Follow-up (#1): once a second independent Auto-battler fork lands, consider a LIBRARY promotion candidate for the Auto-battler *economic pattern* (interest-bearing round economy with shared-pool draft) as a distinct Tier-3-or-4 entry — the interest economy alone has no LIBRARY home today.

---

## 3. Engine surface

| Layer | Primitive | Role in this archetype |
|-------|-----------|------------------------|
| core | `createResource` | Gold (per-match, interest-bearing, resets on match end); player HP (per-match, elimination threshold); per-trait threshold counters (reactive, derived from roster); match round counter. |
| core | `createModifierChain` | Per-unit damage chain: base × star-tier × item-attachments × trait-synergy-bonus × character-bonus × map-effect. Synergy thresholds activate modifier entries dynamically as roster composition changes. |
| core | `createAdditiveModifier` | Per-trait flat bonuses (e.g., "3 Warriors grants +10 armor to all Warriors"). |
| core | `createMultiplicativeModifier` | Star-tier multipliers and unique synergy effects that compound (e.g., "6 Mages grants +50% spell amplification"). |
| core | `createSequencer` | Round-timer progression; PvE creep wave composition on schedule; combat-tick resolution during the auto-resolve phase. |
| core | `persistent` | Cross-match meta state: trophy points, hero roster unlocks, cosmetics, seasonal progression. |
| core | `createPolynomialFormula` | Gold-income curves; interest cap formulas; per-round HP-damage-on-loss curves; combine-up XP gates. |
| systems | `createSpatialGrid` | Battlefield topology — 2D hex (DAC), 2D rect (TFT, Underlords), or 1D slot (SAP degenerate). Stores unit cell occupancy; reads for combat targeting, ability range, and position-conditional triggers. The structural half of the `grid-placement-auto-resolve` substrate per OL-568 verification. |
| systems | `createSlot` | `gridMode: '1d-slot'` variants — SAP's 5-slot team row, pet benches in mobile-variant Auto-battler forks. Also models the staging bench (off-board unit pool between prep and combat) regardless of `gridMode`. |
| systems | `createPurchasable` + `createPurchasableCategory` | Shop unit catalogue (per-tier pools); reroll as a purchasable cost-escalating purchase; freeze slot as a zero-cost state toggle; sell-back as a refund-generating purchasable. |
| systems | `createSkillCategory` | Per-unit star-tier accumulator (XP = copies collected; thresholds at 2 XP → 2-star, 5 XP → 3-star); per-item-attachment accumulator when items compose. Dual-mode: in-match copy-collection (within-match), cross-match meta-skills (between-match) when `prestigeMode === 'campaign'`. |
| systems | `createLoop` | Match-cycle counter — the outer cycle that fires on match completion and tracks cross-match state + meta-currency accrual. Round-to-round within a match is handled by `createSequencer`; the match boundary is the `createLoop` cycle. |
| systems | `createReset` | Match reset — on elimination or match completion, flush per-match state (gold, roster, interest), bank carry-over trophy / meta-currency, return to menu. |
| systems | `createAchievementCategory` | Unlock cascade — in-match conditions (win with 6 Warriors trait / survive to round 15 / reach 3-star unit) trigger hero / item-pool / stage-roster / challenge unlocks. The cascade *is* the archetype's achievement surface. |
| systems | `createChallengeCategory` | Optional weekly / seeded / hero-locked challenges (TFT rotating game-modes; SAP weekly-pack rotation; Mechabellum operation modes). Composes on top of the base skeleton; fork-level add. |
| systems | `createZoneSystem` | Only required when `combatMode === 'campaign'` and the fork uses a stage-progression surface (Hadean Tactics node-map; Dragon Cliff stage chain). Classic PvP-ladder variants skip. |
| harness | `runHeadless` | Beat-timing sim tests — does the first combat land at target round, does the first synergy threshold trigger in the target window, does the first combine-up land within tolerance. |
| harness | `runMatrix` | Robustness probes across interest-rate, tier-gate-schedule, and synergy-threshold-magnitude axes. |

**Engine systems explicitly not used (required):**

- `createInventory` — Auto-battler's acquisition surface is the shop, not an inventory. Units enter the roster directly via purchase and live on the battlefield grid + staging bench (`createSpatialGrid` + `createSlot`); there is no intermediate item-container with 2D footprints. Forks that add per-unit item-equipment (TFT's item system) may layer a lightweight inventory per unit, but the archetype's roster surface itself is not inventory-shaped. Contrast with Packer, which uses `createInventory` for Backpack-shaped variants.
- `createRetentionPolicy` — cross-match persistence lives in `persistent` refs with explicit carry-over rules (trophy / unlocks accumulate, gold / roster / interest reset). A declarative retention policy could compress the interest-carry-over logic within a match; noted as a potential gap (§ 10). Cross-match retention is simple enough that the primitive would be overkill.
- `createTimeSystem` — round-timer pacing comes from `createSequencer` firing at fixed round-end boundaries, not from a free-running clock. `createTimedProgress` renders the round timer as a UI affordance; the transition itself fires from `createSequencer` completion. Forks wanting diegetic-clock flavour may layer `createTimeSystem` on top without touching the skeleton.

**Refused primitive (does not exist, not filed).** The most intuitive fit for Auto-battler would be a dedicated grid-placement-auto-resolve primitive — call it createPlacementResolver or createGridSystem — taking a grid, a synergy-scoring function, and a round-phase hook, and emitting a bonus map on each resolve. OL-568 investigated and decided **zero new primitives**: `createSpatialGrid` + `createSlot` cover the structural grid half (with `gridMode: '1d-slot'` the degenerate case of a 1-row `createSpatialGrid` or equivalently a pure `createSlot` sequence), and the synergy-scoring function stays as pure consumer-side code (the Auto-battler parameterisation reads trait-membership thresholds rather than Moore-neighbourhood same-type counts — a different computation shape from Packer's, per OL-568 § 3.1). The refused primitive is parked as a `TODO(expansion)` marker at two call-sites (`open-loop-engine/src/core/spatial/grid.ts` near `createSpatialGrid`, and `open-loop-engine/src/systems/inventory.ts` near `createInventory` — the latter for the Packer branch, not Auto-battler's) per OL-568 § 3.3. Zero current engine consumers exist for either Auto-battler or Packer; the extraction forcing function waits for two independent hand-rolled wrappers to converge. Packer (OL-577) refuses the same primitive under its own shape-adjacency parameterisation; see `packer.md` § 3 for the twin refusal. Every primitive named in the § 3 table resolves in `open-loop-engine/docs/api/INDEX.md`.

**Primary stress axes:**

1. **Trait-threshold reactivity under roster mutation.** Every purchase, sell, combine-up, and round-end-death changes the active trait counts, and every threshold crossing (2 / 4 / 6 counts) activates or deactivates a synergy-bonus entry in every affected unit's modifier chain. `createSkillCategory` per-trait counters + `createModifierChain` threshold-gated entries must stay correct across dozens of mutations per prep phase without double-activating or missing edge-case boundaries.
2. **Shared draft-pool state synchronisation.** `poolMode: 'shared'` variants track pool state across eight players: each pool-tier has a finite copy count; purchases, sells-on-death, and eliminations return copies; each player's shop draws 5 offers from the remaining pool per round. The pool-state resource must report accurate remaining counts to each player's shop-refresh logic without race conditions, and sold/dead units must return correctly on the frame they leave the match.
3. **Interest-economy compounding under round-boundary timing.** Interest applies at round-end on unspent gold (e.g., +1 per 10 held, cap +5); round-end coincides with combat-start, but interest accrues *before* the round actually transitions so the player sees it reflected in next-round's opening balance. The timing discipline is in `createSequencer` round-end hooks feeding `createResource` income; offline-resumption (if the fork supports it) must fire interest exactly once per round-boundary.
4. **Combat-resolve determinism.** Once the prep timer expires, combat must resolve deterministically from the pre-combat state — same grid + same roster + same items + same opponent = same outcome. Any stochastic resolution (crit rolls, proc chances) must be seeded from match-state so rematches and replays are reproducible. `createSpatialGrid` motion ticks + `createModifierChain` damage resolution + RNG seeding must compose into a deterministic pipeline under `createSequencer`'s tick cadence.

---

## 4. Beat map

The 1–2h arc covers one full match (roughly 30–45 min across 8–15 rounds) plus the first portion of a second match, so the player sees the compositional surface resolve *and* feels the meta-progression compound. Dota Auto Chess's 35–45 min single-match and Super Auto Pets' ~25–35 min 12-turn match both compress to a skeleton that lands the first draft at 0:15, the first synergy threshold at ~6 min, the first match completion at 25–45 min, and arc closure (second match first-combat landing faster than first match's did) at 60–90 min.

| # | Beat | Target sim-time | Trigger condition | Player-visible signal | Why it matters |
|---|------|-----------------|-------------------|------------------------|-----------------|
| 1 | First unit drafted | 0:00–0:30 | `roster.count >= 1` | Purchased unit appears in staging / board; gold reduced | Onboarding — validates shop purchase + roster state + `createPurchasableCategory` plumbing |
| 2 | First combat round resolves | 0:30–2:00 | `rounds.cleared >= 1` | Combat animation plays; win/loss signal; HP damage (on loss) or opponent-HP-damage (on win); gold awarded | Validates the shop → prep → combat → resolve cycle + `createSequencer` round-timer wiring |
| 3 | First synergy threshold crosses | 3:00–8:00 | `traits.anyAtThreshold >= 1` | Synergy panel lights up; active-synergy readout visible; affected units' chain picks up threshold modifier | The archetype's signature moment — composition produced a measurable synergy bonus. Validates `createSkillCategory` threshold counters + `createModifierChain` dynamic composition |
| 4 | First combine-up fires | 5:00–12:00 | `units.anyAtStar >= 2` | Three-copy merge animation; 2-star unit visible; unit's damage chain updated with star-tier multiplier | Validates Progression Systems combine-up — the second power-scaling vertical beyond within-round drafting. Threshold for compositional escalation |
| 5 | First interest payout lands | 6:00–10:00 | `gold.interestEarnedThisMatch >= 1` | Round-end gold readout shows base income + "+N interest" line item | Validates the distinguishing economic mechanic — interest-bearing round economy (the Auto-battler-defining invention absent in all OL-537 Wave-1 archetypes). First exposure to the hoard-vs-spend meta-tension |
| 6 | First match completion | 25:00–45:00 | `match.ended` | Match-end screen with placement / trophy award / meta-currency bank; return to main menu | Validates the full match arc: all 8–15 rounds fire correctly, elimination or round-cap closes the match, trophy / meta-currency banks cross-match. Arc closure for `prestigeMode === 'none'` forks |
| 7 | First optimised second match — visible meta-compound | 45:00–90:00 total | `matchesCompleted >= 2 AND secondMatchFirstSynergyTime < firstMatchFirstSynergyTime` OR (second match has at least one meta-unlocked hero / item / challenge available that the first did not) | Second match hits beat 3 faster than first match did, OR hero-select shows a newly unlocked option, OR item pool includes a new unlock | The archetype's long-term pull: meta-progression compounds across matches. Arc closure for `prestigeMode !== 'none'` forks |

**Arc closure beat:** #7 when `prestigeMode !== 'none'`, #6 when `prestigeMode === 'none'`. Bimodal closure precedent from Tug (OL-573, beat 7), Defender (OL-574, beat 6 or beat 4), Survivor (OL-575, beat 7 or beat 4), Cycler (OL-576, beat 6 bimodal on `endgameMode`), and Packer (OL-577, beat 7 bimodal on `prestigeMode`). Auto-battler's bimodal axis is `prestigeMode` — matching Survivor and Packer's precedents rather than Cycler's orthogonal `endgameMode` axis.

---

## 5. Data shape

Auto-battler's content lives under `src/archetypes/auto-battler/data/` as flat typed-array exports (`units.ts`, `synergies.ts`, `shop.ts`, `rounds.ts`, `progression.ts`) plus a `types.ts` that names the definition interfaces. Unit tag lists, synergy threshold tables, shop-tier schedules, and per-round gold/HP curves colocate with their definitions — no separate effect tables, no codegen. Lens discipline is enforced by comment sections inside each data file (`// ─── Skeleton ───`, `// ─── Balance ───`, `// ─── Costume ───`): skeleton counts (unit roster size, synergy family count, `gridMode`, `poolMode`, `combatMode`, `prestigeMode`) are fork-of-skeleton decisions; balance constants (interest-rate schedule, tier-gate unlock rounds, synergy-threshold bonuses, HP-damage-on-loss curve) are the tuning surface sim tests probe; costumes (unit names, trait labels, flavour copy) are theme-scoped.

```ts
// data/types.ts — typed definitions

export type GridMode =
  | '2d-hex'             // Dota Auto Chess origin geometry
  | '2d-rect'            // TFT, Dota Underlords, Teamfight Manager, Mechabellum
  | '1d-slot';           // Super Auto Pets degenerate case

export type PoolMode =
  | 'shared'             // DAC / TFT / Underlords — competitive acquisition from one pool
  | 'private';           // SAP / Mechabellum single-player — per-player independent shops

export type CombatMode =
  | 'pvp'                // default — player-vs-player bracket
  | 'pve'                // Hadean Tactics / Dragon Cliff — scripted encounters
  | 'hybrid';            // Original DAC (PvE creep interrupts), Mechabellum campaign

export type InterestMode = 'standard' | 'streak-bonuses' | 'none';

export type CombineMode = 'three-tier' | 'two-tier' | 'flat';

export type PrestigeMode = 'none' | 'run-reset' | 'continuous-accumulator' | 'campaign';

export type AcquisitionMode = 'shop' | 'deck-draw' | 'hybrid-shop-draw';

export interface UnitDef {
  id: string;                               // stable; used as save key
  name: string;                             // display (costume)
  /** Shop tier (1–6). Determines pool weighting and cost. */
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  /** Pool cost in gold at purchase; typically equals tier. */
  baseCost: DecimalSource;
  /** Species / class / trait tags — every unit carries 1–3 tags. Synergy thresholds count these. */
  tags: string[];
  /** Base combat stats at 1-star. 2-star and 3-star scale via star-tier multiplier. */
  baseStats: {
    hp: DecimalSource;
    attackDamage: DecimalSource;
    attackSpeed: DecimalSource;              // attacks per second
    abilityCost?: DecimalSource;             // mana / cooldown required to fire ability
    range?: number;                          // cells (grid units)
  };
  /** On-trigger ability — fires when abilityCost is met. Trigger vocabulary is the genre's "trigger taxonomy." */
  ability?: {
    trigger: 'on-attack' | 'on-hurt' | 'on-kill' | 'on-friend-summoned' | 'on-sell' | 'at-round-start';
    effect: { damage?: DecimalSource; heal?: DecimalSource; summon?: string; buff?: Partial<UnitDef['baseStats']> };
    /** Target mode for non-self abilities. */
    target?: 'self' | 'friend-ahead' | 'friend-behind' | 'random-friend' | 'random-enemy' | 'all-friends' | 'all-enemies';
  };
  /** Combine-up: copies-to-star-2 / star-2-copies-to-star-3. Typically [3, 3]. */
  combineRule?: {
    copiesToStar2: number;
    starsToStar3: number;
    /** Per-star damage multiplier. Length 3. [1.0, 2.0, 3.5] is the canonical curve. */
    starMultiplier: DecimalSource[];
  };
}

export interface SynergyDef {
  /** Tag (species / class) this synergy counts. */
  tag: string;
  /** Activation thresholds + effects at each threshold. Sorted ascending by count. */
  thresholds: Array<{
    count: number;                          // activation count (e.g., 2, 4, 6)
    /** Effect applied to all units carrying this tag. */
    effect: { damageMul?: DecimalSource; hpMul?: DecimalSource; armor?: DecimalSource; attackSpeedMul?: DecimalSource };
    /** Optional unique effect applied to all friendly units. */
    globalEffect?: { damageMul?: DecimalSource; hpMul?: DecimalSource };
  }>;
}

export interface ShopConfig {
  /** Shop offer count per round by shop tier. DAC/TFT baseline is 5; SAP scales 3→6 by tier. */
  slotsPerTier: number[];                   // indexed by shop tier; length = max shop tier
  /** Reroll cost (constant in most variants; some escalate within a round). */
  rerollCost: DecimalSource;
  /** Within-round reroll escalation (if any). Backpack Battles: [1, 2, 3]. DAC: constant [2]. */
  rerollCostSchedule?: DecimalSource[];
  /** Sell-back value as fraction of purchase price + per-star-tier bonus. */
  sellValueFraction: DecimalSource;         // default 0.5
  sellStarBonus: DecimalSource;             // additional gold per star above 1
  /** Level-up cost = XP required to field N+1 units. */
  levelUpXpGates: number[];                 // length = max player-level; XP to reach level N
  /** Pool depth by unit tier. Applies to poolMode: 'shared'; ignored for 'private'. */
  sharedPoolDepthByTier?: number[];         // [tier 1 copies, tier 2 copies, …]
}

export interface InterestConfig {
  mode: InterestMode;
  /** Interest rate: +1 gold per N gold held; ignored when mode === 'none'. */
  goldPerInterestUnit: DecimalSource;       // canonical: 10 (DAC/TFT); SAP uses 3
  /** Max interest per round. */
  cap: DecimalSource;                       // canonical: 5
  /** Win-streak bonus schedule; only consulted when mode === 'streak-bonuses'. */
  winStreakSchedule?: DecimalSource[];      // [2-streak: +1, 5-streak: +2, ...]
  lossStreakSchedule?: DecimalSource[];
}

export interface RoundEscalation {
  /**
   * Round-indexed HP-damage-on-loss curve. Length = max-match-round-count.
   * Each element is the HP cost when losing round N (typically scales with round).
   */
  hpDamagePerRound: DecimalSource[];
  /** Per-round gold income base (before interest). */
  goldPerRound: DecimalSource[];
  /** Starting player HP. */
  startingHp: DecimalSource;
  /** Starting gold. Typically 0 or a small opening pool. */
  startingGold: DecimalSource;
  /**
   * Round schedule — PvE creep / PvP / boss flags per round.
   * E.g., [{ round: 1, type: 'pve' }, { round: 4, type: 'pvp' }, ...].
   */
  roundTypeSchedule: Array<{ round: number; type: 'pve' | 'pvp' | 'boss' }>;
  /** Prep-phase duration (seconds). Typically 30s; shortens or lengthens by fork. */
  prepDurationSec: DecimalSource;
  /** Combat-phase soft cap (seconds) — combat ends if this elapses without a winner. */
  combatSoftCapSec: DecimalSource;
}

export interface AutoBattlerBalance {
  /** Star-tier multiplier curve. Default [1.0, 2.0, 3.5] — 1-star, 2-star, 3-star. */
  starMultiplier: DecimalSource[];
  /** Max player level. Gates the unit-count field limit. Canonical: 10 (DAC). */
  maxPlayerLevel: number;
  /** Max shop tier. Gates unit-pool availability. Canonical: 6. */
  maxShopTier: number;
  /** Shop-tier unlock schedule — what player-level unlocks shop tier K. */
  shopTierUnlockLevel: number[];            // length = maxShopTier
  /** Elimination HP threshold. Typically 0. */
  eliminationHp: DecimalSource;
}

export interface AutoBattlerProgression {
  /** Structural fork. Grid topology. */
  gridMode: GridMode;
  /** Structural fork. Pool-sharing behaviour. */
  poolMode: PoolMode;
  /** Structural fork. Opponent source. */
  combatMode: CombatMode;
  /** Structural fork. Combine-up chain depth. */
  combineMode: CombineMode;
  /** Structural fork. Acquisition surface. */
  acquisitionMode: AcquisitionMode;
  /** Structural fork. Meta-persistence kind. */
  prestigeMode: PrestigeMode;
  /** Meta-unlock node count. 0 when prestigeMode === 'none'. */
  metaUnlockNodeCount: number;
  /** Hero / character roster size. 1 when fork ships without hero selection. */
  heroCount: number;
}

export interface AutoBattlerData {
  units: UnitDef[];
  synergies: SynergyDef[];
  shop: ShopConfig;
  interest: InterestConfig;
  rounds: RoundEscalation;
  progression: AutoBattlerProgression;
  balance: AutoBattlerBalance;
}
```

**Override semantics:** `boot.ts` exports `createAutoBattlerEngine(overrides?)` that accepts a flat-category deep-partial — `{ units?, synergies?, shop?, interest?, rounds?, progression?, balance? }` — with per-entity replacement keyed by `id` (units, synergies) or by tag (synergies) and deep-merge over shop / interest / rounds / progression / balance. Sim tests and workbench perturbation route through this factory. The addressable shape *is* the TypeScript type over the data; there is no synthetic vars layer and no codegen round-trip.

**Archetype code lives in** `src/archetypes/auto-battler/` as its own colocated tree (`data/`, `modules/`, `composables/`, `ui/`, `sim/`, `boot.ts`). See `open-loop-starter/CLAUDE.md § Archetype convention`.

---

## 6. Balance probes

| Probe | Perturbation | Target beat(s) | Tolerance | Rationale |
|-------|--------------|----------------|-----------|-----------|
| `tier-gate-schedule` | `balance.shopTierUnlockLevel` ×[0.8, 1.3] step (earlier / later tier unlocks) | 3, 4, 6 | Beat sim-time ±20% | Tier-gate pacing is the archetype's dominant escalation lever — too early and late-round units trivialise mid-round combats; too late and matches resolve on tier-1 stat-stacks with no composition depth |
| `interest-rate-schedule` | `interest.goldPerInterestUnit` ×[0.67, 1.5] AND `interest.cap` ×[0.5, 1.5] | 5, 6, 7 | Beat 5 sim-time ±30%; beat 6/7 sim-time ±20% | Interest is the archetype's distinguishing economic mechanic; probe ensures the hoard-vs-spend tension stays material. 0.5× cap collapses econ to irrelevance; 2× cap dominates strategy |
| `synergy-threshold-bonus` | `synergies[*].thresholds[*].effect.damageMul` ×[0.80, 1.20] | 3, 6 | Beat sim-time ±20% | Synergy magnitude is the archetype's signature power-scaling axis. Too weak and players ignore trait composition; too strong and 6-Warriors becomes a one-trick meta |
| `combine-up-copy-curve` | `units[*].combineRule.copiesToStar2` step through [2, 3, 4] | 4, 6 | Beat 4 sim-time ±25% | Combine-up pacing decides how fast 2-star units appear. 3 is canonical (DAC/TFT/SAP); 2 collapses the chain to triviality, 4+ pushes 3-star beyond match length |
| `hp-damage-per-round-curve` | `rounds.hpDamagePerRound[*]` ×[0.75, 1.25] | 6 | Beat 6 sim-time ±15% | HP-damage-on-loss curve governs match length. ±25% tips matches from "drawn-out attrition" to "sudden elimination" |
| `modifier-chain-depth` | enable modifier-chain subsets (base+star only / +trait / +item / full) | 3, 6 | Modifier-chain damage output ≥ expected minimum for round N | Upgrade depth is the archetype's vertical stress; validates `createModifierChain` correctness under dynamic composition across trait-threshold + star-tier + item stacking |
| `meta-progression-rate` | `metaUnlockNodeCount` grant-per-match ×[0.5, 2.0] | 7 | Beat 7 sim-time ±30% when `prestigeMode !== 'none'` | Cross-match compound pull; analogous to Survivor / Defender / Packer probes. Orthogonal to `combatMode` — PvP and PvE-roguelike variants both ship meta-progression |

**Minimum probe count:** 7 (meets ≥4 requirement; covers cost scaling via `tier-gate-schedule`, production rate via `hp-damage-per-round-curve`, modifier chain via `modifier-chain-depth`, and four archetype-specific axes: interest-rate-schedule, synergy-threshold-bonus, combine-up-copy-curve, meta-progression-rate).

---

## 7. Sim assertions

```ts
import { describe, it, expect } from 'vitest';
import { runHeadless, runMatrix } from 'open-loop-engine/harness';
import { minutes, seconds } from '@/test/time';
import { createAutoBattlerEngine, DEFAULT_AUTO_BATTLER_DATA } from '../boot';

describe('auto-battler — beat map', () => {
  it('beat 1: first unit drafted within 0–0:30', () => {
    const { engine } = createAutoBattlerEngine();
    const result = runHeadless({
      engine,
      until: (state) => state.roster.count >= 1,
      maxSimTime: minutes(2),
    });
    expect(result.simTime).toBeBetween(0, seconds(30));
  });

  it('beat 3: first synergy threshold crosses within 3–8 min', () => {
    const { engine } = createAutoBattlerEngine();
    const result = runHeadless({
      engine,
      until: (state) => state.traits.anyAtThreshold >= 1,
      maxSimTime: minutes(12),
    });
    expect(result.simTime).toBeBetween(minutes(3), minutes(8));
  });

  it('beat 5: first interest payout within 6–10 min', () => {
    const { engine } = createAutoBattlerEngine();
    const result = runHeadless({
      engine,
      until: (state) => state.gold.interestEarnedThisMatch.gte(1),
      maxSimTime: minutes(15),
    });
    expect(result.simTime).toBeBetween(minutes(6), minutes(10));
  });

  // one `it` per beat through beat 7 — full enumeration in auto-battler.sim.test.ts.
});

describe('auto-battler — balance robustness', () => {
  it('beats 5 and 6 stay in tolerance under interest-rate ×[0.67, 1.5]', () => {
    const matrix = runMatrix({
      engine: (overrides) => createAutoBattlerEngine(overrides).engine,
      baseOverrides: DEFAULT_AUTO_BATTLER_DATA,
      perturbations: [
        { path: 'interest.goldPerInterestUnit', multiply: [0.67, 1.0, 1.5] },
      ],
      beats: ['beat-5', 'beat-6'],
    });
    for (const beat of ['beat-5', 'beat-6']) {
      expect(matrix.tolerance(beat, '±20%')).toBe(true);
    }
  });

  // one `it` per probe from § 6.
});
```

**Required test count:** 7 beats + 7 probes = 14 tests minimum. Tests checked into `src/archetypes/auto-battler/sim/auto-battler.sim.test.ts` (lands during the OL-547 Auto-battler rebuild; this doc describes design intent).

---

## 8. Content sketch

- **Resources:** 3 — gold (per-match, interest-bearing, resets on match end), HP (per-match, elimination threshold), meta-currency / trophy points (cross-match, `persistent`, only when `prestigeMode !== 'none'`). Optional 4th: items (TFT-style per-unit equipment) when the fork layers on an item system.
- **Units (the archetype's primary content axis):** 18 units at skeleton density — three per shop tier across tiers 1–6, enough to support 5–7 synergy families with meaningful threshold counts. Example naming (Heroes & Beasts theme): tier-1 [initiate (Human/Warrior), pup (Beast/Assassin), sapling (Elf/Druid)]; tier-2 [squire (Human/Knight), wolf (Beast/Warrior), cub (Beast/Druid)]; tier-3 [ranger (Elf/Hunter), iron-soldier (Human/Knight), firebeetle (Demon/Assassin)]; tier-4 [archmage (Elf/Mage), armoured-bear (Beast/Warrior), flame-summoner (Demon/Mage)]; tier-5 [paladin (Human/Knight), wyvern (Dragon/Hunter), druid-archon (Elf/Druid)]; tier-6 [ancient-dragon (Dragon/Mage), demon-lord (Demon/Assassin), world-tree (Elf/Druid/Knight)]. Eighteen supports 6 Species × 5 Classes with 4–6 threshold tiers per synergy.
- **Synergies:** 11 families at skeleton density — 6 Species (Human / Elf / Beast / Dragon / Demon / Undead) + 5 Classes (Warrior / Knight / Mage / Assassin / Druid / Hunter — 6 pick 5 for roster variety). Each synergy has 2–4 threshold tiers at counts matching DAC's canonical schedule. 6+5=11 covers the core compositional surface without flooding the synergy panel.
- **Shop tiers:** 6 tiers, unlocked by player-level at levels 1 / 2 / 3 / 4 / 5 / 7 (DAC canonical schedule). Shop slot counts scale 3 → 5 → 5 across tiers (SAP's schedule), DAC variants use constant 5 across all tiers — `shop.slotsPerTier` fork-configurable.
- **Round bracket:** 15-round standard (PvE rounds 1–3, PvP 4+ with creep interrupts every 5 rounds, boss at round 10 and final at 15). `rounds.roundTypeSchedule` fork-configurable; `'pve'` roguelike variants use all-PvE scripted encounters.
- **Progression gates:** meta-unlock nodes 10 at skeleton density (3 hero unlocks, 3 stage-roster unlocks, 2 synergy-variant unlocks, 2 item-pool unlocks). Each node's trigger resolves in `createAchievementCategory`.
- **Characters / Heroes:** 3 at skeleton density (each biases shop toward certain synergy families — e.g., "Warrior-favored" hero sees +20% Warrior-tag units in shop rolls). Fork expansion target is DAC's 60-unit canonical roster + TFT's hero-level set bonuses.
- **Achievements:** 0 as mechanical multipliers — the unlock cascade above *is* the archetype's achievement surface. Forks may add cosmetic achievements separately.

**Density target:** every beat in § 4 maps to at least one content entry. Beat 1 → units × shop (first purchase). Beat 2 → units × rounds (round-1 combat vs PvE). Beat 3 → units × synergies (threshold crossing). Beat 4 → units × combine-rule (combine-up). Beat 5 → interest × shop (interest payout). Beat 6 → rounds × match-cycle-boundary (match end). Beat 7 → meta-unlock-nodes × hero-roster (second-match compound).

---

## 9. UI prescription

- **Primary shell:** `` `declared invention` `` — central-board-with-peripheral-panel layout per `subgenre-shell-mapping-2026.md § auto-battler (N=3, N_classifiable=3)`. The `auto-battler` sub-genre has a moderate `free-form` majority (2/3, 67%: Dota Auto Chess + Backpack Battles), with Super Auto Pets' `single-column` as the 1D-degenerate-case outlier. The sub-genre commentary is explicit: "Auto-battler shells are characterized by a central placement-grid play surface (hex board, backpack grid, pet bench) with peripheral panels (shop, synergy, health bar list)… An archetype prescription for Auto-battler should probably lead with the central-grid + peripheral-panel primitive, with the shell-bucket assignment following viewport shape." None of starter's 5 shells (`SidebarMainShell`, `ThreePanelShell`, `SingleColumnShell`, `TabsBarShell`, `MultiColumnShell`) captures that pattern. Starter's 6th audit shell `free-form` is consistently `declared invention` against starter today. Exemplar rows from `layout-audit-2026.md`: Dota Auto Chess (free-form; hex-grid board + bench row + shop panel + synergy panel + multi-player health-list), Backpack Battles (free-form; central backpack grid + synergy indicators + side-by-side grids during combat), Super Auto Pets (single-column; pet-slot row + shop row + synergy panel stacking vertically for mobile-first viewport). Graduation threshold: two independent Auto-battler forks sharing central-board + peripheral-panel geometry.
- **Secondary shell:** `SingleColumnShell` — cites `layout-audit-2026.md` for Super Auto Pets (`single-column`; pet row + shop row + synergy panel stacking vertically for narrow-viewport). The strongest partial fit in starter for forks that collapse peripheral panels into a narrow-viewport stacked column, following the SAP precedent. SAP's single-column classification reads as the mobile-first reading of the central-board + peripheral-panel primitive: the same content primitives (pet row / shop row / synergy panel) stack vertically when viewport width doesn't accommodate horizontal peripheral placement. Forks adopting the SAP degenerate case (`gridMode: '1d-slot'`) or explicitly mobile-first forks adopt this shell; desktop forks with 2D hex / rectangular grids adopt the declared-invention primary.
- **Form-factor intent:** `responsive` — cites `layout-audit-2026.md` for Dota Auto Chess (form-factor `unknown`; cross-platform confirmed iOS / Android / Epic / Dota 2 client via standalone ports) and Super Auto Pets (form-factor `unknown`; Steam + iOS + Android confirmed via the analysis). Backpack Battles (form-factor `desktop`) anchors the desktop end. The canonical genre was mobile-first from day one of the standalone release (Drodo's standalone shipped iOS/Android before PC); SAP's form-factor reach is Steam + mobile simultaneously. Responsive is honest here — the 2D-rect / 1D-slot sub-variants land on different form-factors naturally.
- **ARIA-aligned widgets (lift targets):**
  - `Tooltip` — unit stat / trait / ability breakdowns on hover / long-press; synergy-threshold preview; combine-up readout ("3 more copies to star 2"). Cites `widget-vocabulary.md` Layer 1 (frequency 5).
  - `Dialog` — combine-up confirmation, shop-reroll confirmation (when cost escalates), match-end summary, hero-select between matches. Cites `widget-vocabulary.md` Layer 1 (frequency 6).
  - `Toolbar` — unit-filter strip in shop (by tier, by tag); hero-select tabs. Cites `widget-vocabulary.md` Layer 1.
  - `Progress` — HP bar (per-player), round-timer countdown, unit-ability-cooldown indicators during combat, combine-up XP progress per unit. Cites `widget-vocabulary.md` Layer 1 (frequency 12).
  - `Toast` — synergy-threshold activation ("3 Warriors activated! +10 armor"), combine-up trigger, unlock flags. Cites `widget-vocabulary.md` Layer 1 (frequency 3).

  Lift from `@/lib` / reka-ui primitives; forks do not reimplement focus, portal, or a11y.
- **Domain widgets (per-fork implementation):**
  - placement grid / fixed slots — the archetype's central commitment surface. Cites `widget-vocabulary.md` Layer 2 (frequency 5; Batch 8 promotion; spans Auto-battler + Packer + Cycler). Dota Auto Chess's hex board, TFT/Underlords' rect grids, SAP's 1D row, Backpack Battles' inventory grid, Thronefall's building slots are the five corpus rows — five distinct geometries arguing against pre-abstraction.
  - synergy indicator / composition feedback — persistent panel showing active synergies + threshold-progress ("Warrior 2/3 → next: +10 armor"). Cites `widget-vocabulary.md` Batch 8 Appendix (frequency 2: Dota Auto Chess, Backpack Battles; below ≥3 threshold). `` `declared invention` `` against a named widget entry — observed in both flagship exemplars but not corpus-promoted. Load-bearing for composition legibility; forks implement even without a named vocabulary row.
  - unit / pet card — per-unit detail popover with stats / traits / ability / combine-progress. Cites `widget-vocabulary.md` Layer 2 building-card analogue (frequency 4).
  - level-up choice cards (3–4 option modal) — Auto-battler fork variant for deckbuilder-adjacent acquisition modes (Storybook Brawl / The Bazaar); not standard in DAC-lineage variants. Cites `widget-vocabulary.md` Layer 2 (frequency 3; Batch 8 promotion; cross-archetype Survivor + Auto-battler).
  - match HP bar / health-list — per-player HP readout across the lobby (8-player tracker in DAC/TFT; 1v1 simplified bar in SAP / Backpack Battles). Cites `widget-vocabulary.md` Layer 2 match HP bar (frequency 4; Batch 8 promotion). Forks with `combatMode: 'pvp'` ship the 8-player health-list; `'pve'` forks ship a single match-HP bar instead.
  - round / turn counter — persistent HUD readout of current round + total rounds remaining. Shared with Cycler's wave counter (cross-archetype widget).
  - shop panel — acquisition surface rendering the N-slot shop display with freeze / sell / reroll affordances. Per-fork implementation — no pre-abstraction; DAC's shop panel, TFT's shop drawer, SAP's horizontal shop row, and Backpack Battles' shop strip all differ enough in affordance placement + interaction model that a shared abstraction would leak.

  Per-fork implementation — no pre-abstraction. Lift-first policy (OL-273 Phase 2): five distinct corpus grid geometries + three distinct shop-panel layouts argue for implementation symmetry rather than abstraction. First two converging forks with the same geometry (e.g., two hex-grid PvP variants) trigger graduation.
- **Layout detail:** central board region occupies the main viewport; shop panel flanks one side (typically bottom or right); synergy panel flanks the other (typically left or top-right); HP bars dock top or top-corner; round counter + timer dock top. During combat phase (auto-resolve), the board animates unit movements + ability effects; shop panel collapses or dims; synergy panel remains visible. `combatMode: 'pvp'` forks add an opponent-board preview or scout panel (reading snapshot pool state).
- **Nav pattern:** single-screen in-match. Between-match menu (hero select → match-mode select → leaderboard / battle-pass / meta-progression) is a separate shell-level surface and may adopt `TabsBarShell` (DAC/TFT-style metagame hub) or `SingleColumnShell` (SAP-style simple menu).
- **Declared-invention notes:** the primary central-board shell is declared-invention against *starter's 5 shells*, not against the audit corpus — Batch 8 (2026-04-20) added 3 auto-battler sub-genre rows covering the lineage (Dota Auto Chess, Backpack Battles, Super Auto Pets). Unlike the Defender prework-staleness case (OL-574) where the prework pre-dated Batch 8, Auto-battler's § 9 benefits from Batch 8 being already-filed when drafting began — the sub-genre row directly backs the declared-invention framing with `auto-battler` sub-genre commentary that *explicitly recommends* the central-grid + peripheral-panel primitive. Graduation threshold for starter's shell library: two independent Auto-battler forks sharing central-board + peripheral-panel geometry. Forks with `gridMode: '1d-slot'` may converge on a degenerate `SingleColumnShell` extension instead; either graduation path is independent.

---

## 10. Predicted engine gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| `grid-placement-auto-resolve` substrate (refused primitive; see § 3) | Medium | Per OL-568 decision, zero new primitives — `createSpatialGrid` + `createSlot` cover the structural grid half, and trait-threshold-based synergy scoring stays consumer-side per the distinct computation shape vs Packer's shape-adjacency. `TODO(expansion)` parked at two call-sites per OL-568 § 3.3. Severity upgrades to **High** if Auto-battler's first fork *and* Packer's first fork (OL-577) independently hand-roll the same wrapper; convergent-rule triggers extraction. Cross-archetype convergent candidate — shared with OL-577. |
| Trait-threshold reactivity primitive | Medium | Per-trait count + threshold-gated modifier-chain entry activation is the archetype's dominant ceremony. Today this composes `createSkillCategory` (for per-trait counters) + `createModifierChain` threshold-gated entries + ad-hoc threshold-evaluation logic. A `createThresholdActivator({ source, thresholds, onCross })` helper would compress the wiring; defer until first Auto-battler fork profiles the complexity. The pattern is distinctive to Auto-battler (no Packer / Survivor / Cycler equivalent); lower priority for shared graduation. |
| Shared-pool state synchronisation | High | `poolMode: 'shared'` tracks pool copies across eight players with return-on-sell-or-death mechanics. Today this requires consumer-side shared-pool state + per-player shop state + event-driven copy-return wiring. No engine primitive models pool-as-shared-resource; consumer carries the sync discipline. For single-player `'private'` forks this is non-issue; for multiplayer forks this is the single highest-friction engine gap. Severity **High** because the first multiplayer Auto-battler fork will hit this immediately; graduation shape is probably `createSharedPool({ items, sync })` — parked until a multiplayer consumer lands. |
| Interest-mechanic primitive | Medium | Round-end interest on unspent gold (+1 per 10 held, cap +5) is Auto-battler's distinguishing economic invention with no LIBRARY or engine home today. Current ceremony: `createResource` (gold) + `createSequencer` round-end hook + ad-hoc interest formula + `createResource` income application. A `createInterestBearing(resource, { rate, cap, schedule })` helper would compress this + could support win/loss streak variants. Cross-archetype candidate if Packer forks ship interest variants (Backpack Battles does); noted for joint consideration with OL-577. |
| Draft-pool weighted sampling | Low | Shop-offer generation (N items from pool, weighted by shop-tier probability table, filtered by already-owned / locked state) is consumer-side today. `createPurchasableCategory` + ad-hoc filtering handles it. A `createWeightedOffer({ pool, weights, filters })` helper could unify; same shape likely surfaces in Packer (shared-substrate candidate). Cross-archetype convergent candidate — shared with OL-577. |
| Combine-up recipe primitive | Medium | "N copies at star K merge into one at star K+1 with modifier chain transform" is the archetype's second-most-common ceremony after trait thresholds. Today composes `createPurchasable` (units) + consumer-side merge logic + `createModifierChain` dynamic composition. A `createCombineRecipe({ input, grade, output, chainTransform })` helper could compress; same shape in Packer. Strong cross-archetype convergent candidate — shared with OL-577. |
| Deterministic combat-resolve RNG | Low | Crit rolls, proc chances, and target-selection randomness must be seeded from match-state for rematch / replay reproducibility. Today this composes `createSequencer` tick cadence + consumer-side seeded-RNG passed through ability resolution. No engine primitive missing, but a declarative "seed RNG per match-tick" helper could reduce the ceremony. Fork-level concern; not graduation-tier. |
| Round-timer + phase-transition primitive | Low | Prep-phase → combat-phase → round-end sequencing is `createSequencer` today. Ergonomics are fine; noted for completeness. Cycler's `createPhaseMachine` refused-primitive (OL-568 § 4) covers similar territory; if that ever graduates, Auto-battler inherits benefits. |

Convergent-gap rule: N/A — no live consumers yet. All gaps are hypotheses the first Auto-battler fork confirms or rejects. When the first Auto-battler fork *and* the first Packer fork (OL-577) both land, the shared-substrate refused-primitive, combine-up recipe gap, and draft-pool weighted sampling gap are the three strongest candidates to upgrade to **High** per the convergent-gap rule across OL-577 + OL-578. Shared-pool state synchronisation is **High at authoring** because the first multiplayer Auto-battler fork will hit it regardless of Packer convergence — multiplayer is Auto-battler-specific.

---

## 11. Themes

### Theme A — Heroes & Beasts (Classic Fantasy)

- **Hook:** A lobby of up to eight players drafts fantasy heroes, beasts, and arcane casters from a shared tavern. Hex-grid battlefield; Species + Class synergy chart; interest-bearing gold economy. Direct Dota Auto Chess / Teamfight Tactics lineage; the canonical 2019 genre-founder form.
- **Resource mapping:** currency = gold; meta-currency = rank points; HP = hero lifeforce; units = [initiate, pup, sapling, squire, wolf, cub, ranger, iron-soldier, firebeetle, archmage, armoured-bear, flame-summoner, paladin, wyvern, druid-archon, ancient-dragon, demon-lord, world-tree]; species = [Human, Elf, Beast, Dragon, Demon, Undead]; classes = [Warrior, Knight, Mage, Assassin, Druid, Hunter]; `gridMode: '2d-hex'`, `poolMode: 'shared'`, `combatMode: 'pvp'`, `prestigeMode: 'run-reset'` by default.
- **Narrative framing:** light — tavern-ambient audio, hero-select flavour cards, end-of-match verse on the victor.

### Theme B — Spirit Companion (1D-slot / SAP-shape)

- **Hook:** A party of animal spirits on five ordered slots; front-to-back auto-combat; three-copy combine-up into higher-tier spirits. Private-pool variant keeps the loop accessible for solo / casual framing. Direct Super Auto Pets lineage, dual-cover with OL-577 Packer Theme D.
- **Resource mapping:** currency = gold; meta-currency = trophy points; HP = party vitality (10 HP standard, damage scales with round); units = [fox-pup, forest-owl, river-turtle, spark-salamander, iron-snail, singing-cricket, meadow-rabbit, shadow-cat, flame-moth, clever-raven, stone-toad, sun-dragon, ember-fox, wind-wolf, moon-bear, storm-crow, crystal-beetle, star-dragon]; tags simpler than Theme A (pack / flock / swarm / herd / flight); `gridMode: '1d-slot'`, `poolMode: 'private'`, `combatMode: 'pvp'` (async snapshot-pool), `prestigeMode: 'continuous-accumulator'` by default (trophies persist through wins + losses). Explicit dual-cover note with OL-577: the 1D-slot + combine-up + auto-resolve triple lands in both archetypes; Auto-battler framing here emphasises the shop + tier-gate + async-snapshot multiplayer commitment (the structural side SAP belongs to); Packer framing (OL-577 Theme D) emphasises slot-order + adjacency-relative abilities.
- **Narrative framing:** light — pet-flavour vignettes, playful between-match radio.

### Theme C — Mech Legion (Counter-Synergy Variant)

- **Hook:** Cybernetic units countering one another on a wide battlefield; unit-countering replaces (or layers alongside) class/trait thresholds. Direct Mechabellum lineage; the 2024 counter-synergy exploration variant.
- **Resource mapping:** currency = credits; meta-currency = commendation tokens; HP = fortress integrity (command-chain HP pool); units = [scout-walker, infantry-squad, rocket-turret, shield-bearer, flame-tank, recon-drone, plasma-battery, engineer-squad, gauss-cannon, heavy-mech, artillery, siege-walker, missile-cruiser, lightning-titan, bastion-fortress, command-ship, experimental-raven, apex-predator]; tags = [Mech, Infantry, Artillery, Siege, Commander]; counter-pairs documented per wiki (armor counters infantry, AoE counters swarm, etc.); `gridMode: '2d-rect'`, `poolMode: 'private'`, `combatMode: 'hybrid'` (PvP + campaign PvE), `prestigeMode: 'campaign'` by default.
- **Narrative framing:** medium — commander-radio chatter during combat; campaign-map progression reveals the war's scope.

### Theme D — Card Sorcerer (Deckbuilder-adjacent Hybrid)

- **Hook:** A sorcerer drafts spell cards instead of units from a shop; placed cards generate summoned creatures that auto-resolve combat; deck + shop hybrid acquisition. Storybook Brawl / The Bazaar lineage — the 2021–2025 genre-boundary exploration.
- **Resource mapping:** currency = mana; meta-currency = lore pages; HP = sorcerer vitality; units (spell-summoned) = [imp, flame-sprite, frost-wolf, stoneguard, gale-rider, dragonling, dryad, banshee, lich-knight, phoenix, shadow-assassin, crystal-golem, tempest-elemental, ancient-treant, archmage, dread-demon, sun-paladin, world-wyrm]; tags = [Fire, Frost, Nature, Arcane, Shadow, Light, Beast]; `gridMode: '2d-rect'`, `poolMode: 'shared'`, `combatMode: 'pvp'`, `acquisitionMode: 'hybrid-shop-draw'` (cards drawn from a seeded deck each round; shop offers deck additions between rounds), `prestigeMode: 'run-reset'` by default.
- **Narrative framing:** medium — between-round spell-scroll flavour; chapter progression through distinct magical schools.

### Theme E — Roguelike Expedition (PvE Variant)

- **Hook:** Solo roguelite campaign — each run drafts a party through scripted encounters with map-node progression between rounds. Hadean Tactics / Dragon Cliff lineage; the PvE-Auto-battler exploration. No shared pool, no lobby, scripted opponent encounters.
- **Resource mapping:** currency = gold; meta-currency = prestige shards; HP = party health; units = 18 themed adventurers (same skeleton as Theme A but PvE-tuned stats); `gridMode: '2d-rect'`, `poolMode: 'private'`, `combatMode: 'pve'`, `prestigeMode: 'run-reset'` (roguelite run-reset with permanent unlocks) by default; `rounds.roundTypeSchedule` entirely PvE with boss encounters at node-map nodes.
- **Narrative framing:** medium — party-banter audio between encounters, node-map reveals the expedition's arc, boss intros carry thematic weight.

---

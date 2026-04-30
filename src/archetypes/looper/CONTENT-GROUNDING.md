# Looper content grounding — vanilla town 0 / town 1 source map

Working document for OL-804 (parent OL-802). Deleted on parent close. Locks the per-action / per-regularVar / per-progressVar decisions that OL-805 will apply mechanically to `data/*.ts`.

## Source

`open-loop-research/reference-code/idle-loops-omsi/loops/actionList.js` — vanilla idle-loops Omsi-mod port. Town 0 actions at lines 155–800; town 1 actions at lines 1080–1350. Pool-sizing functions at lines 195–199 (town 0), 1119–1127 (town 1).

Where citations say `actionList.js:NNN` they refer to this file.

## Methodology

Every numerical claim either:
- Cites a vanilla source line and copies the value, or
- Carries `declared invention — <rationale>` with explicit reasoning.

No "solver placeholder" or "magnitude TBD" entries.

## Per-action decisions

### Hearth (vanilla town 0)

| # | Action | Current | Vanilla equivalent | Vanilla numbers | Locked decision |
|---|---|---|---|---|---|
| 1 | **Stretch** (Vigor trainer) | 60 / expMult:4 / `{vigor:1}` | None — vanilla town 0 has zero basic trainers; only `expMult:4` action is Train Strength at 2000 mana behind `met ≥ 5` | n/a | **DELETE.** Triple invention (cheap + high-mult + single-stat). Capability XP comes from world-action weights, not dedicated trainers. |
| 2 | **Tend** (Craft trainer) | 80 / expMult:4 / `{craft:1}` | None | n/a | **DELETE** (same reasoning). |
| 3 | **Listen** (Lore trainer) | 80 / expMult:4 / `{lore:1}` | None | n/a | **DELETE** (same reasoning). |
| 4 | **Attune** (Aether trainer) | 80 / expMult:4 / `{aether:1}` | None | n/a | **DELETE** (same reasoning). |
| 5 | **Roam** (explore-progress) | 150 / expMult:1 / `{vigor:0.4, lore:0.4, aether:0.2}` / progressAmount 200 | **Wander** (`actionList.js:155-194`) | manaCost 250, expMult 1, stats `{Per:0.2, Con:0.2, Cha:0.2, Spd:0.3, Luck:0.1}` (sum 1.0), `finishProgress(varName, 200)` | **manaCost 250** (was 150). progressAmount 200 ✓. weights stay multi-cap; current shape `{vigor:0.4, lore:0.4, aether:0.2}` sums to 1.0, matches vanilla pattern. Lock weights as-is. |
| 6 | **Acquaint** (social progress) | 150 / `{lore:0.6, aether:0.4}` / progressAmount 200 | **Meet People** (`actionList.js:349-388`) | manaCost 800, expMult 1, stats `{Int:0.1, Cha:0.8, Soul:0.1}`, `finishProgress(varName, 200)`, `visible: wander ≥ 10`, `unlocked: wander ≥ 22` | **manaCost 800** (was 150). progressAmount 200 ✓. Add visibility prereq `roam.level ≥ 10` (translated from vanilla's wander ≥ 10 visibility gate). weights stay multi-cap. |
| 7 | **Crack** (manapot spine) | 200 / `{craft:0.5, vigor:0.5}` / mana +100 every 10th | **Smash Pots** (`actionList.js:202-239`) | manaCost 50, expMult 1, stats `{Str:0.2, Per:0.2, Spd:0.6}`, `finishRegular(varName, 10, () => addMana(~100))` | **manaCost 50** (was 200 — **the smoking gun**). Reward mana 100 ✓, rewardRatio 10 ✓. Pool sizing: pots = wander × 5 → cache = roam × 5 ✓. weights stay multi-stat. |
| 8 | **Slip** (gold pool, hidden latches) | 220 / `{craft:0.7, lore:0.3}` / gold +10 every 10th, prereq acquaint count ≥ 3 | **Pick Locks** (`actionList.js:241-284`) | manaCost 400, expMult 1, stats `{Dex:0.5, Per:0.3, Spd:0.1, Luck:0.1}`, `finishRegular(varName, 10, () => addGold(~10))`, `visible: wander ≥ 3` | **manaCost 400** (was 220). gold reward 10 ✓, rewardRatio 10 ✓. **Change prereq from `acquaint count ≥ 3` to `roam.level ≥ 3`** to match vanilla `wander ≥ 3` visibility gate. Pool sizing: locks = wander × 1 → latch = roam × 1 ✓. NOTE: changing this prereq removes the `action-completion-count` prereq variant from the §5 prereq-graph coverage list — see "Prereq variant coverage" below for replacement strategy. |
| 9 | **Run** (secondary gold pump) | 250 / `{vigor:0.5, lore:0.5}` / gold +20 every 5th | None — vanilla town 0 has only Pick Locks for gold; Short Quest (`actionList.js:429-474`) at 600 mana / +20 gold every 5th is unlocked behind `met ≥ 5` | n/a (vanilla closest: Short Quest 600/20/5 with prereq) | **DELETE.** Slim demo's gold pump is Slip alone for the first arc. Run at 250/20/5 was 4× richer than Short Quest with no gating, an invented hostile-economy lever the planner could exploit. The §5 prereq-graph coverage doesn't depend on Run. |
| 10 | **Trade** (gold→mana exchange) | 300 / `{lore:1}` / spend-gold-all + exchange ×50, prereq roam ≥ 3 | **Buy Mana** (`actionList.js:325-347`) | manaCost 100, expMult 1, stats `{Cha:0.7, Int:0.2, Luck:0.1}`, `finish: addMana(resources.gold * 50); resetResource("gold")` | **manaCost 100** (was 300). exchangeMult 50 ✓. spend-gold-all ✓. weights — change from `{lore:1}` (single-stat — vanilla has no single-stat actions) to multi-stat `{lore:0.7, aether:0.2, craft:0.1}` mirroring vanilla's `{Cha:0.7, Int:0.2, Luck:0.1}` distribution. Prereq `roam ≥ 3` matches vanilla `wander ≥ 3` visibility ✓. |

### Wilds (vanilla town 1)

| # | Action | Current | Vanilla equivalent | Vanilla numbers | Locked decision |
|---|---|---|---|---|---|
| 11 | **Trek** (Hearth→Wilds bridge, basic-type) | 400 / `{vigor:0.6, lore:0.4}` / no reward, prereq roam ≥ 5 | None — vanilla unlocks town 1 via WalkOldRoad gated on `wander ≥ 60`; there's no zero-effect "bridge" basic action | n/a | **DELETE.** Trek is a basic-type with no completion effect, gated on roam ≥ 5; it serves no role distinct from Trail (the first Wilds progress action) being prereq-gated. Wilds visibility comes from Trail's own prereq, not a separate bridge action. |
| 12 | **Trail** (Wilds explore-progress) | 250 / `{vigor:0.6, aether:0.4}` / progressAmount 200 | **Explore Forest** (`actionList.js:1077-1118`) | manaCost 400, expMult 1, stats `{Per:0.4, Con:0.2, Spd:0.2, Luck:0.2}`, `finishProgress(varName, 100)` | **manaCost 400** (was 250). **progressAmount 100** (was 200 — vanilla town 1 Wander deliberately gives half the progress per mana of town 0 Wander, which is the late-game-progresses-slower curve). Add visibility prereq `roam.level ≥ 5` (translated from "Wilds is gated on Hearth progression"; vanilla doesn't gate explore-forest itself, but the slim demo doesn't have separate town transitions, so Trail's own visibility carries the zone gate). |
| 13 | **Mark** (Wilds secondary progress) | 280 / `{aether:0.6, lore:0.4}` / progressAmount 200, prereq trail ≥ 1 | **Old Shortcut** (`actionList.js:1270-1313`) — vanilla's second town-1 progress | manaCost 800, expMult 1, stats `{Per:0.3, Con:0.4, Spd:0.2, Luck:0.1}`, `finishProgress(varName, 100)` | **manaCost 800** (was 280). **progressAmount 100** (was 200). Prereq `trail ≥ 1` ✓ (vanilla has no equivalent gate; ours is a slim-demo readability choice — declared invention, rationale: prevent both Wilds progress actions appearing simultaneously which would split bot focus). |
| 14 | **Drink** (alt-manapot) | 350 / `{aether:1}` / mana +250 every 10th | **Wild Mana** (`actionList.js:1129-1164`) | manaCost 150, expMult 1, stats `{Con:0.2, Int:0.6, Soul:0.2}`, `finishRegular(varName, 10, () => addMana(~250))` | **manaCost 150** (was 350). reward mana 250 ✓, rewardRatio 10 ✓. weights — change from `{aether:1}` (single-stat) to multi-stat `{aether:0.6, lore:0.2, craft:0.2}` mirroring vanilla's `{Int:0.6, Con:0.2, Soul:0.2}`. Pool sizing: wildMana = forest × 5 + thicket × 5 → wellspring = trail × 5 ✓ (slim demo drops second contributor). |
| 15 | **Gather** (multi-axis pool) | 320 / `{craft:0.5, lore:0.5}` / mana +50 + gold +5 every 5th, prereq vigor.talent ≥ 1 + loops ≥ 3 | **Gather Herbs** (`actionList.js:1166-1198`) | manaCost 200, expMult 1, stats `{Str:0.4, Dex:0.3, Int:0.3}`, `finishRegular(varName, 10, () => addResource("herbs", 1))` | **manaCost 200** (was 320). **rewardRatio 10** (was 5). Reward — vanilla grants 1 herb (an inventory resource we don't model). KEEP our multi-axis reward `mana +50 + gold +5` as **declared invention — rationale**: the slim demo doesn't model consumable-resource inventories, so Gather adapts the multi-axis-pool slot (vanilla forest×5 + shortcut×2 + flowers×13 → forage = trail×5 + mark×2) to a multi-axis reward instead. Magnitudes (mana 50, gold 5) are slim — half a Crack hit and half a Slip gold. KEEP prereqs `vigor.talent ≥ 1 AND loops ≥ 3` for §5 prereq-graph coverage of the `capability-tier-level + loop-count` variant. Pool sizing: forage = trail × 5 + mark × 2 ✓ matches vanilla forest×5 + shortcut×2 (third contributor dropped). |

## ProgressVar table

| ProgressVar | Current scales | Vanilla pool-sizing | Locked decision |
|---|---|---|---|
| roam | cache × 5, latch × 1 | adjustPots: pots = wander × 5 (`actionList.js:195-197`); adjustLocks: locks = wander × 1 (`actionList.js:198-200`) | **No change** — exact match. |
| acquaint | errand × 1 | adjustSQuests: sQuests = met × 1 (`actionList.js:389-391`) | **No change** — exact match (modulo Run deletion: errand pool now only fed by Slip if we keep Slip's gold pool — but Slip's pool is `latch`, not `errand`. Errand pool needs an action to drain it. With Run deleted, errand is dead. **DECIDE: drop the errand regularVar entirely**, see RegularVar table. |
| trail | wellspring × 5, forage × 5 | adjustWildMana: forest × 5 + thicket × 5; adjustHerbs: forest × 5 + shortcut × 2 + flowers × 13 (`actionList.js:1119-1127`) | **No change** — wellspring × 5 matches vanilla forest contribution; forage × 5 matches vanilla forest contribution to herbs. |
| mark | forage × 2 | adjustHerbs: shortcut × 2 contribution | **No change** — exact match. |

`expMult: 1` uniform across all four progressVars — matches vanilla all-`expMult:1` for town-0 and town-1 progress actions.

## RegularVar table

| RegularVar | Current | Decision |
|---|---|---|
| cache | Hearth manapot pool, fed by Crack | **KEEP.** Lock pool sizing roam × 5 (vanilla pots = wander × 5). |
| latch | Hearth gold pool, fed by Slip | **KEEP.** Lock pool sizing roam × 1 (vanilla locks = wander × 1). |
| errand | Hearth secondary gold pool, fed by Run (deleted) | **DELETE.** With Run gone, no action drains the errand pool. The acquaint progressVar's `scales: [{ regularVarId: 'errand', perLevel: 1 }]` is removed alongside, leaving acquaint as a pure progress track that doesn't size any pool — same role as vanilla's Met (which sizes sQuests × 1 fed by Short Quest, an action we're not adopting in the slim demo). |
| wellspring | Wilds alt-manapot pool, fed by Drink | **KEEP.** Pool sizing trail × 5 (vanilla wildMana = forest × 5). |
| forage | Wilds multi-axis pool, fed by Gather | **KEEP.** Pool sizing trail × 5 + mark × 2 (vanilla herbs = forest × 5 + shortcut × 2 + flowers × 13, third contributor dropped for slim demo). |

After reground: 4 regularVars (cache, latch, wellspring, forage); 4 progressVars (roam, acquaint, trail, mark); 9 actions (Roam, Acquaint, Crack, Slip, Trade, Trail, Mark, Drink, Gather).

## Prereq variant coverage post-reground

The §5 doc claims the prereq web exercises five `ActionPrereq` variants: action-completion-count, capability-tier-level, progress-var-level, loop-count, always.

Post-reground:
- **always** (implicit, no `prereqs` field): Roam, Crack, Trail.
- **progress-var-level**: Acquaint (roam ≥ 10), Slip (roam ≥ 3), Trade (roam ≥ 3), Mark (trail ≥ 1).
- **capability-tier-level + loop-count** (combined): Gather (vigor.talent ≥ 1 AND loops ≥ 3).
- **action-completion-count**: **NO LONGER COVERED** — was on Slip (`acquaint count ≥ 3`), changed to progress-var-level for vanilla alignment. Was on no other action.

**Decision on coverage gap**: file as a follow-up note in OL-805's commit. The §5 doc claim that we cover all five variants is no longer true post-reground — drop that claim from the doc in OL-807. The action-completion-count variant is still implemented in the engine; it's just not exercised by the slim demo's prereq web. Forks adding content can use it.

## Balance constants — no change

`data/balance.ts`:
- `initialMana: 250` — vanilla `idle-loops-ng/src/modules/mana.ts:39` ✓
- `costDivisor: 100` — vanilla `1 + level/100` formula ✓
- `talentAccrualRatio: 0.01` — vanilla canonical 1% ✓
- `loopResetEnabled: true` — slim demo default ✓

These were correctly cited in the original doc reconciliation (OL-745) and are unchanged.

## Cost-spine summary (for diagnosis confirmation)

Before reground (current state):
- Crack 200 → 4× too expensive vs vanilla Smash Pots 50 — **inverted**
- Trade 300 → 3× too expensive vs vanilla Buy Mana 100 — **inverted**
- Acquaint 150 → 0.19× cheaper vs vanilla Meet People 800 — **inverted**
- 4 single-stat trainers at 60–80 mana / expMult:4 — **invented**
- Run at 250 mana / 20 gold every 5th — **invented**

After reground:
- All cost ratios match vanilla town 0 / town 1 directly.
- Trainer pattern eliminated; capability XP comes from action weights as in vanilla.
- Action set: 9 actions (was 15), 4 regularVars (was 5), all progressVars unchanged.

## OL-805 hand-off

OL-805 mechanically applies these decisions. Concretely:

1. `data/actions.ts` — delete Stretch / Tend / Listen / Attune / Run / Trek (6 actions). Update remaining 9 with vanilla-grounded numbers per the table above. Each retained action gets a `// vanilla canonical: actionList.js:NNN — <action name>` comment citing source.
2. `data/regular-vars.ts` — delete `errand` entry. 4 regularVars remain.
3. `data/progress-vars.ts` — remove `errand` from acquaint's `scales` array. progressAmount changes for Trail (200 → 100) and Mark (200 → 100) — wait, those are on action defs not progress-var defs. Re-check.

Wait — progressAmount lives on the action def (`ActionDef`), not the progressVar def. So all progressAmount changes are in `actions.ts`, not progress-vars.ts. Confirmed against `data/types.ts § ProgressVarDef`.

4. `data/zones.ts` — no change (Hearth, Wilds remain).
5. `data/types.ts` — no change (the type contracts hold).
6. `data/overrides.ts` — check if any overrides reference deleted action ids; if so, prune.

## Out of scope for OL-805

- Any change to `modules/`, `composables/`, `ui/` — content-only edit.
- Doc reconciliation — OL-807.
- Solver/probe re-run — OL-806.

---

**Status: decisions locked, ready for OL-805.**

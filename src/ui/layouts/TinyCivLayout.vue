<script setup lang="ts">
import { computed, ref } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { ThreePanelShell } from '@/lib';
import { useModule } from '@/composables/useModule';
import { TinyCivKey } from '@/modules/mods/tiny-civ';
import {
  BOUNTY_DEFS,
  BOUNTY_REWARDS,
  BUILDING_DEFS,
  ERA_NAMES,
  RECIPE_DEFS,
  RESOURCE_DISPLAY,
  RESOURCE_KINDS,
  WORKER_REQUIREMENTS,
  ZONE_DESCRIPTIONS,
  type BountyType,
  type BuildingId,
  type RecipeDef,
  type ResourceKind,
  type WorkerId,
} from '@/modules/mods/tiny-civ/content';
import HudBar from '@/ui/components/HudBar.vue';
import HudChip from '@/ui/components/HudChip.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import Tabs, { type TabItem } from '@/ui/components/Tabs.vue';
import TinyCivTechPanel from '@/ui/panels/TinyCivTechPanel.vue';

const tc = useModule(TinyCivKey);

const RESOURCES_WITH_CAP = new Set<ResourceKind>(['wood', 'stone']);

const capacityFor = (kind: ResourceKind): Decimal | null => {
  if (kind === 'wood') return new Decimal(tc.inventories.wood.capacity.value);
  if (kind === 'stone') return new Decimal(tc.inventories.stone.capacity.value);
  return null;
};

const resourceGroups = computed(() => {
  const groups: Record<
    'basic' | 'material' | 'craft' | 'advanced',
    { name: string; rows: ResourceRow[] }
  > = {
    basic: { name: 'Basic', rows: [] },
    material: { name: 'Materials', rows: [] },
    craft: { name: 'Crafted', rows: [] },
    advanced: { name: 'Advanced', rows: [] },
  };
  for (const kind of RESOURCE_KINDS) {
    const display = RESOURCE_DISPLAY[kind];
    const res = tc.resources[kind];
    const rate = tc.ratePerSecond[kind].value;
    const cap = capacityFor(kind);
    const row: ResourceRow = {
      id: kind,
      icon: display.icon,
      name: display.name,
      count: format(Decimal.floor(res.value), 0),
      capText: cap ? `/ ${format(Decimal.floor(cap), 0)}` : '',
      rateText: rate.gt(0) ? `+${format(rate, 1)}/s` : '',
      hasCap: RESOURCES_WITH_CAP.has(kind),
    };
    groups[display.group].rows.push(row);
  }
  return [groups.basic, groups.material, groups.craft, groups.advanced];
});

interface ResourceRow {
  id: ResourceKind;
  icon: string;
  name: string;
  count: string;
  capText: string;
  rateText: string;
  hasCap: boolean;
}

const currentZoneName = computed(() => {
  const id = tc.zones.current.value;
  return tc.zones.ordered.value.find((z) => z.id === id)?.name ?? id;
});

const zoneEntries = computed(() =>
  tc.zones.ordered.value.map((z) => ({
    id: z.id,
    name: z.name,
    description: ZONE_DESCRIPTIONS[z.id] ?? '',
    unlocked: tc.zones.isUnlocked(z.id),
    active: tc.zones.current.value === z.id,
  })),
);

function selectZone(id: string, unlocked: boolean) {
  if (!unlocked) return;
  tc.zones.select(id);
}

const workerViews = computed(() =>
  tc.workers.workers.map((w) => {
    const task = w.worker.currentTask.value;
    const pinnedTo = tc.workers.pinnedBy[w.id];
    const active = w.isActive.value;
    const req = WORKER_REQUIREMENTS[w.id];
    const requirementLabel = active
      ? ''
      : `Requires ${ERA_NAMES[req.era]} era + ${req.hutsRequired} hut${req.hutsRequired === 1 ? '' : 's'}`;
    return {
      id: w.id,
      label: w.id.replace('worker-', 'Worker '),
      currentLabel: active
        ? (task?.label ?? (pinnedTo != null ? 'Idle (pinned)' : 'Idle'))
        : requirementLabel,
      isIdle: task == null,
      isActive: active,
      pinnedTo,
      percent: w.tracker.percentComplete.value,
      recall: w.recall,
    };
  }),
);

const workersBusy = computed(
  () => workerViews.value.filter((w) => w.isActive && !w.isIdle).length,
);
const workersTotal = computed(() => workerViews.value.filter((w) => w.isActive).length);

const BOUNTY_ORDER: BountyType[] = [
  'gather-food',
  'gather-wood',
  'gather-stone',
  'gather-hide',
  'gather-herbs',
  'gather-salt',
  'explore-zone',
];

const BOUNTY_ICONS: Record<BountyType, string> = {
  'gather-food': '🌾',
  'gather-wood': '🪵',
  'gather-stone': '🪨',
  'gather-hide': '🦌',
  'gather-herbs': '🌿',
  'gather-salt': '🧂',
  'explore-zone': '🧭',
};

function rewardLabel(type: BountyType): string {
  const amount = BOUNTY_REWARDS[type];
  const def = BOUNTY_DEFS[type];
  if (amount <= 0) return `${def.durationSec}s`;
  const suffix = type.replace('gather-', '');
  return `+${amount} ${suffix} · ${def.durationSec}s`;
}

function zoneName(zoneId: string): string {
  return tc.zones.ordered.value.find((z) => z.id === zoneId)?.name ?? zoneId;
}

const bountyEntries = computed(() =>
  BOUNTY_ORDER.map((type) => {
    const def = BOUNTY_DEFS[type];
    const gateZone = def.requiresZone;
    const available = gateZone == null || tc.zones.isUnlocked(gateZone);
    return {
      type,
      icon: BOUNTY_ICONS[type],
      label: def.label,
      reward: rewardLabel(type),
      pending: tc.workers.availableTasks.value.filter((t) => t === type).length,
      available,
      gateLabel: gateZone != null && !available ? `Requires ${zoneName(gateZone)}` : '',
    };
  }),
);

const pendingTotal = computed(() => tc.workers.availableTasks.value.length);

function postBounty(type: BountyType) {
  const def = BOUNTY_DEFS[type];
  if (def.requiresZone != null && !tc.zones.isUnlocked(def.requiresZone)) return;
  tc.workers.postBounty(type);
}

function formatCostEntry(resource: ResourceKind, amount: Decimal): string {
  const label = RESOURCE_DISPLAY[resource].name.toLowerCase();
  return `${format(Decimal.floor(amount), 0)} ${label}`;
}

function formatBuildingCost(
  baseCosts: { resource: ResourceKind; amount: number }[],
  priceRatio: number,
  owned: Decimal,
): string {
  const scale = Decimal.pow(priceRatio, owned);
  return baseCosts.map((c) => formatCostEntry(c.resource, Decimal.mul(c.amount, scale))).join(', ');
}

const buildingViews = computed(() =>
  BUILDING_DEFS.map((def) => {
    const p = tc.buildings.category.getPurchasable(def.id);
    const owned = p == null ? Decimal.dZero : new Decimal(p.amount.value);
    const pinnedWorker = def.pinnable ? tc.buildings.pinnedWorker(def.id) : null;
    return {
      id: def.id,
      name: def.name,
      icon: def.icon,
      description: def.description,
      pinnable: def.pinnable,
      pinnedWorker,
      owned,
      ownedText: format(Decimal.floor(owned), 0),
      costText: formatBuildingCost(def.baseCosts, def.priceRatio, owned),
      canBuy: p?.canPurchase.value ?? false,
    };
  }),
);

const idleUnpinnedWorkerIds = computed<WorkerId[]>(() =>
  tc.workers.workers
    .filter(
      (w) =>
        w.isActive.value &&
        tc.workers.pinnedBy[w.id] == null &&
        w.worker.currentTask.value == null,
    )
    .map((w) => w.id),
);

function buyBuilding(id: BuildingId) {
  const p = tc.buildings.category.getPurchasable(id);
  if (p == null || !p.canPurchase.value) return;
  p.purchase();
}

function pinFirstIdleTo(id: BuildingId) {
  const worker = idleUnpinnedWorkerIds.value[0];
  if (worker == null) return;
  tc.buildings.pinWorker(id, worker);
}

function unpinBuilding(id: BuildingId) {
  tc.buildings.unpinBuilding(id);
}

const hasWorkshop = computed(() => tc.buildings.hasWorkshop.value);

function formatRecipeCost(def: RecipeDef): string {
  return def.inputs.map((i) => formatCostEntry(i.resource, new Decimal(i.amount))).join(', ');
}

function formatRecipeOutput(def: RecipeDef): string {
  return `→ ${def.output.amount} ${RESOURCE_DISPLAY[def.output.resource].name.toLowerCase()}`;
}

const recipeEntries = computed(() =>
  RECIPE_DEFS.map((def) => {
    const p = tc.crafting.category.getPurchasable(def.id);
    const owned = p == null ? Decimal.dZero : new Decimal(p.amount.value);
    const canCraft = p?.canPurchase.value ?? false;
    const maxAmount = p == null ? Decimal.dZero : new Decimal(p.amountToPurchase.value);
    // Engine's `amountToPurchase` is clamped to min 1 even when unaffordable
    // (see purchasable.ts buildPurchasableComputeds); gate the "(N)" hint on
    // canCraft so the button doesn't lie about what clicking will do.
    const maxText = canCraft && maxAmount.gt(1) ? format(Decimal.floor(maxAmount), 0) : '';
    return {
      id: def.id,
      name: def.name,
      icon: def.icon,
      description: def.description,
      costText: formatRecipeCost(def),
      outputText: formatRecipeOutput(def),
      craftedText: format(Decimal.floor(owned), 0),
      canCraft,
      maxText,
    };
  }),
);

function craftOnce(id: string) {
  const p = tc.crafting.category.getPurchasable(id);
  if (p == null || !p.canPurchase.value) return;
  p.purchase(1);
}

function craftMax(id: string) {
  const p = tc.crafting.category.getPurchasable(id);
  if (p == null || !p.canPurchase.value) return;
  p.purchaseMax();
}

const currentEraName = computed(() => ERA_NAMES[tc.tech.era.value]);

const activeRightTab = ref<string>('buildings');
const rightTabs = computed<TabItem[]>(() => [
  { value: 'buildings', label: 'Buildings' },
  { value: 'crafting', label: 'Crafting' },
  { value: 'tech', label: 'Tech' },
]);
</script>

<template>
  <div class="tc-layout">
    <HudBar>
      <HudChip>
        📋 {{ pendingTotal }} pending
      </HudChip>
      <HudChip>
        👥 {{ workersBusy }} / {{ workersTotal }} busy
      </HudChip>
      <HudChip class="tc-era-chip">
        🏛️ {{ currentEraName }}
      </HudChip>
      <HudChip
        variant="muted"
        class="tc-zone-chip"
      >
        📍 {{ currentZoneName }}
      </HudChip>
    </HudBar>

    <ThreePanelShell class="tc-body">
      <template #left>
        <section class="tc-left-block">
          <h3 class="tc-panel-title">
            Zones
          </h3>
          <ul class="tc-zone-list">
            <li
              v-for="z in zoneEntries"
              :key="z.id"
            >
              <button
                type="button"
                class="tc-zone-button"
                :class="{ active: z.active, locked: !z.unlocked }"
                :disabled="!z.unlocked"
                :title="z.unlocked ? z.description : 'Locked — unlocks in a later era'"
                @click="selectZone(z.id, z.unlocked)"
              >
                <span class="tc-zone-name">
                  <span
                    v-if="!z.unlocked"
                    aria-hidden="true"
                  >🔒 </span>{{ z.name }}
                </span>
                <span class="tc-zone-desc">{{ z.description }}</span>
              </button>
            </li>
          </ul>
        </section>

        <section class="tc-left-block tc-resource-section">
          <h3 class="tc-panel-title">
            Resources
          </h3>
          <div class="tc-resource-grid">
            <template
              v-for="group in resourceGroups"
              :key="group.name"
            >
              <div class="tc-resource-group-header">
                {{ group.name }}
              </div>
              <div
                v-for="row in group.rows"
                :key="row.id"
                class="tc-resource-row"
                :class="{ empty: row.count === '0' && !row.rateText }"
              >
                <span class="tc-resource-name">
                  <span class="tc-resource-icon">{{ row.icon }}</span>
                  <span class="tc-resource-label">{{ row.name }}</span>
                </span>
                <span class="tc-resource-values">
                  <span class="tc-resource-count">{{ row.count }}</span>
                  <span
                    v-if="row.capText"
                    class="tc-resource-cap"
                  >{{ row.capText }}</span>
                  <span
                    v-if="row.rateText"
                    class="tc-resource-rate"
                  >{{ row.rateText }}</span>
                </span>
              </div>
            </template>
          </div>
        </section>
      </template>

      <section class="tc-main">
        <h2 class="tc-main-title">
          {{ currentZoneName }}
        </h2>
        <p class="tc-main-hint">
          Gather what the land provides — by hand, or by posting bounties for idle workers.
        </p>
        <button
          type="button"
          class="tc-gather-button"
          @click="tc.gatherFood"
        >
          🌾 Gather Food
          <span class="tc-gather-sub">+1 food</span>
        </button>

        <div class="tc-bounty-panel">
          <h3 class="tc-panel-title">
            Post bounty
          </h3>
          <div class="tc-bounty-grid">
            <button
              v-for="b in bountyEntries"
              :key="b.type"
              type="button"
              class="tc-bounty-button"
              :class="{ locked: !b.available }"
              :disabled="!b.available"
              :title="b.available ? '' : b.gateLabel"
              @click="postBounty(b.type)"
            >
              <span class="tc-bounty-head">
                <span class="tc-bounty-icon">
                  <span
                    v-if="!b.available"
                    aria-hidden="true"
                  >🔒</span>
                  <span v-else>{{ b.icon }}</span>
                </span>
                <span class="tc-bounty-label">{{ b.label }}</span>
                <span
                  v-if="b.pending > 0"
                  class="tc-bounty-pending"
                  aria-label="pending bounties"
                >×{{ b.pending }}</span>
              </span>
              <span class="tc-bounty-reward">
                <span v-if="!b.available">{{ b.gateLabel }}</span>
                <span v-else>{{ b.reward }}</span>
              </span>
            </button>
          </div>
        </div>
      </section>

      <template #right>
        <div class="tc-right-block">
          <h3 class="tc-panel-title">
            Workers
          </h3>
          <ul class="tc-worker-list">
            <li
              v-for="w in workerViews"
              :key="w.id"
              class="tc-worker-card"
              :class="{
                idle: w.isIdle,
                pinned: w.pinnedTo != null,
                inactive: !w.isActive,
              }"
            >
              <div class="tc-worker-head">
                <span class="tc-worker-label">
                  <span
                    v-if="!w.isActive"
                    aria-hidden="true"
                  >🔒 </span>{{ w.label }}
                </span>
                <span
                  v-if="w.pinnedTo"
                  class="tc-worker-pin-badge"
                  :title="`Pinned to ${w.pinnedTo}`"
                >📌 {{ w.pinnedTo }}</span>
                <button
                  v-if="w.isActive && w.pinnedTo == null"
                  type="button"
                  class="tc-worker-recall"
                  :disabled="w.isIdle"
                  :title="w.isIdle ? 'Idle — nothing to recall' : 'Recall: return bounty to pool'"
                  @click="w.recall"
                >
                  Recall
                </button>
              </div>
              <div class="tc-worker-task">
                {{ w.currentLabel }}
              </div>
              <ProgressBar
                v-if="w.isActive"
                :value="w.percent"
                :max="1"
              />
            </li>
          </ul>
        </div>

        <Tabs
          v-model="activeRightTab"
          :items="rightTabs"
          class="tc-right-tabs"
        >
          <template #panel-buildings>
            <ul class="tc-building-list">
              <li
                v-for="b in buildingViews"
                :key="b.id"
                class="tc-building-card"
              >
                <div class="tc-building-head">
                  <span class="tc-building-icon">{{ b.icon }}</span>
                  <span class="tc-building-name">{{ b.name }}</span>
                  <span class="tc-building-count">×{{ b.ownedText }}</span>
                </div>
                <div class="tc-building-desc">
                  {{ b.description }}
                </div>
                <div class="tc-building-actions">
                  <button
                    type="button"
                    class="tc-building-buy"
                    :disabled="!b.canBuy"
                    :title="b.canBuy ? `Cost: ${b.costText}` : `Need: ${b.costText}`"
                    @click="buyBuilding(b.id)"
                  >
                    Build
                    <span class="tc-building-cost">{{ b.costText }}</span>
                  </button>
                  <button
                    v-if="b.pinnable && b.pinnedWorker == null"
                    type="button"
                    class="tc-building-pin"
                    :disabled="idleUnpinnedWorkerIds.length === 0 || b.owned.lte(0)"
                    :title="b.owned.lte(0) ? 'Build one first' : 'Pin an idle worker to this building'"
                    @click="pinFirstIdleTo(b.id)"
                  >
                    📌 Pin worker
                  </button>
                  <button
                    v-else-if="b.pinnable"
                    type="button"
                    class="tc-building-pin pinned"
                    :title="`Release ${b.pinnedWorker}`"
                    @click="unpinBuilding(b.id)"
                  >
                    Unpin {{ b.pinnedWorker }}
                  </button>
                </div>
              </li>
            </ul>
          </template>

          <template #panel-crafting>
            <p
              v-if="!hasWorkshop"
              class="tc-tab-hint"
            >
              Build a Workshop to unlock recipes.
            </p>
            <ul
              v-else
              class="tc-recipe-list"
            >
              <li
                v-for="r in recipeEntries"
                :key="r.id"
                class="tc-recipe-card"
              >
                <div class="tc-recipe-head">
                  <span class="tc-recipe-icon">{{ r.icon }}</span>
                  <span class="tc-recipe-name">{{ r.name }}</span>
                  <span class="tc-recipe-count">×{{ r.craftedText }}</span>
                </div>
                <div class="tc-recipe-desc">
                  {{ r.description }}
                </div>
                <div class="tc-recipe-costs">
                  <span class="tc-recipe-cost">{{ r.costText }}</span>
                  <span class="tc-recipe-output">{{ r.outputText }}</span>
                </div>
                <div class="tc-recipe-actions">
                  <button
                    type="button"
                    class="tc-recipe-craft"
                    :disabled="!r.canCraft"
                    @click="craftOnce(r.id)"
                  >
                    Craft
                  </button>
                  <button
                    type="button"
                    class="tc-recipe-craft-max"
                    :disabled="!r.canCraft"
                    :title="r.maxText ? `Craft ${r.maxText} now` : 'Need more resources'"
                    @click="craftMax(r.id)"
                  >
                    Craft max<span v-if="r.maxText"> ({{ r.maxText }})</span>
                  </button>
                </div>
              </li>
            </ul>
          </template>

          <template #panel-tech>
            <TinyCivTechPanel />
          </template>
        </Tabs>
      </template>
    </ThreePanelShell>
  </div>
</template>

<style scoped>
.tc-layout {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-height: 0;
  flex: 1;
}
.tc-era-chip {
  margin-left: auto;
  font-weight: 600;
}
.tc-zone-chip {
  margin-left: 0;
}
.tc-body {
  flex: 1;
  min-height: 0;
}

.tc-panel-title {
  margin: 0 0 var(--gap-sm);
  font-size: 0.95em;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tc-left-block + .tc-left-block {
  margin-top: var(--gap);
}

.tc-zone-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.tc-zone-button {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: var(--gap-sm);
  text-align: left;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  cursor: pointer;
}
.tc-zone-button:hover:not(:disabled) {
  border-color: var(--color-primary);
}
.tc-zone-button.active {
  border-color: var(--color-primary);
  background: var(--color-surface);
}
.tc-zone-button.locked {
  opacity: 0.5;
  cursor: not-allowed;
}
.tc-zone-name {
  font-weight: 600;
}
.tc-zone-desc {
  font-size: 0.8em;
  color: var(--color-text-muted);
  line-height: 1.3;
}

.tc-resource-section {
  min-height: 0;
}
.tc-resource-grid {
  display: flex;
  flex-direction: column;
  font-size: 0.85em;
}
.tc-resource-group-header {
  margin-top: var(--gap-sm);
  padding-top: 4px;
  font-size: 0.75em;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-top: 1px solid var(--color-border);
}
.tc-resource-group-header:first-child {
  margin-top: 0;
  border-top: none;
  padding-top: 0;
}
.tc-resource-row {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  padding: 1px 0;
  min-width: 0;
}
.tc-resource-row.empty {
  opacity: 0.45;
}
.tc-resource-name {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  flex: 1 1 auto;
  min-width: 0;
}
.tc-resource-icon {
  flex: 0 0 auto;
  width: 1.25em;
  text-align: center;
}
.tc-resource-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tc-resource-values {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
}
.tc-resource-count {
  min-width: 1.5em;
  text-align: right;
}
.tc-resource-cap {
  color: var(--color-text-muted);
}
.tc-resource-rate {
  color: var(--color-success, var(--color-primary));
}

.tc-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap);
  flex: 1;
  min-height: 0;
  text-align: center;
  padding-top: var(--gap);
}
.tc-main-title {
  margin: 0;
  font-size: 1.6em;
}
.tc-main-hint {
  margin: 0;
  color: var(--color-text-muted);
  max-width: 42ch;
}
.tc-gather-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--gap) calc(var(--gap) * 2);
  font-size: 1.2em;
  font-weight: 600;
  background: var(--color-surface);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius);
  color: var(--color-text);
  cursor: pointer;
}
.tc-gather-button:hover {
  background: var(--color-primary);
  color: var(--color-bg);
}
.tc-gather-button:active {
  transform: translateY(1px);
}
.tc-gather-sub {
  font-size: 0.7em;
  font-weight: 500;
  color: var(--color-text-muted);
}
.tc-gather-button:hover .tc-gather-sub {
  color: inherit;
  opacity: 0.8;
}

.tc-bounty-panel {
  width: 100%;
  max-width: 540px;
  margin-top: var(--gap-sm);
  text-align: left;
}
.tc-bounty-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--gap-sm);
}
.tc-bounty-button {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--gap-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}
.tc-bounty-button:hover:not(:disabled) {
  border-color: var(--color-primary);
}
.tc-bounty-button:active:not(:disabled) {
  transform: translateY(1px);
}
.tc-bounty-button.locked,
.tc-bounty-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.tc-bounty-head {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
}
.tc-bounty-icon {
  font-size: 1.1em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25em;
}
.tc-bounty-label {
  font-weight: 600;
}
.tc-bounty-pending {
  margin-left: auto;
  font-size: 0.8em;
  color: var(--color-text-muted);
}
.tc-bounty-reward {
  font-size: 0.8em;
  color: var(--color-text-muted);
}

.tc-right-block {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.tc-right-block + .tc-right-block {
  margin-top: var(--gap);
}

.tc-worker-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.tc-worker-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--gap-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}
.tc-worker-card.idle {
  opacity: 0.7;
}
.tc-worker-head {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
}
.tc-worker-label {
  font-weight: 600;
}
.tc-worker-recall {
  margin-left: auto;
  padding: 2px var(--gap-sm);
  font-size: 0.8em;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  cursor: pointer;
}
.tc-worker-recall:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-text);
}
.tc-worker-recall:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.tc-worker-task {
  font-size: 0.85em;
  color: var(--color-text-muted);
}

.tc-worker-card.pinned {
  border-color: var(--color-primary);
  opacity: 1;
}
.tc-worker-card.inactive {
  opacity: 0.5;
  border-style: dashed;
}
.tc-worker-card.inactive .tc-worker-task {
  font-style: italic;
}

.tc-right-tabs {
  flex: 1;
  min-height: 0;
}
.tc-right-block + .tc-right-tabs {
  margin-top: var(--gap);
}
.tc-tab-hint {
  margin: var(--gap-sm) 0 0;
  padding: var(--gap) var(--gap-sm);
  color: var(--color-text-muted);
  font-style: italic;
  text-align: center;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
}
.tc-worker-pin-badge {
  margin-left: auto;
  padding: 2px var(--gap-sm);
  font-size: 0.75em;
  background: var(--color-surface);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  color: var(--color-primary);
}

.tc-building-list,
.tc-recipe-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.tc-building-card,
.tc-recipe-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--gap-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}
.tc-building-head,
.tc-recipe-head {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
}
.tc-building-icon,
.tc-recipe-icon {
  font-size: 1.1em;
}
.tc-building-name,
.tc-recipe-name {
  font-weight: 600;
}
.tc-building-count,
.tc-recipe-count {
  margin-left: auto;
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.tc-building-desc,
.tc-recipe-desc {
  font-size: 0.8em;
  color: var(--color-text-muted);
  line-height: 1.3;
}
.tc-building-actions,
.tc-recipe-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap-sm);
  margin-top: 2px;
}
.tc-building-buy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 4px var(--gap-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.85em;
}
.tc-building-buy:hover:not(:disabled) {
  border-color: var(--color-primary);
}
.tc-building-buy:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.tc-building-cost {
  font-size: 0.8em;
  color: var(--color-text-muted);
}
.tc-building-pin {
  padding: 4px var(--gap-sm);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.85em;
}
.tc-building-pin:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-text);
}
.tc-building-pin:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.tc-building-pin.pinned {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.tc-recipe-costs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap-sm);
  font-size: 0.8em;
  color: var(--color-text-muted);
}
.tc-recipe-output {
  color: var(--color-primary);
  font-weight: 500;
}
.tc-recipe-craft,
.tc-recipe-craft-max {
  padding: 4px var(--gap-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.85em;
}
.tc-recipe-craft:hover:not(:disabled),
.tc-recipe-craft-max:hover:not(:disabled) {
  border-color: var(--color-primary);
}
.tc-recipe-craft:disabled,
.tc-recipe-craft-max:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.tc-recipe-craft-max {
  background: transparent;
  color: var(--color-text-muted);
}
</style>

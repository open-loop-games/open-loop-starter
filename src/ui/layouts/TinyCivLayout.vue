<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { ThreePanelShell } from '@/lib';
import { useModule } from '@/composables/useModule';
import { TinyCivKey } from '@/modules/mods/tiny-civ';
import {
  BOUNTY_DEFS,
  BOUNTY_REWARDS,
  BUILDING_DEFS,
  ZONE_DESCRIPTIONS,
  type BountyType,
  type BuildingId,
  type WorkerId,
} from '@/modules/mods/tiny-civ/content';
import HudBar from '@/ui/components/HudBar.vue';
import HudChip from '@/ui/components/HudChip.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';

const tc = useModule(TinyCivKey);

const food = computed(() => format(Decimal.floor(tc.food.value)));
const wood = computed(() => format(Decimal.floor(tc.wood.value)));
const stone = computed(() => format(Decimal.floor(tc.stone.value)));
const woodCap = computed(() => format(Decimal.floor(tc.woodStockpile.capacity.value)));
const stoneCap = computed(() => format(Decimal.floor(tc.stoneStockpile.capacity.value)));
const foodRate = computed(() => {
  const r = tc.foodPerSecond.value;
  return r.gt(0) ? `+${format(r, 1)}/s` : '';
});

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
    return {
      id: w.id,
      label: w.id.replace('worker-', 'Worker '),
      currentLabel: task?.label ?? (pinnedTo != null ? 'Idle (pinned)' : 'Idle'),
      isIdle: task == null,
      pinnedTo,
      percent: w.tracker.percentComplete.value,
      recall: w.recall,
    };
  }),
);

const BOUNTY_ORDER: BountyType[] = ['gather-food', 'gather-wood', 'gather-stone', 'explore-zone'];

const BOUNTY_ICONS: Record<BountyType, string> = {
  'gather-food': '🌾',
  'gather-wood': '🪵',
  'gather-stone': '🪨',
  'explore-zone': '🧭',
};

function rewardLabel(type: BountyType): string {
  const amount = BOUNTY_REWARDS[type];
  if (amount <= 0) return `${BOUNTY_DEFS[type].durationSec}s`;
  const suffix = type.replace('gather-', '');
  return `+${amount} ${suffix} · ${BOUNTY_DEFS[type].durationSec}s`;
}

const bountyEntries = computed(() =>
  BOUNTY_ORDER.map((type) => ({
    type,
    icon: BOUNTY_ICONS[type],
    label: BOUNTY_DEFS[type].label,
    reward: rewardLabel(type),
    pending: tc.workers.availableTasks.value.filter((t) => t === type).length,
  })),
);

const pendingTotal = computed(() => tc.workers.availableTasks.value.length);

function postBounty(type: BountyType) {
  tc.workers.postBounty(type);
}

const RESOURCE_LABELS = { food: 'food', wood: 'wood', stone: 'stone' } as const;

function formatCost(baseCosts: { resource: 'food' | 'wood' | 'stone'; amount: number }[], priceRatio: number, owned: Decimal): string {
  const scale = Decimal.pow(priceRatio, owned);
  return baseCosts
    .map((c) => `${format(Decimal.floor(Decimal.mul(c.amount, scale)))} ${RESOURCE_LABELS[c.resource]}`)
    .join(', ');
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
      ownedText: format(Decimal.floor(owned)),
      costText: formatCost(def.baseCosts, def.priceRatio, owned),
      canBuy: p?.canPurchase.value ?? false,
    };
  }),
);

const idleUnpinnedWorkerIds = computed<WorkerId[]>(() =>
  tc.workers.workers
    .filter(
      (w) => tc.workers.pinnedBy[w.id] == null && w.worker.currentTask.value == null,
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
</script>

<template>
  <div class="tc-layout">
    <HudBar>
      <HudChip variant="big">
        🌾 {{ food }} <span
          v-if="foodRate"
          class="tc-rate"
        >{{ foodRate }}</span>
      </HudChip>
      <HudChip>
        🪵 {{ wood }} / {{ woodCap }}
      </HudChip>
      <HudChip>
        🪨 {{ stone }} / {{ stoneCap }}
      </HudChip>
      <HudChip variant="muted">
        📋 {{ pendingTotal }} pending
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
              @click="postBounty(b.type)"
            >
              <span class="tc-bounty-head">
                <span class="tc-bounty-icon">{{ b.icon }}</span>
                <span class="tc-bounty-label">{{ b.label }}</span>
                <span
                  v-if="b.pending > 0"
                  class="tc-bounty-pending"
                  aria-label="pending bounties"
                >×{{ b.pending }}</span>
              </span>
              <span class="tc-bounty-reward">{{ b.reward }}</span>
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
              :class="{ idle: w.isIdle, pinned: w.pinnedTo != null }"
            >
              <div class="tc-worker-head">
                <span class="tc-worker-label">{{ w.label }}</span>
                <span
                  v-if="w.pinnedTo"
                  class="tc-worker-pin-badge"
                  :title="`Pinned to ${w.pinnedTo}`"
                >📌 {{ w.pinnedTo }}</span>
                <button
                  v-if="w.pinnedTo == null"
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
                :value="w.percent"
                :max="1"
              />
            </li>
          </ul>
        </div>
        <div class="tc-right-block">
          <h3 class="tc-panel-title">
            Buildings
          </h3>
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
        </div>
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
.tc-zone-chip {
  margin-left: auto;
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
.tc-bounty-button:hover {
  border-color: var(--color-primary);
}
.tc-bounty-button:active {
  transform: translateY(1px);
}
.tc-bounty-head {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
}
.tc-bounty-icon {
  font-size: 1.1em;
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

.tc-rate {
  margin-left: var(--gap-sm);
  font-size: 0.75em;
  color: var(--color-text-muted);
  font-weight: 500;
}

.tc-worker-card.pinned {
  border-color: var(--color-primary);
  opacity: 1;
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

.tc-building-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.tc-building-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--gap-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}
.tc-building-head {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
}
.tc-building-icon {
  font-size: 1.1em;
}
.tc-building-name {
  font-weight: 600;
}
.tc-building-count {
  margin-left: auto;
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.tc-building-desc {
  font-size: 0.8em;
  color: var(--color-text-muted);
  line-height: 1.3;
}
.tc-building-actions {
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
</style>

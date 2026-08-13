<!--
  ProducerGameView — the in-game subtree. Mounts under the root's post-start
  `v-else` frame, so engine module getters and injects are safe to read here.
  See `.claude/rules/app-root-discipline.md`.

  PHASE-3 SURFACE. This renders the game honestly but plainly, with hand-rolled
  rows. That is a story defect by the starter's own standard — `ProducerList`,
  `UpgradeGrid`, `ResourceHeaderStrip` and `ChainBreakdown` are the batteries
  this archetype exists to exercise, and adopting them is the UI pass. Until
  then this file is scaffolding, not an example to copy.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal } from '@open-loop/engine';
import { SidebarMainShell } from '@/lib';
import { useFormatting } from '@/composables/useFormatting';
import Button from '@/ui/components/Button.vue';
import PanelLayout from '@/ui/components/PanelLayout.vue';
import {
  DispatchKey,
  getClasses,
  getHeadlineRate,
  getMass,
  getRefinements,
  getRevisions,
  launch,
} from '../modules';
import { useModule } from '@/composables/useModule';

const { format } = useFormatting();
const mass = getMass();
const classes = getClasses();
const refinements = getRefinements();
const revisions = getRevisions();
const dispatch = useModule(DispatchKey);

const rate = computed(() => getHeadlineRate());
const massValue = computed(() => mass.value);

const fleetSize = computed(() =>
  classes
    .getAll()
    .reduce((total, entry) => Decimal.add(total, entry.producer.ownedCount.value), new Decimal(0)),
);

const classRows = computed(() =>
  classes.getAll().map((entry) => ({
    id: entry.def.id,
    name: entry.def.name,
    description: entry.def.description,
    count: entry.producer.ownedCount.value,
    rate: Decimal.mul(entry.producer.computedRate.value, entry.producer.ownedCount.value),
    cost: entry.producer.repeatable!.getCost(1),
    canBuy: entry.producer.repeatable!.canPurchase.value,
    visible:
      entry.def.revealAtFleetSize === undefined ||
      Decimal.gte(fleetSize.value, entry.def.revealAtFleetSize) ||
      Decimal.gte(entry.producer.ownedCount.value, 1),
    buy: () => entry.producer.repeatable!.purchase(1),
  })),
);

const refinementRows = computed(() =>
  refinements
    .getAll()
    .filter((entry) => entry.purchasable.visibility !== false && !entry.purchasable.active.value)
    .map((entry) => ({
      id: entry.def.id,
      name: entry.def.name,
      description: entry.def.description,
      cost: entry.def.cost,
      canBuy: entry.purchasable.canPurchase.value,
      buy: () => entry.purchasable.purchase(1),
    })),
);

const earnedRevisions = computed(() =>
  revisions.getAll().filter((entry) => entry.achievement.earned.value),
);
</script>

<template>
  <SidebarMainShell>
    <template #sidebarResources>
      <PanelLayout title="Swarm">
        <p class="producer-readout">
          <strong>{{ format(massValue) }}</strong> mass
        </p>
        <p class="producer-readout producer-readout--muted">{{ format(rate) }} / s</p>
        <p class="producer-readout producer-readout--muted">{{ format(fleetSize) }} probes</p>
      </PanelLayout>
    </template>

    <template #sidebar>
      <PanelLayout title="Hand-launch">
        <Button @click="launch()">Launch a probe</Button>
      </PanelLayout>

      <PanelLayout title="Dispatch">
        <p class="producer-readout producer-readout--muted">
          {{ dispatch.tiers.currentTierId.value }}
        </p>
        <Button
          :disabled="!dispatch.tiers.hasReached('assisted')"
          @click="dispatch.isActive.value = !dispatch.isActive.value"
        >
          {{ dispatch.isActive.value ? 'Dispatching' : 'Hand off allocation' }}
        </Button>
      </PanelLayout>

      <PanelLayout title="Revisions">
        <p class="producer-readout producer-readout--muted">{{ earnedRevisions.length }} pushed</p>
      </PanelLayout>
    </template>

    <PanelLayout title="Probe classes">
      <ul class="producer-list">
        <li v-for="row in classRows" v-show="row.visible" :key="row.id" class="producer-row">
          <span class="producer-row__name">{{ row.name }}</span>
          <span class="producer-row__count">{{ format(row.count) }}</span>
          <span class="producer-row__rate">{{ format(row.rate) }}/s</span>
          <Button :disabled="!row.canBuy" @click="row.buy()">
            {{ format(row.cost) }}
          </Button>
        </li>
      </ul>
    </PanelLayout>

    <PanelLayout title="Refinements">
      <ul class="producer-list">
        <li v-for="row in refinementRows" :key="row.id" class="producer-row">
          <span class="producer-row__name">{{ row.name }}</span>
          <span class="producer-row__rate">{{ row.description }}</span>
          <Button :disabled="!row.canBuy" @click="row.buy()">
            {{ format(row.cost) }}
          </Button>
        </li>
      </ul>
    </PanelLayout>
  </SidebarMainShell>
</template>

<style scoped>
.producer-readout {
  margin: 0 0 4px;
}
.producer-readout--muted {
  color: var(--color-text-muted);
  font-size: 0.9em;
}
.producer-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm, 6px);
}
.producer-row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: var(--gap, 10px);
}
.producer-row__count {
  font-variant-numeric: tabular-nums;
}
.producer-row__rate {
  color: var(--color-text-muted);
  font-size: 0.9em;
}
</style>

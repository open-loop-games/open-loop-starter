<!--
  Tech tree panel for Tiny Civilization (5f). Nine techs grouped by tier,
  rendered as vertical lists inside the right-sidebar tab. Each node is a
  button showing icon + name, with a RichTooltip carrying description,
  cost, and prereqs. Clicking a node purchases the tech; bought nodes stay
  visible with a checkmark. Gateway techs (Agriculture, Currency) get
  emphasized styling — they're the era-transition buttons.

  Era banner at the top shows the current era name. It updates through
  `tc.tech.era`; the toast-based transition notification is separate (see
  tech.ts installEraWatch).
-->
<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { TinyCivKey } from '@/modules/mods/tiny-civ';
import {
  ERA_NAMES,
  RESOURCE_DISPLAY,
  TECH_DEFS,
  type TechDef,
  type TechId,
} from '@/modules/mods/tiny-civ/content';
import RichTooltip from '@/ui/components/RichTooltip.vue';

const tc = useModule(TinyCivKey);

const techName = (id: TechId): string => TECH_DEFS.find((t) => t.id === id)?.name ?? id;

const TIER_HEADERS: Record<0 | 1 | 2, string> = {
  0: 'Gathering techs',
  1: 'Settlement techs',
  2: 'Commerce techs',
};

interface TechView {
  def: TechDef;
  bought: boolean;
  canPurchase: boolean;
  prereqsMet: boolean;
  costText: string;
  prereqNames: string[];
  statusLabel: string;
}

function viewFor(def: TechDef): TechView {
  const p = tc.tech.category.getPurchasable(def.id);
  const bought = p?.bought.value ?? false;
  const canPurchase = p?.canPurchase.value ?? false;
  const prereqsMet = def.prereqs.every(
    (pid) => tc.tech.category.getPurchasable(pid)?.bought.value ?? false,
  );
  const costText = def.costs
    .map((c) => `${format(new Decimal(c.amount), 0)} ${RESOURCE_DISPLAY[c.resource].name.toLowerCase()}`)
    .join(', ');
  const prereqNames = def.prereqs.map(techName);
  const statusLabel = bought
    ? 'Researched'
    : !prereqsMet
      ? 'Requires earlier techs'
      : canPurchase
        ? 'Ready to research'
        : 'Insufficient resources';
  return { def, bought, canPurchase, prereqsMet, costText, prereqNames, statusLabel };
}

const tierViews = computed(() =>
  ([0, 1, 2] as const).map((tier) => ({
    tier,
    name: TIER_HEADERS[tier],
    techs: TECH_DEFS.filter((d) => d.tier === tier).map(viewFor),
  })),
);

const currentEra = computed(() => tc.tech.era.value);
const currentEraName = computed(() => ERA_NAMES[currentEra.value]);

function purchase(id: TechId): void {
  const p = tc.tech.category.getPurchasable(id);
  if (p == null || !p.canPurchase.value) return;
  p.purchase(1);
}
</script>

<template>
  <div class="tc-tech-panel">
    <div
      class="tc-era-banner"
      :data-era="currentEra"
    >
      <span class="tc-era-label">Era</span>
      <span class="tc-era-name">{{ currentEraName }}</span>
    </div>
    <div class="tc-tech-tiers">
      <section
        v-for="tier in tierViews"
        :key="tier.tier"
        class="tc-tech-tier"
      >
        <h4 class="tc-tech-tier-header">
          {{ tier.name }}
        </h4>
        <ul class="tc-tech-list">
          <li
            v-for="t in tier.techs"
            :key="t.def.id"
          >
            <RichTooltip
              side="left"
              :side-offset="8"
            >
              <button
                type="button"
                class="tc-tech-node"
                :class="{
                  bought: t.bought,
                  gateway: t.def.gateway,
                  locked: !t.bought && !t.prereqsMet,
                  available: !t.bought && t.prereqsMet && t.canPurchase,
                  unaffordable: !t.bought && t.prereqsMet && !t.canPurchase,
                }"
                :disabled="t.bought || !t.canPurchase"
                :aria-label="`${t.def.name} — ${t.statusLabel}`"
                @click="purchase(t.def.id)"
              >
                <span class="tc-tech-icon">{{ t.def.icon }}</span>
                <span class="tc-tech-name">{{ t.def.name }}</span>
                <span class="tc-tech-status">
                  <span v-if="t.bought">✓</span>
                  <span v-else-if="!t.prereqsMet">🔒</span>
                </span>
              </button>
              <template #content>
                <div class="tc-tech-tip">
                  <div class="tc-tech-tip-head">
                    <span class="tc-tech-tip-icon">{{ t.def.icon }}</span>
                    <strong>{{ t.def.name }}</strong>
                    <span
                      v-if="t.def.gateway"
                      class="tc-tech-tip-gateway"
                    >Gateway</span>
                  </div>
                  <p class="tc-tech-tip-desc">
                    {{ t.def.description }}
                  </p>
                  <p class="tc-tech-tip-line">
                    <span class="tc-tech-tip-key">Cost</span>
                    <span class="tc-tech-tip-val">{{ t.costText }}</span>
                  </p>
                  <p
                    v-if="t.prereqNames.length"
                    class="tc-tech-tip-line"
                  >
                    <span class="tc-tech-tip-key">Requires</span>
                    <span class="tc-tech-tip-val">{{ t.prereqNames.join(' + ') }}</span>
                  </p>
                  <p class="tc-tech-tip-status">
                    {{ t.statusLabel }}
                  </p>
                </div>
              </template>
            </RichTooltip>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.tc-tech-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-height: 0;
}
.tc-era-banner {
  display: flex;
  align-items: baseline;
  gap: var(--gap-sm);
  padding: var(--gap-sm) var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-primary);
  border-radius: var(--radius-sm);
}
.tc-era-label {
  font-size: 0.75em;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.tc-era-name {
  font-weight: 700;
  font-size: 1.05em;
}

.tc-tech-tiers {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
.tc-tech-tier-header {
  margin: 0 0 var(--gap-sm);
  font-size: 0.75em;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.tc-tech-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.tc-tech-node {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  width: 100%;
  padding: var(--gap-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.tc-tech-node:hover:not(:disabled) {
  border-color: var(--color-primary);
}
.tc-tech-node.available {
  border-color: var(--color-primary);
  box-shadow: inset 0 0 0 1px var(--color-primary);
}
.tc-tech-node.unaffordable {
  opacity: 0.75;
}
.tc-tech-node.locked {
  opacity: 0.5;
  cursor: not-allowed;
}
.tc-tech-node.bought {
  opacity: 0.65;
  border-color: var(--color-success, var(--color-primary));
  cursor: default;
}
.tc-tech-node.gateway:not(.bought) {
  background: var(--color-surface);
  border-style: dashed;
}
.tc-tech-node.gateway.bought {
  background: var(--color-surface);
  border-style: solid;
}
.tc-tech-icon {
  flex: 0 0 auto;
  font-size: 1.15em;
  width: 1.25em;
  text-align: center;
}
.tc-tech-name {
  flex: 1 1 auto;
  font-weight: 600;
}
.tc-tech-status {
  flex: 0 0 auto;
  color: var(--color-text-muted);
  font-size: 0.9em;
}
.tc-tech-node.bought .tc-tech-status {
  color: var(--color-success, var(--color-primary));
  font-weight: 700;
}

.tc-tech-tip {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  min-width: 200px;
}
.tc-tech-tip-head {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
}
.tc-tech-tip-icon {
  font-size: 1.2em;
}
.tc-tech-tip-gateway {
  margin-left: auto;
  padding: 1px var(--gap-sm);
  font-size: 0.7em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--color-primary);
  color: var(--color-bg);
  border-radius: var(--radius-sm);
}
.tc-tech-tip-desc {
  margin: 0;
  font-size: 0.9em;
  color: var(--color-text-muted);
  line-height: 1.4;
}
.tc-tech-tip-line {
  margin: 0;
  display: flex;
  gap: var(--gap-sm);
  font-size: 0.85em;
}
.tc-tech-tip-key {
  flex: 0 0 auto;
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.85em;
}
.tc-tech-tip-val {
  color: var(--color-text);
}
.tc-tech-tip-status {
  margin: 0;
  padding-top: var(--gap-sm);
  border-top: 1px solid var(--color-border);
  font-size: 0.85em;
  font-style: italic;
  color: var(--color-text-muted);
}
</style>

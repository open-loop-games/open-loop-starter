<script setup lang="ts">
import Button from '@/ui/components/Button.vue';
import { computed } from 'vue';
import { Decimal } from '@open-loop/engine';
import { getMeta, getNight } from '../../modules';
import { NOTES } from '../../data';
import { GRAPEVINE_PER_LEVEL, NERVE_PER_LEVEL, SPEED_STEPS } from '../../data';
import { whole } from '../format';

const meta = getMeta();
const night = getNight();

function effect(id: string, owned: number): string {
  switch (id) {
    case 'steel-nerves':
      return `nights last ${night.maxNerve.value.toFixed(0)}s → ${(night.maxNerve.value + NERVE_PER_LEVEL).toFixed(0)}s`;
    case 'grapevine':
      return `all moves ×${(1 + GRAPEVINE_PER_LEVEL * owned).toFixed(1)} → ×${(1 + GRAPEVINE_PER_LEVEL * (owned + 1)).toFixed(1)}`;
    case 'deja-vu':
      return owned + 1 < SPEED_STEPS.length
        ? `unlocks a ×${SPEED_STEPS[owned + 1]} clock`
        : 'every clock unlocked';
    case 'routine':
      return 'automation: begins each night';
    case 'discipline':
      return 'automation: turns in when the plan is spent';
    default:
      return '';
  }
}

const items = computed(() =>
  NOTES.map((def) => {
    const p = meta.notes.getPurchasable(def.id)!;
    const owned = new Decimal(p.count.value).toNumber();
    return {
      def,
      p,
      owned,
      visible: p.visible.value,
      maxed: p.maxed.value,
      can: p.canPurchase.value,
      cost: new Decimal(p.getCost(1)).toNumber(),
      effect: effect(def.id, owned),
    };
  }).filter((x) => x.visible),
);
</script>

<template>
  <section class="lo-panel" aria-label="Notes under the bunk">
    <h2>Notes Under the Bunk</h2>
    <p class="lo-hint">Intel is what a night teaches you. Spend it on what the next night keeps.</p>
    <div
      v-for="it in items"
      :key="it.def.id"
      class="lo-buy lo-reveal"
      :class="{ can: it.can, maxed: it.maxed }"
    >
      <div class="lo-buy-body">
        <div class="lo-buy-head">
          <span class="lo-buy-name">{{ it.def.displayName }}</span>
          <span v-if="it.owned > 0" class="lo-buy-owned lo-num">{{ it.owned }}</span>
        </div>
        <div class="lo-buy-desc">{{ it.def.description }}</div>
        <div class="lo-buy-effect">{{ it.effect }}</div>
      </div>
      <Button
        class="lo-buy-btn lo-num"
        :disabled="!it.can"
        :aria-label="`Buy ${it.def.displayName}`"
        @click="it.p.purchase(1)"
      >
        <template v-if="it.maxed">owned</template>
        <template v-else>{{ whole(it.cost) }} Intel</template>
      </Button>
    </div>
  </section>
</template>

<style scoped>
.lo-hint {
  margin: -4px 0 8px;
  font-size: 13px;
  color: var(--lo-ink-faded);
}
.lo-buy {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 7px 0;
  border-top: 1px solid var(--lo-concrete-edge);
}
.lo-buy-body {
  flex: 1;
}
.lo-buy-head {
  display: flex;
  gap: 8px;
  align-items: baseline;
}
.lo-buy-name {
  font-family: var(--lo-face-stencil);
  letter-spacing: 0.05em;
  color: var(--lo-ink-faded);
}
.lo-buy.can .lo-buy-name {
  color: var(--lo-sodium);
}
.lo-buy.maxed .lo-buy-name {
  color: var(--lo-guard-lamp);
}
.lo-buy-owned {
  font-size: 12px;
  color: var(--lo-searchlight);
  border: 1px solid var(--lo-concrete-edge);
  padding: 0 5px;
}
.lo-buy-desc {
  font-size: 13px;
  color: var(--lo-chalk);
}
.lo-buy-effect {
  font-size: 12px;
  color: var(--lo-ink-faded);
}
.lo-buy-btn {
  flex: none;
  min-width: 7.5em;
  padding: 6px 8px;
  border-radius: 2px;
  cursor: pointer;
  font-size: 13px;
  background: var(--lo-sodium);
  color: var(--lo-night);
  border: 1px solid var(--lo-sodium);
}
.lo-buy-btn:disabled {
  cursor: default;
  background: transparent;
  color: var(--lo-ink-faded);
  border: 1px dashed var(--lo-concrete-edge);
}
.lo-buy.maxed .lo-buy-btn {
  color: var(--lo-guard-lamp);
  border: 1px solid var(--lo-guard-lamp-dim);
}
</style>

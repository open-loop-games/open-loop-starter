<!--
  ShopPanel — a prestige layer's shop on starter's `UpgradeGrid`, each card drawn
  in the `#card` slot as a comic panel. Legacy's shop is signal yellow and goes
  with a Rewrite; Continuity's is orbit teal and stays. A levelled upgrade
  (Hero Training, Mythic Standing) shows its level and never reads as owned.
-->
<script setup lang="ts">
import { computed, type ComputedRef } from 'vue';
import type { DecimalSource, Purchasable } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { UpgradeGrid, type UpgradeCardData } from '@/ui/compositions';
import { CONTINUITY_UPGRADES, LEGACY_UPGRADES } from '../../data';
import { getContinuity, getLegacy } from '../../modules';
import { fmt } from '../format';

const props = defineProps<{ kind: 'legacy' | 'continuity' }>();

const legacy = getLegacy();
const continuity = getContinuity();
const currency = props.kind === 'legacy' ? 'Legacy' : 'Continuity';
const held = computed(() =>
  props.kind === 'legacy' ? legacy.legacy.value : continuity.continuity.value,
);

interface Item {
  /** Levelled rather than bought once. */
  leveled: boolean;
  level: ComputedRef<DecimalSource>;
}

function card(
  def: { id: string; displayName: string; description: string; price?: number },
  p: Purchasable,
): UpgradeCardData<Item> {
  const leveled = def.price === undefined;
  return {
    id: def.id,
    displayName: def.displayName,
    description: def.description,
    cost: computed(() => p.getCost(1)),
    costLabel: currency,
    canPurchase: p.canPurchase,
    owned: computed(() => !leveled && p.active.value),
    purchase: () => p.purchase(1),
    extra: { leveled, level: computed(() => p.count.value) },
  };
}

const cards: UpgradeCardData<Item>[] =
  props.kind === 'legacy'
    ? LEGACY_UPGRADES.map((def) => card(def, legacy.upgrade(def.id)))
    : CONTINUITY_UPGRADES.map((def) => card(def, continuity.upgrade(def.id)));
</script>

<template>
  <section class="panel shop" :class="kind">
    <span class="caption" :class="{ orbit: kind === 'continuity' }">
      {{
        kind === 'legacy'
          ? 'Legacy — the city remembers'
          : 'Continuity — the myth outlives the hero'
      }}
    </span>
    <p class="lede">
      Held: <b class="num">{{ fmt(held) }}</b> {{ currency }}.
      <template v-if="kind === 'legacy'">
        Spent Legacy still counts toward the Legacy bonus; a Rewrite takes the shop back.
      </template>
      <template v-else>
        Spent Continuity still multiplies the corps; nothing ever takes it back.
      </template>
    </p>
    <UpgradeGrid :cards="cards" :columns="3" reveal="inline">
      <template #card="{ card: c }">
        <div class="item" :class="{ owned: c.owned.value, ready: c.canPurchase.value }">
          <div class="title">
            {{ c.displayName }}
            <span v-if="c.extra!.leveled" class="lvl num">Lv {{ fmt(c.extra!.level.value) }}</span>
          </div>
          <p class="desc">{{ c.description }}</p>
          <div v-if="c.owned.value" class="stamp owned-stamp">Owned</div>
          <Button
            v-else
            class="act"
            :class="{ orbit: kind === 'continuity' }"
            :disabled="!c.canPurchase.value"
            :data-testid="`buy-${c.id}`"
            @click="c.purchase()"
          >
            Buy · <span class="num">{{ fmt(c.cost.value) }}</span> {{ currency }}
          </Button>
        </div>
      </template>
    </UpgradeGrid>
  </section>
</template>

<style scoped>
.lede b {
  color: var(--signal);
}
.continuity .lede b {
  color: var(--orbit);
}
.shop :deep(.upgrade-grid) {
  gap: 12px;
}
.item {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--night-raised);
  border: 2px solid var(--gutter-ink);
  border-top: 5px solid var(--newsprint-faint);
  padding: 10px 12px;
}
.item.ready {
  border-top-color: var(--signal);
}
.continuity .item.ready {
  border-top-color: var(--orbit);
}
.item.owned {
  border-top-color: var(--steel);
  opacity: 0.75;
}
.title {
  font-family: var(--face-caption);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
}
.lvl {
  color: var(--signal);
}
.desc {
  margin: 0;
  flex: 1;
  font-size: 13px;
  color: var(--newsprint-dim);
  line-height: 1.4;
}
.owned-stamp {
  align-self: flex-start;
  color: var(--steel);
}
</style>

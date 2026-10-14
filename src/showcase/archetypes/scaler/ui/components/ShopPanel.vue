<!--
  ShopPanel — a prestige layer's shop on starter's `UpgradeGrid`, each card drawn
  in the `#card` slot as a comic panel. Legacy's shop is signal yellow and goes
  with a Rewrite; Continuity's is orbit teal and goes with an Age, but for the
  automation and the Archives; Canon's is foil violet and stays. A levelled
  upgrade (Hero Training, Mythic Standing, Succession Drills) shows its level and
  never reads as owned; at its limit it reads as maxed.
-->
<script setup lang="ts">
import { computed, type ComputedRef } from 'vue';
import type { DecimalSource, Purchasable } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { UpgradeGrid, type UpgradeCardData } from '@/ui/compositions';
import { CANON_UPGRADES, CONTINUITY_UPGRADES, LEGACY_UPGRADES } from '../../data';
import { getCanon, getContinuity, getLegacy } from '../../modules';
import { fmt } from '../format';

const props = defineProps<{ kind: 'legacy' | 'continuity' | 'canon' }>();

const legacy = getLegacy();
const continuity = getContinuity();
const canon = getCanon();
const LAYER = {
  legacy: {
    currency: 'Legacy',
    ink: '',
    caption: 'Legacy — the city remembers',
    lede: 'Spent Legacy still counts toward the Legacy bonus; a Rewrite takes the shop back.',
  },
  continuity: {
    currency: 'Continuity',
    ink: 'orbit',
    caption: 'Continuity — the myth outlives the hero',
    lede: 'Spent Continuity still multiplies the corps; an Age takes the shop back, but for the automation and the Archives.',
  },
  canon: {
    currency: 'Canon',
    ink: 'foil',
    caption: 'Canon — what every age agrees on',
    lede: 'Spent Canon still multiplies the corps and every Rewrite; nothing takes it back.',
  },
} as const;
const layer = LAYER[props.kind];
const held = computed(() =>
  props.kind === 'legacy'
    ? legacy.legacy.value
    : props.kind === 'continuity'
      ? continuity.continuity.value
      : canon.canon.value,
);

interface Item {
  /** Levelled rather than bought once. */
  leveled: boolean;
  level: ComputedRef<DecimalSource>;
  /** A levelled upgrade at its limit. */
  maxed: ComputedRef<boolean>;
  visible: ComputedRef<boolean>;
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
    costLabel: layer.currency,
    canPurchase: p.canPurchase,
    owned: computed(() => !leveled && p.active.value),
    purchase: () => p.purchase(1),
    extra: {
      leveled,
      level: computed(() => p.count.value),
      maxed: computed(() => leveled && p.maxed.value),
      visible: computed(() => p.visible.value),
    },
  };
}

const all: UpgradeCardData<Item>[] =
  props.kind === 'legacy'
    ? LEGACY_UPGRADES.map((def) => card(def, legacy.upgrade(def.id)))
    : props.kind === 'continuity'
      ? CONTINUITY_UPGRADES.map((def) => card(def, continuity.upgrade(def.id)))
      : CANON_UPGRADES.map((def) => card(def, canon.upgrade(def.id)));
const cards = computed(() => all.filter((c) => c.extra!.visible.value));
</script>

<template>
  <section class="panel shop" :class="kind">
    <span class="caption" :class="layer.ink">{{ layer.caption }}</span>
    <p class="lede">
      Held: <b class="num">{{ fmt(held) }}</b> {{ layer.currency }}. {{ layer.lede }}
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
          <div v-else-if="c.extra!.maxed.value" class="stamp owned-stamp">Maxed</div>
          <Button
            v-else
            class="act"
            :class="layer.ink"
            :disabled="!c.canPurchase.value"
            :data-testid="`buy-${c.id}`"
            @click="c.purchase()"
          >
            Buy · <span class="num">{{ fmt(c.cost.value) }}</span> {{ layer.currency }}
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
.canon .lede b {
  color: var(--foil);
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
.canon .item.ready {
  border-top-color: var(--foil);
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
  white-space: nowrap;
}
.continuity .lvl {
  color: var(--orbit);
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

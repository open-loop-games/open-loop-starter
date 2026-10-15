<!--
  ShelfPanel — the techniques, on starter's `UpgradeGrid`. Each teaches words of the kata
  language; a challenger's arrival puts its answer on the shelf, and the rest wait for
  challengers who have not come. A technique named from the scroll (an unlearned word's
  link) is lit and brought into view.
-->
<script setup lang="ts">
import { computed, nextTick, watch } from 'vue';
import { Decimal } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { UpgradeGrid, createPurchasableCard } from '@/ui/compositions';
import { TECHNIQUES, challenger, type TechniqueDef, type TechniqueId } from '../../data';
import { getDojo } from '../../modules';
import { fmt } from '../format';

const props = defineProps<{ focus: TechniqueId | null }>();
const dojo = getDojo();

interface Shelf {
  def: TechniqueDef;
}

const cards = TECHNIQUES.map((def) =>
  createPurchasableCard<Shelf>(dojo.techniques.getPurchasable(def.id)!, {
    displayName: def.displayName,
    purchase: () => void dojo.learn(def.id),
    extra: { def },
  }),
);
const unseen = computed(() => cards.filter((c) => !c.unlocked!.value).length);

watch(
  () => props.focus,
  async (id) => {
    if (!id) return;
    await nextTick();
    document
      .querySelector(`[data-technique="${id}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  },
);
</script>

<template>
  <section class="if-panel shelf" aria-label="The shelf of techniques">
    <h2 class="if-title">The shelf <small>words the student can learn</small></h2>
    <UpgradeGrid :cards="cards" reveal="inline">
      <template #card="{ card }">
        <article
          class="technique if-reveal"
          :data-technique="card.id"
          :class="{
            learned: card.owned.value,
            can: !card.owned.value && card.canPurchase.value,
            focus: props.focus === card.id,
          }"
        >
          <div class="head">
            <span class="name"
              >{{ card.displayName
              }}<span v-if="card.owned.value" class="stamp"> · learned</span></span
            >
            <code class="words">{{ card.extra!.def.words }}</code>
          </div>
          <p v-if="!card.owned.value" class="lore">{{ card.extra!.def.lore }}</p>
          <p v-if="card.extra!.def.answers && !card.owned.value" class="answers">
            Answers {{ challenger(card.extra!.def.answers).displayName }}.
          </p>
          <div v-if="!card.owned.value" class="act">
            <span v-if="card.unmet!.value.length" class="blocked">{{
              card.unmet!.value.join(' · ')
            }}</span>
            <Button
              v-else
              class="learn"
              :disabled="!card.canPurchase.value"
              :data-testid="`learn-${card.id}`"
              @click="card.purchase()"
            >
              Learn <span class="num">{{ fmt(card.cost.value) }}</span> Ki
            </Button>
            <span
              v-if="
                !card.owned.value &&
                !card.unmet!.value.length &&
                Decimal.lt(dojo.ki.value, card.cost.value)
              "
              class="short num"
            >
              {{ fmt(Decimal.sub(card.cost.value, dojo.ki.value)) }} short
            </span>
          </div>
        </article>
      </template>
    </UpgradeGrid>
    <p v-if="unseen" class="unseen">{{ unseen }} more wait for challengers who have not come.</p>
  </section>
</template>

<style scoped>
.shelf :deep(.upgrade-grid) {
  gap: 8px;
}
.technique {
  border-left: 3px solid var(--if-lacquer-edge);
  padding: 6px 0 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.technique.can {
  border-left-color: var(--if-lamplight);
}
.technique.learned {
  border-left-color: var(--if-indigo-deep);
  opacity: 0.8;
}
.technique.focus {
  background: var(--if-lamplight-soft);
}
.head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: baseline;
}
.name {
  font-size: 15px;
}
.words {
  font: 12px var(--if-face);
  color: var(--if-washi);
  background: var(--if-lacquer);
  border: 1px solid var(--if-lacquer-edge);
  padding: 0 6px;
  white-space: nowrap;
}
.lore,
.answers {
  margin: 0;
  font-size: 13px;
  color: var(--if-tatami);
}
.answers {
  color: var(--if-amber);
}
.act {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}
.stamp {
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--if-indigo);
}
.blocked,
.short {
  font-size: 12px;
  color: var(--if-tatami-dim);
}
.learn {
  font: 12px var(--if-face);
  color: var(--if-tatami-dim);
  background: transparent;
  border: 1px solid var(--if-lacquer-edge);
  padding: 2px 10px;
  cursor: pointer;
}
.technique.can .learn {
  color: var(--if-lamplight);
  border-color: var(--if-lamplight);
}
.technique.can .learn:hover {
  background: var(--if-lamplight-soft);
}
.unseen {
  margin: 0;
  font-size: 12px;
  color: var(--if-tatami-dim);
}
</style>

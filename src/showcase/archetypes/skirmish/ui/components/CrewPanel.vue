<!--
  CrewPanel — the lieutenants, hired mid-job for scrip the army does not get. An UpgradeGrid
  over `createPurchasableCard`, one card per lieutenant, rendered through the `#card` slot:
  until hired, a BuyCard priced like a training floor and locked on the hire before it;
  once hired, the lieutenant at work, with starter's Switch over the flag that benches them.
-->
<script setup lang="ts">
import Switch from '@/ui/components/Switch.vue';
import { UpgradeGrid, createPurchasableCard, readPriceLines } from '@/ui/compositions';
import { getAutomation, type Lieutenant } from '../../modules';
import { firstName } from '../handled-by';
import BuyCard from './BuyCard.vue';

const auto = getAutomation();

const cards = auto.lieutenants.map((l, i) => {
  const before = auto.lieutenants[i - 1];
  return createPurchasableCard<Lieutenant>(l.hire, {
    displayName: l.def.name,
    description: l.def.does,
    ...(before ? { prerequisite: `hire ${firstName(before)} first` } : {}),
    extra: l,
  });
});
</script>

<template>
  <section class="crew" aria-label="Crew">
    <h2 class="cc-title">Crew</h2>
    <UpgradeGrid :cards="cards" reveal="inline">
      <template #card="{ card, description }">
        <div v-if="card.owned.value" class="lt">
          <div class="lt__head">
            <span class="lt__name">{{ card.displayName }}</span>
            <Switch
              v-model="card.extra!.enabled.value"
              class="cc-switch--ice"
              :aria-label="`${card.displayName} on the job`"
            >
              <template #default="{ on }">{{ on ? 'On the job' : 'Benched' }}</template>
            </Switch>
          </div>
          <span class="lt__does">{{ description }}</span>
        </div>
        <BuyCard
          v-else
          :title="card.displayName"
          :note="description"
          :prices="readPriceLines(card.extra!.hire)"
          :can="card.canPurchase.value"
          :locked="card.unmet.value[0]"
          @buy="card.purchase()"
        />
      </template>
    </UpgradeGrid>
  </section>
</template>

<style scoped>
.crew {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
/* A lieutenant at work: ICE-teal, their hands on the controls. */
.lt {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border: 1px solid var(--cc-gutter);
  border-left: 3px solid var(--cc-ice);
  border-radius: var(--cc-notch);
  background: var(--cc-asphalt-raised);
}
.lt__head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.lt__name {
  font-family: var(--cc-face-tag);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--cc-ice);
}
.lt__does {
  font-size: 11.5px;
  color: var(--cc-chalk-dim);
}
</style>

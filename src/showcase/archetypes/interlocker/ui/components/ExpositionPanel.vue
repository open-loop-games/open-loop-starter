<!--
  ExpositionPanel — the pavilion and the charters. The pavilion shows the hangar against
  the threshold, the renown staging would earn, and the renown held and earned; staging
  asks first on the modal stack. The charters adopt UpgradeGrid through its `#card` slot,
  priced in renown and kept across every Exposition.
-->
<script setup lang="ts">
import { computed, inject } from 'vue';
import { toNumber } from '@open-loop/engine';
import { modalStackKey } from '@/lib';
import Button from '@/ui/components/Button.vue';
import UpgradeGrid from '@/ui/compositions/UpgradeGrid.vue';
import type { UpgradeCardData } from '@/ui/compositions';
import { CHARTERS, PATENT_POOL, RENOWN_OUTPUT_STEP, RESEARCH } from '../../data';
import { getEmpire, getExposition, getWorks } from '../../modules';
import { clock } from '../format';
import StageConfirm from './StageConfirm.vue';

const works = getWorks();
const empire = getEmpire();
const expo = getExposition();
const stack = inject(modalStackKey)!;

const planes = computed(() => Math.floor(toNumber(works.res.aeroplanes.value)));
const held = computed(() => toNumber(empire.renown.value));
const lifetime = empire.lifetimeRenown;
const poolNames = PATENT_POOL.map((id) => RESEARCH.find((r) => r.id === id)!.name);

function stage(): void {
  const id = stack.push(
    StageConfirm,
    {
      renown: expo.gain.value,
      planes: planes.value,
      kept: empire.holds('patents').value ? poolNames : [],
      onStage: () => {
        stack.remove(id);
        expo.stage();
      },
      onCancel: () => stack.remove(id),
    },
    'sm',
  );
}

const charters: UpgradeCardData[] = CHARTERS.map((def) => {
  const p = empire.charters.getPurchasable(def.id)!;
  return {
    id: def.id,
    displayName: def.name,
    description: def.blurb,
    cost: computed(() => def.cost),
    costLabel: 'renown',
    canPurchase: p.canPurchase,
    owned: p.active,
    purchase: () => p.purchase(1),
  };
});
</script>

<template>
  <div class="ae-expo">
    <section class="pavilion">
      <h3 class="ae-section-head">Exposition Universelle</h3>
      <p class="lede">
        Show the Emperor a hangar of aeroplanes and the works are rebuilt from the ground with his
        renown behind them. Every renown earned lifts each raw building's yield by
        {{ Math.round(RENOWN_OUTPUT_STEP * 100) }}%, and buys charters that outlast every
        Exposition.
      </p>
      <dl class="figures">
        <div>
          <dt>In the hangar</dt>
          <dd class="ae-figure">
            {{ planes }} <span class="of">/ {{ expo.threshold.value }} to exhibit</span>
          </dd>
        </div>
        <div>
          <dt>Renown on staging</dt>
          <dd class="ae-figure">{{ expo.gain.value }}</dd>
        </div>
        <div>
          <dt>Renown held · earned</dt>
          <dd class="ae-figure">
            {{ held }} · {{ lifetime }}
            <span class="of">(×{{ (1 + RENOWN_OUTPUT_STEP * lifetime).toFixed(1) }} yield)</span>
          </dd>
        </div>
        <div>
          <dt>Expositions · these works</dt>
          <dd class="ae-figure">
            {{ expo.cycle.count.value }} · {{ clock(expo.cycle.elapsed.value) }}
          </dd>
        </div>
      </dl>
      <Button
        class="ae-act stage"
        :class="{ can: expo.canStage.value }"
        :disabled="!expo.canStage.value"
        @click="stage"
        >Stage the Exposition</Button
      >
    </section>

    <section class="charters">
      <h3 class="ae-section-head">Imperial charters</h3>
      <UpgradeGrid :cards="charters" :columns="1" reveal="inline">
        <template #card="{ card }">
          <article class="charter" :class="{ held: card.owned.value, can: card.canPurchase.value }">
            <header>
              <span class="name">{{ card.displayName }}</span>
              <span class="price ae-figure">{{ card.cost.value }} renown</span>
            </header>
            <p>{{ card.description }}</p>
            <div v-if="card.owned.value" class="ae-stamp">Granted</div>
            <Button
              v-else
              class="ae-act"
              :class="{ can: card.canPurchase.value }"
              :disabled="!card.canPurchase.value"
              @click="card.purchase()"
              >Petition</Button
            >
          </article>
        </template>
      </UpgradeGrid>
    </section>
  </div>
</template>

<style scoped>
.ae-expo {
  display: grid;
  grid-template-columns: minmax(18rem, 1.1fr) minmax(16rem, 1fr);
  gap: 18px;
  align-items: start;
}
.pavilion {
  border: 1px solid var(--ae-cyanotype-rule);
  background: var(--ae-cyanotype);
  padding: 14px 16px;
}
.lede {
  margin: 0 0 14px;
  color: var(--ae-drafting-line);
  font-size: 0.92rem;
}
.figures {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
  margin: 0 0 16px;
}
dt {
  font-family: var(--ae-face-lettering);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.68rem;
  color: var(--ae-drafting-line-faint);
}
dd {
  margin: 2px 0 0;
  font-size: 1.35rem;
  color: var(--ae-chalk);
}
.of {
  font-size: 0.8rem;
  color: var(--ae-drafting-line-faint);
}
.stage {
  width: 100%;
  padding: 9px;
  font-size: 13px;
}
.charter {
  flex: 1;
  border: 1px solid var(--ae-cyanotype-rule);
  padding: 9px 11px;
  background: var(--ae-cyanotype);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.charter.can {
  border-color: var(--ae-brass-dim);
}
.charter.held {
  background: transparent;
}
.charter header {
  display: flex;
  justify-content: space-between;
}
.name {
  color: var(--ae-chalk);
}
.price {
  color: var(--ae-slate);
  font-size: 0.86rem;
}
.can .price {
  color: var(--ae-brass);
}
.charter p {
  margin: 0 0 4px;
  font-size: 0.88rem;
  color: var(--ae-drafting-line);
}
.charter .ae-act {
  align-self: flex-start;
}
</style>

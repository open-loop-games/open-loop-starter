<!--
  HouseCard — a selected safehouse in the command card. Yours: the units at the gates,
  the gate guns you buy on it, and the crew's tier. The rival's: what the astral scout
  last saw inside, its gate guns, and what kind of outfit holds it, from the contract.

  Both read their turret level as the smallest siege that razes them: what an assault on
  theirs must bring, and what yours makes the rival bring.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { readPriceLines } from '@/ui/compositions';
import { GATE_GUNS } from '../../data/buildings';
import { PLAYER_PERSONA } from '../../data/contracts';
import { siegeUnits } from '../../data/spine';
import { UNIT_KINDS } from '../../data/units';
import { getMatch } from '../../modules';
import type { Counts } from '../../modules/battle';
import { readyUnits } from '../../modules/orders';
import { useHandledBy } from '../handled-by';
import { clock, rate } from '../format';
import BuyCard from './BuyCard.vue';
import SquadChips from './SquadChips.vue';

const props = defineProps<{ side: 'p' | 'e' }>();
const match = getMatch();
const { p, e } = match;
/** The units that hold the gates: whole ones only, as the siege counts them. */
const home = computed(
  () => Object.fromEntries(UNIT_KINDS.map((k) => [k, readyUnits(p, k)])) as Counts,
);
const rivalHome = computed(() => match.safehouseSighting.value);
const scouting = computed(() => match.scoutLeft.value > 0);
const levels = computed(() => match.tune.turretLevels.value);

// ─── Gate guns ───
const quartermaster = useHandledBy('quartermaster');
const gunsMaxed = computed(() => p.gateGuns.maxed.value);
const gunsNote = computed(() => {
  const now = p.turretLevel();
  const reach = gunsMaxed.value
    ? `${siegeUnits(now)}`
    : `${siegeUnits(now)} → ${siegeUnits(now + 1)}`;
  return `Turret ${rate(p.turretDps())} dps. A siege needs ${reach} units.`;
});
/** The quartermaster mans the guns up to the level his persona stands at. */
const gunsBy = computed(() =>
  quartermaster.value && p.turretLevel() < PLAYER_PERSONA.gateGuns
    ? quartermaster.value
    : undefined,
);
const name = computed(() => (props.side === 'p' ? 'Your safehouse' : match.contract.value.rival));
</script>

<template>
  <article class="house" :data-side="side" :aria-label="name">
    <header class="house__head">
      <span class="house__name">{{ name }}</span>
      <span v-if="side === 'p'" class="house__tier" :data-chartered="p.chartered()">{{
        p.chartered() ? 'chartered' : 'street crew'
      }}</span>
      <span v-else class="house__note">{{ match.contract.value.outfit }}</span>
    </header>

    <template v-if="side === 'p'">
      <div class="house__row">
        <span class="cc-tag">At the gates</span>
        <SquadChips :counts="home" side="p" />
        <span class="house__note">hold the gates against an assault</span>
      </div>
      <BuyCard
        :title="GATE_GUNS.name"
        :note="gunsNote"
        :count="String(p.turretLevel())"
        :limit="String(levels)"
        :prices="readPriceLines(p.gateGuns)"
        :can="p.gateGuns.canPurchase.value"
        :maxed="gunsMaxed"
        done-label="every gun up"
        :automated="gunsBy"
        @buy="p.gateGuns.purchase(1)"
      />
    </template>

    <template v-else>
      <div class="house__row">
        <span class="cc-tag">Inside</span>
        <template v-if="rivalHome">
          <SquadChips :counts="rivalHome.counts" side="e" :dim="!scouting" />
          <span class="cc-fog">{{ scouting ? 'seen now' : `seen ${clock(rivalHome.at)}` }}</span>
        </template>
        <span v-else class="cc-fog">▒▒ send an astral scout to see inside ▒▒</span>
      </div>
      <div class="house__rival-guns" :title="`Turret ${rate(e.turretDps())} dps`">
        <span class="cc-tag">{{ GATE_GUNS.name }}</span>
        <span class="house__level num"
          >{{ e.turretLevel() }}<span class="house__limit">/{{ levels }}</span></span
        >
        <span class="house__siege"
          >a siege needs <span class="num">{{ siegeUnits(e.turretLevel()) }}</span> units</span
        >
      </div>
      <span class="house__note">{{ match.contract.value.rumor }}</span>
    </template>
  </article>
</template>

<style scoped>
.house {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.house__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.house__name {
  font-family: var(--cc-face-sign);
  font-size: 13px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.house[data-side='e'] .house__name {
  color: var(--cc-rival);
}
.house__row {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 24px;
}
.house__note {
  font-size: 11px;
  color: var(--cc-chalk-dim);
}
.house__tier {
  font-size: 11px;
  color: var(--cc-chalk-dim);
}
.house__tier[data-chartered='true'] {
  color: var(--cc-brass);
}
/* The rival's gate guns: the same count and siege line as yours, with no button. */
.house__rival-guns {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 7px 9px 6px;
  border: 1px solid var(--cc-gutter);
  border-left: 3px solid var(--cc-rival-deep);
  border-radius: var(--cc-notch);
}
.house__siege {
  font-size: 11.5px;
  color: var(--cc-chalk-dim);
}
.house__siege .num {
  color: var(--cc-chalk);
  font-weight: 700;
}
.house__level {
  display: inline-block;
  min-width: 4ch;
  font-family: var(--cc-face-neon);
  font-size: 22px;
  line-height: 0.8;
  color: var(--cc-rival);
}
.house__limit {
  margin-left: 2px;
  font-size: 16px;
  color: var(--cc-chalk-faint);
}
</style>

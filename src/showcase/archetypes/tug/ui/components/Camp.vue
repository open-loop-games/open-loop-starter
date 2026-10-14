<!--
  Camp — between battles, Fairhold's chronicler writes. The page carries the last battle's
  entry in the Chronicle, the Renown filling the next volume, the Boons of the Crown on
  starter's `UpgradeGrid` (each boon levels, so the card shows its level and what it does
  now), the ladder of five lords with the one across the causeway named, and the order to
  take the field. Once the Usurper's keep has fallen, the ending heads the page; the ladder
  goes on with his heirs.

  Costume classes: `.camp`, `.cp-entry.victory|setback`, `.cp-renown`, `.cp-ladder`,
  `.cp-lord.taken|now`, `.cp-boon`.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { UpgradeGrid, type UpgradeCardData } from '@/ui/compositions';
import { ANCHORS, BOONS, LORDS, lordAt, type BoonDef } from '../../data';
import { getBattle, getChronicle } from '../../modules';
import { opening } from '../format';

const chronicle = getChronicle();
const battle = getBattle();
const rung = computed(() => chronicle.rung.value);
const lord = computed(() => lordAt(rung.value));
const last = computed(() => chronicle.last.value);
const lastKeep = computed(() => (last.value ? lordAt(last.value.rung).keep : ''));
const volume = computed(() => chronicle.volume.value);

// The Chronicle's ladder is triangular: volume L opens at R₀·L(L+1)/2 renown.
const xpAt = (l: number) => (ANCHORS.renownBase * l * (l + 1)) / 2;
const renown = computed(() => toNumber(chronicle.renown.xp.value));
const into = computed(() => renown.value - xpAt(volume.value));
const span = computed(() => xpAt(volume.value + 1) - xpAt(volume.value));

interface Boon {
  def: BoonDef;
  /** What the boon does at its current level, or null before the first. */
  now: string | null;
  /** The volume it waits for, while it waits. */
  waits: number | null;
}

function effect(def: BoonDef, level: number): string | null {
  if (!def.chain || level === 0) return null;
  if (def.chain === 'gate') return `gate ×${(1 + ANCHORS.curtainStep * level).toFixed(2)}`;
  const g = Math.pow(chronicle.rungGrowth.value, level).toFixed(2);
  return def.chain === 'income' ? `silver ×${g}` : `grit and blows ×${g}`;
}

const cards: UpgradeCardData<Boon>[] = BOONS.map((def) => {
  const p = chronicle.boons.getPurchasable(def.id)!;
  return {
    id: def.id,
    displayName: def.name,
    description: def.blurb,
    cost: computed(() => p.getCost(1)),
    costLabel: 'boon',
    canPurchase: p.canPurchase,
    owned: p.maxed,
    count: p.count,
    purchase: () => p.purchase(1),
    extra: {
      def,
      get now() {
        return effect(def, chronicle.level(def.id));
      },
      get waits() {
        return volume.value < def.minVolume ? def.minVolume : null;
      },
    },
  };
});
// A charter, once granted, is spent: the troop it opens shows in the bailey instead.
const shelf = computed(() => cards.filter((c) => !(c.extra!.def.limit === 1 && c.owned.value)));
const points = computed(() => toNumber(chronicle.boonPoints.value));
</script>

<template>
  <div class="camp" role="region" aria-label="The Chronicle of Fairhold">
    <div class="cp-page">
      <div class="cp-kicker">
        The Chronicle of Fairhold · volume <span class="num">{{ volume }}</span>
      </div>

      <div v-if="chronicle.endingReached.value" class="cp-ending">
        The Stolen Throne falls. The Heathen Mile is renamed the Homeward Road, all the way to the
        sea. The Chronicle closes this volume; the Causeway is yours to keep.
      </div>

      <div v-if="last" class="cp-entry" :class="last.won ? 'victory' : 'setback'">
        <template v-if="last.won">
          {{ opening(lastKeep) }}'s gate falls. The Chronicle records a victory:
          <strong class="num">+{{ last.renown }}</strong> Renown.
        </template>
        <template v-else>
          Fairhold's gate is breached. The Chronicle records a setback (the bards will improve it):
          <strong class="num">+{{ last.renown }}</strong> Renown.
        </template>
      </div>
      <p v-else class="cp-intro">
        Two keeps face each other across a causeway one road wide. Raise your men in the bailey;
        when the horn sounds they march out in ranks. Hold the Homeward Road and break their gate.
      </p>

      <div class="cp-renown">
        <span class="cp-label">Renown</span>
        <span class="cp-rubric"
          ><span
            class="cp-rubric-fill"
            :style="{ transform: `scaleX(${span ? into / span : 0})` }"
          ></span
        ></span>
        <span class="num cp-renown-n"
          >{{ Math.floor(into) }} / {{ span }} to volume {{ volume + 1 }}</span
        >
      </div>

      <div class="cp-columns">
        <section class="cp-ladder" aria-label="The lords across the causeway">
          <h2 class="cw-title">Across the Causeway</h2>
          <ol>
            <li
              v-for="l in LORDS"
              :key="l.rung"
              class="cp-lord"
              :class="{ taken: l.rung < rung, now: l.rung === rung }"
            >
              <span class="cp-lord-name">{{ l.name }}</span>
              <span class="cp-lord-keep"
                >{{ l.keep }}<template v-if="l.rung < rung"> · taken</template></span
              >
            </li>
          </ol>
          <div class="cp-next">
            <div class="cp-next-name">{{ opening(lord.name) }} awaits on the Causeway.</div>
            <div class="cp-next-tell">{{ lord.tell }}</div>
            <Button
              class="cp-take"
              data-testid="take-the-field"
              :repeat="false"
              @click="battle.start()"
            >
              Take the field
            </Button>
          </div>
        </section>

        <section class="cp-boons">
          <h2 class="cw-title">
            Boons of the Crown
            <small class="num">{{ points }} to grant</small>
          </h2>
          <UpgradeGrid :cards="shelf" :columns="2" reveal="inline">
            <template #card="{ card }">
              <Button
                class="cw-control cp-boon"
                :class="{ afford: card.canPurchase.value, maxed: card.owned.value }"
                :disabled="!card.canPurchase.value"
                :data-boon="card.id"
                :repeat="false"
                @click="card.purchase()"
              >
                <span class="cp-boon-name">
                  {{ card.displayName }}
                  <span
                    v-if="toNumber(card.count!.value) && card.extra!.def.limit > 1"
                    class="num cp-lvl"
                  >
                    {{ toNumber(card.count!.value) }} of {{ card.extra!.def.limit }}
                  </span>
                </span>
                <span class="cp-boon-blurb">{{ card.description }}</span>
                <span class="cp-boon-price num">
                  <template v-if="card.owned.value">granted in full</template>
                  <template v-else-if="card.extra!.waits"
                    >waits for volume {{ card.extra!.waits }}</template
                  >
                  <template v-else-if="card.extra!.now">now {{ card.extra!.now }}</template>
                  <template v-else>one boon</template>
                </span>
              </Button>
            </template>
          </UpgradeGrid>
          <p class="cp-tally num">
            {{ chronicle.battles.value }}
            {{ chronicle.battles.value === 1 ? 'battle' : 'battles' }} ·
            {{ chronicle.victories.value }}
            {{ chronicle.victories.value === 1 ? 'victory' : 'victories' }}
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.camp {
  display: grid;
  place-items: start center;
  padding: 24px 12px;
  animation: unroll 0.7s ease-out;
}
@keyframes unroll {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
.cp-page {
  width: min(1000px, 100%);
  padding: 24px 30px 28px;
  background: linear-gradient(180deg, #221c15, #1a1510);
  border: 1px solid rgba(160, 139, 98, 0.35);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
}
.cp-kicker {
  font-family: var(--cw-caps);
  font-size: 15px;
  color: var(--cw-gall);
}
.cp-intro,
.cp-entry,
.cp-ending {
  margin: 8px 0 14px;
  font-family: var(--cw-hand);
  font-size: 21px;
  line-height: 1.35;
}
.cp-entry.victory strong {
  color: var(--cw-weld);
  font-family: var(--cw-text);
}
.cp-entry.setback {
  color: #e2b4a8;
}
.cp-entry.setback strong {
  color: var(--cw-weld);
  font-family: var(--cw-text);
}
.cp-ending {
  padding: 12px 14px;
  border: 1px solid var(--cw-weld);
  background: var(--cw-weld-soft);
  box-shadow: 0 0 28px var(--cw-weld-glow);
}
.cp-renown {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  margin-bottom: 18px;
}
.cp-label {
  font-family: var(--cw-caps);
  color: var(--cw-gall);
}
/* The rubric: a red-and-gold ruled line, inked as renown fills the volume. */
.cp-rubric {
  position: relative;
  height: 6px;
  background: rgba(0, 0, 0, 0.4);
  border-top: 1px solid rgba(160, 139, 98, 0.3);
}
.cp-rubric-fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--cw-madder), var(--cw-weld));
  transform-origin: left center;
  transition: transform 0.6s ease;
}
.cp-renown-n {
  font-size: 14px;
  color: var(--cw-linen-dim);
}
.cp-columns {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  gap: 28px;
}
.cp-ladder ol {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
}
.cp-lord {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px dotted var(--cw-rule);
  color: var(--cw-linen-dim);
}
.cp-lord-name {
  font-family: var(--cw-hand);
  font-size: 17px;
}
.cp-lord-keep {
  font-size: 13.5px;
  font-style: italic;
}
.cp-lord.taken .cp-lord-name {
  text-decoration: line-through;
  text-decoration-color: var(--cw-madder);
}
.cp-lord.now {
  color: var(--cw-linen);
}
.cp-lord.now .cp-lord-name {
  color: #dba497;
}
.cp-next {
  padding: 12px 14px;
  border: 1px solid rgba(189, 79, 60, 0.4);
  background: var(--cw-madder-soft);
}
.cp-next-name {
  font-family: var(--cw-hand);
  font-size: 19px;
}
.cp-next-tell {
  margin: 2px 0 12px;
  color: var(--cw-linen-dim);
  font-style: italic;
}
.cp-take {
  display: block;
  width: 100%;
  padding: 10px 18px;
  font-family: var(--cw-caps);
  font-size: 19px;
  letter-spacing: 0.04em;
  color: #1a130a;
  background: var(--cw-weld);
  border: none;
  cursor: pointer;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 10px 100%, 0 calc(100% - 10px));
  box-shadow: 0 0 22px var(--cw-weld-glow);
}
.cp-take:hover {
  background: #e8c26c;
}
.cp-boon {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  height: 100%;
  padding: 10px;
  text-align: left;
}
.cp-boon-name {
  font-family: var(--cw-hand);
  font-size: 17px;
}
.cp-lvl {
  margin-left: 6px;
  font-family: var(--cw-text);
  font-size: 13px;
  color: var(--cw-weld);
}
.cp-boon-blurb {
  font-size: 14px;
  color: var(--cw-linen-dim);
}
.cp-boon-price {
  margin-top: auto;
  font-size: 13.5px;
  color: var(--cw-gall);
}
.cp-boon.afford .cp-boon-price {
  color: var(--cw-weld);
}
.cp-boon.maxed {
  opacity: 0.55;
}
.cp-tally {
  margin: 12px 0 0;
  font-size: 13.5px;
  color: var(--cw-linen-dim);
}
</style>

<!--
  Camp — between battles, Fairhold's chronicler writes. The page carries the last battle's
  entry in the Chronicle (a fallen gate, or the season closing on the gates), the Renown
  filling the next volume, the march of fifteen fields under five lords with the next one
  named, and the Boons of the Crown on starter's `UpgradeGrid`. The next field shows what can
  be raised there, what lies across the road, the champion who rides out, the twist drawn for
  it, and the weapon to mount on the walls. Once the Usurper's keep has fallen, the ending
  heads the page and the skirmish field opens: any field, any twist, any lord, for no renown.

  Costume classes: `.camp`, `.cp-entry.victory|setback|skirmish`, `.cp-renown`, `.cp-march`,
  `.cp-lord.taken|now`, `.cp-field.taken|now`, `.cp-next`, `.cp-twist`, `.cp-mount`,
  `.cp-skirmish`, `.cp-boon`.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import Select from '@/ui/components/Select.vue';
import { UpgradeGrid, type UpgradeCardData } from '@/ui/compositions';
import {
  ANCHORS,
  BOONS,
  FIELDS,
  LORDS,
  NO_TWIST,
  TWISTS,
  WEAPONS,
  troop,
  type BoonDef,
} from '../../data';
import { getBattle, getChronicle } from '../../modules';
import { opening } from '../format';
import TroopGlyph from './TroopGlyph.vue';

const chronicle = getChronicle();
const battle = getBattle();
const rung = computed(() => chronicle.rung.value);
const field = computed(() => chronicle.field.value);
const lord = computed(() => chronicle.lord.value);
const twist = computed(() => chronicle.twist.value);
const last = computed(() => chronicle.last.value);
const volume = computed(() => chronicle.volume.value);
const skirmishing = computed(() => chronicle.skirmish.value !== null);

// The Chronicle's ladder is triangular: volume L opens at R₀·L(L+1)/2 renown.
const xpAt = (l: number) => (ANCHORS.renownBase * l * (l + 1)) / 2;
const renown = computed(() => toNumber(chronicle.renown.xp.value));
const into = computed(() => renown.value - xpAt(volume.value));
const span = computed(() => xpAt(volume.value + 1) - xpAt(volume.value));

/** The march, lord by lord, each with his three fields and where Fairhold stands on them. */
const march = LORDS.map((l, i) => ({
  lord: l,
  fields: FIELDS.map((f, rungAt) => ({ f, rungAt })).filter(({ f }) => f.lord === i),
}));

const features = computed(() =>
  field.value.features.map((b) => (b.kind === 'ford' ? 'a ford' : 'stakes in the road')),
);

/** The weapon kinds Fairhold owns; one is mounted on the walls. */
const owned = computed(() => WEAPONS.filter((w) => chronicle.level(w.boon) > 0));

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
// A weapon, once granted, is spent: it shows on the walls' mounting instead.
const shelf = computed(() => cards.filter((c) => !(c.extra!.def.limit === 1 && c.owned.value)));
const points = computed(() => toNumber(chronicle.boonPoints.value));
const levelOf = (card: UpgradeCardData<Boon>) => toNumber(card.count!.value);

// The skirmish field: the player sets the row the march once set for them.
const pickField = ref(chronicle.skirmish.value?.field ?? FIELDS.length - 1);
const pickTwist = ref(chronicle.skirmish.value?.twist ?? NO_TWIST.id);
const pickLord = ref(chronicle.skirmish.value?.lord ?? LORDS.length - 1);
const fieldOptions = FIELDS.map((f, i) => ({
  value: i,
  label: `${f.name} (${LORDS[f.lord]!.name})`,
}));
const twistOptions = [NO_TWIST, ...TWISTS].map((t) => ({ value: t.id, label: t.name }));
const lordOptions = LORDS.map((l, i) => ({ value: i, label: l.name }));
function skirmish(): void {
  chronicle.skirmish.value = {
    field: pickField.value,
    twist: pickTwist.value,
    lord: pickLord.value,
  };
  battle.start();
}
function backToMarch(): void {
  chronicle.skirmish.value = null;
}
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

      <div
        v-if="last"
        class="cp-entry"
        :class="last.skirmish ? 'skirmish' : last.won ? 'victory' : 'setback'"
      >
        <template v-if="last.skirmish">
          A skirmish at {{ last.field }} against {{ last.lord }}: {{ last.won ? 'won' : 'lost' }},
          {{ last.byBreach ? 'a gate fell' : 'on the gates at the season’s close' }}. Skirmishes pay
          no Renown.
        </template>
        <template v-else-if="last.won">
          <template v-if="last.byBreach">The gate of {{ last.field }} falls.</template>
          <template v-else
            >The season closes with {{ last.field }}'s gate the worse for it, and
            {{ last.lord }} yields.</template
          >
          The Chronicle records a victory: <strong class="num">+{{ last.renown }}</strong> Renown.
        </template>
        <template v-else>
          <template v-if="last.byBreach">Fairhold's gate is breached at {{ last.field }}.</template>
          <template v-else
            >The season closes with our gate the worse for it, and Fairhold yields
            {{ last.field }}.</template
          >
          The Chronicle records a setback (the bards will improve it):
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
        <section class="cp-march" aria-label="The march">
          <div class="cp-next">
            <div class="cp-next-kicker">
              {{ skirmishing ? 'The skirmish' : 'The next field' }}
            </div>
            <div class="cp-next-name">{{ opening(field.name) }}</div>
            <div class="cp-next-lord">held by {{ lord.name }}</div>
            <div class="cp-next-tell">{{ field.tell }}</div>
            <dl class="cp-facts">
              <dt>Raised here</dt>
              <dd class="cp-open">
                <span
                  v-for="id in field.open"
                  :key="id"
                  class="cp-open-troop"
                  :title="troop(id).ours.name"
                  ><span class="cp-open-glyph"><TroopGlyph :troop="id" /></span
                  >{{ troop(id).ours.name }}</span
                >
              </dd>
              <template v-if="features.length">
                <dt>The ground</dt>
                <dd>{{ features.join(' and ') }}</dd>
              </template>
              <template v-if="field.champions.length">
                <dt>Champions</dt>
                <dd class="cp-champions">
                  <span v-for="c in field.champions" :key="c.name"
                    >{{ c.name }} rides out at
                    <span class="num"
                      >{{ Math.floor(c.at / 60) }}:{{ String(c.at % 60).padStart(2, '0') }}</span
                    ></span
                  >
                </dd>
              </template>
            </dl>
            <div class="cp-twist" :class="{ calm: twist.id === NO_TWIST.id }">
              <span class="cp-twist-name">{{ twist.name }}</span>
              <span class="cp-twist-blurb">{{ twist.blurb }}</span>
            </div>
            <div v-if="owned.length" class="cp-mount" role="group" aria-label="On the walls">
              <span class="cp-mount-label">On the walls</span>
              <Button
                v-for="w in owned"
                :key="w.kind"
                class="cw-control cp-mount-kind"
                :class="{ afford: chronicle.mounted.value === w.kind }"
                :aria-pressed="chronicle.mounted.value === w.kind"
                :data-weapon="w.kind"
                @click="chronicle.mounted.value = w.kind"
              >
                <span class="cp-mount-name">{{ w.name }}</span>
                <span class="cp-mount-blurb">{{ w.blurb }}</span>
              </Button>
            </div>
            <Button class="cp-take" data-testid="take-the-field" @click="battle.start()">
              {{ skirmishing ? 'Skirmish again' : 'Take the field' }}
            </Button>
            <Button
              v-if="skirmishing"
              class="cw-control cp-back"
              data-testid="back-to-march"
              @click="backToMarch()"
            >
              Back to the march: the Usurper's heirs
            </Button>
          </div>

          <div v-if="chronicle.endingReached.value" class="cp-skirmish">
            <h2 class="cw-title">The skirmish field <small>no Renown</small></h2>
            <div class="cp-pick">
              <span>Field</span>
              <Select v-model="pickField" :options="fieldOptions" aria-label="Field" />
            </div>
            <div class="cp-pick">
              <span>Twist</span>
              <Select v-model="pickTwist" :options="twistOptions" aria-label="Twist" />
            </div>
            <div class="cp-pick">
              <span>Lord</span>
              <Select v-model="pickLord" :options="lordOptions" aria-label="Lord" />
            </div>
            <Button
              class="cw-control afford cp-skirmish-go"
              data-testid="skirmish"
              @click="skirmish()"
            >
              Fight this skirmish
            </Button>
          </div>
          <h2 class="cw-title">
            The March
            <small class="num"
              >{{ Math.min(rung, FIELDS.length) }} of {{ FIELDS.length }} fields</small
            >
          </h2>
          <ol class="cp-lords">
            <li
              v-for="(m, i) in march"
              :key="i"
              class="cp-lord"
              :class="{
                taken: m.fields.every((x) => x.rungAt < rung),
                now: !skirmishing && m.fields.some((x) => x.rungAt === rung),
              }"
            >
              <span class="cp-lord-name">{{ m.lord.name }}</span>
              <span class="cp-fields">
                <span
                  v-for="x in m.fields"
                  :key="x.rungAt"
                  class="cp-field"
                  :class="{
                    taken: x.rungAt < rung,
                    now: !skirmishing && x.rungAt === rung,
                    keep: x.f.champions.length > 0,
                  }"
                  >{{ x.f.name }}</span
                >
              </span>
            </li>
          </ol>
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
                @click="card.purchase()"
              >
                <span class="cp-boon-name">
                  {{ card.displayName }}
                  <span v-if="levelOf(card) && card.extra!.def.limit !== 1" class="num cp-lvl">
                    <template v-if="card.extra!.def.limit"
                      >{{ levelOf(card) }} of {{ card.extra!.def.limit }}</template
                    >
                    <template v-else>level {{ levelOf(card) }}</template>
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
.cp-entry.skirmish {
  color: var(--cw-linen-dim);
}
.cp-lords {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
}
.cp-lord {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 4px 0;
  border-bottom: 1px dotted var(--cw-rule);
  color: var(--cw-linen-dim);
}
.cp-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 0 10px;
  font-size: 13.5px;
}
.cp-field::before {
  content: '◇ ';
  color: var(--cw-gall);
}
.cp-field.keep::before {
  content: '♜ ';
}
.cp-field.taken {
  opacity: 0.6;
}
.cp-field.taken::before {
  content: '◆ ';
  color: var(--cw-woad);
}
.cp-field.keep.taken::before {
  content: '♜ ';
  color: var(--cw-woad);
}
.cp-field.now {
  color: #dba497;
}
.cp-lord-name {
  font-family: var(--cw-hand);
  font-size: 17px;
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
  margin-bottom: 20px;
  padding: 12px 14px;
  border: 1px solid rgba(189, 79, 60, 0.4);
  background: var(--cw-madder-soft);
}
.cp-next-kicker {
  font-family: var(--cw-caps);
  font-size: 13px;
  color: var(--cw-gall);
}
.cp-next-name {
  font-family: var(--cw-hand);
  font-size: 21px;
  line-height: 1.15;
}
.cp-next-lord {
  font-size: 14px;
  color: #dba497;
}
.cp-next-tell {
  margin: 4px 0 10px;
  color: var(--cw-linen-dim);
  font-style: italic;
}
.cp-facts {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 3px 12px;
  margin: 0 0 10px;
  font-size: 14px;
}
.cp-facts dt {
  font-family: var(--cw-caps);
  color: var(--cw-gall);
}
.cp-facts dd {
  margin: 0;
}
.cp-open {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
}
.cp-open-troop {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.cp-open-glyph {
  width: 15px;
  height: 18px;
  color: var(--cw-woad);
}
.cp-champions {
  display: flex;
  flex-direction: column;
  color: #dba497;
}
.cp-twist {
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
  padding: 6px 10px;
  border-left: 2px solid var(--cw-ember);
  background: rgba(210, 124, 62, 0.08);
}
.cp-twist.calm {
  border-left-color: var(--cw-gall);
  background: transparent;
}
.cp-twist-name {
  font-family: var(--cw-caps);
  color: var(--cw-ember);
}
.cp-twist.calm .cp-twist-name {
  color: var(--cw-gall);
}
.cp-twist-blurb {
  font-size: 14px;
  color: var(--cw-linen-dim);
}
.cp-mount {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}
.cp-mount-label {
  grid-column: 1 / -1;
  font-family: var(--cw-caps);
  font-size: 13.5px;
  color: var(--cw-gall);
}
.cp-mount-kind {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 6px 8px;
  text-align: left;
}
.cp-mount-name {
  font-family: var(--cw-hand);
  font-size: 16px;
}
.cp-mount-blurb {
  font-size: 13px;
  color: var(--cw-linen-dim);
}
.cp-back {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 6px 12px;
  font-family: var(--cw-hand);
}
.cp-skirmish {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cp-pick {
  display: grid;
  grid-template-columns: 4.5em 1fr;
  align-items: center;
  gap: 8px;
  font-family: var(--cw-caps);
  color: var(--cw-gall);
}
.cp-pick :deep(.olui-select__trigger) {
  font: inherit;
  font-family: var(--cw-text);
  color: var(--cw-linen);
  background: var(--cw-oak-raised);
  border: 1px solid var(--cw-rule);
  border-radius: 0;
  padding: 4px 6px;
}
.cp-skirmish-go {
  margin-top: 4px;
  padding: 8px 12px;
  font-family: var(--cw-caps);
  font-size: 16px;
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

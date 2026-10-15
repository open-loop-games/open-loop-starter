<!--
  ExpositionPanel — the pavilion, the charters and the foreman's bureaux. The pavilion
  previews the jury live: its score, split into the exhibit and the Ministry's dossier,
  the medal that score earns and what the next renown costs. The medal ladder runs from
  Bronze to the Grand Prix, the arc's goal. Staging waits on a full hangar and on the
  jury's sitting, and asks first on the modal stack. The charters and the bureaux adopt
  UpgradeGrid through its `#card` slot, priced in renown and kept across every Exposition.
  The bureaux are pencilled in until every charter is granted; an employed bureau has a
  switch.
-->
<script setup lang="ts">
import { computed, inject } from 'vue';
import { toNumber, type Persistent } from '@open-loop/engine';
import { modalStackKey } from '@/lib';
import Button from '@/ui/components/Button.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import Switch from '@/ui/components/Switch.vue';
import { UpgradeGrid, createPurchasableCard } from '@/ui/compositions';
import { formatClock, formatGrouped } from '@/composables/useFormatting';
import {
  BUREAUX,
  CHARTERS,
  EXPO_BASE_RENOWN,
  GRAND_PRIX,
  MEDALS,
  PATENT_POOL,
  RENOWN_OUTPUT_STEP,
  RESEARCH,
  SCORE_UNIT,
  renownFor,
  scoreFor,
  type BureauId,
} from '../../data';
import { getAutomation, getEmpire, getExposition, getMinistry, getWorks } from '../../modules';
import { countdown } from '../format';
import StageConfirm from './StageConfirm.vue';

const works = getWorks();
const empire = getEmpire();
const expo = getExposition();
const ministry = getMinistry();
const automation = getAutomation();
const stack = inject(modalStackKey)!;

const planes = computed(() => Math.floor(toNumber(works.res.aeroplanes.value)));
const held = computed(() => toNumber(empire.renown.value));
const lifetime = empire.lifetimeRenown;
const poolNames = PATENT_POOL.map((id) => RESEARCH.find((r) => r.id === id)!.name);

// ── the jury ──
const medalOf = (renown: number) => [...MEDALS].reverse().find((m) => renown >= m.renown);
const jury = computed(() => {
  const total = expo.score.value;
  const dossier = ministry.dossier.value;
  const renown = renownFor(total);
  const next = Math.max(renown + 1, EXPO_BASE_RENOWN);
  const after = MEDALS.find((m) => m.renown > next);
  return {
    score: total,
    dossier,
    exhibit: total - dossier,
    renown,
    medal: medalOf(renown),
    next,
    nextAt: scoreFor(next),
    /** the medal the next renown is, if it is one */
    nextName: MEDALS.find((m) => m.renown === next)?.name,
    after: after && { name: after.name, at: scoreFor(after.renown) },
  };
});

/**
 * The ladder's position for a score: the medals sit in equal columns, and the fill runs
 * between them by renown, so Bronze and Silver are as legible as the Grand Prix.
 */
function ladder(score: number): number {
  const r = score < SCORE_UNIT ? 0 : EXPO_BASE_RENOWN * Math.sqrt(score / SCORE_UNIT);
  const steps = MEDALS.length;
  if (r < MEDALS[0]!.renown) return (0.5 * (r / MEDALS[0]!.renown)) / steps;
  const i = MEDALS.filter((m) => r >= m.renown).length - 1;
  if (i === steps - 1) return 1;
  const [a, b] = [MEDALS[i]!.renown, MEDALS[i + 1]!.renown];
  return (i + 0.5 + (r - a) / (b - a)) / steps;
}
const fill = computed(() => {
  const at = ladder(jury.value.score);
  const share = jury.value.score > 0 ? jury.value.exhibit / jury.value.score : 1;
  return [
    { value: at * share, class: 'exhibit' },
    { value: at * (1 - share), class: 'dossier' },
  ];
});
const rungs = computed(() =>
  MEDALS.map((m) => ({
    ...m,
    reached: jury.value.renown >= m.renown,
    current: jury.value.medal === m,
    grand: m.renown === GRAND_PRIX,
    won: m.renown === GRAND_PRIX && empire.grandPrix.value,
  })),
);
const toGrandPrix = computed(() => Math.max(0, scoreFor(GRAND_PRIX) - jury.value.score));

const why = computed(() => {
  if (expo.canStage.value) return '';
  if (planes.value < expo.threshold.value)
    return `The hangar is ${expo.threshold.value - planes.value} aeroplanes short`;
  if (expo.juryIn.value > 0) return `The jury sits in ${countdown(expo.juryIn.value)}`;
  return 'The score earns no medal yet';
});

function stage(): void {
  stack.push(
    StageConfirm,
    {
      renown: expo.gain.value,
      medal: medalOf(expo.gain.value)?.name,
      planes: planes.value,
      kept: empire.holds('patents').value ? poolNames : [],
      onStage: () => expo.stage(),
    },
    'sm',
  );
}

// ── charters and bureaux ──
const charters = CHARTERS.map((def) =>
  createPurchasableCard(empire.charters.getPurchasable(def.id)!, {
    displayName: def.name,
    description: def.blurb,
  }),
);
const granted = computed(() => CHARTERS.filter((c) => empire.holds(c.id).value).length);

interface BureauExtra {
  /** the bureau's automation tier is reached, so its switch means something */
  reached: () => boolean;
  on: Persistent<boolean>;
}
const bureaux = BUREAUX.map((def) =>
  createPurchasableCard<BureauExtra>(empire.bureaux.getPurchasable(def.id)!, {
    displayName: def.name,
    description: def.blurb,
    extra: {
      reached: () => automation.tiers.hasReached(def.id),
      on: automation.active[def.id as BureauId],
    },
  }),
);
const bureauxOpen = computed(() => empire.bureaux.getPurchasable(BUREAUX[0]!.id)!.visible.value);
</script>

<template>
  <div class="ae-expo">
    <section class="pavilion">
      <h3 class="ae-section-head">Exposition Universelle</h3>
      <p class="lede">
        The jury scores the worked goods in the bins and the Ministry's dossier, and pays its medal
        in renown. Every renown earned lifts each raw building's yield by
        {{ Math.round(RENOWN_OUTPUT_STEP * 100) }}%, and buys charters that outlast every
        Exposition.
      </p>

      <div class="jury">
        <div class="score">
          <span class="label">The jury's score</span>
          <span class="ae-figure big">{{ formatGrouped(jury.score) }}</span>
          <span class="split ae-figure"
            ><span class="key exhibit" />exhibit {{ formatGrouped(jury.exhibit) }}
            <span class="key dossier" />dossier {{ formatGrouped(jury.dossier) }}</span
          >
        </div>
        <div class="medal">
          <span class="label">It earns</span>
          <span class="big" :class="{ none: !jury.medal }">{{
            jury.medal ? jury.medal.name : 'No medal'
          }}</span>
          <span class="ae-figure split">{{ jury.renown }} renown</span>
        </div>
      </div>

      <div class="ladder" aria-label="The medals, to the Grand Prix">
        <ProgressBar class="ae-ladder__fill" :segments="fill" />
        <ol>
          <li
            v-for="m in rungs"
            :key="m.renown"
            :class="{ reached: m.reached, current: m.current, grand: m.grand, won: m.won }"
          >
            <span class="roundel" aria-hidden="true" />
            <span class="rung-name">{{ m.name }}</span>
            <span class="rung-renown ae-figure">{{ m.renown }}</span>
          </li>
        </ol>
      </div>
      <p class="next ae-figure">
        <template v-if="jury.nextName">{{ jury.nextName }} · </template>{{ jury.next }} renown at
        {{ formatGrouped(jury.nextAt)
        }}<span class="of"> · {{ formatGrouped(jury.nextAt - jury.score) }} more</span
        ><template v-if="jury.after">
          · {{ jury.after.name }} at {{ formatGrouped(jury.after.at) }}</template
        ><br />
        <span v-if="empire.grandPrix.value" class="ae-stamp gp-stamp">Grand Prix · Paris</span>
        <span v-else class="of"
          >The Grand Prix asks {{ formatGrouped(scoreFor(GRAND_PRIX)) }} ·
          {{ formatGrouped(toGrandPrix) }} to go</span
        >
      </p>

      <dl class="figures">
        <div>
          <dt>In the hangar</dt>
          <dd class="ae-figure" :class="{ short: planes < expo.threshold.value }">
            {{ planes }} <span class="of">/ {{ expo.threshold.value }} to exhibit</span>
          </dd>
        </div>
        <div>
          <dt>The jury</dt>
          <dd class="ae-figure">
            <template v-if="expo.juryIn.value > 0"
              >{{ countdown(expo.juryIn.value) }} <span class="of">to its sitting</span></template
            >
            <template v-else>sitting</template>
          </dd>
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
            {{ expo.cycle.count.value }} · {{ formatClock(expo.cycle.elapsed.value) }}
          </dd>
        </div>
      </dl>
      <Button
        class="ae-act stage"
        :class="{ can: expo.canStage.value }"
        :disabled="!expo.canStage.value"
        @click="stage"
        >Stage the Exposition<span v-if="expo.canStage.value" class="ae-figure">
          · {{ expo.gain.value }} renown</span
        ></Button
      >
      <p class="why">{{ why }}</p>
    </section>

    <div class="patrons">
      <section class="charters">
        <h3 class="ae-section-head">Imperial charters</h3>
        <UpgradeGrid :cards="charters" :columns="1" reveal="inline">
          <template #card="{ card }">
            <article
              class="charter"
              :class="{ held: card.owned.value, can: card.canPurchase.value }"
            >
              <header>
                <span class="name">{{ card.displayName }}</span>
                <span class="price ae-figure">{{ toNumber(card.cost.value) }} renown</span>
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

      <section class="bureaux">
        <h3 class="ae-section-head">The foreman's bureaux</h3>
        <UpgradeGrid v-if="bureauxOpen" :cards="bureaux" :columns="1" reveal="inline">
          <template #card="{ card }">
            <article
              class="charter bureau"
              :class="{ held: card.owned.value, can: card.canPurchase.value }"
            >
              <header>
                <span class="name">{{ card.displayName }}</span>
                <span v-if="!card.owned.value" class="price ae-figure"
                  >{{ toNumber(card.cost.value) }} renown</span
                >
              </header>
              <p>{{ card.description }}</p>
              <div v-if="card.extra!.reached()" class="duty">
                <span v-if="card.owned.value" class="ae-stamp">Employed</span>
                <Switch
                  v-model="card.extra!.on.value"
                  class="switch"
                  :aria-label="`${card.displayName} at work`"
                  >{{ card.extra!.on.value ? 'At work' : 'Stood down' }}</Switch
                >
              </div>
              <Button
                v-if="!card.owned.value"
                class="ae-act"
                :class="{ can: card.canPurchase.value }"
                :disabled="!card.canPurchase.value"
                @click="card.purchase()"
                >Employ</Button
              >
            </article>
          </template>
        </UpgradeGrid>
        <p v-else class="pencilled">
          The foreman takes on the running of the works once every charter is granted —
          <span class="ae-figure">{{ granted }}</span> of {{ CHARTERS.length }} so far.
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.ae-expo {
  display: grid;
  grid-template-columns: minmax(20rem, 1.25fr) minmax(16rem, 1fr);
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
.label,
dt {
  display: block;
  font-family: var(--ae-face-lettering);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.68rem;
  color: var(--ae-drafting-line-faint);
}

/* ── the jury ── */
.jury {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.jury > div {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.big {
  font-size: 1.55rem;
  color: var(--ae-chalk);
  line-height: 1.15;
}
.medal .big {
  color: var(--ae-brass);
  font-size: 1.3rem;
}
.medal .big.none {
  color: var(--ae-slate);
}
.split {
  font-size: 0.82rem;
  color: var(--ae-drafting-line-faint);
}
.key {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin: 0 4px 0 0;
  vertical-align: 0;
}
.key.dossier {
  margin-left: 8px;
}
.key.exhibit,
.ae-ladder__fill :deep(.exhibit) {
  background: var(--ae-brass);
}
.key.dossier,
.ae-ladder__fill :deep(.dossier) {
  background: var(--ae-aluminium);
}

/* ── the medal ladder: equal columns, the fill runs between them by renown ── */
.ladder {
  position: relative;
  margin: 18px 0 6px;
}
.ae-ladder__fill {
  position: absolute;
  top: 9px;
  left: 0;
  right: 0;
  --progress-bar-track: var(--ae-cyanotype-rule);
  --progress-bar-radius: 0;
  --progress-bar-height: 3px;
  --progress-bar-border: none;
  --progress-bar-shadow: none;
  --progress-bar-track-empty: var(--progress-bar-track);
  --progress-bar-transition: none;
}
.ladder ol {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
}
.ladder li {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 3px;
}
.roundel {
  width: 21px;
  height: 21px;
  border-radius: 50%;
  border: 1.5px solid var(--ae-drafting-line-faint);
  background: var(--ae-cyanotype-deep);
}
.reached .roundel {
  border-color: var(--ae-brass);
}
.current .roundel {
  background: var(--ae-brass);
  box-shadow:
    0 0 0 3px var(--ae-cyanotype),
    0 0 0 4px var(--ae-brass-dim);
}
.grand .roundel {
  border-style: double;
  border-width: 4px;
}
.won .roundel {
  border-color: var(--ae-brass);
}
.rung-name {
  font-size: 0.74rem;
  line-height: 1.1;
  color: var(--ae-drafting-line-faint);
}
.reached .rung-name {
  color: var(--ae-drafting-line);
}
.current .rung-name {
  color: var(--ae-brass);
}
.grand .rung-name {
  font-family: var(--ae-face-lettering);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ae-chalk);
}
.rung-renown {
  font-size: 0.72rem;
  color: var(--ae-slate);
}
.next {
  margin: 8px 0 14px;
  font-size: 0.86rem;
  color: var(--ae-drafting-line);
}
.gp-stamp {
  margin-top: 6px;
  font-size: 12px;
}

.figures {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
  margin: 0 0 16px;
  padding-top: 10px;
  border-top: 1px dotted var(--ae-cyanotype-rule);
}
dd {
  margin: 2px 0 0;
  font-size: 1.2rem;
  color: var(--ae-chalk);
}
dd.short {
  color: var(--ae-drafting-line);
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
.why {
  min-height: 1.3em;
  margin: 6px 0 0;
  font-size: 0.85rem;
  font-style: italic;
  text-align: center;
  color: var(--ae-drafting-line-faint);
}

/* ── charters and bureaux ── */
.patrons {
  display: grid;
  gap: 18px;
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
.duty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.duty .switch {
  gap: 7px;
  padding: 2px 0;
  font-family: var(--ae-face-lettering);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 11px;
  color: var(--ae-slate);
}
.duty .switch[data-state='checked'] {
  color: var(--ae-verdigris);
}
/* The track and knob are drawn in the label's ink, slate when stood down, verdigris at work. */
.duty .switch :deep(.olui-switch__track) {
  width: 26px;
  height: 12px;
  padding: 0 2px;
  border: 1px solid currentColor;
  border-radius: 6px;
  background: transparent;
}
.duty .switch :deep(.olui-switch__thumb) {
  width: 8px;
  height: 8px;
  background: currentColor;
  transform: none;
  transition: transform 0.15s ease-out;
}
.duty .switch[data-state='checked'] :deep(.olui-switch__thumb) {
  transform: translateX(12px);
}
.pencilled {
  margin: 0;
  padding: 9px 11px;
  border: 1px dashed var(--ae-cyanotype-rule);
  font-style: italic;
  font-size: 0.88rem;
  color: var(--ae-drafting-line-faint);
}
</style>

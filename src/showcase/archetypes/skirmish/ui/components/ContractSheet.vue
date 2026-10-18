<!--
  ContractSheet — the briefing before a match, and the verdict after it, laid over the
  deck while the match is not live. It covers the game view only, not the page: the
  system header stays live, so a player can save or return to the slots from a briefing.
  That is why it is the story's own markup and not starter's BlockingDialog, which blocks
  the whole page by design.
-->
<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/ui/components/Button.vue';
import { CONTRACTS } from '../../data/contracts';
import { UNITS, UNIT_KINDS } from '../../data/units';
import { getCareer, getMatch } from '../../modules';
import { GLYPH, clock, matchup } from '../format';

const match = getMatch();
const career = getCareer();
const phase = computed(() => match.phase.value);
const c = computed(() => match.contract.value);
const best = computed(() => career.best.value);
// A contract is open once the one before it has been won.
const reached = computed(() =>
  CONTRACTS.map(
    (_, i) => i <= career.contractIndex.value || best.value[CONTRACTS[i - 1].id] !== undefined,
  ),
);
</script>

<template>
  <div v-if="phase !== 'live'" class="overlay" :data-phase="phase">
    <div
      class="sheet"
      role="dialog"
      :aria-label="phase === 'briefing' ? 'Contract briefing' : 'Match over'"
    >
      <template v-if="phase === 'briefing'">
        <span class="sheet__kicker"
          >Contract {{ career.contractIndex.value + 1 }} of {{ CONTRACTS.length }} ·
          {{ c.outfit }}</span
        >
        <h1 class="sheet__title">{{ c.rival }}</h1>
        <p class="sheet__body">{{ c.briefing }}</p>
        <p class="sheet__rumor">“{{ c.rumor }}”</p>
        <div class="ladder" role="list">
          <Button
            v-for="(k, i) in CONTRACTS"
            :key="k.id"
            role="listitem"
            class="ladder__step"
            :data-current="i === career.contractIndex.value"
            :data-done="best[k.id] !== undefined"
            :disabled="!reached[i]"
            @click="career.choose(i)"
          >
            <span class="ladder__n">{{ i + 1 }}</span
            >{{ k.rival }}
            <span v-if="best[k.id] !== undefined" class="num ladder__best">{{
              clock(best[k.id])
            }}</span>
          </Button>
        </div>
        <div class="roster">
          <div v-for="k in UNIT_KINDS" :key="k" class="roster__unit">
            <span class="roster__glyph">{{ GLYPH[k] }}</span>
            <span class="roster__name">{{ UNITS[k].name }}</span>
            <span class="roster__line">{{ matchup(k) }}</span>
          </div>
        </div>
        <p class="sheet__how">
          Hire hustlers for scrip, sink ley taps for aether, build training floors. Send your crew
          into the three districts, take them, then order an assault on the rival safehouse. Scout
          to see what they field, and answer it: blades cut mages, mages fry drones, riggers brick
          chrome.
        </p>
        <Button class="go" @click="match.start()">Take the job</Button>
      </template>
      <template v-else>
        <span class="sheet__kicker"
          >{{ phase === 'won' ? 'Contract complete' : 'Contract failed' }} ·
          {{ clock(match.clock.value) }}</span
        >
        <h1 class="sheet__title">
          {{ phase === 'won' ? `${c.rival} is finished.` : 'Your safehouse burned.' }}
        </h1>
        <p v-if="phase === 'won' && career.finished.value" class="sheet__body">
          Every crew that mattered has answered to you. The sprawl is yours. Replay any contract to
          beat your time.
        </p>
        <p v-else-if="phase === 'won'" class="sheet__body">
          The fixers are calling again. A new lieutenant asks for a seat at your table.
        </p>
        <p v-else class="sheet__body">The fixers will give you one more try at {{ c.rival }}.</p>
        <Button class="go" @click="match.nextMatch()">{{
          phase === 'won' ? 'Next contract' : 'Try again'
        }}</Button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(5, 8, 11, 0.72);
  backdrop-filter: blur(3px);
  z-index: 10;
  animation: cc-overlay-in 0.35s ease-out;
}
.overlay[data-phase='won'],
.overlay[data-phase='lost'] {
  background: rgba(5, 8, 11, 0.55);
}
@keyframes cc-overlay-in {
  from {
    opacity: 0;
  }
}
.sheet {
  width: min(640px, 92%);
  max-height: 92%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px 26px;
  background: var(--cc-asphalt-raised);
  border: 1px solid var(--cc-gutter);
  border-top: 3px solid var(--cc-sodium);
  border-radius: var(--cc-notch);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}
.overlay[data-phase='lost'] .sheet {
  border-top-color: var(--cc-rival);
}
.sheet__kicker {
  font-family: var(--cc-face-tag);
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--cc-chalk-dim);
}
.sheet__title {
  margin: 0;
  font-family: var(--cc-face-sign);
  font-weight: normal;
  font-size: 26px;
  letter-spacing: 0.05em;
  color: var(--cc-rival);
}
.overlay[data-phase='won'] .sheet__title {
  color: var(--cc-sodium);
}
.sheet__body,
.sheet__how {
  margin: 0;
  font-size: 13.5px;
  color: var(--cc-chalk);
}
.sheet__how {
  font-size: 12px;
  color: var(--cc-chalk-dim);
}
.sheet__rumor {
  margin: 0;
  color: var(--cc-ley);
  font-size: 13px;
}
.ladder {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.ladder__step {
  display: inline-flex;
  gap: 6px;
  align-items: baseline;
  padding: 4px 8px;
  background: var(--cc-asphalt);
  border: 1px solid var(--cc-gutter);
  border-radius: var(--cc-notch);
  font-size: 11.5px;
  color: var(--cc-chalk-dim);
  cursor: pointer;
}
.ladder__step:hover:not(:disabled) {
  background: var(--cc-asphalt);
  border-color: var(--cc-chalk-dim);
}
.ladder__step:disabled {
  opacity: 0.4;
  cursor: default;
}
.ladder__step[data-current='true'] {
  border-color: var(--cc-sodium);
  color: var(--cc-chalk);
}
.ladder__step[data-done='true'] .ladder__n {
  color: var(--cc-sodium);
}
.ladder__n {
  font-family: var(--cc-face-neon);
  font-size: 18px;
}
.ladder__best {
  color: var(--cc-chalk-faint);
}
.roster {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 14px;
}
.roster__unit {
  display: grid;
  grid-template-columns: 18px auto;
  column-gap: 6px;
}
.roster__glyph {
  grid-row: 1 / 3;
  color: var(--cc-sodium);
  font-size: 15px;
}
.roster__name {
  font-family: var(--cc-face-tag);
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.roster__line {
  font-size: 11px;
  color: var(--cc-chalk-dim);
}
.go {
  align-self: flex-end;
  padding: 9px 20px;
  background: var(--cc-sodium);
  border: none;
  border-radius: var(--cc-notch);
  font-family: var(--cc-face-sign);
  font-size: 13px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cc-asphalt);
  cursor: pointer;
}
.go:hover {
  background: var(--cc-sodium);
  box-shadow: 0 0 18px var(--cc-sodium-glow);
}
</style>

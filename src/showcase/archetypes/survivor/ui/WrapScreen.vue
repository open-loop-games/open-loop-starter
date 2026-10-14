<!--
  WrapScreen — the take's report: CUT when the lead fell, a wipeout or the strike, what the
  floor paid, and any rating it opened. The take that fells R's lead first rolls the
  picture's end credits above the report. Enter returns to the call sheet.
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import Button from '@/ui/components/Button.vue';
import { getTake } from '../modules';

const take = getTake();
const w = computed(() => take.view.wrap!);
const TITLE = { cut: 'Cut! Print it.', wipeout: 'Wipeout — medic!', struck: 'Strike the set.' };
const line = computed(() => {
  const lead = w.value.lead;
  if (w.value.end === 'cut') return `${lead} is down. The take is in the can.`;
  if (w.value.end === 'struck')
    return `${lead} outlasted the call, and the crew struck the set around you. The footage still counts.`;
  return 'The crowd closed. The footage still counts.';
});
const leadText = computed(() => {
  const left = w.value.leadLeft;
  if (left === null) return 'never on';
  return left <= 0 ? 'down' : `${Math.round(left * 100)}% left`;
});
const time = computed(() => {
  const s = w.value.seconds;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
});
function back(): void {
  take.toCallSheet();
}
function onKey(e: KeyboardEvent): void {
  if (e.key === 'Enter') back();
}
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <main class="wrap" :class="w.end">
    <section v-if="w.pictureWrapped" class="credits">
      <div class="credits-kicker billing">That's a wrap on the picture</div>
      <div class="credits-title billing">One More Take</div>
      <div class="credits-line">Starring {{ w.star }}</div>
      <div class="credits-line dim">
        The set stays open: every rating still plays, and every take still pays.
      </div>
    </section>
    <div class="wrap-card">
      <div class="clapper-stripe"></div>
      <div class="inner">
        <div class="billing kicker">
          {{ w.star }} · rated {{ w.rating }}{{ w.driver === 'instinct' ? ' · improvised' : '' }}
        </div>
        <h1 class="billing">{{ TITLE[w.end] }}</h1>
        <p class="line">{{ line }}</p>
        <dl class="stats">
          <div>
            <dt class="billing">On the floor</dt>
            <dd class="num">{{ time }}</dd>
          </div>
          <div>
            <dt class="billing">Extras down</dt>
            <dd class="num">{{ w.kills }}</dd>
          </div>
          <div>
            <dt class="billing">In the shot</dt>
            <dd class="num">{{ w.inShotKills }}</dd>
          </div>
          <div>
            <dt class="billing">Reels banked</dt>
            <dd class="num">{{ Math.floor(w.reels) }}</dd>
          </div>
          <div>
            <dt class="billing">Rewrites</dt>
            <dd class="num">{{ w.level - 1 }}</dd>
          </div>
          <div>
            <dt class="billing">{{ w.lead }}</dt>
            <dd class="num" :class="{ down: w.leadLeft !== null && w.leadLeft <= 0 }">
              {{ leadText }}
            </dd>
          </div>
          <div>
            <dt class="billing">Marks filled</dt>
            <dd class="num">{{ w.marksFilled }}</dd>
          </div>
          <div>
            <dt class="billing">Jackpots</dt>
            <dd class="num">{{ w.jackpots }}</dd>
          </div>
          <div class="earn">
            <dt class="billing">Clout earned</dt>
            <dd class="num">+{{ w.clout }}</dd>
          </div>
        </dl>
        <div v-if="w.unlockedRating" class="ribbon billing">
          Approved: rating {{ w.unlockedRating }} now open
        </div>
        <Button class="ss-control back billing" :repeat="false" @click="back">
          Back to the call sheet
        </Button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.wrap {
  flex: 1 1 auto;
  display: grid;
  place-content: center;
  justify-items: center;
  padding: 24px;
  background: radial-gradient(ellipse at center, var(--stage-haze), var(--stage-black) 70%);
}
.wrap-card {
  width: min(560px, 92vw);
  background: var(--stage-black);
  border: 2px solid var(--chalk);
  animation: snap 320ms var(--ease-cut);
}
@keyframes snap {
  from {
    opacity: 0;
    transform: translateY(-14px);
  }
}
.inner {
  padding: 22px 28px 26px;
}
.kicker {
  color: var(--chalk-dim);
  font-size: 13px;
  letter-spacing: 0.18em;
}
h1 {
  margin: 4px 0 6px;
  font-size: 52px;
  line-height: 1;
}
.wipeout h1 {
  color: var(--squib);
}
.cut h1 {
  color: var(--chalk);
}
.struck h1 {
  color: var(--tungsten);
}
dd.down {
  color: var(--greenlight);
}
/* The ending: end credits over the report, on the take that fells R's lead first. */
.credits {
  text-align: center;
  margin-bottom: 22px;
  animation: credits 1400ms var(--ease-cut);
}
@keyframes credits {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
}
.credits-kicker {
  font-size: 14px;
  letter-spacing: 0.3em;
  color: var(--reel-gold);
  text-transform: uppercase;
}
.credits-title {
  font-size: 64px;
  line-height: 1.05;
  color: var(--chalk);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.credits-line {
  color: var(--chalk);
}
.credits-line.dim {
  color: var(--chalk-dim);
  font-size: 14px;
}
.line {
  color: var(--chalk-dim);
  margin: 0 0 18px;
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 18px;
  margin: 0 0 18px;
}
.stats div {
  border-top: 1px solid var(--gaffer);
  padding-top: 6px;
}
dt {
  font-size: 11px;
  color: var(--chalk-dim);
}
dd {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
}
.earn dd {
  color: var(--tungsten);
}
.ribbon {
  background: var(--greenlight);
  color: var(--stage-black);
  padding: 8px 12px;
  margin-bottom: 16px;
  font-size: 15px;
}
.back {
  width: 100%;
  padding: 12px;
  background: var(--tungsten);
  color: var(--stage-black);
  font-size: 20px;
  cursor: pointer;
}
</style>

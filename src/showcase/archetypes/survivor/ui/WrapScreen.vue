<!--
  WrapScreen — the take's report: CUT or a wipeout, what the floor paid, and any rating it
  opened. Enter returns to the call sheet.
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import Button from '@/ui/components/Button.vue';
import { getTake } from '../modules';

const take = getTake();
const w = computed(() => take.view.wrap!);
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
    <div class="wrap-card">
      <div class="clapper-stripe"></div>
      <div class="inner">
        <div class="billing kicker">
          {{ w.star }} · rated {{ w.rating }}{{ w.driver === 'instinct' ? ' · improvised' : '' }}
        </div>
        <h1 class="billing">{{ w.end === 'cut' ? 'Cut! Print it.' : 'Wipeout — medic!' }}</h1>
        <p class="line">
          {{
            w.end === 'cut'
              ? 'You held the floor to the end of the take.'
              : 'The crowd closed. The take is in the can anyway: the footage still counts.'
          }}
        </p>
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
  place-items: center;
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

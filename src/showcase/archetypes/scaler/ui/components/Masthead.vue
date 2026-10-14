<!--
  Masthead — the comic's cover line: the title, the volume (Rewrites) and the
  issue (Reboots), Justice and its rate, and the layer currencies once each
  layer has opened. A prestige prints an onomatopoeia across it: the one
  orchestrated moment.
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getContinuity, getCore, getLegacy, getRun } from '../../modules';
import { fmt, fmtMult, fmtRate } from '../format';

const core = getCore();
const run = getRun();
const legacy = getLegacy();
const continuity = getContinuity();

const issue = computed(() => core.reboots.value + 1);
const volume = computed(() => core.rewrites.value + 1);
const legacyOpen = computed(() => core.reboots.value > 0 || core.rewrites.value > 0);
const output = computed(() => core.output.apply(1));

const burst = ref<{ word: string; key: number } | null>(null);
watch(
  () => core.reboots.value,
  (n, old) => {
    if (n > old) burst.value = { word: 'KRAKOOM!', key: n };
  },
);
watch(
  () => core.rewrites.value,
  (n, old) => {
    if (n > old) burst.value = { word: 'SHAZAAM!', key: -n };
  },
);
</script>

<template>
  <header class="masthead">
    <div class="logo-block">
      <h1 class="logo">PARAGON</h1>
      <div class="issue num">VOL. {{ volume }} · ISSUE #{{ issue }}</div>
    </div>
    <div class="justice">
      <span class="caption">Justice</span>
      <div class="justice-face num">{{ fmt(run.justice.value) }}</div>
      <div class="justice-rate num">
        +{{ fmtRate(run.totalRate.value) }} / sec · heroes {{ fmtMult(output) }}
      </div>
    </div>
    <dl class="ledger">
      <div v-if="legacyOpen" class="reveal">
        <dt>Legacy</dt>
        <dd class="num">{{ fmt(legacy.legacy.value) }}</dd>
      </div>
      <div v-if="core.rewrites.value > 0" class="reveal">
        <dt>Continuity</dt>
        <dd class="num orbit">{{ fmt(continuity.continuity.value) }}</dd>
      </div>
    </dl>
    <div v-if="burst" :key="burst.key" class="burst" aria-hidden="true">{{ burst.word }}</div>
  </header>
</template>

<style scoped>
.masthead {
  position: relative;
  display: grid;
  grid-template-columns: 282px 1fr auto;
  align-items: center;
  gap: 18px;
  background: var(--night-raised);
  border: var(--panel-border);
  box-shadow: var(--panel-shadow);
  padding: 12px 18px;
  overflow: hidden;
}
.logo {
  margin: 0;
  font-family: var(--face-masthead);
  font-size: 36px;
  line-height: 1;
  color: var(--signal);
  letter-spacing: 0.04em;
  text-shadow:
    3px 3px 0 var(--gutter-ink),
    -1px -1px 0 var(--gutter-ink);
  transform: skewX(-6deg);
}
.issue {
  margin-top: 6px;
  font-size: 11px;
  color: var(--newsprint-dim);
  letter-spacing: 0.14em;
}
.justice-face {
  margin-top: 6px;
  font-size: 30px;
  line-height: 1.1;
  min-width: 8ch;
}
.justice-rate {
  color: var(--newsprint-dim);
  font-size: 11px;
}
.ledger {
  display: flex;
  gap: 22px;
  margin: 0;
}
.ledger dt {
  font-family: var(--face-caption);
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--newsprint-dim);
}
.ledger dd {
  margin: 0;
  font-size: 20px;
  color: var(--signal);
}
.ledger dd.orbit {
  color: var(--orbit);
}
.burst {
  position: absolute;
  left: 44%;
  top: 8px;
  font-family: var(--face-masthead);
  font-size: 44px;
  color: var(--cape);
  text-shadow: 3px 3px 0 var(--gutter-ink);
  pointer-events: none;
  animation: burst 1100ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
}
@keyframes burst {
  0% {
    opacity: 0;
    transform: scale(0.4) rotate(-12deg);
  }
  25% {
    opacity: 1;
    transform: scale(1.15) rotate(-6deg);
  }
  70% {
    opacity: 1;
    transform: scale(1) rotate(-6deg);
  }
  100% {
    opacity: 0;
    transform: scale(1.05) rotate(-6deg) translateY(-10px);
  }
}
</style>

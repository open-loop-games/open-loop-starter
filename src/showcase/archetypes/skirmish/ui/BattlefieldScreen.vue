<script setup lang="ts">
import { computed } from 'vue';
import { useModule } from '@/composables/useModule';
import { useMatch } from '../composables/useMatch';
import { TacticalKey } from '../modules';
import { BASE_HP } from '../data/tactical';
import PlayField from './PlayField.vue';

/**
 * The game-screen battlefield: the pixi field plus its HUD. Injection lives
 * here (not in AppRoot) so it resolves only once the engine has started and
 * the modules are installed — this component mounts inside the Game screen,
 * mirroring defender's MapCanvas panel.
 */

const match = useMatch();
const matchLive = computed(() => match.inMatch.value);
const matchOutcome = computed(() => match.outcome.value);
const matchElapsed = computed(() => match.matchTimeElapsed.value);

const tactical = useModule(TacticalKey);
const armyA = computed(() => tactical.units.a.value.length);
const armyB = computed(() => tactical.units.b.value.length);
const baseA = computed(() => Math.max(0, Math.round(tactical.baseHp.a.value)));
const baseB = computed(() => Math.max(0, Math.round(tactical.baseHp.b.value)));
const baseFracA = computed(() => Math.max(0, Math.min(1, tactical.baseHp.a.value / BASE_HP)));
const baseFracB = computed(() => Math.max(0, Math.min(1, tactical.baseHp.b.value / BASE_HP)));

function rematch(): void {
  match.start();
}
</script>

<template>
  <section class="battlefield">
    <!-- HUD: two keeps' banners flank the match clock. The base-HP tracks are
         the at-a-glance read — who's winning is the length of a bar. -->
    <header class="hud">
      <div class="hud__side hud__side--a">
        <span class="hud__name">Crimson</span>
        <div class="hud__track">
          <div
            class="hud__fill hud__fill--a"
            :style="{ width: `${baseFracA * 100}%` }"
          />
        </div>
        <span class="hud__hp">{{ baseA }}</span>
      </div>
      <div class="hud__center">
        <span class="hud__clock">{{ matchElapsed.toFixed(1) }}s</span>
        <span class="hud__army">{{ armyA }} vs {{ armyB }}</span>
      </div>
      <div class="hud__side hud__side--b">
        <span class="hud__hp">{{ baseB }}</span>
        <div class="hud__track">
          <div
            class="hud__fill hud__fill--b"
            :style="{ width: `${baseFracB * 100}%` }"
          />
        </div>
        <span class="hud__name">Azure</span>
      </div>
    </header>

    <div class="battlefield__field">
      <PlayField />
      <!-- Outcome curtain — only when the match has ended. -->
      <div
        v-if="!matchLive && matchOutcome"
        class="outcome"
      >
        <p class="outcome__line">
          <template v-if="matchOutcome.winner">
            <strong :class="`outcome__winner--${matchOutcome.winner}`">
              {{ matchOutcome.winner === 'a' ? 'Crimson' : 'Azure' }}
            </strong>
            takes the field
          </template>
          <template v-else>
            Stalemate — time called
          </template>
        </p>
        <button
          class="outcome__rematch"
          @click="rematch"
        >
          Rematch
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Faction colors — match PlayField's sprite tints so HUD and field agree. */
.battlefield {
  --crimson: #d9524b;
  --azure: #4f86d6;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  padding: var(--gap);
}

.hud {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--gap);
}
.hud__side {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
}
.hud__name {
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 0.8rem;
}
.hud__side--a .hud__name {
  color: var(--crimson);
}
.hud__side--b .hud__name {
  color: var(--azure);
}
.hud__track {
  flex: 1 1 auto;
  height: 10px;
  background: color-mix(in srgb, var(--color-fg, #fff) 8%, transparent);
  border-radius: 999px;
  overflow: hidden;
}
.hud__side--b .hud__track {
  /* fill drains from the keep side (right) so both bars recede toward center */
  transform: scaleX(-1);
}
.hud__fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.12s linear;
}
.hud__fill--a {
  background: var(--crimson);
}
.hud__fill--b {
  background: var(--azure);
}
.hud__hp {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  min-width: 2.2ch;
  text-align: center;
}
.hud__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.1;
}
.hud__clock {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 1.05rem;
}
.hud__army {
  font-size: 0.72rem;
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}

.battlefield__field {
  position: relative;
  width: 100%;
  aspect-ratio: 100 / 40;
  max-height: 62vh;
}

.outcome {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--gap);
  background: color-mix(in srgb, #14110c 62%, transparent);
  border-radius: var(--radius);
  backdrop-filter: blur(1.5px);
}
.outcome__line {
  margin: 0;
  font-size: 1.4rem;
  letter-spacing: 0.02em;
}
.outcome__winner--a {
  color: var(--crimson);
}
.outcome__winner--b {
  color: var(--azure);
}
.outcome__rematch {
  font: inherit;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  padding: 8px 22px;
  color: var(--color-bg, #14110c);
  background: color-mix(in srgb, #e8dcc4 90%, #fff);
  border: none;
  border-radius: var(--radius);
}
.outcome__rematch:hover {
  background: #fff;
}
</style>

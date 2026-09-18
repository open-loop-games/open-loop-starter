<script setup lang="ts">
import { computed } from 'vue';
import { useGame } from '@/composables/useGame';
import { useModule } from '@/composables/useModule';
import { useMatch } from '../composables/useMatch';
import { TacticalKey, getAutomationKey, type FactionId } from '../modules';
import { BASE_HP, PERSONAS, PERSONA_KEYS, getFactionDef, type PersonaKey } from '../data/tactical';
import PlayField from './PlayField.vue';

/**
 * The battlefield panel: the pixi field plus an adaptive multi-faction HUD.
 * Rendered inside SkirmishGameView (below the post-start frame), so the
 * match/tactical injection here resolves with the modules installed.
 */

const { engine } = useGame();
const match = useMatch();
const matchLive = computed(() => match.inMatch.value);
const matchOutcome = computed(() => match.outcome.value);
const matchElapsed = computed(() => match.matchTimeElapsed.value);

const tactical = useModule(TacticalKey);
const factions = computed(() => tactical.factions);
const activeFactions = computed(() => match.activeFactions.value);
const eliminations = computed(() => match.eliminations.value);

function toHexColor(colorNum: number): string {
  return `#${colorNum.toString(16).padStart(6, '0')}`;
}

function getPersona(faction: FactionId): PersonaKey | 'custom' {
  const auto = engine.tryInject(getAutomationKey(faction));
  return auto?.currentPersona.value ?? 'custom';
}

function onSelectPersona(faction: FactionId, key: PersonaKey): void {
  const auto = engine.tryInject(getAutomationKey(faction));
  auto?.setPersona(key);
}

function getTargetBase(faction: FactionId): FactionId | null {
  return tactical.targetBase[faction]?.value ?? null;
}

function getArmyCount(faction: FactionId): number {
  return tactical.units[faction]?.value.length ?? 0;
}

function getBaseHp(faction: FactionId): number {
  return Math.max(0, Math.round(tactical.baseHp[faction]?.value ?? 0));
}

function getBaseFrac(faction: FactionId): number {
  return Math.max(0, Math.min(1, (tactical.baseHp[faction]?.value ?? 0) / BASE_HP));
}

function formatComposition(units: readonly { type: string }[]): string {
  const counts: Record<string, number> = {};
  for (const u of units) {
    counts[u.type] = (counts[u.type] ?? 0) + 1;
  }
  const parts: string[] = [];
  if (counts.trooper) parts.push(`${counts.trooper}T`);
  if (counts.archer) parts.push(`${counts.archer}A`);
  if (counts.cavalry) parts.push(`${counts.cavalry}C`);
  return parts.join(' ');
}

function getCompString(faction: FactionId): string {
  const units = tactical.units[faction]?.value ?? [];
  return formatComposition(units);
}

function rematch(): void {
  match.start();
}
</script>

<template>
  <section class="battlefield">
    <!-- HUD: Adaptive multi-faction header with clock, seat cards, and live target vectors. -->
    <header class="hud">
      <div class="hud__meta">
        <span class="hud__clock">{{ matchElapsed.toFixed(1) }}s</span>
        <span class="hud__status">
          <template v-if="matchLive">
            {{ activeFactions.length }} / {{ factions.length }} Factions Contending
          </template>
          <template v-else> Match Concluded </template>
        </span>
      </div>

      <div
        class="hud__grid"
        :style="{ gridTemplateColumns: `repeat(${Math.min(factions.length, 4)}, minmax(0, 1fr))` }"
      >
        <div
          v-for="f in factions"
          :key="f"
          class="hud__card"
          :class="{ 'hud__card--eliminated': !activeFactions.includes(f) }"
          :style="{ '--faction-color': toHexColor(getFactionDef(f).color) }"
        >
          <div class="hud__card-header">
            <div class="hud__identity">
              <span class="hud__name" :style="{ color: toHexColor(getFactionDef(f).color) }">
                {{ getFactionDef(f).name }}
              </span>
              <span v-if="!activeFactions.includes(f)" class="hud__badge hud__badge--eliminated">
                Eliminated
              </span>
              <span
                v-else-if="getTargetBase(f) && getTargetBase(f) !== f"
                class="hud__badge hud__badge--target"
                :style="{
                  borderColor: toHexColor(getFactionDef(getTargetBase(f)!).color),
                  color: toHexColor(getFactionDef(getTargetBase(f)!).color),
                }"
              >
                → {{ getFactionDef(getTargetBase(f)!).name }}
              </span>
            </div>

            <select
              class="hud__persona-select"
              :value="getPersona(f)"
              :disabled="!activeFactions.includes(f)"
              :title="`${getFactionDef(f).name} AI Persona`"
              @change="onSelectPersona(f, ($event.target as HTMLSelectElement).value as PersonaKey)"
            >
              <option v-for="key in PERSONA_KEYS" :key="key" :value="key">
                {{ PERSONAS[key].name }}
              </option>
              <option v-if="getPersona(f) === 'custom'" value="custom">Custom</option>
            </select>
          </div>

          <div class="hud__track-row">
            <div class="hud__track">
              <div
                class="hud__fill"
                :style="{
                  width: `${getBaseFrac(f) * 100}%`,
                  backgroundColor: toHexColor(getFactionDef(f).color),
                }"
              />
            </div>
            <span class="hud__hp">{{ getBaseHp(f) }}</span>
          </div>

          <div class="hud__army-row">
            <span class="hud__army">{{ getArmyCount(f) }} units</span>
            <span v-if="getCompString(f)" class="hud__comp">
              {{ getCompString(f) }}
            </span>
          </div>
        </div>
      </div>
    </header>

    <div class="battlefield__field">
      <PlayField />

      <!-- Outcome curtain — only when the match has ended. -->
      <div v-if="!matchLive && matchOutcome" class="outcome">
        <div class="outcome__content">
          <p class="outcome__line">
            <template v-if="matchOutcome.winner">
              <strong :style="{ color: toHexColor(getFactionDef(matchOutcome.winner).color) }">
                {{ getFactionDef(matchOutcome.winner).name }}
              </strong>
              takes the field!
            </template>
            <template v-else> Stalemate — time called </template>
          </p>

          <span class="outcome__reason"> Reason: {{ matchOutcome.reason }} </span>

          <!-- Chronological elimination history for N-faction matches -->
          <div v-if="eliminations.length > 0" class="outcome__timeline">
            <h4 class="outcome__timeline-title">Elimination Order</h4>
            <div v-for="(elim, idx) in eliminations" :key="elim.faction" class="outcome__elim-item">
              <span class="outcome__elim-idx">#{{ idx + 1 }}</span>
              <strong
                class="outcome__elim-name"
                :style="{ color: toHexColor(getFactionDef(elim.faction).color) }"
              >
                {{ getFactionDef(elim.faction).name }}
              </strong>
              <span class="outcome__elim-time">{{ elim.eliminatedAtSec.toFixed(1) }}s</span>
            </div>
          </div>

          <button class="outcome__rematch" @click="rematch">Rematch</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.battlefield {
  display: flex;
  flex-direction: column;
  gap: var(--gap, 12px);
  padding: var(--gap, 12px);
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
}

.hud {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm, 8px);
}

.hud__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0 4px;
}

.hud__clock {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 1.15rem;
  letter-spacing: 0.02em;
}

.hud__status {
  font-size: 0.76rem;
  opacity: 0.7;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hud__grid {
  display: grid;
  gap: var(--gap-sm, 8px);
}

.hud__card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: color-mix(in srgb, var(--color-fg, #fff) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-fg, #fff) 12%, transparent);
  border-left: 3px solid var(--faction-color, #888);
  border-radius: var(--radius-sm, 4px);
  transition: opacity 0.2s ease;
}

.hud__card--eliminated {
  opacity: 0.38;
  filter: grayscale(0.5);
}

.hud__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.hud__identity {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.hud__name {
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-size: 0.82rem;
  white-space: nowrap;
}

.hud__badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 3px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.hud__badge--eliminated {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.hud__badge--target {
  background: color-mix(in srgb, var(--color-fg, #fff) 6%, transparent);
  border: 1px solid currentColor;
}

.hud__persona-select {
  font-size: 0.7rem;
  padding: 1px 4px;
  background: color-mix(in srgb, var(--color-fg, #fff) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-fg, #fff) 18%, transparent);
  border-radius: var(--radius-sm, 4px);
  color: var(--color-fg, #fff);
  cursor: pointer;
  outline: none;
  max-width: 110px;
}

.hud__track-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hud__track {
  flex: 1 1 auto;
  height: 8px;
  background: color-mix(in srgb, var(--color-fg, #fff) 8%, transparent);
  border-radius: 999px;
  overflow: hidden;
}

.hud__fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.12s linear;
}

.hud__hp {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 0.8rem;
  min-width: 3ch;
  text-align: right;
}

.hud__army-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 0.7rem;
  opacity: 0.75;
}

.hud__army {
  font-variant-numeric: tabular-nums;
}

.hud__comp {
  font-variant-numeric: tabular-nums;
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  opacity: 0.7;
}

.battlefield__field {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  max-height: 64vh;
  margin: 0 auto;
}

.outcome {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, #14110c 70%, transparent);
  border-radius: var(--radius, 8px);
  backdrop-filter: blur(2px);
  z-index: 10;
}

.outcome__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap, 12px);
  padding: 20px 28px;
  background: color-mix(in srgb, #201c18 90%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-fg, #fff) 15%, transparent);
  border-radius: var(--radius, 8px);
  text-align: center;
  max-width: 360px;
}

.outcome__line {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.outcome__reason {
  font-size: 0.76rem;
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.outcome__timeline {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  margin: 4px 0;
}

.outcome__timeline-title {
  margin: 0 0 4px 0;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.6;
}

.outcome__elim-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.78rem;
  padding: 2px 6px;
  background: color-mix(in srgb, var(--color-fg, #fff) 4%, transparent);
  border-radius: 3px;
}

.outcome__elim-idx {
  opacity: 0.5;
  font-size: 0.7rem;
}

.outcome__elim-time {
  font-variant-numeric: tabular-nums;
  opacity: 0.6;
  font-size: 0.72rem;
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
  border-radius: var(--radius, 6px);
  margin-top: 6px;
  transition: background 0.15s ease;
}

.outcome__rematch:hover {
  background: #fff;
}
</style>

<!--
  CyclerGameView — the Defense-Command console. Mounts under the root's post-start
  `v-else` frame, so every module read below is structurally safe; the root
  (`CyclerAppRoot.vue`) stays routing-only (see `.claude/rules/app-root-discipline.md`).

  Bespoke command-terminal shell (NOT a `src/lib/` shell). The build-defend-cycler
  sub-genre's weak majority is single-column (subgenre-shell-mapping-2026.md, N=3);
  this is a stated deviation toward a free-form/spatial-dashboard console because the
  core loop is spatial — a placement grid + a defended line under a descending salvo —
  which the doc's free-form rationale covers for spatial-primary hybrids. A phase-tab
  indicator over a three-column world (Muster · stage · Reserve/Levers/Prophecy); the
  `.cycler` root declares the phosphor-terminal identity tokens the panels inherit.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { getCycle, type CyclePhase } from '../modules';
import { useCyclerRun } from '../composables/useCyclerRun';
import { useCommandState } from '../composables/useCommandState';
import CommandBar from './panels/CommandBar.vue';
import DefenseField from './panels/DefenseField.vue';
import MusterPalette from './panels/MusterPalette.vue';
import ReservePanel from './panels/ReservePanel.vue';
import LeversPanel from './panels/LeversPanel.vue';
import ProphecyPanel from './panels/ProphecyPanel.vue';
import RedeployScreen from './panels/RedeployScreen.vue';

const cycle = getCycle();
const run = useCyclerRun();
const cmd = useCommandState();

interface PhaseTab {
  key: CyclePhase;
  n: number;
  label: string;
  caption: string;
  tone: '' | 'warn' | 'crit' | 'breach';
}
const PHASE_TABS: PhaseTab[] = [
  { key: 'standby', n: 1, label: 'Standby', caption: 'build · re-arm', tone: '' },
  { key: 'inbound', n: 2, label: 'Inbound', caption: 'defend · engage', tone: 'warn' },
  { key: 'saturation', n: 3, label: 'Saturation', caption: 'boss · MIRV', tone: 'crit' },
  { key: 'overrun', n: 4, label: 'Overrun', caption: 'breach · redeploy', tone: 'breach' },
];

const activePhase = computed(() => cycle.phase.value);

// The world's tone: green calm → amber inbound → red boss/crit → breach.
const tone = computed<'' | 'warn' | 'crit' | 'breach'>(() => {
  if (run.ended.value) return 'breach';
  if (activePhase.value === 'saturation' || cmd.lineState.value === 'crit') return 'crit';
  if (activePhase.value === 'inbound') return 'warn';
  return '';
});
</script>

<template>
  <div class="cycler">
    <div class="cyc-tabs" role="tablist" aria-label="Cycle phase">
      <div
        v-for="tab in PHASE_TABS"
        :key="tab.key"
        class="cyc-tab"
        :class="tab.tone"
        role="tab"
        :aria-selected="tab.key === activePhase"
      >
        <span class="cyc-tab__n">{{ tab.n }}</span> {{ tab.label }}
        <small>{{ tab.caption }}</small>
      </div>
    </div>

    <div class="cyc-world" :data-tone="tone" :data-locked="cmd.buildLocked.value ? '1' : '0'">
      <div class="cyc-grid">
        <div class="cyc-rail">
          <MusterPalette />
        </div>

        <div class="cyc-stage">
          <CommandBar />
          <DefenseField />
        </div>

        <div class="cyc-rail">
          <ReservePanel />
          <LeversPanel />
          <ProphecyPanel />
        </div>
      </div>

      <RedeployScreen v-if="run.ended.value" />
    </div>
  </div>
</template>

<style>
/* Cycler — Defense Command identity tokens. A phosphor command-terminal palette
   sourced from the fiction (a Cold-War missile-defense console: green CRT phosphor,
   amber warning, blue directed-energy beams, red breach). Set on the game root so
   every panel inherits them. Dark-first; the console is a dark instrument by nature,
   so it holds its look under a light theme rather than inverting. */
.cycler {
  --cyc-bg: #04070a;
  --cyc-bg2: #071016;
  --cyc-panel: rgba(7, 16, 22, 0.7);
  --cyc-grn: #38ffab;
  --cyc-grn2: #0f6b48;
  --cyc-grndim: #1c3630;
  --cyc-amb: #ffb000;
  --cyc-blu: #54a9ff;
  --cyc-red: #ff4d5e;
  --cyc-reddim: #5c1620;
  --cyc-ink: #bfe9d8;
  --cyc-warn-edge: #6b4a0f;
  --cyc-crit-edge: #6b1620;
  --cyc-breach-bg: #7a2530;
  --cyc-mono: var(--font-mono, 'JetBrains Mono', ui-monospace, monospace);

  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 4px 2px 12px;
  color: var(--cyc-grn);
  font-family: var(--cyc-mono);
}

.cyc-tabs {
  display: flex;
  gap: 4px;
  margin: 4px 0 12px;
  flex-wrap: wrap;
}
.cyc-tab {
  border: 1px solid var(--cyc-grn2);
  background: var(--cyc-bg2);
  color: var(--cyc-grn2);
  font: 700 12px/1.1 var(--cyc-mono);
  letter-spacing: 0.6px;
  padding: 9px 13px;
  text-transform: uppercase;
  transition:
    color 0.3s ease,
    background 0.3s ease;
}
.cyc-tab small {
  display: block;
  font-weight: 400;
  font-size: 10px;
  margin-top: 3px;
  letter-spacing: 0.2px;
  opacity: 0.8;
}
.cyc-tab__n::before {
  content: '[';
}
.cyc-tab__n::after {
  content: ']';
}
.cyc-tab[aria-selected='true'] {
  color: var(--cyc-bg);
  background: var(--cyc-grn);
  border-color: var(--cyc-grn);
}
.cyc-tab.warn[aria-selected='true'] {
  background: var(--cyc-amb);
  border-color: var(--cyc-amb);
}
.cyc-tab.crit[aria-selected='true'] {
  background: var(--cyc-red);
  border-color: var(--cyc-red);
  color: #fff;
}
.cyc-tab.breach[aria-selected='true'] {
  background: var(--cyc-breach-bg);
  border-color: var(--cyc-red);
  color: #fff;
}

.cyc-world {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  border: 1px solid var(--cyc-grn2);
  padding: 16px;
  overflow: hidden;
  background: radial-gradient(120% 90% at 50% 0%, var(--cyc-bg2), var(--cyc-bg));
}
/* CRT scanlines + vignette — the terminal texture. */
.cyc-world::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 6;
  background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.3) 0 1px, transparent 1px 3px);
  opacity: 0.5;
}
.cyc-world::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 140px 24px rgba(0, 0, 0, 0.65);
}
.cyc-world[data-tone='warn'] {
  border-color: var(--cyc-warn-edge);
}
.cyc-world[data-tone='crit'],
.cyc-world[data-tone='breach'] {
  border-color: var(--cyc-crit-edge);
}

.cyc-grid {
  display: grid;
  grid-template-columns: 212px minmax(0, 1fr) 250px;
  gap: 14px;
  align-items: start;
  position: relative;
  z-index: 1;
}
.cyc-rail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cyc-stage {
  min-width: 0;
}

/* Shared panel + slab primitives (the phosphor card + its labelled header rule). */
.cyc-panel {
  padding: 12px;
  background: var(--cyc-panel);
  border: 1px solid var(--cyc-grn2);
}
.cyc-slab {
  font-size: 10.5px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  margin: 0 0 9px;
  color: var(--cyc-grn);
  display: flex;
  gap: 7px;
  align-items: center;
}
.cyc-slab::before {
  content: '>';
}
.cyc-slab::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--cyc-grn2);
  opacity: 0.6;
}

@media (max-width: 900px) {
  .cyc-grid {
    grid-template-columns: 1fr;
  }
}
@media (prefers-reduced-motion: reduce) {
  .cycler *,
  .cycler *::before,
  .cycler *::after {
    animation: none !important;
  }
}
</style>

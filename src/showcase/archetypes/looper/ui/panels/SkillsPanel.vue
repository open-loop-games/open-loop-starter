<script setup lang="ts">
import { computed } from 'vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import { Decimal, getSkillProgress } from '@open-loop/engine';
import { getNight } from '../../modules';
import { SKILLS } from '../../data';
import { mult } from '../format';

const night = getNight();
const rows = computed(() =>
  SKILLS.map((s) => {
    const talent = night.talent.getSkill(s.id)!;
    const mastery = night.mastery.getSkill(s.id)!;
    return {
      ...s,
      level: new Decimal(talent.level.value).toNumber(),
      progress: getSkillProgress(talent),
      talentMult: new Decimal(talent.modifier.apply(1)).toNumber(),
      mastery: new Decimal(mastery.lifetimeBonus!.value).toNumber(),
      speed: night.skillSpeed(s.id),
    };
  }),
);
</script>

<template>
  <section class="lo-panel" aria-label="Skills">
    <h2>Hands &amp; Habits</h2>
    <div class="lo-skill-legend"><span>tonight</span><span>kept</span><span>speed</span></div>
    <div v-for="s in rows" :key="s.id" class="lo-skill" :style="{ '--tint': `var(--lo-${s.id})` }">
      <div class="lo-skill-name" :title="s.blurb">{{ s.displayName }}</div>
      <div class="lo-skill-level">
        <span class="lo-num">Lv {{ s.level }}</span>
        <ProgressBar class="lo-skill-bar" :value="s.progress" />
      </div>
      <span class="lo-num lo-skill-kept" title="Mastery kept across nights"
        >+{{ (s.mastery * 100).toFixed(0) }}%</span
      >
      <span class="lo-num lo-skill-speed">{{ mult(s.speed) }}</span>
    </div>
  </section>
</template>

<style scoped>
.lo-skill-legend,
.lo-skill {
  display: grid;
  grid-template-columns: 7em 1fr 4em 4.2em;
  gap: 10px;
  align-items: center;
}
.lo-skill-legend {
  font-size: 11px;
  color: var(--lo-ink-faded);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}
.lo-skill-legend span:first-child {
  grid-column: 2;
}
.lo-skill {
  padding: 4px 0;
  border-top: 1px solid var(--lo-concrete-edge);
}
.lo-skill-name {
  color: var(--tint);
  font-family: var(--lo-face-stencil);
  letter-spacing: 0.02em;
}
.lo-skill-level {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--lo-chalk);
}
.lo-skill-level .lo-num {
  min-width: 4.2ch;
}
.lo-skill-bar {
  flex: 1;
  --progress-bar-height: 4px;
  --progress-bar-border: none;
  --progress-bar-shadow: none;
  --progress-bar-radius: 0;
  --progress-bar-track: var(--lo-night);
  --progress-bar-track-empty: var(--lo-night);
  --progress-bar-fill: var(--tint);
  --progress-bar-fill-full: var(--tint);
  --progress-bar-transition: none;
}
.lo-skill-kept {
  font-size: 13px;
  color: var(--lo-guard-lamp);
  text-align: right;
}
.lo-skill-speed {
  font-size: 13px;
  color: var(--lo-searchlight);
  text-align: right;
}
</style>

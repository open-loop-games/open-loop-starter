<!--
  CrewPanel — the lieutenants: one per contract won, each with a switch that benches them.
  The switch is starter's Switch over the lieutenant's own persistent flag.
-->
<script setup lang="ts">
import Switch from '@/ui/components/Switch.vue';
import { getAutomation, getCareer } from '../../modules';

const auto = getAutomation();
const career = getCareer();
</script>

<template>
  <section class="crew" aria-label="Crew">
    <h2 class="cc-title">Crew</h2>
    <div
      v-for="(l, i) in auto.lieutenants"
      :key="l.tier"
      class="lt"
      :data-hired="auto.isUnlocked(l.tier)"
    >
      <div class="lt__head">
        <span class="lt__name">{{ l.name }}</span>
        <Switch
          v-if="auto.isUnlocked(l.tier)"
          v-model="l.enabled.value"
          class="cc-switch--ice"
          :aria-label="`${l.name} on the job`"
        >
          <template #default="{ on }">{{ on ? 'On the job' : 'Benched' }}</template>
        </Switch>
        <span v-else class="lt__lock"
          >joins after {{ i + 1 }} contract{{ i ? 's' : '' }} ({{ career.wins.value }}/{{
            i + 1
          }})</span
        >
      </div>
      <span class="lt__does">{{ l.does }}</span>
    </div>
  </section>
</template>

<style scoped>
.crew {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.lt {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border: 1px solid var(--cc-gutter);
  border-left: 3px solid var(--cc-chalk-faint);
  border-radius: var(--cc-notch);
  background: var(--cc-asphalt-raised);
}
.lt[data-hired='true'] {
  border-left-color: var(--cc-ice);
}
.lt[data-hired='false'] {
  opacity: 0.6;
}
.lt__head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.lt__name {
  font-family: var(--cc-face-tag);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.lt[data-hired='true'] .lt__name {
  color: var(--cc-ice);
}
.lt__lock {
  font-size: 10.5px;
  color: var(--cc-chalk-faint);
}
.lt__does {
  font-size: 11.5px;
  color: var(--cc-chalk-dim);
}
</style>

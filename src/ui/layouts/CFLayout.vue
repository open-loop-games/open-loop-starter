<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, addResource, format } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { CookieFactoryKey } from '@/modules/mods/cookie-factory';
import CFProducersPanel from '@/ui/panels/CFProducersPanel.vue';
import CFUpgradesPanel from '@/ui/panels/CFUpgradesPanel.vue';
import CFAchievementsPanel from '@/ui/panels/CFAchievementsPanel.vue';

const cf = useModule(CookieFactoryKey);

const cookies = computed(() => format(Decimal.floor(cf.cookies.value)));

const totalCps = computed(() => format(cf.producers.getTotalRate(cf.cookies)));

function clickCookie() {
  addResource(cf.cookies, 1);
}
</script>

<template>
  <div class="cf-layout">
    <header class="hud">
      <div class="chip big">
        🍪 {{ cookies }}
      </div>
      <div class="chip muted">
        {{ totalCps }}/s
      </div>
      <label class="chip toggle">
        <input
          v-model="cf.autoBuyProducers.value"
          type="checkbox"
        >
        Auto producers
      </label>
      <label class="chip toggle">
        <input
          v-model="cf.autoBuyUpgrades.value"
          type="checkbox"
        >
        Auto upgrades
      </label>
    </header>

    <button
      v-hold-repeat="clickCookie"
      class="big-cookie"
      type="button"
      aria-label="Bake a cookie"
    >
      🍪
    </button>

    <div class="grid-2">
      <CFProducersPanel />
      <CFUpgradesPanel />
    </div>

    <CFAchievementsPanel />
  </div>
</template>

<style scoped>
.cf-layout {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
.hud {
  display: flex;
  gap: var(--gap-sm);
  align-items: center;
  justify-content: center;
  padding: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.chip {
  padding: 4px 12px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-weight: 600;
}
.chip.big {
  font-size: 1.3em;
  padding: 8px 20px;
}
.chip.muted {
  color: var(--color-text-muted);
}
.chip.toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.chip.toggle input {
  margin: 0;
}
.big-cookie {
  align-self: center;
  font-size: 5rem;
  line-height: 1;
  padding: var(--gap);
  background: none;
  border: none;
  cursor: pointer;
  user-select: none;
  transition: transform 0.05s ease-out;
}
.big-cookie:hover { transform: scale(1.03); }
.big-cookie:active { transform: scale(0.94); }
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap);
}
@media (max-width: 720px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>

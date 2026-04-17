<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, addResource, format } from 'open-loop-engine';
import { SidebarMainShell } from '@/lib';
import { useModule } from '@/composables/useModule';
import { CookieFactoryKey } from '@/modules/mods/cookie-factory';
import HudBar from '@/ui/components/HudBar.vue';
import HudChip from '@/ui/components/HudChip.vue';
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
    <HudBar class="cf-hud">
      <HudChip variant="big">
        🍪 {{ cookies }}
      </HudChip>
      <HudChip variant="muted">
        {{ totalCps }}/s
      </HudChip>
      <HudChip variant="toggle">
        <input
          v-model="cf.autoBuyProducers.value"
          type="checkbox"
        >
        Auto producers
      </HudChip>
      <HudChip variant="toggle">
        <input
          v-model="cf.autoBuyUpgrades.value"
          type="checkbox"
        >
        Auto upgrades
      </HudChip>
    </HudBar>

    <SidebarMainShell
      class="cf-body"
      sidebar-width="320px"
    >
      <template #sidebar>
        <CFProducersPanel />
        <CFUpgradesPanel />
      </template>
      <button
        v-hold-repeat="clickCookie"
        class="big-cookie"
        type="button"
        aria-label="Bake a cookie"
      >
        🍪
      </button>
      <CFAchievementsPanel />
    </SidebarMainShell>
  </div>
</template>

<style scoped>
.cf-layout {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-height: 0;
  flex: 1;
}
.cf-hud {
  justify-content: center;
  padding: var(--gap);
}
.cf-body {
  flex: 1;
  min-height: 0;
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
</style>

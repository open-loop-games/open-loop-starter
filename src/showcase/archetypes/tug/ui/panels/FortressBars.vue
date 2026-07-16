<script setup lang="ts">
import { computed } from 'vue';
import { useMatch } from '../../composables';
import { useModule } from '@/composables/useModule';
import { useFormatting } from '@/composables/useFormatting';
import { TugDataKey } from '../../modules';
import ProgressBar from '@/ui/components/ProgressBar.vue';

const data = useModule(TugDataKey);
const match = useMatch();
const { format } = useFormatting();

const fortressMax = computed(() => Number(data.fortress.hp));

const playerHp = computed(() => Number(match.fortressHp.player.value));
const aiHp = computed(() => Number(match.fortressHp.ai.value));

const playerLabel = 'Terran Nexus';
const aiLabel = 'Protoss Nexus';
</script>

<template>
  <div class="olui-surface fortress-bars">
    <h3 class="fortress-bars__title">
      Fortresses
    </h3>
    <div class="fortress-bars__row">
      <div class="fortress-bars__label">
        {{ playerLabel }}
      </div>
      <ProgressBar
        :value="playerHp"
        :max="fortressMax"
        :label="`${format(playerHp, 0)} / ${format(fortressMax, 0)}`"
      />
    </div>
    <div class="fortress-bars__row">
      <div class="fortress-bars__label">
        {{ aiLabel }}
      </div>
      <ProgressBar
        :value="aiHp"
        :max="fortressMax"
        :label="`${format(aiHp, 0)} / ${format(fortressMax, 0)}`"
      />
    </div>
  </div>
</template>

<style scoped>
.fortress-bars {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap);
}

.fortress-bars__title {
  margin: 0;
  font-size: 1em;
}

.fortress-bars__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fortress-bars__label {
  font-size: 0.85em;
  color: var(--color-text-muted, var(--color-text));
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { useHeadlineRate } from '../../composables/useHeadlineRate';
import { useScene } from '../../composables/useScene';
import { useAmbientData } from '../../composables/useAmbientData';
import { useFormatting } from '@/composables/useFormatting';
import Tooltip from '@/ui/components/Tooltip.vue';

const { primary, lifetime, perSecond } = useHeadlineRate();
const scene = useScene();
const data = useAmbientData();
const { format } = useFormatting();

const sprouts = computed(() => primary.value);
const variant = computed(() => {
  const id = scene.currentVariantId.value;
  return data.sceneVariants.find((v) => v.id === id) ?? data.sceneVariants[0];
});
</script>

<template>
  <section
    class="idle-scene"
    :data-variant-id="variant.id"
  >
    <div
      class="scene-canvas"
      :data-visual-key="variant.visualKey"
      :aria-label="variant.label"
    >
      <span class="scene-label">{{ variant.label }}</span>
    </div>
    <Tooltip :side-offset="8">
      <div
        class="headline-stats"
        tabindex="0"
      >
        <div
          class="primary"
          data-testid="primary-count"
        >
          {{ format(sprouts, 0) }}
        </div>
        <div class="primary-label">
          sprouts
        </div>
        <div class="rate">
          {{ format(perSecond, 1) }} / sec
        </div>
        <div class="lifetime">
          Lifetime: {{ format(lifetime, 0) }}
        </div>
      </div>
      <template #content>
        <div class="headline-tip">
          <div class="headline-tip__name">
            Sprouts
          </div>
          <div class="headline-tip__line">
            Spend on producers to grow the garden.
          </div>
          <div class="headline-tip__line">
            <strong>Lifetime</strong> tracks every sprout ever grown — discoveries gate on lifetime,
            not current count.
          </div>
        </div>
      </template>
    </Tooltip>
  </section>
</template>

<style scoped>
.idle-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap);
  padding: var(--gap-lg) var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

.scene-canvas {
  width: 100%;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
}

.scene-label {
  font-size: 0.85em;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.headline-stats {
  text-align: center;
  cursor: default;
}

.headline-stats:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 4px;
  border-radius: var(--radius-sm);
}

.primary {
  font-size: 2.4em;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
}

.primary-label {
  font-size: 0.78em;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.rate {
  font-size: 1em;
  color: var(--color-text-muted);
  margin-top: var(--gap-sm);
}

.lifetime {
  font-size: 0.85em;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.headline-tip {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.headline-tip__name {
  font-weight: 600;
}

.headline-tip__line {
  opacity: 0.9;
}
</style>

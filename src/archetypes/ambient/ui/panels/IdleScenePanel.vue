<script setup lang="ts">
import { computed } from 'vue';
import { useHeadlineRate } from '../../composables/useHeadlineRate';
import { useScene } from '../../composables/useScene';
import { useAmbientData } from '../../composables/useAmbientData';
import { useFormatting } from '@/composables/useFormatting';

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
    <div class="headline-stats">
      <div
        class="primary"
        data-testid="primary-count"
      >
        {{ format(sprouts, 0) }}
      </div>
      <div class="rate">
        {{ format(perSecond, 1) }} / sec
      </div>
      <div class="lifetime">
        Lifetime: {{ format(lifetime, 0) }}
      </div>
    </div>
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
}

.primary {
  font-size: 2.4em;
  font-weight: 700;
  color: var(--color-primary);
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
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { useModule } from '@/composables/useModule';
import { PrimaryLifetimeKey, SceneKey, getAutoProducers, getPrimaryResource } from '../../modules';
import { useFormatting } from '@/composables/useFormatting';
import Tooltip from '@/ui/components/Tooltip.vue';

const primary = getPrimaryResource();
const buildings = getAutoProducers();
const lifetime = useModule(PrimaryLifetimeKey);
const perSecond = computed(() => buildings.getTotalRate(primary));
const scene = useModule(SceneKey);
const { format } = useFormatting();

const sprouts = computed(() => primary.value);
const variant = scene.currentVariant;
</script>

<template>
  <section
    class="idle-scene"
    :data-variant-id="variant.id"
  >
    <figure class="scene-plate">
      <div
        class="scene-canvas"
        :data-visual-key="variant.visualKey"
        :aria-label="variant.label"
      />
      <figcaption class="scene-caption">
        <span class="scene-caption__eyebrow">The Garden &mdash;</span>
        <span class="scene-caption__variant">{{ variant.label }}</span>
      </figcaption>
    </figure>
    <Tooltip :side-offset="8">
      <div
        class="headline"
        tabindex="0"
        data-testid="primary-count"
      >
        <span class="headline__rate">{{ format(perSecond, 1) }}</span>
        <span class="headline__rate-unit">sprouts per second</span>
        <span
          class="headline__rule"
          aria-hidden="true"
        />
        <span class="headline__count">{{ format(sprouts, 0) }} on hand</span>
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
          <div class="headline-tip__lifetime">
            Lifetime: {{ format(lifetime, 0) }}
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
  gap: var(--gap);
  padding: 0;
  background: transparent;
  border: none;
}

/* ─── Almanac plate ──────────────────────────────────────────────────── */
.scene-plate {
  margin: 0;
  padding: 8px 8px 0;
  background: var(--almanac-cream, var(--color-surface));
  border: 1px solid var(--almanac-rule, var(--color-border));
  border-radius: 3px;
  box-shadow:
    inset 0 1px 0 rgba(255, 244, 210, 0.5),
    0 1px 0 rgba(0, 0, 0, 0.05),
    0 8px 18px -10px rgba(20, 30, 14, 0.25);
}

.scene-canvas {
  position: relative;
  height: 280px;
  border: 1px solid var(--almanac-rule, var(--color-border));
  border-radius: 1px;
  overflow: hidden;
  background-color: var(--almanac-paper, var(--color-bg));
}

.scene-caption {
  text-align: center;
  padding: 12px 12px 14px;
}

.scene-caption__eyebrow {
  font-family: var(--font-display, Georgia, serif);
  font-style: italic;
  font-weight: 500;
  font-size: 0.72em;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--almanac-moss, var(--color-text-muted));
  margin-right: 8px;
}

.scene-caption__variant {
  font-family: var(--font-display, Georgia, serif);
  font-style: italic;
  font-weight: 500;
  font-size: 1.4em;
  letter-spacing: 0.02em;
  color: var(--almanac-evergreen, var(--color-text));
}

/* ─── Headline (caption strip below the plate) ──────────────────────── */
.headline {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  padding: 0 8px;
  font-family: var(--font-body, Georgia, serif);
  cursor: default;
}

.headline:focus-visible {
  outline: 2px solid var(--almanac-evergreen, var(--color-primary));
  outline-offset: 4px;
  border-radius: 2px;
}

.headline__rate {
  font-family: var(--font-display, Georgia, serif);
  font-style: italic;
  font-weight: 500;
  font-size: 1.5em;
  color: var(--almanac-evergreen, var(--color-text));
  font-variant-numeric: tabular-nums oldstyle-nums;
}

.headline__rate-unit {
  font-style: italic;
  font-size: 1em;
  color: var(--almanac-moss, var(--color-text-muted));
}

.headline__rule {
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--almanac-rule, var(--color-border));
  transform: translateY(-3px);
  margin: 0 4px;
}

.headline__count {
  font-style: italic;
  font-size: 1em;
  color: var(--almanac-pencil, var(--color-text-muted));
  font-variant-numeric: tabular-nums oldstyle-nums;
}

.headline-tip {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: var(--font-body, Georgia, serif);
}

.headline-tip__name {
  font-family: var(--font-display, Georgia, serif);
  font-style: italic;
  font-weight: 500;
  font-size: 1.05em;
}

.headline-tip__line {
  opacity: 0.92;
  font-size: 1em;
}

.headline-tip__lifetime {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--almanac-rule-soft, rgba(168, 158, 139, 0.32));
  font-style: italic;
  font-variant-numeric: tabular-nums oldstyle-nums;
  font-size: 0.95em;
  opacity: 0.85;
}

/* ─── Per-variant canvas treatments ─────────────────────────────────── */
/*
 * Each variant: vertical sky-to-earth gradient + a stylized inline-SVG
 * silhouette band along the bottom. Silhouettes are 240x80 viewBox,
 * stretched to 100% × 60% of the canvas to sit in the lower half.
 * Hex colors inside the data-URI are URL-encoded (%23) per the data-uri
 * pattern Producer uses for textures.
 */

.idle-scene[data-variant-id='tilled-beginnings'] .scene-canvas {
  background:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 80'><g stroke='%237a4f24' stroke-width='1.2' fill='none'><path d='M0 28 Q 60 24 120 28 T 240 28' opacity='0.65'/><path d='M0 46 Q 60 42 120 46 T 240 46' opacity='0.50'/><path d='M0 64 Q 60 60 120 64 T 240 64' opacity='0.35'/></g></svg>")
      bottom / 100% 60% no-repeat,
    linear-gradient(180deg, #f7eed4 0%, #ecdcb0 55%, #c4a06f 100%);
}

.idle-scene[data-variant-id='spring'] .scene-canvas {
  background:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 80'><path d='M0 60 Q 80 58 160 60 T 240 60' stroke='%234f6049' stroke-width='1.2' fill='none' opacity='0.6'/><g fill='%235d7a3a'><circle cx='30' cy='62' r='2.5'/><circle cx='70' cy='60' r='2'/><circle cx='105' cy='62' r='2.5'/><circle cx='150' cy='60' r='2'/><circle cx='180' cy='62' r='2.5'/><circle cx='215' cy='60' r='2'/></g><g fill='%23c87b5c' opacity='0.55'><circle cx='90' cy='52' r='1.5'/><circle cx='130' cy='50' r='1.5'/><circle cx='195' cy='52' r='1.5'/></g></svg>")
      bottom / 100% 60% no-repeat,
    linear-gradient(180deg, #e8efe5 0%, #d4dcc6 55%, #b6c8a4 100%);
}

.idle-scene[data-variant-id='summer'] .scene-canvas {
  background:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 80'><circle cx='200' cy='22' r='12' fill='%23e6c07a' opacity='0.55'/><circle cx='200' cy='22' r='8' fill='%23d4a648' opacity='0.7'/><g stroke='%233a4d2c' stroke-width='1' fill='none' opacity='0.7'><path d='M20 70 L 18 50'/><path d='M40 70 L 42 48'/><path d='M60 70 L 58 52'/><path d='M85 70 L 87 50'/><path d='M115 70 L 113 48'/><path d='M145 70 L 147 52'/></g><path d='M0 70 L 240 70' stroke='%234f6049' stroke-width='1' opacity='0.5'/></svg>")
      bottom / 100% 60% no-repeat,
    linear-gradient(180deg, #f8edc8 0%, #ddd596 55%, #94a86c 100%);
}

.idle-scene[data-variant-id='autumn'] .scene-canvas {
  background:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 80'><g fill='%238a5028' opacity='0.7'><path d='M40 70 L 32 50 L 48 50 Z'/><path d='M90 70 L 80 46 L 100 46 Z'/><path d='M150 70 L 142 50 L 158 50 Z'/><path d='M200 70 L 192 52 L 208 52 Z'/></g><path d='M0 70 L 240 70' stroke='%234f6049' stroke-width='1' opacity='0.55'/></svg>")
      bottom / 100% 60% no-repeat,
    linear-gradient(180deg, #f1d99c 0%, #d8a86a 55%, #8a5028 100%);
}

.idle-scene[data-variant-id='winter'] .scene-canvas {
  background:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 80'><g stroke='%23464e3e' stroke-width='1' fill='none' opacity='0.7'><path d='M120 70 L 120 30'/><path d='M120 50 L 110 38'/><path d='M120 50 L 130 38'/><path d='M120 40 L 112 28'/><path d='M120 40 L 128 28'/></g><g fill='%23ffffff' opacity='0.7'><circle cx='30' cy='30' r='1'/><circle cx='60' cy='20' r='1'/><circle cx='90' cy='40' r='1'/><circle cx='160' cy='25' r='1'/><circle cx='190' cy='45' r='1'/><circle cx='220' cy='35' r='1'/></g><path d='M0 70 L 240 70' stroke='%23a89e8b' stroke-width='1' opacity='0.5'/></svg>")
      bottom / 100% 60% no-repeat,
    linear-gradient(180deg, #d4dde0 0%, #e8ecec 55%, #f0eee6 100%);
}

.idle-scene[data-variant-id='year-cycles'] .scene-canvas {
  background:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 80'><circle cx='40' cy='22' r='8' fill='%23e6c07a' opacity='0.6'/><path d='M195 18 A 10 10 0 1 0 205 28 A 8 8 0 1 1 195 18 Z' fill='%23a89e8b' opacity='0.6'/><g stroke='%233a4d2c' stroke-width='1' fill='none' opacity='0.7'><path d='M120 70 L 120 30'/><path d='M120 48 L 110 36'/><path d='M120 48 L 130 36'/><path d='M120 38 L 113 26'/><path d='M120 38 L 127 26'/></g><g fill='%235d7a3a' opacity='0.55'><circle cx='30' cy='62' r='2'/><circle cx='65' cy='64' r='2'/><circle cx='95' cy='62' r='2'/><circle cx='150' cy='62' r='2'/><circle cx='180' cy='64' r='2'/><circle cx='215' cy='62' r='2'/></g><path d='M0 70 L 240 70' stroke='%234f6049' stroke-width='1' opacity='0.6'/></svg>")
      bottom / 100% 60% no-repeat,
    linear-gradient(180deg, #e8eddc 0%, #c5cab0 55%, #6e7d4f 100%);
}
</style>

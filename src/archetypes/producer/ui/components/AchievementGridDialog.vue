<script setup lang="ts">
import { computed } from 'vue';
import BaseModal from '@/ui/components/BaseModal.vue';
import { useAchievements } from '../../composables/useAchievements';

const summary = useAchievements();
defineEmits<{ close: [] }>();

const cells = computed(() =>
  summary.value.rows.map((row) => ({
    id: row.def.id,
    name: row.visible.value ? row.def.name : '???',
    description: row.visible.value ? row.def.description : 'Hidden — bake to reveal',
    earned: row.earned.value,
    hidden: !row.visible.value,
  })),
);

const earnedCount = computed(() => summary.value.earnedCount.value);
const total = computed(() => summary.value.total);
const fillPct = computed(() => (total.value === 0 ? 0 : (earnedCount.value / total.value) * 100));
</script>

<template>
  <BaseModal
    title="Recipe Awards"
    @close="$emit('close')"
  >
    <div class="awards-summary">
      <div class="awards-summary__count">
        <span class="awards-summary__earned">{{ earnedCount }}</span>
        <span class="awards-summary__sep">of</span>
        <span class="awards-summary__total">{{ total }}</span>
        <span class="awards-summary__label">awards earned</span>
      </div>
      <div
        class="awards-summary__bar"
        role="progressbar"
        :aria-valuenow="earnedCount"
        :aria-valuemax="total"
      >
        <div
          class="awards-summary__bar-fill"
          :style="{ width: `${fillPct}%` }"
        />
      </div>
    </div>
    <ul class="awards-grid">
      <li
        v-for="c in cells"
        :key="c.id"
        class="award-card"
        :data-earned="c.earned ? 'true' : 'false'"
        :data-hidden-cell="c.hidden ? 'true' : 'false'"
        :data-testid="`achievement-${c.id}`"
      >
        <div
          class="award-card__seal"
          aria-hidden="true"
        >
          <span class="award-card__seal-mark">&#10038;</span>
        </div>
        <div class="award-card__body">
          <div class="award-card__name">
            {{ c.name }}
          </div>
          <div class="award-card__desc">
            {{ c.description }}
          </div>
        </div>
      </li>
    </ul>
  </BaseModal>
</template>

<style scoped>
/* ─── Summary header ─────────────────────────────────────────────────── */
.awards-summary {
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.2));
}

.awards-summary__count {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-family: var(--font-display, Georgia, serif);
  color: var(--bakery-mahogany, #5a2f10);
  margin-bottom: 8px;
}

.awards-summary__earned {
  font-variation-settings:
    'opsz' 36,
    'SOFT' 100,
    'wght' 800;
  font-weight: 800;
  font-size: 1.6em;
  font-variant-numeric: tabular-nums oldstyle-nums;
  color: var(--bakery-brass, #b1782a);
  line-height: 1;
}

.awards-summary__sep {
  font-style: italic;
  font-family: var(--font-body, Georgia, serif);
  color: var(--bakery-cocoa-mute, #7a5d3d);
  font-size: 0.95em;
}

.awards-summary__total {
  font-variation-settings:
    'opsz' 24,
    'SOFT' 100,
    'wght' 700;
  font-size: 1.1em;
  font-variant-numeric: tabular-nums oldstyle-nums;
  color: var(--bakery-cocoa, #2d1d10);
}

.awards-summary__label {
  margin-left: 10px;
  font-family: var(--font-body, Georgia, serif);
  font-style: italic;
  font-size: 0.78em;
  letter-spacing: 0.04em;
  text-transform: lowercase;
  color: var(--bakery-cocoa-mute, #7a5d3d);
}

.awards-summary__bar {
  height: 4px;
  background: rgba(122, 84, 38, 0.18);
  border-radius: 999px;
  overflow: hidden;
}

.awards-summary__bar-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--bakery-caramel, #c5821f) 0%,
    var(--bakery-brass-bright, #d99846) 100%
  );
  transition: width 320ms ease-out;
}

/* ─── Grid ───────────────────────────────────────────────────────────── */
.awards-grid {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

/* ─── Award card ─────────────────────────────────────────────────────── */
.award-card {
  position: relative;
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 10px;
  padding: 12px 14px 12px 12px;
  background: linear-gradient(180deg, rgba(248, 239, 214, 0.7) 0%, rgba(241, 226, 188, 0.45) 100%);
  border: 1px solid var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.18));
  border-radius: 3px;
  min-height: 70px;
  font-family: var(--font-body, Georgia, serif);
  color: var(--bakery-cocoa, #2d1d10);
  transition:
    transform 140ms ease-out,
    border-color 140ms ease-out;
}

.award-card[data-earned='true'] {
  border-color: var(--bakery-brass, #b1782a);
  background:
    radial-gradient(circle at top right, rgba(217, 152, 70, 0.18) 0%, transparent 65%),
    linear-gradient(180deg, rgba(248, 239, 214, 0.85) 0%, rgba(241, 226, 188, 0.55) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 240, 200, 0.6),
    0 4px 12px -6px rgba(177, 120, 42, 0.4);
}

.award-card[data-hidden-cell='true'] {
  background:
    repeating-linear-gradient(
      45deg,
      rgba(122, 84, 38, 0.06) 0,
      rgba(122, 84, 38, 0.06) 6px,
      transparent 6px,
      transparent 12px
    ),
    rgba(248, 239, 214, 0.4);
}

/* ─── Wax seal column ────────────────────────────────────────────────── */
.award-card__seal {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 240, 210, 0.35) 0%, rgba(255, 240, 210, 0) 50%),
    radial-gradient(
      circle at 50% 50%,
      var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.16)) 0%,
      var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.16)) 100%
    );
  border: 1px dashed var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.3));
  align-self: center;
  transition:
    background 200ms ease-out,
    border 200ms ease-out,
    box-shadow 200ms ease-out;
}

.award-card__seal-mark {
  font-size: 0.95em;
  color: transparent;
  transition: color 200ms ease-out;
}

.award-card[data-earned='true'] .award-card__seal {
  background:
    radial-gradient(circle at 30% 25%, rgba(255, 230, 175, 0.7) 0%, rgba(255, 230, 175, 0) 50%),
    radial-gradient(circle at 50% 50%, var(--bakery-cherry, #a8341a) 0%, #6f1f0e 90%);
  border: 1px solid #6f1f0e;
  box-shadow:
    0 1px 0 rgba(255, 230, 175, 0.4) inset,
    0 -2px 4px rgba(40, 10, 0, 0.2) inset,
    0 4px 8px -3px rgba(110, 30, 14, 0.55);
}

.award-card[data-earned='true'] .award-card__seal-mark {
  color: rgba(255, 240, 210, 0.92);
  text-shadow: 0 1px 1px rgba(40, 10, 0, 0.3);
}

/* ─── Body text ──────────────────────────────────────────────────────── */
.award-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.award-card__name {
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 14,
    'SOFT' 100,
    'wght' 700;
  font-style: italic;
  font-size: 0.95em;
  color: var(--bakery-mahogany, #5a2f10);
  letter-spacing: 0.01em;
}

.award-card[data-earned='false'] .award-card__name {
  color: var(--bakery-cocoa-mute, #7a5d3d);
}

.award-card__desc {
  font-family: var(--font-body, Georgia, serif);
  font-style: italic;
  font-size: 0.78em;
  color: var(--bakery-cocoa-mute, #7a5d3d);
  line-height: 1.35;
}

.award-card[data-earned='true'] .award-card__desc {
  color: var(--bakery-cocoa-soft, #4a3422);
}
</style>

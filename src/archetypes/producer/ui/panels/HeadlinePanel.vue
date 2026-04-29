<script setup lang="ts">
import { computed, ref } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { useHeadlineRate } from '../../composables/useHeadlineRate';
import { useClickState } from '../../composables/useClickState';
import { useProducerChainBreakdown } from '../../composables/useChainBreakdown';
import { useFormatting } from '@/composables/useFormatting';
import ClickCookieButton from '../components/ClickCookieButton.vue';

const { primary, lifetime, perSecond } = useHeadlineRate();
const click = useClickState();
const { format, formatWhole } = useFormatting();

const cookies = computed(() => primary.value);

// Cursor carries the richest stack (globals + achievements + cursor upgrades
// + cursor milestones) so it reads as the headline factor list. If cursor is
// missing the breakdown simply resolves to an empty list.
const breakdown = useProducerChainBreakdown('cursor');
const expanded = ref(false);
</script>

<template>
  <section class="hero-card">
    <div class="hero-card__corner hero-card__corner--tl">
      <span>I</span>
    </div>
    <div class="hero-card__corner hero-card__corner--tr">
      <span>II</span>
    </div>
    <div class="hero-card__corner hero-card__corner--bl">
      <span>III</span>
    </div>
    <div class="hero-card__corner hero-card__corner--br">
      <span>IV</span>
    </div>

    <header class="hero-yield">
      <span class="hero-yield__eyebrow">Today&rsquo;s Yield</span>
      <span class="hero-yield__count" data-testid="cookie-count">
        {{ format(cookies, 0) }}
      </span>
      <span class="hero-yield__unit">cookies on hand</span>
      <div class="hero-yield__rate">
        <span class="hero-yield__rate-value">{{ format(perSecond.value, 1) }}</span>
        <span class="hero-yield__rate-unit">per second</span>
      </div>
    </header>

    <ClickCookieButton data-testid="click-cookie" label="Bake" @click="click.click" />

    <footer class="hero-footnote">
      <div class="hero-footnote__rule" />
      <span class="hero-footnote__line"> lifetime &middot; {{ format(lifetime.value, 0) }} </span>
      <span class="hero-footnote__line hero-footnote__line--clicks">
        {{ formatWhole(click.clickCount.value) }} hand-baked
      </span>
    </footer>

    <CollapsibleRoot v-model:open="expanded" class="multipliers">
      <CollapsibleTrigger class="multipliers__toggle" data-testid="toggle-chain-breakdown">
        <span class="multipliers__title">Compounding Stack</span>
        <span class="multipliers__count">
          {{ breakdown.value.activeCount }} <span class="multipliers__count-of">of</span>
          {{ breakdown.value.factors.length }}
        </span>
        <span class="multipliers__caret">▾</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul class="multipliers__list" data-testid="chain-breakdown">
          <li
            v-for="factor in breakdown.value.factors"
            :key="factor.id"
            class="multipliers__factor"
            :class="{
              'is-inactive': !factor.active,
              'is-bad': factor.isBad,
            }"
            :data-testid="`chain-factor-${factor.id}`"
          >
            <span class="multipliers__factor-text">{{ factor.text }}</span>
            <span class="multipliers__factor-dots" />
            <span class="multipliers__factor-value">{{ factor.formattedValue }}</span>
          </li>
          <li v-if="breakdown.value.factors.length === 0" class="multipliers__empty">
            No upgrades or achievements applied yet.
          </li>
        </ul>
      </CollapsibleContent>
    </CollapsibleRoot>
  </section>
</template>

<style scoped>
.hero-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 28px 28px 22px;
  min-height: 0;
  text-align: center;
  background:
    var(--bakery-fleck),
    radial-gradient(ellipse at 50% 0%, rgba(255, 235, 184, 0.5) 0%, transparent 65%),
    var(--bakery-parchment, #f8efd6);
  border: 1px solid var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.18));
  border-radius: 4px;
  box-shadow:
    inset 0 1px 0 rgba(255, 240, 200, 0.6),
    inset 0 -2px 0 rgba(122, 84, 38, 0.08);
  font-family: var(--font-body, Georgia, serif);
  color: var(--bakery-cocoa, #2d1d10);
}

/* Corner roman-numeral marks — old recipe-card flourish, four cardinal
   anchors that frame the hero without dominating it. */
.hero-card__corner {
  position: absolute;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 9,
    'SOFT' 100,
    'wght' 600;
  font-size: 0.55em;
  letter-spacing: 0.1em;
  color: var(--bakery-brass, #b1782a);
  opacity: 0.55;
}
.hero-card__corner span {
  display: block;
  border-top: 1px solid currentColor;
  border-bottom: 1px solid currentColor;
  padding: 1px 4px;
}
.hero-card__corner--tl {
  top: 12px;
  left: 14px;
}
.hero-card__corner--tr {
  top: 12px;
  right: 14px;
}
.hero-card__corner--bl {
  bottom: 12px;
  left: 14px;
}
.hero-card__corner--br {
  bottom: 12px;
  right: 14px;
}

/* ─── Yield headline ─────────────────────────────────────────────────── */
.hero-yield {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding-top: 6px;
}

.hero-yield__eyebrow {
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 12,
    'SOFT' 100,
    'wght' 600;
  font-size: 0.72em;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: var(--bakery-brass, #b1782a);
}

.hero-yield__count {
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 144,
    'SOFT' 100,
    'wght' 800;
  font-weight: 800;
  font-size: 4.4em;
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--bakery-mahogany, #5a2f10);
  font-variant-numeric: tabular-nums oldstyle-nums;
  margin-top: 2px;
  text-shadow:
    0 1px 0 rgba(255, 240, 200, 0.6),
    0 2px 6px rgba(80, 40, 10, 0.08);
}

.hero-yield__unit {
  font-style: italic;
  font-size: 0.85em;
  color: var(--bakery-cocoa-mute, #7a5d3d);
  margin-top: 2px;
}

.hero-yield__rate {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 8px;
  padding: 4px 14px;
  border: 1px solid var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.18));
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 240, 200, 0.5) 0%, rgba(255, 222, 162, 0.3) 100%);
}

.hero-yield__rate-value {
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 14,
    'SOFT' 100,
    'wght' 700;
  font-weight: 700;
  font-size: 1em;
  color: var(--bakery-mahogany, #5a2f10);
  font-variant-numeric: tabular-nums;
}

.hero-yield__rate-unit {
  font-family: var(--font-body, Georgia, serif);
  font-style: italic;
  font-size: 0.78em;
  color: var(--bakery-cocoa-mute, #7a5d3d);
}

/* ─── Footnote (lifetime + clicks) ───────────────────────────────────── */
.hero-footnote {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-top: 22px;
  width: 100%;
  max-width: 320px;
}

.hero-footnote__rule {
  width: 100%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.4)) 12%,
    var(--bakery-rye-line, #b89a6a) 50%,
    var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.4)) 88%,
    transparent 100%
  );
  margin-bottom: 6px;
}

.hero-footnote__line {
  font-family: var(--font-body, Georgia, serif);
  font-style: italic;
  font-size: 0.78em;
  color: var(--bakery-cocoa-mute, #7a5d3d);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.hero-footnote__line--clicks {
  opacity: 0.85;
}

/* ─── Multipliers (chain breakdown) — chalkboard tally feel ──────────── */
.multipliers {
  width: 100%;
  max-width: 360px;
  margin-top: 4px;
}

.multipliers__toggle {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: baseline;
  gap: 12px;
  width: 100%;
  padding: 10px 16px;
  background: rgba(122, 84, 38, 0.06);
  border: 1px solid var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.18));
  border-radius: 999px;
  cursor: pointer;
  font-family: var(--font-display, Georgia, serif);
  color: var(--bakery-cocoa, #2d1d10);
  transition:
    background 140ms ease-out,
    border-color 140ms ease-out;
}

.multipliers__toggle:hover {
  background: rgba(122, 84, 38, 0.12);
  border-color: var(--bakery-brass, #b1782a);
}

.multipliers__title {
  font-variation-settings:
    'opsz' 14,
    'SOFT' 100,
    'wght' 600;
  font-size: 0.78em;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  text-align: left;
}

.multipliers__count {
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 14,
    'SOFT' 100,
    'wght' 700;
  font-size: 0.85em;
  color: var(--bakery-brass, #b1782a);
  font-variant-numeric: tabular-nums;
}

.multipliers__count-of {
  font-style: italic;
  font-weight: 400;
  color: var(--bakery-cocoa-mute, #7a5d3d);
  margin: 0 2px;
}

.multipliers__caret {
  font-size: 0.85em;
  color: var(--bakery-cocoa-mute, #7a5d3d);
  transition: transform 160ms ease-out;
}
.multipliers__toggle[data-state='open'] .multipliers__caret {
  transform: rotate(-180deg);
}

.multipliers__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 10px;
  padding: 12px 16px;
  background:
    repeating-linear-gradient(
      180deg,
      transparent 0,
      transparent 17px,
      rgba(122, 84, 38, 0.08) 17px,
      rgba(122, 84, 38, 0.08) 18px
    ),
    rgba(248, 239, 214, 0.7);
  border: 1px dashed var(--bakery-rye-line, #b89a6a);
  border-radius: 4px;
  max-height: 280px;
  overflow-y: auto;
}

.multipliers__factor {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: baseline;
  gap: 6px;
  padding: 0;
  font-family: var(--font-body, Georgia, serif);
  font-size: 0.85em;
  line-height: 18px;
  color: var(--bakery-cocoa, #2d1d10);
}

.multipliers__factor-text {
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Dot-leader between text and value — like a printed table of contents */
.multipliers__factor-dots {
  border-bottom: 1px dotted var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.4));
  transform: translateY(-3px);
  min-width: 12px;
}

.multipliers__factor-value {
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 14,
    'SOFT' 100,
    'wght' 700;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--bakery-sage, #5d7a3a);
}

.multipliers__factor.is-inactive {
  color: var(--bakery-cocoa-mute, #7a5d3d);
  opacity: 0.55;
}
.multipliers__factor.is-inactive .multipliers__factor-value {
  color: var(--bakery-cocoa-mute, #7a5d3d);
  font-weight: 400;
}

.multipliers__factor.is-bad .multipliers__factor-value {
  color: var(--bakery-cherry, #a8341a);
}

.multipliers__empty {
  font-style: italic;
  font-size: 0.82em;
  color: var(--bakery-cocoa-mute, #7a5d3d);
  text-align: center;
  padding: 6px;
}
</style>

<!--
  ClickCookieButton — the hero affordance.

  Wraps CookieGlyph in a circular "marble counter" button. Click triggers
  a brief squash + a six-crumb burst that flies outward and fades. CSS
  animations re-armed by bumping a Vue ref used as :key on the burst
  layer (cleanest way to restart a CSS animation on every click).

  Emits no events; consumer attaches @click directly. Forward-passes any
  fallthrough attrs so data-testid="click-cookie" (used by sim) survives.
-->
<script setup lang="ts">
import { ref } from 'vue';
import CookieGlyph from './CookieGlyph.vue';

defineProps<{ label?: string }>();
const emit = defineEmits<{ click: [event: MouseEvent] }>();

const burstId = ref(0);

function onClick(event: MouseEvent): void {
  burstId.value += 1;
  emit('click', event);
}
</script>

<template>
  <button
    type="button"
    class="click-cookie"
    @click="onClick"
  >
    <span class="click-cookie__hearth" />
    <span class="click-cookie__rim" />
    <span class="click-cookie__cookie">
      <CookieGlyph :size="200" />
    </span>
    <span
      :key="burstId"
      class="click-cookie__burst"
      aria-hidden="true"
    >
      <span
        v-for="i in 7"
        :key="i"
        class="click-cookie__crumb"
        :style="{ '--i': i }"
      />
    </span>
    <span class="click-cookie__label">{{ label ?? 'Bake' }}</span>
  </button>
</template>

<style scoped>
.click-cookie {
  position: relative;
  width: 260px;
  height: 260px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  isolation: isolate;
  -webkit-tap-highlight-color: transparent;
}

.click-cookie:focus-visible {
  outline: none;
}

.click-cookie:focus-visible .click-cookie__rim {
  box-shadow:
    0 0 0 2px var(--bakery-cream, #f3e7cc),
    0 0 0 4px var(--bakery-brass, #b1782a);
}

/* "Hearth" — warm radial glow behind the cookie, like an oven door. */
.click-cookie__hearth {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 55%,
    rgba(255, 200, 120, 0.45) 0%,
    rgba(255, 180, 90, 0.18) 35%,
    rgba(120, 60, 20, 0) 70%
  );
  z-index: 0;
  pointer-events: none;
  transition: opacity 200ms ease-out;
}

/* The brass-ringed plate the cookie sits on. */
.click-cookie__rim {
  position: absolute;
  inset: 16px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 240, 210, 0.5) 0%, rgba(241, 226, 188, 0) 60%),
    linear-gradient(180deg, #f1e2bc 0%, #d8b878 100%);
  border: 1px solid var(--bakery-rye-line, #b89a6a);
  box-shadow:
    inset 0 1px 0 rgba(255, 250, 220, 0.8),
    inset 0 -8px 18px rgba(120, 80, 30, 0.18),
    0 14px 30px -10px rgba(80, 40, 10, 0.45);
  z-index: 1;
  transition:
    transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 180ms ease-out;
}

.click-cookie:hover .click-cookie__rim {
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255, 250, 220, 0.85),
    inset 0 -8px 18px rgba(120, 80, 30, 0.18),
    0 18px 36px -10px rgba(80, 40, 10, 0.55);
}

.click-cookie:hover .click-cookie__hearth {
  opacity: 1.15;
}

.click-cookie__cookie {
  position: relative;
  z-index: 2;
  display: block;
  transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: transform;
}

.click-cookie:hover .click-cookie__cookie {
  transform: translateY(-2px) rotate(-1.5deg);
}

.click-cookie:active .click-cookie__cookie {
  transform: scale(0.93) rotate(0.5deg);
  transition-duration: 60ms;
}

.click-cookie:active .click-cookie__rim {
  transform: scale(0.98);
  box-shadow:
    inset 0 1px 0 rgba(255, 250, 220, 0.85),
    inset 0 -4px 12px rgba(120, 80, 30, 0.28),
    0 6px 16px -6px rgba(80, 40, 10, 0.55);
}

/* Bake label — placed beneath the cookie inside the button area */
.click-cookie__label {
  position: absolute;
  bottom: -28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 14,
    'SOFT' 100;
  font-size: 0.78em;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--bakery-brass, #b1782a);
  text-shadow: 0 1px 0 rgba(255, 240, 200, 0.5);
  pointer-events: none;
  white-space: nowrap;
}

/* ─── Crumb burst ────────────────────────────────────────────────────── */
.click-cookie__burst {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  border-radius: 50%;
}

.click-cookie__crumb {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 5px;
  border-radius: 40% 60% 55% 45% / 60% 40% 60% 40%;
  background: radial-gradient(circle at 30% 30%, #e6b56a, #8a5520 80%);
  opacity: 0;
  transform-origin: center;
  animation: cookie-crumb 520ms cubic-bezier(0.18, 0.7, 0.4, 1) forwards;
  /* Each crumb gets a unique angle + distance via the --i custom prop. */
  --angle: calc((var(--i) * 51.4deg) + 20deg);
  --dist: calc(110px + (var(--i) * 4px));
  --spin: calc(var(--i) * 90deg);
  animation-delay: calc(var(--i) * 8ms);
}

.click-cookie__crumb:nth-child(2n) {
  width: 4px;
  height: 4px;
  background: radial-gradient(circle at 30% 30%, #cf9445, #6b3a14 80%);
  --dist: calc(90px + (var(--i) * 5px));
}

.click-cookie__crumb:nth-child(3n) {
  width: 3px;
  height: 3px;
  background: radial-gradient(circle at 30% 30%, #2b170c, #0a0402 80%);
  --dist: calc(80px + (var(--i) * 4px));
}

@keyframes cookie-crumb {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-30px) rotate(0deg);
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(var(--dist) * -1))
      rotate(var(--spin));
  }
}

@media (prefers-reduced-motion: reduce) {
  .click-cookie__cookie,
  .click-cookie__rim,
  .click-cookie__hearth {
    transition: none;
  }
  .click-cookie__crumb {
    animation: none;
    opacity: 0;
  }
}
</style>

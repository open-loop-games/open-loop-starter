<script setup lang="ts">
import { computed } from 'vue';
import {
  AlertDialogRoot,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogAction,
} from 'reka-ui';
import { useModule } from '@/composables/useModule';
import { RoundKey } from '../../modules';

/**
 * Victory / defeat overlay. Sources display state from `round.outcome`; flips
 * visible the moment outcome leaves `'in-progress'`. Restart calls
 * `round.resetGame()`, which clears persistent state to fresh defaults
 * (money = startingMoney, lives = maxLives, round = 1, outcome = in-progress).
 *
 * AlertDialog (not Dialog): end-game is a blocking decision surface — no ESC,
 * no overlay-click dismiss. Player must click "New game" to reset.
 */
const round = useModule(RoundKey);

const visible = computed(() => round.outcome.value !== 'in-progress');
const isVictory = computed(() => round.outcome.value === 'victory');

const title = computed(() => (isVictory.value ? 'Victory' : 'Defeat'));

const summary = computed(() => {
  if (isVictory.value) {
    return 'All 10 rounds cleared. The Monkey Lane holds.';
  }
  return `Lives reached 0 on round ${round.currentRound.value}.`;
});

function restart(): void {
  round.resetGame();
}
</script>

<template>
  <AlertDialogRoot :open="visible">
    <AlertDialogPortal>
      <AlertDialogOverlay class="end-game__overlay" />
      <AlertDialogContent
        class="end-game__panel"
        :class="{ 'end-game__panel--victory': isVictory }"
      >
        <AlertDialogTitle class="end-game__title">
          {{ title }}
        </AlertDialogTitle>
        <p class="end-game__summary">
          {{ summary }}
        </p>
        <AlertDialogAction class="end-game__restart" @click="restart"> New game </AlertDialogAction>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>

<style scoped>
.end-game__overlay {
  position: fixed;
  inset: 0;
  background: var(--modal-backdrop);
  z-index: var(--modal-z-base);
}

.end-game__panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 320px;
  max-width: 420px;
  background: var(--modal-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--modal-radius);
  padding: var(--modal-padding);
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  z-index: calc(var(--modal-z-base) + 1);
  text-align: center;
}

.end-game__panel--victory {
  border-color: var(--color-primary, #4a9eff);
}

.end-game__title {
  margin: 0;
  font-size: 1.5em;
}

.end-game__summary {
  margin: 0;
  color: var(--color-text-muted, var(--color-text));
}

.end-game__restart {
  align-self: stretch;
  padding: var(--gap-sm) var(--gap);
  font: inherit;
  background: var(--color-primary, #4a9eff);
  color: var(--color-on-primary, white);
  border: none;
  border-radius: calc(var(--radius) * 0.75);
  cursor: pointer;
  font-weight: 600;
}

.end-game__restart:hover {
  filter: brightness(1.1);
}
</style>

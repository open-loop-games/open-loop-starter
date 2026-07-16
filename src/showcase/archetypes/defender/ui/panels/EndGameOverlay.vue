<script setup lang="ts">
import { computed } from 'vue';
import { AlertDialogAction } from 'reka-ui';
import { BlockingDialog } from '@/lib';
import { useModule } from '@/composables/useModule';
import { RoundKey } from '../../modules';

/**
 * Victory / defeat overlay. Sources display state from `round.outcome`; flips
 * visible the moment outcome leaves `'in-progress'`. Restart calls
 * `round.resetGame()`, which clears persistent state to fresh defaults
 * (money = startingMoney, lives = maxLives, round = 1, outcome = in-progress).
 *
 * BlockingDialog (not useModalStack): end-game is a blocking decision surface —
 * no ESC, no overlay-click dismiss. Player must click "New game" to reset.
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
  <BlockingDialog
    :open="visible"
    :title="title"
    max-width="420px"
    :panel-class="isVictory ? 'end-game--victory' : undefined"
  >
    <p class="end-game__summary">
      {{ summary }}
    </p>
    <AlertDialogAction
      class="end-game__restart"
      @click="restart"
    >
      New game
    </AlertDialogAction>
  </BlockingDialog>
</template>

<style scoped>
.end-game__summary {
  margin: 0;
  text-align: center;
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

<!-- The panel is portaled to <body>, so the victory accent on BlockingDialog's
     own panel element can't be reached by scoped :deep — it rides `panel-class`
     and this unscoped rule. -->
<style>
.end-game--victory {
  border-color: var(--color-primary, #4a9eff);
}
</style>

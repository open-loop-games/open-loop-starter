<!--
  DreadnoughtNote — the story's end, shown once, when the Dreadnought falls, on the
  scaffold's modal stack. The line goes on: raised carriers keep coming. The stack
  portals it outside `.hardpoint`, so its root carries the costume class itself.
-->
<script setup lang="ts">
import { DialogTitle } from 'reka-ui';
import Button from '@/ui/components/Button.vue';
import { times } from '../format';

defineProps<{
  ship: string;
  honours: number;
  honourMult: number;
  onClose: () => void;
}>();
</script>

<template>
  <section class="hardpoint hp-modal hp-dreadnought">
    <div class="wreck" aria-hidden="true">
      <span v-for="i in 5" :key="i" class="mark" />
    </div>
    <DialogTitle as-child>
      <h2 class="hp-modal-title">The Dreadnought is down</h2>
    </DialogTitle>
    <p>
      The swarm's flagship breaks apart off the {{ ship }}'s bow, and the breach line holds from the
      frigate's first sector to the last.
    </p>
    <p class="tally">
      <span class="hp-num">{{ honours }}</span> honours ·
      <span class="hp-num">{{ times(honourMult) }}</span> on every weapon
    </p>
    <p class="after">The swarm keeps sending raised carriers. The bay stays open.</p>
    <Button class="hp-act can" @click="onClose">Back to the bay</Button>
  </section>
</template>

<style scoped>
.hp-dreadnought {
  text-align: center;
  align-items: center;
}
.wreck {
  display: flex;
  justify-content: center;
  gap: 5px;
  margin-bottom: 10px;
}
.mark {
  width: 12px;
  height: 15px;
  background: var(--honour);
  clip-path: polygon(50% 0, 100% 35%, 80% 100%, 20% 100%, 0 35%);
}
p {
  margin: 0 0 10px;
  color: var(--readout);
}
.tally {
  color: var(--honour);
  font-weight: 600;
}
.after {
  color: var(--readout-dim);
  font-size: 12px;
  margin-bottom: 16px;
}
.hp-act {
  font-family: var(--face-stencil);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 12px;
  padding: 5px 16px;
}
</style>

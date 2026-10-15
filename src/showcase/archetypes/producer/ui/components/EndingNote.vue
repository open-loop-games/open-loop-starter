<!--
  EndingNote — the deed to the Consolidated Building: the firm's story ends, and
  the books stay open.
-->
<script setup lang="ts">
import { DialogTitle } from 'reka-ui';
import Button from '@/ui/components/Button.vue';

const props = defineProps<{
  /** Sim seconds from the first pushcart to the deed. */
  elapsed: number;
  onClose: () => void;
}>();

const took = (() => {
  const hours = Math.floor(props.elapsed / 3600);
  const minutes = Math.round((props.elapsed % 3600) / 60);
  const h = hours === 1 ? '1 hour' : `${hours} hours`;
  return hours ? `${h} and ${minutes} minutes` : `${minutes} minutes`;
})();
</script>

<template>
  <section class="deed">
    <div class="crest" aria-hidden="true">C<span>&amp;</span>H</div>
    <DialogTitle as-child>
      <h2 class="smallcaps">The town is yours</h2>
    </DialogTitle>
    <p>
      From one pushcart to the tallest building in town, in {{ took }}. The name on top is yours.
    </p>
    <p class="after">The desks keep working, and the books stay open.</p>
    <Button class="resume smallcaps" @click="onClose">Back to the desk</Button>
  </section>
</template>

<style scoped>
.deed {
  max-width: 420px;
  padding: 24px 28px;
  display: grid;
  gap: 10px;
  justify-items: center;
  text-align: center;
  background: var(--walnut-grain);
  color: var(--ledger-paper);
  border: 3px double var(--ink-seal);
  border-radius: var(--radius-paper);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
}
.crest {
  width: 56px;
  height: 56px;
  border: 1.5px solid var(--ink-seal);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  font-family: var(--face-letterhead);
  color: var(--ink-seal);
}
.crest span {
  font-style: italic;
}
h2 {
  margin: 0;
  font-family: var(--face-letterhead);
  font-variant: small-caps;
  letter-spacing: 0.08em;
  font-weight: 400;
  font-size: 24px;
  color: var(--ink-seal);
}
p {
  margin: 0;
  font-family: var(--face-letterhead);
}
.after {
  color: var(--typed-dim);
  font-style: italic;
}
.resume {
  margin-top: 6px;
  font-family: var(--face-letterhead);
  font-variant: small-caps;
  letter-spacing: 0.08em;
  border: 1px solid var(--ink-seal);
  background: transparent;
  color: var(--ink-seal);
  border-radius: var(--radius-paper);
  padding: 5px 14px;
}
</style>

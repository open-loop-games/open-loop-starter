<!--
  GrandPrixNote — the Exposition's Grand Prix, shown once, at the staging that wins it, on the scaffold's modal stack. The story ends and the works go on. The stack portals
  it outside `.interlocker`, so its root carries the costume class itself.
-->
<script setup lang="ts">
import { DialogTitle } from 'reka-ui';
import Button from '@/ui/components/Button.vue';

defineProps<{
  /** the calendar's year at the staging that won it */
  year: number;
  /** renown the winning medal paid */
  renown: number;
  /** Expositions staged, the winning one included */
  expositions: number;
  onClose: () => void;
}>();
</script>

<template>
  <section class="interlocker ae-grand-prix">
    <!-- the imperial cipher, as struck on the Exposition's medals -->
    <div class="medallion" aria-hidden="true">N</div>
    <DialogTitle as-child>
      <h2 class="ae-lettering">Paris, {{ year }} — the Grand Prix</h2>
    </DialogTitle>
    <p>
      After <span class="ae-figure">{{ expositions }}</span> Expositions the jury gives the Imperial
      Aeroworks its Grand Prix, and <span class="ae-figure gain">{{ renown }}</span>
      renown. Monoplanes of Deville's metal circle the Champ de Mars, and the Emperor names Le
      Bourget the first aerodrome of the Empire.
    </p>
    <p class="after">The drawing board stays pinned; the works go on.</p>
    <Button class="ae-act can" :repeat="false" @click="onClose">Back to the board</Button>
  </section>
</template>

<style scoped>
.ae-grand-prix {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 24px 26px 20px;
  text-align: center;
}
.medallion {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 4px double var(--ae-brass);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ae-brass);
  font-family: var(--ae-face-book);
  font-weight: 700;
  font-size: 30px;
  line-height: 1;
  animation: ae-inked 0.8s ease-out;
}
h2 {
  margin: 0;
  font-size: 15px;
  color: var(--ae-chalk);
}
p {
  margin: 0;
  color: var(--ae-drafting-line);
}
.gain {
  color: var(--ae-brass);
}
.after {
  font-style: italic;
  color: var(--ae-drafting-line-faint);
}
.ae-act {
  margin-top: 6px;
}
</style>

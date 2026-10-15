<!--
  StageConfirm — the Exposition's last word before the works are cleared, pushed on the
  scaffold's modal stack. The stack portals it outside `.interlocker`, so its root carries
  the costume class itself. Dismissing the dialog cancels.
-->
<script setup lang="ts">
import { DialogTitle } from 'reka-ui';
import Button from '@/ui/components/Button.vue';

defineProps<{ renown: number; medal?: string; planes: number; kept: string[] }>();
const emit = defineEmits<{ stage: []; cancel: [] }>();
</script>

<template>
  <div class="interlocker ae-stage-confirm">
    <DialogTitle as-child><h2 class="ae-lettering">Stage the Exposition?</h2></DialogTitle>
    <p>
      <span class="ae-figure">{{ planes }}</span> aeroplanes go before the Emperor<template
        v-if="medal"
      >
        for the <span class="gain">{{ medal }}</span></template
      >
      and <span class="ae-figure gain">{{ renown }}</span> renown. The works are then cleared to the
      ground: stock, buildings, compagnons<template v-if="!kept.length"> and every patent</template
      ><template v-else> and every patent but {{ kept.join(', ') }}</template
      >.
    </p>
    <div class="actions">
      <Button class="ae-act" @click="emit('cancel')">Not yet</Button>
      <Button class="ae-act can" @click="emit('stage')">Stage it</Button>
    </div>
  </div>
</template>

<style scoped>
.ae-stage-confirm {
  padding: 20px 22px 18px;
}
h2 {
  margin: 0 0 10px;
  font-size: 15px;
  color: var(--ae-chalk);
}
p {
  margin: 0 0 16px;
  color: var(--ae-drafting-line);
}
.gain {
  color: var(--ae-brass);
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.actions .ae-act:not(.can) {
  cursor: pointer;
  color: var(--ae-drafting-line);
  border-color: var(--ae-cyanotype-rule);
}
</style>

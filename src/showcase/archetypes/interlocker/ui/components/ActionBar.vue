<!--
  ActionBar — the manual opener buttons (Gather catnip / Refine catnip) that
  sit at the top of canon's Bonfire tab and bootstrap the colony from zero.
  Wide, prominent buttons mirroring canon's full-width action rows; hold-to-
  repeat comes from the shared Button.
-->
<script setup lang="ts">
import Button from '@/ui/components/Button.vue';
import { useActions } from '../composables';

const actions = useActions();
</script>

<template>
  <div class="action-bar">
    <Button
      v-for="a in actions"
      :key="a.id"
      :disabled="!a.enabled.value"
      :data-testid="`action-${a.id}`"
      class="action-bar__btn"
      @click="a.run()"
    >
      <span class="action-bar__label">{{ a.label.value }}</span>
      <span class="action-bar__detail">{{ a.detail.value }}</span>
    </Button>
  </div>
</template>

<style scoped>
.action-bar {
  display: flex;
  gap: var(--gap-sm);
  margin-bottom: var(--gap-sm);
}
.action-bar__btn {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--gap-sm) var(--gap);
}
.action-bar__label {
  font-weight: 600;
}
.action-bar__detail {
  font-size: 0.75em;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
</style>

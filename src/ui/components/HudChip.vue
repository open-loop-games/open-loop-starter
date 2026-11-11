<!--
  HudChip — rounded pill badge used inside HudBar. Variants:
    default — standard chip (CF rate chip, IL loop counter)
    big     — larger padding, bigger font (CF cookie total)
    muted   — muted text color (CF rate "10/s")
    danger  — danger text color (a readout in deficit)
    stat    — compact tabular-nums chip (IL stat row)
    toggle  — chip wrapping a <label>/<input>, cursor:pointer
  Emits nothing; content in the default slot.

  Custom props: --hud-chip-radius, by default the palette's --radius-pill. The
  stat variant keeps --radius-sm.
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'default' | 'big' | 'muted' | 'danger' | 'stat' | 'toggle';
  }>(),
  { variant: 'default' },
);
</script>

<template>
  <component
    :is="variant === 'toggle' ? 'label' : 'div'"
    class="hud-chip"
    :class="`hud-chip--${variant}`"
  >
    <slot />
  </component>
</template>

<style scoped>
.hud-chip {
  /* Read the token, never set it, so a value set on any ancestor reaches the widget. */
  --_hud-chip-radius: var(--hud-chip-radius, var(--radius-pill));

  padding: 4px 12px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--_hud-chip-radius);
  font-weight: 600;
  color: var(--color-text);
}
.hud-chip--big {
  font-size: 1.3em;
  padding: 8px 20px;
}
.hud-chip--muted {
  color: var(--color-text-muted);
  font-weight: 500;
}
.hud-chip--danger {
  color: var(--color-danger);
  font-weight: 600;
}
.hud-chip--stat {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.75em;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}
.hud-chip--toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  font-size: 0.85em;
  font-weight: 500;
  color: var(--color-text-muted);
}
.hud-chip--toggle :deep(input) {
  margin: 0;
}
</style>

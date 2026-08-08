<script setup lang="ts">
defineProps<{ producerId: string }>();
</script>

<template>
  <svg v-if="producerId === 'planter'" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 14 L 7 22 H 17 L 18 14 Z" stroke="currentColor" stroke-width="1.2" fill="none" />
    <path d="M5 14 H 19" stroke="currentColor" stroke-width="1.2" />
    <path d="M12 14 V 8" stroke="currentColor" stroke-width="1.2" fill="none" />
    <path d="M12 10 Q 8 9 8 11" stroke="currentColor" stroke-width="1" fill="none" />
    <path d="M12 10 Q 16 9 16 11" stroke="currentColor" stroke-width="1" fill="none" />
  </svg>
  <svg v-else-if="producerId === 'coop'" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 12 L 12 4 L 20 12" stroke="currentColor" stroke-width="1.2" fill="none" />
    <rect x="6" y="12" width="12" height="9" stroke="currentColor" stroke-width="1.2" fill="none" />
    <rect x="10" y="15" width="4" height="6" stroke="currentColor" stroke-width="1" fill="none" />
    <circle cx="12" cy="10" r="1" fill="currentColor" />
  </svg>
  <svg v-else-if="producerId === 'pond'" viewBox="0 0 24 24" aria-hidden="true">
    <ellipse cx="12" cy="14" rx="8" ry="5" stroke="currentColor" stroke-width="1.2" fill="none" />
    <path
      d="M8 12 Q 12 11 16 12"
      stroke="currentColor"
      stroke-width="1"
      fill="none"
      opacity="0.7"
    />
    <path
      d="M9 15 Q 12 14 15 15"
      stroke="currentColor"
      stroke-width="1"
      fill="none"
      opacity="0.5"
    />
  </svg>
  <svg v-else-if="producerId === 'pasture'" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2 16 L 22 16" stroke="currentColor" stroke-width="1.2" />
    <path d="M5 16 V 10" stroke="currentColor" stroke-width="1" />
    <path d="M9 16 V 11" stroke="currentColor" stroke-width="1" />
    <path d="M5 12 L 9 12.5" stroke="currentColor" stroke-width="1" />
    <circle cx="15" cy="14" r="1.2" fill="currentColor" opacity="0.6" />
    <circle cx="18" cy="14" r="1.2" fill="currentColor" opacity="0.6" />
  </svg>
  <svg v-else-if="producerId === 'orchard'" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 22 V 14" stroke="currentColor" stroke-width="1.4" />
    <circle cx="12" cy="9" r="6" stroke="currentColor" stroke-width="1.2" fill="none" />
    <circle cx="10" cy="7" r="1" fill="currentColor" opacity="0.6" />
    <circle cx="14" cy="8" r="1" fill="currentColor" opacity="0.6" />
    <circle cx="12" cy="11" r="1" fill="currentColor" opacity="0.6" />
  </svg>
</template>

<style scoped>
svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>

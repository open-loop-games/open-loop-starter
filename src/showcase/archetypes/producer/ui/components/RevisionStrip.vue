<!--
  RevisionStrip — 19 firmware revisions as a pip row.

  Deliberately not `AchievementGrid`: revisions carry no individually
  interesting text (each is "cross a threshold, everything gets ×1.03"), and a
  grid of 19 cards would claim the right column for content whose whole value
  is the *count*. The pips say how far along the splice sequence you are, which
  is the only thing the spine asks the player to read here.

  A fork whose achievements have real per-entry content should reach for
  `AchievementGrid` in a dialog instead — ambient does exactly that.
-->
<script setup lang="ts">
defineProps<{
  earned: number;
  total: number;
}>();
</script>

<template>
  <div class="rev">
    <div class="rev__pips">
      <span
        v-for="i in total"
        :key="i"
        class="rev__pip"
        :data-earned="i <= earned"
        aria-hidden="true"
      />
    </div>
    <span class="rev__count">{{ earned }} / {{ total }} firmware revisions pushed</span>
  </div>
</template>

<style scoped>
.rev {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rev__pips {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}
.rev__pip {
  width: 9px;
  height: 9px;
}
.rev__count {
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  opacity: 0.6;
}
</style>

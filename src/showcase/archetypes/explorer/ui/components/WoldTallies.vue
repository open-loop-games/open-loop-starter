<!--
  WoldTallies — the masthead's live readouts: tiles charted, the share of the
  wold, and the play clock. It reads module state, so it is its own component in
  SystemHeader's slot and never a root read.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { getChronicle, getWold } from '../../modules';
import { playClock } from '../format';

const wold = getWold();
const chronicle = getChronicle();

const openTiles = wold.tiles.filter((t) => !t.blocked).length;
const share = computed(() => Math.floor((100 * wold.chartedCount.value) / wold.tiles.length));
</script>

<template>
  <dl class="sp-tallies">
    <div>
      <dt>Charted</dt>
      <dd class="sp-num">
        {{ wold.chartedCount.value
        }}<span v-if="wold.notesCount.value" class="noted">+{{ wold.notesCount.value }}</span>
      </dd>
    </div>
    <div>
      <dt>Of the wold</dt>
      <dd class="sp-num">{{ share }}%</dd>
    </div>
    <div class="dim" :title="`${openTiles} tiles of open ground`">
      <dt>Afield</dt>
      <dd class="sp-num">{{ playClock(chronicle.time.totalPlayTime.value) }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.sp-tallies {
  display: flex;
  gap: 22px;
  margin: 0;
}
.sp-tallies div {
  display: flex;
  flex-direction: column;
}
.sp-tallies dt {
  font-size: 11px;
  color: var(--sp-ash);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.sp-tallies dd {
  margin: 0;
  font-family: var(--sp-face-display);
  font-size: 20px;
  color: var(--sp-birch);
  min-width: 3ch;
}
.sp-tallies .noted {
  margin-left: 3px;
  font-size: 13px;
  color: var(--sp-tallow-deep);
}
.sp-tallies .dim dd {
  color: var(--sp-birch-dim);
}
</style>

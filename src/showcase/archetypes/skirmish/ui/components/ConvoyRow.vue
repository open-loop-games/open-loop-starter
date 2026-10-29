<!--
  ConvoyRow — what walks the roads: your convoys, each with where it is going, the seconds
  until it gets there and an order to turn it home; and the rival's convoys you can see,
  each with the road it is on. A rival convoy shows only while you see an end of its road,
  and nothing remembers it after.
-->
<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/ui/components/Button.vue';
import { getMatch } from '../../modules';
import { redirect } from '../../modules/orders';
import { destination, roadsLeft } from '../../modules/travel';
import { placeName } from '../format';
import SquadChips from './SquadChips.vue';

const match = getMatch();
const { p } = match;
const rival = computed(() => match.contract.value.rival);
const live = computed(() => match.phase.value === 'live');
const mine = computed(() => p.convoys.value);
const theirs = computed(() => match.seenConvoys());
const eta = (roads: number) => Math.ceil(roads * match.tune.hopS.value);
</script>

<template>
  <section class="roads" aria-label="The roads">
    <span class="cc-tag">On the roads</span>
    <ul v-if="mine.length || theirs.length" class="roads__list">
      <li v-for="c in mine" :key="`p${c.id}`" class="convoy" data-side="p">
        <SquadChips :counts="c.counts" side="p" />
        <span class="convoy__where"
          >→ {{ placeName(destination(c), rival) }}
          <span class="num convoy__eta">{{ eta(roadsLeft(c)) }}s</span></span
        >
        <Button
          v-if="destination(c) !== 'p'"
          class="cc-order"
          :disabled="!live"
          @click="redirect(p, c.id, 'p')"
          >Turn home</Button
        >
      </li>
      <li v-for="c in theirs" :key="`e${c.id}`" class="convoy" data-side="e">
        <SquadChips :counts="c.counts" side="e" />
        <span class="convoy__where"
          >{{ placeName(c.from, rival) }} → {{ placeName(c.path[0]!, rival) }}</span
        >
      </li>
    </ul>
    <span v-else class="cc-fog">Nobody on the roads you can see.</span>
  </section>
</template>

<style scoped>
.roads {
  flex: none;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  min-height: 24px;
  background: var(--cc-asphalt-raised);
  border: 1px solid var(--cc-gutter);
  border-radius: var(--cc-notch);
}
.roads > .cc-tag {
  flex: none;
  white-space: nowrap;
  line-height: 24px;
}
.roads__list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.convoy {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.convoy__where {
  color: var(--cc-chalk-dim);
}
.convoy[data-side='e'] .convoy__where {
  color: var(--cc-rival);
}
.convoy__eta {
  display: inline-block;
  min-width: 3.5ch;
  text-align: right;
  color: var(--cc-chalk);
  font-variant-numeric: tabular-nums;
}
</style>

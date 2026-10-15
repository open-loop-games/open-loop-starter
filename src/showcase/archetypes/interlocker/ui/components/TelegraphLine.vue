<!--
  TelegraphLine — the works' wire, newest first: patents in chalk,
  first buildings in line work, Expositions in brass, the Ministry's orders under a brass
  rule, the turn of the seasons in italic, shortfalls in vermilion. Each wire carries the
  play clock it was sent at.
-->
<script setup lang="ts">
import { getTelegraph, getWorks } from '../../modules';
import { clock } from '../format';

const telegraph = getTelegraph();
const works = getWorks();
const sawpit = works.researched('sawpit');
</script>

<template>
  <div class="ae-telegraph" aria-label="Telegraph">
    <h2 class="ae-section-head">Telegraph</h2>
    <ol>
      <li v-for="w in telegraph.log.value" :key="w.id" :class="w.kind">
        <span class="when ae-figure">{{ clock(w.at) }}</span>
        <span class="what">{{ w.text }}</span>
      </li>
      <li v-if="!telegraph.log.value.length" class="quiet">
        The line is quiet.<template v-if="!sawpit">
          Patent the Sawpit Guild to put the compagnons to work.</template
        >
      </li>
    </ol>
  </div>
</template>

<style scoped>
ol {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.86rem;
}
li {
  display: grid;
  grid-template-columns: 3.3rem 1fr;
  gap: 6px;
  padding: 4px 0;
  border-bottom: 1px dotted var(--ae-cyanotype-wash);
  animation: ae-inked 0.5s ease-out;
}
.when {
  color: var(--ae-drafting-line-faint);
}
.what {
  color: var(--ae-drafting-line);
}
.research .what {
  color: var(--ae-chalk);
}
.expo .what {
  color: var(--ae-brass);
}
.order .what {
  color: var(--ae-chalk);
  padding-left: 6px;
  border-left: 2px solid var(--ae-brass-dim);
}
.season .what {
  font-style: italic;
  color: var(--ae-drafting-line-faint);
}
.warn .what {
  color: var(--ae-vermilion);
}
.quiet {
  display: block;
  font-style: italic;
  color: var(--ae-drafting-line-faint);
}
</style>

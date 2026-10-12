<script setup lang="ts">
import { computed } from 'vue';
import { getMeta, getNight } from '../../modules';
import { LANDMARKS } from '../../data';
import { clock, delta } from '../format';

const meta = getMeta();
const night = getNight();
const rows = computed(() =>
  Object.keys(LANDMARKS).map((k) => {
    const tonight = night.nightActive.value ? night.splits.value[k] : undefined;
    const last = meta.lastSplits.value[k];
    const best = meta.bestSplits.value[k];
    return {
      k,
      name: LANDMARKS[+k],
      tonight,
      last,
      best,
      diff: tonight !== undefined && last !== undefined ? tonight - last : undefined,
      known: best !== undefined,
    };
  }),
);
</script>

<template>
  <section class="lo-panel lo-splits" aria-label="The count">
    <h2>The Count</h2>
    <table>
      <thead>
        <tr>
          <th />
          <th>tonight</th>
          <th>last</th>
          <th>best</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.k" :class="{ unknown: !r.known && r.tonight === undefined }">
          <th scope="row">{{ r.known || r.tonight !== undefined ? r.name : '· · ·' }}</th>
          <td class="lo-num">
            <template v-if="r.tonight !== undefined">
              {{ clock(r.tonight) }}
              <span v-if="r.diff !== undefined" :class="r.diff <= 0 ? 'faster' : 'slower'">{{
                delta(r.diff)
              }}</span>
            </template>
          </td>
          <td class="lo-num">{{ r.last !== undefined ? clock(r.last) : '' }}</td>
          <td class="lo-num best">{{ r.best !== undefined ? clock(r.best) : '' }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
thead th {
  font-weight: normal;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--lo-ink-faded);
  text-align: right;
  padding-bottom: 4px;
}
tbody th {
  font-weight: normal;
  text-align: left;
  color: var(--lo-chalk);
  padding: 4px 0;
}
td {
  text-align: right;
  color: var(--lo-chalk);
  padding: 4px 0 4px 10px;
  white-space: nowrap;
}
tbody tr {
  border-top: 1px solid var(--lo-concrete-edge);
}
tr.unknown th {
  color: var(--lo-ink-faded);
}
.best {
  color: var(--lo-searchlight);
}
.faster {
  color: var(--lo-guard-lamp);
  margin-left: 4px;
  font-size: 12px;
}
.slower {
  color: var(--lo-jumpsuit);
  margin-left: 4px;
  font-size: 12px;
}
</style>

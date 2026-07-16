<!--
  MergePanel — the wallet + the Merge bell. Fragments bank automatically on the
  crossing; this panel shows the wallet and turns the ended run into the next one.
  When the bell has rung the Merge action lights up and re-pegs; while a run is
  live it shows the payout accruing.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { format } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { getPrestige } from '../../modules';
import { useCyclerRun } from '../../composables/useCyclerRun';

const prestige = getPrestige();
const run = useCyclerRun();

const fragments = computed(() => format(prestige.fragments.value, 0));
const lifetime = computed(() => format(prestige.lifetimeFragments.value, 0));
const pending = computed(() => format(run.pendingFragments.value, 0));
const mergeCount = computed(() => prestige.mergeCount.value);

function doMerge(): void {
  run.merge();
}
</script>

<template>
  <section
    class="merge"
    :data-ended="run.ended.value ? 'true' : 'false'"
  >
    <header class="merge__wallet">
      <div class="merge__frag">
        <span class="merge__frag-num">{{ fragments }}</span>
        <span class="merge__frag-label">Fragments</span>
      </div>
      <dl class="merge__meta">
        <div>
          <dt>Lifetime</dt>
          <dd>{{ lifetime }}</dd>
        </div>
        <div>
          <dt>Merges</dt>
          <dd>{{ mergeCount }}</dd>
        </div>
        <div>
          <dt>Power L</dt>
          <dd>{{ run.powerLevel.value }}</dd>
        </div>
      </dl>
    </header>

    <div class="merge__action">
      <Button
        class="merge__btn"
        :disabled="!run.ended.value"
        @click="doMerge"
      >
        <span v-if="run.ended.value">Merge &amp; re-peg</span>
        <span v-else>Run in progress…</span>
      </Button>
      <p class="merge__hint">
        <template v-if="run.ended.value">
          Banked <strong>{{ pending }}</strong> Fragments. Spend, then merge to start the next run.
        </template>
        <template v-else>
          Accruing <strong>{{ pending }}</strong> Fragments — banks at the merge bell.
        </template>
      </p>
    </div>
  </section>
</template>

<style scoped>
.merge {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  padding: var(--gap);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--cyc-vessel-bg);
}
.merge__wallet {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.merge__frag {
  display: flex;
  align-items: baseline;
  gap: var(--gap-sm);
}
.merge__frag-num {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 1.9rem;
  font-weight: 700;
  color: var(--cyc-fragment);
}
.merge__frag-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}
.merge__meta {
  display: flex;
  gap: var(--gap);
  margin: 0;
}
.merge__meta div {
  display: flex;
  flex-direction: column;
}
.merge__meta dt {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}
.merge__meta dd {
  margin: 0;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 0.95rem;
  color: var(--color-text);
}

.merge__action {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.merge__btn {
  width: 100%;
  padding: var(--gap-sm) var(--gap);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface-hover);
  color: var(--color-text-muted);
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: not-allowed;
  transition:
    background 0.3s ease,
    color 0.3s ease,
    box-shadow 0.3s ease;
}
.merge[data-ended='true'] .merge__btn {
  background: var(--cyc-fragment);
  color: #10121f;
  border-color: var(--cyc-fragment);
  cursor: pointer;
  box-shadow: 0 0 16px color-mix(in srgb, var(--cyc-fragment) 45%, transparent);
}
.merge__hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}
</style>

<!--
  HoldingsPanel — the main column: one share certificate per subsidiary on the
  green blotter, then the sealed prospectus of the next tier. It is starter's
  `ProducerList` with the certificate drawn in the `#row` slot; the engine
  handles ride the row's `extra`, so the flat contract stays flat.
-->
<script setup lang="ts">
import { computed, toValue } from 'vue';
import {
  Decimal,
  type DecimalSource,
  type Modifier,
  type ModifierDescription,
  type Producer,
} from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import BulkModeSelector from '@/ui/components/BulkModeSelector.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import { ProducerList, type ProducerRowData } from '@/ui/compositions';
import type { SubsidiaryDef } from '../../data';
import { getAutomation, getFirm } from '../../modules';
import { amount, money, perSecond } from '../format';

interface HoldingExtra {
  def: SubsidiaryDef;
  producer: Producer;
}
type HoldingRow = ProducerRowData<HoldingExtra>;

const firm = getFirm();
const automation = getAutomation();
const deskBuying = computed(() => automation.working('acquisitions-desk'));

const rows: HoldingRow[] = firm.subsidiaries.getAll().map(({ def, producer }) => {
  const repeatable = producer.repeatable!;
  // `countToPurchase` floors at 1 even when nothing is affordable, so the zero
  // case comes from `canPurchase`.
  const maxAffordable = computed<DecimalSource>(() =>
    repeatable.canPurchase.value ? repeatable.countToPurchase.value : 0,
  );
  return {
    id: def.id,
    displayName: def.displayName,
    count: producer.ownedCount,
    displayRate: computed(() =>
      Decimal.mul(producer.computedRate.value, producer.ownedCount.value),
    ),
    cost: (count) => repeatable.getCost(count),
    canPurchase: (count) => repeatable.canPurchase.value && Decimal.gte(maxAffordable.value, count),
    maxAffordable,
    purchase: (count) => {
      repeatable.purchase(count);
    },
    unlocked: computed(() => repeatable.visible.value),
    extra: { def, producer },
  };
});

/** The stack as the rate chain describes it: one line per bound contribution. */
function breakdown(chain: Modifier): ModifierDescription[] {
  const lines = toValue(chain.description);
  return lines === undefined ? [] : Array.isArray(lines) ? lines : [lines];
}

const owned = (row: HoldingRow) => Decimal.fromValue(row.count.value).toNumber();
const each = (row: HoldingRow) => Decimal.fromValue(row.extra!.producer.computedRate.value);
const stack = (row: HoldingRow) => each(row).div(row.extra!.def.baseRate);
const progress = (cost: DecimalSource) =>
  Math.min(1, Decimal.fromValue(firm.cash.value).div(cost).toNumber());

/** The next sealed prospectus: the first hidden subsidiary, opened by owning the one before it. */
const sealed = computed(() => {
  const i = rows.findIndex((r) => !r.unlocked!.value);
  if (i < 1) return undefined;
  return { opener: rows[i - 1].extra!.def.unit };
});
</script>
<template>
  <section class="holdings">
    <ProducerList :rows="rows" cost-label="cash">
      <template #header>
        <div class="panel-head">
          <h2 class="smallcaps">Holdings</h2>
          <span v-if="deskBuying" class="desk-tag smallcaps">Acquisitions desk buying</span>
          <BulkModeSelector class="bulk" :modes="[1, 10, 'max']" />
        </div>
      </template>
      <template #row="{ row, pendingCount, pendingCost, purchase }">
        <article
          class="cert"
          :class="{
            affordable: row.canPurchase(pendingCount),
            held: owned(row) > 0,
            automated: deskBuying,
          }"
          :data-testid="`sub-${row.id}`"
        >
          <div class="cert-main">
            <div class="cert-title">
              <h3 class="smallcaps">{{ row.displayName }}</h3>
              <span class="held-count num">{{ owned(row) }}</span>
            </div>
            <p class="blurb">{{ row.extra!.def.blurb }}</p>
            <div class="yield num">
              <span>{{ perSecond(row.displayRate.value) }}</span>
              <span class="each"
                >&nbsp;·&nbsp;{{ perSecond(each(row)) }} per {{ row.extra!.def.unit }}</span
              >
            </div>
            <details class="stack">
              <summary>
                <span class="num">×{{ amount(stack(row)) }}</span> on the books
              </summary>
              <ul>
                <li>
                  <span>Base, per {{ row.extra!.def.unit }}</span
                  ><span class="num">{{ perSecond(row.extra!.def.baseRate) }}</span>
                </li>
                <li v-for="(line, i) in breakdown(row.extra!.producer.rateChain)" :key="i">
                  <span>{{ line.text }}</span
                  ><span class="num">{{ line.formattedValue }}</span>
                </li>
              </ul>
            </details>
          </div>
          <div class="cert-buy">
            <Button
              class="acquire"
              :disabled="!row.canPurchase(pendingCount)"
              :data-testid="`buy-${row.id}`"
              @click="purchase()"
            >
              <span class="smallcaps"
                >Acquire<span v-if="Decimal.gt(pendingCount, 1)" class="num">
                  ×{{ amount(pendingCount) }}</span
                ></span
              >
              <span class="price num">{{ money(pendingCost) }}</span>
            </Button>
            <ProgressBar
              v-if="!row.canPurchase(pendingCount)"
              class="saving"
              :value="progress(pendingCost)"
            />
          </div>
        </article>
      </template>
    </ProducerList>

    <div v-if="sealed" class="prospectus">
      <span class="wax" aria-hidden="true" />
      <div>
        <div class="smallcaps">Sealed prospectus</div>
        <div class="terms">Opens when the firm owns its first {{ sealed.opener }}.</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.holdings {
  background: var(--blotter);
  border: 1px solid var(--blotter-edge);
  border-radius: var(--radius-paper);
  padding: 14px 16px 18px;
  box-shadow:
    inset 0 0 40px rgba(0, 0, 0, 0.35),
    0 10px 30px rgba(0, 0, 0, 0.4);
  min-height: calc(100vh - 36px);
}
.panel-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  border-bottom: 1px solid var(--ledger-rule);
  margin-bottom: 12px;
}
.panel-head h2 {
  flex: 1;
}
.holdings :deep(.producer-list__header) {
  display: block;
}
.holdings :deep(.producer-list__rows) {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.holdings :deep(.producer-list__row) {
  animation: ch-seal-reveal 2.4s ease-out;
}
.bulk :deep(.olui-bulk-mode__item) {
  font-family: var(--face-letterhead);
  font-variant: small-caps;
  font-size: 12px;
  padding: 1px 8px;
  background: transparent;
  border-color: var(--ledger-rule);
  color: var(--typed-dim);
  border-radius: var(--radius-paper);
}
.bulk :deep(.olui-bulk-mode__item[aria-checked='true']),
.bulk :deep(.olui-bulk-mode__item[data-state='on']) {
  color: var(--ink-seal);
  border-color: var(--ink-seal);
}
h2 {
  margin: 0 0 6px;
  font-size: 19px;
  font-weight: 400;
}
.desk-tag {
  color: var(--ink-carbon);
  font-size: 12px;
}

/* A share certificate: double engraved border, a guilloche hint in the margin. */
.cert {
  display: grid;
  grid-template-columns: 1fr 150px;
  gap: 14px;
  padding: 10px 12px;
  border: 1px solid rgba(231, 220, 193, 0.16);
  outline: 1px solid rgba(231, 220, 193, 0.07);
  outline-offset: -5px;
  border-radius: var(--radius-paper);
  background:
    repeating-radial-gradient(
      circle at 0 50%,
      transparent 0 5px,
      rgba(231, 220, 193, 0.025) 5px 6px
    ),
    rgba(10, 14, 12, 0.35);
}
.cert.affordable {
  border-color: rgba(124, 199, 154, 0.55);
}
.cert-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 400;
}
.held-count {
  font-size: 24px;
  color: var(--ledger-paper);
}
.cert:not(.held) .held-count {
  color: var(--ink-filed);
}
.blurb {
  margin: 0 0 4px;
  color: var(--typed-dim);
  font-size: 13px;
  font-style: italic;
  font-family: var(--face-letterhead);
}
.yield {
  font-size: 15px;
  color: var(--ink-affordable);
}
.cert:not(.held) .yield {
  color: var(--ink-filed);
}
.yield .each {
  color: var(--typed-dim);
  font-size: 13px;
}

.stack {
  margin-top: 4px;
  font-size: 13px;
  color: var(--typed-dim);
}
.stack summary {
  cursor: pointer;
  list-style: none;
}
.stack summary::-webkit-details-marker {
  display: none;
}
.stack summary .num {
  color: var(--ink-seal);
}
.stack ul {
  list-style: none;
  margin: 4px 0 0;
  padding: 4px 0 0 10px;
  border-left: 1px solid var(--ledger-rule);
}
.stack li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.cert-buy {
  display: grid;
  gap: 5px;
  align-content: center;
}
.acquire {
  display: grid;
  gap: 1px;
  padding: 6px 8px;
  border: 1px solid var(--ink-affordable);
  background: rgba(124, 199, 154, 0.1);
  color: var(--ink-affordable);
  border-radius: var(--radius-paper);
  text-align: left;
}
.acquire .smallcaps {
  font-size: 13px;
}
.acquire .price {
  font-size: 16px;
}
.acquire:hover:not(:disabled) {
  background: rgba(124, 199, 154, 0.2);
}
.acquire:disabled {
  border-color: rgba(201, 101, 79, 0.35);
  background: transparent;
  color: var(--ink-debit);
  cursor: default;
}
.acquire:disabled .smallcaps {
  color: var(--ink-filed);
}
.cert.automated .acquire:not(:disabled) {
  border-style: dashed;
  border-color: var(--ink-carbon);
  color: var(--ink-carbon);
  background: rgba(127, 159, 211, 0.08);
}

.saving {
  --progress-bar-fill: var(--ink-debit);
  --progress-bar-track: var(--ledger-rule);
  --progress-bar-radius: 0;
  opacity: 0.7;
}
.saving :deep(.olui-progress-bar__track) {
  min-height: 2px;
}

.prospectus {
  margin-top: 12px;
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border: 1px dashed rgba(210, 169, 78, 0.35);
  border-radius: var(--radius-paper);
  color: var(--typed-dim);
  font-size: 13px;
}
.prospectus .smallcaps {
  color: var(--ink-seal);
  font-size: 14px;
}
.wax {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #a8483a, #6e2419 70%);
  box-shadow: 0 0 0 3px rgba(110, 36, 25, 0.35);
  flex: none;
}
.terms {
  margin: 2px 0 5px;
}
.prospectus > div {
  flex: 1;
}
</style>

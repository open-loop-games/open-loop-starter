<!--
  OfficePanel — the right rail: the executive floor (hires, their duty
  switches, the night bookkeeper), the management memos on the desk, and the
  wall of market-leader certificates. Memos are starter's `UpgradeGrid` in one
  column, each card drawn in the `#card` slot; a signed memo leaves the desk.
-->
<script setup lang="ts">
import { computed } from 'vue';
import type { Purchasable } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { UpgradeGrid, type UpgradeCardData } from '@/ui/compositions';
import { BOOKKEEPER_DEF, type HireId, type ManagementDef } from '../../data';
import { getAutomation, getFirm, getOffline } from '../../modules';
import { money } from '../format';

const firm = getFirm();
const automation = getAutomation();
const offline = getOffline();

interface FloorEntry {
  id: string;
  title: string;
  description: string;
  cost: number;
  p: Purchasable;
  /** The desk this hire switches, if it is a desk. */
  desk?: HireId;
}

const floor: FloorEntry[] = [
  ...automation.executives.getAll().map((e) => ({
    id: e.def.id,
    title: e.def.title,
    description: e.def.description,
    cost: e.def.cost,
    p: e.purchasable,
    desk: e.def.id,
  })),
  {
    id: BOOKKEEPER_DEF.id,
    title: BOOKKEEPER_DEF.title,
    description: BOOKKEEPER_DEF.description,
    cost: BOOKKEEPER_DEF.cost,
    p: offline.bookkeeper,
  },
];

const hires = computed(() =>
  floor
    .filter((e) => e.p.visible.value || e.p.active.value)
    .map((e) => ({
      ...e,
      hired: e.p.active.value,
      canBuy: e.p.canPurchase.value,
      on: e.desk ? automation.deskOn[e.desk].value : true,
    })),
);

const boardSitting = computed(() => automation.working('board'));

type MemoCard = UpgradeCardData<ManagementDef>;
const memos: MemoCard[] = [...firm.management.getAll()]
  .sort((a, b) => a.def.cost - b.def.cost)
  .map(({ def, purchasable }) => ({
    id: def.id,
    displayName: def.title,
    description: def.description,
    cost: computed(() => def.cost),
    costLabel: 'cash',
    canPurchase: purchasable.canPurchase,
    owned: purchasable.active,
    purchase: () => purchasable.purchase(1),
    extra: def,
  }));
const onDesk = computed(() =>
  firm.management
    .getAll()
    .filter((e) => e.purchasable.visible.value && !e.purchasable.active.value),
);
const visibleMemos = computed(() =>
  memos.filter((m) => onDesk.value.some((e) => e.def.id === m.id)),
);
const filed = computed(() => firm.management.purchasedCount.value);

const wall = computed(() =>
  firm.subsidiaries
    .getAll()
    .filter((s) => s.producer.repeatable!.visible.value)
    .map((s) => ({
      name: s.def.displayName,
      frames: firm.milestones
        .getAll()
        .filter((m) => m.def.subsidiary === s.def.id)
        .map((m) => ({ id: m.def.id, count: m.def.count, earned: m.achievement.earned.value })),
    })),
);

function toggle(id: HireId) {
  automation.deskOn[id].value = !automation.deskOn[id].value;
}
</script>
<template>
  <section class="office">
    <div v-if="hires.length" class="block">
      <h2 class="smallcaps">Executive floor</h2>
      <TransitionGroup name="reveal" tag="div" class="hires" appear>
        <article
          v-for="h in hires"
          :key="h.id"
          class="hire"
          :class="{ hired: h.hired, affordable: !h.hired && h.canBuy, off: h.hired && !h.on }"
          :data-testid="`exec-${h.id}`"
        >
          <div class="hire-text">
            <h3 class="smallcaps">{{ h.title }}</h3>
            <p>{{ h.description }}</p>
          </div>
          <Button v-if="!h.hired" class="hire-btn" :disabled="!h.canBuy" @click="h.p.purchase(1)">
            <span class="smallcaps">Hire</span>
            <span class="num">{{ money(h.cost) }}</span>
          </Button>
          <Button
            v-else-if="h.desk"
            class="duty"
            role="switch"
            :repeat="false"
            :aria-checked="h.on"
            :aria-label="`${h.title} on duty`"
            @click="toggle(h.desk)"
          >
            <span class="smallcaps">{{ h.on ? 'On duty' : 'Sent home' }}</span>
          </Button>
          <span v-else class="kept smallcaps">Keeps the books</span>
        </article>
      </TransitionGroup>
    </div>

    <div class="block">
      <h2 class="smallcaps">
        Management memos
        <span v-if="boardSitting" class="board-tag">the board signs these</span>
      </h2>
      <UpgradeGrid
        :cards="visibleMemos"
        :columns="1"
        reveal="inline"
        purchased-state="removed"
        class="memos"
      >
        <template #card="{ card }">
          <article
            class="memo"
            :class="{ affordable: card.canPurchase.value, automated: boardSitting }"
            :data-testid="`memo-${card.id}`"
          >
            <div>
              <h3>{{ card.displayName }}</h3>
              <p>{{ card.extra!.description }}</p>
            </div>
            <Button class="sign" :disabled="!card.canPurchase.value" @click="card.purchase()">
              <span class="smallcaps">Sign</span>
              <span class="num">{{ money(card.cost.value) }}</span>
            </Button>
          </article>
        </template>
      </UpgradeGrid>
      <p v-if="!visibleMemos.length" class="quiet">
        No memos on the desk. Grow a subsidiary to draw one.
      </p>
      <p v-if="filed" class="quiet">
        {{ filed }} {{ filed === 1 ? 'memo' : 'memos' }} signed and filed.
      </p>
    </div>

    <div class="block">
      <h2 class="smallcaps">Market leader certificates</h2>
      <div class="wall">
        <div v-for="row in wall" :key="row.name" class="wall-row">
          <span class="wall-name">{{ row.name }}</span>
          <span
            v-for="f in row.frames"
            :key="f.id"
            class="frame num"
            :class="{ earned: f.earned }"
            :title="`Own ${f.count} ${row.name}: they earn ×2`"
            >{{ f.count }}</span
          >
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.office {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.block h2 {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 400;
  border-bottom: 1px solid var(--ledger-rule);
  padding-bottom: 5px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.board-tag {
  font-size: 12px;
  color: var(--ink-carbon);
}
h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 400;
}
p {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--typed-dim);
}
.quiet {
  font-style: italic;
  font-family: var(--face-letterhead);
}

.hires {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.memos {
  gap: 8px;
}
.kept {
  font-size: 12px;
  color: var(--ink-carbon);
}
.hire,
.memo {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border-left: 3px solid var(--ledger-rule);
  background: rgba(231, 220, 193, 0.035);
  border-radius: var(--radius-paper);
}
.hire.affordable,
.memo.affordable {
  border-left-color: var(--ink-affordable);
}
.hire.hired {
  border-left-color: var(--ink-carbon);
}
.hire.hired.off {
  border-left-color: var(--ink-filed);
}
.memo.automated.affordable {
  border-left-color: var(--ink-carbon);
}

.hire-btn,
.sign {
  display: grid;
  gap: 1px;
  min-width: 96px;
  padding: 5px 8px;
  text-align: right;
  border: 1px solid var(--ink-affordable);
  background: rgba(124, 199, 154, 0.1);
  color: var(--ink-affordable);
  border-radius: var(--radius-paper);
}
.hire-btn .smallcaps,
.sign .smallcaps {
  font-size: 12px;
}
.hire-btn:disabled,
.sign:disabled {
  border-color: rgba(201, 101, 79, 0.35);
  background: transparent;
  color: var(--ink-debit);
  cursor: default;
}
.hire-btn:disabled .smallcaps,
.sign:disabled .smallcaps {
  color: var(--ink-filed);
}

.duty {
  min-width: 96px;
  padding: 7px 8px;
  border: 1px solid var(--ink-carbon);
  background: rgba(127, 159, 211, 0.12);
  color: var(--ink-carbon);
  border-radius: var(--radius-paper);
  font-size: 13px;
}
.hire.off .duty {
  border-color: var(--ink-filed);
  background: transparent;
  color: var(--ink-filed);
}

.wall {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.wall-row {
  display: grid;
  grid-template-columns: 1fr repeat(3, 38px);
  gap: 6px;
  align-items: center;
  font-size: 13px;
  color: var(--typed-dim);
}
.frame {
  text-align: center;
  padding: 2px 0;
  border: 1px solid var(--ledger-rule);
  color: var(--ink-filed);
  font-size: 13px;
}
.frame.earned {
  border-color: var(--ink-seal);
  color: var(--ink-seal);
  box-shadow:
    inset 0 0 0 2px var(--walnut),
    inset 0 0 0 3px rgba(210, 169, 78, 0.4);
}
</style>

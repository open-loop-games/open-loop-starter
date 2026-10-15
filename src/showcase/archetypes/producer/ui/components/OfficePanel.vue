<!--
  OfficePanel — the right rail: the Consolidated Building once it is offered,
  the executive floor (hires, their duty switches, the night bookkeeper),
  standing and the press it buys, the wire room, the management memos on the
  desk, and the wall of market-leader certificates. Press, the wire room and the
  memos are starter's `UpgradeGrid` in one column, each card drawn in the `#card`
  slot; a bought card leaves the rail. The record of achievements opens in starter's
  `AchievementGrid` on the frame's modal stack.
-->
<script setup lang="ts">
import { computed, inject } from 'vue';
import type { Purchasable } from '@open-loop/engine';
import { modalStackKey } from '@/lib';
import Button from '@/ui/components/Button.vue';
import AchievementGrid, { type AchievementCard } from '@/ui/components/AchievementGrid.vue';
import { UpgradeGrid, createPurchasableCard, type UpgradeCardData } from '@/ui/compositions';
import { BOOKKEEPER_DEF, ENDING_DEF, type HireId } from '../../data';
import { getAutomation, getFirm, getOffline, getStanding, getTips } from '../../modules';
import { money } from '../format';

const firm = getFirm();
const automation = getAutomation();
const offline = getOffline();
const standing = getStanding();
const tips = getTips();
const stack = inject(modalStackKey)!;

/** One card per one-shot; the grid shows a card while its purchasable is visible and unbought. */
const cardsOf = (
  all: { def: { title: string; description: string }; purchasable: Purchasable }[],
) =>
  all.map(({ def, purchasable }) =>
    createPurchasableCard(purchasable, { displayName: def.title, description: def.description }),
  );
/** Whether the grid shows any card: its own filter, which it does not expose. */
const onRail = (cards: UpgradeCardData[]) => cards.some((c) => c.unlocked!.value && !c.owned.value);

/** One-shots bought on sight of their reveal: press for standing, and the wire room. */
const press = cardsOf(standing.upgrades.getAll());
const wireRoom = cardsOf(tips.upgrades.getAll());
const wireOpen = computed(() => onRail(wireRoom));
const pressOwned = computed(() => standing.upgrades.purchasedCount.value);

const endingOffered = computed(() => firm.ending.visible.value && !firm.ending.active.value);

function openRecord() {
  const card = (
    id: string,
    displayName: string,
    description: string,
    earned: boolean,
  ): AchievementCard => ({
    id,
    displayName,
    description,
    earned,
  });
  const cards: AchievementCard[] = [
    ...firm.grades
      .getAll()
      .map((e) =>
        card(e.def.id, `Credit ${e.def.grade}`, 'Lifetime revenue', e.achievement.earned.value),
      ),
    ...firm.milestones
      .getAll()
      .map((e) => card(e.def.id, e.def.title, 'Market leader', e.achievement.earned.value)),
    ...standing.feats
      .getAll()
      .map((e) => card(e.def.id, e.def.title, 'On the record', e.achievement.earned.value)),
  ];
  stack.push(AchievementGrid, { class: 'record-sheet', title: 'The record', cards });
}

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

const memos = cardsOf([...firm.management.getAll()].sort((a, b) => a.def.cost - b.def.cost));
const memosOnDesk = computed(() => onRail(memos));
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
</script>
<template>
  <section class="office">
    <div v-if="endingOffered" class="block landmark" data-testid="ending">
      <h2 class="smallcaps">For sale</h2>
      <article class="building">
        <h3 class="smallcaps">{{ ENDING_DEF.title }}</h3>
        <p>{{ ENDING_DEF.description }}</p>
        <Button
          class="hire-btn"
          :disabled="!firm.ending.canPurchase.value"
          @click="firm.ending.purchase(1)"
        >
          <span class="smallcaps">Buy</span>
          <span class="num">{{ money(ENDING_DEF.cost) }}</span>
        </Button>
      </article>
      <p class="quiet">Send the acquisitions desk home to save for it.</p>
    </div>
    <div v-else-if="firm.ending.active.value" class="block landmark">
      <h2 class="smallcaps">The Consolidated Building</h2>
      <p class="quiet">Your name is on the tallest building in town. The books stay open.</p>
    </div>

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
          <Switch
            v-else-if="h.desk"
            v-model="automation.deskOn[h.desk].value"
            class="duty"
            :aria-label="`${h.title} on duty`"
          >
            <span class="smallcaps">{{ h.on ? 'On duty' : 'Sent home' }}</span>
          </Switch>
          <span v-else class="kept smallcaps">Keeps the books</span>
        </article>
      </TransitionGroup>
    </div>

    <div class="block">
      <h2 class="smallcaps">
        Standing
        <span class="standing num">{{ standing.standing.value.toFixed(2) }}</span>
      </h2>
      <p>
        {{ standing.achievements.value }} on the record · {{ pressOwned }}
        {{ pressOwned === 1 ? 'piece' : 'pieces' }} of press, each worth ×{{
          (1 + standing.standing.value * 0.1).toFixed(2)
        }}
      </p>
      <Button class="record smallcaps" @click="openRecord">The record</Button>
      <UpgradeGrid :cards="press" reveal="inline" purchased-state="removed" class="offers">
        <template #card="{ card }">
          <article
            class="hire"
            :class="{ affordable: card.canPurchase.value }"
            :data-testid="`press-${card.id}`"
          >
            <div class="hire-text">
              <h3 class="smallcaps">{{ card.displayName }}</h3>
              <p>{{ card.description }}</p>
            </div>
            <Button class="hire-btn" :disabled="!card.canPurchase.value" @click="card.purchase()">
              <span class="smallcaps">Run it</span>
              <span class="num">{{ money(card.cost.value) }}</span>
            </Button>
          </article>
        </template>
      </UpgradeGrid>
    </div>

    <div v-if="wireOpen" class="block">
      <h2 class="smallcaps">The wire room</h2>
      <UpgradeGrid :cards="wireRoom" reveal="inline" purchased-state="removed" class="offers">
        <template #card="{ card }">
          <article
            class="hire"
            :class="{ affordable: card.canPurchase.value }"
            :data-testid="`wire-${card.id}`"
          >
            <div class="hire-text">
              <h3 class="smallcaps">{{ card.displayName }}</h3>
              <p>{{ card.description }}</p>
            </div>
            <Button class="hire-btn" :disabled="!card.canPurchase.value" @click="card.purchase()">
              <span class="smallcaps">Install</span>
              <span class="num">{{ money(card.cost.value) }}</span>
            </Button>
          </article>
        </template>
      </UpgradeGrid>
    </div>

    <div class="block">
      <h2 class="smallcaps">
        Management memos
        <span v-if="boardSitting" class="board-tag">the board signs these</span>
      </h2>
      <UpgradeGrid :cards="memos" reveal="inline" purchased-state="removed" class="offers">
        <template #card="{ card }">
          <article
            class="memo"
            :class="{ affordable: card.canPurchase.value, automated: boardSitting }"
            :data-testid="`memo-${card.id}`"
          >
            <div>
              <h3>{{ card.displayName }}</h3>
              <p>{{ card.description }}</p>
            </div>
            <Button class="sign" :disabled="!card.canPurchase.value" @click="card.purchase()">
              <span class="smallcaps">Sign</span>
              <span class="num">{{ money(card.cost.value) }}</span>
            </Button>
          </article>
        </template>
      </UpgradeGrid>
      <p v-if="!memosOnDesk" class="quiet">No memos on the desk. Grow a subsidiary to draw one.</p>
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
.offers {
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
  justify-content: center;
  min-width: 96px;
  padding: 7px 8px;
  border: 1px solid var(--ink-carbon);
  background: rgba(127, 159, 211, 0.12);
  color: var(--ink-carbon);
  border-radius: var(--radius-paper);
  font-size: 13px;
}
.duty :deep(.olui-switch__track) {
  display: none;
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
  grid-template-columns: 1fr repeat(5, 34px);
  gap: 4px;
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
.standing {
  font-size: 17px;
  color: var(--ink-seal);
}
.record {
  margin: 6px 0 8px;
  padding: 3px 10px;
  font-size: 13px;
  background: transparent;
  color: var(--ink-seal);
  border: 1px solid rgba(210, 169, 78, 0.5);
  border-radius: var(--radius-paper);
}
.landmark .building {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 3px double var(--ink-seal);
  background: rgba(210, 169, 78, 0.06);
}
.landmark h3 {
  font-size: 18px;
  color: var(--ink-seal);
}
</style>

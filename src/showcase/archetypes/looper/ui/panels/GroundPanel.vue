<script setup lang="ts">
import Button from '@/ui/components/Button.vue';
import { computed } from 'vue';
import { getMeta, getNight } from '../../modules';
import {
  ACTIONS,
  ESCAPE_DEPTH,
  ITEM_NAMES,
  PATROL_CAP,
  RIDE_DEADLINE,
  ZONES,
  type ActionDef,
  type ItemId,
} from '../../data';
import { secs } from '../format';
import { addToPlan } from '../../modules';
import SkillPips from './SkillPips.vue';

const meta = getMeta();
const night = getNight();

const zones = computed(() =>
  ZONES.map((z, i) => {
    const gate = ACTIONS.find((a) => a.opens === i);
    return {
      ...z,
      known: meta.zones.isUnlocked(z.id),
      actions: ACTIONS.filter((a) => a.zone === i),
      gateName: gate?.displayName,
    };
  }),
);

function eta(a: ActionDef): string {
  return secs(night.actionSeconds(a.id) / night.actionSpeed(a.id));
}
function itemsText(rec: Partial<Record<ItemId, number>> | undefined, verb: string): string | null {
  if (!rec) return null;
  return `${verb} ${Object.entries(rec)
    .map(([k, n]) => `${n} ${ITEM_NAMES[k as ItemId].toLowerCase()}`)
    .join(', ')}`;
}
function notes(a: ActionDef): string[] {
  const out: string[] = [];
  if (a.limit) out.push(`${a.limit}× a night`);
  const needs = itemsText(a.needs, 'needs');
  const spends = itemsText(a.consumes, 'spends');
  const gives = itemsText(a.gives, 'gives');
  for (const n of [needs, spends, gives]) if (n) out.push(n);
  if (a.nerve === 'coffee' || a.nerve === 'hamper') out.push('+Nerve');
  if (a.nerve === 'ride') out.push(`+Nerve, less the later; none after ${secs(RIDE_DEADLINE)}`);
  if (a.learnsPatrol)
    out.push(`kept ${meta.patrolKnowledge.value}/${PATROL_CAP}: shortens Slip the Patrol`);
  if (a.opens !== undefined)
    out.push(a.opens === ESCAPE_DEPTH ? 'the way out' : `opens ${ZONES[a.opens].displayName}`);
  return out;
}
</script>

<template>
  <section class="lo-panel lo-ground" aria-label="Known ground">
    <h2>Known Ground</h2>
    <p class="lo-hint">
      Add moves to tonight's plan. Moves run top to bottom while your Nerve holds.
    </p>
    <div
      v-for="z in zones"
      :key="z.id"
      class="lo-zone"
      :class="{ known: z.known, 'lo-reveal': z.known && z.order > 0 }"
    >
      <h3>
        <span class="lo-zone-num lo-num">{{ String(z.order).padStart(2, '0') }}</span>
        {{ z.known ? z.displayName : 'Unknown ground' }}
      </h3>
      <ul v-if="z.known">
        <li
          v-for="a in z.actions"
          :key="a.id"
          class="lo-move"
          :class="{ gate: a.opens !== undefined }"
        >
          <Button
            class="lo-add"
            :aria-label="`Add ${a.displayName} to plan`"
            @click="addToPlan(a.id)"
            >+</Button
          >
          <div class="lo-move-body">
            <div class="lo-move-head">
              <span class="lo-move-name">{{ a.displayName }}</span>
              <span class="lo-move-eta lo-num" title="Time at your current skill">{{
                eta(a)
              }}</span>
            </div>
            <div class="lo-move-meta">
              <SkillPips :weights="a.weights" />
              <span v-for="n in notes(a)" :key="n" class="lo-note">{{ n }}</span>
            </div>
          </div>
        </li>
      </ul>
      <p v-else class="lo-locked">Beyond “{{ z.gateName }}”.</p>
    </div>
  </section>
</template>

<style scoped>
.lo-hint {
  margin: -4px 0 10px;
  font-size: 13px;
  color: var(--lo-ink-faded);
}
.lo-zone {
  margin-top: 12px;
}
.lo-zone h3 {
  margin: 0 0 6px;
  font-family: var(--lo-face-stencil);
  font-weight: normal;
  font-size: 17px;
  letter-spacing: 0.06em;
  color: var(--lo-searchlight);
}
.lo-zone:not(.known) h3 {
  color: var(--lo-ink-faded);
}
.lo-zone-num {
  color: var(--lo-sodium-dim);
  margin-right: 4px;
}
.lo-zone ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lo-move {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 5px 6px;
  border-radius: var(--lo-radius);
  background: var(--lo-concrete-raised);
}
.lo-move.gate {
  box-shadow: inset 2px 0 0 var(--lo-sodium-dim);
}
.lo-add {
  flex: none;
  width: 24px;
  height: 24px;
  border: 1px solid var(--lo-sodium-dim);
  background: transparent;
  color: var(--lo-sodium);
  font-family: var(--lo-face-stencil);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  border-radius: 2px;
}
.lo-add:hover {
  background: var(--lo-sodium);
  color: var(--lo-night);
}
.lo-move-body {
  flex: 1;
  min-width: 0;
}
.lo-move-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.lo-move-name {
  color: var(--lo-chalk);
}
.lo-move-eta {
  color: var(--lo-ink-faded);
  font-size: 13px;
}
.lo-move-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  margin-top: 2px;
  font-size: 12px;
  color: var(--lo-ink-faded);
}
.lo-locked {
  margin: 0;
  padding: 8px;
  font-size: 13px;
  color: var(--lo-ink-faded);
  border: 1px dashed var(--lo-concrete-edge);
  border-radius: var(--lo-radius);
}
</style>

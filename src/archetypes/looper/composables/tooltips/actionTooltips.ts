/**
 * Action tile tooltip content — stat breakdown + type-specific rows.
 *
 * Used as a defineComponent so Vue tracks reactive deps (stat levels change
 * the per-stat cost factor during play). Consumed in TownColumn's HoverCard
 * content slot.
 *
 * First-arc port: no skills, multipart, affectedBy, training, or unlock hints.
 *
 * Reference: idle-loops-ng/src/composables/tooltips/actionTooltips.ts,
 * dmchurch views/main.view.js:1226 createTownAction.
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue';
import { formatWhole, toNumber } from 'open-loop-engine';
import type { ActionDef } from '../../data/types';
import { getStatLevel } from '../../modules/stats';
import { computeAdjustedTicks } from '../../modules/action-formulas';

function statFactor(stat: string): number {
  return 1 / (1 + getStatLevel(stat).toNumber() / 100);
}

function baseCost(def: ActionDef): number {
  return toNumber(def.manaCost);
}

function renderLocked(def: ActionDef): VNodeChild {
  const entries = Object.entries(def.weights)
    .map(([s, w]) => [s, toNumber(w)] as const)
    .filter(([, w]) => w > 0)
    .sort(([, a], [, b]) => b - a);
  const maxWeight = entries[0]?.[1] ?? 0;

  return h('div', { class: 'att att-locked' }, [
    h('div', { class: 'att-unlock-hint' }, 'Not yet unlocked'),
    h(
      'div',
      { class: 'att-stat-keys' },
      entries.map(([stat, w]) =>
        h(
          'span',
          {
            class: w === maxWeight ? 'att-stat-key att-stat-key--primary' : 'att-stat-key',
          },
          stat,
        ),
      ),
    ),
  ]);
}

function renderUnlocked(def: ActionDef): VNodeChild {
  const nodes: VNodeChild[] = [];

  if (def.description) {
    nodes.push(h('p', { class: 'att-desc' }, def.description));
  }

  const statEntries = Object.entries(def.weights)
    .map(([s, w]) => [s, toNumber(w)] as const)
    .filter(([, w]) => w > 0)
    .sort(([, a], [, b]) => b - a);

  if (statEntries.length > 0) {
    const base = baseCost(def);
    const adjusted = computeAdjustedTicks(def).toNumber();

    const rows = statEntries.map(([stat, weight]) => {
      const factor = statFactor(stat);
      const level = getStatLevel(stat).toNumber();
      return h('tr', [
        h('td', { class: 'att-sn' }, stat),
        h('td', { class: 'att-sw' }, `×${weight.toFixed(2)}`),
        h('td', { class: 'att-sl' }, `lv ${level}`),
        h('td', { class: 'att-sf' }, level > 0 ? `×${factor.toFixed(2)}` : ''),
      ]);
    });

    nodes.push(h('table', { class: 'att-stat-table' }, h('tbody', rows)));

    const costLabel =
      Math.round(base) !== Math.round(adjusted)
        ? `${formatWhole(base)} base → ${formatWhole(adjusted)} mana`
        : `${formatWhole(adjusted)} mana`;
    nodes.push(h('div', { class: 'att-mana' }, costLabel));
  }

  if (toNumber(def.expMult) !== 1) {
    nodes.push(
      h('div', { class: 'att-row' }, [
        h('span', { class: 'att-label' }, 'Exp mult'),
        h('span', { class: 'att-val' }, `×${formatWhole(def.expMult)}`),
      ]),
    );
  }

  if (def.type === 'progress') {
    nodes.push(
      h('div', { class: 'att-row att-type' }, [
        h('span', { class: 'att-label' }, 'Progress'),
        h('span', { class: 'att-val' }, `+${formatWhole(def.progressAmount)} ${def.progressVarId}`),
      ]),
    );
  }

  if (def.type === 'regular') {
    nodes.push(
      h('div', { class: 'att-row att-type' }, [
        h('span', { class: 'att-label' }, 'Reward'),
        h('span', { class: 'att-val' }, `every ${def.rewardRatio} checks`),
      ]),
    );
  }

  return h('div', { class: 'att' }, nodes);
}

export const ActionTooltipContent = defineComponent({
  name: 'ActionTooltipContent',
  props: {
    def: { type: Object as PropType<ActionDef>, required: true },
    locked: { type: Boolean, default: false },
  },
  setup(props) {
    return () => (props.locked ? renderLocked(props.def) : renderUnlocked(props.def));
  },
});

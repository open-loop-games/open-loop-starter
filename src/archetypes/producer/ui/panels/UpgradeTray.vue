<script setup lang="ts">
import { computed } from 'vue';
import { getBuildings } from '../../modules';
import { useUpgrades, type UpgradeRow } from '../../composables/useUpgrades';
import { useFormatting } from '@/composables/useFormatting';
import Tooltip from '@/ui/components/Tooltip.vue';

const buildings = getBuildings();
const groups = useUpgrades();
const { format } = useFormatting();

const continuousProducers = buildings
  .getAll()
  .filter((entry) => entry.def.trigger === 'continuous')
  .map((entry) => entry.def);

interface Section {
  key: string;
  title: string;
  rows: UpgradeRow[];
}

const view = computed<{ sections: Section[]; owned: UpgradeRow[] }>(() => {
  const sections: Section[] = [];
  const owned: UpgradeRow[] = [];

  const push = (key: string, title: string, rows: UpgradeRow[]): void => {
    const avail: UpgradeRow[] = [];
    for (const r of rows) {
      if (r.bought.value) owned.push(r);
      else avail.push(r);
    }
    if (avail.length) sections.push({ key, title, rows: avail });
  };

  if (groups.value.click.length) push('click', 'Hand Tools', groups.value.click);
  if (groups.value.global.length) push('global', 'Pantry', groups.value.global);
  for (const p of continuousProducers) {
    const rows = groups.value.perProducer.get(p.id) ?? [];
    if (rows.length) push(p.id, p.name, rows);
  }

  return { sections, owned };
});
</script>

<template>
  <div class="recipe-index">
    <header class="recipe-index__head">
      <h3 class="recipe-index__title">
        <span class="recipe-index__title-mark">&#10097;</span>
        Recipes
      </h3>
      <span class="recipe-index__hint">tap to bake in</span>
    </header>

    <section v-for="section in view.sections" :key="section.key" class="recipe-section">
      <h4 class="recipe-section__title">
        <span class="recipe-section__name">{{ section.title }}</span>
        <span class="recipe-section__rule" />
        <span class="recipe-section__count">{{ section.rows.length }}</span>
      </h4>
      <ul class="recipe-list">
        <li v-for="row in section.rows" :key="row.def.id">
          <Tooltip>
            <button
              type="button"
              class="recipe-row"
              :class="{ 'is-affordable': row.canPurchase.value }"
              :disabled="!row.canPurchase.value"
              :data-testid="`upgrade-${row.def.id}`"
              @click="row.purchase()"
            >
              <span class="recipe-row__bullet" aria-hidden="true">&middot;</span>
              <span class="recipe-row__name">{{ row.def.name }}</span>
              <span class="recipe-row__dots" />
              <span class="recipe-row__cost">{{ format(row.def.cost, 0) }}</span>
            </button>
            <template #content>
              <div class="tip-name">
                {{ row.def.name }}
              </div>
              <div class="tip-desc">
                {{ row.def.description }}
              </div>
              <div class="tip-cost">Cost &middot; {{ format(row.def.cost, 0) }}</div>
            </template>
          </Tooltip>
        </li>
      </ul>
    </section>

    <section v-if="view.owned.length" class="recipe-pantry">
      <h4 class="recipe-pantry__title">
        <span class="recipe-pantry__title-text">Bought &amp; Baked</span>
        <span class="recipe-pantry__count">{{ view.owned.length }}</span>
      </h4>
      <ul class="recipe-pantry__list">
        <li v-for="row in view.owned" :key="row.def.id" :data-testid="`upgrade-${row.def.id}`">
          <Tooltip>
            <span class="seal" tabindex="0">
              <span class="seal__check" aria-hidden="true">&#10003;</span>
              <span class="seal__name">{{ row.def.name }}</span>
            </span>
            <template #content>
              <div class="tip-name">
                {{ row.def.name }}
              </div>
              <div class="tip-desc">
                {{ row.def.description }}
              </div>
            </template>
          </Tooltip>
        </li>
      </ul>
    </section>

    <p v-if="!view.sections.length && !view.owned.length" class="recipe-empty">
      No recipes in the book yet. Bake a few cookies first.
    </p>
  </div>
</template>

<style scoped>
.recipe-index {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 0;
  font-family: var(--font-body, Georgia, serif);
  color: var(--bakery-cocoa, #2d1d10);
}

/* ─── Top header ─────────────────────────────────────────────────────── */
.recipe-index__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.18));
}

.recipe-index__title {
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 24,
    'SOFT' 100,
    'wght' 700;
  font-size: 0.92em;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--bakery-mahogany, #5a2f10);
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}

.recipe-index__title-mark {
  color: var(--bakery-brass, #b1782a);
}

.recipe-index__hint {
  font-style: italic;
  font-size: 0.72em;
  color: var(--bakery-cocoa-mute, #7a5d3d);
}

/* ─── Section (one per recipe family) ────────────────────────────────── */
.recipe-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recipe-section__title {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 4px;
  font-family: var(--font-display, Georgia, serif);
  color: var(--bakery-mahogany, #5a2f10);
}

.recipe-section__name {
  font-variation-settings:
    'opsz' 14,
    'SOFT' 100,
    'wght' 600;
  font-style: italic;
  font-size: 0.88em;
  letter-spacing: 0.04em;
}

.recipe-section__rule {
  height: 0;
  border-top: 1px solid var(--bakery-rye-line, #b89a6a);
  border-bottom: 1px solid var(--bakery-rye-line, #b89a6a);
  padding: 1px 0;
  opacity: 0.55;
  transform: translateY(-3px);
}

.recipe-section__count {
  font-variation-settings:
    'opsz' 12,
    'SOFT' 100,
    'wght' 700;
  font-size: 0.7em;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--bakery-brass, #b1782a);
  font-variant-numeric: tabular-nums;
}

.recipe-list {
  list-style: none;
  display: flex;
  flex-direction: column;
}

/* ─── Recipe row ─────────────────────────────────────────────────────── */
.recipe-row {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: baseline;
  gap: 6px;
  padding: 6px 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  color: var(--bakery-cocoa, #2d1d10);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background 100ms ease-out,
    color 100ms ease-out;
}

.recipe-row:hover:not(:disabled) {
  background: rgba(177, 120, 42, 0.1);
}

.recipe-row:focus-visible {
  outline: none;
  background: rgba(177, 120, 42, 0.16);
  border-color: var(--bakery-brass, #b1782a);
}

.recipe-row:disabled {
  cursor: default;
  color: var(--bakery-cocoa-mute, #7a5d3d);
  opacity: 0.7;
}

.recipe-row__bullet {
  color: var(--bakery-brass, #b1782a);
  font-size: 1.4em;
  line-height: 0;
  transform: translateY(-2px);
  opacity: 0.75;
}

.recipe-row__name {
  font-family: var(--font-body, Georgia, serif);
  font-style: italic;
  font-size: 0.92em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.01em;
}

.recipe-row__dots {
  border-bottom: 1px dotted var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.45));
  transform: translateY(-3px);
  min-width: 12px;
}

.recipe-row__cost {
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 12,
    'SOFT' 100,
    'wght' 600;
  font-size: 0.85em;
  font-variant-numeric: tabular-nums oldstyle-nums;
  color: var(--bakery-cocoa-mute, #7a5d3d);
  flex-shrink: 0;
}

.recipe-row.is-affordable .recipe-row__cost {
  color: var(--bakery-sage, #5d7a3a);
  font-weight: 700;
}

.recipe-row.is-affordable .recipe-row__name {
  color: var(--bakery-mahogany, #5a2f10);
  font-style: italic;
}

.recipe-row.is-affordable .recipe-row__bullet {
  color: var(--bakery-sage, #5d7a3a);
  opacity: 1;
  animation: recipe-pulse 2200ms ease-in-out infinite;
}

@keyframes recipe-pulse {
  0%,
  100% {
    opacity: 0.65;
  }
  50% {
    opacity: 1;
  }
}

/* ─── Pantry strip — purchased upgrades as wax seals ─────────────────── */
.recipe-pantry {
  margin-top: 6px;
  padding-top: 14px;
  border-top: 1px dashed var(--bakery-rye-line, #b89a6a);
}

.recipe-pantry__title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 0 0 8px;
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 12,
    'SOFT' 100,
    'wght' 600;
  font-size: 0.72em;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--bakery-cocoa-mute, #7a5d3d);
}

.recipe-pantry__count {
  font-variant-numeric: tabular-nums;
  color: var(--bakery-brass, #b1782a);
}

.recipe-pantry__list {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.seal {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px 3px 8px;
  background: linear-gradient(180deg, rgba(177, 120, 42, 0.18) 0%, rgba(177, 120, 42, 0.08) 100%);
  border: 1px solid var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.3));
  border-radius: 999px;
  font-family: var(--font-body, Georgia, serif);
  font-style: italic;
  font-size: 0.74em;
  color: var(--bakery-cocoa-soft, #4a3422);
  cursor: default;
  transition:
    background 140ms,
    border-color 140ms,
    color 140ms;
}

.seal:hover,
.seal:focus-visible {
  outline: none;
  background: linear-gradient(180deg, rgba(177, 120, 42, 0.32) 0%, rgba(177, 120, 42, 0.18) 100%);
  color: var(--bakery-mahogany, #5a2f10);
  border-color: var(--bakery-brass, #b1782a);
}

.seal__check {
  color: var(--bakery-brass, #b1782a);
  font-weight: 700;
  font-style: normal;
  font-size: 0.95em;
}

.recipe-empty {
  font-style: italic;
  font-size: 0.85em;
  color: var(--bakery-cocoa-mute, #7a5d3d);
  text-align: center;
  padding: 16px 8px;
  margin: 0;
}

/* ─── Tooltip body styling (lives inside reka portal — uses :global) ──── */
.tip-name {
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 14,
    'SOFT' 100,
    'wght' 700;
  font-style: normal;
  font-size: 0.95em;
  letter-spacing: 0.04em;
  margin-bottom: 3px;
  color: var(--bakery-cream, #f3e7cc);
}

.tip-desc {
  font-style: italic;
  color: var(--bakery-cream, #f3e7cc);
  opacity: 0.85;
}

.tip-cost {
  margin-top: 5px;
  padding-top: 4px;
  border-top: 1px solid rgba(243, 231, 204, 0.2);
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 12,
    'SOFT' 100,
    'wght' 600;
  font-variant-numeric: tabular-nums;
  font-size: 0.85em;
  color: var(--bakery-brass-bright, #d99846);
}
</style>

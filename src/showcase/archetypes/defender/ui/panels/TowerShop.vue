<script setup lang="ts">
import { computed, inject, type Ref } from 'vue';
import { Decimal } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { useModule } from '@/composables/useModule';
import { DefenderDataKey, RoundKey } from '../../modules';
import type { TowerDef, TowerId } from '../../data/types';

const data = useModule(DefenderDataKey);
const round = useModule(RoundKey);

// Shared placement-selection ref provided by DefenderAppRoot. Reactive both
// directions: clicking a button sets it; canvas clears it after placement.
const selectedTowerType = inject<Ref<TowerId | null>>('defender:selectedTowerType')!;

interface Row {
  def: TowerDef;
  affordable: boolean;
  selected: boolean;
}

const rows = computed<Row[]>(() =>
  data.towers.map((def) => ({
    def,
    affordable: Decimal.gte(round.money.value, def.baseCost),
    selected: selectedTowerType.value === def.id,
  })),
);

function selectTower(id: TowerId): void {
  // Click an already-selected tower to cancel placement mode.
  selectedTowerType.value = selectedTowerType.value === id ? null : id;
}

function describeTower(def: TowerDef): string {
  switch (def.id) {
    case 'dart':
      return 'Single dart. Targets furthest along path.';
    case 'tack':
      return 'Radial 8-projectile volley. Short range.';
    case 'bomb':
      return 'Lobbed splash. Pops frozen bloons.';
    case 'ice':
      return 'Area freeze. Locks bloons, no damage.';
  }
}
</script>

<template>
  <div class="olui-surface tower-shop">
    <h3 class="tower-shop__title">
      Towers
    </h3>
    <p class="tower-shop__hint">
      {{
        selectedTowerType
          ? 'Click a buildable cell to place. Click the selected tower again to cancel.'
          : 'Click a tower below, then click a buildable cell on the map.'
      }}
    </p>
    <div class="tower-shop__grid">
      <Button
        v-for="row in rows"
        :key="row.def.id"
        class="olui-buy-card tower-card"
        :class="{
          'tower-card--selected': row.selected,
          'tower-card--unaffordable': !row.affordable,
        }"
        :disabled="!row.affordable && !row.selected"
        :title="row.def.name"
        @click="selectTower(row.def.id)"
      >
        <div class="tower-card__title">
          {{ row.def.name }}
        </div>
        <div class="tower-card__desc">
          {{ describeTower(row.def) }}
        </div>
        <div class="tower-card__cost">
          ¢ {{ row.def.baseCost }}
        </div>
      </Button>
    </div>
  </div>
</template>

<style scoped>
.tower-shop {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap);
  height: 100%;
}

.tower-shop__title {
  margin: 0;
  font-size: 1em;
}

.tower-shop__hint {
  margin: 0;
  font-size: 0.8em;
  color: var(--color-text-muted, var(--color-text));
  line-height: 1.35;
}

.tower-shop__grid {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.tower-card--selected {
  border-color: var(--color-primary, #4a9eff);
  background: color-mix(in srgb, var(--color-primary, #4a9eff) 12%, var(--color-bg));
}

.tower-card--unaffordable {
  opacity: 0.55;
  cursor: not-allowed;
}

.tower-card__title {
  font-weight: 600;
}

.tower-card__desc {
  font-size: 0.8em;
  color: var(--color-text-muted, var(--color-text));
  line-height: 1.3;
}

.tower-card__cost {
  font-size: 0.9em;
  font-variant-numeric: tabular-nums;
  color: var(--color-primary, #4a9eff);
  font-weight: 600;
}
</style>

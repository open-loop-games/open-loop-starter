<!--
  Bailey — what Fairhold raises before its horn. A tablet per troop: our name for it, its
  squad, its price and the line on what it is good against. A click raises one squad;
  shift-click, or the ×5 corner, raises five. A tablet threads gold when it can be raised, is
  ringed in woad while newly opened and never yet raised, shows the engineers' road until the
  mangonel arrives, and turns madder when the muster is full. Beside them: the tithe, and the
  squads waiting in the bailey for the horn.

  Costume classes: `.bailey`, `.bl-troop`, `.bl-troop.afford|fresh|full|road`, `.bl-tithe`,
  `.bl-waiting`.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { TROOPS, troop, type TroopId } from '../../data';
import { getCauseway, getChronicle, getKeep } from '../../modules';
import { mmss, n } from '../format';
import TroopGlyph from './TroopGlyph.vue';

const keep = getKeep('player');
const causeway = getCauseway();
const chronicle = getChronicle();

interface Tablet {
  id: TroopId;
  price: number;
  /** Squads raisable now. */
  can: number;
  /** Seconds until it arrives, while it is still on the road. */
  road: number | null;
  full: boolean;
  fresh: boolean;
}

const tablets = computed<Tablet[]>(() => {
  void toNumber(keep.silver.value);
  void causeway.version.value;
  return TROOPS.filter((t) => getChronicle().field.value.open.includes(t.id)).map((t) => {
    const arrives = t.arrivesAt ?? 0;
    const road = causeway.clock.value < arrives ? arrives - causeway.clock.value : null;
    return {
      id: t.id,
      price: toNumber(keep.troops.getPurchasable(t.id)!.getCost(1)),
      can: keep.affordable(t.id),
      road,
      full: road === null && causeway.room('player') < t.squad,
      fresh: !t.arrivesAt && !chronicle.raised.value[t.id],
    };
  });
});

// The muster surges in the last week and shrinks with camp fever, so its size is read back
// as what stands plus the room left, never recomputed here.
const fielded = computed(() => {
  void causeway.version.value;
  const out = causeway.members.value.filter((m) => m.side === 'player').length;
  return out + causeway.bailey.player.value.reduce((k, id) => k + troop(id).squad, 0);
});
const muster = computed(() => {
  void causeway.version.value;
  void causeway.clock.value;
  return fielded.value + causeway.room('player');
});

const waiting = computed(() => {
  const counts: Partial<Record<TroopId, number>> = {};
  for (const id of causeway.bailey.player.value) counts[id] = (counts[id] ?? 0) + 1;
  return (Object.entries(counts) as [TroopId, number][]).sort(
    (a, b) => troop(a[0]).rank - troop(b[0]).rank,
  );
});

// Starter's Button emits a bare click, so the shift key is read from the keyboard.
const shift = ref(false);
const onKey = (e: KeyboardEvent) => (shift.value = e.shiftKey);
onMounted(() => {
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('keyup', onKey);
});

function raise(id: TroopId): void {
  keep.raise(id, shift.value ? 5 : 1);
}

const tithe = keep.tithe;
const tithes = computed(() => toNumber(tithe.count.value));
</script>

<template>
  <section class="bailey" aria-label="The bailey">
    <h2 class="cw-title">
      The bailey
      <small class="num">{{ fielded }} of {{ muster }} on the muster</small>
    </h2>
    <div class="bl-tablets">
      <div
        v-for="t in tablets"
        :key="t.id"
        class="bl-troop"
        :class="{ afford: t.can > 0, fresh: t.fresh, full: t.full, road: t.road !== null }"
      >
        <Button
          class="cw-control bl-raise"
          :class="{ afford: t.can > 0, fresh: t.fresh }"
          :disabled="t.can === 0"
          :data-troop="t.id"
          @click="raise(t.id)"
        >
          <span class="bl-glyph"><TroopGlyph :troop="t.id" /></span>
          <span class="bl-text">
            <span class="bl-name">
              {{ troop(t.id).ours.name }}
              <span v-if="t.fresh" class="bl-new">new</span>
            </span>
            <span class="bl-role">{{ troop(t.id).ours.role }}</span>
            <span class="bl-price num">
              <template v-if="t.road !== null">Engineers on the road · {{ mmss(t.road) }}</template>
              <template v-else-if="t.full">The bailey is full</template>
              <template v-else>
                {{ n(t.price) }} silver · {{ troop(t.id).squad }}
                {{ troop(t.id).squad === 1 ? 'engine' : 'men' }}
              </template>
            </span>
          </span>
        </Button>
        <Button
          class="cw-control bl-five"
          :class="{ afford: t.can >= 5 }"
          :disabled="t.can < 5"
          :aria-label="`Raise five squads of ${troop(t.id).ours.name}`"
          @click="keep.raise(t.id, 5)"
        >
          ×5
        </Button>
      </div>
    </div>

    <div class="bl-foot">
      <Button
        class="cw-control bl-tithe"
        :class="{ afford: tithe.canPurchase.value }"
        :disabled="!tithe.canPurchase.value"
        data-testid="raise-tithe"
        @click="tithe.purchase(1)"
      >
        <span class="bl-name">
          Raise the tithe<span v-if="tithes" class="num bl-count"> ×{{ tithes }}</span>
        </span>
        <span class="bl-role">+25% silver. The villages grumble.</span>
        <span class="bl-price num">{{ n(tithe.getCost(1)) }} silver</span>
      </Button>
      <div class="bl-waiting" aria-live="polite">
        <span class="bl-waiting-label">Waiting for the horn</span>
        <span v-if="!waiting.length" class="bl-empty">The bailey stands empty.</span>
        <span v-for="[id, count] in waiting" :key="id" class="bl-squad">
          <span class="bl-squad-glyph"><TroopGlyph :troop="id" /></span>
          <span class="num">×{{ count }}</span>
        </span>
      </div>
    </div>
    <p class="bl-hint">Shift-click raises five squads.</p>
  </section>
</template>

<style scoped>
.bl-tablets {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.bl-troop {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px;
}
.bl-raise {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  text-align: left;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 8px 100%, 0 calc(100% - 8px));
}
.bl-glyph {
  width: 30px;
  height: 34px;
  color: var(--cw-woad);
}
.bl-raise:disabled .bl-glyph {
  opacity: 0.45;
}
.bl-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.bl-name {
  font-family: var(--cw-hand);
  font-size: 17px;
  line-height: 1.15;
}
.bl-new {
  margin-left: 6px;
  padding: 0 5px;
  font-family: var(--cw-caps);
  font-size: 12px;
  color: var(--cw-woad);
  border: 1px solid var(--cw-woad);
}
.bl-role {
  font-size: 13.5px;
  color: var(--cw-linen-dim);
}
.bl-price {
  font-size: 14px;
  color: var(--cw-linen-dim);
}
.afford .bl-price {
  color: var(--cw-weld);
}
.road .bl-price {
  font-style: italic;
  color: var(--cw-gall);
}
.full .bl-price {
  color: var(--cw-madder);
}
.full .bl-raise {
  border-color: rgba(189, 79, 60, 0.45);
}
.bl-five {
  width: 42px;
  font-family: var(--cw-text);
  font-size: 14px;
}
.bl-foot {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  margin-top: 8px;
}
.bl-tithe {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 8px 10px;
  text-align: left;
}
.bl-count {
  color: var(--cw-weld);
  font-family: var(--cw-text);
  font-size: 15px;
}
.bl-waiting {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding: 8px 10px;
  border: 1px dashed var(--cw-rule);
}
.bl-waiting-label {
  width: 100%;
  font-family: var(--cw-caps);
  font-size: 13.5px;
  color: var(--cw-gall);
}
.bl-empty {
  font-style: italic;
  color: var(--cw-linen-dim);
}
.bl-squad {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.bl-squad-glyph {
  width: 18px;
  height: 22px;
  color: var(--cw-woad);
}
.bl-hint {
  margin: 6px 0 0;
  font-size: 12.5px;
  color: var(--cw-linen-dim);
}
</style>

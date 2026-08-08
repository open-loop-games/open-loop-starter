<script setup lang="ts">
import { computed } from 'vue';
import { useModule } from '@/composables/useModule';
import { DraftKey, type DraftOffer } from '../modules/draft';
import { RunKey } from '../modules/run';
import { DEVICES, EVOLUTIONS, REAGENTS } from '../data/devices';

/**
 * The draft, for a player seat — the refit where the floor stops and you choose.
 * (Spine calls it a beat; the player is told "refit". `./BeatTrack.vue` § One
 * thing, two vocabularies has why.)
 *
 * Rendered only while a pick is owed, which is exactly the window `run.ts` holds
 * the arena still for. The AI seats never reach here: their policy resolves the
 * pick inside the same tick, so `pendingPicks` is back to zero before a frame
 * renders.
 *
 * It sits ON the floor rather than in the modal stack. The run you are choosing
 * for is the thing you are choosing about — density, what is closing, how much
 * ash is uncollected behind you — and a dialog that covered it would make the
 * decision worse. Hence a low-height strip and a backdrop that dims rather than
 * hides.
 */

const draft = useModule(DraftKey);
const run = useModule(RunKey);

const open = computed(() => run.pendingPicks.value > 0 && draft.offers.value.length > 0);

const DEVICE_BY_ID = new Map(DEVICES.map((d) => [d.id, d]));
const REAGENT_BY_ID = new Map(REAGENTS.map((r) => [r.id, r]));
const EVO_BY_ID = new Map(EVOLUTIONS.map((e) => [e.id, e]));

/** The one line that says what taking this actually does. Sourced from the defs
 *  rather than authored here, so a data change cannot leave the offer lying. */
function describe(offer: DraftOffer): string {
  switch (offer.kind) {
    case 'device-acquire':
      return DEVICE_BY_ID.get(offer.id)?.blurb ?? '';
    case 'device-level': {
      const def = DEVICE_BY_ID.get(offer.id);
      return def ? `Another level of the ${def.shape}. Closer to recombining.` : '';
    }
    case 'reagent':
      return REAGENT_BY_ID.get(offer.id)?.blurb ?? '';
    case 'evolution':
      return EVO_BY_ID.get(offer.id)?.blurb ?? 'Recombination. It stops being what it was.';
  }
}

function shapeOf(offer: DraftOffer): string | undefined {
  if (offer.kind === 'device-acquire' || offer.kind === 'device-level') {
    return DEVICE_BY_ID.get(offer.id)?.shape;
  }
  if (offer.kind === 'evolution') {
    const evo = EVO_BY_ID.get(offer.id);
    return evo ? DEVICE_BY_ID.get(evo.deviceId)?.shape : undefined;
  }
  return undefined;
}
</script>

<template>
  <div v-if="open" class="draft" role="dialog" aria-label="Refit — choose one">
    <div class="draft__panel">
      <p class="draft__title">
        Refit <span class="num" data-num>{{ run.level.value }}</span> — requisition
      </p>
      <div class="draft__offers">
        <button
          v-for="(offer, i) in draft.offers.value"
          :key="`${offer.kind}:${offer.id}`"
          type="button"
          class="offer"
          :class="[`offer--${offer.kind}`, { 'offer--def': offer.defensive }]"
          @click="draft.choose(i)"
        >
          <span class="offer__key num" data-num>{{ i + 1 }}</span>
          <span v-if="shapeOf(offer)" class="offer__shape" :data-shape="shapeOf(offer)" />
          <span class="offer__label">{{ offer.label }}</span>
          <span class="offer__desc">{{ describe(offer) }}</span>
        </button>
      </div>
      <p class="draft__hint">Click, or press the number. The floor is holding.</p>
    </div>
  </div>
</template>

<style scoped>
.draft {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 var(--gap) 64px;
  /* Dims the floor without hiding it — see the header. */
  background: linear-gradient(180deg, rgba(4, 7, 6, 0) 30%, rgba(4, 7, 6, 0.82) 100%);
}

.draft__panel {
  width: min(820px, 100%);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.draft__title {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.13em;
  font-size: 0.74rem;
  color: var(--mote);
  text-align: center;
}

.draft__offers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.offer {
  position: relative;
  display: grid;
  grid-template-columns: auto auto 1fr;
  grid-template-rows: auto auto;
  align-items: center;
  gap: 2px 8px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  color: var(--color-text);
  background: linear-gradient(180deg, rgba(19, 26, 23, 0.97), rgba(10, 13, 12, 0.94));
  border: 1px solid var(--color-border);
  border-left: 2px solid var(--arc);
  border-radius: 3px;
  transition:
    border-color 140ms ease,
    transform 140ms ease;
}
.offer:hover,
.offer:focus-visible {
  border-color: var(--arc-hot);
  border-left-color: var(--arc-hot);
  transform: translateY(-2px);
}
.offer--def {
  border-left-color: var(--vat);
}
.offer--evolution {
  border-left-color: var(--sodium);
  background: linear-gradient(180deg, rgba(60, 32, 8, 0.9), rgba(20, 12, 4, 0.92));
}

.offer__key {
  grid-row: 1 / 3;
  width: 20px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  font-size: 0.7rem;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: 2px;
}

.offer__shape {
  width: 11px;
  height: 11px;
  background: var(--arc);
  opacity: 0.85;
}
.offer--evolution .offer__shape {
  background: var(--sodium);
}
.offer__shape[data-shape='bolt'] {
  clip-path: polygon(50% 0, 62% 42%, 100% 50%, 62% 58%, 50% 100%, 38% 58%, 0 50%, 38% 42%);
}
.offer__shape[data-shape='pulse'] {
  border-radius: 50%;
}
.offer__shape[data-shape='cone'] {
  clip-path: polygon(0 50%, 100% 0, 100% 100%);
}
.offer__shape[data-shape='lance'] {
  clip-path: polygon(0 40%, 100% 46%, 100% 54%, 0 60%);
}

.offer__label {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  font-size: 0.82rem;
}
.offer--evolution .offer__label {
  color: var(--sodium);
}

.offer__desc {
  grid-column: 2 / 4;
  font-size: 0.7rem;
  line-height: 1.35;
  color: var(--color-text-muted);
}

.draft__hint {
  text-align: center;
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}
</style>

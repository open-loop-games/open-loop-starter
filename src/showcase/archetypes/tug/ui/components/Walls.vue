<!--
  Walls — what the keeps do between horns. On Fairhold's side: the weapon mounted on the walls,
  its charge winding up like a windlass, and the order to loose it. Fire-pots wait for an enemy
  engine inside the throw of our gate, and say so. In the middle: the horn sounded early, for
  its fee in silver. On the lord's side, smaller: his weapon and its charge, so a stone or a
  burned engine is never a surprise.

  Costume classes: `.walls`, `.wl-weapon--player|rival`, `.wl-windlass`, `.wl-loose`,
  `.wl-early`, `.ready|waiting`.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toNumber } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import { ANCHORS, weapon } from '../../data';
import { getBattle, getCauseway, getKeep, type Side } from '../../modules';
import { n } from '../format';

const battle = getBattle();
const causeway = getCauseway();

const wall = (side: Side) => {
  const keep = getKeep(side);
  return computed(() => {
    const kind = keep.weapon.value;
    const charge = keep.charge.value;
    const ready = kind !== null && charge >= ANCHORS.weaponCharge;
    void causeway.version.value;
    // Fire-pots hold their charge until an engine is inside the throw of this keep's gate.
    const waiting =
      ready && kind === 'firepots' && causeway.nearestEngine(side) > ANCHORS.engineThrow;
    return {
      def: kind ? weapon(kind) : null,
      wound: Math.min(1, charge / ANCHORS.weaponCharge),
      left: Math.max(0, ANCHORS.weaponCharge - charge),
      ready,
      waiting,
    };
  });
};
const ours = wall('player');
const theirs = wall('rival');

const fee = computed(() => {
  void causeway.version.value;
  return battle.earlyFee('player');
});
const canSound = computed(
  () => fee.value !== null && toNumber(getKeep('player').silver.value) >= fee.value,
);
</script>

<template>
  <section class="walls" aria-label="The walls">
    <div class="wl-weapon wl-weapon--player">
      <template v-if="ours.def">
        <div class="wl-head">
          <span class="wl-name">{{ ours.def.name }}</span>
          <span class="wl-blurb">{{ ours.def.blurb }}</span>
        </div>
        <div class="wl-row">
          <ProgressBar
            class="cw-gauge wl-windlass"
            :class="{ ready: ours.ready }"
            :value="ours.wound"
          />
          <Button
            class="cw-control wl-loose"
            :class="{ afford: ours.ready && !ours.waiting, waiting: ours.waiting }"
            :disabled="!ours.ready || ours.waiting"
            data-testid="loose-weapon"
            @click="battle.fire('player')"
          >
            <template v-if="!ours.ready"
              >Winding · <span class="num">{{ Math.ceil(ours.left) }}s</span></template
            >
            <template v-else-if="ours.waiting">No engine in throw</template>
            <template v-else>Loose!</template>
          </Button>
        </div>
      </template>
      <p v-else class="wl-bare">
        Fairhold's walls are bare. A trebuchet or fire-pots come with the Boons of the Crown.
      </p>
    </div>

    <div class="wl-early-cell">
      <Button
        class="cw-control wl-early"
        :class="{ afford: canSound }"
        :disabled="!canSound"
        data-testid="sound-early"
        @click="battle.soundEarly('player')"
      >
        <span class="wl-early-name">Sound the horn now</span>
        <span class="wl-early-fee num">
          <template v-if="fee === null">the men are still forming</template>
          <template v-else>{{ n(fee) }} silver to the herald</template>
        </span>
      </Button>
    </div>

    <div class="wl-weapon wl-weapon--rival">
      <template v-if="theirs.def">
        <div class="wl-head">
          <span class="wl-name">their {{ theirs.def.name.replace(/^the /, '') }}</span>
        </div>
        <div class="wl-row">
          <ProgressBar
            class="cw-gauge wl-windlass wl-windlass--rival"
            from="right"
            :class="{ ready: theirs.ready }"
            :value="theirs.wound"
          />
          <span class="wl-state num">{{
            theirs.ready ? 'wound' : `${Math.ceil(theirs.left)}s`
          }}</span>
        </div>
      </template>
      <p v-else class="wl-bare">Nothing on their walls.</p>
    </div>
  </section>
</template>

<style scoped>
.walls {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(220px, 3fr) minmax(0, 4fr);
  gap: 18px;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid var(--cw-rule);
  background: rgba(33, 27, 21, 0.6);
}
.wl-weapon {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.wl-weapon--rival {
  align-items: flex-end;
  text-align: right;
}
.wl-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.wl-name {
  font-family: var(--cw-hand);
  font-size: 17px;
  white-space: nowrap;
}
.wl-weapon--player .wl-name {
  color: #a9c3e0;
}
.wl-weapon--rival .wl-name {
  font-size: 15px;
  color: #dba497;
}
.wl-blurb {
  font-size: 13.5px;
  color: var(--cw-linen-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wl-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
/* The windlass: a rope wound tight; gold when the arm is cocked. */
.wl-windlass {
  --progress-bar-height: 6px;
  --progress-bar-fill: repeating-linear-gradient(
    110deg,
    var(--cw-gall) 0 3px,
    rgba(160, 139, 98, 0.55) 3px 6px
  );
  --progress-bar-transition: transform 0.25s linear;
  flex: 1;
  min-width: 80px;
  background: rgba(0, 0, 0, 0.45);
  border-top: 1px solid rgba(160, 139, 98, 0.25);
}
.wl-windlass--rival {
  --progress-bar-height: 4px;
  --progress-bar-fill: repeating-linear-gradient(
    70deg,
    var(--cw-madder) 0 3px,
    rgba(189, 79, 60, 0.5) 3px 6px
  );
  flex: 0 0 110px;
}
.wl-windlass.ready:not(.wl-windlass--rival) {
  --progress-bar-fill: var(--cw-weld);
}
.wl-loose {
  /* One width for winding, waiting and loose, so the row never shifts. */
  flex: 0 0 170px;
  padding: 6px 12px;
  font-family: var(--cw-caps);
  font-size: 15px;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 8px 100%, 0 calc(100% - 8px));
}
.wl-loose.waiting {
  font-family: var(--cw-hand);
  font-style: italic;
  color: var(--cw-gall);
}
.wl-state {
  font-size: 13px;
  color: var(--cw-linen-dim);
  min-width: 4ch;
}
.wl-bare {
  margin: 0;
  font-size: 13.5px;
  font-style: italic;
  color: var(--cw-linen-dim);
}
.wl-early {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 6px 10px;
}
.wl-early-name {
  font-family: var(--cw-caps);
  font-size: 15px;
}
.wl-early-fee {
  font-size: 13px;
  color: var(--cw-linen-dim);
}
.wl-early.afford .wl-early-fee {
  color: var(--cw-weld);
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { useModule } from '@/composables/useModule';
import { ArenaKey } from '../modules/arena';
import { DEVICES, EVOLUTIONS, REAGENTS } from '../data/devices';
import { deviceCooldown } from '../modules/sim/dispatch';

/**
 * The instrument rack — the Run-Scoped Upgrade Tree, as it stands right now.
 *
 * Deliberately not a table of rows. The apparatus is physical in this fiction,
 * so each installed device is a plate with its cadence stamped on it and its
 * level burned in as pips; an uninstalled one is an empty mount. A recombined
 * device stops being a plate with pips and becomes its hybrid name, which is the
 * only place in the run where the readout changes KIND rather than degree —
 * that is the payoff moment the draft pool is sized around (~12 picks, 2–3 per
 * run, `../data/devices.ts` § Balance).
 */

const arena = useModule(ArenaKey);

const EVO_BY_ID = new Map(EVOLUTIONS.map((e) => [e.id, e]));

const mounts = computed(() => {
  const stacks = arena.state.value.reagentStacks;
  const held = new Map(arena.state.value.devices.map((d) => [d.defId, d]));
  return DEVICES.map((def) => {
    const rt = held.get(def.id);
    const evo = rt?.evolutionId ? EVO_BY_ID.get(rt.evolutionId) : undefined;
    // Charge, not remaining: the plate fills toward its next discharge. This is
    // the only place the archetype's Cooldown-Rotation is legible — four devices
    // on deliberately distinct cadences (`../data/devices.ts`), and until the
    // plates answered, the rotation happened entirely off-screen.
    const cooldown = rt ? deviceCooldown(rt, stacks) : 0;
    return {
      id: def.id,
      name: evo?.name ?? def.name,
      shape: def.shape,
      level: rt?.level ?? 0,
      maxLevel: def.maxLevel,
      installed: rt !== undefined,
      evolved: evo !== undefined,
      maxed: rt !== undefined && rt.level >= def.maxLevel,
      charge:
        rt && cooldown > 0 && Number.isFinite(cooldown)
          ? Math.min(1, Math.max(0, 1 - rt.timer / cooldown))
          : 0,
    };
  });
});

const stacks = computed(() => {
  const live = arena.state.value.reagentStacks;
  return REAGENTS.map((r) => ({
    id: r.id,
    name: r.name,
    stacks: live.get(r.id) ?? 0,
    maxStacks: r.maxStacks,
    defensive: r.defensive,
  })).filter((r) => r.stacks > 0);
});
</script>

<template>
  <div class="rack">
    <div class="rack__devices">
      <div
        v-for="m in mounts"
        :key="m.id"
        class="plate"
        :class="{
          'plate--empty': !m.installed,
          'plate--maxed': m.maxed && !m.evolved,
          'plate--evolved': m.evolved,
        }"
      >
        <span class="plate__shape" :data-shape="m.shape" aria-hidden="true" />
        <span class="plate__name">{{ m.name }}</span>
        <span
          v-if="m.installed"
          class="plate__pips"
          :aria-label="`level ${m.level} of ${m.maxLevel}`"
        >
          <span
            v-for="p in m.maxLevel"
            :key="p"
            class="pip"
            :class="{ 'pip--lit': p <= m.level }"
          />
        </span>
        <span v-else class="plate__mount">unmounted</span>
        <span
          v-if="m.installed"
          class="plate__charge"
          :style="{ '--charge': m.charge }"
          aria-hidden="true"
        />
      </div>
    </div>

    <div v-if="stacks.length" class="rack__reagents">
      <span
        v-for="r in stacks"
        :key="r.id"
        class="reagent"
        :class="{ 'reagent--def': r.defensive }"
      >
        {{ r.name }}
        <span class="reagent__n num" data-num>×{{ r.stacks }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.rack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}

.rack__devices {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.plate {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px 6px 8px;
  background: linear-gradient(180deg, rgba(19, 26, 23, 0.92), rgba(10, 13, 12, 0.8));
  border: 1px solid var(--color-border);
  border-left: 2px solid var(--arc);
  border-radius: 3px;
  font-size: 0.74rem;
  transition: border-color 220ms ease;
}
.plate--empty {
  border-left-color: var(--color-border);
  opacity: 0.42;
}
.plate--maxed {
  border-left-color: var(--mote);
}
.plate--evolved {
  border-left-color: var(--sodium);
  background: linear-gradient(180deg, rgba(60, 32, 8, 0.75), rgba(20, 12, 4, 0.8));
}

/* The reach shape, as a glyph — the same four the dispatch takes. */
.plate__shape {
  width: 11px;
  height: 11px;
  flex: none;
  background: var(--arc);
  opacity: 0.85;
}
.plate--empty .plate__shape {
  background: var(--color-text-muted);
}
.plate--evolved .plate__shape {
  background: var(--sodium);
}
.plate__shape[data-shape='bolt'] {
  clip-path: polygon(50% 0, 62% 42%, 100% 50%, 62% 58%, 50% 100%, 38% 58%, 0 50%, 38% 42%);
}
.plate__shape[data-shape='pulse'] {
  border-radius: 50%;
}
.plate__shape[data-shape='cone'] {
  clip-path: polygon(0 50%, 100% 0, 100% 100%);
}
.plate__shape[data-shape='lance'] {
  clip-path: polygon(0 40%, 100% 46%, 100% 54%, 0 60%);
}

.plate__name {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  white-space: nowrap;
}
.plate--evolved .plate__name {
  color: var(--sodium);
}

.plate__pips {
  display: flex;
  gap: 2px;
}
.pip {
  width: 3px;
  height: 9px;
  background: rgba(207, 224, 216, 0.18);
  border-radius: 1px;
}
.pip--lit {
  background: var(--arc);
}
.plate--maxed .pip--lit {
  background: var(--mote);
}
.plate--evolved .plate__pips {
  display: none;
}

.plate__mount {
  color: var(--color-text-muted);
  font-size: 0.66rem;
  letter-spacing: 0.05em;
}

/* Charge, on the plate's own bottom edge. `scaleX` on a fixed-width bar rather
   than an animated `width`, so twenty updates a second across four plates never
   touch layout — the same rule the counters follow. */
.plate__charge {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 2px;
  transform: scaleX(var(--charge, 0));
  transform-origin: left center;
  background: var(--arc);
  opacity: 0.55;
}
.plate--maxed .plate__charge {
  background: var(--mote);
}
.plate--evolved .plate__charge {
  background: var(--sodium);
  opacity: 0.75;
}

.rack__reagents {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
.reagent {
  padding: 3px 7px;
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  border-radius: 2px;
  background: rgba(127, 214, 255, 0.09);
  border: 1px solid rgba(127, 214, 255, 0.16);
  color: var(--color-text);
  white-space: nowrap;
}
.reagent--def {
  background: rgba(91, 196, 111, 0.09);
  border-color: rgba(91, 196, 111, 0.2);
}
.reagent__n {
  color: var(--color-text-muted);
}
</style>

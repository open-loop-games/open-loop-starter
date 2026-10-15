<!--
  BreachLine — the band over the bay: the ship in service, the swarm her guns are holding,
  and once the breach line opens, the carrier that holds the current sector. Its hull bar
  drains through an engagement while the window clock runs beneath it; ahead of the fill a
  hatched span shows what the fitted firepower will strip before the window closes, so
  "will it fall?" is read off the bar before the Engage plate is pressed. Breach red is the
  swarm's colour, and appears only for what the swarm brings.
-->
<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import Button from '@/ui/components/Button.vue';
import { CARRIER_WINDOW_S, HONOUR_MULT, LINE_OPENS, SHIP_BY_ID, SHIPS } from '../../data';
import { getBoard, getFleet, getLine, getYard, type Engagement } from '../../modules';
import { fmt, pct, secs, times } from '../format';
import ShipPlate from './ShipPlate.vue';

const board = getBoard();
const fleet = getFleet();
const line = getLine();
const yard = getYard();

const LANES = 9;
/** Hull points of one swarm drone: sets only how fast the screen's drones cross. */
const DRONE_HP = 12;

/**
 * Seconds for one drone to cross and die, quantized to a few steps so the CSS animation
 * is not restarted on every tick. Zero when nothing is firing.
 */
const sweep = computed(() => {
  const k = board.firepower.value / DRONE_HP;
  if (k <= 0) return 0;
  const raw = LANES / k;
  const steps = [0.9, 1.4, 2.2, 3.4, 5, 7.5];
  return steps.find((s) => s >= raw) ?? 7.5;
});

const opensAt = SHIPS[0]!.sections.find((s) => s.id === LINE_OPENS)!.name;

/** The carrier in view: the one being engaged, else the one holding the sector. */
const target = computed(() => {
  const e = line.engagement.value;
  const c = e?.carrier ?? fleet.carrier.value;
  if (!c) return null;
  const hull = e?.hull ?? line.hullOf(c);
  const remaining = e?.remaining ?? hull;
  const left = Math.max(0, CARRIER_WINDOW_S - (e?.elapsed ?? 0));
  const fp = board.firepower.value;
  const strip = fp * left;
  const falls = fp > 0 && strip >= remaining;
  return {
    c,
    hull,
    remaining,
    elapsed: e?.elapsed ?? 0,
    left,
    fp,
    falls,
    /** seconds until it falls at the fitted firepower */
    fallsIn: fp > 0 ? remaining / fp : Infinity,
    /** share of hull left when the window closes, if it holds */
    holdsAt: Math.max(0, remaining - strip) / hull,
    /** what the fitted fire needs to fell it inside the window */
    needs: remaining / Math.max(left, 1e-9),
  };
});

/** Why the Engage plate is cold, when it is. */
const coldReason = computed(() => {
  const t = target.value;
  if (!t || line.canEngage.value) return '';
  if (line.engagement.value) return 'engaged';
  const sec = SHIP_BY_ID[t.c.def.ship].sections[t.c.def.after - 1];
  return sec ? `plate ${sec.name} first` : '';
});

/** How the last engagement ended, kept until the next begins. */
const report = shallowRef<{ name: string; fell: boolean; left: number } | null>(null);
watch(fleet.ship, () => (report.value = null));
watch(line.engagement, (now, was: Engagement | null) => {
  if (now) report.value = null;
  else if (was)
    report.value = {
      name: was.carrier.def.name,
      fell: line.last.value === 'fell',
      left: Math.max(0, was.remaining) / was.hull,
    };
});
</script>

<template>
  <div
    class="breach-line"
    :class="{ silent: !sweep, open: fleet.lineOpen.value, engaged: !!line.engagement.value }"
  >
    <ShipPlate />
    <div class="field">
      <div class="swarm" aria-hidden="true">
        <span
          v-for="i in LANES"
          :key="i"
          class="drone"
          :style="{
            '--i': i,
            top: `${8 + ((i * 37) % 70)}%`,
            animationDuration: `${sweep || 6}s`,
            animationDelay: `${-((i * (sweep || 6)) / LANES)}s`,
          }"
        />
      </div>
      <div v-if="!target" class="sealed-note">
        breach line sealed · it opens when the <strong>{{ opensAt }}</strong> is plated
      </div>
      <div v-else class="carrier" :class="{ raised: target.c.beyond > 0 }">
        <div class="carrier-head">
          <span class="sector hp-num">sector {{ target.c.def.sector }}</span>
          <span class="carrier-name">{{ target.c.def.name }}</span>
          <span v-if="target.c.beyond" class="raised-tag">raised</span>
          <span class="hull-fig hp-num"
            >{{ fmt(target.remaining) }} <small>/ {{ fmt(target.hull) }} hull</small></span
          >
        </div>
        <div
          class="hull-bar"
          role="meter"
          :aria-valuenow="target.remaining"
          :aria-valuemax="target.hull"
          aria-valuemin="0"
          :aria-label="`${target.c.def.name} hull`"
        >
          <span
            class="strip"
            :class="{ falls: target.falls }"
            :style="{ transform: `scaleX(${target.remaining / target.hull})` }"
          />
          <span
            class="fill"
            :style="{
              transform: `scaleX(${target.falls ? 0 : target.holdsAt})`,
            }"
          />
        </div>
        <div class="clock" :aria-label="`window ${secs(target.left)} left`">
          <span
            class="clock-fill"
            :style="{ transform: `scaleX(${target.elapsed / CARRIER_WINDOW_S})` }"
          />
        </div>
      </div>
    </div>
    <div class="console">
      <template v-if="target">
        <div class="verdict" :class="target.falls ? 'falls' : 'holds'">
          <template v-if="target.falls">
            falls in <span class="hp-num">{{ secs(target.fallsIn) }}</span>
          </template>
          <template v-else-if="target.fp > 0">
            withdraws at <span class="hp-num">{{ pct(target.holdsAt) }}</span> hull
          </template>
          <template v-else>nothing fitted fires</template>
        </div>
        <div class="needs hp-num">
          {{ fmt(target.fp) }} dps of
          <span :class="{ short: !target.falls }">{{ fmt(target.needs) }}</span> needed ·
          {{ secs(line.engagement.value ? target.left : CARRIER_WINDOW_S) }} window
        </div>
        <div class="engage-row">
          <Button
            class="hp-act engage"
            :class="{ can: line.canEngage.value }"
            :disabled="!line.canEngage.value"
            @click="line.engage()"
          >
            {{ line.engagement.value ? 'Engaged' : 'Engage' }}
          </Button>
          <span v-if="coldReason && !line.engagement.value" class="why">{{ coldReason }}</span>
          <span
            v-else-if="report"
            class="report"
            :class="{ fell: report.fell }"
            :title="report.fell ? '' : 'A withdrawal costs nothing: re-fit and engage again.'"
          >
            <template v-if="report.fell"
              >{{ report.name }} destroyed · honour {{ times(HONOUR_MULT) }}</template
            >
            <template v-else
              >last: withdrew at <span class="hp-num">{{ pct(report.left) }}</span> hull</template
            >
          </span>
        </div>
      </template>
      <template v-else>
        <div class="verdict quiet">the swarm is screening</div>
        <div class="needs">Salvage is paid on every point of damage.</div>
        <div class="needs">
          <span class="hp-num">{{ fmt(yard.shipEarned()) }}</span> salvage recovered this ship
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.breach-line {
  position: relative;
  display: grid;
  grid-template-columns: minmax(220px, 260px) 1fr minmax(280px, 330px);
  align-items: stretch;
  height: 96px;
  flex: none;
  border-bottom: 1px solid var(--hull-seam);
  background: linear-gradient(
    90deg,
    rgba(255, 181, 71, 0.04),
    transparent 30%,
    rgba(255, 93, 93, 0.05)
  );
  overflow: hidden;
}
/* A size container, so a drone's crossing is the field's own width at any viewport. */
.field {
  position: relative;
  container-type: size;
  min-width: 0;
}
.swarm {
  position: absolute;
  inset: 0;
}
.open .swarm {
  opacity: 0.45;
}
.drone {
  position: absolute;
  left: 100%;
  width: 9px;
  height: 9px;
  background: var(--breach);
  clip-path: polygon(100% 0, 0 50%, 100% 100%, 70% 50%);
  animation: inbound linear infinite;
  will-change: transform, opacity;
}
.silent .drone {
  animation-play-state: paused;
  opacity: 0.35;
}
.sealed-note {
  position: absolute;
  left: 24px;
  bottom: 10px;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--readout-dim);
}
.sealed-note strong {
  color: var(--blueprint);
  font-weight: 500;
}

/* ── the carrier: hull bar, the strip the fit will take, and the window clock ── */
.carrier {
  position: absolute;
  inset: 12px 24px 12px 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}
.carrier-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  white-space: nowrap;
}
.sector {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--readout-dim);
}
.carrier-name {
  font-family: var(--face-stencil);
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--breach);
}
.raised-tag {
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--breach);
  border: 1px solid color-mix(in srgb, var(--breach) 50%, transparent);
  padding: 0 4px;
  border-radius: 2px;
}
.hull-fig {
  margin-left: auto;
  font-size: 15px;
  font-weight: 700;
  color: var(--readout);
}
.hull-fig small {
  font-size: 11px;
  font-weight: 500;
  color: var(--readout-dim);
}
.hull-bar {
  position: relative;
  height: 12px;
  background: var(--void);
  border: 1px solid color-mix(in srgb, var(--breach) 35%, var(--hull-seam));
  border-radius: 2px;
  overflow: hidden;
}
.hull-bar > span {
  position: absolute;
  inset: 0;
  transform-origin: left;
}
/* What the window will strip, hatched: plasma when it reaches zero, slag when it falls short. */
.strip {
  background: repeating-linear-gradient(
    135deg,
    color-mix(in srgb, var(--slag) 55%, transparent) 0 3px,
    transparent 3px 7px
  );
}
.strip.falls {
  background: repeating-linear-gradient(
    135deg,
    color-mix(in srgb, var(--plasma) 55%, transparent) 0 3px,
    transparent 3px 7px
  );
}
.fill {
  background: linear-gradient(180deg, #ff7676, var(--breach) 60%, #c94343);
  filter: saturate(0.45) brightness(0.7);
}
/* The carrier at rest is held back; under fire its hull burns at full strength. */
.engaged .fill {
  filter: none;
}
.clock {
  position: relative;
  height: 3px;
  background: var(--hull-seam);
  overflow: hidden;
}
.clock-fill {
  position: absolute;
  inset: 0;
  background: var(--blueprint);
  transform-origin: left;
}

/* ── the console: the verdict, the need, the Engage plate ── */
.console {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 0 20px;
  border-left: 1px solid var(--hull-seam);
  min-width: 0;
}
.verdict {
  font-family: var(--face-stencil);
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.verdict .hp-num {
  font-size: 16px;
  letter-spacing: 0;
}
.verdict.falls {
  color: var(--gain);
}
.verdict.holds {
  color: var(--loss);
}
.verdict.quiet {
  color: var(--readout-dim);
}
.needs {
  font-size: 12px;
  color: var(--readout-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.needs .short {
  color: var(--loss);
}
.engage-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
  min-width: 0;
}
.engage {
  font-family: var(--face-stencil);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 12px;
  padding: 3px 12px;
}
.engaged .engage {
  border-color: var(--blueprint-dim);
  color: var(--blueprint);
}
.why,
.report {
  font-size: 11px;
  color: var(--readout-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.report.fell {
  color: var(--honour);
}

@media (prefers-reduced-motion: reduce) {
  .drone {
    animation: none;
    opacity: 0.5;
    transform: translateX(calc(var(--i) * -9cqw));
  }
}
@keyframes inbound {
  0% {
    transform: translateX(0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  78% {
    transform: translateX(-88cqw) scale(1);
    opacity: 1;
  }
  84% {
    transform: translateX(-91cqw) scale(2.2);
    opacity: 0;
  }
  100% {
    transform: translateX(-91cqw) scale(2.2);
    opacity: 0;
  }
}
</style>

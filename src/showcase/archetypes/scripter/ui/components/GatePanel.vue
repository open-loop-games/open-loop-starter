<!--
  GatePanel — who stands at the gate. Between bouts it names the visitor announced next
  and when they step through, with their tell, so the sensei can ink the right scroll from
  the rack before the bout opens; in a bout it shows what the scroll can read: each
  attacker's stance and health, the student's chi, and the incense burning down the bout's
  clock. A challenger the dojo has never beaten carries the seal.
-->
<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/ui/components/Button.vue';
import { challenger, clockFor } from '../../data';
import { RULES } from '../../data';
import { getGate, getKata, getLineage, showsPhase, type Attacker } from '../../modules';
import { fmt, fmtClock, fmtMult } from '../format';

const gate = getGate();
const kata = getKata();
const lineage = getLineage();

const PHASE: Record<string, string> = {
  idle: 'at rest',
  winds: 'winding up',
  smash: 'smashing',
  shell: 'shelled',
  jab: 'jabbing',
  open: 'open',
  high: 'guarding high',
  low: 'guarding low',
};

function stance(a: Attacker): { text: string; kind: string } | null {
  if (a.stagger > 0) return { text: `staggered, open · ${a.stagger}`, kind: 'open' };
  const p = challenger(a.id).pattern;
  if (p === 'gang')
    return {
      text: a.next <= 1 ? 'strikes next beat' : `strikes in ${a.next}`,
      kind: a.next <= 1 ? 'winds' : 'idle',
    };
  if (!showsPhase(p)) return null;
  const left = Number.isFinite(a.left) ? ` · ${a.left}` : '';
  return { text: `${PHASE[a.phase] ?? a.phase}${left}`, kind: a.phase };
}

const bout = computed(() => gate.bout.value);
const visitor = computed(() => (gate.next.value ? challenger(gate.next.value.id) : null));
const countdown = computed(() =>
  gate.next.value ? gate.next.value.at - lineage.playSeconds.value : 0,
);
const isNew = (id: string) => !lineage.beaten.value.includes(id as never);
const front = computed(() =>
  bout.value ? challenger(bout.value.attackers[0]?.id ?? bout.value.challenger) : null,
);
const incense = computed(() => {
  if (!bout.value) return 1;
  return Math.max(0, 1 - bout.value.beat / clockFor(bout.value.challenger));
});
const last = computed(() => gate.last.value);
const rackSlots = computed(() =>
  kata.rack.value.map((s, i) => ({ ...s, i })).filter((s) => s.text),
);
</script>

<template>
  <section class="if-panel gate" aria-label="The gate" aria-live="polite">
    <h2 class="if-title">
      At the gate
      <small class="num">standing {{ fmtMult(lineage.standing.value) }}</small>
    </h2>

    <div v-if="bout && front" class="card in-bout if-reveal">
      <div class="who">
        <span class="name">{{ challenger(bout.challenger).displayName }}</span>
        <span v-if="isNew(bout.challenger)" class="seal-mark">new</span>
      </div>
      <p class="tell">{{ front.tell }}</p>
      <ul class="attackers">
        <li v-for="(a, k) in bout.attackers" :key="k" class="attacker">
          <div class="line">
            <span>{{
              bout.attackers.length > 1
                ? `${challenger(a.id).displayName} · ${k + 1}`
                : bout.challenger === a.id
                  ? 'Health'
                  : challenger(a.id).displayName
            }}</span>
            <span v-if="stance(a)" class="stance" :class="stance(a)!.kind">{{
              stance(a)!.text
            }}</span>
          </div>
          <div class="if-bar" :aria-label="`health ${Math.ceil(a.hp)} of ${a.maxHp}`">
            <i :style="{ transform: `scaleX(${Math.max(0, a.hp / a.maxHp)})` }" />
          </div>
        </li>
      </ul>
      <p v-if="bout.queue.length" class="queue">
        {{ bout.queue.length }} more to come, in an order no one is told.
      </p>
      <div class="student">
        <div class="line">
          <span>The student’s chi</span>
          <span class="num">
            {{ Math.round(bout.chi) }}
            <template v-if="bout.down"> · cannot act for {{ bout.down }}</template>
            <template v-else-if="bout.parry"> · parry raised</template>
          </span>
        </div>
        <div class="if-bar chi">
          <i :style="{ transform: `scaleX(${bout.chi / RULES.chiMax})` }" />
        </div>
      </div>
      <div
        class="incense"
        :aria-label="`incense: ${clockFor(bout.challenger) - bout.beat} beats left`"
      >
        <span class="stick"
          ><i :style="{ transform: `scaleX(${incense})` }" /><b
            :style="{ left: `${incense * 100}%` }"
        /></span>
        <span class="num">{{ clockFor(bout.challenger) - bout.beat }} beats of incense</span>
      </div>
    </div>

    <div v-else-if="visitor" class="card announced if-reveal">
      <div class="who">
        <span class="name">{{ visitor.displayName }}</span>
        <span v-if="isNew(visitor.id)" class="seal-mark">new</span>
        <span class="when num">steps through in {{ fmtClock(countdown) }}</span>
      </div>
      <p class="tell">{{ visitor.tell }}</p>
      <div v-if="rackSlots.length" class="rack-quick">
        <span>Ink from the rack:</span>
        <Button v-for="s in rackSlots" :key="s.i" class="if-act" @click="kata.inkFromRack(s.i)">
          {{ s.name }}
        </Button>
      </div>
    </div>

    <p v-else class="quiet">
      The gate is quiet. When a challenger comes, they come whether the scroll is ready or not.
    </p>

    <p v-if="last && !bout" class="last" :class="{ won: last.won }">
      Last bout: {{ challenger(last.id).displayName }},
      <template v-if="last.won"
        >won in <span class="num">{{ last.beats }}</span> beats, +<span class="num">{{
          fmt(last.bounty)
        }}</span>
        Ki.</template
      >
      <template v-else>lost when the incense burned out.</template>
    </p>
  </section>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-left: 4px solid var(--if-vermilion);
  padding: 4px 0 4px 12px;
}
.card.announced {
  border-left-color: var(--if-amber);
}
.who {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.name {
  font-size: 19px;
}
.when {
  margin-left: auto;
  color: var(--if-amber);
  font-size: 14px;
}
.seal-mark {
  font-size: 11px;
  letter-spacing: 0.16em;
  color: var(--if-vermilion);
  border: 1px solid var(--if-vermilion);
  padding: 0 5px;
  transform: rotate(-3deg);
}
.tell {
  margin: 0;
  color: var(--if-tatami);
  font-size: 14px;
}
.attackers {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}
.attacker,
.student {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.line {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}
.stance {
  padding: 0 8px;
  border: 1px solid var(--if-tatami-dim);
  color: var(--if-moonlight);
  font-size: 12px;
}
.stance.winds,
.stance.jab {
  border-color: var(--if-amber);
  color: var(--if-lamplight);
}
.stance.smash {
  border-color: var(--if-vermilion);
  color: var(--if-vermilion);
}
.stance.open {
  border-color: var(--if-indigo);
  color: var(--if-indigo);
}
.queue {
  margin: 0;
  font-size: 13px;
  color: var(--if-tatami);
}
.incense {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--if-tatami);
}
.stick {
  position: relative;
  flex: 1;
  height: 3px;
  background: var(--if-lacquer-edge);
}
.stick i {
  position: absolute;
  inset: 0;
  background: var(--if-incense);
  transform-origin: left;
  transition: transform 300ms linear;
}
.stick b {
  position: absolute;
  top: -2px;
  width: 6px;
  height: 7px;
  margin-left: -3px;
  background: var(--if-vermilion);
  border-radius: 50%;
  box-shadow: 0 0 6px var(--if-vermilion);
  transition: left 300ms linear;
}
.rack-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  color: var(--if-tatami);
}
.quiet {
  margin: 0;
  color: var(--if-tatami);
  font-size: 14px;
}
.last {
  margin: 0;
  font-size: 13px;
  color: var(--if-vermilion);
}
.last.won {
  color: var(--if-tatami);
}
</style>

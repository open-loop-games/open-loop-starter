<!--
  Heralds — the signature voice. Each horn gets its herald's cry, quoted in its own keep's
  voice; under a rival's cry, Fairhold's chronicler glosses it. So do the battle's other
  events: a champion riding out, a keep's weapon loosed, a horn sounded early; those lines
  carry no wave. The newest stands on top; older lines fade, as margin notes do.

  Costume classes: `.heralds`, `.hl-line--player|rival`, `.hl-cry`, `.hl-gloss`.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { troop, type TroopId } from '../../data';
import { getBattle } from '../../modules';
import { mmss } from '../format';
import TroopGlyph from './TroopGlyph.vue';

const battle = getBattle();
const lines = computed(() => [...battle.heralds.value].reverse());
const keepName = computed(() => battle.lord.value.keep);
const waveOf = (wave: Partial<Record<TroopId, number>>) =>
  (Object.entries(wave) as [TroopId, number][]).sort((a, b) => troop(a[0]).rank - troop(b[0]).rank);
</script>

<template>
  <section class="heralds" aria-label="The heralds">
    <h2 class="cw-title">The heralds</h2>
    <p v-if="!lines.length" class="hl-quiet">The heralds draw breath. Neither horn has sounded.</p>
    <ol class="hl-lines">
      <li
        v-for="(l, i) in lines"
        :key="`${l.t}-${l.side}-${l.cry}`"
        class="hl-line"
        :class="[`hl-line--${l.side}`, { fresh: i === 0 }]"
      >
        <div class="hl-head">
          <span class="hl-who">
            {{ l.side === 'player' ? 'Our herald' : `The herald of ${keepName}` }}
          </span>
          <span class="hl-wave">
            <span v-for="[id, count] in waveOf(l.wave ?? {})" :key="id" class="hl-squad">
              <span class="hl-glyph"><TroopGlyph :troop="id" /></span
              ><span class="num">{{ count }}</span>
            </span>
          </span>
          <span class="num hl-t">{{ mmss(l.t) }}</span>
        </div>
        <p class="hl-cry">“{{ l.cry }}”</p>
        <p v-if="l.gloss" class="hl-gloss">{{ l.gloss }}</p>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.hl-quiet {
  margin: 0;
  font-style: italic;
  color: var(--cw-linen-dim);
}
.hl-lines {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hl-line {
  padding-left: 10px;
  opacity: 0.6;
  transition: opacity 0.6s ease;
}
.hl-line.fresh {
  opacity: 1;
}
.hl-line--player {
  border-left: 2px solid var(--cw-woad);
}
.hl-line--rival {
  border-left: 2px solid var(--cw-madder);
}
.hl-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--cw-gall);
}
.hl-who {
  font-family: var(--cw-caps);
}
.hl-wave {
  display: inline-flex;
  gap: 6px;
}
.hl-squad {
  display: inline-flex;
  align-items: center;
  gap: 1px;
}
.hl-glyph {
  width: 12px;
  height: 15px;
}
.hl-line--player .hl-glyph {
  color: var(--cw-woad);
}
.hl-line--rival .hl-glyph {
  color: var(--cw-madder);
}
.hl-t {
  margin-left: auto;
  color: var(--cw-linen-dim);
}
.hl-cry {
  margin: 1px 0 0;
  font-family: var(--cw-hand);
  font-style: italic;
  font-size: 16.5px;
  line-height: 1.25;
}
.hl-line--rival .hl-cry {
  color: #e2b4a8;
}
.hl-line--player .hl-cry {
  color: #b9cfe8;
}
.hl-gloss {
  margin: 1px 0 0;
  font-size: 14.5px;
  color: var(--cw-linen);
}
.hl-gloss::before {
  content: 'Our chronicler: ';
  color: var(--cw-gall);
}
</style>

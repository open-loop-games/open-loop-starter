<!--
  Heralds — the signature voice, on starter's `EventLog`. Each horn gets its herald's cry,
  quoted in its own keep's voice; under a rival's cry, Fairhold's chronicler glosses it. So do
  the battle's other events: a champion riding out, a keep's weapon loosed, a horn sounded
  early; those lines carry no wave. The newest stands on top; older lines fade, as margin notes
  do.

  Costume classes: `.heralds`, `.event-log__row--player|rival`, `.hl-cry`, `.hl-gloss`.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { EventLog } from '@/ui/compositions';
import { troop, type TroopId } from '../../data';
import { getBattle } from '../../modules';
import { mmss } from '../format';
import TroopGlyph from './TroopGlyph.vue';

const battle = getBattle();
const keepName = computed(() => battle.lord.value.keep);
const waveOf = (wave: Partial<Record<TroopId, number>>) =>
  (Object.entries(wave) as [TroopId, number][]).sort((a, b) => troop(a[0]).rank - troop(b[0]).rank);
</script>

<template>
  <section class="heralds" aria-label="The heralds">
    <h2 class="cw-title">The heralds</h2>
    <EventLog :lines="battle.heralds.lines.value">
      <template #row="{ line }">
        <div class="hl-head">
          <span class="hl-who">
            {{ line.kind === 'player' ? 'Our herald' : `The herald of ${keepName}` }}
          </span>
          <span class="hl-wave">
            <span v-for="[id, count] in waveOf(line.extra?.wave ?? {})" :key="id" class="hl-squad">
              <span class="hl-glyph"><TroopGlyph :troop="id" /></span
              ><span class="num">{{ count }}</span>
            </span>
          </span>
          <span class="num hl-t">{{ mmss(line.at) }}</span>
        </div>
        <p class="hl-cry">“{{ line.text }}”</p>
        <p v-if="line.extra?.gloss" class="hl-gloss">{{ line.extra.gloss }}</p>
      </template>
      <template #empty>The heralds draw breath. Neither horn has sounded.</template>
    </EventLog>
  </section>
</template>

<style scoped>
.heralds :deep(.event-log) {
  gap: 8px;
}
.heralds :deep(.event-log__empty) {
  color: var(--cw-linen-dim);
}
.heralds :deep(.event-log__row) {
  display: block;
  padding-left: 10px;
  color: inherit;
  opacity: 0.6;
  transition: opacity 0.6s ease;
}
.heralds :deep(.event-log__row--fresh) {
  opacity: 1;
}
.heralds :deep(.event-log__row--player) {
  border-left: 2px solid var(--cw-woad);
}
.heralds :deep(.event-log__row--rival) {
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
.heralds :deep(.event-log__row--player .hl-glyph) {
  color: var(--cw-woad);
}
.heralds :deep(.event-log__row--rival .hl-glyph) {
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
.heralds :deep(.event-log__row--rival .hl-cry) {
  color: #e2b4a8;
}
.heralds :deep(.event-log__row--player .hl-cry) {
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

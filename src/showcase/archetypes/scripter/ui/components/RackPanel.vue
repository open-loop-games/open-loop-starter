<!--
  RackPanel — the scroll rack: saved scrolls the sensei can ink in one move. Until the
  Envoy's Names let one scroll tell challengers apart, the rack is how a scroll is matched
  to the visitor the gate announces. The rack outlasts graduation.
-->
<script setup lang="ts">
import Button from '@/ui/components/Button.vue';
import { getKata } from '../../modules';

const kata = getKata();

function rename(i: number, e: Event) {
  const name = (e.target as HTMLInputElement).value;
  kata.rack.value = kata.rack.value.map((s, k) => (k === i ? { ...s, name: name || s.name } : s));
}
const preview = (text: string) =>
  text
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .slice(0, 3)
    .join(' · ');
</script>

<template>
  <section class="if-panel rack" aria-label="The scroll rack">
    <h2 class="if-title">The rack <small>saved scrolls</small></h2>
    <ul class="slots">
      <li
        v-for="(slot, i) in kata.rack.value"
        :key="i"
        class="slot"
        :class="{ empty: !slot.text, inked: slot.text && slot.text === kata.inked.value }"
      >
        <div class="head">
          <input
            class="slot-name"
            :value="slot.name"
            :aria-label="`name of rack slot ${i + 1}`"
            @change="rename(i, $event)"
          />
          <Button
            class="if-act quiet"
            :title="'Save the draft in this slot'"
            @click="kata.saveToRack(i, slot.name)"
            >Save</Button
          >
          <Button
            v-if="slot.text"
            class="if-act"
            :disabled="slot.text === kata.inked.value"
            @click="kata.inkFromRack(i)"
            >Ink</Button
          >
        </div>
        <p v-if="slot.text" class="preview">{{ preview(slot.text) }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.slots {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.slot {
  border-left: 3px solid var(--if-lacquer-edge);
  padding-left: 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.slot.inked {
  border-left-color: var(--if-indigo);
}
.head {
  display: flex;
  gap: 6px;
  align-items: center;
}
.slot-name {
  flex: 1;
  min-width: 0;
  font: 14px var(--if-face);
  color: var(--if-moonlight);
  background: transparent;
  border: 0;
  border-bottom: 1px dotted var(--if-lacquer-edge);
  padding: 0;
}
.preview {
  margin: 0;
  font-size: 12px;
  color: var(--if-tatami);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.slot.empty .slot-name {
  color: var(--if-tatami);
}
</style>

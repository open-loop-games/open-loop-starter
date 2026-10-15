<!--
  RewriteModal — the writers' pages at a level-up, while the player calls the moves. The
  floor holds until a page is taken; keys 1–4 take one.
-->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import Button from '@/ui/components/Button.vue';
import { getTake } from '../modules';
import { pageOf } from './pages';

const take = getTake();

function onKey(e: KeyboardEvent): void {
  const n = Number(e.key);
  if (n >= 1 && n <= take.view.offer.length) take.pickCard(n - 1);
}
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="rewrite" role="dialog" aria-label="Rewrites" @pointerdown.stop>
    <div class="head">
      <div class="billing kicker">Hold the roll</div>
      <h2 class="billing">Rewrites: take one page</h2>
      <div class="sub">The rest go in the bin. They may come back next draft.</div>
    </div>
    <div class="pages">
      <Button
        v-for="(c, i) in take.view.offer"
        :key="i"
        class="ss-control page"
        :class="{ fresh: pageOf(c).isNew }"
        :aria-label="`Page ${i + 1}: ${pageOf(c).heading}`"
        @click="take.pickCard(i)"
      >
        <span class="slug">INT. SOUNDSTAGE — {{ pageOf(c).slug }}</span>
        <span class="character">{{ pageOf(c).heading.toUpperCase() }}</span>
        <span class="paren">{{ pageOf(c).cont }}</span>
        <span class="action">{{ pageOf(c).action }}</span>
        <span class="foot">
          <span class="key">{{ i + 1 }}</span>
          <span class="pg">{{ 40 + i }}.</span>
        </span>
      </Button>
    </div>
  </div>
</template>

<style scoped>
.rewrite {
  position: absolute;
  inset: 0;
  background: rgba(10, 9, 8, 0.78);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 26px;
  animation: dim 220ms var(--ease-cut);
}
@keyframes dim {
  from {
    opacity: 0;
  }
}
.head {
  text-align: center;
}
.kicker {
  color: var(--squib);
  font-size: 13px;
  letter-spacing: 0.2em;
}
h2 {
  margin: 4px 0;
  font-size: 40px;
  color: var(--chalk);
}
.sub {
  color: var(--chalk-dim);
  font-size: 15px;
}
.pages {
  display: flex;
  gap: 22px;
  flex-wrap: wrap;
  justify-content: center;
}
.page {
  width: 230px;
  min-height: 300px;
  text-align: left;
  background: var(--script-paper);
  color: var(--script-ink);
  font-family: var(--font-script);
  font-size: 13px;
  line-height: 1.45;
  padding: 22px 20px 14px 26px;
  border-left: 3px solid transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.55);
  transition:
    transform 140ms var(--ease-cut),
    box-shadow 140ms var(--ease-cut);
  animation: deal 260ms var(--ease-cut) both;
}
.page:nth-child(2) {
  animation-delay: 50ms;
}
.page:nth-child(3) {
  animation-delay: 100ms;
}
.page:nth-child(4) {
  animation-delay: 150ms;
}
@keyframes deal {
  from {
    opacity: 0;
    transform: translateY(18px) rotate(-1deg);
  }
}
.page:hover,
.page:focus-visible {
  transform: translateY(-6px);
  box-shadow:
    0 16px 30px rgba(0, 0, 0, 0.6),
    0 0 0 2px var(--tungsten);
  outline: none;
}
.page.fresh {
  border-left-color: var(--greenlight);
}
.slug {
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 26px;
}
.character {
  text-align: center;
  font-weight: 700;
  font-size: 15px;
}
.paren {
  text-align: center;
  margin-bottom: 14px;
}
.action {
  flex: 1;
}
.foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}
.key {
  font-family: var(--font-billing);
  font-weight: 700;
  font-size: 13px;
  background: var(--script-ink);
  color: var(--script-paper);
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
}
.pg {
  color: #7a7468;
}
</style>

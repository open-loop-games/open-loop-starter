<!--
  TakeView — the floor and its HUD. The canvas paints whatever the step last wrote, every
  animation frame; the HUD reads the take's reactive mirror. Input is read only while the
  player calls the moves; an improvising star steers itself, and its pages are announced on
  a slip instead of the rewrite modal.
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { ANCHORS } from '../data';
import { getTake } from '../modules';
import { renderArena } from './render';
import { pageOf } from './pages';
import RewriteModal from './RewriteModal.vue';

const take = getTake();
const canvas = ref<HTMLCanvasElement | null>(null);
const hud = take.view.hud;
const improvising = computed(() => take.view.driver === 'instinct');

// ─── Input: movement is the only verb ───
const keys = new Set<string>();
let pointer: { x: number; y: number } | null = null;

function syncInput(): void {
  if (improvising.value) return;
  let mx = 0;
  let my = 0;
  if (keys.has('arrowleft') || keys.has('a')) mx -= 1;
  if (keys.has('arrowright') || keys.has('d')) mx += 1;
  if (keys.has('arrowup') || keys.has('w')) my -= 1;
  if (keys.has('arrowdown') || keys.has('s')) my += 1;
  if (mx === 0 && my === 0 && pointer && canvas.value) {
    const r = canvas.value.getBoundingClientRect();
    const dx = pointer.x - (r.left + r.width / 2);
    const dy = pointer.y - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > 14) {
      mx = dx / d;
      my = dy / d;
    }
  }
  take.input.mx = mx;
  take.input.my = my;
}

const MOVE_KEYS = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'];
function onKey(e: KeyboardEvent, down: boolean): void {
  if (improvising.value) return;
  const k = e.key.toLowerCase();
  if (!MOVE_KEYS.includes(k)) return;
  e.preventDefault();
  if (down) keys.add(k);
  else keys.delete(k);
  syncInput();
}
const keydown = (e: KeyboardEvent) => onKey(e, true);
const keyup = (e: KeyboardEvent) => onKey(e, false);
function pointerDown(e: PointerEvent): void {
  pointer = { x: e.clientX, y: e.clientY };
  syncInput();
}
function pointerMove(e: PointerEvent): void {
  if (!pointer) return;
  pointer = { x: e.clientX, y: e.clientY };
  syncInput();
}
function pointerUp(): void {
  pointer = null;
  syncInput();
}
function release(): void {
  keys.clear();
  pointer = null;
  syncInput();
}

// ─── Frame loop: paint whatever the step last wrote ───
let raf = 0;
function frame(): void {
  const c = canvas.value;
  const a = take.arena();
  if (c && a) {
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderArena(ctx, a, w, h);
  }
  raf = requestAnimationFrame(frame);
}

onMounted(() => {
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', release);
  window.addEventListener('pointerup', pointerUp);
  raf = requestAnimationFrame(frame);
});
onUnmounted(() => {
  window.removeEventListener('keydown', keydown);
  window.removeEventListener('keyup', keyup);
  window.removeEventListener('blur', release);
  window.removeEventListener('pointerup', pointerUp);
  cancelAnimationFrame(raf);
  release();
});

// ─── HUD readouts ───
const pad = (n: number) => String(n).padStart(2, '0');
/** Timecode at 24 frames a second: HH:MM:SS:FF. */
const timecode = computed(() => {
  const t = hud.t;
  return `00:${pad(Math.floor(t / 60))}:${pad(Math.floor(t) % 60)}:${pad(Math.floor((t % 1) * 24))}`;
});
const toCut = computed(() => {
  const left = Math.max(0, ANCHORS.takeSeconds - hud.t);
  return `${Math.floor(left / 60)}:${pad(Math.floor(left % 60))}`;
});
const sceneLabel = computed(() => Math.floor(hud.scene) + 1);
const hpFrac = computed(() => (hud.maxHp > 0 ? hud.hp / hud.maxHp : 0));

/** Seconds of floor time the slip announcing an improvised page stays up. */
const SLIP_SECONDS = 2.5;
const slip = computed(() => {
  const last = take.view.lastPage;
  if (!last || hud.t - last.at > SLIP_SECONDS) return null;
  return { key: last.at, page: pageOf(last.card) };
});
</script>

<template>
  <div class="take" @pointerdown="pointerDown" @pointermove="pointerMove">
    <canvas ref="canvas" class="floor" aria-label="The soundstage floor"></canvas>

    <div class="slate">
      <div class="clapper-stripe"></div>
      <div class="slate-body">
        <div class="slate-row billing">
          <span
            >Scene <b class="num">{{ sceneLabel }}</b></span
          >
          <span
            >Take <b class="num">{{ take.view.takeNumber }}</b></span
          >
        </div>
        <div class="slate-rating billing">
          Rated {{ take.view.rating.label }}
          <span class="caller" :class="{ improvising }">{{
            improvising ? 'Improvising' : 'You call it'
          }}</span>
        </div>
      </div>
    </div>

    <div class="timecode">
      <div class="tc num">{{ timecode }}</div>
      <div class="tc-sub billing">
        to cut <span class="num">{{ toCut }}</span>
      </div>
    </div>

    <div class="tally">
      <div class="tally-row">
        <span class="reel-icon"></span><span class="num big">{{ Math.floor(hud.reels) }}</span
        ><span class="billing lbl">reels</span>
      </div>
      <div class="tally-row dim">
        <span class="num">{{ hud.kills }}</span
        ><span class="billing lbl">extras down</span>
      </div>
    </div>

    <div class="bottom">
      <div class="stamina">
        <div class="billing lbl">
          Stamina <span class="num">{{ Math.ceil(hud.hp) }}/{{ hud.maxHp }}</span>
        </div>
        <div class="bar">
          <div
            class="bar-fill hp"
            :class="{ low: hpFrac < 0.3 }"
            :style="{ transform: `scaleX(${hpFrac})` }"
          ></div>
        </div>
      </div>

      <div class="strip">
        <div class="billing lbl">
          Rewrite <span class="num">{{ hud.level }}</span>
        </div>
        <div class="filmstrip">
          <div class="filmstrip-fill" :style="{ transform: `scaleX(${hud.progress})` }"></div>
        </div>
      </div>

      <div class="rigs">
        <div v-for="r in hud.rigs" :key="r.id" class="rig">
          <span class="billing">{{ r.name }}</span>
          <span class="pips"><i v-for="n in 5" :key="n" :class="{ on: n <= r.level }"></i></span>
        </div>
      </div>
    </div>

    <Transition name="slip">
      <div v-if="slip" :key="slip.key" class="slip" :class="{ fresh: slip.page.isNew }">
        <div class="slip-slug">REWRITE — {{ slip.page.slug }}</div>
        <div class="slip-head">{{ slip.page.heading.toUpperCase() }}</div>
        <div class="slip-cont">{{ slip.page.cont }}</div>
      </div>
    </Transition>

    <div v-if="hud.t < 12" class="hint billing">
      <template v-if="improvising">The star is improvising. Sit back and watch the take.</template>
      <template v-else
        >Move with WASD, arrows or a held pointer. Your rigs fire themselves.</template
      >
    </div>

    <RewriteModal v-if="take.view.screen === 'rewrite'" />
  </div>
</template>

<style scoped>
.take {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  user-select: none;
  touch-action: none;
}
.floor {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
}
.slate {
  position: absolute;
  top: var(--hud-pad);
  left: var(--hud-pad);
  width: 190px;
  background: var(--stage-black);
  border: 2px solid var(--chalk);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
}
.slate-body {
  padding: 8px 10px 9px;
}
.slate-row {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  color: var(--chalk-dim);
}
.slate-row b {
  color: var(--chalk);
  font-size: 20px;
  margin-left: 4px;
}
.slate-rating {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 12px;
  color: var(--greenlight);
}
.caller {
  color: var(--chalk-faint);
}
.caller.improvising {
  color: var(--tungsten);
}
.timecode {
  position: absolute;
  top: var(--hud-pad);
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  padding: 6px 14px 4px;
  background: rgba(17, 15, 13, 0.72);
  border-bottom: 2px solid var(--squib);
}
.tc {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--chalk);
}
.tc-sub {
  font-size: 11px;
  color: var(--chalk-dim);
}
.tally {
  position: absolute;
  top: var(--hud-pad);
  right: var(--hud-pad);
  text-align: right;
  background: rgba(17, 15, 13, 0.72);
  padding: 8px 12px;
}
.tally-row {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 6px;
}
.tally-row.dim {
  color: var(--chalk-dim);
}
.big {
  font-size: 28px;
  font-weight: 700;
  color: var(--reel-gold);
  min-width: 3.5ch;
}
.lbl {
  font-size: 11px;
  color: var(--chalk-dim);
}
.reel-icon {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--stage-black) 0 2px, var(--reel-gold) 2.5px);
  align-self: center;
}
.bottom {
  position: absolute;
  left: var(--hud-pad);
  right: var(--hud-pad);
  bottom: var(--hud-pad);
  display: grid;
  grid-template-columns: 220px 1fr 260px;
  gap: 20px;
  align-items: end;
}
.bar {
  height: 10px;
  background: var(--squib-dim);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  transform-origin: left;
  transition: transform 120ms linear;
}
.bar-fill.hp {
  background: var(--squib);
}
.bar-fill.hp.low {
  background: #ff6a4d;
}
.filmstrip {
  position: relative;
  height: 22px;
  background: var(--stage-black);
  border: 1px solid var(--gaffer-hi);
  overflow: hidden;
}
.filmstrip::before,
.filmstrip::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  z-index: 2;
  background: repeating-linear-gradient(90deg, var(--chalk-faint) 0 6px, transparent 6px 14px);
}
.filmstrip::before {
  top: 2px;
}
.filmstrip::after {
  bottom: 2px;
}
.filmstrip-fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--tungsten-dim), var(--tungsten));
  transform-origin: left;
  transition: transform 150ms linear;
}
.rigs {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}
.rig {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  background: rgba(17, 15, 13, 0.72);
  padding: 3px 8px;
}
.pips {
  display: flex;
  gap: 3px;
}
.pips i {
  width: 7px;
  height: 7px;
  background: var(--gaffer);
}
.pips i.on {
  background: var(--tungsten);
}
/* An improvised page: a script slip pinned under the timecode. */
.slip {
  position: absolute;
  top: 96px;
  left: 50%;
  width: 230px;
  margin-left: -115px;
  padding: 10px 14px 9px 16px;
  background: var(--script-paper);
  color: var(--script-ink);
  font-family: var(--font-script);
  font-size: 12px;
  line-height: 1.4;
  border-left: 3px solid var(--tungsten);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}
.slip.fresh {
  border-left-color: var(--greenlight);
}
.slip-slug {
  font-weight: 700;
}
.slip-head {
  margin-top: 6px;
  text-align: center;
  font-weight: 700;
  font-size: 14px;
}
.slip-cont {
  text-align: center;
}
.slip-enter-active,
.slip-leave-active {
  transition:
    opacity 180ms var(--ease-cut),
    transform 180ms var(--ease-cut);
}
.slip-enter-from {
  opacity: 0;
  transform: translateY(-10px) rotate(-1deg);
}
.slip-leave-to {
  opacity: 0;
}
.hint {
  position: absolute;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 13px;
  color: var(--chalk-dim);
  background: rgba(17, 15, 13, 0.72);
  padding: 6px 12px;
  white-space: nowrap;
}
</style>

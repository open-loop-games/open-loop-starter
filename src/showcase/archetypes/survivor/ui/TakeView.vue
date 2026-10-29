<!--
  TakeView — the floor and its HUD, on a StageShell: the pixi floor fills the stage and the
  HUD pieces are floats on its anchors. The floor draws itself every animation frame; the HUD
  reads the take's reactive mirror. Input is read only while the
  player calls the moves; an improvising star steers itself, and its pages are announced on
  a slip instead of the rewrite modal.
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, useTemplateRef } from 'vue';
import { ShellFloat, StageShell } from '@/lib';
import { formatClock } from '@/composables/useFormatting';
import { useWindowKeys } from '@/composables/useWindowKeys';
import { ANCHORS, GUESTS, LEADS, MARK_KILLS, SCRIPT, SET_PIECES } from '../data';
import { getTake } from '../modules';
import { pageOf } from './pages';
import FloorField from './FloorField.vue';
import RewriteModal from './RewriteModal.vue';

const take = getTake();
const field = useTemplateRef<InstanceType<typeof FloorField>>('field');
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
  const floor = field.value?.$el as HTMLElement | undefined;
  if (mx === 0 && my === 0 && pointer && floor) {
    // The camera holds the double at the floor's center, so the pointer steers from there.
    const r = floor.getBoundingClientRect();
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
  const k = e.key.toLowerCase();
  if (!MOVE_KEYS.includes(k)) return;
  e.preventDefault();
  if (down) keys.add(k);
  else keys.delete(k);
  syncInput();
}
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

useWindowKeys(onKey, { up: true, when: () => !improvising.value, onBlur: release });
onMounted(() => {
  window.addEventListener('pointerup', pointerUp);
});
onUnmounted(() => {
  window.removeEventListener('pointerup', pointerUp);
  release();
});

/** The floor's counts and draw time, for the game view's dev handle. */
defineExpose({ floorStats: () => field.value?.stats() });

// ─── HUD readouts ───
const pad = (n: number) => String(n).padStart(2, '0');
/** Timecode at 24 frames a second: HH:MM:SS:FF. */
const timecode = computed(() => {
  const t = hud.t;
  return `00:${pad(Math.floor(t / 60))}:${pad(Math.floor(t) % 60)}:${pad(Math.floor((t % 1) * 24))}`;
});
const STRIKE_AT = ANCHORS.takeSeconds + SCRIPT.strikeAfter * ANCHORS.sceneSeconds;
/** Seconds under which the strike call reads as a warning. */
const STRIKE_WARN = 20;
/** What the timecode counts toward: the lead's entrance, then the strike crew. */
const countdown = computed(() => {
  if (hud.t < ANCHORS.takeSeconds)
    return { label: 'lead on in', left: formatClock(ANCHORS.takeSeconds - hud.t), warn: false };
  if (hud.t < STRIKE_AT)
    return {
      label: 'strike in',
      left: formatClock(STRIKE_AT - hud.t),
      warn: STRIKE_AT - hud.t < STRIKE_WARN,
    };
  return { label: 'striking the set', left: '', warn: true };
});
const lead = computed(() => LEADS[take.view.rating.index]!);
const sceneLabel = computed(() => Math.floor(hud.scene) + 1);
const hpFrac = computed(() => (hud.maxHp > 0 ? hud.hp / hud.maxHp : 0));

/** Seconds of floor time a cue's call stays up. */
const CALL_SECONDS = 3.5;
const call = computed(() => {
  const what = hud.cue;
  if (!what || hud.t - hud.cueAt > CALL_SECONDS) return null;
  const def = what === 'rival' || what === 'mob' ? GUESTS[what] : SET_PIECES[what];
  return {
    key: hud.cueAt,
    kicker: what === 'rival' || what === 'mob' ? 'Guest' : 'Set piece',
    ...def,
  };
});
const markCut = Math.round(SCRIPT.markCut * 100);

/** Seconds of floor time the slip announcing an improvised page stays up. */
const SLIP_SECONDS = 2.5;
const slip = computed(() => {
  const last = take.view.lastPage;
  if (!last || hud.t - last.at > SLIP_SECONDS) return null;
  return { key: last.at, page: pageOf(last.card) };
});
</script>

<template>
  <StageShell class="take" @pointerdown="pointerDown" @pointermove="pointerMove">
    <FloorField ref="field" />
    <RewriteModal v-if="take.view.screen === 'rewrite'" />

    <template #floats>
      <ShellFloat anchor="top-left">
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
      </ShellFloat>
      <ShellFloat anchor="top">
        <div class="timecode">
          <div class="tc num">{{ timecode }}</div>
          <div class="tc-sub billing" :class="{ warn: countdown.warn }">
            {{ countdown.label }} <span class="num">{{ countdown.left }}</span>
          </div>
        </div>
      </ShellFloat>
      <ShellFloat anchor="top">
        <div class="cues">
          <Transition name="billing-card">
            <div v-if="hud.lead !== null" class="lead-card">
              <div class="lead-kicker billing">And introducing</div>
              <div class="lead-name billing">{{ lead.name }}</div>
              <ProgressBar class="bar lead-bar" :value="hud.lead" />
              <div class="lead-sub billing">Down the lead to call CUT</div>
            </div>
          </Transition>
          <Transition name="call">
            <div v-if="call" :key="call.key" class="call">
              <div class="clapper-stripe"></div>
              <div class="call-body">
                <span class="call-kicker billing">{{ call.kicker }}</span>
                <span class="call-name billing">{{ call.name }}</span>
                <span class="call-blurb">{{ call.blurb }}</span>
              </div>
            </div>
          </Transition>
          <Transition name="slip">
            <div v-if="slip" :key="slip.key" class="slip" :class="{ fresh: slip.page.isNew }">
              <div class="slip-slug">REWRITE — {{ slip.page.slug }}</div>
              <div class="slip-head">{{ slip.page.heading.toUpperCase() }}</div>
              <div class="slip-cont">{{ slip.page.cont }}</div>
            </div>
          </Transition>
        </div>
      </ShellFloat>
      <ShellFloat anchor="top-right">
        <div class="tally">
          <div class="tally-row">
            <span class="reel-icon"></span><span class="num big">{{ Math.floor(hud.reels) }}</span
            ><span class="billing lbl">reels</span>
          </div>
          <div class="tally-row dim">
            <span class="num">{{ hud.kills }}</span
            ><span class="billing lbl">extras down</span>
          </div>
          <div class="marks" :class="{ closed: hud.lead !== null }">
            <span
              v-for="(m, i) in hud.marks"
              :key="i"
              class="chalk-mark"
              :class="{ filled: m.filled }"
              :style="{ '--fill': m.kills / MARK_KILLS }"
              :title="`${m.kills}/${MARK_KILLS} down inside the mark`"
            ></span>
            <span class="billing lbl">marks · each cuts the lead {{ markCut }}%</span>
          </div>
        </div>
      </ShellFloat>
      <ShellFloat v-if="hud.rival !== null" anchor="top-right">
        <div class="guest">
          <div class="guest-row billing">
            <span>Guest star</span
            ><span class="num">walks in {{ formatClock(hud.rivalLeft) }}</span>
          </div>
          <ProgressBar class="bar guest-bar" :value="hud.rival" />
          <div class="guest-sub billing">Down them for a jackpot reel</div>
        </div>
      </ShellFloat>
      <ShellFloat v-if="hud.t < 12" anchor="bottom">
        <div class="hint billing">
          <template v-if="improvising"
            >The star is improvising. Sit back and watch the take.</template
          >
          <template v-else
            >Move with WASD, arrows or a held pointer. Your rigs fire themselves.</template
          >
        </div>
      </ShellFloat>
      <ShellFloat anchor="bottom-left">
        <div class="stamina">
          <div class="billing lbl">
            Stamina <span class="num">{{ Math.ceil(hud.hp) }}/{{ hud.maxHp }}</span>
          </div>
          <ProgressBar class="bar hp" :class="{ low: hpFrac < 0.3 }" :value="hpFrac" />
        </div>
      </ShellFloat>
      <ShellFloat class="strip-float" anchor="bottom">
        <div class="strip">
          <div class="billing lbl">
            Rewrite <span class="num">{{ hud.level }}</span>
          </div>
          <ProgressBar class="filmstrip" :value="hud.progress" />
        </div>
      </ShellFloat>
      <ShellFloat anchor="bottom-right">
        <div class="rigs">
          <div v-for="r in hud.rigs" :key="r.id" class="rig">
            <span class="billing">{{ r.name }}</span>
            <span class="pips"><i v-for="n in 5" :key="n" :class="{ on: n <= r.level }"></i></span>
          </div>
        </div>
      </ShellFloat>
    </template>
  </StageShell>
</template>

<style scoped>
.take {
  --shell-gap: var(--hud-pad);
  user-select: none;
  touch-action: none;
}
.slate {
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
/* The cue cards stack under the timecode, each centered on it. */
.cues {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.stamina {
  width: 220px;
}
/* The filmstrip runs the width of the bottom cell, not the width of its label. */
.take :deep(.strip-float) {
  align-self: stretch;
}
/* The HUD's bars are flat tape with square ends, and keep their own colors when full or empty. */
.bar,
.filmstrip {
  --progress-bar-fill-full: var(--progress-bar-fill);
  --progress-bar-track-empty: var(--progress-bar-track);
  --progress-bar-border: none;
  --progress-bar-shadow: none;
  --progress-bar-radius: 0;
}
.bar {
  --progress-bar-height: 10px;
  --progress-bar-track: var(--squib-dim);
  --progress-bar-transition: transform 120ms linear;
}
.bar.hp {
  --progress-bar-fill: var(--squib);
}
.bar.hp.low {
  --progress-bar-fill: #ff6a4d;
}
.filmstrip {
  --progress-bar-height: 22px;
  --progress-bar-track: var(--stage-black);
  --progress-bar-border: 1px solid var(--gaffer-hi);
  --progress-bar-fill: linear-gradient(90deg, var(--tungsten-dim), var(--tungsten));
  --progress-bar-transition: transform 150ms linear;
}
/* Sprocket holes, over the fill. */
.filmstrip :deep(.olui-progress-bar__track)::before,
.filmstrip :deep(.olui-progress-bar__track)::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  z-index: 2;
  background: repeating-linear-gradient(90deg, var(--chalk-faint) 0 6px, transparent 6px 14px);
}
.filmstrip :deep(.olui-progress-bar__track)::before {
  top: 2px;
}
.filmstrip :deep(.olui-progress-bar__track)::after {
  bottom: 2px;
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
.tc-sub.warn {
  color: var(--squib);
}
/* The lead's billing card: a title card under the timecode once it walks on. */
.lead-card {
  width: 340px;
  text-align: center;
  padding: 8px 14px 9px;
  background: rgba(17, 15, 13, 0.82);
  border-top: 2px solid var(--squib);
}
.lead-kicker,
.lead-sub {
  font-size: 11px;
  letter-spacing: 0.22em;
  color: var(--chalk-dim);
}
.lead-name {
  font-size: 26px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk);
  line-height: 1.1;
}
.lead-bar {
  --progress-bar-fill: var(--squib);
  margin: 6px 0 4px;
}
.billing-card-enter-active {
  transition:
    opacity 420ms var(--ease-cut),
    transform 420ms var(--ease-cut);
}
.billing-card-enter-from {
  opacity: 0;
  transform: scale(1.12);
}
/* A cue's call: the AD's board, a clapper strip over the set piece or guest's name. */
.call {
  width: 340px;
  background: var(--stage-black);
  border: 2px solid var(--chalk);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
  pointer-events: none;
}
.call-body {
  display: grid;
  justify-items: center;
  padding: 8px 14px 10px;
}
.call-kicker {
  font-size: 11px;
  letter-spacing: 0.22em;
  color: var(--tungsten);
  text-transform: uppercase;
}
.call-name {
  font-size: 26px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.call-blurb {
  font-size: 13px;
  color: var(--chalk-dim);
}
.call-enter-active,
.call-leave-active {
  transition:
    opacity 220ms var(--ease-cut),
    transform 220ms var(--ease-cut);
}
.call-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}
.call-leave-to {
  opacity: 0;
}
/* A rival on set: its bar and the seconds before it walks with the jackpot. */
.guest {
  width: 200px;
  padding: 7px 10px 8px;
  background: rgba(17, 15, 13, 0.82);
  border-left: 3px solid var(--reel-gold);
}
.guest-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--reel-gold);
}
.guest-bar {
  --progress-bar-height: 7px;
  --progress-bar-track: var(--tungsten-dim);
  --progress-bar-fill: var(--reel-gold);
  margin: 5px 0 3px;
}
.guest-sub {
  font-size: 11px;
  color: var(--chalk-dim);
}
/* The chalk marks: a ring each, filled in tungsten as kills land inside it. */
.marks {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 6px;
}
.marks.closed {
  opacity: 0.45;
}
.chalk-mark {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: conic-gradient(var(--tungsten) calc(var(--fill) * 360deg), var(--gaffer) 0);
  -webkit-mask: radial-gradient(circle, transparent 4px, #000 4.5px);
  mask: radial-gradient(circle, transparent 4px, #000 4.5px);
}
.chalk-mark.filled {
  background: var(--greenlight);
}
/* An improvised page: a script slip pinned under the timecode. */
.slip {
  width: 230px;
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
  font-size: 13px;
  color: var(--chalk-dim);
  background: rgba(17, 15, 13, 0.72);
  padding: 6px 12px;
  white-space: nowrap;
}
</style>

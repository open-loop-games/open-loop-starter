<!--
  SkirmishField — the play space: the sprawl drawn by `SkirmishScene` on a canvas, with
  DOM tags over it for what text says better than pixels: each place's name and counts,
  the safehouses' integrity, each convoy's arrival countdown. The tags' text is reactive;
  their position is written each animation frame, so a camera move re-renders no Vue.

  StarCraft/Warcraft controls. Left-click selects a squad or one of your convoys, a
  left-drag box-selects, shift adds or takes back. Right-click sends the selection to the
  place under the cursor by the shortest route; shift+right-click queues a waypoint, and
  letting go of shift sends it to the last one. Edge scroll and the arrow keys move the
  camera, the wheel zooms toward the cursor, Esc lets go. Keys are the window's, as in
  the genre, except while typing in a field. Every order here is also a
  button in the command card, which edits the same selection.

  The field owns its frame loop, keeps the scene outside Vue reactivity, reads the match
  through `readFrame` and writes only through `moveSelection`.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useWindowKeys } from '@/composables/useWindowKeys';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import { DISTRICTS } from '../../data/contracts';
import type { Place } from '../../data/map';
import { UNIT_KINDS } from '../../data/units';
import { getMatch } from '../../modules';
import { wholeUnits, type Counts } from '../../modules/battle';
import { clearSelection, moveSelection, select, type Selection } from '../command';
import { readFrame } from '../field/frame';
import { SkirmishScene } from '../field/skirmish-scene';
import { GLYPH, grouped } from '../format';

const props = defineProps<{ selection: Selection }>();

const match = getMatch();
const frame = computed(() => readFrame(match));
const host = ref<HTMLDivElement>();
const tags = new Map<string, HTMLElement>();
const box = ref<{ x: number; y: number; w: number; h: number } | null>(null);

let scene: SkirmishScene | null = null;
let raf = 0;
let last = performance.now();
let observer: ResizeObserver | undefined;
let unsubscribe: (() => void) | undefined;
let hover: Place | null = null;
let pointer: { x: number; y: number } | null = null;
let press: { x: number; y: number } | null = null;
const held = new Set<string>();

/** Pixels from the field's edge at which the camera scrolls. */
const EDGE = 16;
/** A press that travels further than this is a box drag, not a click. */
const DRAG = 6;
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const placeLabel = (place: Place) =>
  place === 'p'
    ? 'Your safehouse'
    : place === 'e'
      ? match.contract.value.rival
      : DISTRICTS[place]!.name;

/** A squad as glyph-and-count pairs, whole units only. */
function line(counts: Counts | undefined): string {
  if (!counts) return '';
  return UNIT_KINDS.filter((k) => wholeUnits(counts[k]) > 0)
    .map((k) => `${GLYPH[k]}${wholeUnits(counts[k])}`)
    .join(' ');
}

function setTag(key: string, el: unknown): void {
  if (el instanceof HTMLElement) tags.set(key, el);
  else tags.delete(key);
}

function placeTags(): void {
  if (!scene) return;
  for (const [key, el] of tags) {
    const at =
      key[0] === 'c'
        ? scene.screenOfConvoy(key[1] as 'p' | 'e', Number(key.slice(2)))
        : scene.tagAnchor(key === 'p' || key === 'e' ? key : Number(key));
    el.style.visibility = at ? '' : 'hidden';
    if (at) el.style.transform = `translate(${Math.round(at.x)}px, ${Math.round(at.y)}px)`;
  }
}

function frameLoop(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (scene) {
    let dx = 0;
    let dy = 0;
    for (const k of held) {
      dx += ARROWS[k]![0];
      dy += ARROWS[k]![1];
    }
    const el = host.value;
    if (pointer && el && !press) {
      if (pointer.x < EDGE) dx -= 1;
      if (pointer.x > el.clientWidth - EDGE) dx += 1;
      if (pointer.y < EDGE) dy -= 1;
      if (pointer.y > el.clientHeight - EDGE) dy += 1;
    }
    if (dx || dy) scene.pan(Math.sign(dx), Math.sign(dy), dt);
    scene.render(
      frame.value,
      { picks: props.selection.picks, via: props.selection.via, hover },
      dt,
    );
    placeTags();
  }
  raf = requestAnimationFrame(frameLoop);
}

const local = (e: PointerEvent | MouseEvent | WheelEvent) => {
  const r = host.value!.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};
const live = () => match.phase.value === 'live';

function onDown(e: PointerEvent): void {
  if (e.button !== 0) return;
  press = local(e);
  // Synthetic pointers have no capturable id.
  try {
    host.value?.setPointerCapture(e.pointerId);
  } catch {
    /* uncaptured: the drag ends at the field's edge */
  }
}

function onMove(e: PointerEvent): void {
  pointer = local(e);
  hover = scene?.placeAt(pointer.x, pointer.y) ?? null;
  if (!press) return;
  const dx = pointer.x - press.x;
  const dy = pointer.y - press.y;
  if (box.value || Math.hypot(dx, dy) > DRAG)
    box.value = {
      x: Math.min(press.x, pointer.x),
      y: Math.min(press.y, pointer.y),
      w: Math.abs(dx),
      h: Math.abs(dy),
    };
}

function onUp(e: PointerEvent): void {
  if (e.button !== 0 || !press || !scene) return;
  const mode = e.shiftKey ? 'toggle' : 'replace';
  if (box.value) {
    const b = box.value;
    select(props.selection, scene.picksIn(b.x, b.y, b.x + b.w, b.y + b.h), mode);
  } else {
    const at = local(e);
    const pick = scene.pick(at.x, at.y);
    if (pick) select(props.selection, [pick], mode);
    else if (!e.shiftKey) clearSelection(props.selection);
  }
  press = null;
  box.value = null;
}

function onLeave(): void {
  pointer = null;
  hover = null;
}

function onOrder(e: MouseEvent): void {
  e.preventDefault();
  const at = local(e);
  const place = scene?.placeAt(at.x, at.y);
  if (place === null || place === undefined || !live()) return;
  if (e.shiftKey && typeof place === 'number') props.selection.via.push(place);
  else moveSelection(match.p, props.selection, place);
}

function onWheel(e: WheelEvent): void {
  e.preventDefault();
  const at = local(e);
  scene?.zoomAt(at.x, at.y, e.deltaY);
}

function onKey(e: KeyboardEvent, down: boolean): void {
  if (e.key in ARROWS) {
    if (down) held.add(e.key);
    else held.delete(e.key);
    e.preventDefault();
  } else if (down && e.key === 'Escape') clearSelection(props.selection);
  // Letting go of shift sends the queued waypoints: the last one is where they go.
  else if (!down && e.key === 'Shift' && props.selection.via.length) {
    const via = [...props.selection.via];
    const to = via.pop()!;
    if (live()) moveSelection(match.p, props.selection, to, via);
    else props.selection.via.splice(0);
  }
}
useWindowKeys(onKey, { up: true, onBlur: () => held.clear() });

/** A place's and a convoy's spot on the page, for browser probes. */
defineExpose({
  pageOf(place: Place) {
    const r = host.value?.getBoundingClientRect();
    const q = scene?.screenOf(place);
    return r && q ? { x: r.left + q.x, y: r.top + q.y } : null;
  },
  pageOfConvoy(side: 'p' | 'e', id: number) {
    const r = host.value?.getBoundingClientRect();
    const q = scene?.screenOfConvoy(side, id);
    return r && q ? { x: r.left + q.x, y: r.top + q.y } : null;
  },
});

onMounted(() => {
  scene = new SkirmishScene(host.value!);
  observer = new ResizeObserver(() => scene?.resize());
  observer.observe(host.value!);
  unsubscribe = match.onReset('afterReset', () => scene?.snap());
  raf = requestAnimationFrame(frameLoop);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  observer?.disconnect();
  unsubscribe?.();
  scene?.dispose();
  scene = null;
});
</script>

<template>
  <section
    ref="host"
    class="field"
    aria-label="The sprawl"
    :data-scouting="frame.scouting"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointerleave="onLeave"
    @contextmenu="onOrder"
    @wheel="onWheel"
  >
    <div class="field__tags" aria-hidden="true">
      <div
        v-for="v in frame.places"
        :key="String(v.place)"
        :ref="(el) => setTag(String(v.place), el)"
        class="tag"
        :data-place="typeof v.place === 'number' ? 'district' : v.place"
        :data-owner="v.owner"
      >
        <span class="tag__name">{{ placeLabel(v.place) }}</span>
        <template v-if="v.place === 'p' || v.place === 'e'">
          <span class="tag__hp num">{{ grouped(frame.integrity[v.place]) }}</span>
          <ProgressBar
            class="cc-gauge tag__integrity"
            :value="frame.integrity[v.place]"
            :max="frame.integrity.max"
            :from="v.place === 'e' ? 'right' : undefined"
          />
        </template>
        <span class="tag__counts">
          <span v-if="line(v.mine)" class="tag__mine num">{{ line(v.mine) }}</span>
          <span v-if="line(v.theirs)" class="tag__theirs num">{{ line(v.theirs) }}</span>
          <span v-else-if="!v.theirs && line(v.sighting?.counts)" class="tag__theirs num" data-dim
            >{{ line(v.sighting?.counts) }}?</span
          >
        </span>
      </div>
      <div
        v-for="c in frame.convoys"
        :key="`c${c.side}${c.id}`"
        :ref="(el) => setTag(`c${c.side}${c.id}`, el)"
        class="tag tag--convoy"
        :data-side="c.side"
      >
        <span v-if="c.side === 'p'" class="tag__eta num">{{ Math.ceil(c.eta) }}s</span>
        <span v-else class="tag__theirs num">{{ line(c.counts) }}</span>
      </div>
    </div>
    <div
      v-if="box"
      class="field__box"
      :style="{ left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` }"
    />
  </section>
</template>

<style scoped>
.field {
  position: relative;
  overflow: hidden;
  min-height: 0;
  border: 1px solid var(--cc-gutter);
  border-radius: var(--cc-notch);
  background: var(--cc-asphalt);
  cursor: default;
  touch-action: none;
}
.field :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
/* Astral sight: the field takes the ley's tint while the scout rides. */
.field::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow:
    inset 0 0 0 1px var(--cc-ley),
    inset 0 0 80px var(--cc-ley-glow);
  opacity: 0;
  transition: opacity 0.6s;
}
.field[data-scouting='true']::after {
  opacity: 1;
}
.field__tags {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
/* A tag's anchor is its pad's front edge; the tag hangs centred on it. */
.tag {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  translate: -50% -40%;
  padding: 3px 7px 4px;
  min-width: 64px;
  background: color-mix(in srgb, var(--cc-asphalt) 78%, transparent);
  border: 1px solid var(--cc-gutter);
  border-radius: var(--cc-notch);
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
  will-change: transform;
}
.tag[data-owner='p'] {
  border-top-color: var(--cc-sodium);
}
.tag[data-owner='e'] {
  border-top-color: var(--cc-rival);
}
.tag__name {
  font-family: var(--cc-face-sign);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cc-chalk);
}
.tag__hp {
  font-family: var(--cc-face-neon);
  font-size: 20px;
  line-height: 0.8;
  color: var(--cc-sodium);
}
.tag[data-place='e'] .tag__hp {
  color: var(--cc-rival);
}
.tag__integrity.cc-gauge {
  --progress-bar-height: 4px;
  --progress-bar-radius: 2px;
  --progress-bar-transition: transform 0.3s linear;
  width: 88px;
}
.tag[data-place='e'] .tag__integrity {
  --progress-bar-fill: var(--cc-rival);
}
.tag__counts {
  display: flex;
  gap: 8px;
  font-variant-numeric: tabular-nums;
}
.tag__mine {
  color: var(--cc-sodium);
}
.tag__theirs {
  color: var(--cc-rival);
}
.tag__theirs[data-dim] {
  opacity: 0.55;
}
.tag--convoy {
  min-width: 0;
  margin-top: -30px;
  padding: 1px 5px;
}
.tag__eta {
  display: inline-block;
  min-width: 3.5ch;
  text-align: center;
  color: var(--cc-chalk);
}
.field__box {
  position: absolute;
  pointer-events: none;
  border: 1px solid var(--cc-sodium);
  background: var(--cc-sodium-glow);
}
</style>

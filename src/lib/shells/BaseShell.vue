<!--
  BaseShell — the page layout every shell is built from: optional regions around
  main, and floats anchored over it. It holds all the layout CSS; ColumnShell and
  StageShell only set defaults over it.

  The regions come from a survey of the layouts games built on this stack chose for
  themselves: a status bar over the columns in most; one rail, more often right than
  left; a full-viewport stage with a HUD floating over it; regions that scroll on
  their own inside a fixed viewport. Tabs are not a region: they are a component
  placed in one.

  Regions. Filling a slot turns its region on:
    - #topBar and #bottomBar span the full width;
    - #sideBarLeft and #sideBarRight sit beside main, between the bars;
    - the default slot is main;
    - #floats holds ShellFloat components, on a 3×3 anchor grid over main.

  The shell is layout only. It draws no background, border or padding of a panel;
  content that wants a panel draws its own.

  Viewport. `page` lets the page scroll. `fixed` fits the shell to its frame, and
  each region scrolls on its own; AppFrame takes a fixed height when it holds a
  fixed shell. Stage mode and a filled #floats force `fixed`: a stage has no
  content height, and a bottom anchor must sit at the screen's foot, not the
  content's.

  Floats sit at z-index 1 over main. An overlay over the stage that must cover
  them, such as a level-up draft or a match-end curtain, takes a higher z-index.

  Gap: `--shell-gap`, set on the shell or any ancestor; it falls back to `--gap`.

  Costume classes (stable API): olui-shell, olui-shell__top-bar,
  olui-shell__bottom-bar, olui-shell__side-bar-left, olui-shell__side-bar-right,
  olui-shell__main, olui-shell__main-content (the element that scrolls or clips
  main), olui-shell-float. Attributes on olui-shell: data-main, data-viewport.
  Every shell rule is one class deep, so a costume rule scoped to the game wins.
-->
<script setup lang="ts">
import { provide, useId, useSlots } from 'vue';
import {
  BASE_SHELL_DEFAULTS,
  SHELL_ANCHORS,
  shellFloatTargetKey,
  type BaseShellProps,
  type ShellAnchor,
} from './shell-props';

const props = withDefaults(defineProps<BaseShellProps>(), BASE_SHELL_DEFAULTS);
const slots = useSlots();

// Slots are not reactive, so these run on every render rather than as cached computeds.
const viewportMode = () => (props.main === 'stage' || slots.floats ? 'fixed' : props.viewport);

const columns = () =>
  [
    slots.sideBarLeft && props.sideBarLeftWidth,
    `minmax(${props.mainMinWidth}, 1fr)`,
    slots.sideBarRight && props.sideBarRightWidth,
  ]
    .filter(Boolean)
    .join(' ');

const id = useId();
const cell = (anchor: ShellAnchor) => `${id}-${anchor}`;
provide(shellFloatTargetKey, (anchor) => `[data-shell-cell="${cell(anchor)}"]`);
</script>

<template>
  <div
    class="olui-shell"
    :data-main="main"
    :data-viewport="viewportMode()"
    :data-capped="maxWidth ? '' : undefined"
    :data-bleed-bars="bleedBars ? '' : undefined"
    :data-stage-bleed="stageBleed ? '' : undefined"
    :data-top-bar="$slots.topBar ? '' : undefined"
    :data-bottom-bar="$slots.bottomBar ? '' : undefined"
    :style="{ '--_shell-columns': columns(), '--_shell-max-width': maxWidth }"
  >
    <div v-if="$slots.topBar" class="olui-shell__top-bar">
      <div class="olui-shell__bar-content"><slot name="topBar" /></div>
    </div>
    <div class="olui-shell__body">
      <aside v-if="$slots.sideBarLeft" class="olui-shell__side-bar-left">
        <slot name="sideBarLeft" />
      </aside>
      <section class="olui-shell__main">
        <div class="olui-shell__main-content"><slot /></div>
        <div v-if="$slots.floats" class="olui-shell__floats">
          <div
            v-for="anchor in SHELL_ANCHORS"
            :key="anchor"
            class="olui-shell__anchor"
            :data-anchor="anchor"
            :data-shell-cell="cell(anchor)"
          />
          <slot name="floats" />
        </div>
      </section>
      <aside v-if="$slots.sideBarRight" class="olui-shell__side-bar-right">
        <slot name="sideBarRight" />
      </aside>
    </div>
    <div v-if="$slots.bottomBar" class="olui-shell__bottom-bar">
      <div class="olui-shell__bar-content"><slot name="bottomBar" /></div>
    </div>
  </div>
</template>

<style>
/* Each rule is one class deep: state selectors on the root sit in :where(). */
.olui-shell {
  --_shell-gap: var(--shell-gap, var(--gap));
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: var(--_shell-gap);
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
}
.olui-shell:where([data-viewport='fixed']) {
  height: 100%;
  min-height: 0;
}
/* maxWidth caps the content; the gutters sit outside the cap. */
.olui-shell:where([data-capped]:not([data-bleed-bars])) {
  max-width: calc(var(--_shell-max-width) + 2 * var(--_shell-gap));
  margin-inline: auto;
}

.olui-shell__top-bar,
.olui-shell__bottom-bar {
  flex: none;
  padding-inline: var(--_shell-gap);
}
.olui-shell__top-bar {
  padding-top: var(--_shell-gap);
}
.olui-shell__bottom-bar {
  padding-bottom: var(--_shell-gap);
}
.olui-shell__bar-content {
  display: flex;
  flex-direction: column;
  gap: var(--_shell-gap);
}

.olui-shell__body {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: var(--_shell-columns);
  gap: var(--_shell-gap);
  box-sizing: border-box;
  width: 100%;
  min-height: 0;
  padding-inline: var(--_shell-gap);
}
:where(.olui-shell:not([data-top-bar])) .olui-shell__body {
  padding-top: var(--_shell-gap);
}
:where(.olui-shell:not([data-bottom-bar])) .olui-shell__body {
  padding-bottom: var(--_shell-gap);
}
:where(.olui-shell[data-capped]) .olui-shell__body {
  max-width: calc(var(--_shell-max-width) + 2 * var(--_shell-gap));
  margin-inline: auto;
}
:where(.olui-shell[data-capped]) .olui-shell__bar-content {
  max-width: var(--_shell-max-width);
  margin-inline: auto;
}
:where(.olui-shell[data-viewport='fixed']) .olui-shell__body {
  grid-template-rows: minmax(0, 1fr);
}
:where(.olui-shell[data-main='stage'][data-stage-bleed]) .olui-shell__body {
  padding: 0;
  gap: 0;
}

.olui-shell__side-bar-left,
.olui-shell__side-bar-right {
  display: flex;
  flex-direction: column;
  gap: var(--_shell-gap);
  min-width: 0;
  min-height: 0;
}
.olui-shell__main {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.olui-shell__main-content {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: var(--_shell-gap);
  min-height: 0;
}
:where(.olui-shell[data-viewport='fixed']) .olui-shell__side-bar-left,
:where(.olui-shell[data-viewport='fixed']) .olui-shell__side-bar-right,
:where(.olui-shell[data-viewport='fixed']) .olui-shell__main-content {
  overflow: auto;
}
/* A stage is a plane to position things on: it clips, and anchors its content. */
:where(.olui-shell[data-main='stage']) .olui-shell__main-content {
  position: relative;
  overflow: hidden;
}

/* Floats: a 3×3 anchor grid over main. Clicks pass through the layer, not the floats. */
.olui-shell__floats {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  grid-template: repeat(3, minmax(0, 1fr)) / repeat(3, minmax(0, 1fr));
  padding: var(--_shell-gap);
  pointer-events: none;
}
.olui-shell__anchor {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--gap-sm);
  min-width: 0;
  min-height: 0;
}
.olui-shell__anchor:where([data-anchor^='top']) {
  justify-content: flex-start;
}
.olui-shell__anchor:where([data-anchor^='bottom']) {
  justify-content: flex-end;
}
.olui-shell__anchor:where([data-anchor$='left']) {
  align-items: flex-start;
}
.olui-shell__anchor:where([data-anchor$='right']) {
  align-items: flex-end;
}
.olui-shell__anchor > * {
  pointer-events: auto;
}
</style>

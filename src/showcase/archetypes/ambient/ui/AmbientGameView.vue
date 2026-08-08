<!--
  AmbientGameView — the in-game subtree (the almanac). Mounts under the root's
  post-start `v-else`, so module reads (`getUnlocks`, the panels' getters, the
  autobuyer button's `useAutobuyers`) are safe here. The root stays routing +
  chrome only and owns the modal stack (its resume/welcome-back seam pushes into
  it); it's shared via `modalStackKey` for `AppFrame` + the almanac action. See
  `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { computed, inject } from 'vue';
import { AppFrame, SingleColumnShell, modalStackKey } from '@/lib';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import Button from '@/ui/components/Button.vue';
import { getUnlocks } from '../modules';
import IdleScenePanel from './panels/IdleScenePanel.vue';
import AutoProducerList from './panels/AutoProducerList.vue';
import UnlockTray from './panels/UnlockTray.vue';
import AchievementGridDialog from './components/AchievementGridDialog.vue';
import AutobuyerToggles from './components/AutobuyerToggles.vue';
import AutobuyerMasterButton from './components/AutobuyerMasterButton.vue';

const emit = defineEmits<{ return: [] }>();

const stack = inject(modalStackKey)!;
function openAchievements(): void {
  const id = stack.push(AchievementGridDialog, { onClose: () => stack.remove(id) });
}

// Almanac (achievement-grid) is gated by the `garden-almanac` UI-affordance
// unlock. Read directly — this view mounts post-start, so the unlocks category
// is populated by the time the getter runs.
const almanacUnlocked = computed(
  () => getUnlocks().getPurchasable('garden-almanac')?.active.value === true,
);
</script>

<template>
  <AppFrame :stack="stack" :tooltip-delay="400">
    <template #header>
      <SystemHeader @return-to-slots="emit('return')">
        <template #title>
          <Button
            class="almanac-title"
            data-testid="return-to-slots"
            title="Save and return to save picker"
            @click="emit('return')"
          >
            <span class="almanac-title__eyebrow">An Almanac of</span>
            <span class="almanac-title__name">Cozy Farm</span>
            <span class="almanac-title__sub"
              >vol. i &middot; printed at home, kept by the sill</span
            >
          </Button>
        </template>
        <template #about>
          <div class="almanac-info">
            <h4 class="almanac-info__title">A Quiet Garden</h4>
            <p>
              The garden grows on its own. Open it once in the morning, glance at it while a pot
              boils. Nothing expires. Nothing is about to be overrun. Sprouts pile up whether you
              are watching or not.
            </p>
          </div>
        </template>
        <template #extra-actions>
          <AutobuyerMasterButton />
          <Button
            v-if="almanacUnlocked"
            class="btn-sm"
            data-testid="open-achievements"
            @click="openAchievements"
          >
            Almanac
          </Button>
        </template>
      </SystemHeader>
    </template>
    <SingleColumnShell max-width="720px">
      <IdleScenePanel />
      <AutoProducerList />
      <AutobuyerToggles />
      <UnlockTray />
    </SingleColumnShell>
  </AppFrame>
</template>

<style scoped>
/*
 * Almanac title — passed via SystemHeader's #title slot. Outer header
 * skin lives in ambient-theme.css, since .olui-system-header is rendered
 * by SystemHeader and not reachable from this component's scoped CSS.
 */
.almanac-title {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: var(--font-display, Georgia, serif);
  color: var(--almanac-evergreen, #1f3322);
  text-align: left;
  position: relative;
  transition: color 140ms ease-out;
}

.almanac-title:hover {
  color: var(--almanac-evergreen-soft, #2d4a32);
  background: none;
}

.almanac-title__eyebrow {
  font-family: var(--font-body, Georgia, serif);
  font-style: italic;
  font-size: 0.76em;
  letter-spacing: 0.12em;
  color: var(--almanac-moss, #4f6049);
  margin-bottom: 2px;
}

.almanac-title__name {
  font-family: var(--font-display, Georgia, serif);
  font-weight: 500;
  font-style: italic;
  font-size: 2em;
  letter-spacing: 0.02em;
  line-height: 1;
  color: var(--almanac-evergreen, #1f3322);
}

.almanac-title__sub {
  font-family: var(--font-body, Georgia, serif);
  font-style: italic;
  font-size: 0.74em;
  letter-spacing: 0.04em;
  margin-top: 6px;
  color: var(--almanac-pencil, #6b6553);
}

/* ─── About popover content ──────────────────────────────────────────── */
.almanac-info {
  font-family: var(--font-body, Georgia, serif);
  max-width: 280px;
  color: var(--almanac-evergreen, #1f3322);
  line-height: 1.55;
  font-size: 0.92em;
}

.almanac-info__title {
  font-family: var(--font-display, Georgia, serif);
  font-weight: 500;
  font-style: italic;
  font-size: 1.3em;
  letter-spacing: 0.02em;
  color: var(--almanac-evergreen, #1f3322);
  margin: 0 0 8px;
  border-bottom: 1px solid var(--almanac-rule-soft, rgba(168, 158, 139, 0.32));
  padding-bottom: 6px;
}

.almanac-info p {
  margin: 0;
}
</style>

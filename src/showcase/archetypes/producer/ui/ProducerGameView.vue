<!--
  ProducerGameView — the in-game subtree (the bakery). Mounts under the root's
  post-start `v-else`, so module reads (the autobuyer buttons' `useAutobuyers`,
  the panels' getters) are all safe here. The root stays routing + chrome only;
  see `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { AppFrame, ThreePanelShell, useModalStack } from '@/lib';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import Button from '@/ui/components/Button.vue';
import HeadlinePanel from './panels/HeadlinePanel.vue';
import ProducerPanel from './panels/ProducerPanel.vue';
import UpgradeTray from './panels/UpgradeTray.vue';
import AchievementGridDialog from './components/AchievementGridDialog.vue';
import AutobuyerToggles from './components/AutobuyerToggles.vue';
import AutobuyerMasterButton from './components/AutobuyerMasterButton.vue';

const emit = defineEmits<{ return: [] }>();

const stack = useModalStack();
function openAchievements(): void {
  const id = stack.push(AchievementGridDialog, { onClose: () => stack.remove(id) });
}
</script>

<template>
  <AppFrame
    :stack="stack"
    :tooltip-delay="400"
  >
    <template #header>
      <SystemHeader @return-to-slots="emit('return')">
        <template #title>
          <Button
            class="bakery-shopfront"
            data-testid="return-to-slots"
            title="Save and return to save picker"
            @click="emit('return')"
          >
            <span class="bakery-shopfront__rule" />
            <span class="bakery-shopfront__name">Bakery</span>
            <span class="bakery-shopfront__sub">est. just now &middot; flour, sugar, ambition</span>
          </Button>
        </template>
        <template #about>
          <div class="bakery-info">
            <h4 class="bakery-info__title">
              The House Specialty
            </h4>
            <p>
              Click the dough to bake. Hire bakers, then assemble the kitchen that bakes itself.
              Every upgrade and milestone compounds onto the next — that&rsquo;s the loop, served
              warm.
            </p>
          </div>
        </template>
        <template #extra-actions>
          <AutobuyerMasterButton />
          <Button
            class="btn-sm"
            @click="openAchievements"
          >
            Achievements
          </Button>
        </template>
      </SystemHeader>
    </template>
    <ThreePanelShell>
      <template #left>
        <ProducerPanel />
      </template>
      <HeadlinePanel />
      <template #right>
        <AutobuyerToggles />
        <UpgradeTray />
      </template>
    </ThreePanelShell>
  </AppFrame>
</template>

<style scoped>
/*
 * Bakery shopfront title — passed via SystemHeader's #title slot.
 * Styles target slotted content; outer header skin lives in
 * producer-theme.css, since the .olui-system-header element is rendered
 * by SystemHeader and not reachable from this component's scoped CSS.
 */
.bakery-shopfront {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: var(--font-display, Georgia, serif);
  color: var(--bakery-cocoa, #2d1d10);
  text-align: left;
  position: relative;
  transition: color 140ms ease-out;
}

.bakery-shopfront:hover {
  color: var(--bakery-mahogany, #5a2f10);
  background: none;
}

.bakery-shopfront__rule {
  display: block;
  width: 56px;
  height: 1px;
  background: var(--bakery-brass, #b1782a);
  margin-bottom: 4px;
  opacity: 0.7;
}

.bakery-shopfront__name {
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 96,
    'SOFT' 100,
    'wght' 800;
  font-weight: 800;
  font-size: 1.85em;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--bakery-mahogany, #5a2f10);
}

.bakery-shopfront__sub {
  font-family: var(--font-body, Georgia, serif);
  font-style: italic;
  font-size: 0.78em;
  letter-spacing: 0.04em;
  margin-top: 4px;
  color: var(--bakery-cocoa-mute, #7a5d3d);
}

/* ─── About popover content ──────────────────────────────────────────── */
.bakery-info {
  font-family: var(--font-body, Georgia, serif);
  max-width: 280px;
  color: var(--bakery-cocoa, #2d1d10);
  line-height: 1.55;
  font-size: 0.92em;
}

.bakery-info__title {
  font-family: var(--font-display, Georgia, serif);
  font-variation-settings:
    'opsz' 24,
    'SOFT' 100,
    'wght' 700;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.78em;
  color: var(--bakery-brass, #b1782a);
  margin: 0 0 8px;
  border-bottom: 1px solid var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.18));
  padding-bottom: 6px;
}

.bakery-info p {
  margin: 0;
}
</style>

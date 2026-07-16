<!--
  CyclerGameView — the in-game subtree. Mounts under the root's post-start
  `v-else` frame, so every module read below (the gauge, the panels) is
  structurally safe. The root (`CyclerAppRoot.vue`) stays routing-only; see
  `.claude/rules/app-root-discipline.md`.

  Layout: SidebarMainShell (the majority shell for this sub-genre). The
  containment vessel — the signature — owns the main column; the between-runs
  decisions (merge, permanents, burn tier) stack in the sidebar. The `.cycler`
  root declares the game's identity tokens (a containment/thermal palette,
  fiction-sourced) that the panels inherit.
-->
<script setup lang="ts">
import { SidebarMainShell } from '@/lib';
import ContainmentGauge from './panels/ContainmentGauge.vue';
import MergePanel from './panels/MergePanel.vue';
import CatalogPanel from './panels/CatalogPanel.vue';
import BurnTierPanel from './panels/BurnTierPanel.vue';
</script>

<template>
  <div class="cycler">
    <SidebarMainShell
      sidebar-width="280px"
      collapsible
    >
      <template #sidebar>
        <MergePanel />
        <CatalogPanel />
        <BurnTierPanel />
      </template>
      <ContainmentGauge />
    </SidebarMainShell>
  </div>
</template>

<style>
/* Cycler identity tokens — a containment/thermal palette sourced from the
   fiction (a vessel holding against a rising burn until breach): steel structure,
   a fill that heats calm→amber→breach across the beats, crystalline Fragments
   harvested from the crossing. Dark-mode-first; light overrides below. Set on the
   game root so every panel inherits them. */
.cycler {
  --cyc-steel: #5fb8d6;
  --cyc-calm: #4a72c8;
  --cyc-hold: #3fa89a;
  --cyc-warm: #e0a838;
  --cyc-hot: #e8743a;
  --cyc-breach: #e0503a;
  --cyc-fragment: #b98cf0;
  --cyc-vessel-bg: #10131f;

  flex: 1 1 auto;
  display: flex;
  min-height: 0;
}

:root[data-theme='light'] .cycler,
.cycler:is(.theme-light *) {
  --cyc-vessel-bg: #eef1f6;
}
@media (prefers-color-scheme: light) {
  :root:not([data-theme='dark']) .cycler {
    --cyc-steel: #2f7f9c;
    --cyc-fragment: #7a4fd0;
    --cyc-vessel-bg: #eef1f6;
  }
}
</style>

<script setup lang="ts">
import PanelLayout from '@/ui/components/PanelLayout.vue';
import { useAutomationPanel } from '../composables/useAutomationPanel';
import AutomationRow from '../components/AutomationRow.vue';

const { automation, sections } = useAutomationPanel();
</script>

<template>
  <PanelLayout
    :closable="false"
    class="auto-panel"
  >
    <template #header>
      <h3 class="olui-panel__title">
        Automation
      </h3>
      <span
        class="auto-panel__tier"
        data-testid="automation-tier"
      >{{
        automation.currentTierName.value
      }}</span>
    </template>

    <p class="auto-panel__intro">
      Each item runs when its inputs are buffered past its <em>trigger</em>, up to its <em>max</em>.
      Sections unlock as you master each mechanic by hand.
    </p>

    <section
      v-for="section in sections"
      :key="section.key"
      class="auto-section"
    >
      <h4 class="auto-section__title">
        {{ section.title }}
      </h4>
      <ul
        v-if="section.unlocked.value"
        class="auto-section__list"
      >
        <AutomationRow
          v-for="row in section.rows"
          :key="row.id"
          :row="row"
        />
      </ul>
      <p
        v-else
        class="auto-section__locked"
        :data-testid="`auto-locked-${section.key}`"
      >
        Locked — unlocks with the <strong>{{ section.title }}</strong> tier.
      </p>
    </section>
  </PanelLayout>
</template>

<style scoped>
.auto-panel :deep(.olui-panel__body) {
  display: flex;
  flex-direction: column;
  gap: var(--gap-lg);
}
.auto-panel__tier {
  margin-left: auto;
  font-size: 0.85em;
  color: var(--color-accent, var(--color-text-muted));
  font-variant-numeric: tabular-nums;
}
.auto-panel__intro {
  font-size: 0.82em;
  color: var(--color-text-muted);
  margin: 0;
  line-height: 1.4;
}
.auto-panel__intro em {
  font-style: normal;
  color: var(--color-text);
}
.auto-section {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
}
.auto-section__title {
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin: 0 0 2px;
}
.auto-section__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.auto-section__locked {
  font-size: 0.82em;
  font-style: italic;
  color: var(--color-text-muted);
  margin: 0;
  padding: var(--gap-xs) 2px;
}
</style>

<!--
  SkirmishGameView — skirmish's game-view boundary: the app frame + header
  wrapping the battlefield. Mounts under the root's post-start `v-else`, so the
  battlefield's match/tactical injection resolves below it. See
  `.claude/rules/app-root-discipline.md`.
-->
<script setup lang="ts">
import { AppFrame, SingleColumnShell, useModalStack } from '@/lib';
import SystemHeader from '@/ui/components/SystemHeader.vue';
import { manifest } from '../manifest';
import BattlefieldScreen from './BattlefieldScreen.vue';

const emit = defineEmits<{ return: [] }>();

const stack = useModalStack();
</script>

<template>
  <AppFrame
    :stack="stack"
    :tooltip-delay="400"
  >
    <template #header>
      <SystemHeader
        :app-name="manifest.name"
        @return-to-slots="emit('return')"
      >
        <template #about>
          <h4 style="margin-bottom: 6px">
            {{ manifest.name }}
          </h4>
          <p>
            Continuous tactical RTS — bot vs bot of built-in AI on a pixi/webgl field. Both sides
            are played by the shipping AI; player control is a stretch goal.
          </p>
        </template>
      </SystemHeader>
    </template>
    <SingleColumnShell>
      <BattlefieldScreen />
    </SingleColumnShell>
  </AppFrame>
</template>

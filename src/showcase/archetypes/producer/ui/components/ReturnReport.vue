<!--
  ReturnReport — what the swarm did while the player was away.

  Drawn as a dimension line in the costume's grammar: the replayed span is
  solid (built), and any time past the offline window continues dashed in
  redline (proposed, never built). A return longer than the window reads as a
  drawing of what was and was not recorded, not as a lost-progress warning.

  Rendered inside the portaled modal stack, so its rules live in the
  deliberately unscoped section of `../blueprint.css`.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { DialogTitle } from 'reka-ui';
import { useFormatting } from '@/composables/useFormatting';
import type { OfflineReturn } from '../../modules';

const props = defineProps<{
  report: OfflineReturn;
  /** The offline window the replay was clamped to, in seconds. */
  windowSeconds: number;
  onClose: () => void;
}>();

const { format, formatTime } = useFormatting();

const unrecordedSeconds = computed(() =>
  Math.max(0, props.report.awaySeconds - props.report.caughtUpSeconds),
);
/** Share of the dimension line the replayed span takes. */
const recordedShare = computed(() =>
  props.report.awaySeconds > 0 ? props.report.caughtUpSeconds / props.report.awaySeconds : 1,
);
</script>

<template>
  <section class="producer-portal return-report">
    <DialogTitle as-child>
      <h2 class="return-report__title">Telemetry received</h2>
    </DialogTitle>
    <p class="return-report__lede">The swarm kept converting while you were away.</p>

    <figure class="return-report__span" :style="{ '--recorded': recordedShare }">
      <div class="return-report__line">
        <span class="return-report__built" />
        <span v-if="unrecordedSeconds > 0" class="return-report__unbuilt" />
      </div>
      <figcaption class="return-report__dims">
        <span class="return-report__dim return-report__dim--built">
          {{ formatTime(report.caughtUpSeconds) }} on record
        </span>
        <span v-if="unrecordedSeconds > 0" class="return-report__dim return-report__dim--unbuilt">
          {{ formatTime(unrecordedSeconds) }} past the window
        </span>
      </figcaption>
    </figure>

    <dl class="return-report__spec">
      <dt>Away</dt>
      <dd>{{ formatTime(report.awaySeconds) }}</dd>
      <dt>Mass converted</dt>
      <dd class="return-report__gain">{{ format(report.massGained, 2) }}</dd>
    </dl>

    <p v-if="unrecordedSeconds > 0" class="return-report__note">
      A return replays at most {{ formatTime(windowSeconds) }}.
    </p>

    <button type="button" class="return-report__resume" @click="onClose">Resume</button>
  </section>
</template>

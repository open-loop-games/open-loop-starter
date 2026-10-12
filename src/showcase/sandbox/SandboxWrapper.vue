<!--
  SandboxWrapper — gallery's mount point for an archetype's `createApp()`.

  Owns the single-tenant invariants for the gallery:

  - `body[data-archetype]` is set to the archetype id before mount and
    cleared after unmount. Defensive: an archetype's AppRoot may also write/clear
    this attribute (its CSS theme scopes from it). Both writes are
    idempotent on the same value, and the wrapper's clear runs after the
    AppRoot's `onUnmounted`, so an AppRoot that skips its own clear is still covered.

  - Vue app is fully unmounted between archetypes — `engine.dispose()`
    stops the game loop and deletes the engine's persistent contexts,
    then `app.unmount()` fires `onUnmounted` on the AppRoot. Dispose (not
    stop) is required because the gallery remounts the same archetype
    in-page; without it the second mount throws on persistent-context
    id collisions (engine assumes single-instance-per-lifetime otherwise).

  Save isolation rides on each archetype's unique `gameId` (cycler-pilot,
  tug-pilot); save-manager prefixes storage keys with it, so
  no `manifest.id`-as-persistence-namespace push/pop is needed. Saves persist across
  remounts because dispose only touches the in-memory persistent-ref registry.
-->
<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from 'vue';
import type { ArchetypeBootResult, SandboxArchetype } from './types';

const props = defineProps<{
  archetype: SandboxArchetype;
  /** Lazy factory the sandbox calls to obtain the boot result. Async to
   *  match the dynamic-import path the gallery uses to avoid hard-imports
   *  of `@/showcase/archetypes/<name>` from `src/gallery/**`. */
  boot: () => Promise<ArchetypeBootResult>;
}>();

const emit = defineEmits<{
  ready: [result: ArchetypeBootResult];
  error: [err: unknown];
}>();

const hostRef = useTemplateRef<HTMLDivElement>('host');
const current = shallowRef<ArchetypeBootResult | null>(null);
const status = ref<'idle' | 'loading' | 'mounted' | 'error'>('idle');
const errorMessage = ref<string | null>(null);

async function mountArchetype(id: string): Promise<void> {
  status.value = 'loading';
  errorMessage.value = null;
  try {
    const result = await props.boot();
    if (!hostRef.value) return;
    document.body.dataset.archetype = id;
    result.mount(hostRef.value);
    current.value = result;
    status.value = 'mounted';
    emit('ready', result);
  } catch (err) {
    status.value = 'error';
    errorMessage.value = err instanceof Error ? err.message : String(err);
    emit('error', err);
  }
}

function unmountArchetype(): void {
  const result = current.value;
  current.value = null;
  if (result) {
    try {
      result.engine.dispose();
    } catch {
      // engine may not be running; swallowing is fine
    }
    try {
      result.app.unmount();
    } catch {
      // unmount errors should not block the next demo from entering
    }
  }
  if (document.body.dataset.archetype) {
    delete document.body.dataset.archetype;
  }
  status.value = 'idle';
}

watch(
  () => props.archetype.id,
  async (id, prevId) => {
    if (id === prevId) return;
    unmountArchetype();
    if (id) await mountArchetype(id);
  },
  { immediate: true, flush: 'post' },
);

onBeforeUnmount(unmountArchetype);
</script>

<template>
  <div class="sandbox">
    <div v-if="status === 'loading'" class="sandbox__overlay">Loading {{ archetype.id }}…</div>
    <div v-else-if="status === 'error'" class="sandbox__overlay sandbox__overlay--error">
      Failed to mount {{ archetype.id }}: {{ errorMessage }}
    </div>
    <div ref="host" class="sandbox__host" />
  </div>
</template>

<style>
.sandbox {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

.sandbox__host {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  /* The gallery mounts a whole archetype app inside its own chrome, so the
     embedded app root must not claim a viewport of its own — this flex chain
     already gives it a definite height. Without this the page overflows by the
     height of the gallery bar above it, for every archetype, on both the slot
     screen and the running game. */
  --app-root-min-height: 0;
}

.sandbox__overlay {
  padding: var(--gap);
  color: var(--color-text-muted);
}

.sandbox__overlay--error {
  color: var(--color-danger);
}
</style>

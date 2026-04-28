<!--
  GalleryApp — root component for the showcase. Sidebar lists archetypes
  (canonical above candidate; deprecated hidden); main is either the home
  card grid or a sandbox-mounted live demo + detail pane.

  Forks delete `src/gallery/` and `src/about/` and revert `main.ts` to a
  single archetype `createApp().mount('#app')`. The strip-cleanliness lint
  asserts nothing here hard-imports `@/archetypes/<name>`.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { AppFrame, SidebarMainShell } from '@/lib';
import { listArchetypes, findArchetype, type GalleryArchetype } from './useArchetypes';
import Card from './Card.vue';
import DetailPane from './DetailPane.vue';
import AboutPanel from './AboutPanel.vue';
import { SandboxWrapper } from '@/ui/sandbox';

type View = 'home' | 'about';

const archetypes = listArchetypes();
const enteredId = ref<string | null>(null);
const view = ref<View>('home');

const canonical = computed(() => archetypes.filter((a) => a.manifest.status === 'canonical'));
const candidates = computed(() => archetypes.filter((a) => a.manifest.status === 'candidate'));

const entered = computed<GalleryArchetype | null>(() => {
  if (!enteredId.value) return null;
  return findArchetype(enteredId.value) ?? null;
});

function enterArchetype(id: string): void {
  enteredId.value = id;
  view.value = 'home';
}

function exitArchetype(): void {
  enteredId.value = null;
}

function showAbout(): void {
  enteredId.value = null;
  view.value = 'about';
}

function showHome(): void {
  enteredId.value = null;
  view.value = 'home';
}
</script>

<template>
  <AppFrame>
    <template #header>
      <div class="gallery-header">
        <button
          class="gallery-header__title"
          type="button"
          @click="showHome"
        >
          <strong>Open Loop Starter</strong>
          <span class="gallery-header__sub">Archetype gallery</span>
        </button>
        <nav class="gallery-header__nav">
          <button
            class="btn-sm"
            type="button"
            @click="showAbout"
          >
            About
          </button>
        </nav>
      </div>
    </template>

    <SidebarMainShell sidebar-width="260px">
      <template #sidebar>
        <div class="gallery-sidebar">
          <button
            class="gallery-sidebar__home"
            type="button"
            @click="showHome"
          >
            Home
          </button>

          <h4 class="gallery-sidebar__group">
            Canonical
          </h4>
          <ul class="gallery-sidebar__list">
            <li
              v-for="a in canonical"
              :key="a.manifest.id"
            >
              <button
                type="button"
                :data-active="enteredId === a.manifest.id || null"
                @click="enterArchetype(a.manifest.id)"
              >
                {{ a.manifest.name }}
              </button>
            </li>
          </ul>

          <h4 class="gallery-sidebar__group">
            Candidate
          </h4>
          <ul class="gallery-sidebar__list">
            <li
              v-for="a in candidates"
              :key="a.manifest.id"
            >
              <button
                type="button"
                :data-active="enteredId === a.manifest.id || null"
                @click="enterArchetype(a.manifest.id)"
              >
                {{ a.manifest.name }}
              </button>
            </li>
          </ul>
        </div>
      </template>

      <div
        v-if="entered"
        class="gallery-entered"
      >
        <header class="gallery-entered__header">
          <button
            class="btn-sm"
            type="button"
            @click="exitArchetype"
          >
            ← Back to gallery
          </button>
          <h2>{{ entered.manifest.name }}</h2>
        </header>
        <div class="gallery-entered__body">
          <div class="gallery-entered__demo">
            <SandboxWrapper
              :archetype="entered.manifest"
              :boot="entered.boot"
            />
          </div>
          <aside class="gallery-entered__detail">
            <DetailPane :manifest="entered.manifest" />
          </aside>
        </div>
      </div>
      <AboutPanel v-else-if="view === 'about'" />
      <div
        v-else
        class="gallery-home"
      >
        <header class="gallery-home__header">
          <h2>Archetype gallery</h2>
          <p>
            Each archetype is a self-bootable demo of a validated game pattern. Click any card to
            enter the live demo. Forks pick one and delete the rest.
          </p>
        </header>
        <h3 class="gallery-home__group">
          Canonical
        </h3>
        <div class="gallery-home__grid">
          <Card
            v-for="a in canonical"
            :key="a.manifest.id"
            :manifest="a.manifest"
            @enter="enterArchetype(a.manifest.id)"
          />
        </div>
        <h3 class="gallery-home__group">
          Candidate
        </h3>
        <div class="gallery-home__grid">
          <Card
            v-for="a in candidates"
            :key="a.manifest.id"
            :manifest="a.manifest"
            @enter="enterArchetype(a.manifest.id)"
          />
        </div>
      </div>
    </SidebarMainShell>
  </AppFrame>
</template>

<style>
.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}
.gallery-header__title {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background: transparent;
  border: none;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  color: inherit;
}
.gallery-header__title strong {
  font-size: 1rem;
}
.gallery-header__sub {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.gallery-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.gallery-sidebar__home {
  text-align: left;
  background: transparent;
  border: 1px solid var(--color-border);
}
.gallery-sidebar__group {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  margin-top: 0.6rem;
}
.gallery-sidebar__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.gallery-sidebar__list button {
  width: 100%;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  padding: 6px 10px;
  border-radius: var(--radius);
  font-size: 0.9rem;
}
.gallery-sidebar__list button:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border);
}
.gallery-sidebar__list button[data-active='true'] {
  background: color-mix(in srgb, var(--color-primary) 15%, var(--color-surface));
  border-color: var(--color-primary);
  color: var(--color-text);
}

.gallery-home {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.gallery-home__header h2 {
  font-size: 1.5rem;
}
.gallery-home__header p {
  color: var(--color-text-muted);
  margin-top: 0.4rem;
}
.gallery-home__group {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  margin-top: 0.4rem;
}
.gallery-home__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.8rem;
}

.gallery-entered {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  flex: 1 1 auto;
  min-height: 0;
}
.gallery-entered__header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}
.gallery-entered__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 0.8rem;
  flex: 1 1 auto;
  min-height: 0;
}
.gallery-entered__demo {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.gallery-entered__detail {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  padding: 0.8rem;
  overflow: auto;
  min-height: 0;
}

@media (max-width: 1100px) {
  .gallery-entered__body {
    grid-template-columns: 1fr;
  }
  .gallery-entered__detail {
    max-height: 50vh;
  }
}
</style>

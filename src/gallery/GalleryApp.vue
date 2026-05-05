<!--
  GalleryApp — root component for the showcase. Sidebar lists archetypes
  (canonical above candidate; deprecated hidden); main is either the home
  card grid or an "entered" view for one archetype.

  Layout primitives are the lib/ shells; gallery contributes only
  composition. The hamburger drives the shell's existing `data-collapsed`
  attribute hook (the shell publishes this hook for mobile responsive
  collapse; gallery-scoped CSS extends it to desktop without editing the
  shell — see "wrap it yourself" guidance in SidebarMainShell.vue).

  Entered controls (Back, archetype name, Details ↔ Live demo toggle)
  live in the gallery header — no second header row in the entered view.
  The toggle is contextual: "Live demo →" on details; "← Details" on
  demo. The sandbox stays mounted across toggles via v-show, so engine
  state survives flipping back to docs.

  Forks delete `src/gallery/` and `src/about/` and revert `main.ts` to a
  single archetype `createApp().mount('#app')`. The strip-cleanliness lint
  asserts nothing here hard-imports `@/archetypes/<name>`.
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ListboxContent, ListboxGroup, ListboxGroupLabel, ListboxItem, ListboxRoot } from 'reka-ui';
import { SidebarMainShell } from '@/lib';
import Button from '@/ui/components/Button.vue';
import { listArchetypes, findArchetype, type GalleryArchetype } from './useArchetypes';
import Card from './Card.vue';
import DetailPane from './DetailPane.vue';
import AboutPanel from './AboutPanel.vue';
import { SandboxWrapper } from '@/ui/sandbox';

type View = 'home' | 'about';
type EnteredTab = 'demo' | 'details';

const archetypes = listArchetypes();
const enteredId = ref<string | null>(null);
const view = ref<View>('home');
const enteredTab = ref<EnteredTab>('details');
const sidebarOpen = ref(true);

const canonical = computed(() => archetypes.filter((a) => a.manifest.status === 'canonical'));
const candidates = computed(() => archetypes.filter((a) => a.manifest.status === 'candidate'));

const entered = computed<GalleryArchetype | null>(() => {
  if (!enteredId.value) return null;
  return findArchetype(enteredId.value) ?? null;
});

function enterArchetype(id: string): void {
  enteredId.value = id;
  view.value = 'home';
  enteredTab.value = 'details';
  sidebarOpen.value = false;
}

watch(enteredId, () => {
  enteredTab.value = 'details';
});

function exitArchetype(): void {
  enteredId.value = null;
  sidebarOpen.value = true;
}

function showAbout(): void {
  enteredId.value = null;
  view.value = 'about';
  sidebarOpen.value = true;
}

function showHome(): void {
  enteredId.value = null;
  view.value = 'home';
  sidebarOpen.value = true;
}

function onSidebarPick(value: unknown): void {
  if (typeof value === 'string') enterArchetype(value);
}

function toggleSidebar(): void {
  sidebarOpen.value = !sidebarOpen.value;
}

function flipTab(): void {
  enteredTab.value = enteredTab.value === 'details' ? 'demo' : 'details';
}
</script>

<template>
  <div class="gallery-shell">
    <header class="gallery-header">
      <Button
        class="gallery-header__hamburger btn-sm"
        type="button"
        :aria-label="sidebarOpen ? 'Hide archetype list' : 'Show archetype list'"
        :aria-expanded="sidebarOpen"
        @click="toggleSidebar"
      >
        ☰
      </Button>
      <Button class="gallery-header__title" type="button" @click="showHome">
        <strong>Open Loop Starter</strong>
        <span class="gallery-header__sub">Archetype gallery</span>
      </Button>

      <div v-if="entered" class="gallery-header__entered">
        <Button class="btn-sm" type="button" @click="exitArchetype"> ← Back </Button>
        <span class="gallery-header__entered-name">{{ entered.manifest.name }}</span>
        <Button class="btn-sm" type="button" @click="flipTab">
          {{ enteredTab === 'details' ? 'Live demo →' : '← Details' }}
        </Button>
      </div>

      <nav class="gallery-header__nav">
        <Button class="btn-sm" type="button" @click="showAbout"> About </Button>
      </nav>
    </header>

    <SidebarMainShell
      class="gallery-shell__shell"
      :sidebar-width="sidebarOpen ? '240px' : '0px'"
      collapsible
      :data-collapsed="!sidebarOpen ? 'true' : null"
    >
      <template #sidebar>
        <div v-if="sidebarOpen" class="gallery-sidebar">
          <Button class="gallery-sidebar__home" type="button" @click="showHome"> Home </Button>

          <ListboxRoot :model-value="enteredId" @update:model-value="onSidebarPick">
            <ListboxContent>
              <ListboxGroup class="gallery-sidebar__list">
                <ListboxGroupLabel class="gallery-sidebar__group"> Canonical </ListboxGroupLabel>
                <ListboxItem
                  v-for="a in canonical"
                  :key="a.manifest.id"
                  :value="a.manifest.id"
                  class="gallery-sidebar__item"
                >
                  {{ a.manifest.name }}
                </ListboxItem>
              </ListboxGroup>
              <ListboxGroup class="gallery-sidebar__list">
                <ListboxGroupLabel class="gallery-sidebar__group"> Candidate </ListboxGroupLabel>
                <ListboxItem
                  v-for="a in candidates"
                  :key="a.manifest.id"
                  :value="a.manifest.id"
                  class="gallery-sidebar__item"
                >
                  {{ a.manifest.name }}
                </ListboxItem>
              </ListboxGroup>
            </ListboxContent>
          </ListboxRoot>
        </div>
      </template>

      <div v-if="entered" class="gallery-entered">
        <!-- Demo + details are mutually exclusive in the main column so each
             gets the full available width. The sandbox stays mounted across
             toggles via v-show so engine state survives. -->
        <div v-show="enteredTab === 'demo'" class="gallery-entered__demo">
          <SandboxWrapper :archetype="entered.manifest" :boot="entered.boot" />
        </div>
        <div v-show="enteredTab === 'details'" class="gallery-entered__detail">
          <section class="gallery-entered__cta">
            <Button
              class="btn-primary gallery-entered__cta-btn"
              type="button"
              @click="enteredTab = 'demo'"
            >
              ▶ Try {{ entered.manifest.name }} live
            </Button>
            <span class="gallery-entered__cta-hint">
              Mounts the {{ entered.manifest.id }} engine in an isolated sandbox.
            </span>
          </section>
          <DetailPane :manifest="entered.manifest" />
        </div>
      </div>
      <AboutPanel v-else-if="view === 'about'" />
      <div v-else class="gallery-home">
        <header class="gallery-home__header">
          <h2>Archetype gallery</h2>
          <p>
            Each archetype is a self-bootable demo of a validated game pattern. Click any card to
            see its details — patterns, primitives, beats, themes, exemplars, and the doc body. From
            there, toggle to Live demo to mount the sandbox. Forks pick one and delete the rest.
          </p>
        </header>
        <h3 class="gallery-home__group">Canonical</h3>
        <div class="gallery-home__grid">
          <Card
            v-for="a in canonical"
            :key="a.manifest.id"
            :manifest="a.manifest"
            @enter="enterArchetype(a.manifest.id)"
          />
        </div>
        <h3 class="gallery-home__group">Candidate</h3>
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
  </div>
</template>

<style>
.gallery-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
}

/* Activate SidebarMainShell's `data-collapsed='true'` hook on desktop too.
   The shell publishes this attribute hook for its own responsive collapse
   below 720px; gallery-scoped CSS lifts it to all viewport widths so the
   hamburger toggle can drive collapse without lib/ changes.

   Direct-child combinators are load-bearing: an archetype that itself uses
   SidebarMainShell (e.g. scaler) would otherwise inherit `display: none`
   on its inner __sidebar via descendant match, and the surviving __main
   would auto-place into the 260px first track. */
.gallery-shell > .gallery-shell__shell[data-collapsed='true'] {
  grid-template-columns: 1fr;
}
.gallery-shell > .gallery-shell__shell[data-collapsed='true'] > .olui-sidebar-main__sidebar {
  display: none;
}

.gallery-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.8rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  flex: 0 0 auto;
}
.gallery-header__hamburger {
  flex: 0 0 auto;
  font-size: 1.05rem;
  line-height: 1;
}
.gallery-header__title {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background: transparent;
  border: none;
  padding: 0.2rem 0.4rem;
  cursor: pointer;
  color: inherit;
  flex: 0 0 auto;
}
.gallery-header__title strong {
  font-size: 0.95rem;
}
.gallery-header__sub {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}
.gallery-header__entered {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1 1 auto;
  margin-left: 0.6rem;
  padding-left: 0.6rem;
  border-left: 1px solid var(--color-border);
  min-width: 0;
}
.gallery-header__entered-name {
  font-weight: 600;
  font-size: 0.95rem;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gallery-header__nav {
  flex: 0 0 auto;
  margin-left: auto;
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
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.gallery-sidebar__item {
  width: 100%;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  padding: 6px 10px;
  border-radius: var(--radius);
  font-size: 0.9rem;
  cursor: pointer;
}
.gallery-sidebar__item:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border);
}
.gallery-sidebar__item[data-state='checked'] {
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
  flex: 1 1 auto;
  min-height: 0;
  margin: calc(var(--gap) * -1);
}
.gallery-entered__demo {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}
.gallery-entered__detail {
  flex: 1 1 auto;
  overflow: auto;
  min-height: 0;
  padding: 1rem 1.2rem;
  background: var(--color-surface);
}
.gallery-entered__cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.8rem 1.2rem;
  padding: 0.9rem 1rem;
  margin-bottom: 1rem;
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
  border-radius: var(--radius);
}
.gallery-entered__cta-btn {
  font-size: 0.95rem;
  padding: 8px 18px;
  font-weight: 600;
  flex: 0 0 auto;
}
.gallery-entered__cta-hint {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  flex: 1 1 auto;
  min-width: 0;
}
</style>

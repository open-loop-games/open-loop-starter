<!--
  GalleryApp — root component for the showcase. Sidebar lists archetypes;
  main is either the home card grid or an "entered" view for one archetype.

  Layout comes from the lib/ shells; gallery only composes them. The
  hamburger turns the list's rail off by leaving its slot unfilled. The
  shell's viewport is fixed, so the list and main scroll on their own and an
  embedded fixed-viewport demo gets a bounded height.

  Entered controls (Back, archetype name, Details ↔ Live demo toggle)
  live in the gallery header — no second header row in the entered view.
  The toggle is contextual: "Live demo →" on details; "← Details" on
  demo. The sandbox stays mounted across toggles via v-show, so engine
  state survives flipping back to docs.

  The view is read from the URL hash (`galleryRoute.ts`), so `#/<id>/play`
  opens one story's live demo directly. The games site links its story
  cards that way.

  Forks delete `src/gallery/` and `src/about/` and revert `main.ts` to a
  single archetype `createApp().mount('#app')`. The strip-cleanliness lint
  asserts nothing here hard-imports `@/showcase/archetypes/<name>`.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ListboxContent, ListboxItem, ListboxRoot } from 'reka-ui';
import { ColumnShell } from '@/lib';
import Button from '@/ui/components/Button.vue';
import { listArchetypes, findArchetype, type GalleryArchetype } from './useArchetypes';
import { formatRoute, parseRoute, type GalleryRoute } from './galleryRoute';
import Card from './Card.vue';
import DetailPane from './DetailPane.vue';
import AboutPanel from './AboutPanel.vue';
import { SandboxWrapper } from '@/showcase/sandbox';

const archetypes = listArchetypes();
const readHash = (): GalleryRoute => parseRoute(location.hash, (id) => !!findArchetype(id));
const route = ref<GalleryRoute>(readHash());
const sidebarOpen = ref(route.value.view !== 'story');

// The hash is the state, so back and forward walk the gallery and a link
// opens one story.
function navigate(next: GalleryRoute): void {
  location.hash = formatRoute(next);
}
const onHashChange = (): void => {
  route.value = readHash();
};
window.addEventListener('hashchange', onHashChange);
onBeforeUnmount(() => window.removeEventListener('hashchange', onHashChange));

const entered = computed<GalleryArchetype | null>(() =>
  route.value.view === 'story' ? (findArchetype(route.value.id) ?? null) : null,
);
const enteredId = computed(() => entered.value?.manifest.id ?? null);
const enteredTab = computed(() => (route.value.view === 'story' ? route.value.tab : 'details'));

watch(
  () => route.value.view,
  (view) => {
    sidebarOpen.value = view !== 'story';
  },
);

function enterArchetype(id: string): void {
  navigate({ view: 'story', id, tab: 'details' });
}

function showAbout(): void {
  navigate({ view: 'about' });
}

function showHome(): void {
  navigate({ view: 'home' });
}

function onSidebarPick(value: unknown): void {
  if (typeof value === 'string') enterArchetype(value);
}

function toggleSidebar(): void {
  sidebarOpen.value = !sidebarOpen.value;
}

function showTab(tab: 'details' | 'demo'): void {
  if (enteredId.value) navigate({ view: 'story', id: enteredId.value, tab });
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
        <Button class="btn-sm" type="button" @click="showHome"> ← Back </Button>
        <span class="gallery-header__entered-name">{{ entered.manifest.displayName }}</span>
        <Button
          class="btn-sm"
          type="button"
          @click="showTab(enteredTab === 'details' ? 'demo' : 'details')"
        >
          {{ enteredTab === 'details' ? 'Live demo →' : '← Details' }}
        </Button>
      </div>

      <nav class="gallery-header__nav">
        <Button class="btn-sm" type="button" @click="showAbout"> About </Button>
      </nav>
    </header>

    <ColumnShell viewport="fixed" side-bar-left-width="240px" main-min-width="0px">
      <template v-if="sidebarOpen" #sideBarLeft>
        <div class="gallery-sidebar">
          <Button class="gallery-sidebar__home" type="button" @click="showHome"> Home </Button>

          <ListboxRoot :model-value="enteredId" @update:model-value="onSidebarPick">
            <ListboxContent class="gallery-sidebar__list">
              <ListboxItem
                v-for="a in archetypes"
                :key="a.manifest.id"
                :value="a.manifest.id"
                class="gallery-sidebar__item"
              >
                {{ a.manifest.displayName }}
              </ListboxItem>
            </ListboxContent>
          </ListboxRoot>
        </div>
      </template>

      <div class="gallery-main">
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
                @click="showTab('demo')"
              >
                ▶ Try {{ entered.manifest.displayName }} live
              </Button>
              <span class="gallery-entered__cta-hint">
                Mounts the {{ entered.manifest.id }} engine in an isolated sandbox.
              </span>
            </section>
            <DetailPane :manifest="entered.manifest" />
          </div>
        </div>
        <AboutPanel v-else-if="route.view === 'about'" />
        <div v-else class="gallery-home">
          <header class="gallery-home__header">
            <h2>Archetype gallery</h2>
            <p>
              Each archetype is a self-bootable demo of a validated game pattern. Click any card to
              see its details and toggle into the live sandbox. Forks pick one and delete the rest.
            </p>
          </header>
          <div class="gallery-home__grid">
            <Card
              v-for="a in archetypes"
              :key="a.manifest.id"
              :manifest="a.manifest"
              @enter="enterArchetype(a.manifest.id)"
            />
          </div>
        </div>
      </div>
    </ColumnShell>
  </div>
</template>

<style>
.gallery-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
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

/* The shell draws no panels; the rail and main draw their own. */
.gallery-sidebar,
.gallery-main {
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--gap);
}
.gallery-sidebar {
  gap: 0.4rem;
}
.gallery-sidebar__home {
  text-align: left;
  background: transparent;
  border: 1px solid var(--color-border);
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

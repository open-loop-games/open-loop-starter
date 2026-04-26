<script setup lang="ts">
import { inject, onMounted, onUnmounted, provide, ref, watch } from 'vue';
import { type Engine, type EngineModule } from 'open-loop-engine';
import { AppFrame, DevPanelOverlay, ThreePanelShell, useModalStack } from '@/lib';
import { Screen } from '@/types';
import SlotScreen from '@/ui/screens/SlotScreen.vue';
import ToastContainer from '@/ui/components/ToastContainer.vue';
import DevDiagnostics from '@/ui/components/DevDiagnostics.vue';
import BalanceWorkbench from '@/ui/panels/BalanceWorkbench.vue';
import Popover from '@/ui/components/Popover.vue';
import SavePanel from '@/ui/components/SavePanel.vue';
import SettingsPanel from '@/ui/components/SettingsPanel.vue';
import { useToasts } from '@/composables/useToasts';
import { ArcKey } from '../modules';
import HeadlinePanel from './panels/HeadlinePanel.vue';
import ProducerPanel from './panels/ProducerPanel.vue';
import UpgradeTray from './panels/UpgradeTray.vue';
import AchievementGridDialog from './components/AchievementGridDialog.vue';
import './producer-theme.css';

const engine = inject<Engine>('engine')!;
const currentScreen = ref<Screen>(Screen.Slots);
provide('currentScreen', currentScreen);

const isDev = import.meta.env.DEV;
const showDevPanel = ref(false);
const showAchievements = ref(false);

function onKey(e: KeyboardEvent): void {
  if (!isDev) return;
  if (e.key === 'F12') {
    e.preventDefault();
    showDevPanel.value = !showDevPanel.value;
  }
}

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?' +
  'family=Fraunces:ital,opsz,wght,SOFT@0,9..144,500..900,100;1,9..144,500..900,100&' +
  'family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400..600&' +
  'display=swap';

function ensureBakeryFonts(): void {
  if (document.getElementById('bakery-fonts')) return;
  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';
  const stylesheet = document.createElement('link');
  stylesheet.id = 'bakery-fonts';
  stylesheet.rel = 'stylesheet';
  stylesheet.href = FONTS_HREF;
  document.head.append(preconnect1, preconnect2, stylesheet);
}

onMounted(() => {
  document.body.dataset.archetype = 'producer';
  ensureBakeryFonts();
  window.addEventListener('keydown', onKey);
});

onUnmounted(() => {
  delete document.body.dataset.archetype;
  window.removeEventListener('keydown', onKey);
});

const stack = useModalStack();
function openSave(): void {
  const id = stack.push(SavePanel, { onClose: () => stack.remove(id) });
}
function openSettings(): void {
  const id = stack.push(SettingsPanel, { onClose: () => stack.remove(id) });
}

const { addToast } = useToasts();
let stopArcWatcher: (() => void) | null = null;
function armArcFlavourEvent(): void {
  stopArcWatcher?.();
  const arc = engine.tryInject(ArcKey);
  if (!arc) return;
  const announcedAtStart = arc.announced.value;
  stopArcWatcher = watch(
    arc.announced,
    (isAnnounced, wasAnnounced) => {
      if (!isAnnounced || wasAnnounced || announcedAtStart) return;
      addToast('Arc closed — Bakery', arc.flavour, false);
    },
    { flush: 'sync' },
  );
}

function startGame(slotId: number, modId?: string): void {
  engine.saveManager!.selectSlot(slotId);
  if (modId) engine.selectMod(modId);
  engine.start();
  engine.load();
  armArcFlavourEvent();
  currentScreen.value = Screen.Game;
}

function returnToSlots(): void {
  engine.saveManager?.save();
  engine.stop();
  stopArcWatcher?.();
  stopArcWatcher = null;
  currentScreen.value = Screen.Slots;
}

function getActiveModules(): EngineModule[] {
  const activeId = engine.activeModId;
  if (!activeId) return [];
  return engine.mods.find((m) => m.id === activeId)?.modules ?? [];
}
</script>

<template>
  <SlotScreen
    v-if="currentScreen === Screen.Slots"
    :engine="engine"
    @start="startGame"
  />
  <AppFrame
    v-else
    :stack="stack"
    :tooltip-delay="400"
  >
    <template #header>
      <header class="bakery-header">
        <button
          class="bakery-shopfront"
          data-testid="return-to-slots"
          title="Save and return to save picker"
          @click="returnToSlots"
        >
          <span class="bakery-shopfront__rule" />
          <span class="bakery-shopfront__name">Bakery</span>
          <span class="bakery-shopfront__sub">est. just now &middot; flour, sugar, ambition</span>
        </button>
        <nav class="bakery-actions">
          <Popover
            align="end"
            :side-offset="10"
          >
            <template #trigger>
              <button
                class="btn-sm bakery-actions__btn"
                data-testid="open-info"
                aria-label="About"
              >
                ?
              </button>
            </template>
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
          </Popover>
          <button
            class="btn-sm bakery-actions__btn"
            @click="showAchievements = true"
          >
            Achievements
          </button>
          <button
            class="btn-sm bakery-actions__btn"
            @click="openSave"
          >
            Save
          </button>
          <button
            class="btn-sm bakery-actions__btn"
            @click="openSettings"
          >
            Settings
          </button>
        </nav>
      </header>
    </template>
    <ThreePanelShell>
      <template #left>
        <ProducerPanel />
      </template>
      <HeadlinePanel />
      <template #right>
        <UpgradeTray />
      </template>
    </ThreePanelShell>
  </AppFrame>
  <ToastContainer />
  <DevDiagnostics v-if="isDev" />
  <AchievementGridDialog
    v-if="showAchievements"
    @close="showAchievements = false"
  />
  <DevPanelOverlay
    v-if="isDev && showDevPanel"
    title="Balance Workbench"
    @close="showDevPanel = false"
  >
    <BalanceWorkbench
      :engine="engine"
      :modules="getActiveModules"
    />
  </DevPanelOverlay>
</template>

<style scoped>
/* ─── Awning header ──────────────────────────────────────────────────── */
.bakery-header {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--gap-lg);
  padding: 18px var(--gap-lg) 14px;
  position: relative;
  border-bottom: 1px solid var(--bakery-rye-line, #b89a6a);
  background:
    var(--bakery-grain),
    linear-gradient(180deg, rgba(248, 239, 214, 0.7) 0%, rgba(243, 231, 204, 0.95) 100%);
}

.bakery-header::after {
  /* second hairline below the main border for the double-rule shopfront feel */
  content: '';
  position: absolute;
  left: var(--gap-lg);
  right: var(--gap-lg);
  bottom: -4px;
  height: 1px;
  background: var(--bakery-rye-line-soft, rgba(122, 84, 38, 0.18));
}

/* ─── Shopfront title — clickable "exit to slots" ─────────────────────── */
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

/* Header action row */
.bakery-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.bakery-actions__btn[aria-label='About'] {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95em;
  letter-spacing: 0;
  font-family: var(--font-display, Georgia, serif);
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

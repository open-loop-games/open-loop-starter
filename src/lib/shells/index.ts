// Layout shells — the 5 validated patterns from the 42-game layout spray.
// See open-loop-research/patterns/ui-ux/layout-spray-2026-04.md for evidence.
//
// Phase 1 targets (OL-257):
// - SingleColumnShell   (19% of corpus)
// - SidebarMainShell    (33% — most common)
// - TabsBarShell        (21% — mobile-friendly sibling of SidebarMainShell)
// - ThreePanelShell     (14% — asymmetric by default)
// - MultiColumnShell    (7%  — parameterized N-column strip; replaces the 2x2 idea)

export { default as SingleColumnShell } from './SingleColumnShell.vue';
export { default as SidebarMainShell } from './SidebarMainShell.vue';
export { default as TabsBarShell } from './TabsBarShell.vue';
export { default as ThreePanelShell } from './ThreePanelShell.vue';
export { default as MultiColumnShell } from './MultiColumnShell.vue';

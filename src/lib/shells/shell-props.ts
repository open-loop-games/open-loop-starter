import type { InjectionKey } from 'vue';

/** The options every shell takes. A prefab declares this same type, with its own defaults. */
export interface BaseShellProps {
  /** `flow` scrolls with its content; `stage` is a fixed area that clips, for a map, board or canvas. */
  main?: 'flow' | 'stage';
  /** `page` scrolls the whole page; `fixed` fits the shell to the frame and scrolls each region on its own. Stage mode and a filled `#floats` force `fixed`. */
  viewport?: 'page' | 'fixed';
  /** A CSS grid track: `280px`, `minmax(250px, 300px)`, `1fr`. */
  sideBarLeftWidth?: string;
  /** A CSS grid track, as for `sideBarLeftWidth`. */
  sideBarRightWidth?: string;
  /** The least width main shrinks to before the page scrolls sideways. */
  mainMinWidth?: string;
  /** Caps the columns and centres them. Unset, the shell spans the frame. */
  maxWidth?: string;
  /** With `maxWidth`, the bar regions still span the frame and only their content is capped. */
  bleedBars?: boolean;
  /** In stage mode, the stage meets the frame's sides, with no gap or inset. */
  stageBleed?: boolean;
}

export const BASE_SHELL_DEFAULTS = {
  main: 'flow',
  viewport: 'page',
  sideBarLeftWidth: '280px',
  sideBarRightWidth: '300px',
  mainMinWidth: '0px',
  bleedBars: true,
  stageBleed: false,
} as const satisfies BaseShellProps;

/** Where a `ShellFloat` sits over main, on a 3×3 grid. */
export type ShellAnchor =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'center'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right';

export const SHELL_ANCHORS: readonly ShellAnchor[] = [
  'top-left',
  'top',
  'top-right',
  'left',
  'center',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right',
];

/** Gives a `ShellFloat` the selector of its anchor cell in the enclosing shell. */
export const shellFloatTargetKey: InjectionKey<(anchor: ShellAnchor) => string> =
  Symbol('shellFloatTarget');

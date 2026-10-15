import { inject, provide, reactive, type InjectionKey } from 'vue';
import type { PieceId } from '../data';

/** Pointer state the hull board and the panels around it share. Not saved: a reload empties the hand. */
export interface Fitting {
  /** module type held for fitting, taken from the bay */
  hand: PieceId | null;
  /** the held module's facing, 0 bow to 3 port; read only for a module that turns */
  facing: number;
  /** hull cell under the pointer */
  hover: { x: number; y: number } | null;
  /** hull section whose plating is being previewed */
  sectionHover: number | null;
}

const FittingKey: InjectionKey<Fitting> = Symbol('packer/fitting');

/** Create the fitting state and provide it to the game view's subtree. */
export function provideFitting(): Fitting {
  const fitting = reactive<Fitting>({ hand: null, facing: 0, hover: null, sectionHover: null });
  provide(FittingKey, fitting);
  return fitting;
}

export function useFitting(): Fitting {
  const fitting = inject(FittingKey);
  if (!fitting) throw new Error('useFitting() outside PackerGameView');
  return fitting;
}

/** The four facings, as the fitter calls them. */
export const FACING_NAMES = ['bow', 'starboard', 'stern', 'port'] as const;

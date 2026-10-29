/**
 * The floor's art: Kenney Topdown Shooter figures (CC0) and four unTied Games effects, both
 * credited in the story's `credits.ts`. An off-tree script packs only the frames the floor
 * draws into `assets/floor/`:
 *
 * - `figures.png` holds one cell per figure, in `FIGURES` order, and under that row the same
 *   figures washed toward chalk, the hit flash. A tint can only darken, so the flash is baked.
 * - Each effect is one horizontal strip of uniform cells, so its frame count is its width over
 *   its cell.
 *
 * A Kenney figure faces +x, its head about 26 px across a 43 px frame, a little left of the
 * frame's centre; `FIGURE_ANCHOR` is that head.
 */
import { Assets, Rectangle, Texture } from 'pixi.js';
import figuresUrl from '../../assets/floor/figures.png';
import popUrl from '../../assets/floor/pop.png';
import goldUrl from '../../assets/floor/gold.png';
import ringUrl from '../../assets/floor/ring.png';
import coneUrl from '../../assets/floor/cone.png';

/** Cell order in `figures.png`. */
export const FIGURES = [
  'survivor1_gun',
  'manBlue_stand',
  'manBrown_stand',
  'manOld_stand',
  'manRed_stand',
  'womanGreen_stand',
  'womanOld_stand',
  'manRed_hold',
  'robot1_stand',
  'hitman1_gun',
  'hitman2_machine',
  'womanGreen_gun',
  'soldier1_hold',
] as const;
export type Figure = (typeof FIGURES)[number];

const FIGURE_CELL = { w: 52, h: 43 };
/** Where a figure's head sits in its cell, as a fraction of the cell. */
export const FIGURE_ANCHOR = { x: 0.42, y: 0.5 } as const;
/** A figure's head width in its cell's pixels: the span a body's diameter maps onto. */
export const FIGURE_HEAD = 26;

const FX = {
  pop: { url: popUrl, w: 64, h: 64 },
  gold: { url: goldUrl, w: 96, h: 96 },
  ring: { url: ringUrl, w: 96, h: 96 },
  cone: { url: coneUrl, w: 48, h: 96 },
} as const;
export type FxArt = keyof typeof FX;

export interface FloorArt {
  figure: Record<Figure, Texture>;
  flash: Record<Figure, Texture>;
  /** Each effect's frames in play order. */
  fx: Record<FxArt, Texture[]>;
  /** Frees the slices; the loaded images stay in pixi's asset cache for the next mount. */
  destroy(): void;
}

/** Loads the floor's art and slices it into textures. */
export async function loadFloorArt(): Promise<FloorArt> {
  const figures = await Assets.load<Texture>(figuresUrl);
  const slices: Texture[] = [];
  const slice = (base: Texture, x: number, y: number, w: number, h: number) => {
    const t = new Texture({ source: base.source, frame: new Rectangle(x, y, w, h) });
    slices.push(t);
    return t;
  };
  const row = (y: number) =>
    Object.fromEntries(
      FIGURES.map((f, i) => [
        f,
        slice(figures, i * FIGURE_CELL.w, y, FIGURE_CELL.w, FIGURE_CELL.h),
      ]),
    ) as Record<Figure, Texture>;

  const fx = {} as Record<FxArt, Texture[]>;
  for (const [kind, { url, w, h }] of Object.entries(FX) as [FxArt, (typeof FX)[FxArt]][]) {
    const strip = await Assets.load<Texture>(url);
    // The effects are pixel art: scaled up, they stay crisp rather than blur.
    strip.source.scaleMode = 'nearest';
    fx[kind] = Array.from({ length: Math.round(strip.width / w) }, (_, i) =>
      slice(strip, i * w, 0, w, h),
    );
  }

  return {
    figure: row(0),
    flash: row(FIGURE_CELL.h),
    fx,
    destroy: () => {
      for (const t of slices) t.destroy(false);
    },
  };
}

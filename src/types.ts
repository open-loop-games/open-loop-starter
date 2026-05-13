export enum Screen {
  Slots = 'slots',
  Game = 'game',
}

/**
 * Shared starter types.
 *
 * `ArchetypeManifest` is the gallery-surface contract every archetype satisfies.
 * Each `src/archetypes/<name>/manifest.ts` exports a typed `ArchetypeManifest`
 * value re-exported from the archetype's `index.ts`. The gallery enumerates
 * archetypes via `import.meta.glob` and reads these manifests; the manifest
 * is the source of truth for card/detail-pane presentation.
 *
 * `path` fields below are dev-time placeholders: monorepo-root-relative paths
 * to the sibling-repo source on disk. They are real during local development
 * but do not yet describe a hosted-URL contract.
 */

export type ArchetypeStatus = 'canonical' | 'candidate' | 'deprecated';

export type FormFactor = 'desktop' | 'mobile-first' | 'responsive';

export type PatternTier =
  | 'tier-0-universal'
  | 'tier-1-foundation'
  | 'tier-2-common'
  | 'tier-3-moderate'
  | 'tier-4-specialized'
  | 'cross-pattern-property';

export interface PatternRef {
  /** Display label, exact name from `open-loop-research/LIBRARY.md`. */
  label: string;
  /** Dev-time placeholder path; see top-of-file note. */
  path: string;
  /** Tier classification — drives gallery filtering. */
  tier: PatternTier;
}

export interface PrimitiveRef {
  /** Symbol name as it resolves in `open-loop-engine/docs/api/INDEX.md`. */
  name: string;
  /** Engine layer the primitive lives at. */
  layer: 'primitives' | 'core' | 'systems' | 'harness';
  /** Dev-time placeholder path; see top-of-file note. */
  path: string;
}

export interface BeatRef {
  /** 1-indexed beat number, matching doc § 4. */
  n: number;
  label: string;
  /**
   * Sim-time window (min, max) in seconds within which the beat lands at
   * default balance. Mirrors the doc's "0:00–0:30" / "1:00–3:00" cells.
   */
  targetSimRange: [number, number];
}

export interface ThemeRef {
  /** Display name, e.g. "Bakery", "Cozy Farm", "SciFi Armada". */
  name: string;
  isDefault: boolean;
  /**
   * `baked` — implementation ships this theme's costume in the archetype code.
   * `spec-only` — documented in the archetype's § 11 but not implemented.
   */
  status: 'baked' | 'spec-only';
}

export interface ExemplarRef {
  /** Display title, e.g. "Cookie Clicker". */
  title: string;
  /** Dev-time placeholder path; see top-of-file note. */
  analysisPath: string;
}

export interface ArchetypeManifest {
  /** Stable id; matches the directory name and the engine save-namespace. */
  id: string;
  /** Display name forwarded as `appName` to SlotScreen. Costume-level. */
  name: string;
  status: ArchetypeStatus;
  /**
   * One-line elevator from the archetype's doc § 1 paragraph 1. 300–1200
   * chars per `_template.md` validator rules; no markdown links or fences.
   * Inlined here rather than parsed from the doc; the doc remains the
   * authoritative copy and any drift must be reconciled in this file.
   */
  pitch: string;
  patterns: {
    required: PatternRef[];
    crossProperties: PatternRef[];
    optional?: PatternRef[];
  };
  /** Engine primitives the archetype uses. § 3 "explicitly not used" rows
   * stay in the doc; the manifest holds the used set only. */
  primitives: PrimitiveRef[];
  beats: BeatRef[];
  themes: ThemeRef[];
  /** Prescribed shell name for gallery presentation. The gallery resolves at
   * render time whether this maps to `src/lib/shells/<name>.vue` or is a
   * declared-invention label. The archetype's actual mounted root component
   * is reachable separately via `createApp()` and is not held here. */
  shell: string;
  /** Demo stance for the skeleton. Forward-looking fork-target intent stays
   * in doc § 9 prose. */
  formFactor: FormFactor;
  /** Optional — declared-invention archetypes omit this. */
  exemplars?: ExemplarRef[];
}

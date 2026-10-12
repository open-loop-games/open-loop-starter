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

export type FormFactor = 'desktop' | 'mobile-first' | 'responsive';

export interface PrimitiveRef {
  /** Symbol name as it resolves in `open-loop-engine/docs/api/INDEX.md`. */
  name: string;
  /** The engine source layer the primitive is in. */
  sourceLayer: 'primitives' | 'core' | 'systems' | 'harness';
  /** Dev-time placeholder path; see top-of-file note. */
  path: string;
}

export interface BeatRef {
  /** 1-indexed beat number. */
  n: number;
  label: string;
  /**
   * Fire-time window (min, max) in sim-seconds where this beat was OBSERVED to
   * fire, measured from headless runs and recorded here — never authored as a
   * target to tune the source numbers toward. Omit until measured; a beat with
   * no recorded window is honest, not incomplete.
   */
  recordedFireTimeRange?: [number, number];
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
  /** Forwarded as `appName` to SlotScreen. Costume-level. */
  displayName: string;
  /** Engine primitives the archetype uses. */
  primitives: PrimitiveRef[];
  beats: BeatRef[];
  /** Prescribed shell name for gallery presentation. The gallery resolves at
   * render time whether this maps to `src/lib/shells/<name>.vue` or is a
   * declared-invention label. The archetype's actual mounted root component
   * is reachable separately via `createApp()` and is not held here. */
  shell: string;
  formFactor: FormFactor;
  /** Optional — declared-invention archetypes omit this. */
  exemplars?: ExemplarRef[];
}

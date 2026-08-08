// ─── Skeleton ───
// Barrel for the archetype's pure config. Modules import from here; the split is
// by subsystem so each file can carry its own `─── Balance ───` reasoning next to
// the constants it justifies.
//
// `./survivor.ts` is deliberately NOT re-exported — it is the inherited `_blank`
// example economy, still read by the placeholder `core`/`automation` modules, and
// it goes when the real modules land.

export * from './arena';
export * from './devices';
export * from './income';
export * from './meta';
export * from './schedule';
export * from './seats';
export * from './specimens';

import type { ProducerData } from './types';
import { PROBE_CLASSES } from './classes';
import { REFINEMENTS } from './refinements';
import { REVISIONS } from './revisions';

export * from './types';
export * from './curve';
export { PROBE_CLASSES } from './classes';
export { REFINEMENTS } from './refinements';
export { REVISIONS, DEFAULT_REVISION_MULTIPLIER } from './revisions';

export const DEFAULT_PRODUCER_DATA: ProducerData = {
  classes: PROBE_CLASSES,
  refinements: REFINEMENTS,
  revisions: REVISIONS,
};

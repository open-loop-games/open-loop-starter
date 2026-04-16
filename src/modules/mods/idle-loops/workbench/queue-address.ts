/**
 * Queue address — identifies a single slot in a list-mode Sequencer.
 *
 * Adapted from open-loop-engine's harness perturbation pattern
 * (src/harness/perturbation.ts + picker/types.ts). Retargeted from
 * ModifierChain mutations to Sequencer queue mutations. If the engine's
 * picker+perturbation layer ever generalizes beyond modifier chains, this
 * file can switch to consuming it directly.
 */

export interface QueueAddress {
  index: number;
}

/** Pick a random valid index. Returns null if the queue is empty. */
export function randomAddress(queueLength: number, rng: () => number = Math.random): QueueAddress | null {
  if (queueLength <= 0) return null;
  return { index: Math.floor(rng() * queueLength) };
}

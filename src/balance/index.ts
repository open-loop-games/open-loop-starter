/**
 * Cross-archetype balance toolkit. Wraps engine pacing primitives + the
 * `runMatrixUntil` harness into shapes a per-archetype `balance/` folder
 * can plug into.
 *
 * Discovery shape: scripts call `runFlowProbe` + `runArcProbe`, render
 * with `report.ts`, iterate balance constants until tables are green.
 * Regression shape: a thin sim test pins the chosen `terminationTime`
 * distribution per beat.
 *
 * `flow-probe` checks per-producer payback texture (own-income beat
 * time, classified into Csikszentmihalyi flow channels). `arc-probe`
 * checks beat-completion-time distributions across a seed sweep.
 * `sweep` confirms ±%-perturbation robustness once a balance is chosen.
 */

export {
  runFlowProbe,
  type BeatProbe,
  type BeatSnapshot,
  type FlowProbeConfig,
  type ProducerInspector,
  type ProducerPacing,
} from './flow-probe';

export {
  runArcProbe,
  type ArcBeatProbe,
  type ArcProbeConfig,
  type BeatArcResult,
} from './arc-probe';

export {
  runSweep,
  type SweepAxis,
  type SweepCellResult,
  type SweepConfig,
  type SweepResult,
} from './sweep';

export {
  formatChannel,
  formatDuration,
  formatWindow,
  renderArcTable,
  renderFlowTable,
  renderSweepTable,
} from './report';

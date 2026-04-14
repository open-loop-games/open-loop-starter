/**
 * Static pacing check — OL-425 Phase 1 deliverable.
 *
 * Feeds CF and cc-authentic constant tables through open-loop-sim's
 * `calculateBeatTiming` and asserts the implied beats fall in an acceptable
 * flow-channel band. No engine boot: this is a pure-math check that locks
 * pacing.ts's role shift from solver → checker.
 *
 * Why no engine boot: pacing needs "at the moment you're about to afford
 * producer N at owned count k, what's the beat?" — the engine exposes
 * final-state multipliers after all upgrades are applied, which isn't the
 * same signal. Walking the constant tables statically gives the right
 * snapshot.
 *
 * Must-not: open-loop-sim stays a *dev* dep. The only import site for
 * pacing symbols is this test file. Production Vite builds must not pull
 * any pacing code into dist/.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateBeatTiming,
  classifyFlowChannel,
  type FlowChannel,
} from 'open-loop-sim';
import {
  producers as cfProducers,
  upgrades as cfUpgrades,
  achievements as cfAchievements,
} from '@/modules/mods/cookie-factory/content';
import {
  producers as ccProducers,
  upgrades as ccUpgrades,
  achievements as ccAchievements,
} from '@/modules/mods/cc-authentic/content';
import type {
  CFProducerDef,
  CFUpgradeDef,
  CFAchievementDef,
} from '@/modules/mods/cookie-factory/content';

/**
 * Fold applicable upgrades and achievements into a fully-stacked rate for
 * one producer at a given owned count. Assumes upgrades are fully bought
 * and achievements have triggered if the owned count crosses their
 * threshold — i.e. "the best-case rate at this moment."
 *
 * Mirror of the runtime wiring in installCookieFactoryContent: each
 * upgrade targeting this producer contributes `1 + level * perLevel` as
 * a multiplicative factor (with level = limit for fully-bought), and each
 * triggered achievement contributes its `bonus`.
 */
function stackedRate(
  building: CFProducerDef,
  upgrades: CFUpgradeDef[],
  achievements: CFAchievementDef[],
  owned: number,
): number {
  let rate = building.baseRate;

  // Upgrades targeting this producer, assumed fully bought.
  for (const u of upgrades) {
    if (u.target !== building.id) continue;
    rate *= 1 + u.limit * u.perLevel;
  }

  // Achievements targeting this producer, triggered if owned >= threshold.
  for (const a of achievements) {
    if (a.target !== building.id) continue;
    if (owned >= a.threshold) rate *= a.bonus;
  }

  return rate;
}

/**
 * Owned-count samples. Capped at 25 because this is a *static* check: by
 * owned=50 the 1.15 cost multiplier has compounded beyond any realistic
 * "just-buying-this-tier" window, and idle-producer games route around that
 * via global multipliers from later tiers — context the static fold-in
 * can't see. Live-tick triangulation with full multiplier state is OL-426.
 */
const SAMPLE_OWNED = [1, 10, 25];

/**
 * Acceptable flow channels. Excludes `frustration` (15-60min beats) and
 * `breakdown` (>60min beats) — the real disengagement cliffs. `boredom`
 * (5-15min) is tolerated because top-tier producers genuinely take several
 * minutes per purchase in the mid-game and that's by design.
 */
const ACCEPTABLE_CHANNELS: FlowChannel[] = ['arousal', 'flow', 'flow-upper', 'boredom'];

/**
 * Classify each (producer × owned-count) combination into a flow channel.
 * Returns the channel plus the beat duration in seconds so failures show
 * which producer fell off a cliff and by how much.
 */
function classifyFixture(
  producers: CFProducerDef[],
  upgrades: CFUpgradeDef[],
  achievements: CFAchievementDef[],
): Array<{
  producer: string;
  owned: number;
  beatSeconds: number;
  channel: FlowChannel;
}> {
  const rows: Array<{
    producer: string;
    owned: number;
    beatSeconds: number;
    channel: FlowChannel;
  }> = [];

  for (const p of producers) {
    for (const owned of SAMPLE_OWNED) {
      const rate = stackedRate(p, upgrades, achievements, owned);
      const beat = calculateBeatTiming({
        baseCost: p.baseCost,
        costMultiplier: p.costScaling,
        baseProduction: rate,
        quantity: owned,
        level: owned,
      });
      const beatSeconds = beat.toNumber();
      rows.push({
        producer: p.id,
        owned,
        beatSeconds,
        channel: classifyFlowChannel(beatSeconds),
      });
    }
  }

  return rows;
}

function formatRow(row: { producer: string; owned: number; beatSeconds: number; channel: FlowChannel }): string {
  const beatStr = row.beatSeconds.toFixed(2);
  return `  ${row.producer.padEnd(14)} owned=${String(row.owned).padStart(3)} beat=${beatStr.padStart(10)}s  → ${row.channel}`;
}

describe('static pacing — Cookie Factory archetype', () => {
  const rows = classifyFixture(cfProducers, cfUpgrades, cfAchievements);

  it('lands every (producer × owned) sample in an acceptable flow channel', () => {
    const offenders = rows.filter((r) => !ACCEPTABLE_CHANNELS.includes(r.channel));
    if (offenders.length > 0) {
      const lines = [
        'CF pacing check failed — producers off the flow-channel cliff:',
        ...offenders.map(formatRow),
        '',
        'Full CF pacing table:',
        ...rows.map(formatRow),
      ];
      throw new Error(lines.join('\n'));
    }
    expect(offenders).toHaveLength(0);
  });
});

describe('static pacing — cc-authentic (Cookie Clicker fixture)', () => {
  const rows = classifyFixture(ccProducers, ccUpgrades, ccAchievements);

  it('lands every (producer × owned) sample in an acceptable flow channel', () => {
    const offenders = rows.filter((r) => !ACCEPTABLE_CHANNELS.includes(r.channel));
    if (offenders.length > 0) {
      const lines = [
        'cc-authentic pacing check failed — producers off the flow-channel cliff:',
        ...offenders.map(formatRow),
        '',
        'Full cc-authentic pacing table:',
        ...rows.map(formatRow),
      ];
      throw new Error(lines.join('\n'));
    }
    expect(offenders).toHaveLength(0);
  });
});

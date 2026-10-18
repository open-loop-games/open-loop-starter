/**
 * The arc runner: plays the whole career under the reference player (`_game.ts`) and
 * prints when each beat fired, beside the spine's landmarks. Each contract gets up to two
 * attempts; a loss resets and replays it.
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/skirmish/balance/arc-probe.ts
 */
import { toNumber } from '@open-loop/engine';
import { runUntil } from '@open-loop/engine/harness';
import { CONTRACTS, DISTRICTS, PLAYER_PERSONA } from '../data/contracts';
import { UNIT_KINDS } from '../data/units';
import { describeSpine, landmarks } from '../data/spine';
import { readyUnits } from '../modules/orders';
import { PRESENCE, countsOf, total } from '../modules/battle';
import { hustlersPay } from '../modules/policy';
import type { Side } from '../modules/side';
import { MAX_MATCH_S, TICK, buildGame } from './_game';

// The cell carries no Node typings; the probe runs under vite-node.
declare const process: { exit(code: number): never };

const game = buildGame();
const { match, career, automation: auto } = game;

console.log('── Spine ──');
for (const [k, v] of Object.entries(describeSpine()))
  console.log(`  ${k.padEnd(22)} ${v.toFixed(3)}`);
console.log('── Spine landmarks (equal economy) ──');
for (const l of landmarks()) console.log(`  ${String(l.predictedS).padStart(5)}s  ${l.beat}`);

function armySize(s: Side): number {
  let n = 0;
  for (const k of UNIT_KINDS) {
    n += toNumber(s.reserve[k].value);
    for (const sq of s.squads) n += toNumber(sq[k].value);
  }
  return n;
}

function buildings(s: Side): number {
  return s.barracks.getAll().reduce((sum, e) => sum + toNumber(e.producer.count.value), 0);
}

function check(label: string, v: number): void {
  if (!Number.isFinite(v)) throw new Error(`${label} is ${v} at match second ${match.clock.value}`);
}

function playMatch(contractIdx: number, attempt: number): 'won' | 'lost' | 'stalled' {
  const c = CONTRACTS[contractIdx];
  console.log(
    `\n── Contract ${contractIdx + 1}: ${c.rival} (${c.outfit}), income ×${c.incomeMult}, attempt ${attempt} ──`,
  );
  match.start();
  const beats = new Map<string, number>();
  const beat = (name: string, cond: boolean) => {
    if (cond && !beats.has(name)) beats.set(name, match.clock.value);
  };
  const { p, e } = match;
  let peakArmyP = 0;
  let peakArmyE = 0;
  const run = runUntil({
    engine: game.engine,
    tickDelta: TICK,
    maxSimTime: MAX_MATCH_S,
    until: () => {
      for (const s of [p, e]) {
        check(`${s.id} scrip`, toNumber(s.scrip.value));
        check(`${s.id} hq`, toNumber(s.hq.value));
        check(`${s.id} army`, armySize(s));
      }
      const hustlers = toNumber(p.econ.getProducer('hustler')!.count.value);
      beat('first hustler bought', hustlers > 5);
      beat('first ley tap', toNumber(p.econ.getProducer('ley-tap')!.count.value) > 0);
      beat('first training building', buildings(p) > 0);
      beat('first unit trained', UNIT_KINDS.some((k) => readyUnits(p, k) > 0) || armySize(p) >= 1);
      for (const b of p.barracks.getAll())
        beat(`${b.def.name} built`, toNumber(b.producer.count.value) > 0);
      for (const r of p.research.getAll())
        beat(`research: ${r.def.name}`, r.purchasable.active.value);
      beat(
        'supply cap binds (a converter limited by room)',
        match.clock.value > 0 &&
          p.barracks.getAll().some((b) => b.producer.limit?.value === 'room'),
      );
      beat('first squat', toNumber(p.squats.count.value) > 0);
      beat(
        'first clash',
        DISTRICTS.some(
          (_, i) =>
            total(countsOf(p.squads[i])) > PRESENCE && total(countsOf(e.squads[i])) > PRESENCE,
        ),
      );
      for (let i = 0; i < DISTRICTS.length; i++) {
        beat(`you take ${DISTRICTS[i].name}`, match.control[i].value >= 1);
        beat(`rival takes ${DISTRICTS[i].name}`, match.control[i].value <= -1);
      }
      beat(
        'your first assault on their safehouse',
        toNumber(e.hq.value) < match.tune.hqIntegrity.value,
      );
      beat(
        'rival first assault on your safehouse',
        toNumber(p.hq.value) < match.tune.hqIntegrity.value,
      );
      beat('hustlers plateau (payback past horizon)', !hustlersPay(p, PLAYER_PERSONA));
      peakArmyP = Math.max(peakArmyP, armySize(p));
      peakArmyE = Math.max(peakArmyE, armySize(e));
      return match.phase.value === 'won' || match.phase.value === 'lost';
    },
  });
  const outcome =
    run.terminated === 'predicate' ? (match.phase.value as 'won' | 'lost') : 'stalled';
  beat(`match ends: ${outcome}`, true);
  const sorted = [...beats.entries()].sort((a, b) => a[1] - b[1]);
  for (const [name, t] of sorted) console.log(`  ${t.toFixed(1).padStart(7)}s  ${name}`);
  const fmt = (s: Side) =>
    `hustlers ${toNumber(s.econ.getProducer('hustler')!.count.value)}, taps ${toNumber(s.econ.getProducer('ley-tap')!.count.value)}, ` +
    `buildings ${buildings(s)}, squats ${toNumber(s.squats.count.value)}, supply ${s.supplyUsed().toFixed(1)}/${s.supplyCap.value}, ` +
    `scrip ${toNumber(s.scrip.value).toFixed(0)} (+${s.scripRate().toFixed(1)}/s), hq ${toNumber(s.hq.value).toFixed(0)}`;
  console.log(`  you:   ${fmt(p)}, peak army ${peakArmyP.toFixed(1)}`);
  console.log(`  rival: ${fmt(e)}, peak army ${peakArmyE.toFixed(1)}`);
  console.log(`  control: ${match.control.map((c) => c.value.toFixed(2)).join(' / ')}`);
  return outcome;
}

const summary: string[] = [];
for (let idx = 0; idx < CONTRACTS.length; idx++) {
  let result: 'won' | 'lost' | 'stalled' = 'lost';
  for (let attempt = 1; attempt <= 2; attempt++) {
    result = playMatch(idx, attempt);
    const seconds = match.clock.value;
    summary.push(
      `${CONTRACTS[idx].rival.padEnd(22)} attempt ${attempt}: ${result} at ${seconds.toFixed(0)}s`,
    );
    match.nextMatch();
    if (result === 'won') break;
  }
  if (result !== 'won') break;
  if (career.contractIndex.value !== Math.min(idx + 1, CONTRACTS.length - 1)) {
    console.log(`  !! career did not advance: contract index ${career.contractIndex.value}`);
  }
}
console.log('\n── Career ──');
for (const s of summary) console.log(`  ${s}`);
console.log(`  wins ${career.wins.value}, tiers unlocked: ${auto.tiers.unlocked.value.join(', ')}`);
process.exit(0);

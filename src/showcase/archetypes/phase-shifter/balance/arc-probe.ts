/**
 * Arc probe — plays the shipping game from a cold start to the closed case
 * under the spine's reference player, and prints when each beat fired beside
 * the spine's prediction. Then checks the one-way lifecycle: at each door the
 * retired verbs refuse and the retired chains read zero, and a save taken
 * mid-phase reloads into the same live set, even into a game past it.
 *
 * The reference player is `_player.ts`'s.
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/phase-shifter/balance/arc-probe.ts
 */
import { Decimal, type DecimalSource, type Engine } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import {
  MECHANISMS,
  PREDICTED_CLERKS,
  PREDICTED_NOTE_BUFFER,
  RECONSTRUCT_LEADS,
  SUSPECTS,
  predictBeats,
} from '../data';
import {
  createPhaseShifterModules,
  getAutomation,
  getBoard,
  getBox,
  getCase,
  getNight,
} from '../modules';
import { createReferencePlayer } from './_player';

/** Wall-seconds per interval the probe feeds the driver. */
const WALL_STEP = 0.5;
const MAX_WALL = 3600;
const STALL_WALL = 600;

const engine: Engine = bootTestEngine({
  modules: [...sharedBase, ...createPhaseShifterModules()],
  persistenceNamespacePrefix: 'phase-shifter-arc',
}).engine;
const kase = getCase();
const { life } = kase;
const box = getBox();
const board = getBoard();
const night = getNight();
const automation = getAutomation();

const num = (x: { value: DecimalSource }) => new Decimal(x.value).toNumber();

/** The lifecycle's derived state: what a load must reproduce. */
function fingerprint(): string {
  const live = MECHANISMS.map((m) => `${m.id}=${life.isLive(m.id).value ? 1 : 0}`).join(' ');
  return [
    `doors=${life.doorsOpened.value}`,
    live,
    `clerkRead=${box.clerkReadRate.value.toFixed(3)}`,
    `strings=${board.rate.value.toFixed(3)}`,
    `tipline=${new Decimal(board.tipline.computedRate.value).toFixed(3)}`,
    `pinned=${board.pins.value.filter(Boolean).length}`,
    `side=${board.side.value}`,
    `hints=${night.hints.value.size}`,
    `plan=${night.plan.value.length}`,
    `running=${night.cycle.running.value}`,
    `speed=${engine.tickDriver.speedMultiplier}`,
  ].join(' | ');
}

const beats: Record<string, { wall: number; sim: number }> = {};
let wall = 0;
let sim = 0;
let lastBeatWall = 0;
const saves: { label: string; data: string; print: string }[] = [];
const checks: string[] = [];
let broken = 0;
night.cycle.on('beforeEnd', () => {
  if (night.broken.value) broken++;
});

function beat(name: string, cond: boolean): void {
  if (cond && !beats[name]) {
    beats[name] = { wall, sim };
    lastBeatWall = wall;
  }
}

const player = createReferencePlayer(WALL_STEP);
let terminated = 'maxWall';
while (wall < MAX_WALL) {
  const { opened, readLast } = player.step();
  for (const door of opened) beat(`door: ${door}`, true);
  if (readLast) beat('last page', true);

  beat('first clerk', num(box.clerk.count) >= 1);
  beat('box empty', num(box.pages) <= 0);
  beat('board 4×4', board.side.value >= 4);
  beat('board 5×5', board.side.value >= 5);
  beat('reconstruct threshold', num(board.leads.cumulative!) >= RECONSTRUCT_LEADS);
  beat('night 1 filed', night.cycle.count.value >= 1);
  beat('clerks plan (tier)', automation.tiers.hasReached('planning'));
  beat('insomnia', night.insomnia.active.value);
  for (let i = 1; i <= SUSPECTS.length; i++) beat(`alibi ${i}`, night.held.value.length >= i);

  if (beats['door: pin-board'] && !checks.some((c) => c.startsWith('I→II'))) {
    checks.push(
      `I→II: read() refused=${!box.read()} clerkRead=${box.clerkReadRate.value.toFixed(2)} ` +
        `clerk hire visible=${box.clerk.visible.value} clerks kept=${num(box.clerk.count)} ` +
        `notes carried=${num(box.notes).toFixed(0)}`,
    );
  }
  if (beats['door: reconstruct'] && !checks.some((c) => c.startsWith('II→III'))) {
    const cell = board.pins.value.findIndex(Boolean);
    checks.push(
      `II→III: unpin refused=${!board.unpin(cell % 6, Math.floor(cell / 6))} ` +
        `strings=${board.rate.value.toFixed(2)} tipline=${new Decimal(board.tipline.computedRate.value).toFixed(2)} ` +
        `wall visible=${board.wall.visible.value} pinned=${board.pins.value.filter(Boolean).length} ` +
        `hints=${night.hints.value.size} inbox=${board.inbox.value.length}`,
    );
  }
  if (beats['door: box-returns'] && !checks.some((c) => c.startsWith('III→IV'))) {
    checks.push(
      `III→IV: toggle refused=${!night.toggle('mill@0')} running=${night.cycle.running.value} ` +
        `roster visible=${night.rosterPlace.visible.value} roster=${night.roster.value}`,
    );
  }
  if (!saves.find((s) => s.label === 'mid II') && beats['board 4×4']) {
    saves.push({ label: 'mid II', data: engine.saveManager!.exportSave(), print: fingerprint() });
  }
  if (!saves.find((s) => s.label === 'mid III') && beats['alibi 2']) {
    saves.push({ label: 'mid III', data: engine.saveManager!.exportSave(), print: fingerprint() });
  }

  if (kase.closed.value) {
    terminated = 'closed';
    break;
  }
  if (wall - lastBeatWall > STALL_WALL) {
    terminated = `stall: no beat for ${STALL_WALL}s`;
    break;
  }

  const speed = engine.tickDriver.speedMultiplier;
  engine.tickDriver.processInterval(WALL_STEP);
  wall += WALL_STEP;
  sim += WALL_STEP * speed;
}

const predicted = predictBeats();
const pad = (s: string, n: number) => s.padEnd(n);
console.log('\nNight Clerk arc probe — the spine’s reference player');
console.log(`terminated: ${terminated} at wall ${wall}s, sim ${sim}s\n`);
console.log(`${pad('beat', 26)}${pad('wall s', 10)}${pad('sim s', 10)}${pad('spine s', 10)}Δ sim`);
for (const [name, t] of Object.entries(beats).sort((a, b) => a[1].wall - b[1].wall)) {
  const p = predicted[name];
  const delta = p === undefined ? '' : `${t.sim - p >= 0 ? '+' : ''}${(t.sim - p).toFixed(0)}`;
  console.log(
    `${pad(name, 26)}${pad(t.wall.toFixed(1), 10)}${pad(t.sim.toFixed(1), 10)}${pad(p === undefined ? '—' : p.toFixed(0), 10)}${delta}`,
  );
}
console.log('\nstate at end:');
console.log(
  `  clerks=${num(box.clerk.count)} board=${board.side.value}×${board.side.value} ` +
    `pinned=${board.pins.value.filter(Boolean).length} strength=${board.strength.value} ` +
    `leads(lifetime)=${num(board.leads.cumulative!).toFixed(0)} nights=${night.cycle.count.value} ` +
    `broken=${broken} roster=${night.roster.value} hints=${night.hints.value.size}`,
);
console.log('\nlifecycle checks:');
for (const c of checks) console.log(`  ${c}`);
console.log(
  `  spine predicted clerks at door=${PREDICTED_CLERKS}, note buffer=${PREDICTED_NOTE_BUFFER.toFixed(0)}`,
);
console.log('\nlast log lines:');
for (const line of kase.log.lines.value.slice(-5)) console.log(`  ${line.text}`);

// Each save is imported into the finished game, so the load runs backwards
// through the doors: the live set must be re-derived from the doors alone.
console.log('\nrestore parity:');
for (const s of saves) {
  engine.saveManager!.importSave(s.data);
  const after = fingerprint();
  console.log(`  ${s.label}: ${after === s.print ? 'match' : 'MISMATCH'}`);
  if (after !== s.print) console.log(`    saved:  ${s.print}\n    loaded: ${after}`);
}
engine.dispose();

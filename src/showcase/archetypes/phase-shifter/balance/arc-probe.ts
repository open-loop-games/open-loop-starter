/**
 * Arc probe — plays the shipping game from a cold start to the closed case
 * under the spine's reference player, and prints when each beat fired beside
 * the spine's prediction. Then checks the one-way lifecycle: at each door the
 * retired verbs refuse and the retired chains read zero, and a save taken
 * mid-phase reloads into the same live set, even into a game past it.
 *
 * The reference player clicks at the anchors' click rate, buys every
 * purchase the moment it is affordable, opens each door the moment its record
 * holds, and works the dawn in the spine's order: witnesses by the filing
 * policy (by hand until the clerks' automation tier opens), then suspects,
 * then insomnia once one has fallen. It ticks through the TickDriver's
 * live path, `processInterval`, so insomnia's game speed applies.
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/phase-shifter/balance/arc-probe.ts
 */
import { Decimal, type DecimalSource, type Engine } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import {
  ANCHORS,
  MECHANISMS,
  PREDICTED_CLERKS,
  PREDICTED_NOTE_BUFFER,
  RECONSTRUCT_LEADS,
  predictBeats,
  type DoorId,
} from '../data';
import {
  createPhaseShifterModules,
  getAutomation,
  getBoard,
  getBox,
  getCase,
  getNight,
} from '../modules';

/** Wall-seconds per interval the probe feeds the driver. */
const WALL_STEP = 0.5;
const MAX_WALL = 3600;
const STALL_WALL = 600;
const DOORS: DoorId[] = ['pin-board', 'reconstruct', 'accuse'];

function build(): Engine {
  return bootTestEngine({
    modules: [...sharedBase, ...createPhaseShifterModules()],
    persistenceNamespacePrefix: 'phase-shifter-arc',
  }).engine;
}

const num = (x: { value: DecimalSource }) => new Decimal(x.value).toNumber();

/** The lifecycle's derived state: what a load must reproduce. */
function fingerprint(engine: Engine): string {
  const { life } = getCase();
  const box = getBox();
  const board = getBoard();
  const night = getNight();
  const live = MECHANISMS.map((m) => `${m.id}=${life.isLive(m.id).value ? 1 : 0}`).join(' ');
  return [
    `doors=${life.doorsOpened.value}`,
    live,
    `clerkRead=${box.clerkReadRate.value.toFixed(3)}`,
    `clerkXref=${board.clerkXrefCapacity.value.toFixed(3)}`,
    `supply=${board.noteSupply.value.toFixed(3)}`,
    `night=${night.rate.value.toFixed(3)}`,
    `running=${night.cycle.running.value}`,
    `speed=${engine.tickDriver.speedMultiplier}`,
  ].join(' | ');
}

const engine = build();
const kase = getCase();
const { life } = kase;
const box = getBox();
const board = getBoard();
const night = getNight();
const automation = getAutomation();

const beats: Record<string, { wall: number; sim: number }> = {};
let wall = 0;
let sim = 0;
let lastBeatWall = 0;
const saves: { label: string; data: string; print: string }[] = [];
const checks: string[] = [];

function beat(name: string, cond: boolean): void {
  if (cond && !beats[name]) {
    beats[name] = { wall, sim };
    lastBeatWall = wall;
  }
}

let clickDebt = 0;
let lastNight = 0;
let terminated = 'maxWall';
while (wall < MAX_WALL) {
  // The reference player.
  clickDebt += ANCHORS.clickRate * WALL_STEP;
  while (clickDebt >= 1) {
    clickDebt -= 1;
    if (!box.read()) board.xref.convert();
  }
  while (box.clerk.canPurchase.value) box.clerk.purchase(1);
  const canvass = board.canvasser.repeatable!;
  while (canvass.canPurchase.value) canvass.purchase(1);
  if (board.secondShift.canPurchase.value) board.secondShift.purchase(1);
  if (night.cycle.count.value !== lastNight) {
    lastNight = night.cycle.count.value;
    if (!automation.tiers.hasReached('filing')) automation.fileAtDawn();
    while (night.eliminate.canPurchase.value) night.eliminate.purchase(1);
    if (num(night.eliminate.count) > 0 && night.insomnia.canPurchase.value) {
      night.insomnia.purchase(1);
    }
  }
  for (const door of DOORS) if (life.open(door)) beat(`door: ${door}`, true);

  beat('first clerk', num(box.clerk.count) >= 1);
  beat('box empty', num(box.pages) <= 0);
  beat('first canvasser', num(canvass.count) >= 1);
  beat('second shift', board.secondShift.active.value);
  beat('reconstruct threshold', num(board.leads.cumulative!) >= RECONSTRUCT_LEADS);
  beat('night 1 filed', night.cycle.count.value >= 1);
  beat('clerks file (tier)', automation.tiers.hasReached('filing'));
  beat('insomnia', night.insomnia.active.value);
  for (let i = 1; i <= ANCHORS.suspects - 1; i++) {
    beat(`elimination ${i}`, num(night.eliminate.count) >= i);
  }

  if (beats['door: pin-board'] && !checks.some((c) => c.startsWith('I→II'))) {
    checks.push(
      `I→II: read() refused=${!box.read()} clerkRead=${box.clerkReadRate.value.toFixed(2)} ` +
        `clerk hire visible=${box.clerk.visible.value} clerks kept=${num(box.clerk.count)} ` +
        `notes carried=${num(box.notes).toFixed(0)}`,
    );
  }
  if (beats['door: reconstruct'] && !checks.some((c) => c.startsWith('II→III'))) {
    checks.push(
      `II→III: xref refused=${Object.keys(board.xref.convert()).length === 0} ` +
        `clerkXref=${board.clerkXrefCapacity.value.toFixed(2)} supply=${board.noteSupply.value.toFixed(2)} ` +
        `canvass visible=${canvass.visible.value} fidelity=${night.fidelity.value.toFixed(3)}`,
    );
  }
  if (
    !saves.find((s) => s.label === 'mid II') &&
    beats['first canvasser'] &&
    wall > beats['first canvasser'].wall + 30
  ) {
    saves.push({
      label: 'mid II',
      data: engine.saveManager!.exportSave(),
      print: fingerprint(engine),
    });
  }
  if (!saves.find((s) => s.label === 'mid III') && beats['elimination 2']) {
    saves.push({
      label: 'mid III',
      data: engine.saveManager!.exportSave(),
      print: fingerprint(engine),
    });
  }

  const bad = [box.pages, box.notes, board.leads, night.unfiled, night.contradictions].find((r) =>
    Number.isNaN(num(r)),
  );
  if (bad) {
    terminated = `NaN in ${bad.id}`;
    break;
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
console.log(`\nNight Clerk arc probe — ${ANCHORS.clickRate} clicks/s, greedy buys, doors at once`);
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
  `  clerks=${num(box.clerk.count)} canvassers=${num(board.canvasser.repeatable!.count)} ` +
    `witnesses=${num(night.witness.repeatable!.count)} nights=${night.cycle.count.value} ` +
    `leads(lifetime)=${num(board.leads.cumulative!).toFixed(0)} fidelity=${night.fidelity.value.toFixed(3)} ` +
    `contradictions=${num(night.contradictions).toFixed(0)}`,
);
console.log('\nlifecycle checks:');
for (const c of checks) console.log(`  ${c}`);
console.log(
  `  spine predicted clerks at door=${PREDICTED_CLERKS}, note buffer=${PREDICTED_NOTE_BUFFER.toFixed(0)}`,
);
console.log('\nlast log lines:');
for (const line of kase.lines.value.slice(-6)) console.log(`  ${line}`);

// Each save is imported into the finished game, so the load runs backwards
// through the doors: the live set must be re-derived from the doors alone.
console.log('\nrestore parity:');
for (const s of saves) {
  engine.saveManager!.importSave(s.data);
  const after = fingerprint(engine);
  console.log(`  ${s.label}: ${after === s.print ? 'match' : 'MISMATCH'}`);
  if (after !== s.print) console.log(`    saved:  ${s.print}\n    loaded: ${after}`);
}
engine.dispose();

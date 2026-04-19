/**
 * Scripter archetype — default vars.
 *
 * Baseline values a fresh Scripter-archetype game starts with. Mirrors
 * the defaults called out in archetypes/scripter.md § 5 and the content
 * sketch in § 8. Balance baseline tuned to the 1–2h first-completion
 * arc: first queue authored by ~3 min, first conditional by ~20 min,
 * first unattended run by ~35 min, tier-2 text DSL unlock by ~55 min,
 * first multi-step DSL script by ~80 min, prestige-adjacent milestone
 * at ~110 min.
 *
 * Defaults lean on the Antimatter Dimensions Automator shape —
 * tierCeiling 'dsl' with a text-first authoring surface, 12 tier-1
 * commands and 24 tier-2 commands, 5 script slots, single-agent
 * scheduling. Bitburner-shape forks raise tierCeiling to 'meta' and
 * crank concurrentScripts; Cavernous-II-shape forks drop tierCeiling
 * to 'queue' and set authoringSurface to 'visual-blocks'.
 */
import type {
  ScripterActionTiming,
  ScripterArchetypeVars,
  ScripterBalanceVars,
  ScripterCommandName,
  ScripterThemeVars,
  ScripterVars,
} from './types';

export const DEFAULT_SCRIPTER_ARCHETYPE_VARS: ScripterArchetypeVars = {
  tierCeiling: 'dsl',
  authoringSurface: 'text',

  commandCount: 12,
  tier2CommandCount: 24,
  tier3CommandCount: 0,

  scriptSlotCount: 5,
  persistAcrossPrestige: true,

  concurrentScripts: 1,
  safetyMode: 'strict',
};

const DEFAULT_ACTION_TIMINGS: Record<string, ScripterActionTiming> = {
  buy: {
    baseDuration: 1,
    costs: { money: '10' },
    yield: { purchasables: '1' },
  },
  sell: {
    baseDuration: 1,
    costs: {},
    yield: { money: '5' },
  },
  wait: {
    baseDuration: 5,
    costs: {},
  },
  waitUntil: {
    baseDuration: 0,
    costs: {},
  },
  prestige: {
    baseDuration: 30,
    costs: {},
    yield: { augmentations: '1' },
  },
  click: {
    baseDuration: 0.5,
    costs: {},
    yield: { money: '1' },
  },
  toggle: {
    baseDuration: 0.2,
    costs: {},
  },
  set: {
    baseDuration: 0.1,
    costs: {},
  },
  increment: {
    baseDuration: 0.1,
    costs: {},
  },
  log: {
    baseDuration: 0.05,
    costs: {},
  },
  halt: {
    baseDuration: 0,
    costs: {},
  },
  noop: {
    baseDuration: 0,
    costs: {},
  },
};

export const DEFAULT_SCRIPTER_BALANCE_VARS: ScripterBalanceVars = {
  tier2UnlockThreshold: {
    trigger: 'action-count',
    value: '200',
  },

  actionTimings: DEFAULT_ACTION_TIMINGS,

  maxIterationsPerFrame: 10_000,
  maxLoopDepth: 10,
  maxScriptRuntimeMs: 5_000,
  maxConcurrentActions: 1,

  augmentationCurve: {
    exponent: 0.75,
    divisor: 20,
  },
  augmentationCostScaling: {
    baseCost: '100',
    costGrowth: 1.5,
  },

  scriptEfficiencyBonus: {
    perStatementBonus: 0.002,
    perUniqueCommandBonus: 0.05,
    efficiencyCap: 3.0,
  },
};

const DEFAULT_COMMAND_NAMES: ScripterCommandName[] = [
  { id: 'buy', label: 'buy', description: 'Purchase a producer or upgrade.', tier: 1 },
  { id: 'sell', label: 'sell', description: 'Liquidate a holding back to the primary resource.', tier: 1 },
  { id: 'wait', label: 'wait', description: 'Pause execution for a duration.', tier: 1 },
  { id: 'waitUntil', label: 'waitUntil', description: 'Pause until a resource threshold is met.', tier: 1 },
  { id: 'prestige', label: 'prestige', description: 'Trigger the prestige reset flow.', tier: 1 },
  { id: 'click', label: 'click', description: 'Dispatch the baseline clicker action.', tier: 1 },
  { id: 'toggle', label: 'toggle', description: 'Flip a named boolean flag.', tier: 1 },
  { id: 'set', label: 'set', description: 'Assign a value to a named slot.', tier: 1 },
  { id: 'increment', label: 'increment', description: 'Add to a named counter.', tier: 1 },
  { id: 'log', label: 'log', description: 'Emit a line to the execution log.', tier: 1 },
  { id: 'halt', label: 'halt', description: 'Stop script execution.', tier: 1 },
  { id: 'noop', label: 'noop', description: 'No-op; useful as a queue placeholder.', tier: 1 },

  { id: 'if', label: 'if', description: 'Conditional branch; evaluates a predicate.', tier: 2 },
  { id: 'while', label: 'while', description: 'Conditional loop; re-evaluates each iteration.', tier: 2 },
  { id: 'for', label: 'for', description: 'Counted loop with an iteration variable.', tier: 2 },
  { id: 'function', label: 'function', description: 'Declare a reusable command body.', tier: 2 },
  { id: 'let', label: 'let', description: 'Declare a script-local variable.', tier: 2 },
  { id: 'const', label: 'const', description: 'Declare a script-local constant.', tier: 2 },
  { id: 'break', label: 'break', description: 'Exit the current loop.', tier: 2 },
  { id: 'continue', label: 'continue', description: 'Skip to the next loop iteration.', tier: 2 },
  { id: 'await', label: 'await', description: 'Yield execution until a promise resolves.', tier: 2 },
  { id: 'sleep', label: 'sleep', description: 'Async pause; does not hold the main thread.', tier: 2 },
  { id: 'trace', label: 'trace', description: 'Emit a structured trace event for inspection.', tier: 2 },
  { id: 'get', label: 'get', description: 'Read-only query on a named resource or counter.', tier: 2 },
  { id: 'max', label: 'max', description: 'Aggregate query — maximum across a set.', tier: 2 },
  { id: 'afford', label: 'afford', description: 'Predicate — can the player afford a named cost?', tier: 2 },
  { id: 'add', label: 'add', description: 'Arithmetic add operator (script-local).', tier: 2 },
  { id: 'sub', label: 'sub', description: 'Arithmetic subtract operator.', tier: 2 },
  { id: 'mul', label: 'mul', description: 'Arithmetic multiply operator.', tier: 2 },
  { id: 'div', label: 'div', description: 'Arithmetic divide operator.', tier: 2 },
  { id: 'eq', label: 'eq', description: 'Comparison — equality.', tier: 2 },
  { id: 'lt', label: 'lt', description: 'Comparison — less-than.', tier: 2 },
  { id: 'gt', label: 'gt', description: 'Comparison — greater-than.', tier: 2 },
  { id: 'and', label: 'and', description: 'Logical AND.', tier: 2 },
  { id: 'or', label: 'or', description: 'Logical OR.', tier: 2 },
  { id: 'not', label: 'not', description: 'Logical NOT.', tier: 2 },
];

/**
 * Reference theme — neutral naming for the stubbed skeleton. Real games
 * override wholesale (see archetypes/scripter.md § 11 for theme
 * variants: hacker sandbox, alchemical grimoire, space-station
 * operator, autonomous gardener).
 */
export const DEFAULT_SCRIPTER_THEME_VARS: ScripterThemeVars = {
  commandNames: DEFAULT_COMMAND_NAMES,
  dslKeywords: {
    if: 'if',
    while: 'while',
    for: 'for',
    function: 'function',
    let: 'let',
    const: 'const',
    break: 'break',
    continue: 'continue',
    await: 'await',
    sleep: 'sleep',
  },
  runVerb: 'run',
  editorLabel: 'Script Editor',
  endOfArcMessage: 'Arc complete.',
};

export const DEFAULT_SCRIPTER_VARS: ScripterVars = {
  archetype: DEFAULT_SCRIPTER_ARCHETYPE_VARS,
  theme: DEFAULT_SCRIPTER_THEME_VARS,
  balance: DEFAULT_SCRIPTER_BALANCE_VARS,
};

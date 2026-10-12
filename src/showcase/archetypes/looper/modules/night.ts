import {
  addResource,
  computed,
  createActionCategory,
  createCycle,
  createCycleLog,
  createMultiplicativeModifier,
  createResource,
  createSkillCategory,
  Decimal,
  Formula,
  persistent,
  ref,
  tunable,
  type ActionCategory,
  type ComputedRef,
  type Cycle,
  type CycleLog,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Ref,
  type Resource,
  type SkillCategory,
  type StartResult,
} from '@open-loop/engine';
import {
  ACTIONS,
  COFFEE_NERVE,
  ESCAPE_DEPTH,
  HAMPER_NERVE,
  intelForDepth,
  MASTERY_KNEE,
  MASTERY_PER_LEVEL,
  NERVE_PER_LEVEL,
  NIGHT_SECONDS,
  SKILLS,
  TALENT_PER_LEVEL,
  XP_PER_LEVEL_SQ,
  ZONES,
  type ActionDef,
  type ItemId,
  type SkillDef,
  type SkillId,
} from '../data';
import { MetaKey } from './meta';
import { LooperTuningRegistryKey } from './tuning';

/**
 * Night module — one run. Nerve is the run budget, drained by the night's own
 * clock. The action list executes the plan. Every second of work trains the
 * skills it leans on, in two tiers: talent, which this night keeps, and mastery,
 * which banks at the night's end. The cycle ends the night on empty Nerve, on
 * the wall, or on turning in, and resets this module.
 */

/** Which plan row an enqueued execution came from — lets the UI fold the list back onto the plan. */
export interface RowPayload {
  row: number;
}

export interface ActionState {
  /** completions this night */
  done: Persistent<number>;
}

/** What the night left behind, shown between nights and kept for the next night's diff. */
export interface NightSummary {
  night: number;
  depth: number;
  escaped: boolean;
  /** night-seconds survived */
  seconds: number;
  /** base-seconds of progress delivered */
  work: number;
  intel: number;
  /** mastery bonus gained this night, per skill */
  mastery: Record<string, number>;
  splits: Record<string, number>;
  /** how the night ended */
  cause: 'nerve' | 'escape' | 'turned-in';
}

export interface NightApi {
  nerve: Resource<DecimalSource>;
  /** highest Nerve this night has held: its start, or a refill above it */
  nerveCap: Persistent<number>;
  maxNerve: ComputedRef<number>;
  items: Record<ItemId, Resource<DecimalSource>>;
  /** deepest landmark reached this night */
  depth: Persistent<number>;
  /** night-seconds at which each landmark fell, keyed by depth */
  splits: Persistent<Record<string, number>>;
  /** base-seconds of progress delivered this night */
  work: Persistent<number>;
  nightActive: Persistent<boolean>;
  /** set once something has decided the night ends: 'escape' or 'turned-in' */
  nightOver: Persistent<string>;
  /** the plan this night was enqueued from, serialized */
  planStamp: Persistent<string>;
  talent: SkillCategory<SkillDef>;
  mastery: SkillCategory<SkillDef>;
  /** talent × (1 + mastery) for one skill */
  skillSpeed(id: SkillId): number;
  actions: ActionCategory<ActionDef, ActionState, RowPayload>;
  actionSeconds(id: string): number;
  actionSpeed(id: string): number;
  cycle: Cycle;
  log: CycleLog;
  /** nothing running, nothing held, cursor past the last planned action */
  planExhausted: ComputedRef<boolean>;
  lastNight: Ref<NightSummary | null>;
  /** game-seconds since the last night ended; Routine's dwell reads it */
  sinceNightEnded: Ref<number>;
  beginNight(): boolean;
  turnIn(): boolean;
}

export const NightKey: InjectionKey<NightApi> = Symbol('looper/night') as InjectionKey<NightApi>;

let api: NightApi;

export function getNight(): NightApi {
  return api;
}

export function createNightModule(): EngineModule {
  return {
    id: 'looper/night',
    dependencies: ['looper/tuning', 'looper/meta'],
    install(ctx) {
      const registry = ctx.inject(LooperTuningRegistryKey);
      const meta = ctx.inject(MetaKey);

      const nerve = createResource<DecimalSource>(NIGHT_SECONDS, {
        id: 'nerve',
        displayName: 'Nerve',
        decimals: 1,
      });
      const items: Record<ItemId, Resource<DecimalSource>> = {
        picks: createResource<DecimalSource>(0, { id: 'picks', displayName: 'Wire picks' }),
        smokes: createResource<DecimalSource>(0, { id: 'smokes', displayName: 'Smokes' }),
        keycard: createResource<DecimalSource>(0, { id: 'keycard', displayName: 'Keycard' }),
        fence: createResource<DecimalSource>(0, { id: 'fence', displayName: 'Fence cut' }),
      };
      const nightActive = persistent(false, { id: 'nightActive' });
      const depth = persistent(0, { id: 'depth' });
      const splits = persistent<Record<string, number>>({}, { id: 'splits' });
      const work = persistent(0, { id: 'work' });
      const nerveCap = persistent(NIGHT_SECONDS, { id: 'nerveCap' });
      const planStamp = persistent('', { id: 'planStamp' });
      const nightOver = persistent('', { id: 'nightOver' });
      const lastNight = ref<NightSummary | null>(null);
      const sinceNightEnded = ref(Infinity);

      const nightSeconds = tunable(registry, 'nerve/base', () => NIGHT_SECONDS);
      const nervePerLevel = tunable(
        registry,
        'notes/steel-nerves/nervePerLevel',
        () => NERVE_PER_LEVEL,
      );
      const refill = {
        coffee: tunable(registry, 'nerve/coffee', () => COFFEE_NERVE),
        hamper: tunable(registry, 'nerve/hamper', () => HAMPER_NERVE),
      };
      const maxNerve = computed(
        () => nightSeconds.value + nervePerLevel.value * meta.owned('steel-nerves'),
      );

      // === SKILLS: the parallel track, two tiers per skill ===
      const xpPerLevelSq = tunable(registry, 'skills/xpPerLevelSq', () => XP_PER_LEVEL_SQ);
      const talentPerLevel = tunable(registry, 'skills/talentPerLevel', () => TALENT_PER_LEVEL);
      const masteryPerLevel = tunable(registry, 'skills/masteryPerLevel', () => MASTERY_PER_LEVEL);
      const masteryKnee = tunable(registry, 'skills/masteryKnee', () => MASTERY_KNEE);
      const xpToLevel = (xp: Ref<DecimalSource> | DecimalSource) =>
        Formula.variable(xp).div(xpPerLevelSq).sqrt().floor();
      // Talent: this night's level, multiplying speed by 1 + α·L. Its xp resets with the night.
      const talent = createSkillCategory<SkillDef>({
        id: 'looper-talent',
        mapSkill: () => ({
          xpToLevel,
          levelToMultiplier: (level) => Formula.variable(level).mul(talentPerLevel).add(1),
        }),
      });
      // Mastery: the same xp, banked at the night's end through a softcap —
      // linear to the knee, square root past it. Its lifetimeBonus survives the reset.
      const mastery = createSkillCategory<SkillDef>({
        id: 'looper-mastery',
        mapSkill: () => ({
          xpToLevel,
          retentionFormula: (level) =>
            Formula.step(Formula.variable(level), masteryKnee, (x) => x.sqrt()).mul(
              masteryPerLevel,
            ),
        }),
      });
      talent.register(SKILLS);
      mastery.register(SKILLS);
      const skillMult = Object.fromEntries(
        SKILLS.map((s) => [
          s.id,
          computed(() =>
            new Decimal(talent.getModifier(s.id)!.apply(1))
              .mul(mastery.getModifier(s.id)!.apply(1))
              .toNumber(),
          ),
        ]),
      ) as Record<SkillId, ComputedRef<number>>;

      // === ACTIONS: the authored plan, executed ===
      const seconds = Object.fromEntries(
        ACTIONS.map((a) => [
          a.id,
          tunable(registry, `actions/${a.id}/seconds`, () => a.baseSeconds),
        ]),
      );

      function holds(need: Partial<Record<ItemId, number>> | undefined): boolean {
        if (!need) return true;
        return Object.entries(need).every(([item, n]) =>
          Decimal.gte(items[item as ItemId].value, n as number),
        );
      }
      function runnable(def: ActionDef, state: ActionState): StartResult {
        if (def.zone > depth.value) return 'never';
        if (def.limit !== undefined && state.done.value >= def.limit) return 'never';
        if (!holds(def.needs) || !holds(def.consumes)) return 'never';
        return 'now';
      }
      function finish(def: ActionDef, state: ActionState): void {
        state.done.value++;
        for (const [item, n] of Object.entries(def.consumes ?? {}))
          items[item as ItemId].value = Decimal.sub(items[item as ItemId].value, n as number);
        for (const [item, n] of Object.entries(def.gives ?? {}))
          addResource(items[item as ItemId], n as number);
        if (def.nerve) {
          addResource(nerve, refill[def.nerve].value);
          nerveCap.value = Math.max(nerveCap.value, new Decimal(nerve.value).toNumber());
        }
        if (def.opens !== undefined && def.opens > depth.value) {
          depth.value = def.opens;
          splits.value = { ...splits.value, [def.opens]: cycle.elapsed.value };
          if (def.opens < ZONES.length) meta.zones.unlock(ZONES[def.opens].id);
          if (def.opens === ESCAPE_DEPTH) nightOver.value = 'escape';
        }
      }

      const actions: ActionCategory<ActionDef, ActionState, RowPayload> = createActionCategory<
        ActionDef,
        ActionState,
        RowPayload
      >({
        id: 'looper-night-actions',
        mode: 'list',
        startOnEnqueue: false,
        registerTick: ctx.onTick,
        mapState: () => ({ done: persistent(0, { id: 'done' }) }),
        mapAction: (def) => ({
          rateChain: true,
          signals: {
            active: computed(() => meta.zones.isUnlocked(ZONES[def.zone].id)),
            count: computed(() => actions.getState(def.id)?.done.value ?? 0),
          },
          canStart: (entry) => runnable(def, entry.state),
          tick: ({ entry, dt, category }) => {
            if (!cycle.running.value) return;
            const step = dt * new Decimal(entry.rateChain!.apply(1)).toNumber();
            category.tickItemProgress(def.id, step);
            work.value += step;
            // TODO(expansion): one xp stream feeds both skill tiers by hand — the
            // dual-tier composition is two categories with two xp stores.
            for (const [skill, w] of Object.entries(def.weights)) {
              talent.addXp(skill, step * (w as number));
              mastery.addXp(skill, step * (w as number));
            }
            if ((category.currentItem!.progress as number) >= seconds[def.id].value) {
              finish(def, entry.state);
              category.sequencer.complete();
            }
          },
        }),
      });
      actions.register(ACTIONS);

      // Per-action duration: base ÷ (Π skillᵂ × the global speed stack).
      // TODO(expansion): a weighted geometric product of skill multipliers is
      // bound term by term onto each rate chain; neither ActionCategory nor
      // SkillCategory takes a per-action weight vector.
      for (const def of ACTIONS) {
        const chain = actions.getRateChain(def.id)!;
        for (const [skill, w] of Object.entries(def.weights)) {
          chain.bind({
            text: `${def.id}/${skill}`,
            modifier: createMultiplicativeModifier({
              multiplier: computed(() => skillMult[skill as SkillId].value ** (w as number)),
              description: `${skill} ^${w}`,
            }),
          });
        }
        chain.bind({ text: `${def.id}/speed`, modifier: meta.speedChain });
      }

      const planExhausted = computed(
        () =>
          nightActive.value &&
          actions.sequencer.currentItem === null &&
          !actions.sequencer.holding &&
          actions.sequencer.cursor >= actions.sequencer.items.value.length,
      );

      // === NERVE: drains with in-night time ===
      // TODO(expansion): a run budget — a resource drained by the cycle's own
      // clock, ending the cycle at zero — is hand-wired from onTick plus
      // createCycle's endCondition; Cycle has no budget field.
      ctx.onTick((dt) => {
        if (!cycle.running.value || !nightActive.value) return;
        nerve.value = Decimal.max(0, Decimal.sub(nerve.value, dt));
      });

      // === THE NIGHT: ends on empty Nerve, an escape, or turning in ===
      let pendingIntel = 0;
      let pendingCause: NightSummary['cause'] = 'nerve';
      const masteryBefore: Record<string, number> = {};
      const masteryNow = (id: string) =>
        new Decimal(mastery.getSkill(id)!.lifetimeBonus!.value).toNumber();

      const cycle = createCycle({
        endCondition: () => nightOver.value !== '' || Decimal.lte(nerve.value, 0),
        resetPersistentContexts: ['looper/night'],
        onBeforeEnd: () => {
          if (!nightActive.value) return false;
          pendingCause = (nightOver.value || 'nerve') as NightSummary['cause'];
          pendingIntel = 0;
          for (let d = 1; d <= depth.value; d++) pendingIntel += intelForDepth(d);
          for (const s of SKILLS) {
            masteryBefore[s.id] = masteryNow(s.id);
            mastery.getSkill(s.id)!.accumulateBonus!();
          }
          // TODO(expansion): per-landmark best splits are a lowest-wins best-of;
          // createBestOf ranks only the highest delta, so a min-time record per key
          // is hand-rolled here.
          const best = { ...meta.bestSplits.value };
          for (const [k, t] of Object.entries(splits.value))
            if (!(k in best) || t < best[k]) best[k] = t;
          meta.bestSplits.value = best;
          meta.lastSplits.value = { ...splits.value };
          if (pendingCause === 'escape') meta.escapes.value++;
          log.annotate('summary', {
            night: cycle.count.value + 1,
            depth: depth.value,
            escaped: pendingCause === 'escape',
            seconds: cycle.elapsed.value,
            work: work.value,
            intel: pendingIntel,
            mastery: Object.fromEntries(
              SKILLS.map((s) => [s.id, masteryNow(s.id) - masteryBefore[s.id]]),
            ),
            splits: { ...splits.value },
            cause: pendingCause,
          } satisfies NightSummary);
        },
        registerTick: ctx.onTick,
      });
      const log = createCycleLog({
        cycle,
        metrics: Object.fromEntries(SKILLS.map((s) => [s.id, () => masteryNow(s.id)])),
        maxLogs: 12,
      });
      log.on('finalized', (entry) => {
        lastNight.value = entry.annotations.summary as NightSummary;
      });
      // The night dwells between runs: a cycle restarts at once, so the restart
      // is paused here and the next night begins by hand or by Routine.
      cycle.on('afterEnd', () => {
        // Outside the reset's settle guard, so the take reaches Intel's lifetime total.
        addResource(meta.intel, pendingIntel);
        cycle.pause();
        nerve.value = maxNerve.value;
        sinceNightEnded.value = 0;
      });

      ctx.onLoad(() => {
        if (nightActive.value) cycle.resume();
      });

      function beginNight(): boolean {
        if (nightActive.value) return false;
        nerve.value = maxNerve.value;
        nerveCap.value = maxNerve.value;
        actions.sequencer.clear();
        // TODO(expansion): the plan's repeat counts are expanded into list items at
        // night start, each tagged with its row so the UI can fold them back.
        meta.plan.value.forEach((row, i) => {
          for (let k = 0; k < row.times; k++) actions.enqueue(row.id, { payload: { row: i } });
        });
        planStamp.value = JSON.stringify(meta.plan.value);
        nightActive.value = true;
        cycle.resume();
        actions.sequencer.start();
        return true;
      }
      function turnIn(): boolean {
        if (!nightActive.value) return false;
        nightOver.value = 'turned-in';
        return cycle.end();
      }

      api = {
        nerve,
        nerveCap,
        maxNerve,
        items,
        depth,
        splits,
        work,
        nightActive,
        nightOver,
        planStamp,
        talent,
        mastery,
        skillSpeed: (id) => skillMult[id].value,
        actions,
        actionSeconds: (id) => seconds[id].value,
        actionSpeed: (id) => new Decimal(actions.getRateChain(id)!.apply(1)).toNumber(),
        cycle,
        log,
        planExhausted,
        lastNight,
        sinceNightEnded,
        beginNight,
        turnIn,
      };
      ctx.provide(NightKey, api);
    },
  };
}

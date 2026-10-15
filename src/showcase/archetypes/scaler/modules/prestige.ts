import {
  Decimal,
  addResource,
  computed,
  createChallengeCategory,
  createReset,
  integerRoot,
  replacementGrants,
  type ChallengeCategory,
  type ChallengeDef,
  type ComputedRef,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Reset,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import {
  AGE_KEEPS,
  ANCHORS,
  ELSEWORLDS,
  ELSEWORLD_LEVERS,
  ELSEWORLD_TIERS,
  LEVERS,
  REBOOT_THRESHOLD,
  REWRITE_THRESHOLD,
  ageGate,
  ageName,
  type ElseworldDef,
  type ElseworldId,
} from '../data';
import { CoreKey } from './core';
import { RunKey } from './run';
import { LegacyKey } from './legacy';
import { ContinuityKey } from './continuity';
import { CanonKey } from './canon';

/**
 * The three prestige layers and the graded runs inside the first.
 *
 *   - Reboot the Timeline: wipe the run, bank ⌊∛(Justice earned / threshold)⌋
 *     Legacy, times the Legacy-gain chain.
 *   - Rewrite the Multiverse: wipe the run and Legacy with its shop and the
 *     Network, bank ⌊√(Legacy earned / threshold)⌋ Continuity, times the
 *     Continuity-gain chain. Eternal Dispatch keeps two upgrades through it.
 *   - Turn the Age: once Continuity earned this Age meets the Age's gate, wipe
 *     everything below and the Earths, bank ⌊scale · (Continuity earned / first
 *     gate)^(1/degree)⌋ Canon. The Age keeps the automation and the Archives.
 *   - Elseworlds: a timeline under a worse rule, entered by a Reboot and resolved
 *     by reaching its tier's goal; each resolution adds to its permanent reward.
 */

export type ElseworldChallengeDef = ElseworldDef & ChallengeDef;

export interface PrestigeApi {
  rebootReset: Reset;
  rewriteReset: Reset;
  ageReset: Reset;
  /** Legacy a Reboot would bank now. */
  pendingLegacy: ComputedRef<Decimal>;
  /** What the Legacy-gain chain multiplies each Reboot's Legacy by. */
  legacyGain: ComputedRef<Decimal>;
  /** Justice earned this timeline at which pending Legacy ticks up by one. */
  nextLegacyAt: ComputedRef<Decimal>;
  /** Continuity a Rewrite would bank now. */
  pendingContinuity: ComputedRef<Decimal>;
  /** Canon a Turn of the Age would bank now. */
  pendingCanon: ComputedRef<Decimal>;
  /** Continuity earned this Age that opens the next Age. */
  ageGate: ComputedRef<number>;
  elseworlds: ChallengeCategory<ElseworldChallengeDef>;
  /** Completions each Elseworld allows now: 2, 4 with the Archives, 5 with Canonical Elseworlds. */
  elseworldCap: ComputedRef<number>;
  /** Reboot the timeline, abandoning any Elseworld; false when nothing is pending. */
  reboot(): boolean;
  /** Rewrite the multiverse; false when nothing is pending. */
  rewrite(): boolean;
  /** Turn the Age; false when the gate is not met. */
  turnAge(): boolean;
  enterElseworld(id: ElseworldId): boolean;
  abandonElseworld(): void;
}

export const PrestigeKey: InjectionKey<PrestigeApi> = Symbol(
  'scaler/prestige',
) as InjectionKey<PrestigeApi>;

const prestigeApi = createModuleApi(PrestigeKey);
export const getPrestige = prestigeApi.get;

export const ELSEWORLDS_CATEGORY = 'elseworlds';

export function createPrestigeModule(): EngineModule {
  return {
    id: 'scaler/prestige',
    dependencies: [
      'scaler/core',
      'scaler/run',
      'scaler/legacy',
      'scaler/continuity',
      'scaler/canon',
    ],
    install(ctx) {
      const core = ctx.inject(CoreKey);
      const run = ctx.inject(RunKey);
      const legacy = ctx.inject(LegacyKey);
      const continuity = ctx.inject(ContinuityKey);
      const canon = ctx.inject(CanonKey);

      const legacyGain = computed(() => Decimal.fromValue(core.legacyGain.apply(1)));
      const pendingLegacy = computed(() => {
        const earned = run.runEarned.value;
        if (Decimal.lt(earned, REBOOT_THRESHOLD)) return Decimal.dZero;
        // ⌊g · ∛(earned/T)⌋ = ⌊∛(earned · g³ / T)⌋, floored exactly by integerRoot.
        return integerRoot(
          Decimal.div(earned, REBOOT_THRESHOLD).mul(legacyGain.value.pow(ANCHORS.payoutDegree)),
          ANCHORS.payoutDegree,
        );
      });
      const nextLegacyAt = computed(() =>
        Decimal.add(pendingLegacy.value, 1)
          .div(legacyGain.value)
          .pow(ANCHORS.payoutDegree)
          .mul(REBOOT_THRESHOLD)
          .max(REBOOT_THRESHOLD),
      );
      const pendingContinuity = computed(() => {
        if (Decimal.lt(legacy.legacyEarned.value, REWRITE_THRESHOLD)) return Decimal.dZero;
        const gain = Decimal.fromValue(core.continuityGain.apply(1));
        return integerRoot(
          Decimal.div(legacy.legacyEarned.value, REWRITE_THRESHOLD).mul(
            gain.pow(ANCHORS.continuityDegree),
          ),
          ANCHORS.continuityDegree,
        );
      });
      const gate = computed(() => ageGate(core.ages.value));
      const pendingCanon = computed(() => {
        const earned = continuity.continuityEarned.value;
        if (Decimal.lt(earned, gate.value)) return Decimal.dZero;
        return integerRoot(
          Decimal.div(earned, ageGate(0)).mul(Decimal.pow(LEVERS.canonScale, LEVERS.canonDegree)),
          LEVERS.canonDegree,
        );
      });

      const rebootReset = createReset({ resetPersistentContexts: ['scaler/run'] });

      // Eternal Dispatch is the conditional keep-set: the two upgrades it names
      // survive the wipe only while it is owned. Ownership is read before each wipe
      // starts, because an Age wipes Eternal Dispatch too and restores it from its
      // own keep-set.
      let eternal = false;
      const latchEternal = () => {
        eternal = continuity.upgrade('eternal-dispatch').active.value;
      };
      const keepIfEternal = (v: DecimalSource) => (eternal ? v : 0);
      const eternalKeeps = () =>
        new Map([
          [legacy.upgrade('dispatch').count, keepIfEternal],
          [legacy.upgrade('elseworld-protocols').count, keepIfEternal],
        ]);
      const rewriteReset = createReset({
        resetPersistentContexts: [rebootReset, 'scaler/legacy'],
        retain: eternalKeeps(),
      });
      rewriteReset.on('beforeReset', latchEternal);

      // A reset named in another's scope lends its refs, not its retention, so the
      // Age carries the Rewrite's keep-set itself.
      const ageReset = createReset({
        resetPersistentContexts: [rewriteReset, 'scaler/continuity'],
        keep: AGE_KEEPS.map((id) => continuity.upgrade(id).count),
        retain: eternalKeeps(),
      });
      ageReset.on('beforeReset', latchEternal);

      const elseworldCap = computed(() =>
        canon.upgrade('canon-elseworlds').active.value
          ? ELSEWORLD_TIERS
          : continuity.upgrade('archives').active.value
            ? 4
            : 2,
      );
      const elseworlds = createChallengeCategory<ElseworldChallengeDef>({
        id: ELSEWORLDS_CATEGORY,
        reset: rebootReset,
        mutuallyExclusive: true,
        registerTick: ctx.onTick,
      });
      const completions = (id: ElseworldId) => elseworlds.getChallenge(id)!.completions.value;
      const protocols = () => legacy.upgrade('elseworld-protocols').active.value;
      const available: Record<ElseworldId, () => boolean> = {
        'no-powers': () => true,
        'secret-identity': () => true,
        'villain-uprising': () => true,
        'dark-days': () => core.rewrites.value > 0,
        'lost-earth': () => core.ages.value > 0,
      };
      // An Elseworld's restricts and rewards on one chain need distinct descriptions:
      // both lower to bind ids of `{scope}/{description}`, and a repeat throws.
      const rules: Record<ElseworldId, Pick<ChallengeDef, 'restricts' | 'rewards'>> = {
        'no-powers': {
          restricts: [{ chain: core.high, multiplier: 0, description: 'No Powers (rule)' }],
          rewards: [
            {
              chain: core.street,
              multiplier: () => ELSEWORLD_LEVERS.noPowersStreet(completions('no-powers')),
              description: 'No Powers (reward)',
            },
          ],
        },
        'secret-identity': {
          restricts: replacementGrants({
            chain: core.output,
            cancel: () => legacy.legacyMultiplier.value,
            replacement: 1,
            description: 'Secret Identity (rule)',
          }),
          rewards: [
            {
              chain: core.legacyGain,
              multiplier: () => ELSEWORLD_LEVERS.secretIdentityGain(completions('secret-identity')),
              description: 'Secret Identity (reward)',
            },
            {
              chain: core.knee,
              multiplier: () => ELSEWORLD_LEVERS.secretIdentityKnee(completions('secret-identity')),
              description: 'Secret Identity (reward)',
            },
          ],
        },
        'villain-uprising': {
          restricts: [
            {
              chain: core.priceRatio,
              add: ELSEWORLD_LEVERS.villainUprisingAdd,
              description: 'Villain Uprising (rule)',
            },
          ],
          rewards: [
            {
              chain: core.priceRatio,
              add: () => -ELSEWORLD_LEVERS.villainUprisingRelief(completions('villain-uprising')),
              description: 'Villain Uprising (reward)',
            },
          ],
        },
        'dark-days': {
          restricts: [{ chain: core.hopeSpeed, multiplier: 0, description: 'Dark Days (rule)' }],
          rewards: [
            {
              chain: core.hopeSpeed,
              multiplier: () => ELSEWORLD_LEVERS.darkDaysHope(completions('dark-days')),
              description: 'Dark Days (reward)',
            },
          ],
        },
        'lost-earth': {
          restricts: [{ chain: core.echoPotency, multiplier: 0, description: 'Lost Earth (rule)' }],
          rewards: [
            {
              chain: core.echoSpeed,
              multiplier: () => ELSEWORLD_LEVERS.lostEarthEcho(completions('lost-earth')),
              description: 'Lost Earth (reward)',
            },
          ],
        },
      };
      elseworlds.register(
        ELSEWORLDS.map((def) => {
          const open = () => protocols() && available[def.id]();
          return {
            ...def,
            ...rules[def.id],
            completionLimit: ELSEWORLD_TIERS,
            visible: open,
            canEnter: () => open() && completions(def.id) < elseworldCap.value,
            goal: () =>
              Decimal.gte(
                run.runEarned.value,
                def.goals[Math.min(completions(def.id), ELSEWORLD_TIERS - 1)],
              ),
            onEnter: () => core.scanner.post(`Entered ${def.displayName}.`, 'elseworld-enter'),
            onComplete: () =>
              core.scanner.post(
                `Resolved ${def.displayName}, tier ${completions(def.id)}!`,
                'elseworld-complete',
              ),
          };
        }),
      );

      function exitElseworld(why: string) {
        const current = elseworlds.current.value;
        if (!current) return;
        current.exit();
        core.scanner.post(
          `Abandoned ${elseworlds.getDef(current.id)!.displayName}${why}.`,
          'elseworld-abandon',
        );
      }

      function reboot(): boolean {
        const gain = pendingLegacy.value;
        if (Decimal.lt(gain, 1)) return false;
        exitElseworld(' to Reboot');
        if (!rebootReset.reset()) return false;
        // Banked after reset() returns, so the wipe does not take it.
        legacy.bank(gain);
        core.reboots.value += 1;
        core.scanner.post(`Reboot ${core.reboots.value}: +${gain.toNumber()} Legacy.`, 'reboot');
        return true;
      }

      function rewrite(): boolean {
        const gain = pendingContinuity.value;
        if (Decimal.lt(gain, 1)) return false;
        exitElseworld(' to Rewrite');
        if (!rewriteReset.reset()) return false;
        continuity.bank(gain);
        core.rewrites.value += 1;
        core.scanner.post(
          `Rewrite ${core.rewrites.value}: +${gain.toNumber()} Continuity.`,
          'rewrite',
        );
        return true;
      }

      function turnAge(): boolean {
        const gain = pendingCanon.value;
        if (Decimal.lt(gain, 1)) return false;
        exitElseworld(' to Turn the Age');
        if (!ageReset.reset()) return false;
        addResource(canon.canon, gain);
        core.ages.value += 1;
        core.scanner.post(
          `The ${ageName(core.ages.value)} Age begins: +${gain.toNumber()} Canon.`,
          'age',
        );
        return true;
      }

      const api: PrestigeApi = {
        rebootReset,
        rewriteReset,
        ageReset,
        pendingLegacy,
        legacyGain,
        nextLegacyAt,
        pendingContinuity,
        pendingCanon,
        ageGate: gate,
        elseworlds,
        elseworldCap,
        reboot,
        rewrite,
        turnAge,
        enterElseworld: (id) => elseworlds.getChallenge(id)?.enter() ?? false,
        abandonElseworld: () => exitElseworld(''),
      };
      prestigeApi.publish(ctx, api);
    },
  };
}

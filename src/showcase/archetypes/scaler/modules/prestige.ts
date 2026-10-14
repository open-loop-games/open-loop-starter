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
import {
  ANCHORS,
  ELSEWORLDS,
  LEVERS,
  REBOOT_THRESHOLD,
  REWRITE_THRESHOLD,
  type ElseworldDef,
  type ElseworldId,
} from '../data';
import { CoreKey } from './core';
import { RunKey } from './run';
import { LegacyKey } from './legacy';
import { ContinuityKey } from './continuity';

/**
 * The two prestige layers and the graded run inside the first.
 *
 *   - Reboot the Timeline: wipe the run, bank ⌊∛(Justice earned / threshold)⌋
 *     Legacy, times the Legacy-gain chain.
 *   - Rewrite the Multiverse: wipe the run and Legacy with its shop, bank
 *     ⌊√(Legacy earned / threshold)⌋ Continuity. Eternal Dispatch keeps two
 *     upgrades through it.
 *   - Elseworlds: a timeline under a worse rule, entered by a Reboot and resolved
 *     by reaching its goal; the reward is permanent.
 */

export type ElseworldChallengeDef = ElseworldDef & ChallengeDef;

export interface PrestigeApi {
  rebootReset: Reset;
  rewriteReset: Reset;
  /** Legacy a Reboot would bank now. */
  pendingLegacy: ComputedRef<Decimal>;
  /** What the Legacy-gain chain multiplies each Reboot's Legacy by. */
  legacyGain: ComputedRef<Decimal>;
  /** Justice earned this timeline at which pending Legacy ticks up by one. */
  nextLegacyAt: ComputedRef<Decimal>;
  /** Continuity a Rewrite would bank now. */
  pendingContinuity: ComputedRef<Decimal>;
  elseworlds: ChallengeCategory<ElseworldChallengeDef>;
  /** Reboot the timeline, abandoning any Elseworld; false when nothing is pending. */
  reboot(): boolean;
  /** Rewrite the multiverse; false when nothing is pending. */
  rewrite(): boolean;
  enterElseworld(id: ElseworldId): boolean;
  abandonElseworld(): void;
}

export const PrestigeKey: InjectionKey<PrestigeApi> = Symbol(
  'scaler/prestige',
) as InjectionKey<PrestigeApi>;

let api: PrestigeApi;

export function getPrestige(): PrestigeApi {
  return api;
}

export const ELSEWORLDS_CATEGORY = 'elseworlds';

export function createPrestigeModule(): EngineModule {
  return {
    id: 'scaler/prestige',
    dependencies: ['scaler/core', 'scaler/run', 'scaler/legacy', 'scaler/continuity'],
    install(ctx) {
      const core = ctx.inject(CoreKey);
      const run = ctx.inject(RunKey);
      const legacy = ctx.inject(LegacyKey);
      const continuity = ctx.inject(ContinuityKey);

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
        return integerRoot(
          Decimal.div(legacy.legacyEarned.value, REWRITE_THRESHOLD),
          ANCHORS.continuityDegree,
        );
      });

      const rebootReset = createReset({ resetPersistentContexts: ['scaler/run'] });
      rebootReset.on('afterReset', run.markRunStart);

      // Eternal Dispatch is the conditional keep-set: the two upgrades it names
      // survive the wipe only while it is owned.
      const keepIfEternal = (v: DecimalSource) =>
        continuity.upgrade('eternal-dispatch').active.value ? v : 0;
      const rewriteReset = createReset({
        resetPersistentContexts: [rebootReset, 'scaler/legacy'],
        retain: new Map([
          [legacy.upgrade('dispatch').count, keepIfEternal],
          [legacy.upgrade('elseworld-protocols').count, keepIfEternal],
        ]),
      });
      rewriteReset.on('afterReset', () => {
        run.markRunStart();
        legacy.markRewriteStart();
      });

      const elseworlds = createChallengeCategory<ElseworldChallengeDef>({
        id: ELSEWORLDS_CATEGORY,
        reset: rebootReset,
        mutuallyExclusive: true,
        registerTick: ctx.onTick,
      });
      const protocols = () => legacy.upgrade('elseworld-protocols').active.value;
      // An Elseworld's restricts and rewards on one chain need distinct descriptions:
      // both lower to bind ids of `{scope}/{description}`, and a repeat throws.
      const rules: Record<ElseworldId, Pick<ChallengeDef, 'restricts' | 'rewards'>> = {
        'no-powers': {
          restricts: [{ chain: core.high, multiplier: 0, description: 'No Powers (rule)' }],
          rewards: [
            {
              chain: core.street,
              multiplier: LEVERS.noPowersRewardMult,
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
              multiplier: LEVERS.secretIdentityRewardMult,
              description: 'Secret Identity (reward)',
            },
            {
              chain: core.knee,
              multiplier: LEVERS.secretIdentityKneeMult,
              description: 'Secret Identity (reward)',
            },
          ],
        },
        'villain-uprising': {
          restricts: [
            {
              chain: core.priceRatio,
              add: LEVERS.villainUprisingAdd,
              description: 'Villain Uprising (rule)',
            },
          ],
          rewards: [
            {
              chain: core.priceRatio,
              add: LEVERS.villainUprisingRewardAdd,
              description: 'Villain Uprising (reward)',
            },
          ],
        },
      };
      elseworlds.register(
        ELSEWORLDS.map((def) => ({
          ...def,
          ...rules[def.id],
          visible: protocols,
          canEnter: protocols,
          goal: () => Decimal.gte(run.runEarned.value, def.goalJustice),
          onEnter: () => core.log('elseworld-enter', `Entered ${def.displayName}.`),
          onComplete: () => core.log('elseworld-complete', `Resolved ${def.displayName}!`),
        })),
      );

      function reboot(): boolean {
        const gain = pendingLegacy.value;
        if (Decimal.lt(gain, 1)) return false;
        const current = elseworlds.current.value;
        if (current) {
          current.exit();
          core.log(
            'elseworld-abandon',
            `Abandoned ${elseworlds.getDef(current.id)!.displayName} to Reboot.`,
          );
        }
        if (!rebootReset.reset()) return false;
        // Granted after reset() returns, so it counts toward Legacy's cumulative.
        addResource(legacy.legacy, gain);
        core.reboots.value += 1;
        core.log('reboot', `Reboot ${core.reboots.value}: +${gain.toNumber()} Legacy.`);
        return true;
      }

      function rewrite(): boolean {
        const gain = pendingContinuity.value;
        if (Decimal.lt(gain, 1)) return false;
        elseworlds.current.value?.exit();
        if (!rewriteReset.reset()) return false;
        addResource(continuity.continuity, gain);
        core.rewrites.value += 1;
        core.log('rewrite', `Rewrite ${core.rewrites.value}: +${gain.toNumber()} Continuity.`);
        return true;
      }

      function abandonElseworld() {
        const current = elseworlds.current.value;
        if (!current) return;
        current.exit();
        core.log('elseworld-abandon', `Abandoned ${elseworlds.getDef(current.id)!.displayName}.`);
      }

      api = {
        rebootReset,
        rewriteReset,
        pendingLegacy,
        legacyGain,
        nextLegacyAt,
        pendingContinuity,
        elseworlds,
        reboot,
        rewrite,
        enterElseworld: (id) => elseworlds.getChallenge(id)?.enter() ?? false,
        abandonElseworld,
      };
      ctx.provide(PrestigeKey, api);
    },
  };
}

import {
  addResource,
  computed,
  createBooleanRequirement,
  createCostRequirement,
  createModifierChain,
  createMultiplicativeModifier,
  createPurchasableCategory,
  createResource,
  createSkill,
  Decimal,
  Formula,
  persistent,
  toNumber,
  tunable,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type Persistent,
  type PurchasableCategory,
  type Resource,
  type Skill,
} from '@open-loop/engine';
import { ANCHORS, BOONS, lordAt, renownFor, rivalScale, type BoonDef } from '../data';
import { SIDES, type Side } from './sides';
import { TugTuningRegistryKey } from './tuning';

/** Every bonus to one keep enters one of these. */
export interface SideChains {
  /** Multiplies silver a second. */
  income: ModifierChain;
  /** Multiplies a raised troop's hp and damage. */
  vigor: ModifierChain;
  /** Multiplies the gate's hp. */
  gate: ModifierChain;
}

/** One battle's entry in the Chronicle. */
export interface BattleRecord {
  won: boolean;
  rung: number;
  lord: string;
  seconds: number;
  renown: number;
  volumeBefore: number;
  volumeAfter: number;
  /** True on the one battle that took the last keep. */
  ending: boolean;
}

export interface ChronicleApi {
  /** Renown is its xp; its level is the Chronicle's volume. */
  renown: Skill;
  volume: ComputedRef<number>;
  boonPoints: Resource;
  boons: PurchasableCategory<BoonDef>;
  /** Lords beaten: the scaled-opposition index. */
  rung: Persistent<number>;
  battles: Persistent<number>;
  victories: Persistent<number>;
  /** Set once, when the last keep falls. */
  endingReached: Persistent<boolean>;
  last: Persistent<BattleRecord | null>;
  /** Troops Fairhold has ever raised: a newly opened troop announces itself until its first. */
  raised: Persistent<Partial<Record<string, boolean>>>;
  chains: Record<Side, SideChains>;
  /** A strength boon level's multiplier, and the rival's harvest growth per rung. */
  rungGrowth: ComputedRef<number>;
  level(boon: string): number;
  /** Writes a finished battle into the Chronicle and moves the ladder. */
  record(won: boolean, seconds: number): BattleRecord;
}

export const ChronicleKey: InjectionKey<ChronicleApi> = Symbol(
  'tug/chronicle',
) as InjectionKey<ChronicleApi>;

let api: ChronicleApi;

export function getChronicle(): ChronicleApi {
  return api;
}

/**
 * What outlasts a battle: Renown and the volumes it fills, the boons they buy, and the
 * ladder of lords. No battle reset names this module. It also builds both keeps' chains,
 * because the two things that bind into them live here: boons on Fairhold's, the rung on the
 * rival's.
 */
export function createChronicleModule(): EngineModule {
  return {
    id: 'tug/chronicle',
    dependencies: ['tug/tuning'],
    install(ctx) {
      const tuning = ctx.inject(TugTuningRegistryKey);
      const rungGrowth = tunable(tuning, 'ladder/rungGrowth', () => ANCHORS.rungGrowth);

      const chains = Object.fromEntries(
        SIDES.map((side) => [
          side,
          {
            income: createModifierChain(`${side}/income`),
            vigor: createModifierChain(`${side}/vigor`),
            gate: createModifierChain(`${side}/gate`),
          },
        ]),
      ) as Record<Side, SideChains>;

      const boonPoints = createResource(0, { id: 'boon-points', displayName: 'Boons' });

      // Triangular ladder: xp(L) = R₀·L(L+1)/2 ⇒ L = ⌊(√(8·xp/R₀ + 1) − 1)/2⌋ (spine § The Chronicle).
      const renown = createSkill({
        id: 'renown',
        description: 'Renown',
        xpToLevel: (xp) =>
          Formula.variable(xp).div(ANCHORS.renownBase).mul(8).add(1).sqrt().sub(1).div(2).floor(),
        // A volume buys nothing itself; the boon it mints does.
        levelToMultiplier: () => 1,
        onLevelUp: (from, to) => addResource(boonPoints, Decimal.sub(to, from)),
      });
      const volume = computed(() => toNumber(renown.level.value));

      const rung = persistent(0, { id: 'rung' });
      const battles = persistent(0, { id: 'battles' });
      const victories = persistent(0, { id: 'victories' });
      const endingReached = persistent(false, { id: 'ending-reached' });
      const last = persistent<BattleRecord | null>(null, { id: 'last' });
      const raised = persistent<Partial<Record<string, boolean>>>({}, { id: 'raised' });

      // Annotated: a grant reads its own entry's level back, a self-reference TS can't infer.
      const boons: PurchasableCategory<BoonDef> = createPurchasableCategory<BoonDef>({
        id: 'boons',
        mapPurchasable: (def) => ({
          display: { title: def.name, description: def.blurb },
          requirements: [
            createCostRequirement({ resource: boonPoints, cost: 1 }),
            createBooleanRequirement({
              met: () => volume.value >= def.minVolume,
              description: `Chronicle volume ${def.minVolume}`,
            }),
          ],
          limit: def.limit,
          grants: def.chain
            ? [
                {
                  chain: chains.player[def.chain],
                  // Income and vigor compound by the rung growth (one level keeps pace with
                  // one rung); the gate is a flat step, since gate hp is not a strength term.
                  multiplier: (): number =>
                    def.chain === 'gate'
                      ? 1 + ANCHORS.curtainStep * level(def.id)
                      : Math.pow(rungGrowth.value, level(def.id)),
                  description: def.name,
                },
              ]
            : [],
        }),
      });
      boons.register(BOONS);

      function level(id: string): number {
        return toNumber(boons.getPurchasable(id)?.count.value ?? 0);
      }

      // Scaled opposition: the rival's whole harvest is evaluated over the rung. One strength
      // boon level grows by the same factor, so a boon a rung keeps pace (spine).
      chains.rival.income.bind({
        text: 'Rival rung',
        modifier: createMultiplicativeModifier({
          multiplier: () => rivalScale(rung.value, rungGrowth.value),
          description: () => `${lordAt(rung.value).name} (rung ${rung.value + 1})`,
        }),
      });

      function record(won: boolean, seconds: number): BattleRecord {
        const r = rung.value;
        const gained = renownFor(r, won);
        const volumeBefore = volume.value;
        renown.addXp(gained);
        battles.value++;
        let ending = false;
        if (won) {
          victories.value++;
          rung.value = r + 1;
          if (r + 1 >= ANCHORS.rungs && !endingReached.value) {
            endingReached.value = true;
            ending = true;
          }
        }
        const entry: BattleRecord = {
          won,
          rung: r,
          lord: lordAt(r).name,
          seconds,
          renown: gained,
          volumeBefore,
          volumeAfter: volume.value,
          ending,
        };
        last.value = entry;
        return entry;
      }

      api = {
        renown,
        volume,
        boonPoints,
        boons,
        rung,
        battles,
        victories,
        endingReached,
        last,
        raised,
        chains,
        rungGrowth,
        level,
        record,
      };
      ctx.provide(ChronicleKey, api);
    },
  };
}

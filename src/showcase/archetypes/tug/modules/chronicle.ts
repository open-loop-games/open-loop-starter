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
  random,
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
import { createModuleApi } from '@/modules/module-api';
import {
  ANCHORS,
  BOONS,
  FIELDS,
  NO_TWIST,
  TWISTS,
  fieldAt,
  lordAt,
  renownFor,
  rivalScale,
  twistById,
  type BoonDef,
  type FieldDef,
  type LordDef,
  type TwistDef,
  type WeaponKind,
} from '../data';
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

/** A skirmish the player sets after the ending: a field, a twist and a lord, for no renown. */
export interface Skirmish {
  /** Index into the march's fields; the lord's men stand as strong as on that field. */
  field: number;
  twist: string;
  /** Index into the ladder of lords: whose temperament and walls. */
  lord: number;
}

/** One battle's entry in the Chronicle. */
export interface BattleRecord {
  won: boolean;
  rung: number;
  field: string;
  lord: string;
  seconds: number;
  renown: number;
  volumeBefore: number;
  volumeAfter: number;
  /** True on the one battle that took the last keep. */
  ending: boolean;
  /** A skirmish: it paid nothing and moved nothing. */
  skirmish: boolean;
  /** A gate fell; otherwise the season closed on the tiebreak. */
  byBreach: boolean;
}

export interface ChronicleApi {
  /** Renown is its xp; its level is the Chronicle's volume. */
  renown: Skill;
  volume: ComputedRef<number>;
  boonPoints: Resource;
  boons: PurchasableCategory<BoonDef>;
  /** Fields taken on the march: the scaled-opposition index. */
  rung: Persistent<number>;
  /** The field the next battle is fought on, and its lord. */
  field: ComputedRef<FieldDef>;
  lord: ComputedRef<LordDef>;
  /** The twist drawn for the next battle, shown in camp. */
  twist: ComputedRef<TwistDef>;
  twistId: Persistent<string>;
  /** The weapon kind Fairhold mounts on its walls this battle, chosen in camp. */
  mounted: Persistent<WeaponKind | null>;
  /** The skirmish set for the next battle, or null for the march. Open once the ending is reached. */
  skirmish: Persistent<Skirmish | null>;
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
  record(won: boolean, seconds: number, byBreach?: boolean): BattleRecord;
}

/** The lord holding a rung's field; past the march, the Usurper's heirs, one a keep. */
export function lordOf(rung: number): LordDef {
  if (rung < ANCHORS.rungs) return lordAt(fieldAt(rung).lord);
  return lordAt(5 + rung - ANCHORS.rungs);
}

export const ChronicleKey: InjectionKey<ChronicleApi> = Symbol(
  'tug/chronicle',
) as InjectionKey<ChronicleApi>;

const chronicleApi = createModuleApi(ChronicleKey);
export const getChronicle = chronicleApi.get;

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
      const perField = tunable(tuning, 'ladder/boonsPerField', () => ANCHORS.boonsPerField);

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
      const skirmish = persistent<Skirmish | null>(null, { id: 'skirmish' });
      const field = computed(() =>
        skirmish.value ? FIELDS[skirmish.value.field]! : fieldAt(rung.value),
      );
      const lord = computed(() =>
        skirmish.value ? lordAt(skirmish.value.lord) : lordOf(rung.value),
      );
      const twistId = persistent<string>(NO_TWIST.id, { id: 'twist' });
      const twist = computed(() => twistById(skirmish.value?.twist ?? twistId.value));
      /** The rung the lord's men are scaled at: a skirmish's field, or the march's. */
      const strengthRung = () => skirmish.value?.field ?? rung.value;
      const mounted = persistent<WeaponKind | null>(null, { id: 'mounted' });
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
          onPurchase: () => {
            if (!def.chain && mounted.value === null) mounted.value = def.id as WeaponKind;
          },
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

      // Scaled opposition: the lord's men grow in grit and blows by the field. Under a full
      // muster a harvest buys little, so the rung binds into vigor (spine § Scaled opposition).
      chains.rival.vigor.bind({
        text: 'Rival field',
        modifier: createMultiplicativeModifier({
          multiplier: () => rivalScale(strengthRung(), rungGrowth.value, perField.value),
          description: () => `${lordOf(rung.value).name} (field ${rung.value + 1})`,
        }),
      });

      /** The next battle's twist: none on a calm field, never the same twice running. */
      function drawTwist(): void {
        if (field.value.calm) {
          twistId.value = NO_TWIST.id;
          return;
        }
        const pool = TWISTS.filter((t) => t.id !== twistId.value);
        twistId.value = pool[Math.floor(random() * pool.length)]!.id;
      }

      function record(won: boolean, seconds: number, byBreach = true): BattleRecord {
        if (skirmish.value) {
          battles.value++;
          const entry: BattleRecord = {
            won,
            rung: skirmish.value.field,
            field: field.value.name,
            lord: lord.value.name,
            seconds,
            renown: 0,
            volumeBefore: volume.value,
            volumeAfter: volume.value,
            ending: false,
            byBreach,
            skirmish: true,
          };
          last.value = entry;
          return entry;
        }
        const r = rung.value;
        const fieldName = field.value.name;
        const lordName = lord.value.name;
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
          field: fieldName,
          lord: lordName,
          seconds,
          renown: gained,
          volumeBefore,
          volumeAfter: volume.value,
          ending,
          byBreach,
          skirmish: false,
        };
        last.value = entry;
        drawTwist();
        return entry;
      }

      chronicleApi.publish(ctx, {
        renown,
        volume,
        boonPoints,
        boons,
        rung,
        field,
        lord,
        twist,
        twistId,
        mounted,
        skirmish,
        battles,
        victories,
        endingReached,
        last,
        raised,
        chains,
        rungGrowth,
        level,
        record,
      });
    },
  };
}

/**
 * One seat at the table: a crew's economy, training floors, research,
 * supply and army. Both seats are built by this factory, so the player and
 * the rival play by the same rules; only the persona driving them differs.
 *
 * Built inside the match module's install, so every ref is in the `match`
 * persistent context and the match reset clears it.
 */
import {
  Decimal,
  computed,
  createBooleanRequirement,
  createCostRequirement,
  createModifierChain,
  createMultiplicativeModifier,
  createProducerCategory,
  createPurchasableCategory,
  createResource,
  createResourceBag,
  createScalingPurchasable,
  persistent,
  toNumber,
  type ComputedRef,
  type DecimalSource,
  type EngineContext,
  type Grant,
  type ModifierChain,
  type Persistent,
  type ProducerCategory,
  type Purchasable,
  type PurchasableCategory,
  type Requirement,
  type Resource,
  type ResourceBag,
} from '@open-loop/engine';
import {
  BARRACKS,
  FLOORS,
  ECON,
  RESEARCH,
  catId,
  type BarracksDef,
  type EconDef,
  type ResearchDef,
  type SideId,
} from '../data/buildings';
import { DISTRICTS } from '../data/contracts';
import { LIEUTENANTS, type LieutenantDef } from '../data/crew';
import { UNITS, UNIT_KINDS, byKind, type UnitKind } from '../data/units';
import type { Tunables } from './tunables';
import { START_SCRIP } from '../data/spine';

export type Stance = 'hold' | 'assault';
export type Focus = UnitKind | 'spread';

export interface Side {
  readonly id: SideId;
  readonly scrip: Resource;
  readonly aether: Resource;
  /** Headquarters integrity; the match ends when one side's reaches zero. */
  readonly hq: Resource;
  readonly econ: ProducerCategory<EconDef>;
  /** The tech floors, one per kind: owning one opens that kind to every floor. Its producer trains the kind. */
  readonly barracks: ProducerCategory<BarracksDef>;
  /** Floors beyond the tech floors. */
  readonly floors: Purchasable;
  /** How the floors split their time between the open kinds, as weights. */
  readonly queue: Record<UnitKind, Persistent<number>>;
  readonly research: PurchasableCategory<ResearchDef>;
  /** The seat's lieutenants: one-shot hires in scrip, in order, while the match is live. */
  readonly crew: PurchasableCategory<LieutenantDef>;
  readonly squats: Purchasable;
  readonly supplyCap: ComputedRef<number>;
  readonly bag: ResourceBag;
  /** Trained units waiting at the safehouse. Fractional: the fraction is training progress. */
  readonly reserve: Record<UnitKind, Resource>;
  /** Squads standing in each district, by district index. */
  readonly squads: Record<UnitKind, Resource>[];
  readonly dmg: Record<UnitKind, ModifierChain>;
  readonly hp: Record<UnitKind, ModifierChain>;
  readonly turret: ModifierChain;
  readonly income: ModifierChain;
  readonly training: Record<UnitKind, Persistent<boolean>>;
  readonly stance: Persistent<Stance>[];
  readonly focus: Persistent<Focus>[];
  unitDps(kind: UnitKind): number;
  unitHp(kind: UnitKind): number;
  turretDps(): number;
  /** Units per second one training floor makes at the current training speed, switch aside. */
  trainRate(): number;
  /** Every floor the seat stands up, tech floors included. */
  floorCount(): number;
  /** The next floor's price on the one ladder every floor climbs. */
  floorPrice(): number;
  /** Whether the seat's tech floor for this kind stands. */
  opened(kind: UnitKind): boolean;
  /** Floors' worth of training time spent on this kind: its queue weight's share of every floor. */
  floorShare(kind: UnitKind): number;
  /** Units in the field and at home, whole and in training. */
  supplyUsed(): number;
  /** Per-second scrip income from every producer, after modifiers. */
  scripRate(): number;
  aetherRate(): number;
}

export interface SideOptions {
  ctx: EngineContext;
  id: SideId;
  tune: Tunables;
  /** Districts this side holds outright; turf pays per district. */
  heldDistricts: () => number;
  /** The contract's economy multiplier for this seat. */
  incomeMult: () => number;
  /** False outside a live match: every producer idles. */
  running: () => boolean;
}

export function createSide({
  ctx,
  id,
  tune,
  heldDistricts,
  incomeMult,
  running,
}: SideOptions): Side {
  const label = id === 'p' ? 'Your crew' : 'Rival';
  const scrip = createResource<DecimalSource>(new Decimal(START_SCRIP), {
    id: `${id}-scrip`,
    displayName: 'scrip',
  });
  const aether = createResource<DecimalSource>(Decimal.dZero, {
    id: `${id}-aether`,
    displayName: 'aether',
    decimals: 0,
  });
  const hq = createResource<DecimalSource>(new Decimal(tune.hqIntegrity.value), {
    id: `${id}-hq`,
    displayName: `${label} safehouse`,
  });

  // Both categories tick only while the match is live, so a briefing or a finished match makes nothing.
  const registerTick = (handler: (dt: number) => void) =>
    ctx.onTick((dt) => running() && handler(dt));
  const income = createModifierChain(`${id}-income`);
  income.add(
    createMultiplicativeModifier({ multiplier: () => incomeMult(), description: 'Contract terms' }),
  );
  const trainingSpeed = createModifierChain(`${id}-training`);
  const turret = createModifierChain(`${id}-turret`);
  const dmg = byKind((k) => createModifierChain(`${id}-dmg-${k}`));
  const hp = byKind((k) => createModifierChain(`${id}-hp-${k}`));

  // ─── Economy: workers are producers, so income rises with every hustler ───
  const econ = createProducerCategory<EconDef>({
    id: catId.econ(id),
    registerTick,
    mapProducer: (def) => {
      const t = tune.econ[def.id];
      return {
        resource: def.output === 'scrip' ? scrip : aether,
        baseRate: t.rate,
        trigger: 'continuous',
        display: { title: def.name, description: def.blurb },
        ...(def.purchase
          ? {
              purchase: {
                costResource: scrip,
                baseCost: t.baseCost!,
                costRatio: t.ratio!,
                limit: def.purchase.limit,
                initialCount: def.purchase.initial,
                purchaseMaxByDefault: false,
              },
            }
          : { extraCount: () => heldDistricts() }),
      };
    },
    mapState: (def, producer) => {
      if (def.output === 'scrip') producer.rateChain.bind({ modifier: income, text: 'Income' });
    },
  });
  econ.register(ECON);

  // ─── Army: units are linked into one bag whose capacity is the supply cap ───
  const squats = createScalingPurchasable({
    id: `${id}-squats`,
    title: 'Coffin squats',
    resource: scrip,
    baseCost: tune.squatBaseCost,
    costRatio: tune.squatRatio,
    purchaseMaxByDefault: false,
  });
  const supplyCap = computed(
    () => tune.supplyBase.value + tune.supplyPer.value * toNumber(squats.count.value),
  );
  // TODO(expansion): a bag's total capacity counts every item type as one, so a
  // unit that should cost more supply than another (an exo-frame at two) cannot
  // be expressed; every unit here costs one supply.
  const bag = createResourceBag({
    capacity: supplyCap,
    overflow: 'block',
    displayName: `${label} supply`,
  });

  const unitRes = (loc: string, k: UnitKind) => {
    const r = createResource<DecimalSource>(Decimal.dZero, {
      id: `${id}-${loc}-${k}`,
      displayName: UNITS[k].name,
      decimals: 0,
    });
    bag.link(`${loc}:${k}`, r);
    return r;
  };
  const reserve = byKind((k): Resource => unitRes('reserve', k));
  const squads = DISTRICTS.map((d) => byKind((k): Resource => unitRes(d.id, k)));

  const training = byKind((k) => persistent<boolean>(true, { id: `${id}-train-${k}` }));
  const queue = byKind((k) => persistent<number>(1, { id: `${id}-queue-${k}` }));

  // ─── Training floors: one price ladder over every floor, tech or plain ───
  // The tech floors are read through late-bound readers: they are created below.
  let techFloors = () => 0;
  let opened = (_k: UnitKind) => false;
  const floors = createScalingPurchasable({
    id: `${id}-floors`,
    title: FLOORS.name,
    resource: scrip,
    baseCost: () => tune.floorBaseCost.value * tune.floorRatio.value ** techFloors(),
    costRatio: tune.floorRatio,
    purchaseMaxByDefault: false,
    visible: () => techFloors() > 0,
  });
  const floorCount = () => techFloors() + toNumber(floors.count.value);
  const floorPrice = () => tune.floorBaseCost.value * tune.floorRatio.value ** floorCount();
  const floorShare = (k: UnitKind) => {
    if (!opened(k) || queue[k].value <= 0) return 0;
    let weights = 0;
    for (const q of UNIT_KINDS) if (opened(q)) weights += Math.max(0, queue[q].value);
    return (floorCount() * queue[k].value) / weights;
  };

  // ─── Tech floors: converters that spend scrip and aether into units, at the queue's share ───
  const barracks = createProducerCategory<BarracksDef>({
    id: catId.barracks(id),
    registerTick,
    mapProducer: (def) => {
      const cost = tune.unit[def.trains];
      const requires = def.requires(id);
      return {
        resource: reserve[def.trains],
        // The training switch is the cycle driver: off, every floor's time on this kind idles.
        baseRate: () =>
          training[def.trains].value ? tune.trainRate.value * floorShare(def.trains) : 0,
        trigger: 'continuous',
        display: { title: def.name, description: def.blurb },
        purchase: {
          costResource: scrip,
          // A tech floor is the next floor on the ladder, at its multiple of the price.
          baseCost: () => floorPrice() * def.floors,
          costRatio: 1,
          limit: 1,
          purchaseMaxByDefault: false,
          ...(requires ? { visible: requires } : {}),
        },
        inputs: {
          scrip: { resource: scrip, per: cost.scrip },
          aether: { resource: aether, per: cost.aether },
        },
      };
    },
    mapState: (_def, producer) => {
      producer.rateChain.bind({ modifier: trainingSpeed, text: 'Training speed' });
    },
  });
  barracks.register(BARRACKS);
  techFloors = () => barracks.getAll().reduce((n, e) => n + toNumber(e.producer.count.value), 0);
  const techOf = byKind((k) => barracks.getProducer(BARRACKS.find((b) => b.trains === k)!.id)!);
  opened = (k) => toNumber(techOf[k].count.value) > 0;

  // ─── Research: a prerequisite graph of one-shot upgrades ───
  const research = createPurchasableCategory<ResearchDef>({
    id: catId.research(id),
    mapPurchasable: (def) => {
      const t = tune.research[def.id];
      const requirements: Requirement[] = [
        createCostRequirement({ resource: scrip, cost: t.scrip, description: 'scrip' }),
      ];
      if (def.cost.aether > 0)
        requirements.push(
          createCostRequirement({ resource: aether, cost: t.aether, description: 'aether' }),
        );
      // The prerequisite edge is an availability check, as on the training floors: it withholds, it never charges.
      const gate = def.requires(id);
      return {
        display: { title: def.name, description: def.blurb },
        requirements,
        limit: 1,
        ...(gate ? { visible: gate } : {}),
        grants: grantsFor(def),
      };
    },
  });
  research.register(RESEARCH);

  function grantsFor(def: ResearchDef): Grant[] {
    const e = def.effect;
    switch (e.kind) {
      case 'damage':
        return [{ chain: e.units.map((k) => dmg[k]), multiplier: e.mult, description: def.name }];
      case 'hp':
        return [{ chain: e.units.map((k) => hp[k]), multiplier: e.mult, description: def.name }];
      case 'income':
        return [{ chain: income, multiplier: e.mult, description: def.name }];
      case 'training':
        return [{ chain: trainingSpeed, multiplier: e.mult, description: def.name }];
      case 'turret':
        return [{ chain: turret, multiplier: e.mult, description: def.name }];
    }
  }

  // ─── Lieutenants: each seat hires its own, in order, and loses them with the match ───
  const live = createBooleanRequirement({ met: running, description: 'during a job' });
  const crew: PurchasableCategory<LieutenantDef> = createPurchasableCategory<LieutenantDef>({
    id: catId.crew(id),
    mapPurchasable: (def) => {
      const before = LIEUTENANTS[LIEUTENANTS.indexOf(def) - 1];
      return {
        display: { title: def.name, description: def.does },
        requirements: [
          live,
          createCostRequirement({ resource: scrip, cost: def.cost, description: 'scrip' }),
        ],
        limit: 1,
        ...(before ? { visible: (): boolean => crew.getPurchasable(before.id)!.active.value } : {}),
      };
    },
  });
  crew.register(LIEUTENANTS);

  const stance = DISTRICTS.map((d) => persistent<Stance>('hold', { id: `${id}-stance-${d.id}` }));
  const focus = DISTRICTS.map((d) => persistent<Focus>('spread', { id: `${id}-focus-${d.id}` }));

  return {
    id,
    scrip,
    aether,
    hq,
    econ,
    barracks,
    research,
    crew,
    squats,
    supplyCap,
    bag,
    reserve,
    squads,
    dmg,
    hp,
    turret,
    income,
    training,
    floors,
    queue,
    stance,
    focus,
    unitDps: (k) => toNumber(dmg[k].apply(tune.unit[k].dps.value)),
    unitHp: (k) => toNumber(hp[k].apply(tune.unit[k].hp.value)),
    turretDps: () => toNumber(turret.apply(tune.turretDps.value)),
    trainRate: () => toNumber(trainingSpeed.apply(tune.trainRate.value)),
    floorCount,
    floorPrice,
    opened,
    floorShare,
    supplyUsed: () => toNumber(bag.total()),
    scripRate: () => toNumber(econ.getTotalRate(scrip)),
    aetherRate: () => toNumber(econ.getTotalRate(aether)),
  };
}

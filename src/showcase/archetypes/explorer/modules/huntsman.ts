import {
  computed,
  createAchievementCategory,
  createModifierChain,
  createMultiplicativeModifier,
  createResource,
  createResourceBag,
  createSkill,
  createTimedProgress,
  Decimal,
  F,
  persistent,
  random,
  toNumber,
  tunable,
  type AchievementCategory,
  type ComputedRef,
  type DecimalSource,
  type EngineModule,
  type GridCoord,
  type InjectionKey,
  type LevelDrivenSkill,
  type ModifierChain,
  type Persistent,
  type Resource,
  type ResourceBag,
  type TimedProgress,
} from '@open-loop/engine';
import {
  ANCHORS,
  BESTIARY_BONUS,
  BESTIARY_KILLS,
  HART_TRAIL_KILLS,
  LODGE,
  SKILL_STEP,
  SPECIES,
  TROPHIES,
  WOOD_RATE,
  XP_SCALE,
  bowPower,
  campCost,
  skinCapacity,
  huntXp,
  packCapacity,
  speciesById,
  supplyCapacity,
  winChance,
  yieldAntler,
  yieldHide,
  type SpeciesDef,
} from '../data';
import { ChronicleKey } from './chronicle';
import { LodgeKey } from './lodge';
import { ExplorerTuningRegistryKey } from './tuning';
import { WoldKey } from './wold';
import { tileIndex } from './wold-map';

/**
 * Huntsman module — the one person out in the wold: where he stands, the jerky
 * he carries, the pack the lodge alone can empty, Huntcraft and the bestiary,
 * and every verb play has. Nothing resets; a mauling or an empty satchel costs
 * the pack and the walk home, never the map.
 */

export type Action = 'idle' | 'walk' | 'hunt';
export const PACK_ITEMS = ['meat', 'hide', 'antler'] as const;
export type PackItem = (typeof PACK_ITEMS)[number];

export interface HartTrail {
  have: number;
  need: number;
  open: boolean;
}

export interface HuntsmanApi {
  pos: Persistent<GridCoord>;
  /** the tiles still to walk, nearest first */
  path: Persistent<GridCoord[]>;
  action: Persistent<Action>;
  actionClock: TimedProgress;
  supply: Resource<DecimalSource>;
  supplyCap: ComputedRef<number>;
  water: Resource<DecimalSource>;
  waterCap: ComputedRef<number>;
  pack: ResourceBag;
  packItems: Record<PackItem, Resource<DecimalSource>>;
  packCap: ComputedRef<number>;
  packLoad: ComputedRef<number>;
  skill: LevelDrivenSkill;
  prowess: ComputedRef<number>;
  yieldChains: Map<string, ModifierChain>;
  /** lifetime kills per species */
  kills: Persistent<Record<string, number>>;
  bestiary: AchievementCategory<SpeciesDef>;
  hartTrail: ComputedRef<HartTrail>;
  campCost: ComputedRef<number>;
  /** the quarry a hunt here would face, or null */
  herdAt(x: number, y: number): SpeciesDef | null;
  huntChance(s: SpeciesDef): number;
  /** jerky from the huntsman to every tile */
  hereField(): Float64Array;
  /** water from the huntsman to every tile */
  hereWaterField(): Float64Array;
  /** the walk to `target` over charted, walkable ground, or null when there is none */
  routeTo(target: GridCoord): GridCoord[] | null;
  walkTo(target: GridCoord): boolean;
  hunt(): boolean;
  buildCamp(): boolean;
}

export const HuntsmanKey: InjectionKey<HuntsmanApi> = Symbol(
  'explorer/huntsman',
) as InjectionKey<HuntsmanApi>;

let api: HuntsmanApi;

export function getHuntsman(): HuntsmanApi {
  return api;
}

const STARVED = 'Your jerky is gone. You drop on the trail, and porters find you.';
const PARCHED = 'Your water is gone. You fall in the heat of the day, and porters find you.';

export function createHuntsmanModule(): EngineModule {
  return {
    id: 'explorer/huntsman',
    dependencies: ['explorer/tuning', 'explorer/chronicle', 'explorer/lodge', 'explorer/wold'],
    install(ctx) {
      const registry = ctx.inject(ExplorerTuningRegistryKey);
      const chronicle = ctx.inject(ChronicleKey);
      const lodge = ctx.inject(LodgeKey);
      const wold = ctx.inject(WoldKey);
      const { say, beat } = chronicle;
      const { stores } = lodge;
      const num = (r: Resource<DecimalSource>): number => toNumber(r.value);

      // === HUNTCRAFT, PROWESS, YIELD ===

      const skillStep = tunable(registry, 'hunt/skillStep', () => SKILL_STEP);
      const skill = createSkill({
        id: 'huntcraft',
        description: 'Huntcraft',
        // level L at xp = XP_SCALE · (2^L − 1)
        xpToLevel: (xp) => F.variable(xp).div(XP_SCALE).add(1).log(2).floor(),
        levelToMultiplier: (level) => F.variable(level).pow_base(skillStep),
        onLevelUp: (_old, next) => say(`Huntcraft rises to ${next.toNumber()}.`, 'good'),
      });

      const prowessChain = createModifierChain('prowess');
      prowessChain.bind({ modifier: skill.modifier, text: 'Huntcraft' });
      prowessChain.bind({
        modifier: createMultiplicativeModifier({
          multiplier: () => 1 + lodge.houndProwess.value * lodge.hounds.value,
          description: 'Hounds',
        }),
        text: 'Hounds',
      });
      const prowess = computed(() =>
        toNumber(prowessChain.apply(bowPower(lodge.gearLevel('bow')))),
      );

      const yieldChains = new Map(
        SPECIES.map((s) => {
          const chain = createModifierChain(`yield/${s.id}`);
          chain.bind({ modifier: skill.modifier, text: 'Huntcraft' });
          return [s.id as string, chain] as const;
        }),
      );

      // === BESTIARY ===

      const kills = persistent<Record<string, number>>({}, { id: 'kills', lifetime: true });
      const bestiaryBonus = tunable(registry, 'hunt/bestiaryBonus', () => BESTIARY_BONUS);
      const bestiary = createAchievementCategory<SpeciesDef>({
        id: 'bestiary',
        mapAchievement: (def) => ({
          display: {
            title: def.displayName,
            description: `Take ${BESTIARY_KILLS}.`,
            effectDescription: `${def.displayName} yield ×${BESTIARY_BONUS}`,
          },
          goal: () => (kills.value[def.id] ?? 0) >= BESTIARY_KILLS,
          grants: [
            {
              chain: yieldChains.get(def.id)!,
              multiplier: bestiaryBonus,
              description: `Bestiary: ${def.displayName}`,
            },
          ],
          onComplete: () =>
            say(
              `Bestiary: you know the ${def.displayName.toLowerCase()} now. Yield ×${BESTIARY_BONUS}.`,
              'good',
            ),
        }),
      });
      bestiary.register(SPECIES.filter((s) => s.id !== 'hart' && !s.trophy));

      // === CARRYING ===

      const pos = persistent<GridCoord>({ ...LODGE }, { id: 'pos' });
      const path = persistent<GridCoord[]>([], { id: 'path' });
      const action = persistent<Action>('idle', { id: 'action' });
      const supply = createResource<DecimalSource>(0, {
        id: 'supply',
        displayName: 'Jerky carried',
      });
      const supplyCap = computed(() => supplyCapacity(lodge.gearLevel('satchel')));
      const water = createResource<DecimalSource>(0, { id: 'water', displayName: 'Water carried' });
      const waterCap = computed(() => skinCapacity(lodge.gearLevel('skin')));
      const waterPerHunt = tunable(registry, 'water/perHunt', () => ANCHORS.waterPerHunt);
      const refill = () => {
        water.value = waterCap.value;
      };

      const packChain = createModifierChain('pack');
      packChain.bind({
        modifier: createMultiplicativeModifier({
          multiplier: () => 1 + lodge.houndPack.value * lodge.hounds.value,
          description: 'Hounds',
        }),
        text: 'Hounds',
      });
      const packCap = computed(() =>
        Math.floor(toNumber(packChain.apply(packCapacity(lodge.gearLevel('frame'))))),
      );
      const pack = createResourceBag({
        capacity: () => packCap.value,
        overflow: 'discard',
        displayName: 'Pack',
      });
      const packItems = Object.fromEntries(
        PACK_ITEMS.map((item) => {
          const r = createResource<DecimalSource>(0, { id: `pack-${item}`, displayName: item });
          pack.link(item, r);
          return [item, r];
        }),
      ) as unknown as Record<PackItem, Resource<DecimalSource>>;
      const packLoad = computed(() =>
        PACK_ITEMS.reduce((sum, item) => sum + num(packItems[item]), 0),
      );

      // === THE ACTION CLOCK ===

      const stepSeconds = tunable(registry, 'trip/stepSeconds', () => ANCHORS.stepSeconds);
      const huntSeconds = tunable(registry, 'trip/huntSeconds', () => ANCHORS.huntSeconds);
      const supplyPerHunt = tunable(registry, 'trip/supplyPerHunt', () => ANCHORS.supplyPerHunt);
      const actionClock = createTimedProgress({
        id: 'action',
        registerTick: ctx.onTick,
        needed: () => (action.value === 'hunt' ? huntSeconds.value : stepSeconds.value),
        rate: () => (action.value === 'idle' || chronicle.won.value ? 0 : 1),
        onComplete: () => {
          actionClock.progress.value = 0;
          if (action.value === 'walk') stepAlong();
          else if (action.value === 'hunt') resolveHunt();
        },
      });

      const here = () => tileIndex(pos.value.x, pos.value.y);
      const atLodge = () => pos.value.x === LODGE.x && pos.value.y === LODGE.y;

      // === WALKING ===

      function routeTo(target: GridCoord): GridCoord[] | null {
        const { grid } = wold;
        if (!grid.inBounds(target.x, target.y)) return null;
        if (!wold.walkable(wold.tileAt(target.x, target.y), target.x, target.y)) return null;
        const parents = grid.bfs(pos.value, wold.walkable);
        if (!parents.has(`${target.x},${target.y}`)) return null;
        const out: GridCoord[] = [];
        let cur = target;
        while (cur.x !== pos.value.x || cur.y !== pos.value.y) {
          out.unshift(cur);
          cur = parents.get(`${cur.x},${cur.y}`)!;
        }
        return out;
      }

      function walkTo(target: GridCoord): boolean {
        if (chronicle.won.value || action.value === 'hunt') return false;
        if (target.x === pos.value.x && target.y === pos.value.y) return false;
        const route = routeTo(target);
        if (!route) return false;
        path.value = route;
        if (action.value !== 'walk') {
          action.value = 'walk';
          actionClock.progress.value = 0;
        }
        return true;
      }

      function stepAlong(): void {
        const [next, ...rest] = path.value;
        if (!next) {
          action.value = 'idle';
          return;
        }
        if (!wold.walkable(wold.tileAt(next.x, next.y), next.x, next.y)) {
          path.value = [];
          action.value = 'idle';
          return;
        }
        pos.value = { x: next.x, y: next.y };
        path.value = rest;
        supply.value = Decimal.sub(supply.value, wold.stepCost.value).max(0);
        water.value = Decimal.sub(water.value, wold.waterPerStep.value).max(0);
        arrive(next.x, next.y);
        if (path.value.length === 0 && action.value === 'walk') action.value = 'idle';
      }

      function arrive(x: number, y: number): void {
        const i = tileIndex(x, y);
        const t = wold.tileAt(x, y);
        wold.reveal(x, y, wold.sight.value);
        // The band edge is jittered; a beat counts only on ground at the band's true depth.
        if (t.depth >= ANCHORS.bandDepth * t.band) beat(`enter band ${t.band}`);
        if (wold.isWaterSource(x, y)) refill();
        if (wold.isRestock(x, y)) {
          atRestock();
          return;
        }
        if (t.feature === 'lookout' && !wold.looted.value.includes(i)) {
          wold.loot(i);
          wold.reveal(x, y, 4);
          say('From the lookout the country opens below you.', 'find');
        }
        if (t.feature === 'cache' && !wold.looted.value.includes(i)) {
          wold.loot(i);
          const k = t.band;
          const hide = Math.round(yieldHide(k) * 4);
          const antler = Math.round(yieldAntler(k) * 3);
          const wood = Math.round(WOOD_RATE * ANCHORS.beatSeconds * (k + 1));
          stores.hide.value = Decimal.add(stores.hide.value, hide);
          stores.antler.value = Decimal.add(stores.antler.value, antler);
          stores.wood.value = Decimal.add(stores.wood.value, wood);
          say(
            `An old hunter’s cache: ${hide} hides${antler ? `, ${antler} antler` : ''}, ${wood} wood. Porters carry it home.`,
            'find',
          );
        }
        checkSupplies();
      }

      /** Out of jerky or water anywhere but a restock point: the trip ends. */
      function checkSupplies(): void {
        if (Decimal.lte(supply.value, 0)) collapse(STARVED);
        else if (Decimal.lte(water.value, 0) && !wold.isWaterSource(pos.value.x, pos.value.y))
          collapse(PARCHED);
      }

      /**
       * At the lodge or a camp: the satchel restocks and the notes bank. The pack
       * banks at the lodge, and at a camp too once the sledge drags it home.
       */
      function atRestock(): void {
        if (atLodge() || wold.hasTrophy('sledge')) bank();
        restock();
        wold.bankNotes();
      }

      function bank(): void {
        let any = false;
        for (const item of PACK_ITEMS) {
          const amount = pack.get(item);
          if (amount.gt(0)) {
            stores[item].value = Decimal.add(stores[item].value, amount);
            any = true;
          }
        }
        if (any) {
          const banked = PACK_ITEMS.map((i) => `${Math.floor(pack.get(i).toNumber())} ${i}`);
          say(`Banked at the lodge: ${banked.join(', ')}.`, 'good');
          beat('first haul banked');
        }
        pack.clear();
      }

      function restock(): void {
        const room = supplyCap.value - num(supply);
        if (room <= 0) return;
        const take = Math.min(room, num(stores.jerky));
        if (take <= 0) return;
        stores.jerky.value = Decimal.sub(stores.jerky.value, take).max(0);
        supply.value = Decimal.add(supply.value, take);
      }

      function collapse(text: string): void {
        pack.clear();
        path.value = [];
        action.value = 'idle';
        actionClock.progress.value = 0;
        supply.value = 0;
        wold.loseNotes();
        pos.value = { ...LODGE };
        wold.reveal(LODGE.x, LODGE.y, wold.sight.value);
        restock();
        refill();
        say(`${text} The haul is lost.`, 'bad');
        beat('first loss');
      }

      // === HUNTING ===

      const hartTrailKills = tunable(registry, 'hunt/hartTrailKills', () => HART_TRAIL_KILLS);
      /** The Hart shows itself only to a huntsman who has hunted the deepwood a while. */
      const hartTrail = computed<HartTrail>(() => {
        const have = (kills.value.stag ?? 0) + (kills.value.aurochs ?? 0);
        return { have, need: hartTrailKills.value, open: have >= hartTrailKills.value };
      });
      const herdAt = (x: number, y: number): SpeciesDef | null => {
        const id = wold.tileAt(x, y).herd;
        if (id === 'hart' && !hartTrail.value.open) return null;
        return id && wold.stock.value[tileIndex(x, y)] > 0 ? speciesById.get(id)! : null;
      };
      const huntChance = (s: SpeciesDef): number => winChance(prowess.value, s.threat);

      function hunt(): boolean {
        if (chronicle.won.value || action.value !== 'idle') return false;
        const s = herdAt(pos.value.x, pos.value.y);
        if (!s) return false;
        if (Decimal.lt(supply.value, supplyPerHunt.value)) return false;
        if (Decimal.lt(water.value, waterPerHunt.value)) return false;
        supply.value = Decimal.sub(supply.value, supplyPerHunt.value);
        water.value = Decimal.sub(water.value, waterPerHunt.value);
        action.value = 'hunt';
        actionClock.progress.value = 0;
        return true;
      }

      function resolveHunt(): void {
        action.value = 'idle';
        const { x, y } = pos.value;
        const s = herdAt(x, y);
        if (!s) return;
        if (random() >= huntChance(s)) {
          if (s.dangerous) {
            collapse(`The ${s.displayName.toLowerCase()} turns on you. You are carried home torn.`);
          } else {
            say(`The ${s.displayName.toLowerCase()} bolts.`);
            checkSupplies();
          }
          return;
        }
        wold.stock.value[tileIndex(x, y)] -= 1;
        kills.value = { ...kills.value, [s.id]: (kills.value[s.id] ?? 0) + 1 };
        skill.addXp(huntXp(s.band));
        beat(`first ${s.id}`);
        if (s.id === 'hart') {
          finish();
          return;
        }
        if (s.trophy) {
          const trophy = TROPHIES.find((tr) => tr.id === s.trophy)!;
          wold.grantTrophy(trophy.id);
          say(
            `${s.displayName} is taken. Its trophy: ${trophy.displayName}. ${trophy.blurb}`,
            'find',
          );
          beat(`trophy ${trophy.id}`);
        }
        const mult = toNumber(yieldChains.get(s.id)!.apply(1));
        const want: Record<PackItem, number> = {
          meat: s.meat * mult,
          hide: s.hide * mult,
          antler: s.antler * mult,
        };
        let kept = 0;
        let offered = 0;
        for (const item of PACK_ITEMS) {
          offered += want[item];
          kept += pack.add(item, want[item]).toNumber();
        }
        const left = offered - kept;
        say(
          `${s.displayName} taken.${left > 0.5 ? ` The pack is full — you leave ${Math.round(left)} behind.` : ''}`,
          'good',
        );
        if (s.band === 4 && hartTrail.value.have === hartTrail.value.need) {
          say(
            'Pale hairs on a thorn. The Hart’s trail is open — it waits at the heart of the Deepwood.',
            'find',
          );
          beat('hart trail');
        }
        checkSupplies();
      }

      // === CAMPS ===

      const nextCampCost = computed(() => campCost(wold.camps.value.length));
      function buildCamp(): boolean {
        const i = here();
        if (wold.tiles[i].feature !== 'waystone' || wold.isCamp(i)) return false;
        if (!Decimal.gte(stores.wood.value, nextCampCost.value)) return false;
        stores.wood.value = Decimal.sub(stores.wood.value, nextCampCost.value);
        wold.raiseCamp(i);
        say('You raise a camp at the waystone. Porters will keep it in jerky.', 'good');
        beat(`camp ${wold.camps.value.length}`);
        restock();
        return true;
      }

      // === THE ENDING ===

      function finish(): void {
        chronicle.won.value = true;
        path.value = [];
        action.value = 'idle';
        beat('the Hart');
        say('The Pale Hart lies still in the Deepwood. The wold is yours.', 'find');
      }

      // === TICK ===
      // Standing at a restock point refills the satchel; standing at the lodge also banks.

      ctx.onTick(() => {
        if (chronicle.won.value) return;
        if (action.value !== 'idle') return;
        if (wold.isWaterSource(pos.value.x, pos.value.y)) refill();
        if (wold.isRestock(pos.value.x, pos.value.y)) atRestock();
      });

      ctx.onLoad(() => {
        wold.reveal(pos.value.x, pos.value.y, wold.sight.value);
        say('The lodge fire is still warm. The wold is as you left it.');
      });

      wold.reveal(LODGE.x, LODGE.y, wold.sight.value);
      wold.bankNotes();
      refill();
      supply.value = Math.min(supplyCap.value, num(stores.jerky));
      stores.jerky.value = Decimal.sub(stores.jerky.value, supply.value);

      api = {
        pos,
        path,
        action,
        actionClock,
        supply,
        supplyCap,
        water,
        waterCap,
        pack,
        packItems,
        packCap,
        packLoad,
        skill,
        prowess,
        yieldChains,
        kills,
        bestiary,
        hartTrail,
        campCost: nextCampCost,
        herdAt,
        huntChance,
        hereField: () => wold.fieldFrom(pos.value),
        hereWaterField: () => wold.fieldFrom(pos.value, 'water'),
        routeTo,
        walkTo,
        hunt,
        buildCamp,
      };
      ctx.provide(HuntsmanKey, api);
    },
  };
}

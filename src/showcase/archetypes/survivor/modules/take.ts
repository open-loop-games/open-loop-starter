import {
  Decimal,
  Formula,
  addResource,
  createMultiplicativeModifier,
  createReset,
  createSeededRNG,
  createSkill,
  getSkillProgress,
  random,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type LevelDrivenSkill,
} from '@open-loop/engine';
import { reactive } from 'vue';
import {
  ANCHORS,
  LADDER,
  PERK_BY_ID,
  PERK_STEP,
  RATINGS,
  REELS_PER_CLOUT,
  STARS,
  type Driver,
  type PerkId,
  type RatingDef,
  type StarDef,
} from '../data';
import { MetaKey } from './meta';
import { SurvivorTuningRegistryKey } from './tuning';
import {
  createArena,
  currentScene,
  stepArena,
  type ArenaInput,
  type ArenaMods,
  type ArenaState,
  type TakeEnd,
} from './sim/arena';
import {
  applyCard,
  chooseCard,
  drawOffer,
  emptyPerks,
  isOffensive,
  type Card,
  type DraftTally,
  type PerkStacks,
} from './sim/draft';
import { createSteerer } from './sim/steering';

export type Screen = 'call-sheet' | 'take' | 'rewrite' | 'wrap';

export interface WrapReport {
  end: TakeEnd;
  seconds: number;
  kills: number;
  reels: number;
  clout: number;
  level: number;
  rating: string;
  star: string;
  driver: Driver;
  inShotKills: number;
  /** The rating this take opened, if it opened one. */
  unlockedRating: string | null;
}

/** The take's reactive surface for the UI. The arena itself is deliberately not reactive. */
export interface TakeView {
  screen: Screen;
  takeNumber: number;
  star: StarDef;
  rating: RatingDef;
  driver: Driver;
  hud: {
    t: number;
    scene: number;
    hp: number;
    maxHp: number;
    level: number;
    progress: number;
    reels: number;
    kills: number;
    extras: number;
    rigs: { id: string; name: string; level: number }[];
  };
  offer: Card[];
  pendingRewrites: number;
  /** The page an improvising star took last, for the HUD to announce. */
  lastPage: { card: Card; at: number } | null;
  wrap: WrapReport | null;
}

export interface StartOptions {
  star: StarDef['id'];
  rating: number;
  driver: Driver;
  /** Seeds the floor and the draft. Defaults to a draw from the engine's RNG. */
  seed?: number;
}

export interface TakeApi {
  view: TakeView;
  /** Movement for a player-driven take, each axis in [−1, 1]. Ignored while a star improvises. */
  input: ArenaInput;
  /** The live floor; null between takes. Plain and mutated in place every tick. */
  arena(): ArenaState | null;
  perks: PerkStacks;
  rewrites: LevelDrivenSkill;
  /** The multipliers the chains resolve, as the step reads them this tick. */
  mods(): ArenaMods;
  tally: DraftTally;
  startTake(options: StartOptions): void;
  pickCard(index: number): void;
  toCallSheet(): void;
}

export const TakeKey: InjectionKey<TakeApi> = Symbol('survivor/take') as InjectionKey<TakeApi>;

let api: TakeApi;

export function getTake(): TakeApi {
  return api;
}

/**
 * One take on the floor, from Action! to CUT or a wipeout. The rewrite ladder is a skill
 * over banked reels; the rewrite perks bind into the meta chains; the floor steps on every
 * engine tick while the take screen is up. A take ends by banking clout and resetting this
 * module's persistent context, so a take is never resumed from a save.
 *
 * Who calls the moves is the take's `driver`. An improvising star's steering writes the
 * input and its draft policy answers each rewrite at once; a player's input is read as it
 * stands, and a rewrite waits for `pickCard`. Nothing else differs.
 */
export function createTakeModule(): EngineModule {
  return {
    id: 'survivor/take',
    dependencies: ['survivor/tuning', 'survivor/meta'],
    install(ctx) {
      const meta = ctx.inject(MetaKey);
      const tuning = ctx.inject(SurvivorTuningRegistryKey);
      const contactScale = tunable(tuning, 'contact/scale', () => 1);
      const baseHp = tunable(tuning, 'player/baseHp', () => ANCHORS.playerHp);

      const view = reactive<TakeView>({
        screen: 'call-sheet',
        takeNumber: meta.record.takes.value + 1,
        star: STARS[0]!,
        rating: RATINGS[0]!,
        driver: 'player',
        hud: {
          t: 0,
          scene: 0,
          hp: 0,
          maxHp: 0,
          level: 1,
          progress: 0,
          reels: 0,
          kills: 0,
          extras: 0,
          rigs: [],
        },
        offer: [],
        pendingRewrites: 0,
        lastPage: null,
        wrap: null,
      }) as TakeView;
      const input: ArenaInput = { mx: 0, my: 0 };
      const perks = reactive<PerkStacks>(emptyPerks()) as PerkStacks;
      const tally: DraftTally = { taken: 0, defensive: 0 };
      const steerer = createSteerer();
      let arena: ArenaState | null = null;
      let draftRng: () => number = random;

      // The ladder from the spine: reels to reach level n+1 is x0·(rⁿ−1)/(r−1), inverted
      // here to level = 1 + ⌊log_r(1 + reels·(r−1)/x0)⌋.
      const rewrites = createSkill({
        id: 'rewrites',
        xpToLevel: (xp) =>
          Formula.variable(xp)
            .mul((LADDER.r - 1) / LADDER.x0)
            .add(1)
            .log(LADDER.r)
            .floor()
            .add(1),
        levelToMultiplier: () => 1,
        description: 'Rewrites',
        onLevelUp: (from, to) => {
          view.pendingRewrites += Number(Decimal.sub(to, from));
          if (view.screen === 'take') openRewrite();
        },
      });

      const perkChain: Record<PerkId, keyof typeof meta.chains> = {
        'bigger-charges': 'damage',
        'crew-call': 'fireRate',
        stamina: 'maxHp',
        cardio: 'moveSpeed',
        'boom-mic': 'pickup',
      };
      for (const id of Object.keys(perkChain) as PerkId[]) {
        meta.chains[perkChain[id]].bind({
          id: `rewrite-${id}`,
          text: `Rewrite: ${PERK_BY_ID[id].name}`,
          modifier: createMultiplicativeModifier({
            multiplier: () => 1 + PERK_STEP[id] * perks[id],
            description: `Rewrite: ${PERK_BY_ID[id].name}`,
          }),
        });
      }

      const takeReset = createReset({ resetPersistentContexts: ['survivor/take'] });

      function mods(): ArenaMods {
        const star = view.star;
        return {
          damage: num(meta.chains.damage.apply(1)),
          fireRate: num(meta.chains.fireRate.apply(1)),
          moveSpeed: num(meta.chains.moveSpeed.apply(star.speedMult)),
          pickup: num(meta.chains.pickup.apply(1)),
          maxHp: Math.round(num(meta.chains.maxHp.apply(num(baseHp.value) * star.hpMult))),
          contact: num(contactScale.value),
        };
      }

      function syncHud(): void {
        if (!arena) return;
        const h = view.hud;
        h.t = arena.t;
        h.scene = currentScene(arena);
        h.hp = Math.max(0, arena.player.hp);
        h.maxHp = arena.player.maxHp;
        h.level = Number(rewrites.level.value);
        h.progress = getSkillProgress(rewrites);
        h.reels = arena.stats.reelsBanked;
        h.kills = arena.stats.kills;
        h.extras = arena.extras.length;
        if (
          h.rigs.length !== arena.rigs.length ||
          h.rigs.some((r, i) => r.level !== arena!.rigs[i]!.level)
        ) {
          h.rigs = arena.rigs.map((r) => ({ id: r.def.id, name: r.def.name, level: r.level }));
        }
      }

      function take(card: Card): void {
        applyCard(arena!, perks, card);
        tally.taken++;
        if (!isOffensive(card)) tally.defensive++;
        view.pendingRewrites--;
      }

      function openRewrite(): void {
        if (!arena) return;
        while (view.pendingRewrites > 0 && view.driver === 'instinct') {
          const offer = drawOffer(arena, perks, meta.offerSize(), draftRng);
          const card = offer[chooseCard(offer, view.star.instinct, view.driver, tally, arena)]!;
          take(card);
          view.lastPage = { card, at: arena.t };
        }
        if (view.pendingRewrites <= 0) return;
        view.offer = drawOffer(arena, perks, meta.offerSize(), draftRng);
        view.screen = 'rewrite';
      }

      function pickCard(index: number): void {
        if (!arena || view.screen !== 'rewrite') return;
        const card = view.offer[index];
        if (!card) return;
        take(card);
        view.offer = [];
        view.screen = 'take';
        syncHud();
        openRewrite();
      }

      function startTake(options: StartOptions): void {
        const star = STARS.find((s) => s.id === options.star);
        const rating = RATINGS[options.rating];
        if (!star || !rating) throw new Error(`survivor/take: unknown star or rating`);
        if (!meta.stars.getPurchasable(star.id)?.active.value)
          throw new Error(`survivor/take: ${star.name} is not signed`);
        if (!meta.ratings.getPurchasable(rating.id)?.active.value)
          throw new Error(`survivor/take: rating ${rating.label} is locked`);
        const seed = options.seed ?? Math.floor(random() * 2_147_483_647);
        takeReset.reset();
        Object.assign(perks, emptyPerks());
        tally.taken = 0;
        tally.defensive = 0;
        input.mx = 0;
        input.my = 0;
        view.star = star;
        view.rating = rating;
        view.driver = options.driver;
        view.pendingRewrites = 0;
        view.offer = [];
        view.lastPage = null;
        view.wrap = null;
        draftRng = createSeededRNG(seed ^ 0x5eed);
        arena = createArena({
          rng: createSeededRNG(seed),
          rating: rating.index,
          startRig: star.startRig,
          maxHp: mods().maxHp,
        });
        view.hud.rigs = [];
        view.screen = 'take';
        syncHud();
      }

      function endTake(end: TakeEnd): void {
        if (!arena) return;
        const record = meta.record;
        const earned = Math.floor(arena.stats.reelsBanked / REELS_PER_CLOUT);
        const level = Number(rewrites.level.value);
        record.takes.value++;
        record.bestSeconds.value = Math.max(record.bestSeconds.value, arena.t);
        record.totalKills.value += arena.stats.kills;
        const before = record.bestRatingCleared.value;
        if (end === 'cut') record.bestRatingCleared.value = Math.max(before, view.rating.index);
        const next = RATINGS[record.bestRatingCleared.value + 1];
        const unlocked = record.bestRatingCleared.value > before && next ? next.label : null;
        takeReset.reset();
        // Earnings land after the reset returns, outside its load guard.
        addResource(meta.clout, earned);
        view.wrap = {
          end,
          seconds: arena.t,
          kills: arena.stats.kills,
          reels: arena.stats.reelsBanked,
          clout: earned,
          level,
          rating: view.rating.label,
          star: view.star.name,
          driver: view.driver,
          inShotKills: arena.stats.inShotKills,
          unlockedRating: unlocked,
        };
        view.takeNumber = record.takes.value + 1;
        view.screen = 'wrap';
      }

      function toCallSheet(): void {
        arena = null;
        view.screen = 'call-sheet';
      }

      ctx.onTick((dt) => {
        if (!arena || view.screen !== 'take') return;
        const m = mods();
        if (view.driver === 'instinct')
          Object.assign(input, steerer.steer(arena, m, view.star.instinct, dt));
        const banked = stepArena(arena, input, m, dt);
        if (banked > 0) rewrites.addXp(banked);
        syncHud();
        if (arena.ended) endTake(arena.ended);
      });

      // A take is never resumed from a save: a load mid-take forfeits it.
      ctx.onLoad(() => {
        takeReset.reset();
        arena = null;
        view.screen = 'call-sheet';
        view.takeNumber = meta.record.takes.value + 1;
      });

      api = {
        view,
        input,
        arena: () => arena,
        perks,
        rewrites,
        mods,
        tally,
        startTake,
        pickCard,
        toCallSheet,
      };
      ctx.provide(TakeKey, api);
    },
  };
}

function num(v: DecimalSource): number {
  return typeof v === 'number' ? v : new Decimal(v).toNumber();
}

/**
 * The soundstage floor drawn with pixi: a read-only projection of the arena. Each animation
 * frame the host hands it the arena and it draws; it writes nothing back. It is the one owner
 * of the world → screen mapping: the world container's position is the camera, pinned to the
 * dead-reckoned double, and everything over the lens (vignette, edge arrows) is in a screen
 * container above it.
 *
 * Pixi objects stay out of Vue reactivity: the host keeps this class in a plain `let`, and a
 * reactive proxy over a pixi object corrupts pixi's bookkeeping. The app does not run its own
 * ticker; the host's animation-frame loop calls `render`, so starter's two fields share one
 * loop shape whatever draws them.
 *
 * Bodies are Kenney figures turned to face where they walk, tinted half-way toward their
 * kind's colour so the kinds read apart; the cast stand on rings. Effects are unTied
 * animations played to their last frame, longer than the sim keeps the entry that started
 * them (`bursts.ts`). The art and its packing are in `floor-art.ts`.
 *
 * Colours are the costume's (`soundstage.css`), mirrored as literals, because a renderer
 * cannot read CSS variables per draw. The billing face is read from `--font-billing` once.
 */
import {
  Application,
  Container,
  FillPattern,
  Graphics,
  Sprite,
  Text,
  Texture,
  type TextStyleOptions,
} from 'pixi.js';
import { ANCHORS, LEADS, MARK_KILLS, SCRIPT } from '../../data';
import {
  PLAYER_RADIUS,
  SHOT_RADIUS,
  WORLD_HALF,
  orbitBottles,
  type ArenaState,
  type Extra,
  type Fx,
  type Reel,
} from '../../modules/sim/arena';
import { createBursts, type Burst } from './bursts';
import { FIGURE_ANCHOR, FIGURE_HEAD, loadFloorArt, type Figure, type FloorArt } from './floor-art';
import { chase, createReckoner } from './smoothing';

// ─── Palette ────────────────────────────────────────────────────────────────

const C = {
  floor: 0x1b1815,
  offstage: 0x0c0b0a,
  hazardA: 0xf2a73a,
  hazardB: 0x110f0d,
  tapeBlue: 0x4b8fd6,
  tapeYellow: 0xd9b84a,
  chalk: 0xece5d8,
  tungsten: 0xf2a73a,
  squib: 0xd8452f,
  gold: 0xffd56b,
  nitrate: 0xb9b3a7,
  greenlight: 0x5cb27a,
  bottle: 0x78c896,
} as const;

const KIND_FILL: Record<Extra['kind']['id'], number> = {
  grunt: 0x6c655e,
  biker: 0x8d5b3b,
  bruiser: 0x4b4541,
  henchman: 0x2c2b30,
  lead: 0xd8452f,
  rival: 0xd9b84a,
  'strike-crew': 0xf2a73a,
};

type KindId = Extra['kind']['id'];

/** How far each kind's figure is tinted toward its fill: enough to read the kinds apart. */
const TINT_SHARE = 0.5;
const KIND_TINT = Object.fromEntries(
  Object.entries(KIND_FILL).map(([k, c]) => [k, lerpColor(0xffffff, c, TINT_SHARE)]),
) as Record<KindId, number>;
/** A hurt double flushes squib red. */
const HURT_TINT = lerpColor(0xffffff, C.squib, 0.6);

// ─── Casting ────────────────────────────────────────────────────────────────

/** Grunts are the general public: a civilian per extra, picked by id so it keeps it. */
const CIVILIANS: readonly Figure[] = [
  'manBlue_stand',
  'manBrown_stand',
  'manOld_stand',
  'manRed_stand',
  'womanGreen_stand',
  'womanOld_stand',
];
const KIND_FIGURE: Record<Exclude<KindId, 'grunt'>, Figure> = {
  biker: 'manRed_hold',
  bruiser: 'robot1_stand',
  henchman: 'hitman1_gun',
  lead: 'hitman2_machine',
  rival: 'womanGreen_gun',
  'strike-crew': 'soldier1_hold',
};
const DOUBLE_FIGURE: Figure = 'survivor1_gun';
/** A figure's head spans this share of its body's diameter. */
const FIGURE_SIZE = 0.9;
/** A cast member's ring, as a multiple of its radius: wide enough to show round the figure. */
const CAST_RING = 1.3;

function figureOf(e: Extra): Figure {
  const id = e.kind.id;
  return id === 'grunt' ? CIVILIANS[e.id % CIVILIANS.length]! : KIND_FIGURE[id];
}

/** The scale that puts a figure's head across a body of radius `r`. */
function figureScale(r: number): number {
  return ((2 * r) / FIGURE_HEAD) * FIGURE_SIZE;
}

// ─── Tuning of the drawing ──────────────────────────────────────────────────

/** How fast a decorative body chases its sample, per wall-clock second. */
const BODY_CHASE = 22;
/** World units past the screen edge a body still draws in, so nothing pops at the border. */
const CULL_MARGIN = 40;
const GRID_STEP = 160;
const WALL_BAND = 40;
/** How far the offstage dark reaches past the walls; past any view the camera can frame. */
const OFFSTAGE = 2000;
/** Live animations at once: kills come many a second on a full floor, rigs a few. */
const POP_CAP = 96;
const BLAST_CAP = 16;
/** World size a kill pop spans: about a body's width. */
const POP_SIZE = 52;
/** A squib ring's art spans this multiple of the ring's reach, so its burst fills the ring. */
const RING_SPAN = 2.1;

/** Floor marks: actors' T-marks taped at fixed world spots. */
const MARKS: { x: number; y: number; blue: boolean; rot: number }[] = (() => {
  const out = [];
  let seed = 1234567;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 90; i++) {
    out.push({
      x: (rnd() * 2 - 1) * WORLD_HALF,
      y: (rnd() * 2 - 1) * WORLD_HALF,
      blue: rnd() < 0.5,
      rot: rnd() * Math.PI,
    });
  }
  return out;
})();

// ─── Bodies ─────────────────────────────────────────────────────────────────

/** Where a crowd extra is drawn, chasing its sample. Keyed by `Extra.id`, never by sprite. */
interface CrowdAt {
  x: number;
  y: number;
  seen: number;
}

/** A staged body: the lead, a rival or a strike-crew member, on its ring, with its billing. */
interface CastBody {
  root: Container;
  ring: Graphics;
  figure: Sprite;
  label: Text;
  x: number;
  y: number;
  seen: number;
}

export class FloorScene {
  /** Settles once pixi has a renderer; `render` before then draws nothing. */
  readonly ready: Promise<void>;

  private app: Application | null = null;
  private disposed = false;
  private font = 'sans-serif';

  private world = new Container();
  private lens = new Container();
  private chalk = new Graphics();
  private shot = new Graphics();
  private shotLabel: Text | null = null;
  private reelLayer = new Container();
  private blastLayer = new Container();
  private crowdLayer = new Container();
  private castLayer = new Container();
  private tracers = new Graphics();
  private popLayer = new Container();
  private bars = new Graphics();
  private bottles = new Graphics();
  private double = new Container();
  private doubleFigure = new Sprite();
  private vignette = new Sprite();
  private arrows = new Graphics();

  private art: FloorArt | null = null;
  private textures: {
    reel: Record<'nitrate' | 'nitrateBig' | 'gold' | 'goldBig', Texture>;
    glow: Texture;
    hazard: Texture;
  } | null = null;
  private vignetteTexture: Texture | null = null;

  private crowd = new Map<number, CrowdAt>();
  /**
   * Handed out in arena order every frame, so overlapping bodies stack as the arena lists
   * them, later arrivals on top. The drawn position lives in `crowd`, so a sprite that draws
   * a different extra next frame carries no position over.
   */
  private crowdSprites: Sprite[] = [];
  private crowdDrawn = 0;
  private cast = new Map<number, CastBody>();
  private reelSprites: Sprite[] = [];
  private reelAt = new WeakMap<Reel, { x: number; y: number }>();
  /** Squib rings and pyro cones, under the bodies; kill pops, over them. */
  private blasts = createBursts<Fx>(BLAST_CAP);
  private pops = createBursts<Fx>(POP_CAP);
  private blastSprites: Sprite[] = [];
  private popSprites: Sprite[] = [];
  private shotAt = { x: 0, y: 0 };

  private reckoner = createReckoner();
  private arena: ArenaState | null = null;
  private lastT = -1;
  private frameNo = 0;
  private cpuMs = 0;

  constructor(private host: HTMLElement) {
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    const app = new Application();
    await app.init({
      width: Math.max(1, this.host.clientWidth),
      height: Math.max(1, this.host.clientHeight),
      background: C.offstage,
      antialias: true,
      autoStart: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    if (this.disposed) {
      // Unmounted while pixi was starting.
      app.destroy(true, { children: true });
      return;
    }
    const art = await loadFloorArt();
    if (this.disposed) {
      art.destroy();
      app.destroy(true, { children: true });
      return;
    }
    this.art = art;
    this.app = app;
    this.host.appendChild(app.canvas);
    const billing = getComputedStyle(this.host).getPropertyValue('--font-billing').trim();
    if (billing) this.font = billing;

    this.textures = this.makeTextures(app);
    this.world.addChild(
      this.makeSet(),
      this.chalk,
      this.shot,
      this.reelLayer,
      this.blastLayer,
      this.crowdLayer,
      this.castLayer,
      this.tracers,
      this.popLayer,
      this.bars,
      this.bottles,
      this.double,
    );
    this.shotLabel = this.text(`REC  ×${ANCHORS.shotMult}`, 0xece5d8, 0.7);
    this.shotLabel.anchor.set(0, 1);
    this.world.addChild(this.shotLabel);

    const glow = new Sprite(this.textures.glow);
    glow.anchor.set(0.5);
    this.doubleFigure.texture = art.figure[DOUBLE_FIGURE];
    this.doubleFigure.anchor.set(FIGURE_ANCHOR.x, FIGURE_ANCHOR.y);
    this.doubleFigure.scale.set(figureScale(PLAYER_RADIUS));
    this.double.addChild(glow, this.doubleFigure);

    this.lens.addChild(this.vignette, this.arrows);
    app.stage.addChild(this.world, this.lens);
    this.resize();
  }

  // ─── Setup ────────────────────────────────────────────────────────────────

  private text(value: string, fill: number, alpha = 1): Text {
    const style: TextStyleOptions = {
      fontFamily: this.font,
      fontSize: 12,
      fontWeight: '700',
      fill,
    };
    const t = new Text({ text: value, style, resolution: window.devicePixelRatio || 1 });
    t.alpha = alpha;
    return t;
  }

  private makeTextures(app: Application) {
    const resolution = window.devicePixelRatio || 1;
    const bake = (draw: (g: Graphics) => void): Texture => {
      const g = new Graphics();
      draw(g);
      const tex = app.renderer.generateTexture({ target: g, resolution, antialias: true });
      g.destroy();
      return tex;
    };
    const reel = (fill: number, r: number) => (g: Graphics) =>
      g.circle(0, 0, r).fill(fill).circle(0, 0, 1.6).fill(C.floor);
    return {
      reel: {
        nitrate: bake(reel(C.nitrate, 4.5)),
        nitrateBig: bake(reel(C.nitrate, 6)),
        gold: bake(reel(C.gold, 4.5)),
        goldBig: bake(reel(C.gold, 6)),
      },
      glow: Texture.from(
        radialCanvas(180, [
          [4 / 90, 'rgba(242,167,58,0.18)'],
          [1, 'rgba(242,167,58,0)'],
        ]),
      ),
      hazard: Texture.from(hazardTile()),
    };
  }

  /** The static set: offstage dark, the hazard-striped walls, the floor, its grid and tape marks. */
  private makeSet(): Graphics {
    const W = WORLD_HALF;
    const g = new Graphics();
    const out = W + WALL_BAND + OFFSTAGE;
    g.rect(-out, -out, out * 2, out * 2).fill(C.offstage);
    g.rect(-W - WALL_BAND, -W - WALL_BAND, (W + WALL_BAND) * 2, (W + WALL_BAND) * 2).fill(
      new FillPattern(this.textures!.hazard, 'repeat'),
    );
    g.rect(-W, -W, W * 2, W * 2).fill(C.floor);
    for (let x = Math.ceil(-W / GRID_STEP) * GRID_STEP; x < W; x += GRID_STEP)
      g.moveTo(x, -W).lineTo(x, W);
    for (let y = Math.ceil(-W / GRID_STEP) * GRID_STEP; y < W; y += GRID_STEP)
      g.moveTo(-W, y).lineTo(W, y);
    g.stroke({ width: 1, color: C.chalk, alpha: 0.035 });
    for (const m of MARKS) {
      const c = Math.cos(m.rot);
      const s = Math.sin(m.rot);
      const at = (lx: number, ly: number) =>
        [m.x + lx * c - ly * s, m.y + lx * s + ly * c] as const;
      g.moveTo(...at(-12, 0))
        .lineTo(...at(12, 0))
        .moveTo(...at(0, 0))
        .lineTo(...at(0, 14))
        .stroke({
          width: 4,
          color: m.blue ? C.tapeBlue : C.tapeYellow,
          alpha: m.blue ? 0.28 : 0.24,
        });
    }
    return g;
  }

  // ─── Frame ────────────────────────────────────────────────────────────────

  /**
   * Draws the arena as it stands. `dt` is the wall-clock seconds since the last call and `now`
   * the wall clock in seconds; the sim's own time never paces the drawing.
   */
  render(a: ArenaState | null, dt: number, now: number): void {
    const app = this.app;
    if (!app || !this.textures || !this.art) return;
    const t0 = performance.now();
    this.frameNo++;
    const w = app.screen.width;
    const h = app.screen.height;

    if (!a) {
      this.world.visible = this.lens.visible = false;
      app.render();
      return;
    }
    this.world.visible = this.lens.visible = true;
    if (a !== this.arena) this.begin(a, now);
    if (a.t !== this.lastT) {
      this.reckoner.sample(a.player.x, a.player.y, a.t, now);
      this.lastT = a.t;
    }
    const cam = this.reckoner.at(now, dt);
    this.world.position.set(w / 2 - cam.x, h / 2 - cam.y);
    const view = { x0: cam.x - w / 2, y0: cam.y - h / 2, x1: cam.x + w / 2, y1: cam.y + h / 2 };

    this.shotAt.x = chase(this.shotAt.x, a.shot.x, BODY_CHASE, dt);
    this.shotAt.y = chase(this.shotAt.y, a.shot.y, BODY_CHASE, dt);
    this.drawChalk(a);
    this.drawShot(a);
    this.drawReels(a, dt, view);
    this.drawBursts(a, now, view);
    this.bars.clear();
    this.drawBodies(a, dt, view, cam);
    this.drawTracers(a);
    this.drawBottles(a, cam);
    this.drawDouble(a, cam);
    this.drawArrows(a, cam, w, h);

    app.render();
    this.cpuMs = performance.now() - t0;
  }

  /** A new take: no history carries over from the last one. */
  private begin(a: ArenaState, now: number): void {
    this.arena = a;
    this.lastT = a.t;
    this.reckoner.reset(a.player.x, a.player.y, a.t, now);
    this.shotAt = { x: a.shot.x, y: a.shot.y };
    this.crowd.clear();
    for (const b of this.cast.values()) b.root.destroy({ children: true });
    this.cast.clear();
    this.reelAt = new WeakMap();
    this.blasts = createBursts<Fx>(BLAST_CAP);
    this.pops = createBursts<Fx>(POP_CAP);
  }

  /** The script's chalk marks: a ring with an X, kills inside it drawn round the ring. */
  private drawChalk(a: ArenaState): void {
    const g = this.chalk.clear();
    const r = SCRIPT.markRadius;
    for (const m of a.marks) {
      const live = !m.filled && !a.lead;
      if (m.filled) g.circle(m.x, m.y, r).stroke({ width: 5, color: C.greenlight, alpha: 0.4 });
      else
        dashedCircle(g, m.x, m.y, r, 18, 10).stroke({
          width: 3,
          color: C.chalk,
          alpha: live ? 0.32 : 0.1,
        });
      if (live && m.kills > 0)
        g.arc(
          m.x,
          m.y,
          r,
          -Math.PI / 2,
          -Math.PI / 2 + (Math.PI * 2 * m.kills) / MARK_KILLS,
        ).stroke({ width: 6, color: C.tungsten, alpha: 0.7 });
      g.poly(cross(m.x, m.y, 16, 6)).fill({
        color: m.filled ? C.greenlight : C.chalk,
        alpha: m.filled ? 0.5 : 0.35,
      });
    }
  }

  /** The shot: a viewfinder frame drifting over the floor, its tally light blinking. */
  private drawShot(a: ArenaState): void {
    const { x, y } = this.shotAt;
    const r = SHOT_RADIUS;
    const hw = r * 1.15;
    const hh = r * 0.68;
    const L = 22;
    const g = this.shot.clear();
    g.circle(x, y, r).fill({ color: C.tungsten, alpha: 0.05 });
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      g.moveTo(x + sx * hw, y + sy * hh - sy * L)
        .lineTo(x + sx * hw, y + sy * hh)
        .lineTo(x + sx * hw - sx * L, y + sy * hh);
    }
    g.stroke({ width: 2, color: C.chalk, alpha: 0.55 });
    if (Math.floor(a.t * 2) % 2 === 0) g.circle(x - hw + 14, y - hh + 14, 5).fill(C.squib);
    this.shotLabel!.position.set(x - hw + 24, y - hh + 22);
  }

  private drawReels(a: ArenaState, dt: number, v: View): void {
    const tex = this.textures!.reel;
    let used = 0;
    for (const r of a.reels) {
      let at = this.reelAt.get(r);
      if (!at) this.reelAt.set(r, (at = { x: r.x, y: r.y }));
      at.x = chase(at.x, r.x, BODY_CHASE, dt);
      at.y = chase(at.y, r.y, BODY_CHASE, dt);
      if (!inView(at, v, 20)) continue;
      let s = this.reelSprites[used];
      if (!s) {
        s = new Sprite();
        s.anchor.set(0.5);
        this.reelLayer.addChild(s);
        this.reelSprites.push(s);
      }
      s.texture = r.gold
        ? r.value >= 2
          ? tex.goldBig
          : tex.gold
        : r.value >= 2
          ? tex.nitrateBig
          : tex.nitrate;
      s.position.set(at.x, at.y);
      s.visible = true;
      used++;
    }
    for (let i = used; i < this.reelSprites.length; i++) this.reelSprites[i]!.visible = false;
  }

  /**
   * The rigs' blasts under the bodies and the kill pops over them, each an unTied animation
   * started the first frame its sim entry is seen and played to its end.
   */
  private drawBursts(a: ArenaState, now: number, v: View): void {
    const fx = this.art!.fx;
    for (const f of a.fx) {
      if (f.kind === 'ring') this.blasts.start(f, fx.ring.length, now);
      else if (f.kind === 'cone') this.blasts.start(f, fx.cone.length, now);
      else if (f.kind === 'pop') this.pops.start(f, (f.gold ? fx.gold : fx.pop).length, now);
    }
    this.place(this.blasts.advance(now), this.blastSprites, this.blastLayer, v);
    this.place(this.pops.advance(now), this.popSprites, this.popLayer, v);
  }

  private place(live: readonly Burst<Fx>[], pool: Sprite[], layer: Container, v: View): void {
    const fx = this.art!.fx;
    let used = 0;
    for (const b of live) {
      const f = b.source;
      if (f.kind === 'tracer' || !inView(f, v, 200)) continue;
      let s = pool[used];
      if (!s) {
        s = new Sprite();
        layer.addChild(s);
        pool.push(s);
      }
      used++;
      s.visible = true;
      s.position.set(f.x, f.y);
      if (f.kind === 'cone') {
        // The fire burst points up its frame from the bottom edge: turn it onto the heading.
        const tex = fx.cone[b.frame]!;
        s.texture = tex;
        s.anchor.set(0.5, 1);
        s.rotation = f.angle + Math.PI / 2;
        s.scale.set(f.r / tex.height);
      } else {
        const tex = (f.kind === 'ring' ? fx.ring : f.gold ? fx.gold : fx.pop)[b.frame]!;
        const span = f.kind === 'ring' ? f.r * RING_SPAN : POP_SIZE;
        s.texture = tex;
        s.anchor.set(0.5);
        s.rotation = 0;
        s.scale.set(span / Math.max(tex.width, tex.height));
      }
    }
    for (let i = used; i < pool.length; i++) pool[i]!.visible = false;
  }

  private drawBodies(
    a: ArenaState,
    dt: number,
    v: View,
    cam: Readonly<{ x: number; y: number }>,
  ): void {
    const art = this.art!;
    const frame = this.frameNo;
    let used = 0;
    for (const e of a.extras) {
      if (e.role) {
        this.drawCast(a, e, dt, v, cam);
        continue;
      }
      let b = this.crowd.get(e.id);
      if (!b) this.crowd.set(e.id, (b = { x: e.x, y: e.y, seen: frame }));
      b.seen = frame;
      b.x = chase(b.x, e.x, BODY_CHASE, dt);
      b.y = chase(b.y, e.y, BODY_CHASE, dt);
      if (!inView(b, v, CULL_MARGIN)) continue;
      const s = this.crowdSprites[used] ?? this.newCrowdSprite();
      used++;
      const figure = figureOf(e);
      s.texture = e.flash > 0 ? art.flash[figure] : art.figure[figure];
      s.tint = e.flash > 0 ? 0xffffff : KIND_TINT[e.kind.id];
      s.scale.set(figureScale(e.kind.radius));
      s.rotation = facing(e, b, cam);
      s.position.set(b.x, b.y);
      s.visible = true;
      if (e.kind.id === 'bruiser' && e.hp < e.maxHp) {
        const r = e.kind.radius;
        this.bars
          .rect(b.x - r, b.y - r - 8, r * 2, 3)
          .fill({ color: 0x000000, alpha: 0.6 })
          .rect(b.x - r, b.y - r - 8, (r * 2 * Math.max(0, e.hp)) / e.maxHp, 3)
          .fill(C.squib);
      }
    }
    for (let i = used; i < this.crowdDrawn; i++) this.crowdSprites[i]!.visible = false;
    this.crowdDrawn = used;
    for (const [id, b] of this.crowd) if (b.seen !== frame) this.crowd.delete(id);
    for (const [id, b] of this.cast) {
      if (b.seen === frame) continue;
      b.root.destroy({ children: true });
      this.cast.delete(id);
    }
  }

  private newCrowdSprite(): Sprite {
    const s = new Sprite();
    s.anchor.set(FIGURE_ANCHOR.x, FIGURE_ANCHOR.y);
    this.crowdLayer.addChild(s);
    this.crowdSprites.push(s);
    return s;
  }

  /** The staged cast: the lead billed by name, a rival in gold, the strike crew in hazard stripe. */
  private drawCast(
    a: ArenaState,
    e: Extra,
    dt: number,
    v: View,
    cam: Readonly<{ x: number; y: number }>,
  ): void {
    const r = e.kind.radius;
    const crew = e.role === 'strike-crew';
    let b = this.cast.get(e.id);
    if (!b) {
      const root = new Container();
      const ring = new Graphics();
      const figure = new Sprite(this.art!.figure[figureOf(e)]);
      figure.anchor.set(FIGURE_ANCHOR.x, FIGURE_ANCHOR.y);
      figure.scale.set(figureScale(r));
      figure.tint = KIND_TINT[e.kind.id];
      const label = this.text(
        e.role === 'lead'
          ? LEADS[a.rating]!.name.toUpperCase()
          : crew
            ? 'STRIKE CREW'
            : 'GUEST STAR',
        crew ? C.hazardA : C.chalk,
      );
      label.anchor.set(0.5, 1);
      root.addChild(ring, figure, label);
      this.castLayer.addChild(root);
      b = { root, ring, figure, label, x: e.x, y: e.y, seen: this.frameNo };
      this.cast.set(e.id, b);
    }
    b.seen = this.frameNo;
    b.x = chase(b.x, e.x, BODY_CHASE, dt);
    b.y = chase(b.y, e.y, BODY_CHASE, dt);
    b.root.visible = inView(b, v, CULL_MARGIN + r);
    if (!b.root.visible) return;
    b.root.position.set(b.x, b.y);
    b.figure.rotation = facing(e, b, cam);
    const ringR = r * CAST_RING;
    // Under steady fire a flash would never clear off the figure, so a hit lights the ring.
    b.ring.clear();
    if (crew) {
      dashedCircle(b.ring, 0, 0, ringR, 9, 7).stroke({ width: 3, color: C.hazardA });
      b.label.position.set(0, -ringR - 4);
      return;
    }
    b.ring.circle(0, 0, ringR).stroke({
      width: e.role === 'lead' ? 4 : 3,
      color: e.flash > 0 ? C.chalk : e.role === 'rival' ? C.gold : C.squib,
    });
    b.label.position.set(0, -ringR - 14);
    const bw = r * 2.4;
    this.bars
      .rect(b.x - bw / 2, b.y - ringR - 12, bw, 5)
      .fill({ color: 0x000000, alpha: 0.65 })
      .rect(b.x - bw / 2, b.y - ringR - 12, (bw * Math.max(0, e.hp)) / e.maxHp, 5)
      .fill(e.role === 'lead' ? C.squib : C.gold);
  }

  /** The rigs' tracers, over the bodies: a line from the double to what it hit. */
  private drawTracers(a: ArenaState): void {
    const g = this.tracers.clear();
    for (const f of a.fx) {
      if (f.kind !== 'tracer') continue;
      const k = f.life / f.max;
      g.moveTo(f.x, f.y)
        .lineTo(f.x2, f.y2)
        .stroke(
          f.heavy
            ? { width: 3, color: C.gold, alpha: k }
            : { width: 1.5, color: C.chalk, alpha: 0.85 * k },
        );
    }
  }

  /** Breakaway bottles orbit the drawn double, not its last sample, so they ride with it. */
  private drawBottles(a: ArenaState, cam: Readonly<{ x: number; y: number }>): void {
    const g = this.bottles.clear();
    const dx = cam.x - a.player.x;
    const dy = cam.y - a.player.y;
    for (const slot of a.rigs) {
      if (slot.def.shape !== 'orbit') continue;
      for (const b of orbitBottles(a, slot))
        g.circle(b.x + dx, b.y + dy, 7)
          .fill({ color: C.bottle, alpha: 0.9 })
          .stroke({ width: 1, color: C.chalk, alpha: 0.6 });
    }
  }

  /** The double: a lit figure turned to its heading, at the reckoned position. */
  private drawDouble(a: ArenaState, cam: Readonly<{ x: number; y: number }>): void {
    const p = a.player;
    this.double.position.set(cam.x, cam.y);
    this.doubleFigure.rotation = p.facing;
    this.doubleFigure.tint = p.hurt > 0 ? HURT_TINT : 0xffffff;
  }

  /** A target off camera gets an edge tick pointing back to it: the shot, a mark, the cast. */
  private drawArrows(
    a: ArenaState,
    cam: Readonly<{ x: number; y: number }>,
    w: number,
    h: number,
  ): void {
    const g = this.arrows.clear();
    const arrow = (target: { x: number; y: number }, color: number, alpha: number) => {
      const dx = target.x - cam.x;
      const dy = target.y - cam.y;
      if (Math.abs(dx) < w / 2 - 40 && Math.abs(dy) < h / 2 - 40) return;
      const ang = Math.atan2(dy, dx);
      const ex = clamp(w / 2 + Math.cos(ang) * (w / 2 - 30), 24, w - 24);
      const ey = clamp(h / 2 + Math.sin(ang) * (h / 2 - 30), 24, h - 24);
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const at = (lx: number, ly: number) => [ex + lx * c - ly * s, ey + lx * s + ly * c];
      g.poly([...at(10, 0), ...at(-6, -7), ...at(-6, 7)]).fill({ color, alpha });
    };
    arrow(this.shotAt, C.tungsten, 0.85);
    for (const m of a.marks) if (!m.filled && !a.lead) arrow(m, C.chalk, 0.75);
    if (a.rival) arrow(a.rival, C.gold, 1);
    if (a.lead && a.lead.hp > 0) arrow(a.lead, C.squib, 1);
  }

  // ─── Host surface ─────────────────────────────────────────────────────────

  /** Fits the renderer to the host, and the vignette to the new frame. */
  resize(): void {
    const app = this.app;
    if (!app) return;
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    app.renderer.resize(w, h);
    this.vignetteTexture?.destroy(true);
    // The lens, not the stage: dark at the frame's corners, clear at its middle.
    const c = document.createElement('canvas');
    c.width = Math.ceil(w / 2);
    c.height = Math.ceil(h / 2);
    const ctx = c.getContext('2d')!;
    const v = ctx.createRadialGradient(
      c.width / 2,
      c.height / 2,
      Math.min(c.width, c.height) * 0.35,
      c.width / 2,
      c.height / 2,
      Math.max(c.width, c.height) * 0.75,
    );
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, c.width, c.height);
    this.vignetteTexture = Texture.from(c);
    this.vignette.texture = this.vignetteTexture;
    this.vignette.width = w;
    this.vignette.height = h;
  }

  /** What the frame-time check reads beside the frame times. */
  stats(): { crowd: number; drawn: number; cast: number; reels: number; cpuMs: number } {
    return {
      crowd: this.crowd.size,
      drawn: this.crowdDrawn,
      cast: this.cast.size,
      reels: this.reelSprites.filter((s) => s.visible).length,
      cpuMs: Number(this.cpuMs.toFixed(2)),
    };
  }

  dispose(): void {
    this.disposed = true;
    const app = this.app;
    this.app = null;
    if (!app) return;
    // The renderer's teardown frees what this scene baked and drew. Destroying those textures
    // after it trips pixi's bind-group warnings, so only the art's slices are let go here.
    app.destroy(true, { children: true });
    this.art?.destroy();
    this.art = null;
    this.vignetteTexture = null;
    this.textures = null;
    this.crowd.clear();
    this.cast.clear();
    this.crowdSprites.length = 0;
    this.reelSprites.length = 0;
    this.blastSprites.length = 0;
    this.popSprites.length = 0;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

interface View {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function inView(p: { x: number; y: number }, v: View, margin: number): boolean {
  return p.x > v.x0 - margin && p.x < v.x1 + margin && p.y > v.y0 - margin && p.y < v.y1 + margin;
}

/** Where a body faces: along its march in a set piece, else at the double it closes on. */
function facing(
  e: Extra,
  at: { x: number; y: number },
  cam: Readonly<{ x: number; y: number }>,
): number {
  return e.march ? Math.atan2(e.march.y, e.march.x) : Math.atan2(cam.y - at.y, cam.x - at.x);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function lerpColor(a: number, b: number, t: number): number {
  const ch = (c: number, s: number) => (c >> s) & 255;
  const mix = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

/**
 * An X of two butt-ended arms from the centre out to `arm` on each diagonal, `width` thick, as
 * one outline. Two stroked arms would double their alpha where they cross; one polygon
 * paints the crossing once, as the canvas's single stroked path did.
 */
function cross(x: number, y: number, arm: number, width: number): number[] {
  const o = width / 2 / Math.SQRT2;
  const i = width / Math.SQRT2;
  const pts = [
    [-arm + o, -arm - o],
    [0, -i],
    [arm - o, -arm - o],
    [arm + o, -arm + o],
    [i, 0],
    [arm + o, arm - o],
    [arm - o, arm + o],
    [0, i],
    [-arm + o, arm + o],
    [-arm - o, arm - o],
    [-i, 0],
    [-arm - o, -arm + o],
  ];
  return pts.flatMap(([px, py]) => [x + px!, y + py!]);
}

/** A circle stroked as dashes of `on` and gaps of `off` world units, as the canvas's line dash. */
function dashedCircle(g: Graphics, x: number, y: number, r: number, on: number, off: number) {
  const span = (on + off) / r;
  const dash = on / r;
  for (let a = 0; a < Math.PI * 2; a += span)
    g.moveTo(x + r * Math.cos(a), y + r * Math.sin(a)).arc(
      x,
      y,
      r,
      a,
      Math.min(a + dash, Math.PI * 2),
    );
  return g;
}

/** A square canvas with a radial gradient from its centre to its edge. */
function radialCanvas(size: number, stops: [number, string][]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

/** One 40-unit tile of the walls' hazard stripe. */
function hazardTile(): HTMLCanvasElement {
  const tile = document.createElement('canvas');
  tile.width = tile.height = 40;
  const t = tile.getContext('2d')!;
  t.fillStyle = '#110f0d';
  t.fillRect(0, 0, 40, 40);
  t.fillStyle = '#f2a73a';
  for (const o of [-40, 0, 40]) {
    t.beginPath();
    t.moveTo(o, 40);
    t.lineTo(o + 20, 40);
    t.lineTo(o + 60, 0);
    t.lineTo(o + 40, 0);
    t.fill();
  }
  return tile;
}

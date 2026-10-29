/**
 * The unit figures: one KayKit character per shown unit, on one shared clip set. A figure
 * idles where its squad stands, walks while it moves, attacks while its place is fighting,
 * and plays its death when its squad's figure count drops mid-fight. Each seat's figures
 * stand on a ground ring in its colour; a Rigger's drone hovers over it.
 *
 * Figures are decoration: each frame the scene says which figures stand where, and a
 * figure chases its slot. A figure is pooled by kind and seat, so a squad that grows and
 * shrinks reuses its clones instead of rebuilding skeletons.
 */
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { UnitKind } from '../../data/units';
import type { Spot } from './layout';
import type { Models } from './models';

export type Act = 'idle' | 'walk' | 'attack';

/** KayKit characters stand about 2.8 tall; this sets them against the Kenney city. */
const SCALE = 0.5;
const CHASE = 8;
/** How fast a figure turns to face its way, 1/s. */
const TURN = 10;
/** A figure further than this from its slot walks there. */
const WALKS = 0.12;
const DEATH_S = 1.6;
const MAX_FIGURES = 320;
const DRONE_HEIGHT = 1.6;

const ATTACK: Record<UnitKind, string> = {
  razor: 'Melee_Dualwield_Attack_Slice',
  hexer: 'Ranged_Magic_Spellcasting',
  rigger: 'Ranged_1H_Shoot',
  enforcer: 'Melee_2H_Attack_Slice',
};
const CLIP: Record<Act, (k: UnitKind) => string> = {
  idle: () => 'Idle_A',
  walk: () => 'Walking_A',
  attack: (k) => ATTACK[k],
};

interface Figure {
  kind: UnitKind;
  side: 'p' | 'e';
  ghost: boolean;
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
  act: Act | 'death';
  at: Spot;
  face: number;
  /** This frame's slot, facing and act, set by `put`. */
  goal: Spot | null;
  want: number;
  wantAct: Act;
  /** Seconds left of a death; the figure goes back to the pool at zero. */
  dying: number;
  /** Seconds since it last stood in a fight, so a loss mid-fight reads as a death. */
  fought: number;
}

export class Figures {
  readonly group = new THREE.Group();
  private live = new Map<string, Figure>();
  private pool = new Map<string, Figure[]>();
  private seen = new Set<string>();
  private ghostMats = new Map<THREE.Material, THREE.Material>();
  private clips = new Map<string, THREE.AnimationClip>();
  private rings: THREE.InstancedMesh;
  private drones: THREE.InstancedMesh;
  private eyes: THREE.InstancedMesh;
  private matrix = new THREE.Matrix4();
  private color = new THREE.Color();
  private time = 0;

  constructor(
    private models: Models,
    private colors: Record<'p' | 'e', number>,
  ) {
    this.rings = new THREE.InstancedMesh(
      new THREE.RingGeometry(0.3, 0.4, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, depthWrite: false }),
      MAX_FIGURES,
    );
    this.drones = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.34, 0.1, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x2a2f3a, metalness: 0.6, roughness: 0.4 }),
      MAX_FIGURES,
    );
    // The eye glows past the bloom threshold: unlit and not tone mapped.
    this.eyes = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.07, 8, 6),
      new THREE.MeshBasicMaterial({ toneMapped: false }),
      MAX_FIGURES,
    );
    for (const m of [this.rings, this.drones, this.eyes]) {
      m.count = 0;
      m.frustumCulled = false;
      this.group.add(m);
    }
  }

  /** A clip with only the tracks this model's skeleton has, cached per model. */
  private clip(name: string, model: THREE.Object3D, modelKey: string): THREE.AnimationClip {
    const key = `${modelKey}:${name}`;
    let c = this.clips.get(key);
    if (c) return c;
    const source = this.models.clips.get(name) ?? this.models.clips.get('Idle_A')!;
    const names = new Set<string>();
    model.traverse((o) => names.add(o.name));
    c = source.clone();
    c.tracks = c.tracks.filter((t) => names.has(t.name.split('.')[0]!));
    this.clips.set(key, c);
    return c;
  }

  private make(kind: UnitKind, side: 'p' | 'e', ghost: boolean): Figure {
    const root = cloneSkinned(this.models.figure(kind, side));
    root.scale.setScalar(SCALE);
    if (ghost) {
      // A sighting: a faded figure where the rival stood when last seen.
      root.traverse((o) => {
        const mesh = o as THREE.SkinnedMesh;
        if (!mesh.isSkinnedMesh) return;
        const swap = (m: THREE.Material) => {
          let g = this.ghostMats.get(m);
          if (!g) {
            const c = (m as THREE.MeshStandardMaterial).clone();
            c.transparent = true;
            c.opacity = 0.3;
            c.depthWrite = false;
            c.color.multiplyScalar(0.5);
            this.ghostMats.set(m, (g = c));
          }
          return g;
        };
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map(swap)
          : swap(mesh.material);
      });
    }
    const mixer = new THREE.AnimationMixer(root);
    this.group.add(root);
    return {
      kind,
      side,
      ghost,
      root,
      mixer,
      actions: new Map(),
      act: 'idle',
      at: { x: 0, z: 0 },
      face: 0,
      goal: null,
      want: 0,
      wantAct: 'idle',
      dying: 0,
      fought: Infinity,
    };
  }

  private play(f: Figure, act: Act | 'death'): void {
    const name = act === 'death' ? 'Death_A' : CLIP[act](f.kind);
    let action = f.actions.get(name);
    if (f.act === act && action?.isRunning()) return;
    if (!action) {
      action = f.mixer.clipAction(this.clip(name, f.root, `${f.kind}${f.side}`));
      if (act === 'death') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      f.actions.set(name, action);
    }
    for (const [n, a] of f.actions) if (n !== name) a.fadeOut(0.2);
    action.reset().fadeIn(0.2).play();
    // Squads do not move in step.
    if (act !== 'death') action.time = Math.random() * action.getClip().duration;
    f.act = act;
  }

  /** Start a frame: every figure not `put` before `end` leaves. */
  begin(): void {
    this.seen.clear();
  }

  /**
   * Stand a figure, by a key stable while it stays in one squad or convoy, at its slot.
   * A new figure appears at its slot; a moving one walks, facing its way.
   */
  put(
    key: string,
    kind: UnitKind,
    side: 'p' | 'e',
    goal: Spot,
    face: number,
    act: Act,
    ghost = false,
  ): void {
    this.seen.add(key);
    let f = this.live.get(key);
    if (!f) {
      const shelf = this.pool.get(`${kind}${side}${ghost}`);
      f = shelf?.pop() ?? this.make(kind, side, ghost);
      f.root.visible = true;
      f.at = { ...goal };
      f.face = face;
      f.dying = 0;
      f.fought = Infinity;
      f.goal = null;
      f.act = 'idle';
      for (const a of f.actions.values()) a.stop();
      this.live.set(key, f);
    }
    const dx = goal.x - f.at.x;
    const dz = goal.z - f.at.z;
    const moving = Math.hypot(dx, dz) > WALKS;
    f.goal = goal;
    f.want = moving ? Math.atan2(dx, dz) : face;
    f.wantAct = moving && act === 'idle' ? 'walk' : act;
  }

  /** Finish the frame: move, turn and animate every figure, and let the absent ones go. */
  end(dt: number): void {
    this.time += dt;
    const k = 1 - Math.exp(-CHASE * dt);
    const turn = 1 - Math.exp(-TURN * dt);
    let n = 0;
    let d = 0;
    for (const [key, f] of this.live) {
      if (!this.seen.has(key) && f.act !== 'death') {
        // A figure lost from a fighting squad dies where it stood; any other just leaves.
        if (f.fought < 1 && !f.ghost) {
          this.play(f, 'death');
          f.dying = DEATH_S;
        } else {
          this.release(key, f);
          continue;
        }
      }
      if (f.act === 'death') {
        f.dying -= dt;
        if (f.dying <= 0) {
          this.release(key, f);
          continue;
        }
      } else if (f.goal) {
        f.at.x += (f.goal.x - f.at.x) * k;
        f.at.z += (f.goal.z - f.at.z) * k;
        let delta = f.want - f.face;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));
        f.face += delta * turn;
        f.fought = f.wantAct === 'attack' ? 0 : f.fought + dt;
        if (!f.ghost) this.play(f, f.wantAct);
        else if (!f.actions.size) this.play(f, 'idle');
      }
      f.root.position.set(f.at.x, 0.06, f.at.z);
      f.root.rotation.y = f.face;
      f.mixer.update(f.ghost ? 0 : dt);

      if (n < MAX_FIGURES && f.act !== 'death') {
        this.matrix.makeTranslation(f.at.x, 0.07, f.at.z);
        this.rings.setMatrixAt(n, this.matrix);
        this.color.set(this.colors[f.side]);
        if (f.ghost) this.color.multiplyScalar(0.35);
        this.rings.setColorAt(n++, this.color);
      }
      if (f.kind === 'rigger' && !f.ghost && f.act !== 'death' && d < MAX_FIGURES) {
        const bob = Math.sin(this.time * 3 + f.at.x * 2) * 0.06;
        this.matrix.makeTranslation(f.at.x, DRONE_HEIGHT + bob, f.at.z);
        this.drones.setMatrixAt(d, this.matrix);
        this.matrix.makeTranslation(f.at.x, DRONE_HEIGHT + bob - 0.06, f.at.z + 0.12);
        this.eyes.setMatrixAt(d, this.matrix);
        this.eyes.setColorAt(d++, this.color.set(this.colors[f.side]));
      }
    }
    this.rings.count = n;
    this.drones.count = d;
    this.eyes.count = d;
    for (const m of [this.rings, this.drones, this.eyes]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }

  private release(key: string, f: Figure): void {
    this.live.delete(key);
    f.root.visible = false;
    for (const a of f.actions.values()) a.stop();
    const shelf = `${f.kind}${f.side}${f.ghost}`;
    if (!this.pool.has(shelf)) this.pool.set(shelf, []);
    this.pool.get(shelf)!.push(f);
  }

  /** Let every figure go at once, so a new match places them rather than killing them. */
  clear(): void {
    for (const [key, f] of [...this.live]) this.release(key, f);
  }

  /** Figures standing now, deaths included: the frame-time check reads it. */
  get count(): number {
    return this.live.size;
  }

  dispose(): void {
    for (const m of [this.rings, this.drones, this.eyes]) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
      m.dispose();
    }
    for (const g of this.ghostMats.values()) g.dispose();
    for (const f of [...this.live.values(), ...[...this.pool.values()].flat()])
      f.mixer.stopAllAction();
  }
}

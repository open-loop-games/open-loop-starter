/**
 * The sprawl drawn in three.js: a read-only projection of a `FieldFrame`. Each animation
 * frame it draws the frame it is handed and writes nothing back; a click comes back out
 * as a `Pick`, and the host turns it into an order. This class is the one owner of the
 * field → screen mapping.
 *
 * Built from primitives: each kind is one shape, each seat one colour, so a squad reads
 * by its figures before any model is loaded. Figures are decoration: they chase the slot
 * the latest sim sample puts them in.
 */
import * as THREE from 'three';
import type { Place } from '../../data/map';
import { ROADS } from '../../data/map';
import { UNIT_KINDS, type UnitKind } from '../../data/units';
import type { Pick } from '../command';
import type { ConvoyView, FieldFrame } from './frame';
import { PLACES } from './frame';
import { CameraRig } from './camera';
import { alongRoad, columnSlot, figureCounts, spotOf, squadSlot, type Spot } from './layout';

/** What the host adds to the frame: the player's selection and where the pointer is. */
export interface FieldView {
  picks: readonly Pick[];
  via: readonly Place[];
  hover: Place | null;
}

/** The deck's palette, from `cantrip.css`. */
const COLOR = {
  night: 0x070b10,
  ground: 0x10161e,
  road: 0x1e2a37,
  kerb: 0x2f3e4e,
  water: 0x0b1c2a,
  pad: 0x16202b,
  building: 0x1a2430,
  you: 0xffa646,
  rival: 0xff4f7b,
  ley: 0xb49bff,
  chalk: 0xe4dfd1,
};

/** The most figures of one kind on the field at once: every place and convoy at the cap. */
const MAX_FIGURES = 400;
/** How fast a figure closes on its slot, 1/s. */
const CHASE = 10;
/** Ground distance within which a click picks a place, and a convoy's marker. */
const PLACE_REACH = 2.4;
const CONVOY_REACH = 0.9;
/** Gate guns drawn around a safehouse, at most. */
const MAX_GUNS = 8;

const ARC_SEGMENTS = 48;
const PAD_RADIUS = 2.6;

interface Marker {
  mesh: THREE.Mesh;
  key: string;
}

export class SkirmishScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private rig = new CameraRig();
  private figures: Record<UnitKind, THREE.InstancedMesh>;
  private ghosts: Record<UnitKind, THREE.InstancedMesh>;
  /** Where each figure is drawn now, by a key stable while it stands in one squad or convoy. */
  private shown = new Map<string, Spot>();
  private heads = new Map<string, Spot>();
  private yourArcs = new Map<Place, THREE.Mesh>();
  private selectRings = new Map<Place, THREE.Mesh>();
  private hoverRing: THREE.Mesh;
  private nests = new Map<string, THREE.Mesh>();
  private guns: Record<'p' | 'e', THREE.Mesh[]> = { p: [], e: [] };
  private markers: Marker[] = [];
  private markerGeo = new THREE.OctahedronGeometry(0.32, 0);
  private markerMat: Record<'p' | 'e' | 'picked', THREE.MeshBasicMaterial>;
  private route: THREE.Line;
  private routeKey = '';
  private last: FieldFrame | null = null;
  private width = 0;
  private color = new THREE.Color();
  private matrix = new THREE.Matrix4();

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(COLOR.night);
    host.appendChild(this.renderer.domElement);

    this.scene.fog = new THREE.Fog(COLOR.night, 40, 90);
    const sky = new THREE.HemisphereLight(0x8fa6c8, 0x0a0d12, 1.4);
    const moon = new THREE.DirectionalLight(0xc8d4ff, 1.2);
    moon.position.set(-8, 20, 10);
    this.scene.add(sky, moon);

    this.buildGround();
    this.buildPlaces();
    this.figures = this.figureMeshes(false);
    this.ghosts = this.figureMeshes(true);

    this.markerMat = {
      p: new THREE.MeshBasicMaterial({ color: COLOR.you }),
      e: new THREE.MeshBasicMaterial({ color: COLOR.rival }),
      picked: new THREE.MeshBasicMaterial({ color: COLOR.chalk }),
    };
    this.hoverRing = this.ring(2.0, 2.15, COLOR.chalk, 0.35);
    this.hoverRing.visible = false;
    this.route = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({ color: COLOR.chalk, dashSize: 0.4, gapSize: 0.3 }),
    );
    this.route.position.y = 0.06;
    this.scene.add(this.route);
    this.resize();
  }

  // ─── The static map ──────────────────────────────────────────────────────

  private buildGround(): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 50),
      new THREE.MeshStandardMaterial({ color: COLOR.ground, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 16),
      new THREE.MeshStandardMaterial({ color: COLOR.water, roughness: 0.3, metalness: 0.2 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.01, 16);
    this.scene.add(ground, water);

    const roadMat = new THREE.MeshStandardMaterial({ color: COLOR.road, roughness: 0.6 });
    const kerbMat = new THREE.MeshStandardMaterial({ color: COLOR.kerb, roughness: 0.8 });
    for (const [a, b] of ROADS) {
      const from = spotOf(a);
      const to = spotOf(b);
      const len = Math.hypot(to.x - from.x, to.z - from.z);
      const angle = Math.atan2(to.z - from.z, to.x - from.x);
      const road = new THREE.Mesh(new THREE.BoxGeometry(len, 0.04, 1.3), roadMat);
      const kerb = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 1.6), kerbMat);
      for (const m of [road, kerb]) {
        m.position.set((from.x + to.x) / 2, m === road ? 0.03 : 0.015, (from.z + to.z) / 2);
        m.rotation.y = -angle;
        this.scene.add(m);
      }
    }
  }

  private buildPlaces(): void {
    const padMat = new THREE.MeshStandardMaterial({ color: COLOR.pad, roughness: 0.7 });
    const blockMat = new THREE.MeshStandardMaterial({ color: COLOR.building, roughness: 0.8 });
    for (const place of PLACES) {
      const s = spotOf(place);
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(PAD_RADIUS, PAD_RADIUS, 0.08, 40),
        padMat,
      );
      pad.position.set(s.x, 0.04, s.z);
      this.scene.add(pad);
      const sel = this.ring(2.25, 2.45, COLOR.chalk, 0.9);
      sel.position.set(s.x, 0.1, s.z);
      sel.visible = false;
      this.selectRings.set(place, sel);
      if (typeof place === 'number') {
        // Control: the rival's share is the full ring under, yours an arc drawn over it.
        const theirs = this.ring(2.6, 2.95, COLOR.rival, 0.35);
        theirs.position.set(s.x, 0.08, s.z);
        const yours = this.ring(2.6, 2.95, COLOR.you, 0.6);
        yours.position.set(s.x, 0.09, s.z);
        this.yourArcs.set(place, yours);
        // A few blocks behind the pad, so a district reads as streets, not a token.
        for (let i = 0; i < 4; i++) {
          const h = 1.2 + ((i * 7 + place * 3) % 4) * 0.6;
          const block = new THREE.Mesh(new THREE.BoxGeometry(1.4, h, 1.4), blockMat);
          const a = Math.PI * (0.15 + i * 0.23) + place;
          block.position.set(s.x + Math.cos(a) * 3.8, h / 2, s.z - Math.abs(Math.sin(a)) * 3.6);
          this.scene.add(block);
        }
        for (const side of ['p', 'e'] as const) {
          const nest = new THREE.Mesh(
            new THREE.ConeGeometry(0.45, 1.2, 4),
            new THREE.MeshStandardMaterial({ color: side === 'p' ? COLOR.you : COLOR.rival }),
          );
          nest.position.set(s.x + (side === 'p' ? -1.9 : 1.9), 0.6, s.z - 1.6);
          nest.visible = false;
          this.nests.set(`${side}${place}`, nest);
          this.scene.add(nest);
        }
      } else {
        const tint = place === 'p' ? COLOR.you : COLOR.rival;
        const house = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 2.4, 2.6),
          new THREE.MeshStandardMaterial({
            color: COLOR.building,
            emissive: tint,
            emissiveIntensity: 0.12,
          }),
        );
        house.position.set(s.x + (place === 'p' ? -1.2 : 1.2), 1.2, s.z - 1.2);
        this.scene.add(house);
        const gunMat = new THREE.MeshStandardMaterial({ color: tint });
        for (let i = 0; i < MAX_GUNS; i++) {
          const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.6, 8), gunMat);
          const a = (i / MAX_GUNS) * Math.PI * 2;
          gun.position.set(s.x + Math.cos(a) * 2.2, 0.3, s.z + Math.sin(a) * 2.2);
          gun.visible = false;
          this.guns[place].push(gun);
          this.scene.add(gun);
        }
      }
    }
  }

  private ring(inner: number, outer: number, color: number, opacity: number): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, ARC_SEGMENTS, 1, Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    this.scene.add(mesh);
    return mesh;
  }

  private figureMeshes(ghost: boolean): Record<UnitKind, THREE.InstancedMesh> {
    const shape: Record<UnitKind, THREE.BufferGeometry> = {
      razor: new THREE.ConeGeometry(0.26, 0.95, 6).translate(0, 0.47, 0),
      hexer: new THREE.OctahedronGeometry(0.36, 0).translate(0, 0.5, 0),
      rigger: new THREE.SphereGeometry(0.26, 10, 8).translate(0, 0.95, 0),
      enforcer: new THREE.BoxGeometry(0.55, 0.75, 0.55).translate(0, 0.38, 0),
    };
    const out = {} as Record<UnitKind, THREE.InstancedMesh>;
    for (const k of UNIT_KINDS) {
      const mat = new THREE.MeshStandardMaterial({
        roughness: 0.5,
        transparent: ghost,
        opacity: ghost ? 0.28 : 1,
        depthWrite: !ghost,
      });
      const mesh = new THREE.InstancedMesh(shape[k], mat, MAX_FIGURES);
      mesh.count = 0;
      mesh.frustumCulled = false;
      out[k] = mesh;
      this.scene.add(mesh);
    }
    return out;
  }

  // ─── Each frame ──────────────────────────────────────────────────────────

  render(frame: FieldFrame, view: FieldView, dt: number): void {
    if (!this.width) return;
    this.last = frame;
    this.rig.update(dt);
    this.drawPlaces(frame, view);
    this.drawFigures(frame, view, dt);
    this.drawRoute(view);
    this.renderer.render(this.scene, this.rig.camera);
  }

  private drawPlaces(frame: FieldFrame, view: FieldView): void {
    for (const v of frame.places) {
      const arc = this.yourArcs.get(v.place);
      // A ring segment is two triangles: the arc draws your share of them.
      if (arc) arc.geometry.setDrawRange(0, Math.round(((1 + v.control) / 2) * ARC_SEGMENTS) * 6);
      const picked = view.picks.some((p) => p.kind === 'squad' && p.place === v.place);
      this.selectRings.get(v.place)!.visible = picked;
      if (typeof v.place === 'number') {
        this.showNest(`p${v.place}`, v.nests.p);
        this.showNest(`e${v.place}`, v.nests.e);
      }
    }
    for (const side of ['p', 'e'] as const)
      this.guns[side].forEach((g, i) => (g.visible = i < frame.turrets[side]));
    if (view.hover !== null) {
      const s = spotOf(view.hover);
      this.hoverRing.position.set(s.x, 0.11, s.z);
    }
    this.hoverRing.visible = view.hover !== null;
  }

  private showNest(key: string, hp: number): void {
    const nest = this.nests.get(key)!;
    nest.visible = hp > 0;
    nest.scale.y = Math.max(0.2, hp);
    nest.position.y = 0.6 * nest.scale.y;
  }

  private drawFigures(frame: FieldFrame, view: FieldView, dt: number): void {
    const k = 1 - Math.exp(-CHASE * dt);
    const count = { solid: new Map<UnitKind, number>(), ghost: new Map<UnitKind, number>() };
    const live = new Set<string>();
    const put = (key: string, kind: UnitKind, side: 'p' | 'e', goal: Spot, ghost = false) => {
      live.add(key);
      let at = this.shown.get(key);
      if (!at) this.shown.set(key, (at = { ...goal }));
      at.x += (goal.x - at.x) * k;
      at.z += (goal.z - at.z) * k;
      const mesh = (ghost ? this.ghosts : this.figures)[kind];
      const tally = ghost ? count.ghost : count.solid;
      const n = tally.get(kind) ?? 0;
      if (n >= MAX_FIGURES) return;
      tally.set(kind, n + 1);
      this.matrix.makeTranslation(at.x, 0.08, at.z);
      mesh.setMatrixAt(n, this.matrix);
      mesh.setColorAt(n, this.color.set(side === 'p' ? COLOR.you : COLOR.rival));
    };

    for (const v of frame.places) {
      const squad = (side: 'p' | 'e', counts: typeof v.mine, ghost: boolean) => {
        const shown = figureCounts(counts);
        let i = 0;
        for (const kind of UNIT_KINDS)
          for (let j = 0; j < shown[kind]; j++, i++)
            put(
              `${side}:${v.place}:${kind}:${j}${ghost ? 'g' : ''}`,
              kind,
              side,
              squadSlot(v.place, side, i),
              ghost,
            );
      };
      squad('p', v.mine, false);
      if (v.theirs) squad('e', v.theirs, false);
      else if (v.sighting) squad('e', v.sighting.counts, true);
    }
    this.drawConvoys(frame.convoys, view, k, put);

    for (const key of this.shown.keys()) if (!live.has(key)) this.shown.delete(key);
    for (const kind of UNIT_KINDS) {
      for (const [meshes, tally] of [
        [this.figures, count.solid],
        [this.ghosts, count.ghost],
      ] as const) {
        const mesh = meshes[kind];
        mesh.count = tally.get(kind) ?? 0;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  private drawConvoys(
    convoys: readonly ConvoyView[],
    view: FieldView,
    k: number,
    put: (key: string, kind: UnitKind, side: 'p' | 'e', goal: Spot) => void,
  ): void {
    const live = new Set<string>();
    convoys.forEach((c, n) => {
      const key = `${c.side}c${c.id}`;
      live.add(key);
      const goal = alongRoad(c.from, c.next, c.progress);
      let head = this.heads.get(key);
      if (!head) this.heads.set(key, (head = { ...goal }));
      head.x += (goal.x - head.x) * k;
      head.z += (goal.z - head.z) * k;
      const back = spotOf(c.from);
      const shown = figureCounts(c.counts);
      let i = 0;
      for (const kind of UNIT_KINDS)
        for (let j = 0; j < shown[kind]; j++, i++)
          put(`${key}:${kind}:${j}`, kind, c.side, columnSlot(head, back, i));
      const marker = this.markers[n] ?? this.addMarker();
      marker.key = key;
      marker.mesh.visible = true;
      marker.mesh.position.set(head.x, 1.4, head.z);
      const picked = c.side === 'p' && view.picks.some((q) => q.kind === 'convoy' && q.id === c.id);
      marker.mesh.material = this.markerMat[picked ? 'picked' : c.side];
      marker.mesh.scale.setScalar(picked ? 1.4 : 1);
    });
    for (let n = convoys.length; n < this.markers.length; n++)
      this.markers[n]!.mesh.visible = false;
    for (const key of this.heads.keys()) if (!live.has(key)) this.heads.delete(key);
  }

  private addMarker(): Marker {
    const mesh = new THREE.Mesh(this.markerGeo, this.markerMat.p);
    this.scene.add(mesh);
    const marker = { mesh, key: '' };
    this.markers.push(marker);
    return marker;
  }

  /** The queued waypoints, drawn from the first pick to each in turn. */
  private drawRoute(view: FieldView): void {
    const first = view.picks[0];
    const key = view.via.length && first ? `${JSON.stringify(first)}>${view.via.join()}` : '';
    if (key === this.routeKey) return;
    this.routeKey = key;
    const points: THREE.Vector3[] = [];
    if (key && first) {
      const start = first.kind === 'squad' ? spotOf(first.place) : this.convoyHead('p', first.id);
      if (start) points.push(new THREE.Vector3(start.x, 0, start.z));
      for (const v of view.via) {
        const s = spotOf(v);
        points.push(new THREE.Vector3(s.x, 0, s.z));
      }
    }
    this.route.geometry.dispose();
    this.route.geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.route.computeLineDistances();
    this.route.visible = points.length > 1;
  }

  private convoyHead(side: 'p' | 'e', id: number): Spot | undefined {
    return this.heads.get(`${side}c${id}`);
  }

  // ─── The host's questions ────────────────────────────────────────────────

  /** Size to the host; a collapsed host keeps the last good size. */
  resize(): void {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (w < 1 || h < 1) return;
    this.width = w;
    this.renderer.setSize(w, h, false);
    this.rig.resize(w, h);
  }

  /** Forget where figures were drawn, so a new match places them rather than sliding them. */
  snap(): void {
    this.shown.clear();
    this.heads.clear();
  }

  zoomAt(px: number, py: number, deltaY: number): void {
    this.rig.zoomAt(px, py, deltaY);
  }

  pan(dx: number, dy: number, dt: number): void {
    this.rig.pan(dx, dy, dt);
  }

  /** What stands under a canvas pixel: one of your convoys, else a place. */
  pick(px: number, py: number): Pick | null {
    const g = this.rig.groundAt(px, py);
    if (!g) return null;
    for (const c of this.last?.convoys ?? []) {
      const head = this.convoyHead(c.side, c.id);
      if (c.side === 'p' && head && Math.hypot(head.x - g.x, head.z - g.z) < CONVOY_REACH)
        return { kind: 'convoy', id: c.id };
    }
    const place = this.placeAt(px, py);
    return place === null ? null : { kind: 'squad', place };
  }

  /** The place under a canvas pixel, if any. */
  placeAt(px: number, py: number): Place | null {
    const g = this.rig.groundAt(px, py);
    if (!g) return null;
    let best: Place | null = null;
    let near = PLACE_REACH;
    for (const place of PLACES) {
      const s = spotOf(place);
      const d = Math.hypot(s.x - g.x, s.z - g.z);
      if (d < near) {
        near = d;
        best = place;
      }
    }
    return best;
  }

  /**
   * Your squads and convoys inside a screen rectangle; your safehouse only when nothing
   * else is in it, as a box drag prefers units in the field to the ones at home.
   */
  picksIn(x0: number, y0: number, x1: number, y1: number): Pick[] {
    const inside = (s: Spot | undefined) => {
      if (!s) return false;
      const q = this.rig.project(s.x, 0, s.z);
      return !!q && q.x >= x0 && q.x <= x1 && q.y >= y0 && q.y <= y1;
    };
    const out: Pick[] = [];
    const frame = this.last;
    if (!frame) return out;
    for (const v of frame.places)
      if (
        typeof v.place === 'number' &&
        Object.values(v.mine).some((n) => n > 0) &&
        inside(spotOf(v.place))
      )
        out.push({ kind: 'squad', place: v.place });
    for (const c of frame.convoys)
      if (c.side === 'p' && inside(this.convoyHead('p', c.id)))
        out.push({ kind: 'convoy', id: c.id });
    if (!out.length && inside(spotOf('p'))) out.push({ kind: 'squad', place: 'p' });
    return out;
  }

  /** A place's centre on the canvas. */
  screenOf(place: Place): { x: number; y: number } | null {
    const s = spotOf(place);
    return this.rig.project(s.x, 0, s.z);
  }

  /** Where a place's tag hangs: the front edge of its pad, clear of the figures on it. */
  tagAnchor(place: Place): { x: number; y: number } | null {
    const s = spotOf(place);
    return this.rig.project(s.x, 0, s.z + PAD_RADIUS);
  }

  /** A convoy's marker on the canvas, as drawn this frame. */
  screenOfConvoy(side: 'p' | 'e', id: number): { x: number; y: number } | null {
    const head = this.convoyHead(side, id);
    return head ? this.rig.project(head.x, 1.4, head.z) : null;
  }

  dispose(): void {
    const free = (m: THREE.Material) => {
      (m as THREE.MeshStandardMaterial).map?.dispose();
      m.dispose();
    };
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach(free);
      else if (mat) free(mat);
      if (o instanceof THREE.InstancedMesh) o.dispose();
    });
    for (const m of Object.values(this.markerMat)) m.dispose();
    this.renderer.dispose();
    // dispose() leaves the context alive until GC; repeated HMR remounts would otherwise
    // run into the browser's limit on live contexts.
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

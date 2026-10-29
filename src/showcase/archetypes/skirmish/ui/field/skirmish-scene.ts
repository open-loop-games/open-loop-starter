/**
 * The sprawl drawn in three.js: a read-only projection of a `FieldFrame`. Each animation
 * frame it draws the frame it is handed and writes nothing back; a click comes back out
 * as a `Pick`, and the host turns it into an order. This class is the one owner of the
 * field → screen mapping.
 *
 * What changes with the match is drawn on its place: control as a ring round the plaza,
 * nests and gate guns as turrets, each safehouse block's floors and squats as buildings
 * (the rival's as the scout last saw them), and the squads and convoys as figures. The
 * city, the night and the figures are their own files; this one places them.
 */
import * as THREE from 'three';
import type { Place } from '../../data/map';
import { UNIT_KINDS, type UnitKind } from '../../data/units';
import type { Block } from '../../modules/side';
import type { Pick } from '../command';
import { CameraRig } from './camera';
import { buildCity, fit, type City } from './city';
import { Figures, type Act } from './figures';
import type { FieldFrame, PlaceView } from './frame';
import { PLACES } from './frame';
import {
  PLAZA,
  alongRoad,
  columnSlot,
  figureCounts,
  spotOf,
  squadFacing,
  squadSlot,
  type Spot,
} from './layout';
import { Look } from './look';
import { loadModels, type Models } from './models';

/** What the host adds to the frame: the player's selection and where the pointer is. */
export interface FieldView {
  picks: readonly Pick[];
  via: readonly Place[];
  hover: Place | null;
}

/** The deck's palette, from `cantrip.css`. */
const COLOR = { you: 0xffa646, rival: 0xff4f7b, chalk: 0xe4dfd1 };
const SIDE_COLOR = { p: COLOR.you, e: COLOR.rival };

/** Ground distance within which a click picks a place, and a convoy's marker. */
const PLACE_REACH = PLAZA;
const CONVOY_REACH = 1.2;
const MARKER_HEIGHT = 2.1;
const ARC_SEGMENTS = 64;

// ─── Safehouse blocks ───
// Offsets from your safehouse; the rival's block is the mirror image. Each tech floor has
// its own slot, so a floor opening never moves the others.
const HOUSE: [string, number, number, number] = ['industrial-building-c', -1.6, -1.9, 2.3];
const TECH: Record<UnitKind, [string, number, number, number]> = {
  razor: ['industrial-building-f', 0.9, -2.3, 1.5],
  hexer: ['defence-tower-round-crystals', -3.3, -4.3, 1.2],
  rigger: ['industrial-building-m', -1.3, -4.7, 1.5],
  enforcer: ['industrial-building-a', 0.8, -4.7, 1.4],
};
/** Plain floors and squats show up to their slots; the panels carry the counts. */
const FLOOR_SLOTS = [-3.4, -2.4, -1.4, -0.4, 0.6, 1.6].map((x) => [x, -6.2] as const);
const SQUAT_SLOTS = [-4.4, -5.6, -6.8].map((z) => [2.7, z] as const);
/** Gate guns on the safehouse roof, one turret per level. */
const GUN_SLOTS = [
  [-0.45, -0.35],
  [0.45, -0.35],
  [-0.45, 0.45],
  [0.45, 0.45],
] as const;

interface Marker {
  mesh: THREE.Mesh;
  key: string;
}

export class SkirmishScene {
  /** Settles once the models are in and the city stands; figures draw from then on. */
  readonly ready: Promise<void>;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private rig = new CameraRig();
  private look: Look;
  private models: Models | null = null;
  private city: City | null = null;
  private figures: Figures | null = null;
  private disposed = false;
  private heads = new Map<string, Spot>();
  private yourArcs = new Map<Place, THREE.Mesh>();
  private selectRings = new Map<Place, THREE.Mesh>();
  private hoverRing: THREE.Mesh;
  private nests = new Map<string, THREE.Object3D>();
  private nestRings: THREE.Mesh[] = [];
  private blocks: Record<'p' | 'e', { key: string; group: THREE.Group }> = {
    p: { key: '', group: new THREE.Group() },
    e: { key: '', group: new THREE.Group() },
  };
  private markers: Marker[] = [];
  private markerGeo = new THREE.OctahedronGeometry(0.28, 0);
  private markerMat: Record<'p' | 'e' | 'picked', THREE.MeshBasicMaterial>;
  private route: THREE.Line;
  private routeKey = '';
  private last: FieldFrame | null = null;
  private width = 0;
  private time = 0;
  /** Milliseconds a frame spends in `render`, smoothed. */
  private cpu = 0;

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // A frame is several passes; count them all, reset once per frame.
    this.renderer.info.autoReset = false;
    host.appendChild(this.renderer.domElement);
    this.look = new Look(this.renderer, this.scene, this.rig.camera);

    // Markers and rings are unlit and skip tone mapping, so they stay the deck's colours.
    const flat = (color: number, opacity = 1) =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: opacity < 1,
        opacity,
        depthWrite: false,
        toneMapped: false,
      });
    this.markerMat = { p: flat(COLOR.you), e: flat(COLOR.rival), picked: flat(COLOR.chalk) };
    for (const place of PLACES) {
      const s = spotOf(place);
      const sel = this.ring(PLAZA + 0.1, PLAZA + 0.25, flat(COLOR.chalk, 0.8));
      sel.position.set(s.x, 0.09, s.z);
      sel.visible = false;
      this.selectRings.set(place, sel);
      if (typeof place !== 'number') continue;
      // Control: the rival's share is the full ring under, yours an arc drawn over it.
      this.ring(PLAZA - 0.25, PLAZA - 0.1, flat(COLOR.rival, 0.45)).position.set(s.x, 0.07, s.z);
      const yours = this.ring(PLAZA - 0.25, PLAZA - 0.1, flat(COLOR.you, 0.85));
      yours.position.set(s.x, 0.08, s.z);
      this.yourArcs.set(place, yours);
    }
    this.hoverRing = this.ring(PLAZA + 0.1, PLAZA + 0.2, flat(COLOR.chalk, 0.3));
    this.hoverRing.visible = false;
    this.route = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({
        color: COLOR.chalk,
        dashSize: 0.5,
        gapSize: 0.35,
        toneMapped: false,
      }),
    );
    this.route.position.y = 0.1;
    this.scene.add(this.route, this.blocks.p.group, this.blocks.e.group);
    this.resize();

    this.ready = loadModels().then((models) => {
      if (this.disposed) {
        models.dispose();
        return;
      }
      this.models = models;
      this.city = buildCity(models);
      this.figures = new Figures(models, SIDE_COLOR);
      this.scene.add(this.city.group, this.figures.group);
      this.buildNests(models);
    });
  }

  private ring(inner: number, outer: number, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, ARC_SEGMENTS, 1, Math.PI / 2).rotateX(-Math.PI / 2),
      material,
    );
    this.scene.add(mesh);
    return mesh;
  }

  /** A turret at each district's back corner for each seat, shown while its nest stands. */
  private buildNests(models: Models): void {
    for (const place of PLACES) {
      if (typeof place !== 'number') continue;
      const s = spotOf(place);
      for (const side of ['p', 'e'] as const) {
        const x = s.x + (side === 'p' ? -1 : 1) * (PLAZA - 0.7);
        const nest = fit(models.piece('defence-weapon-turret'), x, s.z + 1.8, 1.0).obj;
        nest.rotation.y = side === 'p' ? Math.PI / 2 : -Math.PI / 2;
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.55, 0.7, 24).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: SIDE_COLOR[side], toneMapped: false }),
        );
        // The ring hangs in the turret's own scaled space.
        ring.position.y = (0.08 - nest.position.y) / nest.scale.x;
        ring.scale.divideScalar(nest.scale.x);
        this.nestRings.push(ring);
        nest.add(ring);
        nest.visible = false;
        this.nests.set(`${side}${place}`, nest);
        this.scene.add(nest);
      }
    }
  }

  // ─── Each frame ──────────────────────────────────────────────────────────

  render(frame: FieldFrame, view: FieldView, dt: number, raw = dt): void {
    if (!this.width) return;
    const start = performance.now();
    this.renderer.info.reset();
    this.time += dt;
    this.last = frame;
    this.rig.update(dt);
    this.drawPlaces(frame, view);
    this.drawBlocks(frame);
    this.drawFigures(frame, view, dt);
    this.drawRoute(view);
    this.look.render(dt, raw);
    this.cpu += (performance.now() - start - this.cpu) * 0.05;
  }

  private drawPlaces(frame: FieldFrame, view: FieldView): void {
    for (const v of frame.places) {
      const arc = this.yourArcs.get(v.place);
      // A ring segment is two triangles: the arc draws your share of them.
      if (arc) arc.geometry.setDrawRange(0, Math.round(((1 + v.control) / 2) * ARC_SEGMENTS) * 6);
      const picked = view.picks.some((p) => p.kind === 'squad' && p.place === v.place);
      const ring = this.selectRings.get(v.place)!;
      ring.visible = picked;
      if (picked)
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.3 * Math.sin(this.time * 4);
      if (typeof v.place === 'number') {
        const p = this.nests.get(`p${v.place}`);
        const e = this.nests.get(`e${v.place}`);
        if (p) p.visible = v.nests.p > 0;
        if (e) e.visible = v.nests.e > 0;
      }
    }
    if (view.hover !== null) {
      const s = spotOf(view.hover);
      this.hoverRing.position.set(s.x, 0.1, s.z);
    }
    this.hoverRing.visible = view.hover !== null;
  }

  /** Rebuild a safehouse block when what stands on it changes: rare, so clones will do. */
  private drawBlocks(frame: FieldFrame): void {
    const models = this.models;
    if (!models) return;
    for (const side of ['p', 'e'] as const) {
      const block: Block | undefined = frame.blocks[side];
      const guns = frame.turrets[side];
      const key = `${JSON.stringify(block)}|${guns}`;
      const held = this.blocks[side];
      if (held.key === key) continue;
      held.key = key;
      held.group.clear();
      const s = spotOf(side);
      const m = side === 'p' ? 1 : -1;
      const at = (piece: string, dx: number, dz: number, w: number, maxHeight = 2.6) => {
        const b = fit(models.piece(piece), s.x + m * dx, s.z + dz, w, 0, maxHeight);
        held.group.add(b.obj);
        return b;
      };
      const [piece, hx, hz, hw] = HOUSE;
      const house = at(piece, hx, hz, hw);
      GUN_SLOTS.slice(0, guns).forEach(([gx, gz]) => {
        const gun = fit(
          models.piece('defence-weapon-turret'),
          s.x + m * (hx + gx),
          s.z + hz + gz,
          0.6,
        );
        gun.obj.position.y += house.top;
        gun.obj.rotation.y = side === 'p' ? Math.PI / 2 : -Math.PI / 2;
        held.group.add(gun.obj);
      });
      if (!block) continue;
      for (const kind of UNIT_KINDS) {
        if (!block.tech.includes(kind)) continue;
        const [p, dx, dz, w] = TECH[kind];
        at(p, dx, dz, w);
      }
      FLOOR_SLOTS.slice(0, block.floors).forEach(([dx, dz], i) =>
        at(`commercial-low-detail-building-${'abcdef'[i % 6]}`, dx, dz, 0.9, 1.4),
      );
      SQUAT_SLOTS.slice(0, Math.ceil(block.squats / 2)).forEach(([dx, dz]) =>
        at('commercial-low-detail-building-wide-a', dx, dz, 1.1, 0.8),
      );
    }
  }

  private drawFigures(frame: FieldFrame, view: FieldView, dt: number): void {
    const figures = this.figures;
    const k = 1 - Math.exp(-8 * dt);
    const liveHeads = new Set<string>();
    // Convoy heads chase their sim position even before the figures load: markers need them.
    frame.convoys.forEach((c, n) => {
      const key = `${c.side}c${c.id}`;
      liveHeads.add(key);
      const goal = alongRoad(c.from, c.next, c.progress);
      let head = this.heads.get(key);
      if (!head) this.heads.set(key, (head = { ...goal }));
      head.x += (goal.x - head.x) * k;
      head.z += (goal.z - head.z) * k;
      const picked = c.side === 'p' && view.picks.some((q) => q.kind === 'convoy' && q.id === c.id);
      const marker = this.markers[n] ?? this.addMarker();
      marker.key = key;
      marker.mesh.visible = true;
      marker.mesh.position.set(head.x, MARKER_HEIGHT + Math.sin(this.time * 3 + n) * 0.08, head.z);
      marker.mesh.rotation.y = this.time * 1.5;
      marker.mesh.material = this.markerMat[picked ? 'picked' : c.side];
      marker.mesh.scale.setScalar(picked ? 1.4 : 1);
    });
    for (let n = frame.convoys.length; n < this.markers.length; n++)
      this.markers[n]!.mesh.visible = false;
    for (const key of this.heads.keys()) if (!liveHeads.has(key)) this.heads.delete(key);
    if (!figures) return;

    figures.begin();
    for (const v of frame.places) {
      const act = (side: 'p' | 'e'): Act =>
        v.fight || v.siege === (side === 'p' ? 'out' : 'in') ? 'attack' : 'idle';
      const squad = (side: 'p' | 'e', counts: PlaceView['mine'], ghost: boolean) => {
        const shown = figureCounts(counts);
        const face = squadFacing(v.place, side);
        let i = 0;
        for (const kind of UNIT_KINDS)
          for (let j = 0; j < shown[kind]; j++, i++)
            figures.put(
              `${side}:${v.place}:${kind}:${j}${ghost ? 'g' : ''}`,
              kind,
              side,
              squadSlot(v.place, side, i),
              face,
              ghost ? 'idle' : act(side),
              ghost,
            );
      };
      squad('p', v.mine, false);
      if (v.theirs) squad('e', v.theirs, false);
      else if (v.sighting) squad('e', v.sighting.counts, true);
    }
    for (const c of frame.convoys) {
      const key = `${c.side}c${c.id}`;
      const head = this.heads.get(key)!;
      const next = spotOf(c.next);
      const back = spotOf(c.from);
      const face = Math.atan2(next.x - back.x, next.z - back.z);
      const shown = figureCounts(c.counts);
      let i = 0;
      for (const kind of UNIT_KINDS)
        for (let j = 0; j < shown[kind]; j++, i++)
          figures.put(`${key}:${kind}:${j}`, kind, c.side, columnSlot(head, back, i), face, 'walk');
    }
    figures.end(dt);
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
    this.look.setSize(w, h);
    this.rig.resize(w, h);
  }

  /** Forget where figures were drawn, so a new match places them rather than sliding them. */
  snap(): void {
    this.heads.clear();
    this.figures?.clear();
  }

  zoomAt(px: number, py: number, deltaY: number): void {
    this.rig.zoomAt(px, py, deltaY);
  }

  pan(dx: number, dy: number, dt: number): void {
    this.rig.pan(dx, dy, dt);
  }

  /** Figures standing now and the last frame's draw calls: the frame-time check reads them. */
  stats(): { figures: number; calls: number; triangles: number; cpuMs: number } {
    const { calls, triangles } = this.renderer.info.render;
    return { figures: this.figures?.count ?? 0, calls, triangles, cpuMs: this.cpu };
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
      const d = Math.max(Math.abs(s.x - g.x), Math.abs(s.z - g.z));
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

  /** Where a place's tag hangs: the front edge of its plaza, clear of the figures on it. */
  tagAnchor(place: Place): { x: number; y: number } | null {
    const s = spotOf(place);
    return this.rig.project(s.x, 0, s.z + PLAZA);
  }

  /** A convoy's marker on the canvas, as drawn this frame. */
  screenOfConvoy(side: 'p' | 'e', id: number): { x: number; y: number } | null {
    const head = this.convoyHead(side, id);
    return head ? this.rig.project(head.x, MARKER_HEIGHT, head.z) : null;
  }

  dispose(): void {
    this.disposed = true;
    this.figures?.dispose();
    this.city?.dispose();
    // The blocks and nests are clones: their geometry and materials are the models'.
    for (const side of ['p', 'e'] as const) this.blocks[side].group.clear();
    for (const ring of this.nestRings) {
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
    }
    for (const nest of this.nests.values()) nest.removeFromParent();
    if (this.figures) this.figures.group.removeFromParent();
    if (this.city) this.city.group.removeFromParent();
    this.models?.dispose();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    for (const m of Object.values(this.markerMat)) m.dispose();
    this.markerGeo.dispose();
    this.look.dispose();
    this.renderer.dispose();
    // dispose() leaves the context alive until GC; repeated HMR remounts would otherwise
    // run into the browser's limit on live contexts.
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

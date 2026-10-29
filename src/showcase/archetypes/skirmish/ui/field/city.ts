/**
 * The static sprawl: ground, the waterfront, each place's plaza, the roads with their kerbs,
 * lit dashes and street lights, the blocks that make each district itself, the low city
 * between the roads and a skyline behind, neon signs and each place's coloured light.
 *
 * Kenney's road tiles are grid-aligned and these roads are not, so roads are drawn strips.
 * Nothing here changes during a match: every piece is merged into one mesh per material,
 * so the whole city costs a handful of draw calls however many buildings stand in it.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ROADS, type Place } from '../../data/map';
import { PLAZA, spotOf } from './layout';
import type { Models } from './models';

/** Neon sign colours: pink, cyan, sodium, violet. */
export const NEON = [0xff3fb0, 0x35f0ff, 0xffb347, 0x9d6bff];
const ROAD_WIDTH = 1.9;

/** A seeded generator, so the sprawl stands the same every match. */
function rng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The blocks that make each district itself, around its plaza: piece, offset, width, turn, sign. */
const DISTRICT_BLOCKS: Record<number, [string, number, number, number, number?, 'neon'?][]> = {
  0: [
    ['commercial-building-a', -2.0, -2.3, 1.7, 0, 'neon'],
    ['commercial-building-b', 0.0, -2.5, 1.7, 0, 'neon'],
    ['commercial-building-c', 2.1, -2.3, 1.7, 0, 'neon'],
    ['commercial-low-detail-building-a', -2.6, 0.6, 1.4, Math.PI / 2],
  ],
  1: [
    ['industrial-building-q', -2.2, -2.0, 2.0],
    ['industrial-detail-tank', 2.3, -2.1, 1.3],
    ['commercial-building-h', 0.2, -2.6, 1.6, 0, 'neon'],
    ['roads-construction-barrier', -1.0, 3.0, 0.8],
    ['roads-construction-cone', 1.2, 3.1, 0.25],
  ],
  2: [
    ['commercial-building-skyscraper-a', -1.9, -2.4, 2.0, 0, 'neon'],
    ['commercial-building-skyscraper-b', 0.4, -2.7, 2.0, 0, 'neon'],
    ['commercial-building-skyscraper-e', 2.5, -2.2, 1.8, 0, 'neon'],
    ['commercial-building-k', 2.8, 0.6, 1.3, -Math.PI / 2],
  ],
};
const FILL = [
  'low-detail-building-a',
  'low-detail-building-b',
  'low-detail-building-c',
  'low-detail-building-d',
  'low-detail-building-e',
  'low-detail-building-f',
  'low-detail-building-wide-a',
  'building-d',
  'building-e',
];
const SKYLINE = ['a', 'b', 'c', 'e'];

/** The per-place light colours: your safehouse sodium, the rival's pink, the districts neon. */
const PLACE_LIGHT: Record<string, number> = {
  p: 0xffb347,
  e: 0xff3fb0,
  0: 0x35f0ff,
  1: 0xff3fb0,
  2: 0x9d6bff,
};

const box = new THREE.Box3();
const size = new THREE.Vector3();

/** A piece fitted to a width (and at most a height), standing on the ground at a point. */
export function fit(
  proto: THREE.Object3D,
  x: number,
  z: number,
  width: number,
  turn = 0,
  maxHeight = Infinity,
): { obj: THREE.Object3D; top: number } {
  const obj = proto.clone();
  obj.rotation.y = turn;
  obj.scale.setScalar(1);
  obj.updateMatrixWorld(true);
  box.setFromObject(obj);
  box.getSize(size);
  const s = Math.min(width / Math.max(size.x, size.z), maxHeight / size.y);
  obj.scale.setScalar(s);
  obj.position.set(x, -box.min.y * s, z);
  obj.updateMatrixWorld(true);
  return { obj, top: size.y * s };
}

/** Night-time windows: an emissive map keeping only the atlas's glass swatches, lit warm. */
function windowGlow(atlas: THREE.Texture): THREE.Texture | null {
  const img = atlas.image as CanvasImageSource & { width: number; height: number };
  if (!img?.width) return null;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const r = d.data[i]!;
    const gr = d.data[i + 1]!;
    const b = d.data[i + 2]!;
    const glass = b > 235 && gr > 200 && r > 170 && r < 225;
    d.data.set(glass ? [255, 205, 140] : [0, 0, 0], i);
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  t.flipY = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The built city: one group to add, the wet-road material, and what to free. */
export interface City {
  group: THREE.Group;
  dispose(): void;
}

export function buildCity(models: Models): City {
  const group = new THREE.Group();
  const owned: { dispose(): void }[] = [];
  const parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const add = (obj: THREE.Object3D) => {
    obj.updateMatrixWorld(true);
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.Material;
      const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      if (!parts.has(mat)) parts.set(mat, []);
      parts.get(mat)!.push(geo);
    });
  };
  const mat = <T extends THREE.Material>(m: T): T => {
    owned.push(m);
    return m;
  };
  const prim = (
    geo: THREE.BufferGeometry,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    turn = 0,
  ) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.rotation.y = turn;
    add(mesh);
    geo.dispose();
  };

  // Windows glow in the commercial and industrial kits.
  for (const kit of ['commercial', 'industrial']) {
    const m = models.kits.get(kit);
    const glow = m?.map ? windowGlow(m.map) : null;
    if (!m || !glow) continue;
    owned.push(glow);
    m.emissiveMap = glow;
    m.emissive.set(0xffffff);
    m.emissiveIntensity = 1.4;
    m.needsUpdate = true;
  }

  const ground = mat(new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 0.95 }));
  const water = mat(
    new THREE.MeshStandardMaterial({ color: 0x123049, roughness: 0.1, metalness: 0.7 }),
  );
  const plaza = mat(new THREE.MeshStandardMaterial({ color: 0x262a33, roughness: 0.3 }));
  const road = mat(
    new THREE.MeshStandardMaterial({ color: 0x40454f, roughness: 0.16, metalness: 0.55 }),
  );
  const kerb = mat(new THREE.MeshStandardMaterial({ color: 0x6b7180, roughness: 0.7 }));
  const dash = mat(
    new THREE.MeshStandardMaterial({ color: 0x8a7a50, emissive: 0xffc861, emissiveIntensity: 0.5 }),
  );
  const neon = NEON.map((c) =>
    mat(new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: 3 })),
  );

  const flat = (w: number, d: number) => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  prim(flat(140, 100), ground, 0, 0, -10);
  prim(flat(140, 40), water, 0, 0.01, 30);

  const places: Place[] = ['p', 0, 1, 2, 'e'];
  for (const place of places) {
    const s = spotOf(place);
    prim(new THREE.BoxGeometry(PLAZA * 2, 0.06, PLAZA * 2), plaza, s.x, 0.03, s.z);
    const light = new THREE.PointLight(PLACE_LIGHT[String(place)], 25, 14, 1.6);
    light.position.set(s.x, 2.2, s.z + 0.5);
    group.add(light);
  }

  const lamp = models.piece('roads-light-curved');
  for (const [a, b] of ROADS) {
    const pa = spotOf(a);
    const pb = spotOf(b);
    const dx = pb.x - pa.x;
    const dz = pb.z - pa.z;
    const len = Math.hypot(dx, dz);
    const turn = -Math.atan2(dz, dx);
    const nx = -dz / len;
    const nz = dx / len;
    prim(
      new THREE.BoxGeometry(len, 0.04, ROAD_WIDTH),
      road,
      (pa.x + pb.x) / 2,
      0.02,
      (pa.z + pb.z) / 2,
      turn,
    );
    for (const side of [-1, 1]) {
      prim(
        new THREE.BoxGeometry(len - 2 * PLAZA + 0.4, 0.08, 0.12),
        kerb,
        (pa.x + pb.x) / 2 + nx * (ROAD_WIDTH / 2) * side,
        0.04,
        (pa.z + pb.z) / 2 + nz * (ROAD_WIDTH / 2) * side,
        turn,
      );
    }
    for (let t = 0.2; t < 0.8; t += 0.12)
      prim(new THREE.BoxGeometry(0.5, 0.045, 0.06), dash, pa.x + dx * t, 0.03, pa.z + dz * t, turn);
    // Street lights along each road, alternating sides.
    for (let t = 0.3, side = 1; t < 0.75; t += 0.22, side = -side) {
      const x = pa.x + dx * t + nx * 1.15 * side;
      const z = pa.z + dz * t + nz * 1.15 * side;
      add(fit(lamp, x, z, 0.55, turn + (side > 0 ? Math.PI : 0) + Math.PI / 2).obj);
    }
  }

  const R = rng(7);
  const sign = (x: number, z: number, top: number) => {
    const h = Math.min(top * 0.55, 1.4) * (0.6 + R() * 0.4);
    prim(
      new THREE.BoxGeometry(0.09, h, 0.05),
      neon[Math.floor(R() * NEON.length)]!,
      x + (R() - 0.5) * 0.8,
      top * 0.35 + h / 2,
      z,
    );
  };
  for (const [place, list] of Object.entries(DISTRICT_BLOCKS)) {
    const s = spotOf(Number(place));
    for (const [piece, dx, dz, w, turn = 0, extra] of list) {
      const b = fit(models.piece(piece), s.x + dx, s.z + dz, w, turn, place === '2' ? 5 : 2.6);
      add(b.obj);
      if (extra === 'neon') sign(s.x + dx, s.z + dz + w / 2 + 0.02, b.top);
    }
  }

  // The low city between the roads, and a skyline behind the high road.
  const nearRoad = (x: number, z: number) =>
    ROADS.some(([a, b]) => {
      const pa = spotOf(a);
      const pb = spotOf(b);
      const dx = pb.x - pa.x;
      const dz = pb.z - pa.z;
      const t = Math.max(0, Math.min(1, ((x - pa.x) * dx + (z - pa.z) * dz) / (dx * dx + dz * dz)));
      return Math.hypot(x - pa.x - dx * t, z - pa.z - dz * t) < 2.2;
    });
  for (let x = -32; x <= 32; x += 2.6) {
    for (let z = -28; z <= 10; z += 2.6) {
      const jx = x + (R() - 0.5);
      const jz = z + (R() - 0.5);
      const onPlace = places.some((p) => {
        const s = spotOf(p);
        return Math.hypot(jx - s.x, jz - s.z) < PLAZA + 1.6;
      });
      // Each safehouse block keeps room behind its plaza for the floors a crew stands up.
      const onBlock = (['p', 'e'] as const).some((side) => {
        const s = spotOf(side);
        return Math.abs(jx - s.x) < 5.5 && jz > s.z - 7.5 && jz < s.z + 4.5;
      });
      if (onPlace || onBlock || nearRoad(jx, jz) || (jz > 7 && Math.abs(jx) < 13)) continue;
      const far = jz < -12;
      const maxHeight = far ? 6 : jz < -9 ? 2.6 : 1.1;
      const piece =
        far && R() < 0.5
          ? `commercial-building-skyscraper-${SKYLINE[Math.floor(R() * SKYLINE.length)]}`
          : `commercial-${FILL[Math.floor(R() * FILL.length)]}`;
      const b = fit(
        models.piece(piece),
        jx,
        jz,
        1.5 + R() * 0.6,
        Math.floor(R() * 4) * (Math.PI / 2),
        maxHeight,
      );
      add(b.obj);
      if (R() < 0.18) sign(jx, jz + 0.9, b.top);
    }
  }

  for (const [m, geos] of parts) {
    const merged = mergeGeometries(geos);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    owned.push(merged);
    group.add(new THREE.Mesh(merged, m));
  }

  return {
    group,
    dispose() {
      for (const o of owned) o.dispose();
    },
  };
}

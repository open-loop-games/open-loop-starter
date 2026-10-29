/**
 * The field's models, loaded once per scene from `assets/models/`. City and defence pieces
 * are Kenney's (City Kit Commercial, Industrial and Roads; Tower Defense Kit), the unit
 * figures KayKit's Mystery characters on the Rig_Medium clips. Both are CC0; credit
 * "Kenney, www.kenney.nl" and "Kay Lousberg, www.kaylousberg.com".
 *
 * A Kenney piece names its kit's colour atlas as a file beside it; the files are imported
 * as URLs, which the build renames, so the loader maps each request back by file name.
 * A character's parts are skinned to one skeleton at rest, and merged per material here, so
 * a figure costs two draw calls instead of one per body part.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { UnitKind } from '../../data/units';

const FILES = import.meta.glob('../../assets/models/**/*', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const base = (path: string) => path.slice(path.lastIndexOf('/') + 1).split('?')[0]!;
const URLS = new Map(Object.entries(FILES).map(([path, url]) => [base(path), url]));
const url = (file: string): string => {
  const u = URLS.get(file);
  if (!u) throw new Error(`no model file ${file}`);
  return u;
};

/** Each kind's figure, and the rival's: another character, or the same one in its other skin. */
const FIGURES: Record<UnitKind, { model: string; rival: string; skin?: string }> = {
  razor: { model: '4GTN', rival: '4GTN_Forgotten' },
  hexer: { model: 'Witch', rival: 'Witch', skin: 'Witch-rival.png' },
  rigger: { model: 'Robot_One', rival: 'Robot_One', skin: 'Robot_One-rival.png' },
  enforcer: { model: 'CombatMech', rival: 'CombatMech', skin: 'CombatMech-rival.png' },
};

/** The city and defence pieces, by file name without the extension. */
export const PIECES = Object.keys(FILES)
  .filter((p) => p.includes('/city/') && p.endsWith('.glb'))
  .map((p) => base(p).replace(/\.glb$/, ''));

export interface Models {
  /** A city or defence piece, e.g. `commercial-building-a`: clone it to place it. */
  piece(name: string): THREE.Object3D;
  /** The one material each kit's pieces share, by kit (`commercial`, `roads`, …). */
  readonly kits: Map<string, THREE.MeshStandardMaterial>;
  /** A kind's figure for a seat, merged per material: clone it with SkeletonUtils. */
  figure(kind: UnitKind, side: 'p' | 'e'): THREE.Object3D;
  readonly clips: Map<string, THREE.AnimationClip>;
  dispose(): void;
}

/** One character's parts merged into a single skinned mesh, one group per material. */
function mergeCharacter(root: THREE.Object3D): THREE.Object3D {
  const parts: THREE.SkinnedMesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) parts.push(o as THREE.SkinnedMesh);
  });
  const first = parts[0];
  if (!first) return root;
  const materials: THREE.Material[] = [];
  const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const part of parts) {
    const m = part.material as THREE.Material;
    if (!byMaterial.has(m)) {
      byMaterial.set(m, []);
      materials.push(m);
    }
    byMaterial.get(m)!.push(part.geometry);
  }
  const merged = mergeGeometries(
    materials.map((m) => mergeGeometries(byMaterial.get(m)!) ?? byMaterial.get(m)![0]!),
    true,
  );
  // Parts that cannot merge stay as they came.
  if (!merged) return root;
  const mesh = new THREE.SkinnedMesh(merged, materials);
  mesh.name = 'figure';
  mesh.bind(first.skeleton, first.bindMatrix);
  first.parent!.add(mesh);
  for (const part of parts) {
    part.removeFromParent();
    part.geometry.dispose();
  }
  return root;
}

export async function loadModels(): Promise<Models> {
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((u) => URLS.get(base(u)) ?? u);
  const loader = new GLTFLoader(manager);
  const textures = new THREE.TextureLoader(manager);
  const load = (file: string) => loader.loadAsync(url(file));

  const kits = new Map<string, THREE.MeshStandardMaterial>();
  const pieces = new Map<string, THREE.Object3D>();
  const spare: THREE.MeshStandardMaterial[] = [];
  await Promise.all(
    PIECES.map(async (name) => {
      const gltf = await load(`${name}.glb`);
      const kit = name.slice(0, name.indexOf('-'));
      gltf.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const own = mesh.material as THREE.MeshStandardMaterial;
        const shared = kits.get(kit);
        if (!shared) kits.set(kit, own);
        else if (own !== shared) {
          mesh.material = shared;
          spare.push(own);
        }
      });
      pieces.set(name, gltf.scene);
    }),
  );
  // Every piece of a kit reads the same atlas: one material serves them all.
  for (const m of spare) {
    if (![...kits.values()].some((k) => k.map === m.map)) m.map?.dispose();
    m.dispose();
  }

  const figures = new Map<string, THREE.Object3D>();
  const skins: THREE.Texture[] = [];
  const models = [...new Set(Object.values(FIGURES).flatMap((f) => [f.model, f.rival]))];
  await Promise.all(
    models.map(async (m) => figures.set(m, mergeCharacter((await load(`${m}.glb`)).scene))),
  );
  const rivals = new Map<UnitKind, THREE.Object3D>();
  for (const [kind, f] of Object.entries(FIGURES) as [UnitKind, (typeof FIGURES)[UnitKind]][]) {
    const proto = figures.get(f.rival)!;
    if (!f.skin) {
      rivals.set(kind, proto);
      continue;
    }
    const skin = await textures.loadAsync(url(f.skin));
    skin.flipY = false;
    skin.colorSpace = THREE.SRGBColorSpace;
    skins.push(skin);
    // The rival wears the other skin: the same geometry, its own materials.
    const reskinned = cloneSkinned(proto);
    reskinned.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
        const c = (m as THREE.MeshStandardMaterial).clone();
        if (c.map) c.map = skin;
        return c;
      });
      mesh.material = mats;
    });
    rivals.set(kind, reskinned);
  }

  const clips = new Map<string, THREE.AnimationClip>();
  for (const clip of (await load('clips.glb')).animations) clips.set(clip.name, clip);

  return {
    piece: (name) => {
      const p = pieces.get(name);
      if (!p) throw new Error(`no piece ${name}`);
      return p;
    },
    kits,
    figure: (kind, side) => (side === 'p' ? figures.get(FIGURES[kind].model)! : rivals.get(kind)!),
    clips,
    dispose() {
      const seen = new Set<unknown>();
      const free = (o: THREE.Object3D) =>
        o.traverse((n) => {
          const mesh = n as THREE.Mesh;
          if (!mesh.isMesh) return;
          if (!seen.has(mesh.geometry)) mesh.geometry.dispose();
          seen.add(mesh.geometry);
          for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            if (seen.has(m)) continue;
            seen.add(m);
            (m as THREE.MeshStandardMaterial).map?.dispose();
            (m as THREE.MeshStandardMaterial).emissiveMap?.dispose();
            m.dispose();
          }
        });
      for (const p of pieces.values()) free(p);
      for (const f of figures.values()) free(f);
      for (const r of rivals.values()) free(r);
      for (const s of skins) s.dispose();
    },
  };
}

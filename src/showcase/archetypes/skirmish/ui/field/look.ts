/**
 * The night over the sprawl: a blue grade, fog, a low moon, a dim room environment for
 * the wet roads to shine in, line rain, and a bloom pass so the neon glows rather than
 * reads painted on. Night is a colour, not a blackout: the figures stay legible.
 *
 * Bloom is the frame's largest cost. When frames run long the look steps down, render
 * scale first and bloom last, and never steps back up within a scene.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BOUNDS } from './layout';

export const NIGHT = 0x060912;

const DROPS = 2400;
const RAIN_TOP = 18;
const RAIN_SPEED = 16;
/** Frames longer than this, on average, step the look down. */
const SLOW_FRAME = 1 / 40;
/** Seconds after the scene starts before frame times count: shaders compile first. */
const WARM_UP = 3;

export class Look {
  readonly composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private output = new OutputPass();
  private env: THREE.Texture;
  private rain: THREE.LineSegments;
  private rainPos: Float32Array;
  private ratio: number;
  private width = 1;
  private height = 1;
  private age = 0;
  private avg = 1 / 60;

  constructor(
    private renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.ratio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(this.ratio);

    scene.background = new THREE.Color(NIGHT);
    scene.fog = new THREE.FogExp2(0x0a0f1c, 0.026);
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    scene.environment = this.env;
    scene.environmentIntensity = 0.12;
    const sky = new THREE.HemisphereLight(0x4a5a8a, 0x0a0a14, 0.3);
    const moon = new THREE.DirectionalLight(0x7f98ff, 0.45);
    moon.position.set(-10, 20, 12);
    scene.add(sky, moon);

    this.rainPos = new Float32Array(DROPS * 6);
    const w = BOUNDS.maxX - BOUNDS.minX + 20;
    const d = BOUNDS.maxZ - BOUNDS.minZ + 16;
    for (let i = 0; i < DROPS; i++) {
      const x = BOUNDS.minX - 10 + Math.random() * w;
      const y = Math.random() * RAIN_TOP;
      const z = BOUNDS.minZ - 8 + Math.random() * d;
      this.rainPos.set([x, y, z, x + 0.06, y + 0.4, z], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    this.rain = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: 0x9cc0ff, transparent: true, opacity: 0.28 }),
    );
    this.rain.frustumCulled = false;
    scene.add(this.rain);

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.75, 0.5, 0.85);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.output);
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(this.ratio);
    this.composer.setSize(width, height);
  }

  /** Let the rain fall, render, and step the look down if frames run long. */
  render(dt: number, raw: number): void {
    for (let i = 0; i < DROPS; i++) {
      let y = this.rainPos[i * 6 + 1]! - RAIN_SPEED * dt;
      if (y < 0) y += RAIN_TOP;
      this.rainPos[i * 6 + 1] = y;
      this.rainPos[i * 6 + 4] = y + 0.4;
    }
    this.rain.geometry.attributes.position!.needsUpdate = true;
    this.composer.render(dt);
    this.adapt(raw);
  }

  private adapt(raw: number): void {
    this.age += raw;
    // A hidden tab's first frame back is one long gap, not a slow GPU.
    if (this.age < WARM_UP || raw > 0.5) return;
    this.avg += (raw - this.avg) * 0.05;
    if (this.avg < SLOW_FRAME) return;
    if (this.ratio > 1) this.ratio = Math.max(1, this.ratio - 0.5);
    else if (this.bloom.enabled) this.bloom.enabled = false;
    else return;
    this.avg = 1 / 60;
    this.age = 0;
    this.renderer.setPixelRatio(this.ratio);
    this.setSize(this.width, this.height);
  }

  dispose(): void {
    this.rain.geometry.dispose();
    (this.rain.material as THREE.Material).dispose();
    this.env.dispose();
    this.bloom.dispose();
    this.output.dispose();
    this.composer.dispose();
  }
}

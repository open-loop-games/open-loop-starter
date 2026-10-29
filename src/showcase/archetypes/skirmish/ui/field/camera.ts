/**
 * The field's camera: north fixed, tilted about 55°, so your side is always left and the
 * rival's right. It frames the whole map by default and refits on resize; the player
 * zooms toward the cursor and moves it by edge scroll and the arrow keys, and it never
 * leaves the map. No orbit: a turned map would swap the sides.
 *
 * Every move sets a goal the pose eases toward, x += (goal − x)·(1 − e^(−k·dt)), so the
 * camera settles along the same curve at any frame rate.
 */
import * as THREE from 'three';
import { BOUNDS } from './layout';

const PITCH = THREE.MathUtils.degToRad(55);
/** Damping rate, 1/s: settles 95% in about half a second. */
const EASE = 6;
/** Zoom range as a multiple of the whole-map distance. */
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 1;
/** Pan speed in viewport heights per second at the current zoom. */
const PAN_SPEED = 0.9;

export class CameraRig {
  readonly camera = new THREE.PerspectiveCamera(38, 1, 0.5, 300);
  private width = 1;
  private height = 1;
  private fit = 40;
  private target = new THREE.Vector3();
  private distance = 40;
  private goal = { target: new THREE.Vector3(), distance: 40 };
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private tmp = new THREE.Vector3();

  resize(width: number, height: number): void {
    const zoom = this.goal.distance / this.fit;
    this.width = width;
    this.height = height;
    this.fit = this.fitDistance();
    this.goal.distance = this.fit * zoom;
    this.distance = this.goal.distance;
    this.clamp();
    this.target.copy(this.goal.target);
    this.apply(this.target, this.distance);
  }

  /** Wheel zoom about the ground point under the cursor, which stays put. */
  zoomAt(px: number, py: number, deltaY: number): void {
    const anchor = this.groundAt(px, py);
    const next = THREE.MathUtils.clamp(
      this.goal.distance * Math.exp(deltaY * 0.0012),
      this.fit * ZOOM_MIN,
      this.fit * ZOOM_MAX,
    );
    const s = next / this.goal.distance;
    if (anchor) this.goal.target.sub(anchor).multiplyScalar(s).add(anchor);
    this.goal.distance = next;
    this.clamp();
  }

  /** Move the view by a direction on screen (−1..1 each way) held for `dt` seconds. */
  pan(dx: number, dy: number, dt: number): void {
    const step = PAN_SPEED * dt * this.goal.distance * 0.8;
    this.goal.target.x += dx * step;
    this.goal.target.z += dy * step;
    this.clamp();
  }

  /** Advance the eased pose. */
  update(dt: number): void {
    const k = 1 - Math.exp(-EASE * dt);
    this.target.lerp(this.goal.target, k);
    this.distance += (this.goal.distance - this.distance) * k;
    this.apply(this.target, this.distance);
  }

  /** Ground point under a canvas pixel, for the live camera. */
  groundAt(px: number, py: number): THREE.Vector3 | null {
    this.ndc.set((px / this.width) * 2 - 1, -(py / this.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    return this.ray.ray.intersectPlane(this.plane, new THREE.Vector3());
  }

  /** A world point's canvas pixel, or null behind the camera. */
  project(x: number, y: number, z: number): { x: number; y: number } | null {
    this.tmp.set(x, y, z).project(this.camera);
    if (this.tmp.z > 1) return null;
    return { x: (this.tmp.x * 0.5 + 0.5) * this.width, y: (-this.tmp.y * 0.5 + 0.5) * this.height };
  }

  /** Keep the view's centre over the map; the more it is zoomed out, the less it can move. */
  private clamp(): void {
    const slack = 1 - this.goal.distance / this.fit;
    const t = this.goal.target;
    t.x = THREE.MathUtils.clamp(t.x, BOUNDS.minX * slack, BOUNDS.maxX * slack);
    t.z = THREE.MathUtils.clamp(t.z, BOUNDS.minZ * slack, BOUNDS.maxZ * slack);
  }

  private apply(target: THREE.Vector3, distance: number): void {
    const cam = this.camera;
    cam.aspect = this.width / this.height;
    cam.position.set(
      target.x,
      target.y + Math.sin(PITCH) * distance,
      target.z + Math.cos(PITCH) * distance,
    );
    cam.lookAt(target);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }

  /** The distance at which the map's corners just fit the canvas, by bisection. */
  private fitDistance(): number {
    const origin = new THREE.Vector3();
    const corners = [
      [BOUNDS.minX, BOUNDS.minZ],
      [BOUNDS.maxX, BOUNDS.minZ],
      [BOUNDS.minX, BOUNDS.maxZ],
      [BOUNDS.maxX, BOUNDS.maxZ],
    ] as const;
    const fits = (d: number): boolean => {
      this.apply(origin, d);
      for (const [x, z] of corners) {
        const q = this.project(x, 0, z);
        if (!q || q.x < 0 || q.x > this.width || q.y < 0 || q.y > this.height) return false;
      }
      return true;
    };
    let lo = 5;
    let hi = 200;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    return hi;
  }
}

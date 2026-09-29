import * as THREE from 'three';
import { box, glow, mat } from '../world/materials';
import type { WorldObject } from '../world/World';

export type DriveInput = { forward: boolean; reverse: boolean; left: boolean; right: boolean; brake: boolean; boost: boolean };

export class Rover {
  group = new THREE.Group();
  position = new THREE.Vector3(0, 0, 18);
  heading = Math.PI;
  speed = 0;
  boost = false;
  private body = new THREE.Group();
  private wheels: THREE.Mesh[] = [];
  private brakeLights: THREE.Mesh[] = [];
  private trails: THREE.Mesh[] = [];
  private lastSafe = new THREE.Vector3(0, 0, 18);

  constructor(scene: THREE.Scene) {
    scene.add(this.group); this.group.add(this.body);
    const hull = mat(0xdcc59d, .55, .4), under = mat(0x202c33, .65, .5), glass = mat(0x477b80, .25, .18);
    const trim = mat(0x8a9b8e, .68, .35), tire = mat(0x111b20, .04, .95), brass = mat(0xc49861, .75, .28);
    box(this.body, 0, .73, 0, 2.25, .48, 3.1, under);
    box(this.body, 0, 1.03, -.1, 1.85, .55, 2.4, hull);
    const canopy = box(this.body, 0, 1.48, -.26, 1.35, .5, 1.35, glass);
    canopy.rotation.x = -.12;
    box(this.body, 0, 1.86, -.32, .78, .11, .75, under);
    const hood = box(this.body, 0, 1.37, -1.08, 1.78, .15, .96, hull); hood.rotation.x = -.12;
    box(this.body, 0, .87, -1.66, 1.85, .2, .18, trim);
    box(this.body, 0, .68, 1.7, 2.2, .18, .23, trim);
    for (const side of [-1, 1]) {
      box(this.body, side * .83, 1.18, -.26, .11, .54, 1.35, under);
      box(this.body, side * .95, .93, -.16, .1, .16, 2.55, brass);
      box(this.body, side * .66, 1.89, -.32, .08, .12, 1.1, trim);
      box(this.body, side * .68, 1.47, .48, .08, .68, .1, trim);
      box(this.body, side * .65, 1.47, -.94, .08, .68, .1, trim);
      box(this.body, side * .78, 1.36, -1.58, .38, .22, .08, glow(0xffe4ad, 1.7));
    }
    for (const side of [-1, 1]) {
      for (const z of [-1.1, 1.1]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.43, .43, .28, 16), tire);
        wheel.rotation.z = Math.PI / 2; wheel.position.set(side * 1.13, .47, z); this.body.add(wheel); this.wheels.push(wheel);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .3, 10), brass); hub.rotation.z = Math.PI / 2; hub.position.copy(wheel.position); hub.position.x += side * .05; this.body.add(hub);
        const fender = box(this.body, side * 1.04, .94, z, .34, .14, 1.2, under); fender.rotation.x = z < 0 ? -.06 : .06;
      }
      box(this.body, side * .83, .68, -1.55, .4, .15, .1, glow(0xe8d19e, 1.6));
      const brake = box(this.body, side * .83, .82, 1.59, .36, .42, .08, glow(0xb94439, .55)); this.brakeLights.push(brake);
      box(this.body, side * .83, 1.18, 1.57, .36, .07, .1, glow(0xf2bb7c, .8));
      const trail = box(this.group, side * .7, .35, 2.55, .12, .05, 1.6, new THREE.MeshBasicMaterial({ color: 0xe9ba75, transparent: true, opacity: 0 })); this.trails.push(trail);
    }
    box(this.body, 0, .68, -1.66, 1.65, .1, .24, hull);
    box(this.body, 0, .91, 1.62, .75, .35, .08, under);
    box(this.body, 0, 1.13, 1.63, .83, .12, .08, brass);
    const spare = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .23, 16), tire);
    spare.rotation.x = Math.PI / 2; spare.position.set(0, 1.1, 1.75); spare.castShadow = true; this.body.add(spare);
    const spareHub = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .25, 10), trim);
    spareHub.rotation.x = Math.PI / 2; spareHub.position.copy(spare.position); spareHub.position.z += .03; this.body.add(spareHub);
    this.group.position.copy(this.position);
  }

  update(dt: number, input: DriveInput, collisions: WorldObject[], reducedMotion: boolean) {
    dt = Math.min(dt, .05);
    this.boost = input.boost && input.forward && !input.brake;
    const max = this.boost ? 23 : 15.5;
    const accel = input.forward ? (this.boost ? 25 : 18) : input.reverse ? -12 : 0;
    this.speed += accel * dt;
    if (input.brake) this.speed *= Math.exp(-8 * dt);
    else if (!input.forward && !input.reverse) this.speed *= Math.exp(-2.3 * dt);
    else this.speed *= Math.exp(-.75 * dt);
    this.speed = THREE.MathUtils.clamp(this.speed, -7.5, max);
    if (Math.abs(this.speed) < .035) this.speed = 0;
    const steer = Number(input.right) - Number(input.left);
    if (steer && Math.abs(this.speed) > .12) {
      const factor = .32 + .68 * Math.min(Math.abs(this.speed) / 6, 1);
      this.heading -= steer * (this.speed > 0 ? 1 : -1) * dt * 1.65 * factor * (1 - Math.min(Math.abs(this.speed) / 30, .35));
    }
    const old = this.position.clone();
    this.position.x += Math.sin(this.heading) * this.speed * dt;
    this.position.z += Math.cos(this.heading) * this.speed * dt;
    const out = Math.hypot(this.position.x, this.position.z) > 70;
    let collided = false;
    for (const c of collisions) {
      const dx = this.position.x - c.x, dz = this.position.z - c.z, d = Math.hypot(dx, dz);
      if (d < c.radius + 1.15) { const nx = dx / Math.max(d, .001), nz = dz / Math.max(d, .001); this.position.x = c.x + nx * (c.radius + 1.15); this.position.z = c.z + nz * (c.radius + 1.15); collided = true; }
    }
    if (out) { this.position.copy(old); this.speed *= -.3; }
    if (collided) this.speed *= -.28;
    if (!out && !collided && Math.hypot(this.position.x, this.position.z) < 65) this.lastSafe.copy(this.position);
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading - Math.PI;
    this.body.position.y = reducedMotion ? 0 : Math.sin(performance.now() * .007) * Math.min(Math.abs(this.speed) / 80, .055);
    this.body.rotation.z = reducedMotion ? 0 : -steer * Math.min(Math.abs(this.speed) / 100, .045);
    for (const wheel of this.wheels) wheel.rotation.x -= this.speed * dt * 2;
    for (const light of this.brakeLights) (light.material as THREE.MeshStandardMaterial).emissiveIntensity = input.brake || input.reverse ? 2.4 : .55;
    for (const trail of this.trails) (trail.material as THREE.MeshBasicMaterial).opacity = this.boost && !reducedMotion ? .55 : 0;
  }

  reset() { this.position.copy(this.lastSafe); this.heading = Math.PI; this.speed = 0; this.group.position.copy(this.position); this.group.rotation.y = this.heading - Math.PI; }
}

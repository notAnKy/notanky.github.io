import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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
  private wheels: THREE.Group[] = [];
  private steering: THREE.Group[] = [];
  private brakeLights: THREE.Mesh[] = [];
  private trails: THREE.Mesh[] = [];
  private lastSafe = new THREE.Vector3(0, 0, 18);
  private previousPosition = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    scene.add(this.group); this.group.add(this.body);
    this.group.name = 'MAJ expedition rover';
    const pearl = new THREE.MeshPhysicalMaterial({ color: 0xf1eee0, metalness: .22, roughness: .32, clearcoat: .85, clearcoatRoughness: .24 });
    const coral = new THREE.MeshPhysicalMaterial({ color: 0xff704a, metalness: .2, roughness: .3, clearcoat: .65 });
    const frame = mat(0x17373b, .6, .36), rubber = mat(0x14242b, .05, .92);
    const silver = mat(0xa5b8b3, .8, .28), darkRim = mat(0x344c51, .7, .34);
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x174d58, metalness: .46, roughness: .15, clearcoat: 1, clearcoatRoughness: .12 });
    const mint = mat(0x9ac8b7, .25, .5), light = glow(0xfff0ce, 1.65), rearLight = glow(0xff523a, .55);

    const rounded = (parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, radius = .06) => {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 2, h / 2, d / 2)), material);
      mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const tube = (parent: THREE.Object3D, from: [number, number, number], to: [number, number, number], radius: number, material: THREE.Material) => {
      const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to), direction = end.clone().sub(start);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 8), material);
      mesh.position.copy(start).add(end).multiplyScalar(.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      mesh.castShadow = true; parent.add(mesh); return mesh;
    };
    const disc = (parent: THREE.Object3D, x: number, y: number, z: number, radius: number, depth: number, material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 32), material);
      mesh.rotation.z = Math.PI / 2; mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
    };

    // A low, rounded hull gives the vehicle a recognizable silhouette at driving distance.
    rounded(this.body, 0, .62, 0, 1.68, .3, 2.85, frame, .1);
    rounded(this.body, 0, .93, -.02, 2, .5, 3.06, pearl, .16);
    rounded(this.body, 0, 1.22, -.05, 1.89, .3, 2.78, pearl, .11);
    rounded(this.body, 0, 1.37, -1.07, 1.81, .22, .96, pearl, .1);
    rounded(this.body, 0, 1.49, -1.12, .54, .016, .69, coral, .007);
    rounded(this.body, 0, .84, -1.6, 1.95, .3, .21, frame, .07);
    rounded(this.body, 0, .67, -1.66, 1.58, .13, .24, silver, .04);
    rounded(this.body, 0, 1.07, -1.59, 1.71, .23, .05, frame, .02);
    for (let i = -3; i <= 3; i++) box(this.body, i * .095, 1.075, -1.625, .027, .13, .012, silver);
    rounded(this.body, 0, .78, 1.62, 2.03, .23, .24, frame, .07);
    rounded(this.body, 0, .64, 1.68, 1.8, .09, .16, silver, .025);
    rounded(this.body, 0, 1.21, 1.39, 1.86, .51, .15, pearl, .07);

    // Opaque PBR glazing reads clearly without a costly transparent interior.
    rounded(this.body, 0, 1.66, -.03, 1.62, .66, 1.46, glass, .13);
    rounded(this.body, 0, 2.006, -.015, 1.78, .15, 1.63, pearl, .07);
    rounded(this.body, 0, 1.387, -.03, 1.73, .11, 1.63, coral, .035);
    box(this.body, 0, 1.71, -.779, .045, .51, .022, frame);
    tube(this.body, [-.63, 1.435, -.79], [-.24, 1.56, -.79], .018, frame);
    tube(this.body, [.05, 1.435, -.79], [.44, 1.56, -.79], .018, frame);
    for (const side of [-1, 1]) {
      tube(this.body, [side * .8, 1.39, -.74], [side * .75, 1.97, -.66], .038, pearl);
      tube(this.body, [side * .8, 1.4, .68], [side * .75, 1.97, .62], .042, pearl);
      rounded(this.body, side * .817, 1.67, .2, .045, .55, .057, frame, .014);
      rounded(this.body, side * 1.012, 1.125, -.075, .024, .28, 1.35, coral, .01);
      rounded(this.body, side * .963, 1.24, .2, .043, .05, .21, frame, .018);
      rounded(this.body, side * 1.015, .65, 0, .28, .095, 1.16, silver, .025);
      for (let i = -2; i <= 2; i++) box(this.body, side * 1.02, .703, i * .18, .2, .009, .045, frame);
      tube(this.body, [side * .81, 1.62, -.55], [side * 1.035, 1.59, -.65], .035, frame);
      rounded(this.body, side * 1.07, 1.61, -.66, .18, .15, .23, pearl, .045);
      rounded(this.body, side * 1.07, 1.615, -.53, .13, .09, .014, glass, .02);
      rounded(this.body, side * .676, 1.092, -1.624, .38, .185, .065, light, .057);
      rounded(this.body, side * .84, .848, -1.725, .17, .067, .016, glow(0xffad53, 1.15), .02);
      const hook = new THREE.Mesh(new THREE.TorusGeometry(.075, .024, 6, 14), coral);
      hook.position.set(side * .62, .658, -1.8); this.body.add(hook);
      const brake = rounded(this.body, side * .795, 1.157, 1.489, .165, .365, .065, rearLight, .055);
      this.brakeLights.push(brake);
      rounded(this.body, side * .795, 1.14, 1.526, .105, .033, .012, pearl, .007);
      rounded(this.body, side * .795, 1.345, 1.486, .13, .04, .025, light, .01);
    }

    const treadGeometry = new THREE.BoxGeometry(.19, .06, .115);
    const boltGeometry = new THREE.CylinderGeometry(.022, .022, .018, 6);
    const instance = new THREE.Object3D();
    for (const side of [-1, 1]) {
      for (const z of [-1.035, 1.035]) {
        const pivot = new THREE.Group(); pivot.position.set(side * 1.045, .478, z); this.body.add(pivot);
        if (z < 0) this.steering.push(pivot);
        const spin = new THREE.Group(); pivot.add(spin); this.wheels.push(spin);
        disc(spin, 0, 0, 0, .437, .36, rubber);
        // Each wheel's tread blocks share a draw call and rotate with its rim.
        const treads = new THREE.InstancedMesh(treadGeometry, rubber, 48);
        for (let row = 0; row < 2; row++) for (let i = 0; i < 24; i++) {
          const angle = (i + row * .5) / 24 * Math.PI * 2;
          instance.position.set((row - .5) * .177, Math.cos(angle) * .44, Math.sin(angle) * .44);
          instance.rotation.set(angle, 0, row === 0 ? .18 : -.18); instance.updateMatrix();
          treads.setMatrixAt(row * 24 + i, instance.matrix);
        }
        treads.castShadow = true; spin.add(treads);
        const outer = side * .192;
        disc(spin, outer, 0, 0, .307, .04, darkRim);
        disc(spin, outer + side * .018, 0, 0, .228, .045, silver);
        disc(spin, outer + side * .045, 0, 0, .113, .05, coral);
        disc(spin, outer + side * .073, 0, 0, .051, .013, frame);
        const bead = new THREE.Mesh(new THREE.TorusGeometry(.291, .016, 6, 32), silver);
        bead.rotation.y = Math.PI / 2; bead.position.x = outer + side * .026; spin.add(bead);
        const bolts = new THREE.InstancedMesh(boltGeometry, frame, 6);
        for (let i = 0; i < 6; i++) {
          const angle = i / 6 * Math.PI * 2;
          instance.position.set(outer + side * .048, Math.cos(angle) * .17, Math.sin(angle) * .17);
          instance.rotation.set(0, 0, Math.PI / 2); instance.updateMatrix(); bolts.setMatrixAt(i, instance.matrix);
        }
        spin.add(bolts);
        const fender = new THREE.Mesh(new THREE.TorusGeometry(.498, .07, 6, 24, Math.PI), frame);
        fender.rotation.y = Math.PI / 2; fender.position.set(side * 1.066, .478, z); fender.castShadow = true; this.body.add(fender);
        tube(this.body, [side * .68, .58, z], [side * .91, .67, z + .18], .049, silver);
        rounded(this.body, side * .79, .73, z + .11, .065, .35, .07, coral, .02);
      }
      rounded(this.body, side * 1.07, .46, 1.46, .3, .32, .045, rubber, .015);
      const trail = box(this.group, side * .67, .3, 2.65, .1, .035, 1.55, new THREE.MeshBasicMaterial({ color: 0x7ee3d0, transparent: true, opacity: 0, depthWrite: false })); this.trails.push(trail);
    }

    // Low roof rails, a strapped field case and a solar panel add expedition details.
    for (const side of [-1, 1]) {
      for (const z of [-.5, .52]) rounded(this.body, side * .65, 2.12, z, .055, .13, .075, frame, .017);
      tube(this.body, [side * .65, 2.185, -.65], [side * .65, 2.185, .68], .033, silver);
    }
    for (const z of [-.54, .56]) tube(this.body, [-.68, 2.185, z], [.68, 2.185, z], .027, silver);
    rounded(this.body, -.29, 2.2, .14, .59, .14, .82, coral, .045);
    for (const z of [-.12, .42]) rounded(this.body, -.29, 2.276, z, .59, .017, .048, frame, .006);
    rounded(this.body, .325, 2.176, .095, .48, .06, .88, frame, .02);
    rounded(this.body, .325, 2.21, .095, .425, .012, .8, glass, .003);
    for (let i = -2; i <= 2; i++) box(this.body, .325, 2.218, .095 + i * .145, .423, .004, .007, silver);
    tube(this.body, [.325, 2.218, -.295], [.325, 2.218, .485], .003, silver);
    rounded(this.body, 0, 2.105, -.75, 1.12, .09, .1, frame, .025);
    for (let i = -3; i <= 3; i++) rounded(this.body, i * .141, 2.108, -.808, .103, .046, .016, light, .008);
    tube(this.body, [-.68, 2.05, .59], [-.69, 2.54, .69], .012, frame);
    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(.025, 8, 6), coral); antennaTip.position.set(-.69, 2.54, .69); this.body.add(antennaTip);

    // Rear equipment is composed for the camera's usual chase view.
    const spare = new THREE.Group(); spare.position.set(-.28, 1.335, 1.652); spare.rotation.y = -Math.PI / 2; this.body.add(spare);
    disc(spare, 0, 0, 0, .343, .21, rubber);
    disc(spare, .123, 0, 0, .242, .04, pearl);
    disc(spare, .15, 0, 0, .102, .043, coral);
    const spareBead = new THREE.Mesh(new THREE.TorusGeometry(.294, .024, 7, 32), frame);
    spareBead.rotation.y = Math.PI / 2; spareBead.position.x = .12; spare.add(spareBead);
    rounded(this.body, .467, 1.192, 1.628, .35, .59, .23, mint, .055);
    rounded(this.body, .467, 1.485, 1.628, .15, .07, .13, frame, .023);
    rounded(this.body, .467, 1.177, 1.754, .23, .027, .015, frame, .005);
    rounded(this.body, .467, 1.177, 1.754, .027, .37, .015, frame, .005);

    const badgeCanvas = document.createElement('canvas'); badgeCanvas.width = 512; badgeCanvas.height = 160;
    const ctx = badgeCanvas.getContext('2d')!;
    ctx.fillStyle = '#17373b'; ctx.fillRect(0, 0, 512, 160);
    ctx.fillStyle = '#ff825a'; ctx.fillRect(20, 24, 8, 112);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f1eee0';
    ctx.font = '700 60px Arial, sans-serif'; ctx.fillText('MAJ / 01', 268, 63);
    ctx.font = '22px Arial, sans-serif'; ctx.fillStyle = '#9ac8b7'; ctx.fillText('EXPEDITION DIVISION', 266, 119);
    const badgeTexture = new THREE.CanvasTexture(badgeCanvas); badgeTexture.colorSpace = THREE.SRGBColorSpace; badgeTexture.anisotropy = 4;
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(.66, .206), new THREE.MeshBasicMaterial({ map: badgeTexture }));
    badge.position.set(0, .828, 1.751); this.body.add(badge);
    // Bake fixed parts by material; fine vehicle detail should not cost a draw call per bolt or panel.
    const batches = new Map<THREE.Material, { geometries: THREE.BufferGeometry[]; castShadow: boolean }>();
    const fixedMeshes = this.body.children.filter((child): child is THREE.Mesh<THREE.BufferGeometry, THREE.Material> => child instanceof THREE.Mesh && !Array.isArray(child.material));
    for (const mesh of fixedMeshes) {
      mesh.updateMatrix();
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrix);
      const batch = batches.get(mesh.material) ?? { geometries: [], castShadow: false };
      batch.geometries.push(geometry); batch.castShadow ||= mesh.castShadow; batches.set(mesh.material, batch);
      this.body.remove(mesh);
    }
    for (const [material, batch] of batches) {
      const geometry = mergeGeometries(batch.geometries)!;
      const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = batch.castShadow; mesh.receiveShadow = true; this.body.add(mesh);
      for (const part of batch.geometries) part.dispose();
    }
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
    this.previousPosition.copy(this.position);
    this.position.x += Math.sin(this.heading) * this.speed * dt;
    this.position.z += Math.cos(this.heading) * this.speed * dt;
    const out = Math.hypot(this.position.x, this.position.z) > 70;
    let collided = false;
    for (const c of collisions) {
      const dx = this.position.x - c.x, dz = this.position.z - c.z, d = Math.hypot(dx, dz);
      if (d < c.radius + 1.15) { const nx = dx / Math.max(d, .001), nz = dz / Math.max(d, .001); this.position.x = c.x + nx * (c.radius + 1.15); this.position.z = c.z + nz * (c.radius + 1.15); collided = true; }
    }
    if (out) { this.position.copy(this.previousPosition); this.speed *= -.3; }
    if (collided) this.speed *= -.28;
    if (!out && !collided && Math.hypot(this.position.x, this.position.z) < 65) this.lastSafe.copy(this.position);
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading - Math.PI;
    this.body.position.y = reducedMotion ? 0 : Math.sin(performance.now() * .007) * Math.min(Math.abs(this.speed) / 80, .04);
    this.body.rotation.z = reducedMotion ? 0 : -steer * Math.min(Math.abs(this.speed) / 100, .035);
    const suspensionPitch = reducedMotion ? 0 : (input.brake ? -.024 : input.forward ? .017 : input.reverse ? -.012 : 0) * Math.min(Math.abs(this.speed) / 3, 1);
    this.body.rotation.x = reducedMotion ? 0 : THREE.MathUtils.damp(this.body.rotation.x, suspensionPitch, 7, dt);
    for (const pivot of this.steering) pivot.rotation.y = THREE.MathUtils.damp(pivot.rotation.y, -steer * .32, 12, dt);
    for (const wheel of this.wheels) wheel.rotation.x -= this.speed * dt / .45;
    for (const light of this.brakeLights) (light.material as THREE.MeshStandardMaterial).emissiveIntensity = input.brake || input.reverse ? 2.4 : .55;
    for (const trail of this.trails) (trail.material as THREE.MeshBasicMaterial).opacity = this.boost && !reducedMotion ? .45 : 0;
  }

  travelTo(x: number, z: number, heading: number) {
    this.position.set(x, 0, z); this.lastSafe.copy(this.position); this.previousPosition.copy(this.position);
    this.heading = heading; this.speed = 0; this.boost = false;
    this.group.position.copy(this.position); this.group.rotation.y = heading - Math.PI;
    this.body.position.y = 0; this.body.rotation.set(0, 0, 0);
  }
  reset() { this.travelTo(this.lastSafe.x, this.lastSafe.z, Math.PI); }
}

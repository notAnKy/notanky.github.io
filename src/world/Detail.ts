import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, glow } from './materials';

type Animate = (time: number, dt: number, player: THREE.Vector3) => void;
type DistrictPattern = 'circuit' | 'vision' | 'arcade' | 'archive' | 'lab';
type Batch = { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[]; shadows: boolean };

// These are physical pigments: daylight and shadows supply most of the contrast.
const ivory = mat(0xfff4dc, .05, .56);
const porcelain = mat(0xf7fffa, .08, .4);
const turquoise = mat(0x1db9b1, .3, .28);
const deepTeal = mat(0x086977, .42, .22);
const mint = mat(0xa6ecca, .08, .43);
const coral = mat(0xf5755d, .08, .42);
const rose = mat(0xf4a1bd, .06, .46);
const yellow = mat(0xf8ca60, .2, .34);
const terracotta = mat(0xd78462, .08, .72);
const lilac = mat(0xbca4ea, .15, .36);
const plum = mat(0x7662ab, .25, .36);
const warmLight = glow(0xffe4a2, .28);
const coolLight = glow(0x9af8df, .3);
const foliage = mat(0x45ad87, .04, .77);
const paleFoliage = mat(0xa9db9a, .04, .8);
const glass = new THREE.MeshStandardMaterial({ color: 0x92d7d1, metalness: .48, roughness: .17 });
const greenhouseGlass = new THREE.MeshStandardMaterial({ color: 0xc6b6ed, metalness: .06, roughness: .16, transparent: true, opacity: .2, side: THREE.DoubleSide, depthWrite: false });
greenhouseGlass.forceSinglePass = true;

/** Batch architectural trim across the whole island instead of one draw per part. */
class Architecture {
  private geometries = new Map<string, THREE.BufferGeometry>();
  private batches = new Map<string, Batch>();
  private rotation = new THREE.Euler();
  private quaternion = new THREE.Quaternion();
  private position = new THREE.Vector3();
  private scale = new THREE.Vector3();

  geometry(key: string, create: () => THREE.BufferGeometry) {
    let geometry = this.geometries.get(key);
    if (!geometry) { geometry = create(); this.geometries.set(key, geometry); }
    return geometry;
  }

  put(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, shadows = true) {
    const key = `${geometry.uuid}:${material.uuid}:${shadows}`;
    let batch = this.batches.get(key);
    if (!batch) { batch = { geometry, material, matrices: [], shadows }; this.batches.set(key, batch); }
    this.position.set(x, y, z); this.scale.set(sx, sy, sz);
    this.quaternion.setFromEuler(this.rotation.set(rx, ry, rz));
    batch.matrices.push(new THREE.Matrix4().compose(this.position, this.quaternion, this.scale));
  }

  block(material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, ry = 0, rz = 0) {
    this.put(this.geometry('rounded-block', () => new RoundedBoxGeometry(1, 1, 1, 2, .08)), material, x, y, z, w, h, d, 0, ry, rz);
  }

  cylinder(material: THREE.Material, x: number, y: number, z: number, radius: number, height: number) {
    this.put(this.geometry('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 32)), material, x, y, z, radius, height, radius);
  }

  ring(material: THREE.Material, x: number, y: number, z: number, radius: number, thickness = .08, rx = 0, ry = 0, arc = Math.PI * 2) {
    const tube = Math.round(thickness / radius * 1000) / 1000;
    const geometry = this.geometry(`ring:${tube}:${arc}`, () => new THREE.TorusGeometry(1, tube, 8, 64, arc));
    this.put(geometry, material, x, y, z, radius, radius, radius, rx, ry);
  }

  arch(material: THREE.Material, x: number, y: number, z: number, width: number, shoulder: number, thickness: number, depth: number, ry = 0, sy = 1) {
    const geometry = this.geometry(`arch:${width}:${shoulder}:${thickness}:${depth}`, () => {
      const r = width / 2, inner = r - thickness;
      const shape = new THREE.Shape();
      shape.moveTo(-r, 0); shape.lineTo(-r, shoulder);
      shape.absarc(0, shoulder, r, Math.PI, 0, true);
      shape.lineTo(r, 0); shape.lineTo(inner, 0); shape.lineTo(inner, shoulder);
      shape.absarc(0, shoulder, inner, 0, Math.PI, false);
      shape.lineTo(-inner, 0); shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: .07, bevelSize: .07, bevelSegments: 2, curveSegments: 24 });
      geo.translate(0, 0, -depth / 2);
      return geo;
    });
    this.put(geometry, material, x, y, z, 1, sy, 1, 0, ry);
  }

  flush(parent: THREE.Object3D) {
    for (const { geometry, material, matrices, shadows } of this.batches.values()) {
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = shadows; mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      parent.add(mesh);
    }
  }
}

function patternedDisc(a: Architecture, x: number, z: number, radius: number, variant: DistrictPattern, materials: Map<DistrictPattern, THREE.Material>) {
  let material = materials.get(variant);
  if (!material) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
    const c = canvas.getContext('2d')!;
    const colors = {
      circuit: ['#d3e9db', '#448e85'], vision: ['#ddf4e2', '#62b6a0'], arcade: ['#f7bf9f', '#c85f61'],
      archive: ['#edd3b4', '#bd845e'], lab: ['#e3d9ef', '#9d82bc'],
    } as const;
    c.fillStyle = colors[variant][0]; c.fillRect(0, 0, 1024, 1024);
    c.strokeStyle = colors[variant][1]; c.fillStyle = colors[variant][1]; c.lineWidth = 3; c.globalAlpha = .48;
    if (variant === 'circuit') {
      for (let i = 0; i < 13; i++) {
        const p = 42 + i * 76, bend = 260 + (i % 4) * 90;
        c.beginPath(); c.moveTo(0, p); c.lineTo(bend, p); c.lineTo(bend + 64, p + 64); c.lineTo(1024, p + 64); c.stroke();
        c.beginPath(); c.arc(bend + 64, p + 64, 7, 0, Math.PI * 2); c.fill();
      }
    } else if (variant === 'vision') {
      for (let i = 0; i < 17; i++) { const p = i * 64; c.beginPath(); c.moveTo(p, 0); c.lineTo(p, 1024); c.moveTo(0, p); c.lineTo(1024, p); c.stroke(); }
      c.lineWidth = 7;
      for (const radius of [180, 330, 452]) { c.beginPath(); c.arc(512, 512, radius, 0, Math.PI * 2); c.stroke(); }
    } else if (variant === 'arcade') {
      c.lineWidth = 34;
      for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(512, 512, 120 + i * 88, i * .35, Math.PI * 1.45 + i * .35); c.stroke(); }
      c.fillStyle = '#fff2ce'; c.fillRect(478, 466, 68, 92);
    } else if (variant === 'archive') {
      for (let i = 0; i < 17; i++) { c.lineWidth = i % 4 ? 3 : 10; c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, 1024); c.stroke(); }
      c.lineWidth = 8; c.strokeRect(80, 80, 864, 864);
    } else {
      for (let i = 1; i < 8; i++) { c.beginPath(); c.arc(512, 512, i * 68, 0, Math.PI * 2); c.stroke(); }
      for (let i = 0; i < 12; i++) { const angle = i * Math.PI / 6; c.beginPath(); c.moveTo(512, 512); c.lineTo(512 + Math.cos(angle) * 512, 512 + Math.sin(angle) * 512); c.stroke(); }
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
    material = new THREE.MeshStandardMaterial({ map: texture, roughness: .87, metalness: .02 });
    materials.set(variant, material);
  }
  a.put(a.geometry('ground-disc', () => new THREE.CircleGeometry(1, 80)), material, x, .334, z, radius, radius, 1, -Math.PI / 2, 0, 0, false);
}

function addMesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z);
  mesh.castShadow = !material.transparent; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

function leafPlant(a: Architecture, x: number, z: number, height: number, potMaterial: THREE.Material) {
  a.cylinder(potMaterial, x, .53, z, .64, .94);
  a.cylinder(ivory, x, 1.01, z, .68, .13);
  a.cylinder(foliage, x, 1 + height / 2, z, .07, height);
  const leaf = a.geometry('botanical-leaf', () => new THREE.SphereGeometry(1, 12, 8));
  for (let i = 0; i < 5; i++) {
    const angle = i * 2.4;
    a.put(leaf, i % 2 ? foliage : paleFoliage, x + Math.cos(angle) * .48, 1.5 + i * height / 6, z + Math.sin(angle) * .48, .75, .21, .32, .2, -angle, Math.sin(angle) * .38);
  }
}

function addWelcome(a: Architecture) {
  // A wide open arch wraps the drive-through entrance, with all feet outside the road.
  a.arch(ivory, 0, .18, 3.2, 15.3, 3.25, .54, .9);
  a.arch(turquoise, 0, .18, 3.81, 14.25, 3.25, .17, .16);
  for (const side of [-1, 1]) {
    a.block(coral, side * 7.38, .54, 3.2, 1.9, 1.08, 2.8);
    a.block(ivory, side * 7.38, 1.15, 3.2, 1.72, .18, 2.6);
    a.block(yellow, side * 5.71, 7.6, 4, 1.7, .38, 2.2);
  }
  a.cylinder(ivory, -9.8, .52, 3.5, 1.65, 1.04);
  a.cylinder(coral, -9.8, 1.58, 3.5, 1.32, 1.08);
  a.ring(turquoise, -9.8, 3.65, 3.5, 1.55, .31, 0, .35);
  a.ring(yellow, -9.8, 3.65, 3.5, .77, .22, Math.PI / 2, .35);
  leafPlant(a, 25.2, -.5, 2.2, coral);
  leafPlant(a, 26.9, -1.4, 1.6, turquoise);
}

function addSoftware(a: Architecture, parent: THREE.Object3D, animated: Animate[], patterns: Map<DistrictPattern, THREE.Material>) {
  for (const [x, z] of [[-40, -17], [-31, -29], [-17, -22], [-39, -2], [-20, -7]]) patternedDisc(a, x, z, 4.04, 'circuit', patterns);

  // Terraced server towers provide a strong skyline behind the smaller project pavilions.
  for (const [x, z, h] of [[-47.5, -29.5, 13.6], [-51.2, -21.8, 9.8]]) {
    a.block(ivory, x, .58, z, 5.6, 1.16, 5.4);
    a.block(turquoise, x, 1 + h / 2, z, 4.8, h, 4.5);
    a.block(ivory, x, h + 1.08, z, 5.2, .55, 4.9);
    a.block(yellow, x + .75, h + 1.78, z, 2.9, .84, 3.1);
    for (const side of [-1, 1]) a.block(porcelain, x + side * 2.12, 1 + h / 2, z + 2.3, .32, h, .32);
    for (let floor = 0; floor < Math.floor(h / 1.55); floor++) {
      const y = 2.1 + floor * 1.55;
      a.block(deepTeal, x, y, z + 2.27, 3.9, .48, .11);
      a.block(ivory, x, y + .34, z + 2.33, 4.9, .13, .44);
      a.block(mint, x - 2.42, y, z, .1, .45, 3.2);
    }
  }

  a.block(ivory, -40, 4.08, -17, 6.8, .38, 6.3);
  a.block(turquoise, -40, 4.74, -17, 5.8, 1.04, 5.3);
  a.block(ivory, -40, 5.34, -17, 6.6, .25, 6.1);
  a.block(glass, -40, 7.04, -17, 2.5, 3.15, 2.5);
  for (const dx of [-1.52, 1.52]) for (const dz of [-1.52, 1.52]) a.block(porcelain, -40 + dx, 7.13, -17 + dz, .28, 3.62, .28);
  a.block(yellow, -40, 9.02, -17, 3.35, .4, 3.35);
  for (let i = 0; i < 5; i++) a.block(deepTeal, -42.1 + i * 1.05, 2.1, -13.98, .62, 1.45, .11);
  const chip = addMesh(parent, new THREE.OctahedronGeometry(.72), coolLight, -40, 10.12, -17);
  animated.push(time => { chip.rotation.y = time * .35; chip.position.y = 10.12 + Math.sin(time * 1.15) * .17; });

  a.cylinder(ivory, -31, 4.18, -29, 3.9, .4);
  a.cylinder(turquoise, -31, 4.63, -29, 2.97, .48);
  for (const y of [1.02, 2.88]) a.ring(porcelain, -31, y, -29, 3.32, .095, Math.PI / 2);
  a.ring(yellow, -31, 6.7, -29, 2.5, .15, .7, .25);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    a.block(ivory, -31 + Math.cos(angle) * 3.23, 2.04, -29 + Math.sin(angle) * 3.23, .17, 3.05, .4, -angle);
  }

  for (let i = -2; i <= 2; i++) {
    const h = 5.3 + (2 - Math.abs(i)) * .55;
    a.block(i % 2 ? mint : ivory, -17 + i * 1.15, h / 2 + .4, -23.1, .9, h, 3.15);
    a.block(deepTeal, -17 + i * 1.15, h - .12, -21.46, .48, .27, .1);
  }
  a.arch(yellow, -17, 3.82, -23.35, 6.6, .2, .3, .45);

  a.block(ivory, -39, 3.87, -2, 6.5, .35, 5.3);
  a.block(coral, -39, 4.22, -2, 5.7, .35, 4.7);
  const reelGeometry = new THREE.TorusGeometry(1.04, .18, 10, 48);
  const hubGeometry = new THREE.CylinderGeometry(.34, .34, .25, 20);
  const spokeGeometry = new RoundedBoxGeometry(.11, 1.58, .14, 2, .04);
  for (const side of [-1, 1]) {
    const reel = new THREE.Group(); reel.position.set(-39 + side * 1.42, 5.5, .38); parent.add(reel);
    addMesh(reel, reelGeometry, ivory);
    const hub = addMesh(reel, hubGeometry, coral); hub.rotation.x = Math.PI / 2;
    const spokes = new THREE.InstancedMesh(spokeGeometry, yellow, 3);
    for (let i = 0; i < 3; i++) spokes.setMatrixAt(i, new THREE.Matrix4().makeRotationZ(i * Math.PI / 3));
    spokes.castShadow = true; reel.add(spokes);
    animated.push(time => { reel.rotation.z = side * time * .18; });
  }

  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    a.block(ivory, -20 + Math.cos(angle) * 2.92, 3.35, -7 + Math.sin(angle) * 2.92, .33, 6.25, .5, -angle);
  }
  a.ring(ivory, -20, 6.45, -7, 2.94, .21, Math.PI / 2);
  a.ring(turquoise, -20, 6.73, -7, 2.72, .09, Math.PI / 2);
  a.arch(mint, -20, 3.5, -7, 5.2, .15, .22, .3, Math.PI / 2);
  leafPlant(a, -43.7, -9.2, 1.5, ivory);
  leafPlant(a, -44.7, -10.5, 2.3, coral);
}

function addVision(a: Architecture, parent: THREE.Object3D, animated: Animate[], patterns: Map<DistrictPattern, THREE.Material>) {
  patternedDisc(a, 2, -47, 6.92, 'vision', patterns);
  a.cylinder(ivory, 2, 4.97, -47, 5.6, .6);
  a.cylinder(mint, 2, 5.33, -47, 5.12, .2);
  const dome = a.geometry('observatory-dome', () => new THREE.SphereGeometry(1, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2));
  a.put(dome, mint, 2, 5.44, -47, 4.85, 4.85, 4.85);
  for (let i = 0; i < 5; i++) a.ring(porcelain, 2, 5.45, -47, 4.91, .08, 0, i * Math.PI / 5, Math.PI);
  a.ring(ivory, 2, 5.44, -47, 5.02, .18, Math.PI / 2);

  const telescope = new THREE.Group(); telescope.position.set(2, 7.88, -44.5); telescope.rotation.x = -.17; parent.add(telescope);
  const barrel = addMesh(telescope, new THREE.CylinderGeometry(1.3, 1.45, 4.25, 40), porcelain, 0, 0, 1.1); barrel.rotation.x = Math.PI / 2;
  const rim = addMesh(telescope, new THREE.TorusGeometry(1.34, .17, 10, 48), turquoise, 0, 0, 3.23);
  const lens = addMesh(telescope, new THREE.CircleGeometry(1.2, 48), deepTeal, 0, 0, 3.27);
  const iris = addMesh(telescope, new THREE.TorusGeometry(.67, .075, 8, 40), coolLight, 0, 0, 3.3);
  rim.castShadow = lens.castShadow = iris.castShadow = false;
  animated.push(time => { telescope.rotation.y = Math.sin(time * .18) * .16; });

  for (const z of [-33.5, -30]) {
    for (const side of [-1, 1]) {
      a.block(ivory, 1 + side * 5.05, 3.55, z, .65, 7.1, 1.02);
      a.block(turquoise, 1 + side * 5.05, 4, z + .56, .22, 4.6, .13);
      a.block(mint, 1 + side * 5.05, .5, z, 1.27, 1, 1.54);
    }
    a.block(porcelain, 1, 7.02, z, 10.72, .5, 1.02);
    a.block(turquoise, 1, 7.33, z, 5.2, .12, .8);
    a.block(mint, 1, .15, z, 9.7, .06, .38);
  }
  for (const x of [-4.4, 8.4]) {
    a.cylinder(porcelain, x, 2.5, -47, .68, 4.7);
    a.cylinder(turquoise, x, 4.92, -47, .8, .25);
    a.put(a.geometry('sensor-ball', () => new THREE.SphereGeometry(1, 24, 16)), mint, x, 5.67, -47, .78, .78, .78);
  }
}

function addArcade(a: Architecture, parent: THREE.Object3D, animated: Animate[], patterns: Map<DistrictPattern, THREE.Material>) {
  patternedDisc(a, 37, -19, 6.98, 'arcade', patterns);
  a.arch(plum, 39, .25, -24.15, 11.2, 3.12, .9, .55);
  a.arch(coral, 39, .25, -23.46, 10.5, 3.12, .7, .9);
  a.arch(rose, 39, .28, -22.89, 9.04, 3.12, .17, .13);
  for (const side of [-1, 1]) a.block(yellow, 39 + side * 4.94, .7, -23.48, 1.27, 1.4, 1.5);
  a.ring(yellow, 39, 4.28, -24, 3.21, .1);
  const prize = new THREE.Group(); prize.position.set(39, 4.28, -23.82); parent.add(prize);
  const gem = addMesh(prize, new THREE.IcosahedronGeometry(1.28, 0), porcelain);
  const halo = addMesh(prize, new THREE.TorusGeometry(2.1, .1, 8, 56), rose); halo.rotation.x = .9;
  animated.push(time => { prize.rotation.y = time * .26; prize.position.y = 4.28 + Math.sin(time * 1.2) * .24; gem.rotation.z = time * .15; halo.rotation.z = time * .2; });

  // Stadium seating occupies only the east half; the west approach remains open.
  for (let i = 0; i < 3; i++) {
    const inner = 7.5 + i * 1.12, outer = inner + 1.06;
    const shape = new THREE.Shape(); shape.absarc(0, 0, outer, -1.3, 1.3, false);
    shape.absarc(0, 0, inner, 1.3, -1.3, true); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: .44 + i * .32, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 2, curveSegments: 32 });
    geometry.rotateX(-Math.PI / 2);
    a.put(geometry, i === 1 ? rose : ivory, 37, .34 + i * .4, -19);
  }
  for (let i = 0; i < 7; i++) {
    const angle = -1.15 + i * 2.3 / 6, x = 37 + Math.cos(angle) * 11.3, z = -19 + Math.sin(angle) * 11.3;
    a.cylinder(coral, x, 1.68, z, .22, 3.36);
    a.put(a.geometry('festival-light', () => new THREE.SphereGeometry(1, 16, 12)), i % 2 ? yellow : ivory, x, 3.43, z, .45, .45, .45);
  }
  leafPlant(a, 48, -5.5, 2.4, rose);
}

function addArchive(a: Architecture, parent: THREE.Object3D, animated: Animate[], patterns: Map<DistrictPattern, THREE.Material>) {
  patternedDisc(a, 31, 19, 8.8, 'archive', patterns);
  const angle = Math.atan2(-5.2, -2.5);
  for (let i = 0; i < 4; i++) {
    const x = 46.75 - i * 2.5, z = 9.6 + i * 5.2;
    a.arch(terracotta, x, .28, z, 6.22, 3.22, .6, 1.12, angle, 1 + i * .08);
    a.arch(ivory, x - .5, .29, z - .24, 5.02, 3.22, .16, .17, angle, 1 + i * .08);
  }
  for (let i = 0; i < 5; i++) {
    const x = 48 - i * 2.5, z = 7 + i * 5.2;
    a.cylinder(ivory, x, .45, z, .94, .6);
    a.cylinder(terracotta, x, 3.2 + i * .2, z, .56, 5.5 + i * .4);
    a.cylinder(yellow, x, 6 + i * .4, z, .77, .26);
  }

  a.cylinder(ivory, 44, .45, 28.6, 2.7, .62);
  a.cylinder(terracotta, 44, 1.85, 28.6, 1.35, 2.3);
  const clock = new THREE.Group(); clock.position.set(44, 6.2, 28.6); clock.rotation.y = -Math.PI / 2; parent.add(clock);
  addMesh(clock, new THREE.TorusGeometry(3.18, .26, 12, 64), yellow);
  const faceMaterial = new THREE.MeshStandardMaterial({ color: 0xfff0d4, metalness: .05, roughness: .76, side: THREE.DoubleSide });
  addMesh(clock, new THREE.CircleGeometry(2.97, 64), faceMaterial);
  const tickGeometry = new RoundedBoxGeometry(.13, .44, .13, 2, .04);
  const ticks = new THREE.InstancedMesh(tickGeometry, terracotta, 12);
  for (let i = 0; i < 12; i++) {
    const theta = i * Math.PI / 6;
    ticks.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(Math.sin(theta) * 2.57, Math.cos(theta) * 2.57, .1), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -theta), new THREE.Vector3(1, 1, 1)));
  }
  clock.add(ticks);
  const hour = new THREE.Group(), minute = new THREE.Group(); hour.position.z = .23; minute.position.z = .3; clock.add(hour, minute);
  addMesh(hour, new RoundedBoxGeometry(.21, 1.7, .13, 2, .06), deepTeal, 0, .72, 0);
  addMesh(minute, new RoundedBoxGeometry(.11, 2.3, .1, 2, .04), coral, 0, .97, 0);
  const center = addMesh(clock, new THREE.SphereGeometry(.19, 16, 12), yellow, 0, 0, .39); center.scale.z = .45;
  animated.push(time => { hour.rotation.z = -.65 - time * .008; minute.rotation.z = 1.1 - time * .07; });
  leafPlant(a, 46, 21.5, 2.45, ivory);
}

function addLab(a: Architecture, parent: THREE.Object3D, animated: Animate[], patterns: Map<DistrictPattern, THREE.Material>) {
  patternedDisc(a, 2, 39, 7.67, 'lab', patterns);
  patternedDisc(a, 16, 45, 4.56, 'vision', patterns);
  // The roof is suspended high enough to retain the open drive-through laboratory.
  for (let i = 0; i < 3; i++) a.ring(ivory, 2, .44, 39, 7.82, .13, 0, i * Math.PI / 3, Math.PI);
  const panel = a.geometry('greenhouse-petal', () => new THREE.SphereGeometry(7.62, 24, 16, 0, Math.PI / 3, 0, 1.02));
  for (let i = 0; i < 3; i++) a.put(panel, greenhouseGlass, 2, .45, 39, 1, 1, 1, 0, i * Math.PI * 2 / 3, 0, false);
  a.ring(lilac, 2, 7.71, 39, 2.7, .13, Math.PI / 2);
  a.ring(yellow, 2, 8.07, 39, 1.27, .12, Math.PI / 2);

  const sculpture = new THREE.Group(); sculpture.position.set(2, 5.18, 39); parent.add(sculpture);
  const core = addMesh(sculpture, new THREE.IcosahedronGeometry(1.02, 1), lilac);
  const orbitGeometry = new THREE.TorusGeometry(1, .032, 8, 64);
  for (let i = 0; i < 3; i++) {
    const orbit = addMesh(sculpture, orbitGeometry, i === 1 ? yellow : porcelain);
    orbit.scale.setScalar(1.64 + i * .3); orbit.rotation.set(i * .85, i * .63, .2);
  }
  animated.push(time => { sculpture.rotation.y = time * .23; core.rotation.x = time * .19; sculpture.position.y = 5.18 + Math.sin(time * .9) * .12; });
  a.block(lilac, 2, 3.52, 45, 7.65, .48, 4.05);
  a.block(ivory, 2, 3.86, 45, 7.95, .18, 4.22);
  leafPlant(a, 7.75, 43.2, 2.1, lilac);
  leafPlant(a, -3.85, 44.8, 2.7, rose);
  leafPlant(a, 10.5, 40.5, 1.75, ivory);

  a.block(ivory, 16, 3.24, 45, 5.4, .28, 4.12);
  a.ring(ivory, 16, 5.15, 45, 3.05, .24);
  a.ring(turquoise, 16, 5.15, 45.2, 2.75, .09);
  for (const side of [-1, 1]) {
    a.block(mint, 16 + side * 3.34, 2.3, 45, .45, 4.5, .9);
    a.block(ivory, 16 + side * 3.34, .41, 45, 1.22, .82, 1.5);
  }
}

function addSignal(a: Architecture, parent: THREE.Object3D, animated: Animate[]) {
  // Tapered warm stripes turn the existing steel mast into an unmistakable lighthouse.
  for (let i = 0; i < 4; i++) {
    const bottom = 3.12 - i * .33, top = bottom - .33;
    const geometry = a.geometry(`lighthouse:${i}`, () => new THREE.CylinderGeometry(top, bottom, 4.52, 40));
    a.put(geometry, i % 2 ? yellow : ivory, -30, 2.62 + i * 4.5, 22);
  }
  a.cylinder(ivory, -30, 19.03, 22, 3.62, .52);
  a.cylinder(deepTeal, -30, 21, 22, 2.73, 3.38);
  a.cylinder(ivory, -30, 22.72, 22, 2.99, .25);
  const roof = a.geometry('lighthouse-roof', () => new THREE.ConeGeometry(3.75, 1.53, 48));
  a.put(roof, coral, -30, 23.62, 22);
  a.ring(ivory, -30, 19.49, 22, 3.56, .085, Math.PI / 2);
  a.ring(ivory, -30, 20.23, 22, 3.56, .085, Math.PI / 2);
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    a.cylinder(ivory, -30 + Math.cos(angle) * 3.55, 19.84, 22 + Math.sin(angle) * 3.55, .065, .83);
    a.block(porcelain, -30 + Math.cos(angle) * 2.74, 21, 22 + Math.sin(angle) * 2.74, .13, 3.14, .13);
  }
  a.ring(yellow, -30, 25.1, 22, 2.15, .11, Math.PI / 2);
  const beacon = new THREE.Group(); beacon.position.set(-30, 21.02, 22); parent.add(beacon);
  for (const side of [-1, 1]) {
    const light = addMesh(beacon, new THREE.CircleGeometry(.75, 24), warmLight, 0, 0, side * 2.79);
    if (side < 0) light.rotation.y = Math.PI;
  }
  animated.push(time => { beacon.rotation.y = time * .28; });
}

export function addDistrictDetail(parent: THREE.Object3D, animated: Animate[]) {
  const architecture = new Architecture();
  const patterns = new Map<DistrictPattern, THREE.Material>();
  addWelcome(architecture);
  addSoftware(architecture, parent, animated, patterns);
  addVision(architecture, parent, animated, patterns);
  addArcade(architecture, parent, animated, patterns);
  addArchive(architecture, parent, animated, patterns);
  addLab(architecture, parent, animated, patterns);
  addSignal(architecture, parent, animated);
  architecture.flush(parent);
}

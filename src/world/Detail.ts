import * as THREE from 'three';
import { box, cylinder, glow, label, mat } from './materials';

type Animate = (time: number, dt: number, player: THREE.Vector3) => void;

const metal = mat(0x526168, .72, .31);
const graphite = mat(0x17262d, .38, .74);
const ceramic = mat(0xd6c8a9, .16, .65);
const brass = mat(0xb99164, .74, .28);
const glass = new THREE.MeshStandardMaterial({ color: 0x659096, metalness: .52, roughness: .14, transparent: true, opacity: .78, side: THREE.DoubleSide });

function ring(parent: THREE.Object3D, x: number, y: number, z: number, radius: number, material: THREE.Material, rx = 0, ry = 0, thickness = .08) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 6, 64), material);
  mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, 0); parent.add(mesh); return mesh;
}

function rod(parent: THREE.Object3D, start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material, sides = 6) {
  const direction = end.clone().sub(start);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), sides), material);
  mesh.position.copy(start).addScaledVector(direction, .5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true; parent.add(mesh); return mesh;
}

function fin(parent: THREE.Object3D, points: [number, number][], depth: number, material: THREE.Material, x: number, z: number, rot = 0) {
  const shape = new THREE.Shape(); shape.moveTo(points[0][0], points[0][1]); points.slice(1).forEach(([px, py]) => shape.lineTo(px, py)); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 1, curveSegments: 1 });
  const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, 0, z); mesh.rotation.y = rot; mesh.castShadow = true; parent.add(mesh); return mesh;
}

function patternedDisc(parent: THREE.Object3D, x: number, z: number, r: number, variant: 'circuit' | 'vision' | 'arcade' | 'archive' | 'lab') {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const c = canvas.getContext('2d')!;
  const colors = { circuit: ['#1b3238', '#5bb5b3'], vision: ['#18342f', '#9de3c3'], arcade: ['#3c2c28', '#e9a474'], archive: ['#38352e', '#d1b982'], lab: ['#262b38', '#bba3dc'] } as const;
  c.fillStyle = colors[variant][0]; c.fillRect(0, 0, 512, 512);
  c.strokeStyle = colors[variant][1]; c.lineWidth = 2; c.globalAlpha = .5;
  if (variant === 'circuit') {
    for (let i = 0; i < 14; i++) { const p = 20 + i * 36; c.beginPath(); c.moveTo(0, p); c.lineTo(130 + (i % 4) * 45, p); c.lineTo(160 + (i % 4) * 45, p + 30); c.lineTo(512, p + 30); c.stroke(); c.beginPath(); c.arc(160 + (i % 4) * 45, p + 30, 4, 0, Math.PI * 2); c.fillStyle = colors[variant][1]; c.fill(); }
  } else if (variant === 'vision') {
    for (let i = 0; i <= 16; i++) { const p = i * 32; c.beginPath(); c.moveTo(p, 0); c.lineTo(p, 512); c.moveTo(0, p); c.lineTo(512, p); c.stroke(); }
    c.lineWidth = 5; c.strokeRect(110, 110, 292, 292); c.strokeRect(170, 170, 172, 172);
  } else if (variant === 'arcade') {
    c.lineWidth = 20; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(256, 256, 75 + i * 55, i * .33, Math.PI * 1.4 + i * .33); c.stroke(); }
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(256 + Math.cos(a) * 65, 256 + Math.sin(a) * 65); c.lineTo(256 + Math.cos(a) * 245, 256 + Math.sin(a) * 245); c.stroke(); }
  } else if (variant === 'archive') {
    for (let i = 0; i < 17; i++) { c.fillStyle = i % 4 ? '#a58d64' : '#ead2a3'; c.fillRect(i * 32, 0, i % 4 ? 2 : 6, 512); }
    c.lineWidth = 5; c.strokeRect(36, 36, 440, 440);
  } else {
    for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(256, 256, 30 + i * 28, 0, Math.PI * 2); c.stroke(); }
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(256, 256); c.lineTo(256 + Math.cos(a) * 256, 256 + Math.sin(a) * 256); c.stroke(); }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  const disk = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshStandardMaterial({ map: texture, roughness: .72, metalness: .25, transparent: true, opacity: .88, side: THREE.DoubleSide, depthWrite: false }));
  disk.rotation.x = -Math.PI / 2; disk.position.set(x, .326, z); parent.add(disk);
}

function terminal(parent: THREE.Object3D, x: number, z: number, color: number, height = 2.2) {
  const light = glow(color, 1.2);
  cylinder(parent, x, height / 2, z, .36, .6, height, graphite, 6);
  box(parent, x, height + .18, z, 1.55, .87, .18, metal);
  box(parent, x, height + .2, z + .12, 1.31, .62, .04, light);
  box(parent, x, .08, z, 1.4, .16, 1.2, metal);
}

export function addDistrictDetail(parent: THREE.Object3D, animated: Animate[]) {
  // Software District: each building reads as a different kind of machine.
  for (const [x, z, radius] of [[-40, -17, 4.05], [-31, -29, 4.05], [-17, -22, 4.05], [-39, -2, 4.05], [-20, -7, 4.05]]) patternedDisc(parent, x, z, radius, 'circuit');
  const cyan = glow(0x81d6c5, 1.4), warm = glow(0xe9ba7d, 1.25);
  for (const side of [-1, 1]) {
    rod(parent, new THREE.Vector3(-40 + side * 3.4, .35, -14), new THREE.Vector3(-40 + side * 3.4, 5.6, -14), .18, metal);
    rod(parent, new THREE.Vector3(-40 + side * 3.4, 5.6, -14), new THREE.Vector3(-40 + side * 2.8, 6.25, -14), .18, metal);
    ring(parent, -40 + side * 2.2, 3.2, -13.4, .7, cyan, Math.PI / 2);
  }
  rod(parent, new THREE.Vector3(-43, 6.25, -14), new THREE.Vector3(-37, 6.25, -14), .18, metal);
  for (let i = 0; i < 5; i++) box(parent, -42.5 + i * 1.25, 4.08, -13.05, .7, .15, .12, i % 2 ? cyan : warm);
  for (let i = 0; i < 3; i++) { cylinder(parent, -42 + i * 1.8, 4.25, -17, .45, .55, .6, metal, 10); ring(parent, -42 + i * 1.8, 4.64, -17, .36, cyan, Math.PI / 2); }

  for (const radius of [2.65, 3.08]) ring(parent, -31, 4.15, -29, radius, radius === 2.65 ? cyan : metal, Math.PI / 2, 0, .11);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const x = -31 + Math.cos(a) * 3.6, z = -29 + Math.sin(a) * 3.6; rod(parent, new THREE.Vector3(x, .35, z), new THREE.Vector3(x * .22 - 31 * .78, 5.2, z * .22 - 29 * .78), .07, i % 2 ? metal : cyan, 5); }
  const radar = new THREE.Group(); radar.position.set(-31, 8.1, -29); parent.add(radar);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.9, 20, 6, 0, Math.PI * 2, 0, Math.PI * .42), metal); dish.rotation.x = Math.PI; radar.add(dish);
  ring(radar, 0, .1, 0, 1.64, cyan, Math.PI / 2, 0, .08);
  rod(radar, new THREE.Vector3(0, .1, 0), new THREE.Vector3(0, 1.65, 0), .09, brass);
  animated.push((time) => { radar.rotation.y = time * .32; });

  for (let i = -2; i <= 2; i++) {
    box(parent, -17 + i * 1.04, 2.7, -19.7, .63, 2.7 + Math.abs(i) * .25, .18, i % 2 ? warm : cyan);
    box(parent, -17 + i * 1.04, 5.05, -22, .35, .7, 5.1, ceramic);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(3.1, .21, 8, 40, Math.PI), brass); arch.position.set(-17, 4.85, -22); parent.add(arch);
  for (const x of [-19.5, -14.5]) { rod(parent, new THREE.Vector3(x, .3, -22), new THREE.Vector3(x, 4.85, -22), .13, brass); }

  for (const side of [-1, 1]) {
    const reel = new THREE.Group(); reel.position.set(-39 + side * 1.5, 4.55, .5); parent.add(reel);
    ring(reel, 0, 0, 0, 1.05, warm, 0, 0, .15);
    ring(reel, 0, 0, 0, .37, brass, 0, 0, .12);
    for (let j = 0; j < 5; j++) { const a = j * Math.PI * 2 / 5; rod(reel, new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(a) * .94, Math.sin(a) * .94, 0), .08, brass); }
    animated.push((time) => { reel.rotation.z = (side === 1 ? 1 : -1) * time * .16; });
  }
  box(parent, -39, 6.05, -2, 6.8, .25, 5.1, graphite);
  for (let i = 0; i < 7; i++) box(parent, -41.8 + i * .9, 3.75, .49, .43, .14, .12, i % 3 ? warm : cyan);

  // Vision Lab: layered machine vision apertures and translucent detection planes.
  patternedDisc(parent, 2, -47, 6.9, 'vision');
  const mint = glow(0x8be3ca, 1.65);
  for (const depth of [-33, -39]) {
    for (const side of [-1, 1]) {
      rod(parent, new THREE.Vector3(side * 4.5, .35, depth), new THREE.Vector3(side * 4.5, 6.4, depth), .13, metal);
      box(parent, side * 4.5, 5.3, depth + .22, .19, 2.15, .11, mint);
    }
    rod(parent, new THREE.Vector3(-4.5, 6.4, depth), new THREE.Vector3(4.5, 6.4, depth), .13, metal);
  }
  for (let i = 0; i < 3; i++) {
    const target = ring(parent, 2, 3.15, -46.4 - i * 1.4, 2.1 + i * .36, i === 1 ? mint : metal, 0, 0, .09);
    animated.push((time) => { target.rotation.z = Math.sin(time * .35 + i) * .1; });
  }
  for (const x of [-4, 8]) { cylinder(parent, x, 3.2, -47, 1.15, 1.25, 6.2, graphite, 10); ring(parent, x, 6.45, -47, .83, mint, Math.PI / 2); cylinder(parent, x, 6.8, -47, .38, .38, .42, glass, 12); }
  terminal(parent, 10, -42, 0x7bdcc2, 2.4);
  label(parent, 'SCAN / DETECT / DECODE', 2, 8.2, -48, 10.2, .86, { bg: '#173331', color: '#c8ffe7', size: 68 });

  // Arcade: a physical arena, bright hazard inlays and triangular score pylons.
  patternedDisc(parent, 37, -19, 6.95, 'arcade');
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, x = 37 + Math.cos(a) * 9.2, z = -19 + Math.sin(a) * 9.2;
    fin(parent, [[-.5, 0], [.5, 0], [.23, 5], [0, 6.4], [-.23, 5]], .6, i % 2 ? brass : ceramic, x, z, -a);
    box(parent, x, 4.7, z + .38, .2, 1.1, .08, warm, -a);
  }
  const arcadeCrown = new THREE.Group(); arcadeCrown.position.set(37, 6.3, -19); parent.add(arcadeCrown);
  ring(arcadeCrown, 0, 0, 0, 2.5, warm, Math.PI / 2, 0, .18);
  ring(arcadeCrown, 0, 0, 0, 1.2, brass, Math.PI / 2, 0, .1);
  const crystal = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 0), warm); arcadeCrown.add(crystal);
  animated.push((time) => { arcadeCrown.rotation.y = time * .35; crystal.rotation.x = time * .5; });

  // Archive: a processional route of dates with stone leaves and brass rails.
  patternedDisc(parent, 31, 19, 8.8, 'archive');
  for (let i = 0; i < 5; i++) {
    const x = 42 - i * 2.5, z = 7 + i * 5.2, h = 3.7 + i * .65;
    fin(parent, [[-.55, 0], [.55, 0], [.4, h], [0, h + .55], [-.4, h]], .42, ceramic, x + 2.2, z - .3);
    box(parent, x + 2.2, h - .35, z + .17, .18, .85, .06, warm);
    rod(parent, new THREE.Vector3(x + 1.4, .45, z + 1.5), new THREE.Vector3(x + 1.4, 1.2, z + 1.5), .1, brass);
  }
  for (let i = 0; i < 4; i++) rod(parent, new THREE.Vector3(43 - i * 2.5, 1.2, 8.5 + i * 5.2), new THREE.Vector3(43 - (i + 1) * 2.5, 1.2, 8.5 + (i + 1) * 5.2), .06, brass);

  // The Lab: a ribbed geodesic canopy and self-contained specimen pods.
  patternedDisc(parent, 2, 39, 7.65, 'lab');
  patternedDisc(parent, 16, 45, 4.55, 'vision');
  const violet = glow(0xc6a7df, 1.15);
  const dome = new THREE.Mesh(new THREE.IcosahedronGeometry(7.4, 1), new THREE.MeshBasicMaterial({ color: 0x9e91c4, wireframe: true, transparent: true, opacity: .48, depthWrite: false }));
  dome.position.set(2, 1.3, 39); dome.scale.y = .7; parent.add(dome);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const x = 2 + Math.cos(a) * 7.25, z = 39 + Math.sin(a) * 7.25; cylinder(parent, x, 2.3, z, .16, .23, 4.3, metal, 6); cylinder(parent, x, 4.5, z, .3, .3, .22, violet, 8); }
  const labCore = new THREE.Group(); labCore.position.set(2, 5.45, 39); parent.add(labCore);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.1), glass); labCore.add(core);
  for (let i = 0; i < 3; i++) ring(labCore, 0, 0, 0, 1.65 + i * .3, violet, i * .85, i * .6, .045);
  animated.push((time) => { labCore.rotation.y = time * .18; core.rotation.x = time * .25; });
  terminal(parent, -4.5, 42.8, 0xb49bce, 2.15);

  // Signal Tower: truss bracing, orbiting collars and a visible beacon crown.
  for (const h of [3.4, 7.8, 12.3, 16.8]) {
    const r = 3.9 - h * .13;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const b = a + Math.PI / 2; rod(parent, new THREE.Vector3(-30 + Math.cos(a) * r, h, 22 + Math.sin(a) * r), new THREE.Vector3(-30 + Math.cos(b) * (r - .55), h + 3.2, 22 + Math.sin(b) * (r - .55)), .08, i % 2 ? brass : metal); }
  }
  for (const [h, r] of [[10.2, 3.25], [15.2, 2.5], [21.3, 1.75]]) {
    const collar = ring(parent, -30, h, 22, r, h > 20 ? warm : brass, Math.PI / 2, 0, .15);
    animated.push((time) => { collar.rotation.z = time * .08; });
  }
  const halo = ring(parent, -30, 25.1, 22, 3.5, warm, Math.PI / 2, 0, .12);
  animated.push((time) => { halo.rotation.y = time * .28; });
  for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7; const x = -30 + Math.cos(a) * 7.6, z = 22 + Math.sin(a) * 7.6; cylinder(parent, x, 1.5, z, .2, .33, 3, graphite, 8); cylinder(parent, x, 3.12, z, .39, .39, .22, warm, 8); }

  // Sparse pools of light give each district its own nighttime color without filling the world with neon.
  for (const [x, z, color, power] of [[-31, -20, 0x74d9cd, 30], [-20, -7, 0x83e9b2, 25], [2, -44, 0x9de8c9, 32], [37, -19, 0xe6a16a, 38], [30, 19, 0xe0c493, 28], [2, 39, 0xb8a4da, 30], [16, 45, 0x99f3d0, 24], [-30, 22, 0xf3bd78, 48]] as const) {
    const light = new THREE.PointLight(color, power, 19, 2); light.position.set(x, 6.5, z); parent.add(light);
  }
}

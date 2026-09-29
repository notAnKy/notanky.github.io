import * as THREE from 'three';
import { districts, landmarks, timeline, experiments } from '../data/content';
import { box, cylinder, glow, label, mat, palette } from './materials';
import { addDistrictDetail } from './Detail';
import { addEnvironment } from './Environment';
import { addProjectDisplays } from './ProjectDisplays';

export type WorldObject = { x: number; z: number; radius: number };
export type Animated = (time: number, dt: number, player: THREE.Vector3) => void;

export class World {
  group = new THREE.Group();
  collisions: WorldObject[] = [];
  animated: Animated[] = [];
  tokens: { mesh: THREE.Group; x: number; z: number; id: number }[] = [];
  scanner = { x: 1, z: -35, radius: 3.2 };
  private metal = mat(palette.metal, .58, .5);
  private dark = mat(palette.dark, .2, .9);
  private amber = glow(palette.amber, 1.2);
  private teal = glow(palette.teal, 1.2);

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.ground(); addEnvironment(this.group, this.animated); this.roads(); this.gate(); this.software(); this.vision(); this.arcade(); this.archive(); this.lab(); this.tower(); addDistrictDetail(this.group, this.animated); addProjectDisplays(this.group); this.details(); this.collectibles();
  }

  private ground() {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(270, 40, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vDirection; void main(){ vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vDirection; void main(){ vec3 n = normalize(vDirection); float h = n.y; vec3 zenith = vec3(0.045, 0.072, 0.19); vec3 horizon = vec3(0.21, 0.39, 0.45); vec3 dusk = vec3(0.78, 0.37, 0.26); float glow = pow(max(dot(n, normalize(vec3(-.72, .20, -.52))), 0.0), 5.0); float band = exp(-pow((h + .02) * 7.0, 2.0)); vec3 color = mix(horizon, zenith, smoothstep(-.08, .72, h)); color = mix(color, dusk, glow * band * .65); gl_FragColor = vec4(color, 1.0); }',
    }));
    sky.renderOrder = -10; this.group.add(sky);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x176077, metalness: .38, roughness: .28 }));
    water.rotation.x = -Math.PI / 2; water.position.y = -1.15; this.group.add(water);
    const terrain = new THREE.Mesh(new THREE.CylinderGeometry(72, 76, 2.1, 20), mat(palette.ground, .05, 1));
    terrain.position.y = -1.08; terrain.rotation.y = .14; terrain.receiveShadow = true; this.group.add(terrain);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(71.3, .2, 5, 100), glow(0x49666b, .3));
    rim.rotation.x = Math.PI / 2; rim.position.y = .1; this.group.add(rim);
    for (const r of [74.5, 78.5, 83]) { const wake = new THREE.Mesh(new THREE.TorusGeometry(r, .045, 3, 128), new THREE.MeshBasicMaterial({ color: 0x638a91, transparent: true, opacity: r === 74.5 ? .34 : .14 })); wake.rotation.x = Math.PI / 2; wake.position.y = -1.06; this.group.add(wake); }
    const rng = seeded(17);
    for (let i = 0; i < 32; i++) {
      const a = i / 32 * Math.PI * 2;
      const r = 84 + rng() * 18;
      const h = 7 + rng() * 18;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(7 + rng() * 7, h, 4), mat(i % 3 ? 0x182932 : 0x20333a));
      peak.position.set(Math.cos(a) * r, h / 2 - 1.6, Math.sin(a) * r); peak.rotation.y = a; this.group.add(peak);
    }
    const stars = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i++) { const a = rng() * 6.283, h = 20 + rng() * 100, r = 80 + rng() * 180; stars.set([Math.cos(a) * r, h, Math.sin(a) * r], i * 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(stars, 3));
    this.group.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xb4d1d1, size: .42, sizeAttenuation: true })));
  }

  private road(points: [number, number][], width = 7.2, closed = false) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, .08, z)), closed, 'centripetal');
    const count = points.length * 18;
    const verts: number[] = [], indices: number[] = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count; const p = curve.getPoint(t); const tangent = curve.getTangent(t); const n = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      verts.push(p.x - n.x * width / 2, p.y, p.z - n.z * width / 2, p.x + n.x * width / 2, p.y, p.z + n.z * width / 2);
      if (i < count) { const v = i * 2; indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); geo.setIndex(indices); geo.computeVertexNormals();
    const roadSurface = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: palette.road, metalness: .12, roughness: .9, side: THREE.DoubleSide })); roadSurface.receiveShadow = true; this.group.add(roadSurface);
    const stripeMatrices: THREE.Matrix4[] = [], edgeMatrices: THREE.Matrix4[] = [], litEdgeMatrices: THREE.Matrix4[] = [], litColors: THREE.Color[] = [];
    const matrix = (x: number, y: number, z: number, w: number, h: number, d: number, angle: number) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle), new THREE.Vector3(w, h, d));
    for (let i = 0; i < count; i += 5) {
      const t = i / count; const p = curve.getPoint(t); const tan = curve.getTangent(t); const angle = Math.atan2(tan.x, tan.z);
      stripeMatrices.push(matrix(p.x, .115, p.z, .13, .025, 1.4, angle));
    }
    for (let i = 0; i < count; i += 3) {
      const p = curve.getPoint(i / count), tangent = curve.getTangent(i / count), n = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      for (const side of [-1, 1]) {
        const marker = matrix(p.x + n.x * side * (width / 2 + .15), .17, p.z + n.z * side * (width / 2 + .15), .16, .16, 1.45, Math.atan2(tangent.x, tangent.z));
        if (i % 9 === 0) {
          litEdgeMatrices.push(marker);
          let nearest = districts[0], best = Infinity;
          for (const district of districts) { const d = Math.hypot(p.x - district.x, p.z - district.z); if (d < best) { best = d; nearest = district; } }
          litColors.push(new THREE.Color(nearest.color));
        } else edgeMatrices.push(marker);
      }
    }
    const addInstances = (matrices: THREE.Matrix4[], material: THREE.Material, instanceColors?: THREE.Color[]) => { if (!matrices.length) return; const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, matrices.length); matrices.forEach((m, i) => { mesh.setMatrixAt(i, m); if (instanceColors) mesh.setColorAt(i, instanceColors[i]); }); mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; this.group.add(mesh); };
    addInstances(stripeMatrices, glow(0xa8c2b9, .55));
    addInstances(edgeMatrices, mat(palette.roadEdge));
    addInstances(litEdgeMatrices, new THREE.MeshBasicMaterial({ color: 0xffffff }), litColors);
  }

  private roads() {
    this.road([[0, 15], [-13, 10], [-28, -3], [-33, -13], [-23, -31], [0, -39], [24, -31], [33, -13], [35, 3], [29, 18], [15, 31], [0, 37], [-18, 32], [-30, 19], [-20, 10]], 7.2, true);
    this.road([[0, 15], [0, 0], [-2, -18], [0, -39]], 5.8);
    this.road([[0, 15], [16, 14], [29, 18]], 5.5);
    this.road([[-30, 19], [-14, 20], [0, 37]], 5.5);
  }

  private platform(x: number, z: number, r: number, accent = this.amber) {
    cylinder(this.group, x, .14, z, r, r + .55, .28, this.metal, 12);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r - .45, .09, 3, 48), accent); ring.rotation.x = Math.PI / 2; ring.position.set(x, .31, z); this.group.add(ring);
  }

  private beacon(x: number, z: number, color = this.amber, height = 3.4) {
    cylinder(this.group, x, height / 2, z, .11, .18, height, this.metal, 6);
    cylinder(this.group, x, height + .12, z, .28, .28, .24, color, 6);
  }

  private gate() {
    for (const x of [-5.7, 5.7]) { box(this.group, x, 3.4, 4, 1.35, 6.8, 1.5, this.metal); box(this.group, x, 3.2, 4.9, .15, 5.6, .1, this.amber); }
    box(this.group, 0, 6.9, 4, 12.7, 1, 1.8, this.metal);
    label(this.group, 'BUILD WORLD // ONLINE', 0, 7.02, 5.03, 10.5, .85, { bg: '#26353b', color: '#f3d8a1', size: 72, backZ: 2.97 });
    box(this.group, 15, 2.25, 0, 16, 4.5, .5, this.dark);
    label(this.group, 'MOHAMED\nALI JEMMALI', 15, 2.55, .29, 15.3, 4.7, { size: 132, bg: '#101e25', backZ: -.29 });
    label(this.group, 'SOFTWARE ENGINEERING  /  FULL-STACK  /  AI + VISION  /  GAMES', 15, .65, -3.2, 14.8, .9, { size: 55, bg: '#263038', color: '#eac58c' });
    this.collisions.push({ x: 15, z: 0, radius: 7 });
    this.platform(0, 13, 5, this.amber);
  }

  private software() {
    const stations = [
      { x: -40, z: -17, name: 'HARDWAREPROBE', kind: 0 },
      { x: -31, z: -29, name: 'FNHUB', kind: 1 },
      { x: -17, z: -22, name: 'GAME LIBRARY', kind: 2 },
      { x: -39, z: -2, name: 'CLIP', kind: 3 },
      { x: -20, z: -7, name: 'NOVA', kind: 4 },
    ];
    for (const s of stations) {
      this.platform(s.x, s.z, 4.1, this.teal);
      if (s.kind === 0) {
        box(this.group, s.x, 2, s.z, 6, 3.7, 5.8, this.metal); box(this.group, s.x, 3.5, s.z + 3.06, 5.2, .25, .15, this.teal);
        for (let i = -1; i <= 1; i++) box(this.group, s.x + i * 1.35, 1.7, s.z + 2.94, .85, 1.5, .1, i === 0 ? this.amber : this.dark);
      } else if (s.kind === 1) {
        cylinder(this.group, s.x, 2, s.z, 3.1, 3.5, 3.8, this.metal, 10);
        cylinder(this.group, s.x, 5.2, s.z, .14, .14, 3.1, this.metal);
        const dish = new THREE.Mesh(new THREE.ConeGeometry(1.8, .7, 12, 1, true), this.teal); dish.rotation.x = Math.PI; dish.position.set(s.x, 6.6, s.z); this.group.add(dish);
        this.animated.push((t) => { dish.rotation.y = t * .4; });
      } else if (s.kind === 2) {
        for (let i = -2; i <= 2; i++) box(this.group, s.x + i * 1.05, 1.9 + Math.abs(i) * .2, s.z, .74, 3.8 + Math.abs(i) * .4, 4.3, i % 2 ? this.metal : mat(0x44565a));
        box(this.group, s.x, 4.4, s.z, 6, .33, 5, this.teal);
      } else if (s.kind === 3) {
        box(this.group, s.x, 1.9, s.z, 5.7, 3.5, 4.5, this.metal);
        box(this.group, s.x, 2.2, s.z + 2.32, 4.1, 2.1, .14, glow(0x468a8e, .65));
        for (let i = 0; i < 4; i++) box(this.group, s.x - 1.6 + i * 1.05, 1.7, s.z + 2.41, .74, 1.1, .08, i % 2 ? this.amber : this.dark);
      } else {
        const nova = glow(0x7be6ad, 1.3);
        cylinder(this.group, s.x, 2.05, s.z, 2.05, 2.55, 3.8, this.metal, 8);
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2, px = s.x + Math.cos(a) * 2.4, pz = s.z + Math.sin(a) * 2.4;
          cylinder(this.group, px, 2.35, pz, .35, .48, 4.6, this.metal, 6);
          cylinder(this.group, px, 4.8, pz, .5, .5, .24, nova, 8);
        }
        for (const h of [3.8, 5.2]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(2.5 - (h - 3.8) * .33, .11, 6, 48), nova); ring.rotation.x = Math.PI / 2; ring.position.set(s.x, h, s.z); this.group.add(ring); }
        const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.8, 1), nova); core.position.set(s.x, 5.5, s.z); this.group.add(core);
        this.animated.push(t => { core.rotation.y = t * .42; core.position.y = 5.5 + Math.sin(t * 1.2) * .18; });
      }
      label(this.group, s.name, s.x, 4.75, s.z + 4, 6.7, 1.1, { size: 85, bg: '#132c32', color: '#a7e5df' });
      this.collisions.push({ x: s.x, z: s.z, radius: 2.7 });
    }
    label(this.group, '02 / SOFTWARE DISTRICT', -26, 5.2, -5, 11, 1.2, { bg: '#1e3439', color: '#b5e0da' });
  }

  private vision() {
    const x = 1, z = -36;
    for (const side of [-1, 1]) { box(this.group, x + side * 4.2, 3.1, z, .75, 6, .8, this.metal); box(this.group, x + side * 4.2, 3.1, z + .48, .16, 5.4, .1, this.teal); }
    box(this.group, x, 6, z, 9.1, .5, 1.2, this.metal);
    const beam = box(this.group, x, 3, z, .16, 5.2, 5.1, new THREE.MeshBasicMaterial({ color: 0x77d5c8, transparent: true, opacity: .12, depthWrite: false, side: THREE.DoubleSide }));
    this.animated.push((t) => { beam.position.x = x + Math.sin(t * 1.6) * 2.7; });
    const lab = new THREE.Group(); lab.position.set(2, 0, -47); this.group.add(lab); this.platform(2, -47, 7, this.teal);
    for (const a of [-2, -1, 0, 1, 2]) {
      const h = 3 + (2 - Math.abs(a)) * .75;
      box(lab, a * 2.2, h / 2, 0, 1.4, h, 5, this.metal);
      box(lab, a * 2.2, h - .4, 2.57, 1.1, .15, .12, this.teal);
    }
    label(this.group, 'VISION LAB  /  93.3% EXACT MATCH', 2, 6, -43.5, 13, 1.15, { bg: '#183137', color: '#a9e6d7', size: 74 });
    for (let i = 0; i < 3; i++) {
      const frame = new THREE.Group(); frame.position.set(-8 + i * 7, 2.5, -52); this.group.add(frame);
      box(frame, -1.7, 0, 0, .09, 2.4, .09, this.teal); box(frame, 1.7, 0, 0, .09, 2.4, .09, this.teal); box(frame, 0, 1.2, 0, 3.45, .09, .09, this.teal); box(frame, 0, -1.2, 0, 3.45, .09, .09, this.teal);
    }
    this.collisions.push({ x: 2, z: -47, radius: 4.6 });
  }

  private arcade() {
    this.platform(37, -19, 7.1, this.amber);
    const arena = new THREE.Group(); arena.position.set(37, 0, -19); this.group.add(arena);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      const x = Math.cos(a) * 6.7, z = Math.sin(a) * 6.7;
      box(arena, x, 1.2, z, .55, 2.2, 1.3, i % 2 ? this.metal : this.amber, -a);
    }
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.OctahedronGeometry(.55), this.amber); p.position.set(35 + i * 2.2, 1.7, -19 + Math.sin(i * 2) * 1.4); this.group.add(p);
      this.animated.push((t) => { p.rotation.y = t * 1.2 + i; p.position.y = 1.7 + Math.sin(t * 2 + i) * .28; });
    }
    box(this.group, 42, 3.25, -18, 5.2, 5.8, 2.1, this.metal);
    label(this.group, 'RIFTBOUND\nSURVIVORS', 42, 4.5, -16.87, 5.1, 2.9, { bg: '#362b29', color: '#f2bc88', size: 100, backZ: -19.13 });
    label(this.group, '04 / ARCADE  •  PLAY IS PART OF THE WORK', 29, 5.5, -7, 14, 1.1, { bg: '#322d2a', color: '#efc294', size: 66 });
    this.collisions.push({ x: 42, z: -18, radius: 2.8 });
  }

  private archive() {
    const points: [number, number][] = [[37, 7], [38, 13], [37, 20], [35, 27], [28, 30]];
    this.road(points, 4.4);
    timeline.forEach((event, i) => {
      const x = 42 - i * 2.5, z = 7 + i * 5.2;
      const height = 2.7 + i * .65;
      box(this.group, x, height / 2, z, 2.25, height, .5, this.metal);
      label(this.group, event.year, x, height - .5, z + .3, 2.15, .7, { bg: '#303734', color: '#f2d6a9', size: 64, backZ: z - .3 });
      label(this.group, event.title, x, height - 1.4, z + .31, 2.15, .7, { bg: '#283431', color: '#e9e8d6', size: 55, backZ: z - .31 });
      this.beacon(x - 1.65, z, this.amber, height);
    });
    label(this.group, '05 / ARCHIVE  •  DRIVE THROUGH TIME', 27, 5.5, 23, 12, 1.1, { bg: '#343530', color: '#e5d7b8', size: 67 });
  }

  private lab() {
    this.platform(2, 39, 7.8, glow(0xaba0d1, 1));
    box(this.group, 2, 1.6, 45, 7, 3.2, 3.5, this.metal);
    box(this.group, 2, 2.1, 43.18, 4.2, 2, .12, glow(0x676078, .55));
    label(this.group, '> OPEN TERMINAL_', 2, 2.1, 43.28, 4.1, 1.85, { bg: '#161a26', color: '#e3cbfa', size: 80, backZ: 46.78 });
    experiments.forEach((name, i) => {
      const a = i / experiments.length * Math.PI * 2, r = 13 + (i % 3) * 1.6;
      const x = Math.sin(a) * r, z = 38 + Math.cos(a) * r;
      const h = 1.4 + (i % 3) * .5;
      cylinder(this.group, x, h / 2, z, .7, 1, h, this.metal, 6);
      cylinder(this.group, x, h + .14, z, .49, .49, .23, glow(0x9b8db8, .7), 6);
      if (i < 5) label(this.group, name.toUpperCase(), x, h + 1, z, 4.2, .65, { bg: '#292b38', color: '#dfd4ec', size: 75 });
    });
    const analyzer = glow(0x9ef1ca, 1.45);
    this.platform(16, 45, 4.8, analyzer);
    box(this.group, 16, 1.55, 45, 4.7, 2.8, 3.5, this.metal);
    box(this.group, 16, 2.02, 46.83, 4.2, 1.65, .12, glow(0x286b66, .7));
    for (let i = 0; i < 5; i++) box(this.group, 14.5 + i * .75, 2, 46.93, .35, .35 + i % 3 * .32, .1, analyzer);
    const analyzerRing = new THREE.Mesh(new THREE.TorusGeometry(2.3, .13, 6, 48), analyzer);
    analyzerRing.position.set(16, 5.15, 45); this.group.add(analyzerRing);
    this.animated.push(t => { analyzerRing.rotation.z = Math.sin(t * .55) * .12; });
    label(this.group, 'IS IT VIBE CODED?', 16, 4.65, 48.7, 8.1, 1.04, { bg: '#173534', color: '#b5ffe1', size: 78 });
    label(this.group, '06 / THE LAB  •  IDEAS IN MOTION', 0, 5.2, 31, 11, 1.1, { bg: '#292b38', color: '#d5cbe9', size: 70 });
    this.collisions.push({ x: 2, z: 45, radius: 3.2 });
    this.collisions.push({ x: 16, z: 45, radius: 2.8 });
  }

  private tower() {
    this.platform(-30, 22, 8.5, this.amber);
    const tower = new THREE.Group(); tower.position.set(-30, 0, 22); this.group.add(tower);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2;
      const footX = Math.cos(a) * 3.6, footZ = Math.sin(a) * 3.6;
      const leg = box(tower, footX / 2, 9, footZ / 2, .38, 19, .38, this.metal); leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-footX, 20, -footZ).normalize());
      this.beacon(-30 + footX, 22 + footZ, this.amber, 1.8);
    }
    for (const h of [5, 10, 15]) { cylinder(tower, 0, h, 0, 3.2 - h * .12, 3.2 - h * .12, .4, this.metal, 8); cylinder(tower, 0, h + .25, 0, 2.5 - h * .1, 2.5 - h * .1, .08, this.amber, 8); }
    cylinder(tower, 0, 20.5, 0, .35, .65, 7, this.metal, 6);
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(1.25), this.amber); beacon.position.y = 25; tower.add(beacon);
    const signal = new THREE.Mesh(new THREE.ConeGeometry(18, 75, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xf5bd76, transparent: true, opacity: .027, depthWrite: false, side: THREE.DoubleSide })); signal.position.y = 61; tower.add(signal);
    this.animated.push((t) => { beacon.rotation.y = t * .55; signal.rotation.y = t * .2; });
    label(this.group, '07 / SIGNAL TOWER', -30, 5.2, 30.8, 9, 1.2, { bg: '#3b3029', color: '#f2d09d', size: 85 });
    this.collisions.push({ x: -30, z: 22, radius: 3.1 });
  }

  private details() {
    const rng = seeded(31);
    for (let i = 0; i < 90; i++) {
      const a = rng() * Math.PI * 2, r = 38 + rng() * 31, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x, z) > 68) continue;
      const h = .4 + rng() * 2.3;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.8 + rng() * 1.4, 0), mat(i % 4 ? 0x28393d : 0x334447));
      rock.position.set(x, h * .28, z); rock.scale.y = h / 2; rock.rotation.y = rng() * 6; this.group.add(rock);
    }
    for (const d of districts) { this.beacon(d.x + 5, d.z + 5, glow(d.color, 1.5), 2.7); }
    label(this.group, 'SHIP IT', 15, 1.25, 53, 4.2, 1.4, { bg: '#2d362f', color: '#f4d9a9' });
  }

  private collectibles() {
    const positions: [number, number][] = [[-13, 7], [-24, -34], [24, -32], [37, 26], [-14, 34]];
    positions.forEach(([x, z], id) => {
      const group = new THREE.Group(); group.position.set(x, 1.35, z); this.group.add(group);
      const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(.58), this.amber); group.add(diamond);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.9, .07, 4, 24), this.amber); ring.rotation.x = Math.PI / 2; group.add(ring);
      this.tokens.push({ mesh: group, x, z, id });
      this.animated.push((t) => { group.rotation.y = t * .8 + id; group.position.y = 1.35 + Math.sin(t * 2 + id) * .24; });
    });
  }

  update(time: number, dt: number, player: THREE.Vector3) { for (const fn of this.animated) fn(time, dt, player); }
  nearestDistrict(x: number, z: number) { return [...districts].sort((a, b) => Math.hypot(x - a.x, z - a.z) - Math.hypot(x - b.x, z - b.z))[0]; }
  nearestLandmark(x: number, z: number) { return landmarks.map(l => ({ landmark: l, distance: Math.hypot(x - l.x, z - l.z) })).sort((a, b) => a.distance - b.distance)[0]; }
}

function seeded(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

import * as THREE from 'three';
import { districts } from '../data/content';

type Animate = (time: number, dt: number, player: THREE.Vector3) => void;

function terrainTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#21363c'; ctx.fillRect(0, 0, 1024, 1024);
  let seed = 28751;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 11500; i++) {
    const x = random() * 1024, y = random() * 1024, size = .5 + random() * 2.4;
    ctx.fillStyle = random() > .48 ? 'rgba(166,202,193,.075)' : 'rgba(0,10,18,.12)';
    ctx.fillRect(x, y, size, size);
  }
  ctx.strokeStyle = 'rgba(171,208,198,.055)'; ctx.lineWidth = 1;
  for (let i = 0; i < 25; i++) {
    const y = i * 43 + random() * 25;
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 64) ctx.lineTo(x, y + Math.sin(x * .014 + i) * (3 + random() * 5));
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  return texture;
}

export function addEnvironment(parent: THREE.Object3D, animated: Animate[]) {
  const ground = new THREE.Mesh(new THREE.CircleGeometry(71, 128), new THREE.MeshStandardMaterial({ map: terrainTexture(), roughness: .93, metalness: .08, side: THREE.DoubleSide }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.018; ground.receiveShadow = true; parent.add(ground);

  const fieldGeometry = new THREE.CircleGeometry(23, 64);
  for (const district of districts) {
    const field = new THREE.Mesh(fieldGeometry, new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(district.color) }, uStrength: { value: district.id === 'gate' ? .20 : .27 } },
      vertexShader: 'varying vec2 vUv2; void main(){ vUv2 = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uColor; uniform float uStrength; varying vec2 vUv2; void main(){ float r = length(vUv2 - .5) * 2.0; float falloff = pow(max(0.0, 1.0 - r), 1.8); float ring = exp(-pow((r - .69) * 95.0, 2.0)) * .12; gl_FragColor = vec4(uColor, (falloff * uStrength + ring) * .65); }',
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }));
    field.rotation.x = -Math.PI / 2; field.position.set(district.x, .018, district.z); parent.add(field);
  }

  const shards = new THREE.InstancedMesh(new THREE.CylinderGeometry(.07, .43, 1, 5), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: .44, roughness: .3, flatShading: true }), 96);
  const tips = new THREE.InstancedMesh(new THREE.OctahedronGeometry(.35, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), 96);
  const transform = new THREE.Object3D(); let count = 0;
  let seed = 993;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 96; i++) {
    const angle = (i + random() * .45) * Math.PI * 2 / 96;
    const radius = 58 + random() * 9;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    let nearest = districts[0], best = Infinity;
    for (const district of districts) { const distance = Math.hypot(x - district.x, z - district.z); if (distance < best) { best = distance; nearest = district; } }
    const height = 1.5 + random() * (nearest.id === 'arcade' ? 6.8 : 4.7);
    transform.position.set(x, height / 2, z); transform.rotation.set(0, angle, 0); transform.scale.set(.65 + random() * .45, height, .65 + random() * .45); transform.updateMatrix(); shards.setMatrixAt(count, transform.matrix);
    transform.position.set(x, height + .17, z); transform.rotation.set(0, angle, 0); transform.scale.set(.7, .7, .7); transform.updateMatrix(); tips.setMatrixAt(count, transform.matrix);
    const color = new THREE.Color(nearest.color).lerp(new THREE.Color(0x6c8c8d), .36 + random() * .35);
    shards.setColorAt(count, color); tips.setColorAt(count, color.clone().multiplyScalar(1.35)); count++;
  }
  shards.count = tips.count = count;
  shards.instanceMatrix.needsUpdate = tips.instanceMatrix.needsUpdate = true;
  if (shards.instanceColor) shards.instanceColor.needsUpdate = true;
  if (tips.instanceColor) tips.instanceColor.needsUpdate = true;
  parent.add(shards, tips);

  const points: number[] = [], colors: number[] = [];
  for (const district of districts) {
    const base = new THREE.Color(district.color);
    for (let i = 0; i < 13; i++) {
      const a = random() * Math.PI * 2, r = 4 + random() * 13;
      points.push(district.x + Math.cos(a) * r, 1.4 + random() * 7, district.z + Math.sin(a) * r);
      const c = base.clone().lerp(new THREE.Color(0xffffff), random() * .35); colors.push(c.r, c.g, c.b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const moteCanvas = document.createElement('canvas'); moteCanvas.width = moteCanvas.height = 64;
  const moteContext = moteCanvas.getContext('2d')!;
  const gradient = moteContext.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(.25, '#ffffffcc'); gradient.addColorStop(1, '#ffffff00');
  moteContext.fillStyle = gradient; moteContext.fillRect(0, 0, 64, 64);
  const motes = new THREE.Points(geometry, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(moteCanvas), size: .34, transparent: true, opacity: .68, vertexColors: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  parent.add(motes);
  animated.push((time) => { motes.position.y = Math.sin(time * .28) * .16; });
}

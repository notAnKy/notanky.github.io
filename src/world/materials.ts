import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const palette = {
  ground: 0xc8cdb3, road: 0x3a5960, roadEdge: 0xe5d9bc, metal: 0xd9ded2,
  steel: 0x789e9e, cream: 0xf4e8ce, amber: 0xf48b60, teal: 0x39b9ae,
  dark: 0x163e4c, water: 0x237f95,
};

export const mat = (color: number, metalness = 0.15, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
export const glow = (color: number, intensity = 1.6) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.5 });

const boxGeometries = new Map<string, THREE.BufferGeometry>();

export function box(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, rot = 0) {
  const key = `${w},${h},${d}`;
  let geometry = boxGeometries.get(key);
  if (!geometry) {
    const smallest = Math.min(w, h, d);
    geometry = smallest >= .3 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(.12, smallest * .14)) : new THREE.BoxGeometry(w, h, d);
    boxGeometries.set(key, geometry);
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rot;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function cylinder(parent: THREE.Object3D, x: number, y: number, z: number, top: number, bottom: number, h: number, material: THREE.Material, sides = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, h, sides), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function label(parent: THREE.Object3D, text: string, x: number, y: number, z: number, width: number, height = 1.7, opts: { color?: string; bg?: string; size?: number; align?: CanvasTextAlign; backZ?: number } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width >= 8 ? 2048 : width >= 4 ? 1536 : 1024;
  const scale = canvas.width / 1024;
  canvas.height = Math.max(128 * scale, Math.round(canvas.width * height / width));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = opts.bg ?? '#16232a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = opts.color ?? '#9bdad0';
  ctx.lineWidth = 4 * scale;
  ctx.strokeRect(5 * scale, 5 * scale, canvas.width - 10 * scale, canvas.height - 10 * scale);
  ctx.fillStyle = opts.color ?? '#f2e7d0';
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${(opts.size ?? Math.min(100, canvas.height / scale * 0.48)) * scale}px Rajdhani, Arial, sans-serif`;
  const lines = text.split('\n');
  lines.forEach((line, i) => ctx.fillText(line, ctx.textAlign === 'center' ? canvas.width / 2 : 38 * scale, canvas.height / 2 + (i - (lines.length - 1) / 2) * (opts.size ?? 68) * scale * 1.18, canvas.width - 72 * scale));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  if (opts.backZ !== undefined) {
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.FrontSide, depthWrite: false });
    const geometry = new THREE.PlaneGeometry(width, height);
    const front = new THREE.Mesh(geometry, material);
    front.position.set(x, y, z);
    front.rotation.y = z > opts.backZ ? 0 : Math.PI;
    parent.add(front);
    const back = new THREE.Mesh(geometry, material);
    back.position.set(x, y, opts.backZ);
    back.rotation.y = front.rotation.y + Math.PI;
    parent.add(back);
    return front;
  }
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sign = new THREE.Sprite(material);
  sign.position.set(x, y, z);
  sign.scale.set(width, height, 1);
  sign.userData.labelSize = { width, height };
  parent.add(sign);
  return sign;
}

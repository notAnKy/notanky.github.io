import * as THREE from 'three';

export const palette = {
  ground: 0x20353b, road: 0x2c4049, roadEdge: 0x526b70, metal: 0x30434b,
  steel: 0x67777b, cream: 0xf4e8ce, amber: 0xe5ad65, teal: 0x71c8c4,
  dark: 0x071018, water: 0x0b1c27,
};

export const mat = (color: number, metalness = 0.15, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
export const glow = (color: number, intensity = 1.6) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.5 });

export function box(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, rot = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rot;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function cylinder(parent: THREE.Object3D, x: number, y: number, z: number, top: number, bottom: number, h: number, material: THREE.Material, sides = 8) {
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
  ctx.strokeStyle = '#688183';
  ctx.lineWidth = 9 * scale;
  ctx.strokeRect(5 * scale, 5 * scale, canvas.width - 10 * scale, canvas.height - 10 * scale);
  ctx.fillStyle = opts.color ?? '#f2e7d0';
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${(opts.size ?? Math.min(100, canvas.height / scale * 0.48)) * scale}px Arial, sans-serif`;
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
  parent.add(sign);
  return sign;
}

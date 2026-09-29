import * as THREE from 'three';
import { projects } from '../data/content';
import { box, glow, mat } from './materials';

type Display = { id: string; x: number; y: number; z: number; width: number; height: number; accent: number };

const displays: Display[] = [
  { id: 'hardwareprobe', x: -40, y: 2.05, z: -13.73, width: 4.7, height: 2.4, accent: 0x75d2c8 },
  { id: 'fnhub', x: -31, y: 2.1, z: -25.42, width: 4.45, height: 2.4, accent: 0x64c9e6 },
  { id: 'game-library', x: -17, y: 2.12, z: -18.65, width: 4.65, height: 2.35, accent: 0x9cd5d0 },
  { id: 'nova', x: -20, y: 2.14, z: -3.9, width: 4.4, height: 2.35, accent: 0x8ae4b0 },
  { id: 'clip', x: -39, y: 2.15, z: .62, width: 4.45, height: 2.35, accent: 0xf5b67f },
  { id: 'riftbound', x: 42, y: 1.65, z: -16.62, width: 4.5, height: 2.3, accent: 0xf3a078 },
  { id: 'isitvibecoded', x: 16, y: 2.02, z: 47.13, width: 3.9, height: 2.1, accent: 0x9deccf },
];

export function addProjectDisplays(parent: THREE.Object3D) {
  const frame = mat(0x071920, .55, .43);
  for (const display of displays) {
    const project = projects.find(item => item.id === display.id);
    const src = project?.screenshots?.[0]?.src;
    if (!src) continue;
    const group = new THREE.Group(); group.position.set(display.x, display.y, display.z); parent.add(group);
    box(group, 0, 0, 0, display.width + .22, display.height + .24, .22, frame);
    box(group, 0, -display.height / 2 - .17, .12, display.width + .27, .09, .09, glow(display.accent, 1.2));
    const material = new THREE.MeshBasicMaterial({ color: 0x1b3740, toneMapped: false, side: THREE.FrontSide });
    const geometry = new THREE.PlaneGeometry(display.width, display.height);
    const imagePlane = new THREE.Mesh(geometry, material);
    imagePlane.position.z = .125; group.add(imagePlane);
    const rearImagePlane = new THREE.Mesh(geometry, material);
    rearImagePlane.position.z = -.125;
    rearImagePlane.rotation.y = Math.PI;
    group.add(rearImagePlane);
    const image = new Image(); image.decoding = 'async';
    image.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 576;
      const context = canvas.getContext('2d')!;
      const sourceRatio = image.naturalWidth / image.naturalHeight;
      const targetRatio = canvas.width / canvas.height;
      let sx = 0, sy = 0, sw = image.naturalWidth, sh = image.naturalHeight;
      if (sourceRatio > targetRatio) { sw = image.naturalHeight * targetRatio; sx = (image.naturalWidth - sw) / 2; }
      else { sh = image.naturalWidth / targetRatio; sy = display.id === 'isitvibecoded' ? 0 : (image.naturalHeight - sh) / 2; }
      context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
      material.map = texture; material.color.set(0xffffff); material.needsUpdate = true;
    };
    image.src = src;
  }
}

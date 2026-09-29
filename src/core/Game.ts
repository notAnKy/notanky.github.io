import * as THREE from 'three';
import { AudioEngine } from '../audio/Audio';
import { Input } from './Input';
import { Save, type Quality } from './Save';
import { UI } from '../ui/UI';
import { Rover } from '../vehicle/Rover';
import { World } from '../world/World';

export class Game {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .1, 500);
  private renderer: THREE.WebGLRenderer;
  private sun?: THREE.DirectionalLight;
  private world: World;
  private rover: Rover;
  private input: Input;
  private audio = new AudioEngine();
  private clock = new THREE.Clock();
  private active = false;
  private lastDistrict = '';
  private lastScanner = false;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private cameraLook = new THREE.Vector3(0, 0, 4);
  private cameraBlend = 0;
  private quality: Quality;

  constructor(private ui: UI, private save: Save) {
    this.quality = this.chooseQuality(save.data.quality);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.65;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(innerWidth, innerHeight);
    this.applyQuality();
    document.getElementById('world')!.append(this.renderer.domElement);
    this.scene.background = new THREE.Color(0x193a49);
    this.scene.fog = new THREE.FogExp2(0x193a49, .0053);
    this.scene.add(new THREE.HemisphereLight(0xc5e7e7, 0x353039, 1.95));
    this.sun = new THREE.DirectionalLight(0xffc998, 2.75); this.sun.position.set(-28, 48, 20);
    this.sun.shadow.camera.left = -73; this.sun.shadow.camera.right = 73; this.sun.shadow.camera.top = 73; this.sun.shadow.camera.bottom = -73;
    this.sun.shadow.camera.near = 1; this.sun.shadow.camera.far = 150; this.sun.shadow.bias = -.0006; this.sun.shadow.normalBias = .025;
    this.scene.add(this.sun, this.sun.target);
    this.configureShadows();
    const fill = new THREE.DirectionalLight(0x84cde0, 1.2); fill.position.set(35, 18, -35); this.scene.add(fill);
    this.world = new World(this.scene);
    this.rover = new Rover(this.scene);
    this.input = new Input();
    this.input.onInteract = () => this.interact();
    this.input.onMap = () => this.toggleMap();
    this.input.onReset = () => { if (this.ui.activeModal) return; this.rover.reset(); this.ui.toast('Rover reset to a safe position.'); };
    this.input.onEscape = () => this.ui.close();
    this.ui.onEnter = () => this.enter();
    this.ui.onInteract = () => this.interact();
    this.ui.onMap = () => this.toggleMap();
    this.ui.onClose = () => { this.input.enabled = this.active; };
    this.ui.onReset = () => { this.lastDistrict = ''; this.world.tokens.forEach(t => t.mesh.visible = true); };
    this.ui.onQuality = q => { this.quality = this.chooseQuality(q); this.applyQuality(); };
    this.ui.onAudio = on => this.audio.setEnabled(on);
    this.world.tokens.forEach(t => t.mesh.visible = !save.data.tokens.includes(t.id));
    this.camera.position.set(0, 37, 49); this.camera.lookAt(0, 0, 0);
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clock.stop(); else this.clock.start(); });
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => { this.reducedMotion = e.matches; });
    this.loop();
  }
  private chooseQuality(request: Quality | 'auto'): Quality {
    if (request !== 'auto') return request;
    if (matchMedia('(pointer: coarse)').matches || navigator.hardwareConcurrency <= 4) return 'low';
    return navigator.deviceMemory && navigator.deviceMemory < 8 ? 'medium' : 'high';
  }
  private applyQuality() {
    const pixelRatio = this.quality === 'low' ? Math.min(devicePixelRatio, 1) : this.quality === 'medium' ? Math.min(Math.max(devicePixelRatio, 1.4), 1.75) : Math.min(Math.max(devicePixelRatio, 1.8), 2.25);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(innerWidth, innerHeight);
    if (this.sun) this.configureShadows();
  }
  private configureShadows() {
    if (!this.sun) return;
    const enabled = this.quality !== 'low';
    this.renderer.shadowMap.enabled = enabled;
    this.sun.castShadow = enabled;
    const size = this.quality === 'high' ? 2048 : 1024;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.map?.dispose(); this.sun.shadow.map = null;
      this.sun.shadow.mapSize.set(size, size);
    }
  }
  private resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); }
  private enter() { this.active = true; this.input.enabled = true; this.save.visit('gate'); this.lastDistrict = 'gate'; this.ui.setDistrict('gate'); }
  private interact() { if (!this.active || this.ui.activeModal) return; if (this.ui.openNearby()) { this.input.enabled = false; this.audio.chirp(420); } }
  private toggleMap() { if (!this.active) return; if (this.ui.activeModal === 'map') { this.ui.close(); return; } if (this.ui.activeModal) return; this.input.enabled = false; this.ui.openMap(this.rover.position.x, this.rover.position.z, this.rover.heading); this.audio.chirp(620); }
  private loop = () => {
    requestAnimationFrame(this.loop);
    if (document.hidden) return;
    const dt = Math.min(this.clock.getDelta(), .05), time = this.clock.elapsedTime;
    if (this.active && !this.ui.activeModal) {
      this.rover.update(dt, this.input.drive, this.world.collisions, this.reducedMotion);
      const { x, z } = this.rover.position;
      const district = this.world.nearestDistrict(x, z);
      if (district.id !== this.lastDistrict) { this.lastDistrict = district.id; if (this.save.visit(district.id)) { this.ui.setDistrict(district.id); this.audio.chirp(690); } }
      const near = this.world.nearestLandmark(x, z);
      this.ui.setNearby(near.distance < near.landmark.radius ? near.landmark : undefined);
      const scanning = Math.hypot(x - this.world.scanner.x, z - this.world.scanner.z) < this.world.scanner.radius;
      this.ui.setScan(scanning);
      if (scanning && !this.lastScanner) { this.ui.toast('VEHICLE DETECTED  /  CONFIDENCE 99.7%'); this.audio.chirp(780); }
      this.lastScanner = scanning;
      for (const token of this.world.tokens) {
        if (token.mesh.visible && Math.hypot(x - token.x, z - token.z) < 1.9) {
          token.mesh.visible = false;
          if (this.save.token(token.id)) { this.ui.updateProgress(); this.ui.toast(this.save.data.tokens.length === 5 ? 'ALL BUILD TOKENS FOUND · SHIP IT!' : `BUILD TOKEN ${this.save.data.tokens.length} / 5`); this.audio.chirp(900); }
        }
      }
      this.ui.update(this.rover.speed);
    }
    if (this.active) this.followCamera(dt);
    this.world.update(time, dt, this.rover.position);
    this.audio.update(this.rover.speed, this.active && !this.ui.activeModal);
    this.renderer.render(this.scene, this.camera);
  };
  private followCamera(dt: number) {
    this.cameraBlend = Math.min(1, this.cameraBlend + dt * .65);
    const heading = this.rover.heading;
    const distance = innerWidth < 700 ? 8 : 10.2;
    const height = innerWidth < 700 ? 5.1 : 6.3;
    const target = new THREE.Vector3(this.rover.position.x - Math.sin(heading) * distance, height, this.rover.position.z - Math.cos(heading) * distance);
    const stiffness = this.reducedMotion ? 6 : 3.5;
    this.camera.position.lerp(target, Math.min(1, dt * stiffness * this.cameraBlend));
    const look = new THREE.Vector3(this.rover.position.x + Math.sin(heading) * 4.3, 1.1, this.rover.position.z + Math.cos(heading) * 4.3);
    this.cameraLook.lerp(look, Math.min(1, dt * 4.5));
    this.camera.lookAt(this.cameraLook);
    const targetFov = this.rover.boost && !this.reducedMotion ? 66 : 58;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1, dt * 3)); this.camera.updateProjectionMatrix();
  }
}

declare global { interface Navigator { deviceMemory?: number } }

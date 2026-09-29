import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { type DistrictId } from '../data/content';
import { AudioEngine } from '../audio/Audio';
import { Input } from './Input';
import { Save, type Quality } from './Save';
import { UI } from '../ui/UI';
import { Rover } from '../vehicle/Rover';
import { World } from '../world/World';

export class Game {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .1, 800);
  private renderer: THREE.WebGLRenderer;
  private composer?: EffectComposer;
  private bloom?: UnrealBloomPass;
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
  private worldTime = 0;
  private cameraTarget = new THREE.Vector3();
  private lookTarget = new THREE.Vector3();

  constructor(private ui: UI, private save: Save) {
    this.quality = this.chooseQuality(save.data.quality);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .92;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(innerWidth, innerHeight);
    this.applyQuality();
    document.getElementById('world')!.append(this.renderer.domElement);
    this.scene.background = new THREE.Color(0xe5d9c4);
    this.scene.fog = new THREE.Fog(0xe5d9c4, 90, 265);
    this.scene.add(new THREE.HemisphereLight(0xc7e9f0, 0xb69b76, .8));
    this.sun = new THREE.DirectionalLight(0xffe1b2, 2.3); this.sun.position.set(-48, 65, -55);
    this.sun.shadow.camera.left = -73; this.sun.shadow.camera.right = 73; this.sun.shadow.camera.top = 73; this.sun.shadow.camera.bottom = -73;
    this.sun.shadow.camera.near = 1; this.sun.shadow.camera.far = 150; this.sun.shadow.bias = -.0006; this.sun.shadow.normalBias = .025;
    this.scene.add(this.sun, this.sun.target);
    this.configureShadows();
    const fill = new THREE.DirectionalLight(0x8bcede, .55); fill.position.set(35, 18, 35); this.scene.add(fill);
    this.environmentLighting();
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
    this.ui.onTravel = id => this.travel(id);
    this.ui.onClose = () => { this.input.enabled = this.active; };
    this.ui.onReset = () => { this.lastDistrict = ''; this.world.tokens.forEach(t => t.mesh.visible = true); };
    this.ui.onQuality = q => { this.quality = this.chooseQuality(q); this.applyQuality(); };
    this.ui.onAudio = on => this.audio.setEnabled(on);
    this.world.tokens.forEach(t => t.mesh.visible = !save.data.tokens.includes(t.id));
    this.camera.position.set(63, 57, 78); this.camera.lookAt(0, 1, 0);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .19, .55, 1.7);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.applyQuality();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clock.stop(); else this.clock.start(); });
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => { this.reducedMotion = e.matches; });
    this.loop();
  }
  private environmentLighting() {
    const generator = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    const fallback = generator.fromScene(room, .025); room.dispose();
    this.scene.environment = fallback.texture; this.scene.environmentIntensity = .42;
    new HDRLoader().load(`${import.meta.env.BASE_URL}environment/coastal-sunrise.hdr`, texture => {
      const environment = generator.fromEquirectangular(texture);
      this.scene.environment = environment.texture;
      this.scene.environmentIntensity = .6;
      this.scene.environmentRotation.y = -.5;
      texture.dispose(); fallback.dispose(); generator.dispose();
    }, undefined, () => { generator.dispose(); });
  }
  private chooseQuality(request: Quality | 'auto'): Quality {
    if (request !== 'auto') return request;
    if (matchMedia('(pointer: coarse)').matches || navigator.hardwareConcurrency <= 4) return 'low';
    return navigator.deviceMemory && navigator.deviceMemory < 8 ? 'medium' : 'high';
  }
  private applyQuality() {
    const pixelRatio = this.quality === 'low' ? Math.min(devicePixelRatio, 1) : this.quality === 'medium' ? Math.min(devicePixelRatio, 1.5) : Math.min(Math.max(devicePixelRatio, 1.25), 2);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(innerWidth, innerHeight);
    if (this.sun) this.configureShadows();
    if (this.composer) {
      const samples = this.quality === 'high' ? Math.min(4, this.renderer.capabilities.maxSamples) : 0;
      for (const target of [this.composer.renderTarget1, this.composer.renderTarget2]) {
        if (target.samples !== samples) { target.samples = samples; target.dispose(); }
      }
      this.composer.setPixelRatio(pixelRatio);
      this.composer.setSize(innerWidth, innerHeight);
    }
    if (this.bloom) this.bloom.enabled = this.quality === 'high';
  }
  private configureShadows() {
    if (!this.sun) return;
    const enabled = this.quality !== 'low';
    this.renderer.shadowMap.enabled = enabled;
    this.sun.castShadow = enabled;
    const size = this.quality === 'high' ? 4096 : 2048;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.map?.dispose(); this.sun.shadow.map = null;
      this.sun.shadow.mapSize.set(size, size);
    }
  }
  private resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); this.composer?.setSize(innerWidth, innerHeight); }
  private enter() { this.audio.setEnabled(this.save.data.audio); this.active = true; this.input.enabled = true; this.save.visit('gate'); this.lastDistrict = 'gate'; this.ui.setDistrict('gate'); }
  private travel(id: DistrictId) {
    const arrivals: Record<DistrictId, [number, number, number]> = {
      gate: [0, 18, Math.PI], software: [-28, -8, Math.PI], vision: [0, -33, Math.PI],
      arcade: [27, -19, Math.PI / 2], archive: [27, 20, Math.PI / 2], lab: [2, 30, 0], tower: [-30, 30, Math.PI],
    };
    const [x, z, heading] = arrivals[id];
    this.input.clear();
    this.rover.travelTo(x, z, heading);
    this.ui.close(); this.active = true; this.input.enabled = true;
    this.save.visit(id); this.lastDistrict = id; this.lastScanner = false;
    this.cameraBlend = 1;
    this.camera.position.set(x - Math.sin(heading) * 10.2, 6.3, z - Math.cos(heading) * 10.2);
    this.cameraLook.set(x + Math.sin(heading) * 4.3, 1.1, z + Math.cos(heading) * 4.3);
    this.camera.lookAt(this.cameraLook);
    this.ui.setDistrict(id); this.ui.updateProgress(); this.audio.chirp(620);
  }
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
    else if (!this.reducedMotion) {
      this.camera.position.set(Math.sin(time * .018 + .68) * 102, 57, Math.cos(time * .018 + .68) * 102);
      this.camera.lookAt(0, 1, 0);
    }
    if (!this.reducedMotion) this.worldTime += dt;
    this.world.update(this.worldTime, this.reducedMotion ? 0 : dt, this.rover.position);
    this.world.updateLabels(this.camera);
    this.audio.update(this.rover.speed, this.active && !this.ui.activeModal);
    if (this.quality === 'high' && this.composer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  };
  private followCamera(dt: number) {
    this.cameraBlend = Math.min(1, this.cameraBlend + dt * .65);
    const heading = this.rover.heading;
    const distance = innerWidth < 700 ? 8 : 10.2;
    const height = innerWidth < 700 ? 5.1 : 6.3;
    const target = this.cameraTarget.set(this.rover.position.x - Math.sin(heading) * distance, height, this.rover.position.z - Math.cos(heading) * distance);
    const stiffness = this.reducedMotion ? 6 : 3.5;
    this.camera.position.lerp(target, Math.min(1, dt * stiffness * this.cameraBlend));
    const look = this.lookTarget.set(this.rover.position.x + Math.sin(heading) * 4.3, 1.1, this.rover.position.z + Math.cos(heading) * 4.3);
    this.cameraLook.lerp(look, Math.min(1, dt * 4.5));
    this.camera.lookAt(this.cameraLook);
    const targetFov = this.rover.boost && !this.reducedMotion ? 66 : 58;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1, dt * 3)); this.camera.updateProjectionMatrix();
  }
}

declare global { interface Navigator { deviceMemory?: number } }

import * as THREE from 'three';
import { districts } from '../data/content';

type Animate = (time: number, dt: number, player: THREE.Vector3) => void;
const TAU = Math.PI * 2;
function randomSource(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

function terrainTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2048;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#8fa988'; ctx.fillRect(0, 0, 2048, 2048);
  const random = randomSource(28751);
  for (const district of districts) {
    const x = (district.x / 144 + .5) * 2048, y = (.5 - district.z / 144) * 2048;
    const gradient = ctx.createRadialGradient(x, y, 10, x, y, 330);
    gradient.addColorStop(0, '#dcd8bf'); gradient.addColorStop(.5, '#c2c8ae'); gradient.addColorStop(1, '#8fa98800');
    ctx.fillStyle = gradient; ctx.fillRect(x - 330, y - 330, 660, 660);
  }
  ctx.lineWidth = 1; ctx.strokeStyle = '#6d8c7720';
  for (let i = 0; i < 80; i++) { const p = i * 28; ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(2048, p); ctx.moveTo(p, 0); ctx.lineTo(p, 2048); ctx.stroke(); }
  for (let i = 0; i < 75000; i++) {
    ctx.fillStyle = random() > .45 ? 'rgba(255,255,245,.11)' : 'rgba(53,78,55,.07)';
    const size = .6 + random() * 2; ctx.fillRect(random() * 2048, random() * 2048, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  return texture;
}

function addSky(parent: THREE.Object3D, animated: Animate[]) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uTop: { value: new THREE.Color(0x6fafd1) }, uHorizon: { value: new THREE.Color(0xc4dfdd) } },
    vertexShader: 'varying vec3 vDirection; void main(){ vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform float uTime; uniform vec3 uTop; uniform vec3 uHorizon; varying vec3 vDirection;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y); }
      float cloud(vec2 p) { return noise(p)*.55 + noise(p*2.03)*.27 + noise(p*4.11)*.12 + noise(p*8.3)*.06; }
      void main(){
        vec3 n=normalize(vDirection); float h=max(n.y,0.);
        vec3 color=mix(uHorizon,uTop,smoothstep(-.04,.65,n.y));
        vec3 sunDirection=normalize(vec3(-.65,.36,-.75)); float sun=max(dot(n,sunDirection),0.);
        color += vec3(1.,.58,.26)*pow(sun,16.)*.28;
        color += vec3(3.8,2.6,1.4)*smoothstep(.99925,.99972,sun);
        vec2 p=n.xz / (h+.22) * 2.4 + vec2(uTime*.0015,0.);
        float clouds=smoothstep(.51,.72,cloud(p)) * smoothstep(.025,.17,h) * (1.-smoothstep(.65,.9,h));
        color=mix(color,vec3(.97,.89,.8),clouds*.61);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 40, 24), material); sky.renderOrder = -10; parent.add(sky);
  animated.push(time => { material.uniforms.uTime.value = time; });
}

function addCoast(parent: THREE.Object3D, animated: Animate[]) {
  const seaMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDeep: { value: new THREE.Color(0x176a83) }, uShallow: { value: new THREE.Color(0x60c7bd) }, uHorizon: { value: new THREE.Color(0xe5d9c4) } },
    vertexShader: `uniform float uTime; varying vec3 vWorld; void main(){ vec3 p=position; p.z += sin(p.x*.17+uTime*.45)*.055+sin(p.y*.21-uTime*.38)*.04; vec4 world=modelMatrix*vec4(p,1.); vWorld=world.xyz; gl_Position=projectionMatrix*viewMatrix*world; }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uHorizon; varying vec3 vWorld;
      void main(){
        vec2 p=vWorld.xz; float shore=1.-smoothstep(73.,109.,length(p));
        float a=p.x*.36+p.y*.24+uTime*.62, b=p.x*.57-p.y*.33-uTime*.43;
        vec3 normal=normalize(vec3(-cos(a)*.055-cos(b)*.045,1.,-cos(a)*.044+cos(b)*.036));
        vec3 viewDirection=normalize(cameraPosition-vWorld);
        float fresnel=pow(1.-max(dot(viewDirection,normal),0.),3.);
        vec3 color=mix(uDeep,uShallow,shore*.9);
        color=mix(color,vec3(.59,.79,.8),fresnel*.52);
        float caustic=pow(max(0.,sin(a)*sin(b)),10.) * shore;
        color += vec3(.19,.24,.17)*caustic;
        float wave=sin((length(p)-73.)*2.5-uTime*.7+sin(atan(p.y,p.x)*14.)*.8);
        float foam=smoothstep(.83,1.,wave)*(1.-smoothstep(73.,81.,length(p)))*.32;
        color=mix(color,vec3(.87,.94,.86),foam);
        vec3 light=normalize(vec3(-.65,.36,-.75));
        float spec=pow(max(dot(normal,normalize(light+viewDirection)),0.),180.);
        color += vec3(1.,.72,.39)*spec*.55;
        float haze=smoothstep(140.,360.,distance(vWorld,cameraPosition));
        color=mix(color,uHorizon,haze*.85);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000, 64, 64), seaMaterial); sea.rotation.x = -Math.PI / 2; sea.position.y = -1.7; parent.add(sea);
  animated.push(time => { seaMaterial.uniforms.uTime.value = time; });
  const terrace = new THREE.Mesh(new THREE.CylinderGeometry(71.8, 75.5, 2.7, 96), new THREE.MeshStandardMaterial({ color: 0xc4ad8d, roughness: .95 })); terrace.position.y = -1.4; terrace.receiveShadow = true; parent.add(terrace);
  const beach = new THREE.Mesh(new THREE.CylinderGeometry(75.4, 78, .55, 96), new THREE.MeshStandardMaterial({ color: 0xe6d5b4, roughness: .9 })); beach.position.y = -1.45; parent.add(beach);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(71.8, 128), new THREE.MeshStandardMaterial({ map: terrainTexture(), roughness: .92, metalness: .02 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.018; ground.receiveShadow = true; parent.add(ground);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(71.15, .21, 6, 160), new THREE.MeshStandardMaterial({ color: 0xf1e6cc, roughness: .7 })); rim.rotation.x = Math.PI / 2; rim.position.y = .02; parent.add(rim);
  const random = randomSource(7842), transform = new THREE.Object3D();
  const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xc8baa1, roughness: .96, flatShading: true }), 100);
  for (let i = 0; i < 100; i++) {
    const a = i / 100 * TAU, r = 73.7 + random() * 3.4;
    transform.position.set(Math.cos(a) * r, -1.45 + random() * .25, Math.sin(a) * r); transform.rotation.set(random(), a, random() * .4);
    transform.scale.set(.6 + random() * 1.9, .35 + random() * .7, .6 + random() * 1.3); transform.updateMatrix(); rocks.setMatrixAt(i, transform.matrix);
  }
  rocks.receiveShadow = true; parent.add(rocks);
  const islands = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: 0x809991, roughness: 1, flatShading: true }), 16);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU + random() * .25, r = 160 + random() * 60;
    transform.position.set(Math.cos(a) * r, -3, Math.sin(a) * r); transform.rotation.set(0, a, .12); transform.scale.set(11 + random() * 18, 5 + random() * 11, 8 + random() * 16); transform.updateMatrix(); islands.setMatrixAt(i, transform.matrix);
  }
  parent.add(islands);
}

function palmLeaf() {
  const vertices: number[] = [], indices: number[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, width = Math.pow(Math.sin(t * Math.PI), .7) * .4;
    const x = t * 3.3, y = Math.sin(t * Math.PI * .8) * 1.05 - t * .7;
    vertices.push(x, y, -width, x, y + .08 * Math.sin(t * Math.PI), width);
    if (i < 12) { const n = i * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

function addGardens(parent: THREE.Object3D) {
  const random = randomSource(993), transform = new THREE.Object3D(), palmCount = 34;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.13, .23, 1, 9), new THREE.MeshStandardMaterial({ color: 0xb98a60, roughness: .9 }), palmCount);
  const fronds = new THREE.InstancedMesh(palmLeaf(), new THREE.MeshStandardMaterial({ color: 0x438c65, roughness: .72, side: THREE.DoubleSide }), palmCount * 7);
  const planting: [number, number][] = [];
  for (let i = 0; i < palmCount; i++) {
    const a = (i + .2) / palmCount * TAU, r = 59 + random() * 9, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 4.7 + random() * 3.9;
    planting.push([x, z]); transform.position.set(x, h / 2, z); transform.rotation.set(.03, a, .06); transform.scale.set(1, h, 1); transform.updateMatrix(); trunks.setMatrixAt(i, transform.matrix);
    for (let leaf = 0; leaf < 7; leaf++) {
      transform.position.set(x - Math.sin(.06) * h / 2, h - .02, z + .1); transform.rotation.set(0, leaf * TAU / 7 + a, -.12 + random() * .24); transform.scale.setScalar(.85 + random() * .35); transform.updateMatrix(); fronds.setMatrixAt(i * 7 + leaf, transform.matrix);
      fronds.setColorAt(i * 7 + leaf, new THREE.Color(leaf % 3 === 0 ? 0xb0d08a : 0xffffff));
    }
  }
  trunks.castShadow = fronds.castShadow = true; trunks.receiveShadow = fronds.receiveShadow = true; parent.add(trunks, fronds);
  const groves: [number, number][] = [[-49,-36],[-51,8],[-44,39],[-11,-57],[22,-52],[51,-32],[54,8],[42,42],[1,59],[28,52],[-22,49],[-52,-14],[-9,5],[22,5]];
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(.12, .2, 1, 8), new THREE.MeshStandardMaterial({ color: 0x907158, roughness: .85 }), groves.length * 3);
  const canopies = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85, flatShading: true }), groves.length * 9);
  const treeColors = [0x6d9c70,0x86b885,0xe19b93,0xacb9cc];
  groves.forEach(([cx,cz],i) => {
    for (let j=0;j<3;j++) {
      const a=j*TAU/3+i,x=cx+Math.cos(a)*2,z=cz+Math.sin(a)*2,h=2.4+random()*1.3;
      transform.position.set(x,h/2,z); transform.rotation.set(0,a,0); transform.scale.set(1,h,1); transform.updateMatrix(); stems.setMatrixAt(i*3+j,transform.matrix);
      for (let k=0;k<3;k++) { transform.position.set(x+(k-1)*.5,h+.4+Math.sin(k)*.7,z+(k-1)*.35); transform.scale.set(1.45,1.25,1.5); transform.rotation.set(.1,a+k,.12); transform.updateMatrix(); canopies.setMatrixAt(i*9+j*3+k,transform.matrix); canopies.setColorAt(i*9+j*3+k,new THREE.Color(treeColors[i%treeColors.length])); }
    }
    planting.push([cx,cz]);
  });
  stems.castShadow=canopies.castShadow=true; canopies.receiveShadow=true; parent.add(stems,canopies);
  const bushes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:0x83a87a,roughness:.95,flatShading:true}),planting.length*5);
  const blossoms = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.13,0),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.65}),planting.length*8);
  planting.forEach(([x,z],i) => {
    for(let j=0;j<5;j++){const a=j/5*TAU,r=1.2+random()*1.5;transform.position.set(x+Math.cos(a)*r,.3,z+Math.sin(a)*r);transform.rotation.set(0,a,0);transform.scale.set(.8+random()*.5,.35+random()*.3,.6+random()*.4);transform.updateMatrix();bushes.setMatrixAt(i*5+j,transform.matrix);}
    for(let j=0;j<8;j++){const a=random()*TAU,r=1.5+random()*2;transform.position.set(x+Math.cos(a)*r,.5+random()*.2,z+Math.sin(a)*r);transform.scale.setScalar(.7+random()*.7);transform.updateMatrix();blossoms.setMatrixAt(i*8+j,transform.matrix);blossoms.setColorAt(i*8+j,new THREE.Color(j%3===0?0xeaa955:j%3===1?0xe98493:0xe9e6cc));}
  });
  bushes.castShadow=true;bushes.receiveShadow=true;parent.add(bushes,blossoms);
}

function addAerialLife(parent:THREE.Object3D,animated:Animate[]){
  const airship=new THREE.Group();parent.add(airship);
  const hull=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),new THREE.MeshStandardMaterial({color:0xf3e4bd,roughness:.55,metalness:.08}));hull.scale.set(6.4,2.15,2.15);airship.add(hull);
  const coral=new THREE.MeshStandardMaterial({color:0xed765a,roughness:.48,metalness:.13});
  for(const x of [-3.1,0,3.1]){const hoop=new THREE.Mesh(new THREE.TorusGeometry(x===0?2.17:1.92,.075,6,40),coral);hoop.position.x=x;hoop.rotation.y=Math.PI/2;airship.add(hoop);}
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(2.1,.85,1.15),new THREE.MeshStandardMaterial({color:0x24565e,metalness:.35,roughness:.25}));cabin.position.y=-2.5;airship.add(cabin);
  for(const side of [-1,1]){const fin=new THREE.Mesh(new THREE.BoxGeometry(1.8,.08,1.6),coral);fin.position.set(-4.8,.2,side*1.8);fin.rotation.x=side*.18;airship.add(fin);}
  const tail=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.8,.1),coral);tail.position.set(-4.8,1.7,0);airship.add(tail);
  animated.push(time=>{airship.position.set(-58+Math.sin(time*.015)*7,26+Math.sin(time*.25)*.25,-12+Math.cos(time*.015)*8);airship.rotation.y=-.35+Math.sin(time*.015)*.18;});
  const wing=new THREE.BufferGeometry();wing.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,.7,.22,-.1,.2,0,.17],3));wing.computeVertexNormals();
  const birdMaterial=new THREE.MeshBasicMaterial({color:0xf8eed8,side:THREE.DoubleSide});
  const flock:{body:THREE.Group;left:THREE.Mesh;right:THREE.Mesh}[]=[];
  for(let i=0;i<9;i++){const body=new THREE.Group(),left=new THREE.Mesh(wing,birdMaterial),right=new THREE.Mesh(wing,birdMaterial);right.scale.x=-1;body.add(left,right);parent.add(body);flock.push({body,left,right});}
  animated.push(time=>{flock.forEach(({body,left,right},i)=>{const a=time*.028+i*.15;body.position.set(Math.cos(a)*(78+i),15+Math.sin(i)*2,Math.sin(a)*(78+i));body.rotation.y=-a;left.rotation.z=Math.sin(time*2.2+i)*.3;right.rotation.z=-left.rotation.z;});});
}

export function addEnvironment(parent:THREE.Object3D,animated:Animate[]){
  const environment=new THREE.Group();environment.name='Coastal campus environment';parent.add(environment);
  addSky(environment,animated);addCoast(environment,animated);addGardens(environment);addAerialLife(environment,animated);
}

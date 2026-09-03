import * as THREE from 'three';
import { ENGINE_LAYOUT } from './materials.js';

const PLUME_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPos;
  uniform float uTime;
  uniform float uIntensity;
  void main() {
    vUv = uv;
    vec3 p = position;
    float n = sin(position.y * 2.8 + uTime * 22.0 + uv.x * 12.0);
    float n2 = sin(position.y * 6.5 - uTime * 17.0);
    float n3 = sin(position.y * 12.0 + uTime * 30.0 + uv.x * 8.0) * 0.02;
    float along = clamp(-position.y / 16.0, 0.0, 1.0);
    p.xz *= 1.0 + uIntensity * (n * 0.06 + n2 * 0.04 + n3) * (0.4 + along);
    vPos = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const PLUME_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uHot;
  uniform vec3 uMid;
  uniform vec3 uCool;
  uniform float uDiamond;
  varying vec2 vUv;
  varying vec3 vPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.15;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float along = clamp(-vPos.y / 15.0, 0.0, 1.0);
    float n = fbm(vec2(vUv.x * 12.0, vUv.y * 18.0 - uTime * 22.0));
    float n2 = noise(vec2(vUv.x * 4.0 + 2.7, vUv.y * 7.0 - uTime * 8.5));
    float radial = abs(vUv.x - 0.5) * 2.0;
    float envelope = pow(1.0 - along, 0.48) * (1.0 - radial * radial * (0.18 + along * 0.75));
    envelope *= (0.62 + n * 0.5) * uIntensity;
    float diamonds = pow(abs(sin(along * 28.0 - uTime * 5.0 + n2)), 14.0);
    diamonds *= (1.0 - along) * uDiamond * uIntensity;
    vec3 col = mix(uHot, uMid, along + n2 * 0.12);
    col = mix(col, uCool, smoothstep(0.35, 1.0, along));
    if (radial < 0.18 && along < 0.22) {
      col = mix(col, vec3(0.75, 0.9, 1.0), 0.7);
    }
    col += vec3(0.85, 0.93, 1.0) * diamonds * 1.55;
    col *= (1.0 + 0.45 * pow(1.0 - along, 3.0));
    float fog = smoothstep(0.55, 1.0, along) * n;
    col = mix(col, uCool * 0.45, fog * 0.55);
    float alpha = clamp(envelope * 1.05 + diamonds * 0.5 + fog * 0.12, 0.0, 1.0);
    if (alpha < 0.015) discard;
    gl_FragColor = vec4(col * (0.7 + uIntensity * 0.55), alpha);
  }
`;

const PARTICLE_VERT = /* glsl */ `
  attribute float size;
  attribute float alpha;
  varying float vAlpha;
  void main() {
    vAlpha = alpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / length(mvPosition.xyz));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = 1.0 - smoothstep(0.28, 0.5, d);
    a *= vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = texture2D(uMap, gl_PointCoord) * vec4(uColor, a);
  }
`;

function flameMat(hot, mid, cool, diamond) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uHot: { value: new THREE.Color(hot) },
      uMid: { value: new THREE.Color(mid) },
      uCool: { value: new THREE.Color(cool) },
      uDiamond: { value: diamond },
    },
    vertexShader: PLUME_VERT,
    fragmentShader: PLUME_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

function flameLathe(length, radius, bulge, segs = 48) {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const taper = Math.pow(1 - t, 0.68);
    const swell = 1 + bulge * Math.sin(t * Math.PI) * (1 - t);
    const tip = t > 0.86 ? Math.max(0.02, (1 - t) / 0.14) : 1;
    let r = radius * taper * swell * tip;
    if (t < 0.06) r *= 1.0 + 0.55 * Math.pow(1.0 - t / 0.06, 2.0);
    r *= 1.0 - 0.08 * Math.exp(-Math.pow((t - 0.15) * 20.0, 2.0));
    pts.push(new THREE.Vector2(Math.max(0.012, r), -t * length));
  }
  const geo = new THREE.LatheGeometry(pts, segs);
  geo.computeVertexNormals();
  return geo;
}

function softTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.35, outer);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

const SPARK_MAP = softTexture('rgba(255,240,210,1)', 'rgba(255,150,60,0.55)');
const SMOKE_MAP = softTexture('rgba(220,225,230,0.9)', 'rgba(160,168,176,0.25)');

function makeLayer(length, radius, bulge, hot, mid, cool, diamond) {
  const mesh = new THREE.Mesh(
    flameLathe(length, radius, bulge, 56),
    flameMat(hot, mid, cool, diamond)
  );
  mesh.frustumCulled = false;
  return mesh;
}

function makeDiamonds() {
  const g = new THREE.Group();
  const discs = [];
  for (let i = 0; i < 7; i++) {
    const d = new THREE.Mesh(
      new THREE.SphereGeometry(0.24 - i * 0.018, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xd8ecff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    d.scale.set(0.9, 0.22 + i * 0.04, 0.9);
    d.position.y = -1.2 - i * 1.25;
    g.add(d);
    discs.push(d);
  }
  g.userData.discs = discs;
  return g;
}

function makeNozzleSprite() {
  const g = new THREE.Group();
  const s1 = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: SPARK_MAP,
      color: 0xffe0b0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0,
      toneMapped: false,
    })
  );
  s1.scale.set(1.6, 1.6, 1);
  const s2 = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: SPARK_MAP,
      color: 0xffa060,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0,
      toneMapped: false,
    })
  );
  s2.scale.set(2.2, 2.2, 1);
  g.add(s2, s1);
  g.position.y = -0.2;
  g.userData = { s1, s2 };
  return g;
}

export function createPlume() {
  const root = new THREE.Group();
  root.name = 'plume';
  const engines = [];

  ENGINE_LAYOUT.forEach((p) => {
    const g = new THREE.Group();
    g.position.set(p.x, -3.15, p.z);

    const innerCore = makeLayer(3.4, 0.1, 0.02, 0xf0f8ff, 0xd8ecff, 0xb0d4ff, 1.5);
    const core = makeLayer(5.8, 0.22, 0.08, 0xeaf4ff, 0xb8d8ff, 0x7ec0ff, 1.15);
    const mid = makeLayer(8.6, 0.4, 0.12, 0xfff2c8, 0xff9a3a, 0xff5a18, 0.45);
    const outer = makeLayer(12.2, 0.58, 0.16, 0xffc078, 0xff6a22, 0xff3a00, 0.1);
    g.add(outer, mid, core, innerCore);

    const diamonds = makeDiamonds();
    g.add(diamonds);
    const sprite = makeNozzleSprite();
    g.add(sprite);

    g.userData = {
      innerCore,
      core,
      mid,
      outer,
      diamonds,
      sprite,
      layers: [innerCore, core, mid, outer],
    };
    root.add(g);
    engines.push(g);
  });

  const light = new THREE.PointLight(0xff8a3a, 0, 160, 2);
  light.position.set(0, -5.5, 0);
  root.add(light);

  const fillLight = new THREE.PointLight(0xffaa66, 0, 90, 2);
  fillLight.position.set(0, -9, 0);
  root.add(fillLight);

  root.userData = { engines, light, fillLight, intensity: 0 };
  return root;
}

export function createVacPlume() {
  const g = new THREE.Group();
  g.name = 'vacPlume';
  const filament = makeLayer(8, 0.15, 0.03, 0xeef4ff, 0xc8dcff, 0xa0c0ff, 1.0);
  const core = makeLayer(11, 0.32, 0.12, 0xf2f8ff, 0xa8d0ff, 0x6aa8ff, 0.8);
  const outer = makeLayer(18, 1.35, 0.42, 0xc8e0ff, 0x6a9cff, 0x3a68c8, 0.08);
  const halo = makeLayer(24, 2.0, 0.5, 0x8888ff, 0x5566cc, 0x3344aa, 0.02);
  filament.position.y = 0.2;
  core.position.y = 0.2;
  outer.position.y = 0.2;
  halo.position.y = 0.2;
  g.add(halo, outer, core, filament);
  g.visible = false;
  g.userData = { filament, core, outer, halo, layers: [filament, core, outer, halo] };
  return g;
}

export function createPadSpill() {
  const g = new THREE.Group();
  g.name = 'padSpill';

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(16, 40),
    new THREE.MeshBasicMaterial({
      color: 0xff6a22,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 2.55;
  g.add(glow);

  const haze = new THREE.Mesh(
    flameLathe(8.5, 7.5, 0.2, 32),
    flameMat(0xffc080, 0xff7020, 0xff3a00, 0.02)
  );
  haze.position.y = 2.4;
  g.add(haze);

  const spill = new THREE.PointLight(0xff7a28, 0, 70, 2);
  spill.position.set(0, 4.2, 2);
  g.add(spill);

  const bounce = new THREE.SpotLight(0xffc090, 0, 55, 0.95, 0.6, 2);
  bounce.position.set(0, 6, 4);
  bounce.target.position.set(0, 2, 0);
  g.add(bounce);
  g.add(bounce.target);

  g.userData = { glow, haze, spill, bounce };
  return g;
}

function particleMaterial(color, additive) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uMap: { value: additive ? SPARK_MAP : SMOKE_MAP },
    },
    vertexShader: PARTICLE_VERT,
    fragmentShader: PARTICLE_FRAG,
    transparent: true,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
  });
}

export class ParticleField {
  constructor(count, opts) {
    this.count = count;
    this.life = new Float32Array(count);
    this.maxLife = new Float32Array(count);
    this.vel = new Float32Array(count * 3);
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.alphas = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.life[i] = 0;
      this.positions[i * 3 + 1] = -999;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));
    this.baseSize = opts.size;
    this.points = new THREE.Points(geo, particleMaterial(opts.color, opts.additive));
    this.points.frustumCulled = false;
    this.emitRate = 0;
    this.origin = new THREE.Vector3();
    this.spread = opts.spread ?? 1.2;
    this.down = opts.down ?? 18;
    this.side = opts.side ?? 2.5;
    this.lifeSpan = opts.lifeSpan ?? [0.6, 1.8];
    this.ground = opts.ground ?? false;
    this.cursor = 0;
    this.grow = opts.grow ?? 0;
    this.gravity = opts.gravity ?? (opts.ground ? 0 : 4.5);
    this.drift = opts.drift ? opts.drift.clone() : new THREE.Vector3();
    this.yJitter = opts.yJitter ?? 0.5;
    this.alphaMul = opts.alphaMul ?? 1;
    this.emitCap = opts.emitCap ?? (opts.ground ? 80 : 48);
  }

  burst(n) {
    for (let k = 0; k < n; k++) this.spawnOne();
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;
    this.points.geometry.attributes.alpha.needsUpdate = true;
  }

  spawnOne() {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    const life = this.lifeSpan[0] + Math.random() * (this.lifeSpan[1] - this.lifeSpan[0]);
    this.life[i] = life;
    this.maxLife[i] = life;
    const a = Math.random() * Math.PI * 2;
    const rad = Math.random() * this.spread;
    if (this.ground) {
      this.positions[i * 3] = this.origin.x + Math.cos(a) * rad;
      this.positions[i * 3 + 1] = 0.55 + Math.random() * 0.8;
      this.positions[i * 3 + 2] = this.origin.z + Math.sin(a) * rad;
      const out = 6 + Math.random() * this.side;
      this.vel[i * 3] = Math.cos(a) * out;
      this.vel[i * 3 + 1] = 0.4 + Math.random() * 2.2;
      this.vel[i * 3 + 2] = Math.sin(a) * out;
    } else {
      this.positions[i * 3] = this.origin.x + Math.cos(a) * rad;
      this.positions[i * 3 + 1] = this.origin.y + (Math.random() - 0.5) * this.yJitter;
      this.positions[i * 3 + 2] = this.origin.z + Math.sin(a) * rad;
      this.vel[i * 3] = Math.cos(a) * this.side * (0.25 + Math.random()) + this.drift.x;
      this.vel[i * 3 + 1] = -this.down * (0.45 + Math.random() * 0.7) + this.drift.y;
      this.vel[i * 3 + 2] = Math.sin(a) * this.side * (0.25 + Math.random()) + this.drift.z;
    }
    this.sizes[i] = this.baseSize * (0.65 + Math.random() * 0.9);
    this.alphas[i] = 1.0;
  }

  update(dt) {
    const n = Math.min(this.emitCap, Math.floor(this.emitRate * dt * 60));
    for (let k = 0; k < n; k++) this.spawnOne();

    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.positions[i * 3 + 1] = -999;
        this.alphas[i] = 0;
        continue;
      }
      const age = 1 - this.life[i] / this.maxLife[i];
      this.alphas[i] = (this.ground ? (1 - age) * (0.45 + 0.4 * (1 - age)) : 1 - age) * this.alphaMul;
      if (this.ground) {
        this.vel[i * 3 + 1] += 1.8 * dt;
        this.sizes[i] += dt * 1.6;
        if (this.positions[i * 3 + 1] < 0.4) {
          this.positions[i * 3 + 1] = 0.4;
          this.vel[i * 3 + 1] = Math.abs(this.vel[i * 3 + 1]) * 0.15;
        }
      } else {
        this.vel[i * 3 + 1] += this.gravity * dt;
        if (this.grow) this.sizes[i] += dt * this.grow;
      }
      this.vel[i * 3] *= 1 - 0.12 * dt;
      this.vel[i * 3 + 2] *= 1 - 0.12 * dt;
      this.positions[i * 3] += this.vel[i * 3] * dt;
      this.positions[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;
    this.points.geometry.attributes.alpha.needsUpdate = true;
  }
}

function pulseLayers(layers, k, time) {
  layers.forEach((mesh, i) => {
    const u = mesh.material.uniforms;
    if (!u) return;
    u.uTime.value = time + i * 0.37;
    u.uIntensity.value = k;
  });
}

export function setPlumeIntensity(plume, t, time) {
  const k = THREE.MathUtils.clamp(t, 0, 1);
  plume.userData.intensity = k;
  plume.visible = k > 0.01;

  const cLow = new THREE.Color(0xffaa60);
  const cHigh = new THREE.Color(0xff6a20);
  plume.userData.light.color.lerpColors(cLow, cHigh, k);
  plume.userData.light.intensity = k * 520;
  if (plume.userData.fillLight) {
    plume.userData.fillLight.intensity = k * 160;
  }

  plume.userData.engines.forEach((g, i) => {
    const flicker = 0.86 + Math.sin(time * 46 + i * 1.7) * 0.1 + Math.sin(time * 13 + i) * 0.04;
    const s = k * flicker;
    g.scale.set(1, 0.72 + s * 0.85, 1);
    pulseLayers(g.userData.layers, s, time);
    g.userData.sprite.userData.s1.material.opacity = s * 0.9;
    g.userData.sprite.userData.s2.material.opacity = s * 0.38;
    g.userData.sprite.scale.setScalar(1.15 + s * 1.6);
    g.userData.diamonds.userData.discs.forEach((d, di) => {
      d.material.opacity = s * (0.24 + 0.14 * Math.sin(time * 24 + di + i));
      d.scale.y = 0.18 + 0.08 * s * (1 + 0.3 * Math.sin(time * 18 + di));
    });
  });
}

export function setPadSpill(fx, k, time) {
  const t = THREE.MathUtils.clamp(k, 0, 1);
  fx.userData.glow.material.opacity = t * 0.1;
  fx.userData.glow.scale.setScalar(0.7 + t * 1.15);
  fx.userData.spill.intensity = t * 280;
  fx.userData.bounce.intensity = t * 120;
  pulseLayers([fx.userData.haze], t * 0.65, time);
  fx.userData.haze.scale.set(0.85 + t * 0.4, 0.5 + t * 0.8, 0.85 + t * 0.4);
}

export function pulseVacPlume(plume, t, time) {
  const k = THREE.MathUtils.clamp(t, 0, 1);
  plume.visible = k > 0.02;
  const flicker = 0.9 + Math.sin(time * 28) * 0.08;
  plume.scale.set(1, 0.78 + k * flicker * 0.35, 1);
  pulseLayers(plume.userData.layers, k * flicker, time);
}

const VENT_LOCAL = [
  new THREE.Vector3(1.95, 33.5, 0.35),
  new THREE.Vector3(-1.7, 36.2, 0.9),
  new THREE.Vector3(0.2, 40.4, -1.85),
  new THREE.Vector3(1.4, 28.5, -1.5),
  new THREE.Vector3(-0.8, 31.0, 1.7),
  new THREE.Vector3(1.6, 24.0, 1.2),
  new THREE.Vector3(-1.5, 38.5, -0.6),
];

export function createLoxVent() {
  const field = new ParticleField(1600, {
    color: 0x9aa8b6,
    size: 8.5,
    additive: false,
    spread: 0.85,
    down: 5.5,
    side: 2.1,
    lifeSpan: [1.1, 2.8],
    gravity: 4.0,
    yJitter: 1.4,
    alphaMul: 0.95,
    emitCap: 90,
    grow: 1.8,
  });
  field.points.material.depthWrite = false;
  return field;
}

export function createLoxVaporPlumes() {
  const root = new THREE.Group();
  root.name = 'loxVaporMeshes';
  const pts = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const r = 0.35 + Math.pow(t, 0.6) * 4.2 * (1 - t * 0.28);
    pts.push(new THREE.Vector2(r, -t * 16));
  }
  const geo = new THREE.LatheGeometry(pts, 16);
  geo.computeVertexNormals();
  VENT_LOCAL.forEach((p, i) => {
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: 0x8e9eae,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: true,
      })
    );
    m.position.copy(p);
    m.rotation.y = i * 0.9;
    root.add(m);
  });
  const wrap = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 5.8, 15, 22, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x96a6b4,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    })
  );
  wrap.position.y = 32.5;
  wrap.name = 'loxWrap';
  root.add(wrap);
  root.userData.meshes = root.children;
  root.visible = false;
  return root;
}

export function setLoxVaporPlumes(root, k, time) {
  const t = THREE.MathUtils.clamp(k, 0, 1);
  root.visible = t > 0.02;
  root.children.forEach((m, i) => {
    const flicker = 0.78 + 0.22 * Math.sin(time * 11 + i * 1.7);
    m.material.opacity = t * 0.58 * flicker;
    m.scale.set(1.05 + t * 1.15, 0.85 + t * 1.45 * flicker, 1.05 + t * 1.15);
  });
}

export function updateLoxVent(field, rocket, k, dt) {
  const t = THREE.MathUtils.clamp(k, 0, 1);
  field.emitRate = 0;
  if (t < 0.02) {
    field.update(dt);
    return;
  }
  rocket.updateMatrixWorld(true);
  const n = Math.max(2, Math.floor(t * 10));
  for (let i = 0; i < n; i++) {
    const lp = VENT_LOCAL[i % VENT_LOCAL.length];
    field.origin.copy(lp).applyMatrix4(rocket.matrixWorld);
    field.burst(Math.ceil(2 + t * 5));
  }
  field.update(dt);
}

export function createDeluge() {
  return new ParticleField(2200, {
    color: 0xc5e8f6,
    size: 1.35,
    additive: true,
    spread: 0.4,
    down: 13,
    side: 1.6,
    lifeSpan: [0.35, 0.95],
    gravity: 11,
    yJitter: 0.25,
    alphaMul: 1,
    emitCap: 120,
  });
}

export function updateDeluge(field, rainbirds, k, dt) {
  const t = THREE.MathUtils.clamp(k, 0, 1);
  field.emitRate = 0;
  rainbirds.forEach((rb) => {
    const spray = rb.userData.spray;
    if (spray) {
      spray.material.opacity = t * (0.7 + 0.18 * Math.sin(performance.now() * 0.022 + rb.position.x));
      spray.scale.set(1.25 + t * 1.1, 1.05 + t * 1.55, 1.25 + t * 1.1);
    }
    if (t > 0.03) {
      rb.updateMatrixWorld(true);
      field.origin.set(0, 1.72, 0).applyMatrix4(rb.matrixWorld);
      const aim = rb.userData.aim || new THREE.Vector3(0, -0.4, -1);
      field.drift.copy(aim).multiplyScalar(18 + t * 14);
      field.burst(Math.ceil(3 + t * 8));
    }
  });
  field.update(dt);
}

export function createContrail() {
  return new ParticleField(2800, {
    color: 0xa8b6c4,
    size: 14,
    additive: false,
    spread: 2.2,
    down: 0.04,
    side: 0.9,
    lifeSpan: [3.5, 8.0],
    gravity: 0.04,
    grow: 5.5,
    yJitter: 2.0,
    alphaMul: 0.78,
    emitCap: 70,
  });
}

export function createContrailColumn() {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push(new THREE.Vector2(1.6 + Math.pow(t, 0.72) * 9.5, -t * 140));
  }
  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 18),
    new THREE.MeshBasicMaterial({
      color: 0xaab6c2,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    })
  );
  mesh.name = 'contrailColumn';
  mesh.position.y = -3.1;
  mesh.visible = false;
  mesh.frustumCulled = false;
  return mesh;
}

export function setContrailColumn(mesh, k) {
  const t = THREE.MathUtils.clamp(k, 0, 1);
  mesh.visible = t > 0.03;
  mesh.material.opacity = t * 0.4;
  mesh.scale.set(0.85 + t * 1.35, 0.55 + t * 1.7, 0.85 + t * 1.35);
}

export function setTrenchFlood(mesh, k) {
  if (!mesh) return;
  const t = THREE.MathUtils.clamp(k, 0, 1);
  mesh.material.opacity = t * 0.42;
  mesh.scale.set(1 + t * 0.35, 0.6 + t * 1.4, 1 + t * 0.2);
  mesh.visible = t > 0.04;
}

export function updateContrail(field, origin, k, dt) {
  const t = THREE.MathUtils.clamp(k, 0, 1);
  field.origin.copy(origin);
  field.emitRate = t * 36;
  field.update(dt);
}

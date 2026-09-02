import * as THREE from 'three';

function noiseCanvas(size, fn) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = fn(x, y, size);
      const i = (y * size + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const n00 = hash(xi, yi);
  const n10 = hash(xi + 1, yi);
  const n01 = hash(xi, yi + 1);
  const n11 = hash(xi + 1, yi + 1);
  return n00 * (1 - u) * (1 - v) + n10 * u * (1 - v) + n01 * (1 - u) * v + n11 * u * v;
}

function fbm(x, y) {
  let n = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < 5; i++) {
    n += a * valueNoise(x * f, y * f);
    f *= 2.03;
    a *= 0.5;
  }
  return n;
}

function makePaintRough() {
  const tex = noiseCanvas(256, (x, y) => {
    const n = fbm(x * 0.08, y * 0.045);
    const specks = hash(x * 0.9, y * 1.1) > 0.97 ? 40 : 0;
    const v = Math.min(255, 90 + n * 130 + specks);
    return [v, v, v, 255];
  });
  tex.colorSpace = THREE.NoColorSpace;
  tex.repeat.set(2, 10);
  return tex;
}

function makeMetalRough() {
  const tex = noiseCanvas(128, (x, y) => {
    const n = fbm(x * 0.2, y * 0.05);
    const v = 40 + n * 90;
    return [v, v, v, 255];
  });
  tex.colorSpace = THREE.NoColorSpace;
  tex.repeat.set(2, 6);
  return tex;
}

function makeConcreteMaps() {
  const albedo = noiseCanvas(256, (x, y) => {
    const n = fbm(x * 0.06, y * 0.06);
    const cracks = Math.abs(Math.sin(x * 0.2) * Math.sin(y * 0.11)) > 0.92 ? -18 : 0;
    const base = 78 + n * 55 + cracks;
    return [base + 4, base + 2, base - 2, 255];
  });
  albedo.repeat.set(6, 6);
  const rough = noiseCanvas(256, (x, y) => {
    const n = fbm(x * 0.1, y * 0.1);
    const v = 140 + n * 90;
    return [v, v, v, 255];
  });
  rough.colorSpace = THREE.NoColorSpace;
  rough.repeat.set(6, 6);
  return { albedo, rough };
}

function makeAsphalt() {
  const tex = noiseCanvas(256, (x, y) => {
    const n = fbm(x * 0.12, y * 0.12);
    const v = 28 + n * 36;
    return [v, v, v + 4, 255];
  });
  tex.repeat.set(14, 14);
  return tex;
}

function makeSootMap() {
  const tex = noiseCanvas(128, (x, y) => {
    const n = fbm(x * 0.09, y * 0.07);
    const v = 12 + n * 40;
    return [v + 4, v, v - 2, 255];
  });
  tex.repeat.set(2, 3);
  return tex;
}

export function makeMaterials() {
  const paintRough = makePaintRough();
  const metalRough = makeMetalRough();
  const concreteMaps = makeConcreteMaps();
  const asphaltMap = makeAsphalt();
  const sootMap = makeSootMap();

  const white = new THREE.MeshPhysicalMaterial({
    color: 0xf3efe6,
    metalness: 0.12,
    roughness: 0.36,
    roughnessMap: paintRough,
    bumpMap: paintRough,
    bumpScale: 0.04,
    clearcoat: 0.48,
    clearcoatRoughness: 0.32,
    sheen: 0.18,
    sheenColor: new THREE.Color(0xf2ead8),
    envMapIntensity: 1.15,
  });

  const black = new THREE.MeshPhysicalMaterial({
    color: 0x1c1e24,
    metalness: 0.62,
    roughness: 0.32,
    roughnessMap: metalRough,
    clearcoat: 0.22,
    clearcoatRoughness: 0.4,
    envMapIntensity: 1.05,
  });

  const metal = new THREE.MeshPhysicalMaterial({
    color: 0x9aa3ab,
    metalness: 0.96,
    roughness: 0.18,
    roughnessMap: metalRough,
    envMapIntensity: 1.35,
  });

  const copper = new THREE.MeshPhysicalMaterial({
    color: 0x8a5a36,
    metalness: 0.9,
    roughness: 0.26,
    roughnessMap: metalRough,
    envMapIntensity: 1.2,
  });

  const carbon = new THREE.MeshPhysicalMaterial({
    color: 0x2a2d33,
    metalness: 0.42,
    roughness: 0.52,
    roughnessMap: paintRough,
    bumpMap: paintRough,
    bumpScale: 0.06,
    envMapIntensity: 0.9,
  });

  const concrete = new THREE.MeshPhysicalMaterial({
    color: 0xb7b3ab,
    map: concreteMaps.albedo,
    roughness: 0.94,
    roughnessMap: concreteMaps.rough,
    bumpMap: concreteMaps.rough,
    bumpScale: 0.18,
    metalness: 0.03,
    envMapIntensity: 0.45,
  });

  const rustSteel = new THREE.MeshPhysicalMaterial({
    color: 0x7a828c,
    metalness: 0.78,
    roughness: 0.38,
    roughnessMap: metalRough,
    clearcoat: 0.08,
    envMapIntensity: 1.05,
  });

  const heat = new THREE.MeshPhysicalMaterial({
    color: 0x3a2a22,
    metalness: 0.48,
    roughness: 0.62,
    map: sootMap,
    envMapIntensity: 0.7,
  });

  const asphalt = new THREE.MeshPhysicalMaterial({
    color: 0x3a3e46,
    map: asphaltMap,
    roughness: 0.96,
    metalness: 0.02,
    envMapIntensity: 0.3,
  });

  const charred = new THREE.MeshPhysicalMaterial({
    color: 0x1a1410,
    map: sootMap,
    roughness: 0.9,
    metalness: 0.12,
    envMapIntensity: 0.4,
  });

  const titanium = new THREE.MeshPhysicalMaterial({
    color: 0xc6b9a2,
    metalness: 0.93,
    roughness: 0.26,
    roughnessMap: metalRough,
    clearcoat: 0.2,
    envMapIntensity: 1.25,
  });

  const lamp = new THREE.MeshStandardMaterial({
    color: 0xc8b894,
    emissive: 0x3a3018,
    emissiveIntensity: 0.12,
    roughness: 0.55,
    metalness: 0.15,
  });

  return {
    white,
    black,
    metal,
    copper,
    carbon,
    concrete,
    rustSteel,
    heat,
    asphalt,
    charred,
    titanium,
    lamp,
  };
}

export const ENGINE_LAYOUT = (() => {
  const pts = [{ x: 0, z: 0 }];
  const ring = 3.55;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    pts.push({ x: Math.cos(a) * ring, z: Math.sin(a) * ring });
  }
  return pts;
})();

import * as THREE from 'three';

export const EARTH_R = 1600;

function paintEarth() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');

  const ocean = g.createLinearGradient(0, 0, 0, 512);
  ocean.addColorStop(0, '#9ec9e8');
  ocean.addColorStop(0.12, '#1e6aaa');
  ocean.addColorStop(0.5, '#0d4a8c');
  ocean.addColorStop(0.88, '#1e6aaa');
  ocean.addColorStop(1, '#cfe8f4');
  g.fillStyle = ocean;
  g.fillRect(0, 0, 1024, 512);

  const blob = (x, y, rx, ry, color) => {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  };

  const land = '#3d8a4a';
  const land2 = '#6a9a4a';
  const desert = '#c4a56a';
  const ice = '#f4f8fc';

  blob(180, 230, 70, 110, land);
  blob(210, 300, 55, 80, land2);
  blob(160, 150, 50, 40, land);
  blob(140, 360, 28, 70, land2);

  blob(470, 250, 55, 95, desert);
  blob(500, 210, 40, 50, land);
  blob(560, 280, 90, 40, desert);
  blob(620, 200, 120, 55, land);
  blob(700, 240, 80, 70, land2);
  blob(780, 210, 70, 45, land);
  blob(540, 330, 35, 55, land2);

  blob(850, 360, 38, 22, desert);
  blob(900, 200, 22, 28, land2);

  blob(512, 18, 520, 48, ice);
  blob(512, 494, 520, 42, ice);

  g.globalAlpha = 0.18;
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 1024;
    const y = 40 + Math.random() * 430;
    g.beginPath();
    g.ellipse(x, y, 18 + Math.random() * 40, 6 + Math.random() * 12, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function paintClouds() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 1024, 512);
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 140; i++) {
    g.globalAlpha = 0.12 + Math.random() * 0.35;
    const x = Math.random() * 1024;
    const y = 30 + Math.random() * 450;
    g.beginPath();
    g.ellipse(x, y, 20 + Math.random() * 70, 8 + Math.random() * 22, Math.random() * 0.6, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function atmosphereMat(color, intensity, power, side) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uPower: { value: power },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uPower;
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vW);
        float fres = pow(1.0 - abs(dot(viewDir, normalize(vN))), uPower);
        float a = clamp(fres * uIntensity, 0.0, 1.0);
        gl_FragColor = vec4(uColor, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    side,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

export function createEarth() {
  const root = new THREE.Group();
  root.name = 'earth';

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R, 96, 64),
    new THREE.MeshStandardMaterial({
      map: paintEarth(),
      roughness: 0.72,
      metalness: 0.04,
    })
  );
  globe.receiveShadow = false;
  globe.castShadow = false;
  root.add(globe);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R * 1.008, 64, 48),
    new THREE.MeshLambertMaterial({
      map: paintClouds(),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  root.add(clouds);

  const atmosIn = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R * 1.018, 64, 48),
    atmosphereMat(0x7ec8ff, 0.55, 3.2, THREE.FrontSide)
  );
  root.add(atmosIn);

  const atmosOut = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R * 1.07, 64, 48),
    atmosphereMat(0x4aa0ff, 1.15, 2.15, THREE.BackSide)
  );
  root.add(atmosOut);

  root.userData = { globe, clouds, atmosIn, atmosOut };
  root.visible = false;
  return root;
}

export function createSpaceStars() {
  const group = new THREE.Group();
  group.name = 'spaceStars';
  const geo = new THREE.BufferGeometry();
  const count = 2800;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 9000 + Math.random() * 6000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xe8f0ff,
      size: 3.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    })
  );
  group.add(pts);
  group.userData.mat = pts.material;
  group.visible = true;
  return group;
}

export function updateEarth(earth, dt) {
  if (!earth.visible) return;
  earth.rotation.y += dt * 0.015;
  earth.userData.clouds.rotation.y += dt * 0.01;
}

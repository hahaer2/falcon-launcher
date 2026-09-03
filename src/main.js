import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { makeMaterials } from './materials.js';
import { createRocket } from './rocket.js';
import { createPad, createSky } from './pad.js';
import { createEarth, createSpaceStars, updateEarth, EARTH_R } from './earth.js';
import {
  createPlume,
  createVacPlume,
  createPadSpill,
  ParticleField,
  setPlumeIntensity,
  setPadSpill,
  pulseVacPlume,
  createLoxVent,
  updateLoxVent,
  createLoxVaporPlumes,
  setLoxVaporPlumes,
  createDeluge,
  updateDeluge,
  createContrail,
  updateContrail,
  createContrailColumn,
  setContrailColumn,
  setTrenchFlood,
} from './effects.js';

const canvas = document.getElementById('c');
const hud = {
  alt: document.getElementById('hud-alt'),
  vel: document.getElementById('hud-vel'),
  fuel: document.getElementById('hud-fuel'),
  thrust: document.getElementById('hud-thrust'),
  pitch: document.getElementById('hud-pitch'),
  stage: document.getElementById('hud-stage'),
  status: document.getElementById('hud-status'),
  tclock: document.getElementById('tclock'),
};
const fuelSlider = document.getElementById('fuel-slider');
const thrustSlider = document.getElementById('thrust-slider');
const angleSlider = document.getElementById('angle-slider');
const fuelVal = document.getElementById('fuel-val');
const thrustVal = document.getElementById('thrust-val');
const angleVal = document.getElementById('angle-val');
const countdownBig = document.getElementById('countdown-big');
const btnIgnite = document.getElementById('btn-ignite');
const btnLaunch = document.getElementById('btn-launch');
const btnReset = document.getElementById('btn-reset');
const btnDestruct = document.getElementById('btn-destruct');
const camBtns = {
  free: document.getElementById('btn-cam-free'),
  follow: document.getElementById('btn-cam-follow'),
  rocket: document.getElementById('btn-cam-rocket'),
  earth: document.getElementById('btn-cam-earth'),
};
const overlay = document.getElementById('overlay');
const boomFlash = document.getElementById('boom-flash');
const overlayCard = document.getElementById('overlay-card');
const btnOverlayReset = document.getElementById('btn-overlay-reset');

const G = 9.81;
const MAX_THRUST = 28;
const TARGET_ALT = 4200;
const PAD_Y = 3.6;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;

function makeDayEnv() {
  const envScene = new THREE.Scene();
  envScene.add(new THREE.HemisphereLight(0xb7d8ff, 0xcbb89a, 2.4));
  const sunE = new THREE.DirectionalLight(0xfff6e4, 3.6);
  sunE.position.set(5, 9, 3);
  envScene.add(sunE);
  const fillE = new THREE.DirectionalLight(0xc5dcff, 0.7);
  fillE.position.set(-4, 2, -3);
  envScene.add(fillE);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(envScene, 0).texture;
  pmrem.dispose();
  return tex;
}

const scene = new THREE.Scene();
scene.environment = makeDayEnv();
scene.environmentIntensity = 1.05;
scene.background = new THREE.Color(0x7eb7ea);
const dayFog = new THREE.Fog(0xb7d8ee, 780, 3800);
scene.fog = dayFog;

const FRAMING = {
  // Follow cam must keep the FULL ~70m Falcon stack in frame (FOV 36°).
  wide: {
    pos: new THREE.Vector3(78, 28, 118),
    target: new THREE.Vector3(0, 34, 0),
  },
  hero: {
    pos: new THREE.Vector3(52, 22, 88),
    target: new THREE.Vector3(0, 32, 0),
  },
};

const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.2, 40000);
camera.position.copy(FRAMING.wide.pos);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minPolarAngle = 0.12;
controls.maxPolarAngle = Math.PI * 0.86;
controls.minDistance = 40;
controls.maxDistance = 2500;
controls.target.copy(FRAMING.wide.target);

const hemi = new THREE.HemisphereLight(0xd4e7ff, 0x8a7a5c, 1.15);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff1c8, 4.1);
sun.position.set(90, 160, 55);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 8;
sun.shadow.camera.far = 520;
sun.shadow.camera.left = -160;
sun.shadow.camera.right = 160;
sun.shadow.camera.top = 180;
sun.shadow.camera.bottom = -80;
sun.shadow.bias = -0.00018;
sun.shadow.normalBias = 0.04;
scene.add(sun);

const sunFill = new THREE.DirectionalLight(0xc5d8f2, 0.55);
sunFill.position.set(-70, 40, -50);
scene.add(sunFill);

const mats = makeMaterials();
const pad = createPad(mats);
scene.add(pad);
const daySky = createSky();
scene.add(daySky);

const earth = createEarth();
scene.add(earth);
const spaceStars = createSpaceStars();
scene.add(spaceStars);

const rocket = createRocket(mats);
rocket.position.set(0, PAD_Y, 0);
scene.add(rocket);

const plume = createPlume();
rocket.userData.first.add(plume);

const loxMeshes = createLoxVaporPlumes();
rocket.userData.first.add(loxMeshes);
const contrailColumn = createContrailColumn();
rocket.userData.first.add(contrailColumn);

const vacPlume = createVacPlume();
vacPlume.position.y = -0.6;
rocket.userData.second.add(vacPlume);

const padSpill = createPadSpill();
scene.add(padSpill);

const loxVent = createLoxVent();
scene.add(loxVent.points);
const deluge = createDeluge();
scene.add(deluge.points);
const contrail = createContrail();
scene.add(contrail.points);

const DAY_BG = new THREE.Color(0x7eb7ea);
const SPACE_BG = new THREE.Color(0x050910);
const DAY_FOG = new THREE.Color(0xb7d8ee);
let teRetract = 0;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.06,
  0.22,
  0.97
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const sparks = new ParticleField(900, {
  color: 0xffb060,
  size: 0.45,
  opacity: 0.8,
  additive: true,
  spread: 2.4,
  down: 22,
  side: 4,
  lifeSpan: [0.25, 0.9],
});
scene.add(sparks.points);

const smoke = new ParticleField(1400, {
  color: 0xb8c0c8,
  size: 1.8,
  opacity: 0.35,
  additive: false,
  spread: 5,
  down: 6,
  side: 7,
  lifeSpan: [1.2, 3.2],
});
scene.add(smoke.points);

const groundSmoke = new ParticleField(2400, {
  color: 0xc5c8cc,
  size: 5.4,
  additive: false,
  spread: 7,
  down: -1,
  side: 10,
  lifeSpan: [1.8, 4.4],
  ground: true,
});
scene.add(groundSmoke.points);

const COUNTDOWN_SEC = 5;
const shake = { intensity: 0 };
const debrisPieces = [];
const _debrisTmp = new THREE.Vector3();
const boomFX = new ParticleField(1800, {
  color: 0xff6a2a,
  size: 18,
  opacity: 1,
  additive: true,
  spread: 22,
  down: -8,
  side: 95,
  lifeSpan: [0.9, 2.4],
  yJitter: 28,
  gravity: 6,
  emitCap: 200,
  grow: 8,
});
scene.add(boomFX.points);

const boomSmoke = new ParticleField(1600, {
  color: 0x9aa3ad,
  size: 22,
  opacity: 0.85,
  additive: false,
  spread: 28,
  down: -4,
  side: 70,
  lifeSpan: [1.6, 3.8],
  yJitter: 24,
  gravity: 3,
  emitCap: 120,
  grow: 12,
  alphaMul: 0.9,
});
scene.add(boomSmoke.points);

const fireballMat = new THREE.MeshBasicMaterial({
  color: 0xffaa44,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
});
const fireball = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), fireballMat);
fireball.visible = false;
scene.add(fireball);
const fireballCore = new THREE.Mesh(
  new THREE.SphereGeometry(0.55, 16, 12),
  new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }),
);
fireball.add(fireballCore);
const boomLight = new THREE.PointLight(0xff7a30, 0, 420, 1.4);
boomLight.visible = false;
scene.add(boomLight);
const boomState = { t: 0, active: false, startedAt: 0, origin: new THREE.Vector3() };
let destructOverlayTimer = 0;

const SPACE_ALT = 1500;
let camMode = 'follow';
const _up = new THREE.Vector3();
const _east = new THREE.Vector3();
const _onboardPos = new THREE.Vector3();
const _onboardLook = new THREE.Vector3();

function setCamMode(mode) {
  const prev = camMode;
  camMode = mode;
  Object.entries(camBtns).forEach(([key, btn]) => {
    btn.classList.toggle('active', key === mode);
  });

  const high =
    mode === 'earth' ||
    (state &&
      (state.phase === 'flying' || state.phase === 'success') &&
      state.y - PAD_Y >= SPACE_ALT);

  if (mode === 'earth') {
    const dir = new THREE.Vector3(90, 160, 55).normalize();
    camera.position.copy(dir.multiplyScalar(EARTH_R * 3.25));
    controls.target.set(0, 0, 0);
    controls.minDistance = EARTH_R * 1.55;
    controls.maxDistance = EARTH_R * 6.5;
    controls.minPolarAngle = 0.08;
    controls.maxPolarAngle = Math.PI * 0.92;
    controls.enabled = true;
    camera.near = 2;
    camera.far = 40000;
    camera.fov = 34;
  } else if (mode === 'rocket') {
    controls.enabled = false;
    camera.near = 0.12;
    camera.far = 40000;
    camera.fov = 55;
  } else {
    if (prev === 'earth' && !high) {
      camera.position.copy(FRAMING.wide.pos);
      controls.target.copy(FRAMING.wide.target);
    }
    controls.enabled = true;
    controls.minDistance = high ? 90 : 40;
    controls.maxDistance = high ? EARTH_R * 7 : 2500;
    controls.minPolarAngle = 0.08;
    controls.maxPolarAngle = Math.PI * 0.9;
    camera.near = 0.2;
    camera.far = 40000;
    camera.fov = 36;
  }
  camera.updateProjectionMatrix();
}

const state = {
  phase: 'idle',
  countdown: 0,
  countdownTimer: null,
  missionT: 0,
  clockRunning: false,
  x: 0,
  y: PAD_Y,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: 0,
  fuel: 100,
  thrustPct: 90,
  yawDeg: 0,
  ignited: false,
  staged: false,
  firstDetached: false,
  first: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 },
  earthRevealed: false,
};

function addShake(n) {
  shake.intensity = Math.min(22, shake.intensity + n);
}

function formatClock(t) {
  const sign = t < 0 ? '−' : '+';
  const s = Math.trunc(Math.abs(t));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `T${sign}${mm}:${ss}`;
}

function setStatus(text) {
  hud.status.textContent = text;
}

function spaceBlend() {
  if (camMode === 'earth') return 1;
  if (state.phase !== 'flying' && state.phase !== 'success') return 0;
  return THREE.MathUtils.smoothstep(140, 1780, state.y - PAD_Y);
}

function useSpaceLayout() {
  if (camMode === 'earth') return true;
  return spaceBlend() > 0.92;
}

function applySkyFade(blend) {
  scene.background.copy(DAY_BG).lerp(SPACE_BG, blend);
  if (blend < 0.9) {
    scene.fog = dayFog;
    dayFog.color.copy(DAY_FOG).lerp(SPACE_BG, blend * 0.9);
    dayFog.near = THREE.MathUtils.lerp(780, 180, blend);
    dayFog.far = THREE.MathUtils.lerp(3800, 1200, blend);
  } else {
    scene.fog = null;
  }
  const sky = daySky.userData;
  if (sky.skyMat) sky.skyMat.uniforms.uFade.value = blend;
  if (sky.sun) sky.sun.material.opacity = 1 - blend;
  if (sky.halo) sky.halo.material.opacity = 0.22 * (1 - blend);
  daySky.visible = blend < 0.98;
  if (spaceStars.userData.mat) {
    spaceStars.userData.mat.opacity = THREE.MathUtils.clamp((blend - 0.08) / 0.45, 0, 0.92);
  }
  spaceStars.visible = blend > 0.08;
  hemi.intensity = THREE.MathUtils.lerp(1.15, 0.22, blend);
  sun.intensity = THREE.MathUtils.lerp(4.1, 2.8, blend);
  scene.environmentIntensity = THREE.MathUtils.lerp(1.05, 0.42, blend);
}

function setTeRetract(t) {
  const te = pad.userData.strongback || pad.getObjectByName('strongback');
  if (!te) return;
  if (te.userData.homeX === undefined) te.userData.homeX = te.position.x;
  const k = THREE.MathUtils.clamp(t, 0, 1);
  te.position.x = te.userData.homeX - k * 9;
  te.rotation.z = k * 1.08;
  const arms = te.userData.arms || te.getObjectByName('teArms');
  if (arms) arms.rotation.z = -k * 1.2;
}

function syncRocketTransform() {
  const blend = spaceBlend();
  const space = useSpaceLayout();
  applySkyFade(blend);
  pad.visible = !space;
  earth.visible = space;
  padSpill.visible = !space;
  groundSmoke.points.visible = !space;
  loxVent.points.visible = !space;
  deluge.points.visible = !space;
  contrail.points.visible = !space || blend < 0.96;

  if (space) {
    const alt = Math.max(0, state.y - PAD_Y);
    const R = EARTH_R + 70 + alt * 0.05;
    const lat = 0.48;
    const lon = 1.32 + alt * 0.00014 + state.x * 0.0012;
    const x = R * Math.cos(lat) * Math.sin(lon);
    const y = R * Math.sin(lat);
    const z = R * Math.cos(lat) * Math.cos(lon);
    rocket.position.set(x, y, z);
    _up.set(x, y, z).normalize();
    rocket.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _up);
    rocket.rotateZ(THREE.MathUtils.degToRad(-state.yaw));
    if (state.firstDetached) {
      const first = scene.getObjectByName('firstStage');
      if (first && first.parent !== rocket) {
        first.position.copy(rocket.position).addScaledVector(_up, -42);
        first.quaternion.copy(rocket.quaternion);
        first.rotateZ(0.38);
      }
    }
  } else {
    rocket.position.set(state.x, state.y, state.z);
    rocket.quaternion.identity();
    rocket.rotation.set(0, 0, THREE.MathUtils.degToRad(-state.yaw));
  }

  if (camMode === 'follow' || camMode === 'free') {
    controls.minDistance = space ? 90 : 40;
    controls.maxDistance = space ? EARTH_R * 7 : 2500;
  }
}

function worldEnginePos() {
  const p = new THREE.Vector3(0, state.y - 0.4, 0);
  p.x = state.x;
  p.z = state.z;
  return p;
}

function startIgnite() {
  if (state.phase !== 'idle') return;
  state.phase = 'ignited';
  state.ignited = true;
  state.fuel = parseInt(fuelSlider.value, 10);
  state.thrustPct = parseInt(thrustSlider.value, 10);
  state.yawDeg = parseInt(angleSlider.value, 10);
  fuelSlider.disabled = true;
  angleSlider.disabled = true;
  btnIgnite.disabled = true;
  btnLaunch.disabled = false;
  setStatus('主机关机前点火');
  addShake(5);
  sparks.origin.copy(worldEnginePos());
  sparks.burst(80);
  smoke.origin.copy(worldEnginePos());
  smoke.burst(60);
  groundSmoke.origin.set(0, 0.6, 0);
  groundSmoke.burst(140);
}

function startCountdown() {
  if (state.phase !== 'ignited') return;
  state.phase = 'countdown';
  state.countdown = COUNTDOWN_SEC;
  state.missionT = -COUNTDOWN_SEC;
  state.clockRunning = true;
  btnLaunch.disabled = true;
  setStatus('倒计时');
  countdownBig.classList.add('show');
  countdownBig.textContent = `T−${COUNTDOWN_SEC}`;
  addShake(2);
}

function launch() {
  if (state.phase === 'flying') return;
  state.phase = 'flying';
  state.missionT = 0;
  state.clockRunning = true;
  setStatus('升空');
  countdownBig.textContent = '升空';
  setTimeout(() => countdownBig.classList.remove('show'), 900);
  addShake(12);
  sparks.burst(180);
  smoke.burst(120);
  groundSmoke.burst(280);
}

function separate() {
  if (state.staged) return;
  state.staged = true;
  state.firstDetached = true;
  setStatus('级间分离');
  hud.stage.textContent = '二级';

  const first = rocket.userData.first;
  scene.attach(first);
  state.first.x = first.position.x;
  state.first.y = first.position.y;
  state.first.z = first.position.z;
  state.first.vx = state.vx * 0.92;
  state.first.vy = state.vy * 0.55 - 2;
  state.first.vz = state.vz * 0.92;

  const lift = rocket.userData.firstHeight;
  rocket.userData.second.position.y = 0;
  rocket.userData.fairing.position.y = rocket.userData.secondLen;
  state.y += lift;

  plume.visible = false;
  const vac = rocket.userData.second.getObjectByName('vacEngine');
  if (vac) vac.visible = true;
  addShake(6);
  sparks.burst(50);
}


function clearDebris() {
  while (debrisPieces.length) {
    const d = debrisPieces.pop();
    scene.remove(d.mesh);
    if (d.disposable) {
      d.mesh.geometry?.dispose?.();
      if (d.mesh.material) {
        if (Array.isArray(d.mesh.material)) d.mesh.material.forEach((m) => m.dispose?.());
        else d.mesh.material.dispose?.();
      }
    }
  }
  rocket.visible = true;
}

function flingPart(obj, impulseScale) {
  if (!obj) return;
  obj.updateMatrixWorld(true);
  const worldPos = new THREE.Vector3();
  const worldQuat = new THREE.Quaternion();
  obj.getWorldPosition(worldPos);
  obj.getWorldQuaternion(worldQuat);
  scene.attach(obj);
  obj.position.copy(worldPos);
  obj.quaternion.copy(worldQuat);
  const dir = new THREE.Vector3(
    (Math.random() - 0.5) * 2,
    0.35 + Math.random() * 1.2,
    (Math.random() - 0.5) * 2,
  ).normalize();
  debrisPieces.push({
    mesh: obj,
    vel: dir.multiplyScalar(48 + Math.random() * 90 * impulseScale),
    spin: new THREE.Vector3(
      (Math.random() - 0.5) * 7,
      (Math.random() - 0.5) * 7,
      (Math.random() - 0.5) * 7,
    ),
  });
}


function spawnBoomChunks(at) {
  const mats = [
    new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.62, metalness: 0.18 }),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.7, metalness: 0.35 }),
    new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.55, metalness: 0.4 }),
    new THREE.MeshStandardMaterial({ color: 0xff6a2a, roughness: 0.85, metalness: 0.05, emissive: 0xff4000, emissiveIntensity: 0.8 }),
  ];
  for (let i = 0; i < 28; i++) {
    const kind = i % 4;
    let geo;
    if (kind === 0) geo = new THREE.CylinderGeometry(0.35 + Math.random() * 0.9, 0.4 + Math.random(), 2 + Math.random() * 6, 8);
    else if (kind === 1) geo = new THREE.BoxGeometry(1 + Math.random() * 3, 0.25 + Math.random() * 1.2, 1 + Math.random() * 2.5);
    else if (kind === 2) geo = new THREE.SphereGeometry(0.4 + Math.random() * 1.1, 8, 6);
    else geo = new THREE.ConeGeometry(0.5 + Math.random(), 2 + Math.random() * 4, 6);
    const mesh = new THREE.Mesh(geo, mats[kind]);
    mesh.castShadow = true;
    mesh.position.copy(at);
    mesh.position.x += (Math.random() - 0.5) * 10;
    mesh.position.y += (Math.random() - 0.5) * 18;
    mesh.position.z += (Math.random() - 0.5) * 10;
    scene.add(mesh);
    const dir = new THREE.Vector3((Math.random() - 0.5) * 2, 0.5 + Math.random(), (Math.random() - 0.5) * 2).normalize();
    debrisPieces.push({
      mesh,
      vel: dir.multiplyScalar(35 + Math.random() * 95),
      spin: new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10),
      disposable: true,
    });
  }
}

function destroyRocket() {
  if (state.phase === 'destroyed' || state.phase === 'success' || state.phase === 'crash') return;
  clearInterval(state.countdownTimer);
  countdownBig.classList.remove('show');
  setPlumeIntensity(plume, 0, 0);
  setPadSpill(padSpill, 0, 0);
  setLoxVaporPlumes(loxMeshes, 0, 0);
  vacPlume.visible = false;
  plume.visible = false;

  // Never leave a previous end card up while the boom plays
  overlay.classList.remove('show', 'peek', 'destruct-peek');

  rocket.updateMatrixWorld(true);
  const boomAt = new THREE.Vector3();
  rocket.getWorldPosition(boomAt);
  boomAt.y += (rocket.userData.totalHeight || 70) * 0.45;

  boomState.active = true;
  boomState.t = 0;
  boomState.startedAt = performance.now();
  boomState.origin.copy(boomAt);

  fireball.position.copy(boomAt);
  fireball.scale.setScalar(28);
  fireballMat.opacity = 1;
  fireballCore.material.opacity = 1;
  fireball.visible = true;
  boomLight.position.copy(boomAt);
  boomLight.intensity = 3200;
  boomLight.visible = true;

  boomFX.origin.copy(boomAt);
  boomSmoke.origin.copy(boomAt);
  sparks.origin.copy(boomAt);
  smoke.origin.copy(boomAt);
  boomFX.burst(900);
  boomSmoke.burst(700);
  sparks.burst(650);
  smoke.burst(520);
  groundSmoke.origin.set(boomAt.x, 0.6, boomAt.z);
  if (boomAt.y < 160) groundSmoke.burst(220);
  addShake(48);
  bloomPass.strength = 1.8;
  bloomPass.threshold = 0.4;
  bloomPass.radius = 0.55;

  // Guaranteed-visible screen flash (DOM, not WebGL)
  if (boomFlash) {
    boomFlash.classList.remove('fade');
    boomFlash.classList.add('on');
    setTimeout(() => {
      if (!boomFlash) return;
      boomFlash.classList.remove('on');
      boomFlash.classList.add('fade');
    }, 450);
  }

  flingPart(rocket.userData.fairing, 1.8);
  flingPart(rocket.userData.second, 1.4);
  flingPart(rocket.userData.first, 1.15);
  spawnBoomChunks(boomAt);
  rocket.visible = false;

  state.vx = 0;
  state.vy = 0;
  state.vz = 0;
  state.phase = 'destroyed';
  state.clockRunning = false;
  setStatus('空中解体');
  btnIgnite.disabled = true;
  btnLaunch.disabled = true;
  if (btnDestruct) btnDestruct.disabled = true;
  if (camMode === 'rocket' || camMode === 'earth') setCamMode('follow');

  // End card only after the boom has been on screen
  clearTimeout(destructOverlayTimer);
  destructOverlayTimer = setTimeout(() => {
    if (state.phase !== 'destroyed') return;
    endGame('destroyed');
  }, 3200);
}

function updateDebris(dt) {
  if (boomState.active) {
    // Wall-clock so throttled browsers still see the blast grow
    const wall = boomState.startedAt
      ? (performance.now() - boomState.startedAt) / 1000
      : (boomState.t += dt, boomState.t);
    boomState.t = wall;
    const u = Math.min(1, wall / 1.8);
    const grow = 28 + u * 110;
    fireball.scale.setScalar(grow);
    fireballMat.opacity = Math.max(0, 1 - u * 1.05);
    fireballCore.material.opacity = Math.max(0, 1 - u * 1.45);
    boomLight.intensity = Math.max(0, 3200 * (1 - u) * (1 - u));
    bloomPass.strength = THREE.MathUtils.lerp(1.8, 0.1, Math.min(1, wall / 1.4));
    bloomPass.threshold = THREE.MathUtils.lerp(0.4, 0.94, Math.min(1, wall / 1.4));
    if (u >= 1) {
      boomState.active = false;
      fireball.visible = false;
      boomLight.visible = false;
      boomLight.intensity = 0;
    }
  }
  for (let i = debrisPieces.length - 1; i >= 0; i--) {
    const d = debrisPieces[i];
    d.vel.y -= 22 * dt;
    d.mesh.position.x += d.vel.x * dt;
    d.mesh.position.y += d.vel.y * dt;
    d.mesh.position.z += d.vel.z * dt;
    d.mesh.rotation.x += d.spin.x * dt;
    d.mesh.rotation.y += d.spin.y * dt;
    d.mesh.rotation.z += d.spin.z * dt;
    if (d.mesh.position.y < -120) {
      scene.remove(d.mesh);
      debrisPieces.splice(i, 1);
    }
  }
  boomFX.update(dt);
  boomSmoke.update(dt);
}

function endGame(result) {
  state.phase = result;
  state.clockRunning = false;
  const success = result === 'success';
  const destroyed = result === 'destroyed';
  setStatus(success ? '入轨成功' : destroyed ? '空中解体' : '任务失败');
  overlayCard.className = success ? 'success' : 'crash';
  overlayCard.querySelector('h2').textContent = success
    ? '进入预定轨道'
    : destroyed
      ? '空中解体'
      : '火箭坠毁';
  overlayCard.querySelector('p').textContent = success
    ? `最大高度 ${Math.round(state.y)} m，二级点火正常，任务完成。`
    : destroyed
      ? `指令自毁已执行。高度 ${Math.max(0, Math.round(state.y - PAD_Y))} m，碎片四散。`
      : '推力、姿态或燃料不足，飞行器未能维持上升。';
  if (destroyed) {
    overlay.classList.remove('peek');
    overlay.classList.add('destruct-peek', 'show');
  } else {
    overlay.classList.remove('destruct-peek');
    overlay.classList.add('show');
    overlay.classList.toggle('peek', success);
  }
  if (success) setCamMode('earth');
  btnIgnite.disabled = true;
  btnLaunch.disabled = true;
  if (btnDestruct) btnDestruct.disabled = true;
  if (!success && !destroyed) {
    addShake(16);
    sparks.origin.set(state.x, Math.max(2, state.y), state.z);
    sparks.burst(220);
    smoke.burst(160);
  }
}

function fullReset() {
  clearDebris();
  clearTimeout(destructOverlayTimer);
  boomState.active = false;
  fireball.visible = false;
  fireballMat.opacity = 0;
  boomLight.visible = false;
  boomLight.intensity = 0;
  bloomPass.strength = 0.1;
  bloomPass.threshold = 0.94;
  clearInterval(state.countdownTimer);
  if (state.firstDetached) {
    const first = scene.getObjectByName('firstStage');
    if (first) {
      rocket.add(first);
      first.position.set(0, 0, 0);
      first.rotation.set(0, 0, 0);
    }
  }
  const vac = rocket.userData.second.getObjectByName('vacEngine');
  if (vac) vac.visible = false;
  vacPlume.visible = false;
  rocket.userData.second.position.y = rocket.userData.secondHomeY;
  rocket.userData.fairing.position.y = rocket.userData.fairingHomeY;


  // Reattach stages after self-destruct scatter
  if (rocket.userData.first && rocket.userData.first.parent !== rocket) {
    rocket.add(rocket.userData.first);
    rocket.userData.first.position.set(0, 0, 0);
    rocket.userData.first.rotation.set(0, 0, 0);
  }
  if (rocket.userData.second && rocket.userData.second.parent !== rocket) {
    rocket.add(rocket.userData.second);
    rocket.userData.second.position.set(0, rocket.userData.secondHomeY, 0);
    rocket.userData.second.rotation.set(0, 0, 0);
  }
  if (rocket.userData.fairing && rocket.userData.fairing.parent !== rocket) {
    rocket.add(rocket.userData.fairing);
    rocket.userData.fairing.position.set(0, rocket.userData.fairingHomeY, 0);
    rocket.userData.fairing.rotation.set(0, 0, 0);
  }
  rocket.visible = true;
  if (btnDestruct) btnDestruct.disabled = false;

  Object.assign(state, {
    phase: 'idle',
    countdown: 0,
    missionT: 0,
    clockRunning: false,
    x: 0,
    y: PAD_Y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    ignited: false,
    staged: false,
    firstDetached: false,
    earthRevealed: false,
  });
  state.fuel = parseInt(fuelSlider.value, 10);
  state.thrustPct = parseInt(thrustSlider.value, 10);
  state.yawDeg = parseInt(angleSlider.value, 10);

  fuelSlider.disabled = false;
  thrustSlider.disabled = false;
  angleSlider.disabled = false;
  btnIgnite.disabled = false;
  btnLaunch.disabled = true;
  overlay.classList.remove('show', 'peek', 'destruct-peek');
  if (boomFlash) boomFlash.classList.remove('on', 'fade');
  countdownBig.classList.remove('show');
  shake.intensity = 0;
  teRetract = 0;
  setTeRetract(0);
  setPlumeIntensity(plume, 0, 0);
  setPadSpill(padSpill, 0, 0);
  setLoxVaporPlumes(loxMeshes, 0, 0);
  updateLoxVent(loxVent, rocket, 0, 0.016);
  updateDeluge(deluge, pad.userData.rainbirds || [], 0, 0.016);
  setContrailColumn(contrailColumn, 0);
  setTrenchFlood(pad.userData.trenchFlood, 0);
  updateContrail(contrail, worldEnginePos(), 0, 0.016);
  syncRocketTransform();
  setStatus('待命中');
  hud.stage.textContent = '一级';
  setCamMode('follow');
  camera.position.copy(FRAMING.wide.pos);
  controls.target.copy(FRAMING.wide.target);
}

function updatePhysics(dt) {
  if (state.phase !== 'flying' && state.phase !== 'success' && state.phase !== 'crash') return;
  if (state.phase !== 'flying') {
    if (state.firstDetached) integrateFirst(dt);
    return;
  }

  state.yaw = THREE.MathUtils.damp(state.yaw, state.yawDeg, 2.2, dt);
  const thrust = (state.thrustPct / 100) * MAX_THRUST;
  const burning = state.fuel > 0 && thrust > 0;
  const rad = THREE.MathUtils.degToRad(state.yaw);

  if (burning) {
    const ax = Math.sin(rad) * thrust;
    const ay = Math.cos(rad) * thrust;
    if (state.staged) {
      state.vx += ax * 0.55 * dt;
      state.vy += ay * 0.72 * dt;
    } else {
      state.vx += ax * dt;
      state.vy += ay * dt;
    }
    const burn = (state.thrustPct / 100) * (state.staged ? 5.5 : 7.2) * dt;
    state.fuel = Math.max(0, state.fuel - burn);
    addShake(thrust * 0.012);
  }

  state.vy -= G * dt;
  state.x += state.vx * dt;
  state.y += state.vy * dt;
  state.z += state.vz * dt;

  if (!state.staged && (state.y > 900 || state.fuel < 42)) {
    separate();
  }

  if (state.y > TARGET_ALT && state.vy > 0) {
    endGame('success');
    return;
  }

  if (state.y <= PAD_Y) {
    if (state.vy < -8 || Math.abs(state.vx) > 6 || state.y < PAD_Y - 2) {
      state.y = PAD_Y;
      endGame('crash');
    } else if (state.fuel <= 0 && state.vy <= 0) {
      state.y = PAD_Y;
      endGame('crash');
    } else {
      state.y = PAD_Y;
      if (state.vy < 0) state.vy = 0;
    }
  }

  if (state.firstDetached) integrateFirst(dt);
}

function integrateFirst(dt) {
  const f = state.first;
  const obj = scene.getObjectByName('firstStage');
  if (!obj || obj.parent === rocket) return;
  f.vy -= G * 0.85 * dt;
  f.x += f.vx * dt;
  f.y += f.vy * dt;
  f.z += f.vz * dt;
  obj.position.set(f.x, f.y, f.z);
  obj.rotation.z += dt * 0.15;
  if (f.y < 1) {
    f.y = 1;
    f.vy = 0;
    f.vx *= 0.9;
  }
}

function updateEffects(dt, time) {
  const engineOn =
    (state.phase === 'ignited' || state.phase === 'countdown' || state.phase === 'flying') &&
    !state.staged &&
    state.fuel > 0;
  const pre = state.phase === 'ignited' || state.phase === 'countdown';
  const flying = state.phase === 'flying';
  let intensity = 0;
  if (engineOn && pre) intensity = 0.42 + (state.phase === 'countdown' ? 0.38 : 0);
  if (engineOn && flying) intensity = 0.7 + (state.thrustPct / 100) * 0.3;
  setPlumeIntensity(plume, intensity, time);
  if (!boomState.active) {
    bloomPass.strength = intensity > 0.05 ? 0.12 : 0.05;
    bloomPass.threshold = intensity > 0.05 ? 0.92 : 0.97;
    bloomPass.radius = 0.28;
  }
  setPadSpill(padSpill, state.y < 90 ? intensity : intensity * 0.15, time);

  if (state.staged && flying && state.fuel > 0) {
    pulseVacPlume(vacPlume, 1, time);
  } else if (!flying) {
    vacPlume.visible = false;
  }

  const origin = worldEnginePos();
  sparks.origin.copy(origin);
  smoke.origin.copy(origin);
  groundSmoke.origin.set(state.x, 0.6, state.z);
  sparks.emitRate = intensity * (flying ? 28 : 10);
  smoke.emitRate = intensity * (flying ? 18 : 14) + (state.phase === 'countdown' ? 8 : 0);
  groundSmoke.emitRate =
    intensity * (flying && state.y < 70 ? 36 : 22) + (state.phase === 'countdown' ? 16 : 0);
  if (state.y > 80) {
    sparks.emitRate *= 0.35;
    smoke.emitRate *= 0.2;
    groundSmoke.emitRate *= 0.08;
  }
  if (useSpaceLayout()) {
    sparks.emitRate = 0;
    smoke.emitRate = 0;
    groundSmoke.emitRate = 0;
  }
  sparks.update(dt);
  smoke.update(dt);
  groundSmoke.update(dt);

  let ventK = 0;
  if (state.phase === 'idle' && state.fuel > 40) ventK = 0.38;
  if (state.phase === 'ignited') ventK = 0.78;
  if (state.phase === 'countdown') {
    ventK = 0.9 + 0.1 * THREE.MathUtils.clamp((state.missionT + COUNTDOWN_SEC) / COUNTDOWN_SEC, 0, 1);
  }
  if (flying && !state.staged) {
    const alt = state.y - PAD_Y;
    ventK = THREE.MathUtils.clamp(1 - alt / 90, 0, 1) * 0.55;
  }
  if (state.phase === 'destroyed') ventK = 0;
  if (useSpaceLayout()) ventK = 0;
  updateLoxVent(loxVent, rocket, ventK, dt);
  setLoxVaporPlumes(loxMeshes, ventK, time);

  let delugeK = 0;
  if (state.phase === 'countdown' && state.missionT > -1.6) {
    delugeK = THREE.MathUtils.clamp((state.missionT + 1.6) / 1.6, 0, 1);
  }
  if (flying) {
    const alt = state.y - PAD_Y;
    delugeK = THREE.MathUtils.clamp(1 - alt / 95, 0, 1);
  }
  if (useSpaceLayout()) delugeK = 0;
  const birds = pad.userData.rainbirds || [];
  updateDeluge(deluge, birds, delugeK, dt);

  let trailK = 0;
  if (flying && !useSpaceLayout()) {
    const alt = state.y - PAD_Y;
    trailK =
      THREE.MathUtils.smoothstep(28, 120, alt) *
      (1 - THREE.MathUtils.smoothstep(1000, 1700, alt));
    if (state.staged) trailK *= 0.55;
  }
  updateContrail(contrail, origin, trailK, dt);
  setContrailColumn(contrailColumn, trailK);
  setTrenchFlood(pad.userData.trenchFlood, delugeK);

  const teWant = flying || state.phase === 'success' ? 1 : 0;
  teRetract = THREE.MathUtils.damp(teRetract, teWant, 4.4, dt);
  setTeRetract(teRetract);

  if (camMode !== 'earth' && shake.intensity > 0.08) {
    const mag = shake.intensity * (camMode === 'rocket' ? 0.01 : 0.018);
    camera.position.x += (Math.random() - 0.5) * mag;
    camera.position.y += (Math.random() - 0.5) * mag;
    shake.intensity *= 0.9;
  } else {
    shake.intensity *= camMode === 'earth' ? 0 : 0.9;
    if (shake.intensity <= 0.08) shake.intensity = 0;
  }
}

function heroMix() {
  if (state.phase === 'idle') return 0;
  if (state.phase === 'ignited') return 0.28;
  if (state.phase === 'countdown') {
    return THREE.MathUtils.clamp((state.missionT + COUNTDOWN_SEC) / COUNTDOWN_SEC, 0, 1);
  }
  if (state.phase === 'flying' && state.y - PAD_Y < 18) return 1;
  return 1;
}

function updateCamera(dt) {
  const kPos = 1 - Math.pow(0.018, dt);
  const kLook = 1 - Math.pow(0.012, dt);

  if (state.phase === 'destroyed') {
    const focus = boomState.origin.clone();
    if (debrisPieces.length) {
      focus.set(0, 0, 0);
      for (const d of debrisPieces) focus.add(d.mesh.position);
      focus.multiplyScalar(1 / debrisPieces.length);
    }
    const dist = 170;
    const ideal = focus.clone().add(new THREE.Vector3(dist * 0.55, 48, dist * 0.9));
    camera.position.lerp(ideal, kPos);
    controls.target.lerp(focus, kLook);
    return;
  }

  if (camMode === 'free') return;

  if (camMode === 'rocket') {
    rocket.updateMatrixWorld(true);
    _onboardPos.set(6.2, 15.8, 5.6);
    _onboardLook.set(0, 52, 0);
    rocket.localToWorld(_onboardPos);
    rocket.localToWorld(_onboardLook);
    camera.position.copy(_onboardPos);
    camera.lookAt(_onboardLook);
    controls.target.copy(_onboardLook);
    return;
  }

  if (camMode === 'earth') {
    if (!controls.enabled) {
      const dir = new THREE.Vector3(90, 140, 55).normalize();
      camera.position.lerp(dir.multiplyScalar(EARTH_R * 3.25), kPos);
    }
    controls.target.lerp(new THREE.Vector3(0, 0, 0), kLook);
    return;
  }

  if (useSpaceLayout()) {
    _up.copy(rocket.position).normalize();
    _east.crossVectors(new THREE.Vector3(0, 1, 0), _up);
    if (_east.lengthSq() < 1e-6) _east.set(1, 0, 0);
    _east.normalize();
    const desired = rocket.position.clone().addScaledVector(_up, 80).addScaledVector(_east, 165);
    const look = rocket.position.clone().addScaledVector(_up, 18);
    camera.position.lerp(desired, kPos);
    controls.target.lerp(look, kLook);
    return;
  }

  // Follow: always frame the full vehicle (base + fairing tip), never crop to a stub.
  const alt = Math.max(0, state.y - PAD_Y);
  const stackH = rocket.userData.totalHeight || 70;
  const midY = state.y + stackH * 0.48;
  const mix = heroMix() * 0.4;
  const widePos = FRAMING.wide.pos;
  const heroPos = FRAMING.hero.pos;
  const wideLook = FRAMING.wide.target;
  const heroLook = FRAMING.hero.target;

  let desired;
  let look;
  if (state.phase !== 'flying' || alt < 12) {
    desired = new THREE.Vector3().lerpVectors(widePos, heroPos, mix);
    look = new THREE.Vector3().lerpVectors(wideLook, heroLook, mix);
    // Aim at mid-stack so tip and engines both fit.
    look.y = THREE.MathUtils.lerp(look.y, midY, 0.85);
    desired.y = THREE.MathUtils.lerp(desired.y, midY - 6, 0.35);
    desired.x += state.x;
    desired.z += state.z * 0.15;
    look.x += state.x;
    look.z += state.z;
  } else {
    const high = THREE.MathUtils.smoothstep(0, 1800, alt);
    const dist = THREE.MathUtils.lerp(130, 310, high);
    const camY = state.y + THREE.MathUtils.lerp(stackH * 0.42, 48, high);
    desired = new THREE.Vector3(state.x + dist * 0.62, camY, state.z + dist);
    look = new THREE.Vector3(state.x, midY, state.z);
  }
  camera.position.lerp(desired, kPos);
  controls.target.lerp(look, kLook);
}

function updateHUD() {
  const alt = Math.max(0, Math.round(state.y - PAD_Y));
  const vel = Math.sqrt(state.vx ** 2 + state.vy ** 2 + state.vz ** 2);
  hud.alt.textContent = alt;
  hud.vel.textContent = vel.toFixed(1);
  hud.fuel.textContent = Math.round(state.fuel);
  hud.thrust.textContent = state.thrustPct;
  hud.pitch.textContent = (90 - state.yaw).toFixed(0);
  if (state.phase === 'idle') {
    hud.tclock.textContent = 'T−00:00';
  } else if (state.phase === 'ignited') {
    hud.tclock.textContent = 'T−HOLD';
  } else if (state.phase === 'countdown') {
    hud.tclock.textContent = formatClock(Math.min(-0.01, state.missionT));
  } else {
    hud.tclock.textContent = formatClock(Math.max(0, state.missionT));
  }
}

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.clockRunning) state.missionT += dt;

  if (state.phase === 'countdown') {
    const remain = Math.max(0, Math.trunc(-state.missionT));
    countdownBig.textContent = remain > 0 ? `T−${remain}` : '升空';
    if (remain > 0 && remain !== state.countdown) {
      if (remain <= 3) addShake(4);
      sparks.burst(24);
      smoke.burst(16);
      groundSmoke.burst(28);
    }
    state.countdown = remain;
    if (state.missionT >= 0) launch();
  }

  if (state.phase === 'idle' || state.phase === 'ignited') {
    state.yawDeg = parseInt(angleSlider.value, 10);
    state.yaw = state.yawDeg;
    state.thrustPct = parseInt(thrustSlider.value, 10);
  } else if (state.phase === 'flying') {
    state.thrustPct = parseInt(thrustSlider.value, 10);
    state.yawDeg = parseInt(angleSlider.value, 10);
  }

  updatePhysics(dt);
  if (
    !state.earthRevealed &&
    (state.phase === 'flying' || state.phase === 'success') &&
    state.y - PAD_Y >= SPACE_ALT
  ) {
    state.earthRevealed = true;
    if (camMode === 'follow' || camMode === 'free') setCamMode('earth');
  }
  syncRocketTransform();
  updateEffects(dt, now * 0.001);
  updateDebris(dt);
  updateEarth(earth, dt);
  updateCamera(dt);
  controls.update();
  updateHUD();
  composer.render();
  requestAnimationFrame(tick);
}

fuelSlider.addEventListener('input', () => {
  fuelVal.textContent = `${fuelSlider.value}%`;
  if (state.phase === 'idle') state.fuel = parseInt(fuelSlider.value, 10);
});
thrustSlider.addEventListener('input', () => {
  thrustVal.textContent = `${thrustSlider.value}%`;
  state.thrustPct = parseInt(thrustSlider.value, 10);
});
angleSlider.addEventListener('input', () => {
  angleVal.textContent = `${angleSlider.value}°`;
  state.yawDeg = parseInt(angleSlider.value, 10);
});

btnIgnite.addEventListener('click', startIgnite);
btnLaunch.addEventListener('click', startCountdown);
btnReset.addEventListener('click', fullReset);
btnDestruct.addEventListener('click', destroyRocket);
btnOverlayReset.addEventListener('click', fullReset);
Object.entries(camBtns).forEach(([mode, btn]) => {
  btn.addEventListener('click', () => setCamMode(mode));
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
});

fullReset();
requestAnimationFrame(tick);

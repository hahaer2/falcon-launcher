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
import {
  createPlume,
  createVacPlume,
  createPadSpill,
  ParticleField,
  setPlumeIntensity,
  setPadSpill,
  pulseVacPlume,
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
const btnCamera = document.getElementById('btn-camera');
const overlay = document.getElementById('overlay');
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
renderer.toneMappingExposure = 1.18;
renderer.outputColorSpace = THREE.SRGBColorSpace;

function makeNightEnv() {
  const envScene = new THREE.Scene();
  envScene.add(new THREE.HemisphereLight(0x8ea4cc, 0x1a140c, 1.4));
  const cool = new THREE.DirectionalLight(0xb7c8ff, 2.4);
  cool.position.set(-4, 6, 2);
  envScene.add(cool);
  const warm = new THREE.DirectionalLight(0xffc48a, 1.1);
  warm.position.set(3, 1.2, -2);
  envScene.add(warm);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(envScene, 0.06).texture;
  pmrem.dispose();
  return tex;
}

const scene = new THREE.Scene();
scene.environment = makeNightEnv();
scene.environmentIntensity = 0.55;
scene.background = new THREE.Color(0x070b14);
scene.fog = new THREE.Fog(0x070b14, 220, 1600);

const FRAMING = {
  wide: {
    pos: new THREE.Vector3(42, 12, 68),
    target: new THREE.Vector3(0, 16, 0),
  },
  hero: {
    pos: new THREE.Vector3(22, 5.5, 36),
    target: new THREE.Vector3(0, 4.2, 0),
  },
};

const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.2, 6000);
camera.position.copy(FRAMING.hero.pos);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minPolarAngle = 0.12;
controls.maxPolarAngle = Math.PI * 0.86;
controls.minDistance = 14;
controls.maxDistance = 900;
controls.target.copy(FRAMING.hero.target);

const hemi = new THREE.HemisphereLight(0x7d90b8, 0x16110c, 0.55);
scene.add(hemi);

const moon = new THREE.DirectionalLight(0xc5d4ff, 1.1);
moon.position.set(-90, 140, 55);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.near = 8;
moon.shadow.camera.far = 420;
moon.shadow.camera.left = -110;
moon.shadow.camera.right = 110;
moon.shadow.camera.top = 120;
moon.shadow.camera.bottom = -60;
moon.shadow.bias = -0.00018;
moon.shadow.normalBias = 0.04;
scene.add(moon);

const rim = new THREE.DirectionalLight(0x9eb6ff, 0.9);
rim.position.set(90, 38, -110);
scene.add(rim);

const rimLow = new THREE.DirectionalLight(0xffc090, 0.7);
rimLow.position.set(-40, 8, 70);
scene.add(rimLow);

const fill = new THREE.DirectionalLight(0xffd0a0, 1.35);
fill.position.set(30, 18, 40);
scene.add(fill);

const engineWash = new THREE.SpotLight(0xffe0b8, 800, 80, 0.35, 0.55, 2);
engineWash.position.set(18, 8, 28);
engineWash.target.position.set(0, 2, 0);
scene.add(engineWash);
scene.add(engineWash.target);

const mats = makeMaterials();
const pad = createPad(mats);
scene.add(pad);
scene.add(createSky());

const rocket = createRocket(mats);
rocket.position.set(0, PAD_Y, 0);
scene.add(rocket);

const plume = createPlume();
rocket.userData.first.add(plume);

const vacPlume = createVacPlume();
vacPlume.position.y = -0.6;
rocket.userData.second.add(vacPlume);

const padSpill = createPadSpill();
scene.add(padSpill);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.12,
  0.35,
  0.92
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

const COUNTDOWN_SEC = 10;
const shake = { intensity: 0 };
let followCam = true;

function setFollowCam(on) {
  followCam = on;
  btnCamera.classList.toggle('active', on);
  btnCamera.textContent = on ? '跟随相机' : '自由观察';
}
setFollowCam(true);

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

function syncRocketTransform() {
  rocket.position.set(state.x, state.y, state.z);
  rocket.rotation.set(0, 0, THREE.MathUtils.degToRad(-state.yaw));
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
  setFollowCam(true);
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
  setFollowCam(true);
  setStatus('倒计时');
  countdownBig.classList.add('show');
  countdownBig.textContent = `T−${COUNTDOWN_SEC}`;
  addShake(2);
}

function launch() {
  if (state.phase === 'flying') return;
  setFollowCam(true);
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

function endGame(result) {
  state.phase = result;
  state.clockRunning = false;
  const success = result === 'success';
  setStatus(success ? '入轨成功' : '任务失败');
  overlayCard.className = success ? 'success' : 'crash';
  overlayCard.querySelector('h2').textContent = success ? '进入预定轨道' : '火箭坠毁';
  overlayCard.querySelector('p').textContent = success
    ? `最大高度 ${Math.round(state.y)} m，二级点火正常，任务完成。`
    : '推力、姿态或燃料不足，飞行器未能维持上升。';
  overlay.classList.add('show');
  btnIgnite.disabled = true;
  btnLaunch.disabled = true;
  if (!success) {
    addShake(16);
    sparks.origin.set(state.x, Math.max(2, state.y), state.z);
    sparks.burst(220);
    smoke.burst(160);
  }
}

function fullReset() {
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
  });
  state.fuel = parseInt(fuelSlider.value, 10);
  state.thrustPct = parseInt(thrustSlider.value, 10);
  state.yawDeg = parseInt(angleSlider.value, 10);

  fuelSlider.disabled = false;
  thrustSlider.disabled = false;
  angleSlider.disabled = false;
  btnIgnite.disabled = false;
  btnLaunch.disabled = true;
  overlay.classList.remove('show');
  countdownBig.classList.remove('show');
  shake.intensity = 0;
  setPlumeIntensity(plume, 0, 0);
  setPadSpill(padSpill, 0, 0);
  syncRocketTransform();
  setStatus('待命中');
  hud.stage.textContent = '一级';
  setFollowCam(true);
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
  bloomPass.strength = intensity > 0.05 ? 0.18 : 0.06;
  bloomPass.threshold = intensity > 0.05 ? 0.88 : 0.95;
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
  sparks.update(dt);
  smoke.update(dt);
  groundSmoke.update(dt);

  if (shake.intensity > 0.08) {
    const mag = shake.intensity * 0.018;
    camera.position.x += (Math.random() - 0.5) * mag;
    camera.position.y += (Math.random() - 0.5) * mag;
    shake.intensity *= 0.9;
  } else {
    shake.intensity = 0;
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
  if (!followCam) return;
  const alt = Math.max(0, state.y - PAD_Y);
  const mix = heroMix();
  const widePos = FRAMING.wide.pos;
  const heroPos = FRAMING.hero.pos;
  const wideLook = FRAMING.wide.target;
  const heroLook = FRAMING.hero.target;

  let desired;
  let look;
  if (state.phase !== 'flying' || alt < 18) {
    desired = new THREE.Vector3().lerpVectors(widePos, heroPos, mix);
    look = new THREE.Vector3().lerpVectors(wideLook, heroLook, mix);
    desired.x += state.x;
    desired.z += state.z * 0.2;
    look.x += state.x;
    look.z += state.z;
  } else {
    const climb = THREE.MathUtils.smoothstep(18, 380, alt);
    const high = THREE.MathUtils.smoothstep(0, 2200, alt);
    const dist = THREE.MathUtils.lerp(78, 240, high);
    const camY = THREE.MathUtils.lerp(heroPos.y + alt * 0.15, state.y + 26, climb);
    const lookY = THREE.MathUtils.lerp(heroLook.y + alt * 0.2, state.y + 8, climb);
    desired = new THREE.Vector3(state.x + dist * 0.56, camY, state.z + dist);
    look = new THREE.Vector3(state.x, lookY, state.z);
  }
  const kPos = 1 - Math.pow(0.018, dt);
  const kLook = 1 - Math.pow(0.012, dt);
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
  syncRocketTransform();
  updateEffects(dt, now * 0.001);
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
btnOverlayReset.addEventListener('click', fullReset);
btnCamera.addEventListener('click', () => {
  setFollowCam(!followCam);
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

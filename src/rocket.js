import * as THREE from 'three';
import { ENGINE_LAYOUT } from './materials.js';

const R = 1.83;
const FIRST_H = 41.2;
const INTER_H = 2.4;
const SECOND_H = 12.6;
const FAIRING_H = 13.0;

function shadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function extraMats() {
  return {
    titanium: new THREE.MeshPhysicalMaterial({
      color: 0xc4b7a0,
      metalness: 0.92,
      roughness: 0.28,
      clearcoat: 0.2,
    }),
    soot: new THREE.MeshPhysicalMaterial({
      color: 0x161412,
      metalness: 0.22,
      roughness: 0.78,
    }),
    gold: new THREE.MeshPhysicalMaterial({
      color: 0xc9a36a,
      metalness: 0.88,
      roughness: 0.32,
    }),
    nb: new THREE.MeshPhysicalMaterial({
      color: 0x8a5a3a,
      metalness: 0.9,
      roughness: 0.24,
    }),
    graphite: new THREE.MeshPhysicalMaterial({
      color: 0x2a2c30,
      metalness: 0.45,
      roughness: 0.5,
    }),
    innerBell: new THREE.MeshStandardMaterial({
      color: 0x140805,
      roughness: 0.62,
      metalness: 0.35,
      side: THREE.BackSide,
    }),
    heatBase: new THREE.MeshPhysicalMaterial({
      color: 0x2a1a10,
      metalness: 0.4,
      roughness: 0.7,
    }),
    frost: new THREE.MeshPhysicalMaterial({
      color: 0xd8e8f4,
      transmission: 0.2,
      roughness: 0.8,
      transparent: true,
      opacity: 0.35
    })
  };
}

function lathe(points, segs, mat) {
  const geo = new THREE.LatheGeometry(points, segs);
  geo.computeVertexNormals();
  return shadow(new THREE.Mesh(geo, mat));
}

function merlinBell(exitR, throatR, length, segs, mat) {
  const pts = [];
  for (let i = 0; i <= 36; i++) {
    const t = i / 36;
    const y = t * length;
    const k = Math.pow(t, 1.28);
    const r = THREE.MathUtils.lerp(exitR, throatR, k);
    const flare = t < 0.12 ? 1 + (0.12 - t) * 0.35 : 1;
    pts.push(new THREE.Vector2(r * flare, y));
  }
  return lathe(pts, segs, mat);
}

function fairingRadius(radius, t) {
  // LOCKED pointed Falcon profile. Power < 1 keeps a true needle tip
  // (non-horizontal tangent). Never sphere / hemisphere / bald cap.
  const tt = THREE.MathUtils.clamp(t, 0, 1);
  if (tt >= 1) return 0.001;
  return Math.max(0.001, radius * Math.pow(1 - tt, 0.76));
}

function ogive(radius, height, segs, mat) {
  const pts = [];
  const n = 80;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(new THREE.Vector2(fairingRadius(radius, t), t * height));
  }
  return lathe(pts, segs, mat);
}

function torusRing(radius, tube, mat, radial = 48, tubular = 10) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, tubular, radial), mat);
  m.rotation.x = Math.PI / 2;
  return shadow(m);
}

function makeMarkingTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 512);
  g.fillStyle = '#1a1c22';
  g.fillRect(70, 40, 28, 280);
  g.fillStyle = '#c41e3a';
  g.fillRect(108, 40, 90, 18);
  g.fillStyle = '#f4f4f4';
  g.fillRect(108, 58, 90, 18);
  g.fillStyle = '#c41e3a';
  g.fillRect(108, 76, 90, 18);
  g.fillStyle = '#1c3f8c';
  g.fillRect(108, 40, 36, 36);
  g.fillStyle = '#f4f4f4';
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.arc(116 + (i % 3) * 10, 48 + Math.floor(i / 3) * 12, 2.2, 0, Math.PI * 2);
    g.fill();
  }
  
  g.font = 'bold 20px sans-serif';
  g.fillStyle = '#ffffff';
  g.fillText('SPACEX', 110, 240);
  
  g.font = '16px sans-serif';
  g.fillStyle = '#d3d3d3';
  g.fillText('F9', 120, 300);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeGridFin(xtra) {
  const fin = new THREE.Group();
  const w = 3.55;
  const h = 2.75;
  const shape = new THREE.Shape();
  const rr = 0.08;
  shape.moveTo(-w / 2 + rr, -h / 2);
  shape.lineTo(w / 2 - rr, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + rr);
  shape.lineTo(w / 2, h / 2 - rr);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - rr, h / 2);
  shape.lineTo(-w / 2 + rr, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - rr);
  shape.lineTo(-w / 2, -h / 2 + rr);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + rr, -h / 2);

  const cols = 7;
  const rows = 6;
  const insetX = 0.14;
  const insetY = 0.14;
  const gap = 0.05;
  const cellW = (w - insetX * 2 - gap * (cols - 1)) / cols;
  const cellH = (h - insetY * 2 - gap * (rows - 1)) / rows;
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const hx = -w / 2 + insetX + ix * (cellW + gap);
      const hy = -h / 2 + insetY + iy * (cellH + gap);
      const hole = new THREE.Path();
      hole.moveTo(hx, hy);
      hole.lineTo(hx + cellW, hy);
      hole.lineTo(hx + cellW, hy + cellH);
      hole.lineTo(hx, hy + cellH);
      hole.closePath();
      shape.holes.push(hole);
    }
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.11,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geo.translate(0, 0, -0.055);
  geo.computeVertexNormals();
  const plate = shadow(new THREE.Mesh(geo, xtra.titanium));
  fin.add(plate);

  const hinge = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.55, 16), xtra.graphite)
  );
  hinge.rotation.x = Math.PI / 2;
  hinge.position.set(-w / 2 - 0.06, 0, 0);
  fin.add(hinge);

  const actuator = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.7, 10), xtra.titanium)
  );
  actuator.rotation.z = Math.PI / 2;
  actuator.position.set(-w / 2 + 0.28, -0.45, 0.1);
  fin.add(actuator);

  const deployActuator = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.45, 10), xtra.graphite)
  );
  deployActuator.rotation.z = Math.PI / 6;
  deployActuator.position.set(-w / 2 + 0.38, 0.25, 0.0);
  fin.add(deployActuator);

  return fin;
}

function makeLeg(mats, xtra) {
  const leg = new THREE.Group();
  const boom = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 9.4, 14), mats.carbon)
  );
  boom.position.set(1.05, 0.2, 0);
  boom.rotation.z = 0.09;
  leg.add(boom);
  
  const shock = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.8, 12), mats.metal)
  );
  shock.position.set(1.15, 2.0, 0.1);
  shock.rotation.z = 0.09;
  leg.add(shock);

  const braceA = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 4.6, 10), mats.carbon)
  );
  braceA.position.set(0.55, 1.6, 0.22);
  braceA.rotation.z = 0.42;
  leg.add(braceA);

  const braceB = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 4.6, 10), mats.carbon)
  );
  braceB.position.set(0.55, 1.6, -0.22);
  braceB.rotation.z = 0.42;
  leg.add(braceB);

  const hip = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), xtra.graphite));
  hip.position.set(0.55, 4.7, 0);
  leg.add(hip);

  const foot = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.62, 0.1, 24), mats.black)
  );
  foot.position.set(1.55, -4.45, 0);
  leg.add(foot);

  const sole = shadow(
    new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 24), xtra.soot)
  );
  sole.rotation.x = Math.PI / 2;
  sole.position.copy(foot.position);
  leg.add(sole);
  return leg;
}

function makeEngine(mats, xtra) {
  const e = new THREE.Group();
  const bell = merlinBell(0.62, 0.14, 3.35, 40, xtra.nb);
  bell.position.y = -1.68;
  e.add(bell);

  const inner = merlinBell(0.48, 0.11, 3.05, 24, xtra.innerBell);
  inner.position.y = -1.52;
  e.add(inner);

  const lip = torusRing(0.62, 0.055, xtra.gold, 28, 8);
  lip.position.y = -1.68;
  e.add(lip);

  const throat = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.42, 14), mats.metal)
  );
  throat.position.y = 1.75;
  e.add(throat);

  const can = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.54, 0.95, 14), xtra.soot)
  );
  can.position.y = 1.22;
  e.add(can);

  const canLip = torusRing(0.54, 0.05, mats.metal, 16, 8);
  canLip.position.y = 0.76;
  e.add(canLip);

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 20),
    new THREE.MeshBasicMaterial({
      color: 0xffc080,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  glow.rotation.x = Math.PI / 2;
  glow.position.y = -1.66;
  glow.name = 'nozzleGlow';
  e.add(glow);

  e.userData.nozzleWorld = new THREE.Vector3();
  e.userData.glow = glow;
  return e;
}

function makeVacEngine(xtra) {
  const g = new THREE.Group();
  g.name = 'vacEngine';
  const bell = merlinBell(1.22, 0.2, 3.15, 56, xtra.nb);
  bell.position.y = -1.55;
  g.add(bell);
  const inner = merlinBell(1.05, 0.16, 2.9, 36, xtra.innerBell);
  inner.position.y = -1.4;
  g.add(inner);
  const lip = torusRing(1.22, 0.04, xtra.gold, 48, 8);
  lip.position.y = -1.55;
  g.add(lip);
  g.visible = false;
  return g;
}

export function createRocket(mats) {
  const xtra = extraMats();
  const rocket = new THREE.Group();
  rocket.name = 'rocket';

  const first = new THREE.Group();
  first.name = 'firstStage';

  const body = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(R, R, FIRST_H, 64, 12), mats.white)
  );
  body.position.y = FIRST_H / 2;
  first.add(body);
  
  const weldSeam = shadow(
    new THREE.Mesh(new THREE.CapsuleGeometry(0.015, FIRST_H - 1, 4, 4), mats.white)
  );
  weldSeam.position.set(-R, FIRST_H / 2, 0);
  first.add(weldSeam);
  
  const frostBand = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 0.01, R + 0.01, FIRST_H * 0.3, 64),
    xtra.frost
  );
  frostBand.position.y = FIRST_H * 0.75;
  first.add(frostBand);

  const ringYs = [6.2, 14.4, 22.8, 31.2, FIRST_H - 2.1, FIRST_H * 0.2, FIRST_H * 0.8];
  ringYs.forEach((y) => {
    const ring = torusRing(R + 0.012, 0.028, mats.white, 64, 8);
    ring.position.y = y;
    first.add(ring);
  });

  const hub = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.12, 0.9, 16), xtra.soot)
  );
  hub.position.y = 1.35;
  first.add(hub);

  const octaweb = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(R + 0.08, R + 0.18, 1.2, 8), xtra.soot)
  );
  octaweb.position.y = 3.15;
  octaweb.rotation.y = Math.PI / 8;
  first.add(octaweb);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rib = shadow(
      new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 2.55, 10), mats.metal)
    );
    rib.position.set(Math.cos(a) * 2.28, 3.15, Math.sin(a) * 2.28);
    first.add(rib);
  }

  ENGINE_LAYOUT.forEach((p) => {
    const from = new THREE.Vector3(0, 1.35, 0);
    const to = new THREE.Vector3(p.x, 1.2, p.z);
    const dir = to.clone().sub(from);
    const len = dir.length();
    if (len < 0.5) return;
    const strut = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, len, 8), mats.metal));
    strut.position.copy(from).add(to).multiplyScalar(0.5);
    strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    first.add(strut);
  });

  const octaLip = torusRing(2.42, 0.16, mats.metal, 8, 10);
  octaLip.position.y = 2.55;
  octaLip.rotation.y = Math.PI / 8;
  first.add(octaLip);

  const octaTop = torusRing(R + 0.14, 0.12, mats.metal, 8, 10);
  octaTop.position.y = 3.75;
  octaTop.rotation.y = Math.PI / 8;
  first.add(octaTop);

  const sootBand = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.06, 2.2, 48), xtra.soot)
  );
  sootBand.position.y = 4.8;
  first.add(sootBand);

  const stripe = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(R + 0.018, R + 0.018, 0.62, 64), mats.black)
  );
  stripe.position.y = FIRST_H - 0.42;
  first.add(stripe);

  const raceway = shadow(
    new THREE.Mesh(new THREE.CapsuleGeometry(0.4, FIRST_H - 9.2, 8, 14), mats.black)
  );
  raceway.position.set(R + 0.46, FIRST_H / 2 + 0.1, 0.4);
  first.add(raceway);

  for (let y = 5.2; y < FIRST_H - 3.5; y += 3.2) {
    const band = shadow(
      new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.07, 8, 16), mats.metal)
    );
    band.rotation.z = Math.PI / 2;
    band.position.set(R + 0.46, y, 0.4);
    first.add(band);
  }

  const raceCap = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), mats.black));
  raceCap.position.set(R + 0.46, FIRST_H - 3.6, 0.4);
  first.add(raceCap);

  const markMat = new THREE.MeshPhysicalMaterial({
    map: makeMarkingTexture(),
    transparent: true,
    roughness: 0.5,
    metalness: 0.1,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const mark = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 0.022, R + 0.022, 8.5, 24, 1, true, Math.PI * 0.62, 0.42),
    markMat
  );
  mark.position.y = FIRST_H * 0.52;
  first.add(mark);

  ENGINE_LAYOUT.forEach((p, i) => {
    const eng = makeEngine(mats, xtra);
    eng.position.set(p.x, -1.15, p.z);
    eng.name = `engine-${i}`;
    first.add(eng);
  });

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const fin = makeGridFin(xtra);
    fin.position.set(Math.cos(a) * (R + 1.15), FIRST_H - 3.5, Math.sin(a) * (R + 1.15));
    fin.rotation.y = -a + 0.22;
    fin.rotation.z = 0.32;
    first.add(fin);

    const leg = makeLeg(mats, xtra);
    leg.position.set(Math.cos(a) * R * 0.22, 7.2, Math.sin(a) * R * 0.22);
    leg.rotation.y = -a;
    first.add(leg);
  }

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const copv = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 16), mats.white));
    copv.position.set(Math.cos(a) * (R - 0.55), FIRST_H - 1.35, Math.sin(a) * (R - 0.55));
    first.add(copv);
  }

  const inter = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(R - 0.015, R - 0.02, INTER_H, 64, 4), mats.black)
  );
  inter.position.y = FIRST_H + INTER_H / 2;
  first.add(inter);
  
  for(let i=0; i<8; i++) {
    const a = (i/8)*Math.PI*2;
    const strut = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, INTER_H, 8), mats.black));
    strut.position.set(Math.cos(a) * (R - 0.05), FIRST_H + INTER_H / 2, Math.sin(a) * (R - 0.05));
    first.add(strut);
  }

  for (let i = 0; i < 3; i++) {
    const ir = torusRing(R - 0.01, 0.035, xtra.graphite, 48, 8);
    ir.position.y = FIRST_H + 0.35 + i * 0.85;
    first.add(ir);
  }

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rcs = merlinBell(0.07, 0.025, 0.16, 12, mats.metal);
    rcs.position.set(
      Math.cos(a) * (R + 0.04),
      FIRST_H + INTER_H * 0.55,
      Math.sin(a) * (R + 0.04)
    );
    rcs.rotation.z = Math.PI / 2;
    rcs.rotation.y = -a;
    first.add(rcs);
  }

  rocket.add(first);

  const second = new THREE.Group();
  second.name = 'secondStage';
  second.position.y = FIRST_H + INTER_H;

  const sBody = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(R - 0.04, R - 0.04, SECOND_H, 64, 6), mats.white)
  );
  sBody.position.y = SECOND_H / 2;
  second.add(sBody);

  const sRing = torusRing(R - 0.03, 0.03, mats.white, 64, 8);
  sRing.position.y = SECOND_H * 0.55;
  second.add(sRing);

  const sRace = shadow(
    new THREE.Mesh(new THREE.CapsuleGeometry(0.09, SECOND_H - 3.2, 4, 10), mats.black)
  );
  sRace.position.set(R - 0.02, SECOND_H / 2, 0);
  second.add(sRace);
  
  const sCopv = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), mats.carbon));
  sCopv.position.set(R - 0.02, SECOND_H - 1.2, 0.15);
  second.add(sCopv);
  
  for(let i=0; i<4; i++) {
    const a = (i/4)*Math.PI*2;
    const thruster = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), mats.white));
    thruster.position.set(Math.cos(a) * (R - 0.01), SECOND_H - 0.4, Math.sin(a) * (R - 0.01));
    second.add(thruster);
  }

  second.add(makeVacEngine(xtra));
  rocket.add(second);

  const fairing = new THREE.Group();
  fairing.name = 'fairing';
  fairing.position.y = FIRST_H + INTER_H + SECOND_H;

  // LOCKED: short barrel + long pointed ogive + needle tip. Never SphereGeometry.
  const fairR = R + 0.05;
  const fairCylH = FAIRING_H * 0.1;
  const ogiveH = FAIRING_H - fairCylH;
  const fairCyl = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(fairR, R + 0.02, fairCylH, 64, 2), mats.white)
  );
  fairCyl.position.y = fairCylH / 2;
  fairing.add(fairCyl);

  const nose = ogive(fairR, ogiveH, 80, mats.white);
  nose.position.y = fairCylH;
  fairing.add(nose);

  [0.18, 0.4, 0.62].forEach((t) => {
    const ring = torusRing(fairingRadius(fairR, t), 0.016, mats.white, 48, 6);
    ring.position.y = fairCylH + t * ogiveH;
    fairing.add(ring);
  });

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const spring = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), mats.metal));
    spring.position.set(Math.cos(a) * (R + 0.02), 0.15, Math.sin(a) * (R + 0.02));
    fairing.add(spring);
  }

  const splitPts = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28;
    const y = fairCylH * 0.15 + t * (FAIRING_H * 0.9);
    let r;
    if (y <= fairCylH) r = fairR + 0.02;
    else r = fairingRadius(fairR, (y - fairCylH) / ogiveH) + 0.018;
    splitPts.push(new THREE.Vector3(r, y, 0));
  }
  const split = shadow(
    new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(splitPts), 28, 0.018, 5, false),
      mats.white
    )
  );
  fairing.add(split);

  const tip = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.07, 1.5, 20), mats.metal));
  tip.position.y = FAIRING_H + 0.58;
  fairing.add(tip);

  rocket.add(fairing);

  rocket.userData = {
    first,
    second,
    fairing,
    totalHeight: FIRST_H + INTER_H + SECOND_H + FAIRING_H,
    firstHeight: FIRST_H + INTER_H,
    secondHomeY: FIRST_H + INTER_H,
    fairingHomeY: FIRST_H + INTER_H + SECOND_H,
    secondLen: SECOND_H,
    engineLocalY: -0.8,
  };

  return rocket;
}

export { FIRST_H, INTER_H, SECOND_H, FAIRING_H, R };

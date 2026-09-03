import * as THREE from 'three';

function shadow(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function cyl(rTop, rBot, h, mat, segs = 20) {
  return shadow(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), mat));
}

function box(w, h, d, mat) {
  return shadow(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
}

function between(a, b, radius, mat, segs = 8) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = cyl(radius, radius, len, mat, segs);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return m;
}

function makeStrongback(mats) {
  const g = new THREE.Group();
  g.name = 'strongback';
  const h = 72;
  const w = 5.2;
  const d = 4.4;
  const posts = [
    new THREE.Vector3(-w / 2, 0, -d / 2),
    new THREE.Vector3(w / 2, 0, -d / 2),
    new THREE.Vector3(-w / 2, 0, d / 2),
    new THREE.Vector3(w / 2, 0, d / 2),
  ];
  posts.forEach((p) => {
    const col = cyl(0.22, 0.26, h, mats.rustSteel, 12);
    col.position.set(p.x, h / 2, p.z);
    g.add(col);
  });

  const levels = 12;
  for (let i = 0; i <= levels; i++) {
    const y = (i / levels) * h;
    const corners = posts.map((p) => new THREE.Vector3(p.x, y, p.z));
    g.add(between(corners[0], corners[1], 0.08, mats.rustSteel));
    g.add(between(corners[1], corners[3], 0.08, mats.rustSteel));
    g.add(between(corners[3], corners[2], 0.08, mats.rustSteel));
    g.add(between(corners[2], corners[0], 0.08, mats.rustSteel));
    if (i < levels) {
      const y2 = ((i + 1) / levels) * h;
      g.add(between(new THREE.Vector3(-w / 2, y, -d / 2), new THREE.Vector3(-w / 2, y2, d / 2), 0.055, mats.metal));
      g.add(between(new THREE.Vector3(w / 2, y, d / 2), new THREE.Vector3(w / 2, y2, -d / 2), 0.055, mats.metal));
    }
    const deck = shadow(new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.12, 16), mats.carbon));
    deck.position.y = y;
    if (i % 2 === 0) g.add(deck);
  }

  const armHeights = [18, 32, 48, 62];
  armHeights.forEach((y, idx) => {
    const arm = cyl(0.28, 0.28, 6.8, mats.rustSteel, 12);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(3.2, y, 0);
    g.add(arm);
    const cuff = cyl(0.42, 0.42, 0.55, mats.metal, 16);
    cuff.rotation.z = Math.PI / 2;
    cuff.position.set(0.55, y, 0);
    g.add(cuff);
    if (idx === 2) {
      const hood = shadow(
        new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.carbon)
      );
      hood.rotation.z = -Math.PI / 2;
      hood.position.set(1.4, y + 0.2, 0);
      g.add(hood);
    }
  });

  const crew = cyl(0.55, 0.55, 8.4, mats.white, 20);
  crew.rotation.z = Math.PI / 2;
  crew.position.set(3.4, 54, 0);
  g.add(crew);
  const cabin = shadow(new THREE.Mesh(new THREE.SphereGeometry(1.05, 18, 14), mats.white));
  cabin.position.set(0.2, 54, 0);
  g.add(cabin);
  return g;
}

function makeFenceTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 128);
  g.strokeStyle = 'rgba(40, 48, 52, 0.85)';
  g.lineWidth = 2;
  for (let i = -2; i < 10; i++) {
    g.beginPath();
    g.moveTo(i * 12, 0);
    g.lineTo(i * 12 + 48, 128);
    g.stroke();
    g.beginPath();
    g.moveTo(i * 12 + 48, 0);
    g.lineTo(i * 12, 128);
    g.stroke();
  }
  g.fillStyle = '#2c3236';
  g.fillRect(0, 0, 4, 128);
  g.fillRect(60, 0, 4, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function makeTowerLogo() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 128);
  g.fillStyle = '#0b0d12';
  g.beginPath();
  g.moveTo(28, 100);
  g.lineTo(78, 28);
  g.lineTo(92, 28);
  g.lineTo(42, 100);
  g.closePath();
  g.fill();
  g.font = 'bold 36px sans-serif';
  g.fillStyle = '#0b0d12';
  g.fillText('SPACEX', 102, 78);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function northTrenchGeo() {
  const shape = new THREE.Shape();
  shape.moveTo(-6.8, 9);
  shape.lineTo(6.8, 9);
  shape.lineTo(10.2, -52);
  shape.lineTo(-10.2, -52);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 4.4, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

function makeRainbird(mats) {
  const g = new THREE.Group();
  const post = cyl(0.07, 0.1, 1.55, mats.metal, 8);
  post.position.y = 0.78;
  g.add(post);
  const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mats.metal));
  head.position.y = 1.62;
  g.add(head);
  const dish = cyl(0.42, 0.42, 0.05, mats.metal, 12);
  dish.position.y = 1.78;
  g.add(dish);
  const nozzle = cyl(0.035, 0.06, 0.5, mats.metal, 6);
  nozzle.rotation.z = 0.7;
  nozzle.position.set(0.22, 1.55, 0);
  g.add(nozzle);
  return g;
}

function makePalmetto(scrub, heat) {
  const g = new THREE.Group();
  const trunk = cyl(0.07, 0.11, 1.35, heat, 6);
  trunk.position.y = 0.68;
  g.add(trunk);
  const crown = shadow(new THREE.Mesh(new THREE.SphereGeometry(1.05, 8, 6), scrub), true, false);
  crown.scale.set(1, 0.42, 1);
  crown.position.y = 1.55;
  g.add(crown);
  return g;
}

function makeHIF(mats) {
  const g = new THREE.Group();
  g.name = 'hif';
  const hall = box(46, 16.5, 92, mats.hangar || mats.concrete);
  hall.position.y = 8.25;
  g.add(hall);
  const roof = box(50, 0.7, 96, mats.metal);
  roof.position.y = 16.7;
  g.add(roof);
  for (let i = -2; i <= 2; i++) {
    const rib = box(0.4, 0.9, 96, mats.rustSteel);
    rib.position.set(i * 9, 17.2, 0);
    g.add(rib);
  }
  const door = box(28, 12.5, 0.4, mats.carbon);
  door.position.set(0, 6.4, -46.2);
  g.add(door);
  const lintel = box(32, 1.2, 1.4, mats.metal);
  lintel.position.set(0, 13.2, -46);
  g.add(lintel);
  const office = box(18, 6.5, 22, mats.hangar || mats.white);
  office.position.set(28, 3.25, 20);
  g.add(office);
  const officeRoof = box(20, 0.4, 24, mats.carbon);
  officeRoof.position.set(28, 6.6, 20);
  g.add(officeRoof);
  for (let i = 0; i < 4; i++) {
    const win = box(2.4, 1.6, 0.12, mats.water);
    win.position.set(37.1, 3.4, 10 + i * 5);
    g.add(win);
  }
  return g;
}

function makeWaterTower(mats) {
  const g = new THREE.Group();
  g.name = 'waterTower';
  const stem = cyl(0.55, 0.78, 14, mats.white, 16);
  stem.position.y = 7;
  g.add(stem);
  const pts = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const y = t * 6.4;
    const r = 3.1 * Math.sin(Math.PI * Math.min(1, t * 1.04));
    pts.push(new THREE.Vector2(Math.max(0.25, r), y));
  }
  const bulb = shadow(new THREE.Mesh(new THREE.LatheGeometry(pts, 28), mats.white));
  bulb.position.y = 12.6;
  g.add(bulb);
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 2.5),
    new THREE.MeshBasicMaterial({ map: makeTowerLogo(), transparent: true, depthWrite: false })
  );
  logo.position.set(0, 16.1, 3.05);
  g.add(logo);
  const logoB = logo.clone();
  logoB.position.z = -3.05;
  logoB.rotation.y = Math.PI;
  g.add(logoB);
  return g;
}

export function createPad(mats) {
  const root = new THREE.Group();
  root.name = 'pad';
  const grass = mats.grass || mats.concrete;
  const sand = mats.sand || mats.concrete;
  const water = mats.water || mats.metal;
  const wetland = mats.wetland || grass;
  const scrub = mats.scrub || grass;

  const ground = shadow(new THREE.Mesh(new THREE.CircleGeometry(780, 72), grass), false, true);
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);

  const ocean = shadow(new THREE.Mesh(new THREE.PlaneGeometry(1100, 1600), water), false, true);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(720, 0.02, -40);
  root.add(ocean);
  const shore = shadow(new THREE.Mesh(new THREE.PlaneGeometry(70, 980), sand), false, true);
  shore.rotation.x = -Math.PI / 2;
  shore.position.set(188, 0.06, -20);
  root.add(shore);
  const surf = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 980),
    new THREE.MeshBasicMaterial({ color: 0xcfe7f6, transparent: true, opacity: 0.45 })
  );
  surf.rotation.x = -Math.PI / 2;
  surf.position.set(222, 0.08, -20);
  root.add(surf);

  const patches = [
    [48, 95, 28, 18],
    [-62, 88, 34, 16],
    [-90, -70, 30, 20],
    [70, -110, 26, 14],
    [-40, 150, 40, 22],
    [30, 170, 24, 18],
    [-120, 40, 36, 16],
    [95, 40, 22, 20],
  ];
  patches.forEach(([x, z, w, d]) => {
    const p = shadow(new THREE.Mesh(new THREE.PlaneGeometry(w, d), wetland), false, true);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.05, z);
    root.add(p);
  });

  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 55 + Math.random() * 200;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.hypot(x, z) < 48 || x > 165) continue;
    const plant = makePalmetto(scrub, mats.heat);
    plant.position.set(x, 0, z);
    plant.rotation.y = Math.random() * Math.PI;
    plant.scale.setScalar(0.7 + Math.random() * 0.7);
    root.add(plant);
  }
  for (let i = 0; i < 14; i++) {
    const palm = makePalmetto(scrub, mats.heat);
    palm.position.set(168 + Math.random() * 12, 0, -220 + i * 32 + Math.random() * 8);
    palm.scale.setScalar(1.1 + Math.random() * 0.4);
    root.add(palm);
  }

  const crawler = shadow(new THREE.Mesh(new THREE.BoxGeometry(22, 0.45, 165), mats.concrete), false, true);
  crawler.position.set(0, 0.22, 92);
  root.add(crawler);

  const ramp = shadow(new THREE.Mesh(new THREE.BoxGeometry(16, 1.1, 52), mats.concrete));
  ramp.position.set(0, 1.55, 36);
  ramp.rotation.x = -0.055;
  root.add(ramp);

  for (const x of [-3.15, 3.15]) {
    const rail = box(0.28, 0.18, 168, mats.metal);
    rail.position.set(x, 0.62, 86);
    root.add(rail);
  }
  for (let i = 0; i < 28; i++) {
    const tie = box(7.4, 0.12, 0.35, mats.carbon);
    tie.position.set(0, 0.48, 12 + i * 5.8);
    root.add(tie);
  }
  const railPad = box(0.28, 0.2, 18, mats.metal);
  railPad.position.set(-3.15, 3.05, 6);
  railPad.rotation.x = -0.12;
  root.add(railPad);
  const railPad2 = railPad.clone();
  railPad2.position.x = 3.15;
  root.add(railPad2);

  const hif = makeHIF(mats);
  hif.position.set(8, 0, 178);
  root.add(hif);

  const apron = shadow(new THREE.Mesh(new THREE.CylinderGeometry(42, 46, 1.7, 12), mats.concrete));
  apron.position.y = 0.85;
  root.add(apron);
  const deck = shadow(new THREE.Mesh(new THREE.CylinderGeometry(26, 27, 2.5, 8), mats.concrete));
  deck.position.y = 2.05;
  deck.rotation.y = Math.PI / 8;
  root.add(deck);

  const trench = shadow(new THREE.Mesh(northTrenchGeo(), mats.charred || mats.heat), false, true);
  trench.position.set(0, 0.12, 0);
  root.add(trench);
  const southCap = box(16, 3.2, 4.2, mats.concrete);
  southCap.position.set(0, 1.5, 10.4);
  root.add(southCap);
  const lipL = box(1.1, 2.4, 58, mats.concrete);
  lipL.position.set(-8.4, 1.9, -18);
  root.add(lipL);
  const lipR = lipL.clone();
  lipR.position.x = 8.4;
  root.add(lipR);
  const deflector = box(11, 2.4, 16, mats.heat);
  deflector.position.set(0, 1.35, -9);
  deflector.rotation.x = 0.38;
  root.add(deflector);
  const northOut = box(22, 0.5, 14, mats.charred || mats.carbon);
  northOut.position.set(0, 0.28, -58);
  root.add(northOut);

  const mount = shadow(new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.8, 1.6, 8), mats.carbon));
  mount.position.y = 3.4;
  mount.rotation.y = Math.PI / 8;
  root.add(mount);
  const ring = shadow(new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.18, 10, 32), mats.metal));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 4.2;
  root.add(ring);

  const clamps = new THREE.Group();
  clamps.name = 'clamps';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const post = cyl(0.18, 0.22, 2.4, mats.rustSteel, 12);
    post.position.set(Math.cos(a) * 3.4, 4.6, Math.sin(a) * 3.4);
    clamps.add(post);
    const cap = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), mats.metal));
    cap.position.set(Math.cos(a) * 3.4, 5.8, Math.sin(a) * 3.4);
    clamps.add(cap);
  }
  root.add(clamps);

  const strongback = makeStrongback(mats);
  strongback.position.set(-8.4, 2.3, 2);
  strongback.rotation.y = Math.PI;
  root.add(strongback);

  const rainSpots = [
    [10.5, -4],
    [-10.5, -4],
    [11, -18],
    [-11, -18],
    [12, -32],
    [-12, -32],
    [8.5, 6],
    [-8.5, 6],
    [14, 2],
    [-14, 2],
    [0, 14],
    [16, -10],
  ];
  rainSpots.forEach(([x, z]) => {
    const rb = makeRainbird(mats);
    rb.position.set(x, 2.15, z);
    root.add(rb);
  });

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.2;
    const px = Math.cos(a) * 28;
    const pz = Math.sin(a) * 28;
    const pole = cyl(0.13, 0.16, 15.5, mats.metal, 10);
    pole.position.set(px, 9.6, pz);
    root.add(pole);
    const fixture = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 12), mats.lamp || mats.metal));
    fixture.position.set(px, 17.4, pz);
    root.add(fixture);
    const shade = cyl(0.55, 0.22, 0.45, mats.carbon, 12);
    shade.position.set(px, 17.05, pz);
    root.add(shade);
    const spot = new THREE.SpotLight(0xffe3b8, 18, 90, 0.45, 0.55, 2);
    spot.position.set(px, 17.2, pz);
    spot.target.position.set(0, 8, 0);
    spot.castShadow = i < 2;
    if (spot.castShadow) {
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.bias = -0.00015;
      spot.shadow.normalBias = 0.035;
    }
    root.add(spot);
    root.add(spot.target);
  }

  const tower = makeWaterTower(mats);
  tower.position.set(-52, 0, -38);
  root.add(tower);

  const lox = shadow(new THREE.Mesh(new THREE.SphereGeometry(7.2, 28, 20), mats.white));
  lox.position.set(-78, 7.4, -18);
  root.add(lox);
  const loxSkirt = cyl(4.2, 5.4, 2.2, mats.concrete, 16);
  loxSkirt.position.set(-78, 1.1, -18);
  root.add(loxSkirt);
  const loxPipe = between(new THREE.Vector3(-72, 3.2, -18), new THREE.Vector3(-12, 3.4, -4), 0.22, mats.metal, 6);
  root.add(loxPipe);

  for (let i = 0; i < 4; i++) {
    const rp = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(1.55, 9.5, 6, 14), mats.white));
    rp.rotation.z = Math.PI / 2;
    rp.position.set(38 + (i % 2) * 4.6, 1.7, -36 - Math.floor(i / 2) * 5.2);
    root.add(rp);
  }
  const rpPipe = between(new THREE.Vector3(36, 2.2, -36), new THREE.Vector3(10, 3.2, -8), 0.16, mats.metal, 6);
  root.add(rpPipe);
  const berm = box(22, 1.4, 18, mats.concrete);
  berm.position.set(40, 0.7, -40);
  root.add(berm);

  const svc = [
    [-48, -8, 14, 5.5, 10],
    [-46, 18, 12, 4.2, 16],
    [-68, 8, 10, 3.6, 12],
  ];
  svc.forEach(([x, z, w, h, d]) => {
    const b = box(w, h, d, mats.hangar || mats.concrete);
    b.position.set(x, h / 2, z);
    root.add(b);
    const rf = box(w + 0.8, 0.28, d + 0.8, mats.carbon);
    rf.position.set(x, h + 0.12, z);
    root.add(rf);
  });

  const fenceMat = new THREE.MeshStandardMaterial({
    map: makeFenceTexture(),
    transparent: true,
    roughness: 0.7,
    metalness: 0.2,
    side: THREE.DoubleSide,
    alphaTest: 0.15,
  });
  fenceMat.map.repeat.set(18, 1);
  const peri = [
    [0, -72, 150, 0],
    [0, 72, 150, 0],
    [-75, 0, 144, Math.PI / 2],
    [75, 0, 144, Math.PI / 2],
  ];
  peri.forEach(([x, z, len, rot]) => {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(len, 3.2), fenceMat);
    f.position.set(x, 1.7, z);
    f.rotation.y = rot;
    root.add(f);
  });

  const roadW = shadow(new THREE.Mesh(new THREE.PlaneGeometry(10, 220), mats.asphalt), false, true);
  roadW.rotation.x = -Math.PI / 2;
  roadW.position.set(-32, 0.07, 40);
  root.add(roadW);
  const roadN = shadow(new THREE.Mesh(new THREE.PlaneGeometry(12, 160), mats.asphalt), false, true);
  roadN.rotation.x = -Math.PI / 2;
  roadN.rotation.z = Math.PI / 2;
  roadN.position.set(-20, 0.07, -78);
  root.add(roadN);

  const lot = shadow(new THREE.Mesh(new THREE.PlaneGeometry(38, 28), mats.asphalt), false, true);
  lot.rotation.x = -Math.PI / 2;
  lot.position.set(-58, 0.08, 42);
  root.add(lot);
  const carCols = [0x3a3f48, 0xc8cdd4, 0x6a2a22, 0x1c3a6a, 0xb8a060];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      const car = box(4.2, 1.35, 1.8, new THREE.MeshStandardMaterial({ color: carCols[(row + col) % 5], roughness: 0.45 }));
      car.position.set(-70 + col * 5.2, 0.75, 34 + row * 6.2);
      root.add(car);
    }
  }

  const dashMat = new THREE.MeshBasicMaterial({ color: 0xcfc8a8 });
  for (let i = 0; i < 16; i++) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 3.6), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(-32, 0.09, -20 + i * 9);
    root.add(dash);
  }

  return root;
}

export function createSky() {
  const group = new THREE.Group();
  group.name = 'daySky';

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x2f86d6) },
      mid: { value: new THREE.Color(0x7ec8f2) },
      bot: { value: new THREE.Color(0xeaf4ff) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vPos;
      uniform vec3 top;
      uniform vec3 mid;
      uniform vec3 bot;
      void main() {
        float h = normalize(vPos).y;
        vec3 col = mix(bot, mid, smoothstep(-0.12, 0.22, h));
        col = mix(col, top, smoothstep(0.18, 0.88, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 32), skyMat);
  group.add(dome);

  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(56, 32),
    new THREE.MeshBasicMaterial({
      color: 0xfff4cc,
      fog: false,
      toneMapped: false,
      depthWrite: false,
    })
  );
  sun.position.set(520, 1180, 340);
  sun.lookAt(0, 0, 0);
  group.add(sun);

  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(140, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffe9a8,
      transparent: true,
      opacity: 0.22,
      fog: false,
      toneMapped: false,
      depthWrite: false,
    })
  );
  halo.position.copy(sun.position).multiplyScalar(0.98);
  halo.lookAt(0, 0, 0);
  group.add(halo);

  return group;
}

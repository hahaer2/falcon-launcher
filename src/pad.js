import * as THREE from 'three';

function shadow(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function cyl(rTop, rBot, h, mat, segs = 20) {
  return shadow(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), mat));
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
    const deck = shadow(
      new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.12, 16), mats.carbon)
    );
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
      const hood = shadow(new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.carbon));
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

function trenchGeo() {
  const shape = new THREE.Shape();
  shape.moveTo(-6.2, -16);
  shape.lineTo(6.2, -16);
  shape.lineTo(4.4, 14);
  shape.lineTo(-4.4, 14);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 3.6,
    bevelEnabled: false,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

export function createPad(mats) {
  const root = new THREE.Group();
  root.name = 'pad';

  const ground = shadow(
    new THREE.Mesh(new THREE.CircleGeometry(520, 80), mats.asphalt || mats.concrete),
    false,
    true
  );
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);

  const apron = shadow(new THREE.Mesh(new THREE.CylinderGeometry(38, 40, 1.6, 12), mats.concrete));
  apron.position.y = 0.8;
  root.add(apron);

  const deck = shadow(new THREE.Mesh(new THREE.CylinderGeometry(22, 22.5, 2.4, 8), mats.concrete));
  deck.position.y = 2.0;
  deck.rotation.y = Math.PI / 8;
  root.add(deck);

  const trench = shadow(new THREE.Mesh(trenchGeo(), mats.charred || mats.heat), false, true);
  trench.position.set(0, 0.15, 7);
  root.add(trench);

  const trenchLipL = cyl(0.22, 0.22, 28, mats.concrete, 10);
  trenchLipL.rotation.x = Math.PI / 2;
  trenchLipL.position.set(-5.1, 2.55, 7);
  root.add(trenchLipL);
  const trenchLipR = trenchLipL.clone();
  trenchLipR.position.x = 5.1;
  root.add(trenchLipR);

  const mount = shadow(new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.9, 1.5, 8), mats.carbon));
  mount.position.y = 3.35;
  mount.rotation.y = Math.PI / 8;
  root.add(mount);

  const ring = shadow(new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.16, 10, 32), mats.metal));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 4.15;
  root.add(ring);

  const clamps = new THREE.Group();
  clamps.name = 'clamps';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const post = cyl(0.18, 0.22, 2.4, mats.rustSteel, 12);
    post.position.set(Math.cos(a) * 2.55, 4.55, Math.sin(a) * 2.55);
    clamps.add(post);
    const cap = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), mats.metal));
    cap.position.set(Math.cos(a) * 2.55, 5.75, Math.sin(a) * 2.55);
    clamps.add(cap);
  }
  root.add(clamps);

  const strongback = makeStrongback(mats);
  strongback.position.set(7.6, 2.3, 0);
  root.add(strongback);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.15;
    const px = Math.cos(a) * 24;
    const pz = Math.sin(a) * 24;
    const pole = cyl(0.13, 0.16, 15.5, mats.metal, 10);
    pole.position.set(px, 9.6, pz);
    root.add(pole);

    const fixture = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 12), mats.lamp || mats.metal));
    fixture.position.set(px, 17.4, pz);
    root.add(fixture);

    const shade = cyl(0.55, 0.22, 0.45, mats.carbon, 12);
    shade.position.set(px, 17.05, pz);
    root.add(shade);

    const spot = new THREE.SpotLight(0xffe3b8, 220, 110, 0.45, 0.55, 2);
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

  const waterStem = cyl(0.55, 0.7, 11, mats.white, 16);
  waterStem.position.set(-30, 6.5, -18);
  root.add(waterStem);
  const tankPts = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const y = t * 5.2;
    const r = 2.4 * Math.sin(Math.PI * Math.min(1, t * 1.05));
    tankPts.push(new THREE.Vector2(Math.max(0.2, r), y));
  }
  const tank = shadow(new THREE.Mesh(new THREE.LatheGeometry(tankPts, 28), mats.white));
  tank.position.set(-30, 11.2, -18);
  root.add(tank);

  for (let i = 0; i < 3; i++) {
    const x = -48 + i * 58;
    const mast = cyl(0.16, 0.32, 62, mats.metal, 10);
    mast.position.set(x, 32, -78);
    root.add(mast);
    const tip = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), mats.metal));
    tip.position.set(x, 63.2, -78);
    root.add(tip);
    for (let k = 1; k <= 4; k++) {
      const ring = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.55 + k * 0.08, 0.04, 6, 16), mats.rustSteel));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 8 + k * 12, -78);
      root.add(ring);
    }
  }

  const road = shadow(new THREE.Mesh(new THREE.PlaneGeometry(16, 220), mats.asphalt || mats.carbon), false, true);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.04, -110);
  root.add(road);

  const dashMat = new THREE.MeshBasicMaterial({ color: 0xcfc8a8 });
  for (let i = 0; i < 18; i++) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 4.2), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.06, -28 - i * 9);
    root.add(dash);
  }

  for (let i = 0; i < 3; i++) {
    const tank = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(1.15, 6.5, 6, 16), mats.white));
    tank.rotation.z = Math.PI / 2;
    tank.position.set(-22, 1.4, 16 + i * 4.2);
    root.add(tank);
  }

  const horizon = new THREE.Mesh(
    new THREE.CylinderGeometry(480, 520, 28, 48, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x10182c,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.55,
      fog: true,
    })
  );
  horizon.position.y = 6;
  root.add(horizon);

  return root;
}

export function createSky() {
  const group = new THREE.Group();

  const makeLayer = (count, r0, r1, size, opacity) => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = r0 + Math.random() * (r1 - r0);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.02 + Math.random() * 0.92);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xe8f0ff,
        size,
        sizeAttenuation: true,
        transparent: true,
        opacity,
        depthWrite: false,
      })
    );
  };

  group.add(makeLayer(3200, 420, 520, 0.9, 0.75));
  group.add(makeLayer(220, 430, 500, 2.4, 0.95));
  return group;
}

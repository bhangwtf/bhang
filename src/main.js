/**
 * BHANG.WTF — Sacred Temple, 3D leaf hero
 */
import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect, ChromaticAberrationEffect, VignetteEffect } from 'postprocessing';

// ─── State ───
let renderer, camera, clock, composer;
let scene, leaf, spot;
let mouseX = 0, mouseY = 0, tiltX = 0, tiltY = 0;
let smoke, embers;

// ═══ LEAF BUILDER ═══
function env(t) {
  if (t < 0.04) return lp(0.05, 0.35, t / 0.04);
  if (t < 0.15) return lp(0.35, 0.80, (t - 0.04) / 0.11);
  if (t < 0.35) return lp(0.80, 1.00, (t - 0.15) / 0.20);
  if (t < 0.50) return lp(1.00, 0.92, (t - 0.35) / 0.15);
  if (t < 0.62) return lp(0.92, 0.78, (t - 0.50) / 0.12);
  if (t < 0.75) return lp(0.78, 0.50, (t - 0.62) / 0.13);
  if (t < 0.88) return lp(0.50, 0.18, (t - 0.75) / 0.13);
  return lp(0.18, 0.00, (t - 0.88) / 0.12);
}
function lp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
function serr(t, w, hw, tps) {
  if (t < 0.12 || w < 0.1) return 0;
  let sd;
  if (t < 0.30) sd = lp(0, 0.6, (t - 0.12) / 0.18);
  else if (t < 0.55) sd = lp(0.6, 1.0, (t - 0.30) / 0.25);
  else if (t < 0.80) sd = lp(1.0, 0.5, (t - 0.55) / 0.25);
  else if (t < 0.92) sd = lp(0.5, 0.15, (t - 0.80) / 0.12);
  else return 0;
  if (sd < 0.01) return 0;
  const ph = (t * tps) % 1;
  const depth = hw * 0.25 * w * sd;
  return ph < 0.65 ? lp(0, depth, ph / 0.65) : lp(depth, -depth * 0.1, (ph - 0.65) / 0.35);
}

// Simple noise
function hash(x, y) { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
function smoothNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return lp(lp(hash(ix, iy), hash(ix + 1, iy), sx), lp(hash(ix, iy + 1), hash(ix + 1, iy + 1), sx), sy);
}
function fbm(x, y) { return smoothNoise(x, y) * 0.5 + smoothNoise(x * 2, y * 2) * 0.25 + smoothNoise(x * 4, y * 4) * 0.125; }

function buildLeaf() {
  const group = new THREE.Group();
  const L = 1.0;
  const fingers = [
    { hw: L * 0.07,  len: L * 1.00, angle: 0 },
    { hw: L * 0.065, len: L * 0.88, angle: -0.489 },
    { hw: L * 0.065, len: L * 0.88, angle:  0.489 },
    { hw: L * 0.055, len: L * 0.65, angle: -0.960 },
    { hw: L * 0.055, len: L * 0.65, angle:  0.960 },
    { hw: L * 0.045, len: L * 0.40, angle: -1.361 },
    { hw: L * 0.045, len: L * 0.40, angle:  1.361 },
    { hw: L * 0.034, len: L * 0.225, angle: -1.833 },
    { hw: L * 0.034, len: L * 0.225, angle:  1.833 },
  ];
  const order = [7, 8, 5, 6, 3, 4, 1, 2, 0];

  for (let oi = 0; oi < order.length; oi++) {
    const idx = order[oi];
    const f = fingers[idx];
    const dkR = idx === 0 ? 1.0 : (idx < 3 ? 0.92 : (idx < 7 ? 0.82 : 0.72));
    const steps = 50;
    const tps = Math.max(8, Math.round(f.len / (f.hw * 0.8)));
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    for (let i = 1; i <= steps; i++) { const t = i / steps; const w = env(t); shape.lineTo(f.hw * w + serr(t, w, f.hw, tps), f.len * t); }
    for (let i = steps; i >= 0; i--) { const t = i / steps; const w = env(t); shape.lineTo(-(f.hw * w + serr(t, w, f.hw, tps)), f.len * t); }

    // Bright green leaf — strong emissive for glow
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0.15 * dkR, 0.50 * dkR, 0.10 * dkR),
      roughness: 0.45, metalness: 0.05, side: THREE.DoubleSide,
      emissive: new THREE.Color(0.06 * dkR, 0.18 * dkR, 0.04 * dkR), emissiveIntensity: 0.8,
      transmission: 0.2, thickness: 0.4,
      clearcoat: 0.4, clearcoatRoughness: 0.3
    }));
    mesh.rotation.z = -f.angle;
    mesh.position.z = oi * 0.003;
    group.add(mesh);

    const innerShape = new THREE.Shape();
    innerShape.moveTo(0, 0);
    for (let i = 1; i <= 30; i++) { const t = i / 30; innerShape.lineTo(f.hw * 0.3 * env(t), f.len * 0.92 * t); }
    for (let i = 30; i >= 0; i--) { const t = i / 30; innerShape.lineTo(-f.hw * 0.3 * env(t), f.len * 0.92 * t); }
    const inner = new THREE.Mesh(new THREE.ShapeGeometry(innerShape), new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0.25 * dkR, 0.65 * dkR, 0.15 * dkR),
      roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide,
      emissive: new THREE.Color(0.08 * dkR, 0.22 * dkR, 0.05 * dkR), emissiveIntensity: 0.6,
      transmission: 0.2, thickness: 0.4,
      clearcoat: 0.4, clearcoatRoughness: 0.3
    }));
    inner.rotation.z = -f.angle;
    inner.position.z = oi * 0.003 + 0.004;
    group.add(inner);

    const pts = [];
    for (let i = 0; i <= 15; i++) pts.push(new THREE.Vector3(0, f.len * (i / 15) * 0.9, oi * 0.003 + 0.006));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x22aa22, transparent: true, opacity: 0.7 }));
    line.rotation.z = -f.angle;
    group.add(line);
  }

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.02, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0x1a4010, roughness: 0.7 }));
  stem.position.y = -0.15;
  group.add(stem);
  group.position.y = 0;
  return group;
}

// ═══ HELPERS ═══
function makeParticles(count, color, size, opacity, spread, height, additive) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = Math.random() * height - height * 0.3;
    pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color, size, transparent: true, opacity,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false
  }));
}

function addLight(s, light, x, y, z) { light.position.set(x, y, z); s.add(light); return light; }

// Procedural rock — displaced icosahedron
function makeRock(sx, sy, sz, detail) {
  const geo = new THREE.IcosahedronGeometry(1, detail || 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const disp = 1 + fbm(x * 3 + 7, z * 3 + 13) * 0.5 - 0.15;
    pos.setX(i, x * sx * disp);
    pos.setY(i, y * sy * disp);
    pos.setZ(i, z * sz * disp);
  }
  geo.computeVertexNormals();
  return geo;
}

// ═══ TEMPLE ═══
function buildTemple() {
  const s = new THREE.Scene();
  // Misty gray background — like igloo's atmospheric sky
  s.background = new THREE.Color(0x2a2d35);
  // Gray-white fog — mountains fade into mist like Himalayas
  s.fog = new THREE.Fog(0x2a2d35, 10, 28);

  // Hemisphere — cool misty sky above, warm ground below
  s.add(new THREE.HemisphereLight(0x99a0b0, 0x2a2015, 0.8));
  s.add(new THREE.AmbientLight(0x1a1820, 0.5));

  // ── Hero spotlight — gold, dramatic ──
  spot = new THREE.SpotLight(0xD4AF37, 10, 20, Math.PI / 5, 0.5, 0.7);
  spot.position.set(0, 10, 2);
  spot.castShadow = true;
  spot.shadow.mapSize.width = 2048;
  spot.shadow.mapSize.height = 2048;
  spot.shadow.radius = 4;
  spot.shadow.bias = -0.0005;
  s.add(spot);

  // Green uplight from pedestal — makes leaf GLOW
  addLight(s, new THREE.PointLight(0x22ff44, 3, 8), 0, -0.5, 0);
  // Wide overhead wash
  const wash = new THREE.SpotLight(0x887766, 3, 30, Math.PI / 2, 0.8, 0.4);
  wash.position.set(0, 14, -2); s.add(wash);
  // Cool atmosphere fill — illuminates snowy peaks
  addLight(s, new THREE.PointLight(0x6688bb, 2.0, 35), -6, 6, -10);
  addLight(s, new THREE.PointLight(0x6688bb, 2.0, 35), 6, 6, -10);
  // High sky light — overall mountain illumination
  addLight(s, new THREE.PointLight(0x8899aa, 1.5, 40), 0, 12, -12);
  // Warm rim lights
  addLight(s, new THREE.PointLight(0xFF6600, 1.0, 18), -4, 2, -1);
  addLight(s, new THREE.PointLight(0xD4AF37, 0.8, 18), 4, 2, -1);
  // Floor bounce
  addLight(s, new THREE.PointLight(0xD4AF37, 0.5, 8), 0, -3, 0);
  // Front floor fill
  addLight(s, new THREE.PointLight(0x443355, 0.6, 12), -2, -2, 4);
  addLight(s, new THREE.PointLight(0x443355, 0.6, 12), 2, -2, 4);
  // Column/rock side lights
  addLight(s, new THREE.PointLight(0x886644, 1.2, 15), -5, 0, 0);
  addLight(s, new THREE.PointLight(0x886644, 1.2, 15), 5, 0, 0);

  // ── Floor — stone tiles with displacement ──
  const floorGeo = new THREE.PlaneGeometry(40, 40, 100, 100);
  const floorPos = floorGeo.attributes.position;
  for (let i = 0; i < floorPos.count; i++) {
    const x = floorPos.getX(i), y = floorPos.getY(i);
    const dist = Math.sqrt(x * x + y * y);
    const flatZone = Math.max(0, Math.min(1, (dist - 3) / 3));
    floorPos.setZ(i, fbm(x * 0.4, y * 0.4) * 0.3 * flatZone);
  }
  floorGeo.computeVertexNormals();
  const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({
    color: 0x1a1815, roughness: 0.5, metalness: 0.2
  }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.5;
  floor.receiveShadow = true;
  s.add(floor);

  // Concentric floor circles — ornate pattern
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x2a2218, roughness: 0.3, metalness: 0.4 });
  const ringGold = new THREE.MeshStandardMaterial({
    color: 0x8B6914, roughness: 0.25, metalness: 0.85,
    emissive: 0x2a1800, emissiveIntensity: 0.1
  });
  for (const [radius, mat, tube] of [
    [1.2, ringGold, 0.04], [1.8, ringMat, 0.03], [2.5, ringGold, 0.035],
    [3.2, ringMat, 0.025], [4.0, ringGold, 0.03], [5.0, ringMat, 0.02],
    [6.5, ringMat, 0.02], [8.0, ringMat, 0.015]
  ]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 80), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -3.49;
    s.add(ring);
  }

  // Radial lines on floor — like compass rose
  const lineMat = new THREE.MeshStandardMaterial({ color: 0x2a2015, roughness: 0.4, metalness: 0.3 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 5), lineMat);
    line.position.set(Math.cos(a) * 3.5, -3.49, Math.sin(a) * 3.5);
    line.rotation.y = -a;
    s.add(line);
  }

  // ── PEDESTAL — massive, ornate, dominates lower frame ──
  const pedGold = new THREE.MeshStandardMaterial({
    color: 0xB8860B, roughness: 0.15, metalness: 0.95,
    emissive: 0x4a3000, emissiveIntensity: 0.25
  });
  const pedDarkMetal = new THREE.MeshStandardMaterial({ color: 0x1a1815, roughness: 0.4, metalness: 0.7 });
  const pedStoneDark = new THREE.MeshStandardMaterial({ color: 0x201a14, roughness: 0.6, metalness: 0.15 });

  // Wide base platform
  const baseGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.4, 12);
  const base = new THREE.Mesh(baseGeo, pedStoneDark);
  base.position.y = -3.3;
  base.castShadow = true; base.receiveShadow = true;
  s.add(base);

  // Base gold trim
  const bt = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.05, 8, 12), pedGold);
  bt.rotation.x = -Math.PI / 2; bt.position.y = -3.1; s.add(bt);

  // Main pedestal body — large, tapered
  const bodyGeo = new THREE.CylinderGeometry(0.9, 1.3, 2.0, 12);
  const body = new THREE.Mesh(bodyGeo, pedDarkMetal);
  body.position.y = -2.1;
  body.castShadow = true; body.receiveShadow = true;
  s.add(body);

  // Gold band mid
  const mb = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.045, 8, 12), pedGold);
  mb.rotation.x = -Math.PI / 2; mb.position.y = -2.4; s.add(mb);

  // Upper section
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.6, 12), pedDarkMetal);
  upper.position.y = -0.8;
  upper.castShadow = true; upper.receiveShadow = true;
  s.add(upper);

  // Gold band upper
  const ub = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.04, 8, 12), pedGold);
  ub.rotation.x = -Math.PI / 2; ub.position.y = -1.05; s.add(ub);

  // Top dish — where leaf sits
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.7, 0.15, 16), new THREE.MeshStandardMaterial({
    color: 0x1a3a1a, roughness: 0.25, metalness: 0.5,
    emissive: 0x0a2a0a, emissiveIntensity: 0.3
  }));
  dish.position.y = -0.43;
  dish.castShadow = true; dish.receiveShadow = true;
  s.add(dish);

  // Top gold rim
  const tr = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.035, 8, 16), pedGold);
  tr.rotation.x = -Math.PI / 2; tr.position.y = -0.35; s.add(tr);

  // Pedestal legs/feet — extending outward from base
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1a1815, roughness: 0.5, metalness: 0.6 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    // Curved leg
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.5, 6), legMat);
    leg.position.set(Math.cos(a) * 1.5, -3.1, Math.sin(a) * 1.5);
    leg.rotation.z = Math.cos(a) * 0.4;
    leg.rotation.x = Math.sin(a) * 0.4;
    s.add(leg);
    // Foot pad
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), legMat);
    foot.position.set(Math.cos(a) * 1.8, -3.48, Math.sin(a) * 1.8);
    s.add(foot);
  }

  // ── COLUMNS — ancient ornate pillars with fluting and layered capitals ──
  const colStoneMat = new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.65, metalness: 0.1 });
  const colCapStoneMat = new THREE.MeshStandardMaterial({ color: 0x302a22, roughness: 0.5, metalness: 0.15 });
  const colGoldBand = new THREE.MeshStandardMaterial({
    color: 0x8B6914, roughness: 0.25, metalness: 0.85,
    emissive: 0x2a1800, emissiveIntensity: 0.15
  });
  const colCarvingMat = new THREE.MeshStandardMaterial({ color: 0x352e25, roughness: 0.45, metalness: 0.2 });

  // Fluted column shaft — cylinder with carved grooves
  function makeFlutedShaft(radius, height, flutes) {
    const geo = new THREE.CylinderGeometry(radius, radius * 1.08, height, 32, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const angle = Math.atan2(z, x);
      // Fluting — sinusoidal grooves around circumference
      const fluteDepth = Math.sin(angle * flutes) * radius * 0.08;
      const r = Math.sqrt(x * x + z * z);
      if (r > 0.01) {
        const newR = r + fluteDepth;
        pos.setX(i, (x / r) * newR);
        pos.setZ(i, (z / r) * newR);
      }
    }
    geo.computeVertexNormals();
    return geo;
  }

  const colData = [];
  for (let i = 0; i < 10; i++) {
    const a = Math.PI * 0.8 + (i / 9) * Math.PI * 1.4;
    const r = 5.5;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    colData.push({ x, z });

    // === PLINTH (multi-tier base) ===
    // Bottom step
    const step1 = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.2, 8), colCapStoneMat);
    step1.position.set(x, -3.4, z); step1.receiveShadow = true; s.add(step1);
    // Middle step
    const step2 = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.58, 0.2, 8), colCapStoneMat);
    step2.position.set(x, -3.2, z); step2.receiveShadow = true; s.add(step2);
    // Top step / torus base
    const step3 = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.2, 10), colStoneMat);
    step3.position.set(x, -3.0, z); s.add(step3);
    // Gold ring at base
    const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 6, 10), colGoldBand);
    baseRing.rotation.x = -Math.PI / 2; baseRing.position.set(x, -2.9, z); s.add(baseRing);

    // === FLUTED SHAFT ===
    const shaft = new THREE.Mesh(makeFlutedShaft(0.32, 8.5, 16), colStoneMat);
    shaft.position.set(x, 1.15, z);
    shaft.castShadow = true; shaft.receiveShadow = true; s.add(shaft);

    // Decorative bands along shaft
    for (const bandY of [-1.5, 1.5, 3.5]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.02, 6, 16), colCarvingMat);
      band.rotation.x = -Math.PI / 2; band.position.set(x, bandY, z); s.add(band);
    }
    // Gold accent band at shaft center
    const midGold = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.022, 6, 16), colGoldBand);
    midGold.rotation.x = -Math.PI / 2; midGold.position.set(x, 0, z); s.add(midGold);

    // === CAPITAL (layered, ornate) ===
    // Necking ring
    const neck = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.03, 8, 12), colCarvingMat);
    neck.rotation.x = -Math.PI / 2; neck.position.set(x, 5.35, z); s.add(neck);
    // Echinus (curved spreading element)
    const echinus = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.34, 0.35, 12), colCapStoneMat);
    echinus.position.set(x, 5.6, z); s.add(echinus);
    // Gold ring on echinus
    const capGold = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.025, 6, 12), colGoldBand);
    capGold.rotation.x = -Math.PI / 2; capGold.position.set(x, 5.7, z); s.add(capGold);
    // Abacus (flat square-ish top slab)
    const abacus = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 1.0), colCapStoneMat);
    abacus.position.set(x, 5.88, z); s.add(abacus);
    // Top gold trim on abacus
    const topTrim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.02, 6, 4), colGoldBand);
    topTrim.rotation.x = -Math.PI / 2; topTrim.position.set(x, 5.98, z); s.add(topTrim);
  }

  // Lintels between columns
  const lintMat = new THREE.MeshStandardMaterial({ color: 0x251f18, roughness: 0.8 });
  for (let i = 0; i < colData.length - 1; i++) {
    const p1 = colData[i], p2 = colData[i + 1];
    const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.z - p1.z) ** 2);
    const a = Math.atan2(p2.z - p1.z, p2.x - p1.x);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(dist, 0.5, 0.6), lintMat);
    lintel.position.set((p1.x + p2.x) / 2, 6.1, (p1.z + p2.z) / 2);
    lintel.rotation.y = -a; s.add(lintel);
  }

  // (No rear wall — open to mountain backdrop)

  // ── SNOWY MOUNTAIN BACKDROP — Himalayan peaks visible through columns ──

  // Snow mountain material — vertex color blend: white snow on top, gray rock below
  function makeSnowMountain(sx, sy, sz, detail) {
    const geo = new THREE.IcosahedronGeometry(1, detail || 3);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      // Displace for rocky shape
      const disp = 1 + fbm(x * 2.5 + 17, z * 2.5 + 31) * 0.5 - 0.1;
      pos.setX(i, x * sx * disp);
      pos.setY(i, y * sy * disp);
      pos.setZ(i, z * sz * disp);

      // Snow on upper faces, rock on lower — based on displaced Y
      const worldY = y * sy * disp;
      const normalizedH = (worldY + sy) / (sy * 2);
      // Add noise to snow line for natural look
      const snowNoise = fbm(x * 4 + 5, z * 4 + 9) * 0.15;
      const snowAmount = Math.max(0, Math.min(1, (normalizedH - 0.3 + snowNoise) / 0.3));

      // Snow: bright white-gray (0.85, 0.87, 0.9), Rock: dark gray (0.25, 0.24, 0.23)
      colors[i * 3]     = 0.25 + snowAmount * 0.60;
      colors[i * 3 + 1] = 0.24 + snowAmount * 0.63;
      colors[i * 3 + 2] = 0.23 + snowAmount * 0.67;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }

  const snowMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.75,
    metalness: 0.05
  });
  // Distant peaks get foggier look
  const snowMatFar = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.02
  });

  const mtConfigs = [
    // Far Himalayan peaks — massive, towering
    { x: 0,   y: 4,  z: -18, sx: 7,   sy: 7,   sz: 5,   far: true },
    { x: -7,  y: 3,  z: -17, sx: 6,   sy: 6,   sz: 4.5, far: true },
    { x: 7,   y: 3.5,z: -16, sx: 5.5, sy: 6.5, sz: 4,   far: true },
    { x: -13, y: 2,  z: -15, sx: 5,   sy: 5,   sz: 4,   far: true },
    { x: 13,  y: 2,  z: -15, sx: 5,   sy: 4.5, sz: 4,   far: true },
    // Mid peaks — visible between columns
    { x: -8,  y: 1,  z: -10, sx: 3,   sy: 4,   sz: 2.5, far: false },
    { x: 8,   y: 0.5,z: -10, sx: 3,   sy: 3.5, sz: 2.5, far: false },
    { x: 0,   y: 0,  z: -12, sx: 4,   sy: 3.5, sz: 3,   far: false },
    { x: -4,  y: 0.5,z: -11, sx: 2.5, sy: 3,   sz: 2,   far: false },
    { x: 4,   y: 0,  z: -11, sx: 2.5, sy: 3,   sz: 2,   far: false },
    // Side cliffs — rocky outcrops framing the temple
    { x: -9,  y: -0.5, z: -4, sx: 3,  sy: 4.5, sz: 3,   far: false },
    { x: 9,   y: -0.5, z: -4, sx: 3,  sy: 4.5, sz: 3,   far: false },
    { x: -10, y: -2,   z: 0,  sx: 2.5,sy: 3,   sz: 2,   far: false },
    { x: 10,  y: -2,   z: 0,  sx: 2.5,sy: 3,   sz: 2,   far: false },
  ];

  mtConfigs.forEach(({ x, y, z, sx, sy, sz, far }, idx) => {
    const geo = makeSnowMountain(sx, sy, sz, far ? 3 : 2);
    const rock = new THREE.Mesh(geo, far ? snowMatFar : snowMat);
    rock.position.set(x, y, z);
    rock.rotation.set(idx * 0.4, idx * 0.9, idx * 0.3);
    s.add(rock);
  });

  // Snowy ground plane extending beyond temple floor — connects temple to mountains
  const snowGroundGeo = new THREE.PlaneGeometry(50, 50, 60, 60);
  const sgPos = snowGroundGeo.attributes.position;
  for (let i = 0; i < sgPos.count; i++) {
    const x = sgPos.getX(i), y = sgPos.getY(i);
    const dist = Math.sqrt(x * x + y * y);
    if (dist > 6) {
      sgPos.setZ(i, fbm(x * 0.3, y * 0.3) * 0.6 - 0.2);
    }
  }
  snowGroundGeo.computeVertexNormals();
  const snowGround = new THREE.Mesh(snowGroundGeo, new THREE.MeshStandardMaterial({
    color: 0x8a8d92, roughness: 0.7, metalness: 0.05
  }));
  snowGround.rotation.x = -Math.PI / 2;
  snowGround.position.y = -3.6;
  s.add(snowGround);

  // ── Small crystal clusters at pedestal base ──
  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: 0x88ccff, roughness: 0.1, metalness: 0.2,
    transmission: 0.6, thickness: 0.5, clearcoat: 1.0,
    emissive: 0x2244aa, emissiveIntensity: 0.3
  });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    const r = 1.6 + Math.random() * 0.3;
    const h = 0.15 + Math.random() * 0.35;
    const crystal = new THREE.Mesh(
      new THREE.ConeGeometry(0.04 + Math.random() * 0.06, h, 5),
      crystalMat
    );
    crystal.position.set(Math.cos(a) * r, -3.3 + h / 2, Math.sin(a) * r);
    crystal.rotation.z = (Math.random() - 0.5) * 0.4;
    crystal.rotation.x = (Math.random() - 0.5) * 0.3;
    s.add(crystal);
  }

  // ── Atmospheric haze — misty, like mountain fog ──
  const hazeMat = new THREE.MeshBasicMaterial({
    color: 0x2a2d35, transparent: true, opacity: 0.025,
    side: THREE.DoubleSide, depthWrite: false
  });
  for (const y of [-2, -1, 0, 1, 2, 3, 4, 5, 6, 8]) {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), hazeMat);
    h.rotation.x = -Math.PI / 2; h.position.y = y; s.add(h);
  }
  // Vertical depth haze — gray mist layers
  const vhMat = new THREE.MeshBasicMaterial({
    color: 0x252830, transparent: true, opacity: 0.02,
    side: THREE.DoubleSide, depthWrite: false
  });
  for (const z of [-8, -5, -2, 1, 4, 7]) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(22, 14), vhMat);
    v.position.set(0, 2, z); s.add(v);
  }

  // Particles
  smoke = makeParticles(500, 0xD4AF37, 0.018, 0.1, 14, 12, true);
  embers = makeParticles(80, 0xFF6600, 0.012, 0.35, 6, 8, true);
  s.add(smoke); s.add(embers);

  return s;
}

// ═══ INIT ═══
function init() {
  const container = document.getElementById('app');
  clock = new THREE.Clock();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  container.appendChild(renderer.domElement);

  composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });

  // Front hero angle — slightly below center, looking slightly up
  camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 0.2, 5);
  camera.lookAt(0, 0.3, 0);

  leaf = buildLeaf();
  leaf.traverse(child => { if (child.isMesh) child.castShadow = true; });

  scene = buildTemple();
  scene.add(leaf);

  const renderPass = new RenderPass(scene, camera);
  const bloom = new BloomEffect({
    intensity: 1.2,
    luminanceThreshold: 0.45,
    luminanceSmoothing: 0.4,
    mipmapBlur: true
  });
  const smaa = new SMAAEffect();
  const ca = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0005, 0.0005) });
  const vignette = new VignetteEffect({ darkness: 0.6, offset: 0.3 });

  composer.addPass(renderPass);
  composer.addPass(new EffectPass(camera, bloom, smaa, vignette));
  composer.addPass(new EffectPass(camera, ca));

  document.getElementById('loader').classList.add('hidden');

  window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });
  window.addEventListener('mouseleave', () => { mouseX = 0; mouseY = 0; });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(render);
}

function render() {
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // Mouse tilt
  tiltX += (mouseY * -8 - tiltX) * 0.04;
  tiltY += (mouseX * 10 - tiltY) * 0.04;
  leaf.rotation.y = Math.sin(time * 0.2) * 0.15 + THREE.MathUtils.degToRad(tiltY);
  leaf.rotation.x = THREE.MathUtils.degToRad(tiltX) + 0.1;
  leaf.rotation.z = Math.sin(time * 0.15) * 0.03;
  leaf.position.y = 0 + Math.sin(time * 0.4) * 0.06;

  // Spotlight flicker
  spot.intensity = 9 + Math.sin(time * 1.5) * 1;

  // Particles
  [smoke, embers].forEach(p => {
    const a = p.geometry.attributes.position.array;
    const spd = p === embers ? 0.25 : 0.06;
    for (let i = 0; i < a.length; i += 3) {
      a[i + 1] += delta * spd;
      a[i] += Math.sin(time * 0.5 + i) * delta * 0.012;
      if (a[i + 1] > 8) { a[i + 1] = -3; a[i] = (Math.random() - 0.5) * 7; }
    }
    p.geometry.attributes.position.needsUpdate = true;
  });

  // Breathing pulse
  leaf.children.forEach(child => {
    if (child.isMesh && child.material.roughness < 0.5) {
      child.material.emissiveIntensity = 0.5 + Math.sin(time * 0.8) * 0.2;
    }
  });

  composer.render(delta);
}

try {
  init();
} catch (e) {
  console.error('INIT ERROR:', e);
  document.getElementById('loader').innerHTML = '<div style="color:red;font:14px monospace;padding:20px;white-space:pre-wrap;">ERROR: ' + e.message + '\n' + e.stack + '</div>';
}

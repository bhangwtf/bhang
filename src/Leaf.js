/**
 * Leaf — Procedural 3D cannabis leaf
 * 9 serrated leaflets with veins and stem, using ShapeGeometry
 */
import * as THREE from 'three';

function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }

function leafletEnv(t) {
  if (t < 0.04) return lerp(0.05, 0.35, t / 0.04);
  if (t < 0.15) return lerp(0.35, 0.80, (t - 0.04) / 0.11);
  if (t < 0.35) return lerp(0.80, 1.00, (t - 0.15) / 0.20);
  if (t < 0.50) return lerp(1.00, 0.92, (t - 0.35) / 0.15);
  if (t < 0.62) return lerp(0.92, 0.78, (t - 0.50) / 0.12);
  if (t < 0.75) return lerp(0.78, 0.50, (t - 0.62) / 0.13);
  if (t < 0.88) return lerp(0.50, 0.18, (t - 0.75) / 0.13);
  return lerp(0.18, 0.00, (t - 0.88) / 0.12);
}

function midribBend(t, hw, dir) {
  return hw * Math.sin(t * Math.PI) * (dir < 0 ? 0.7 : 0.4) * (1 - t * 0.5) * dir;
}

function serrationDepth(t) {
  if (t < 0.12) return 0;
  if (t < 0.30) return lerp(0, 0.6, (t - 0.12) / 0.18);
  if (t < 0.55) return lerp(0.6, 1.0, (t - 0.30) / 0.25);
  if (t < 0.80) return lerp(1.0, 0.5, (t - 0.55) / 0.25);
  if (t < 0.92) return lerp(0.5, 0.15, (t - 0.80) / 0.12);
  return 0;
}

function leafletSerration(t, w, hw, tps) {
  const sd = serrationDepth(t);
  if (sd < 0.01 || w < 0.1) return 0;
  const ph = (t * tps) % 1;
  const depth = hw * 0.30 * w * sd;
  if (ph < 0.65) return lerp(0, depth, ph / 0.65);
  return lerp(depth, -depth * 0.1, (ph - 0.65) / 0.35);
}

function makeLeafletShape(hw, len) {
  const steps = 60;
  const tps = Math.max(8, Math.round(len / (hw * 0.8)));
  const shape = new THREE.Shape();

  // Start at base (0,0)
  shape.moveTo(0, 0);

  // Right edge going up
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const w = leafletEnv(t);
    const bx = midribBend(t, hw, 1);
    const x = bx + hw * w + leafletSerration(t, w, hw, tps);
    shape.lineTo(x, len * t);
  }

  // Left edge coming back down
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const w = leafletEnv(t);
    const bx = midribBend(t, hw, 1);
    const x = bx - (hw * w + leafletSerration(t, w, hw, tps));
    shape.lineTo(x, len * t);
  }

  return shape;
}

function makeVeinLines(hw, len, numVeins, color) {
  const group = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 });

  // Midrib
  const midPts = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20 * 0.94;
    midPts.push(new THREE.Vector3(midribBend(t, hw, 1), len * t, 0.005));
  }
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(midPts),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 })));

  // Side veins
  for (let v = 0; v < numVeins; v++) {
    const t = 0.18 + (v / numVeins) * 0.60;
    const y = len * t;
    const bx = midribBend(t, hw, 1);
    const ew = leafletEnv(t);
    const reach = hw * ew * 0.75;

    for (const side of [-1, 1]) {
      const pts = [
        new THREE.Vector3(bx, y, 0.005),
        new THREE.Vector3(bx + side * reach * 0.5, y + reach * 0.1, 0.005),
        new THREE.Vector3(bx + side * reach, y + reach * 0.25, 0.005),
      ];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
  }

  return group;
}

export function createLeaf(scale = 1) {
  const group = new THREE.Group();
  const L = scale * 2.0;

  // 9 leaflets: [halfWidth, length, angle]
  const fingers = [
    [L * 0.07, L * 1.00, 0],
    [L * 0.065, L * 0.88, -0.489],
    [L * 0.065, L * 0.88, 0.489],
    [L * 0.055, L * 0.65, -0.960],
    [L * 0.055, L * 0.65, 0.960],
    [L * 0.045, L * 0.40, -1.361],
    [L * 0.045, L * 0.40, 1.361],
    [L * 0.034, L * 0.225, -1.833],
    [L * 0.034, L * 0.225, 1.833],
  ];

  const order = [7, 8, 5, 6, 3, 4, 1, 2, 0];

  for (let oi = 0; oi < order.length; oi++) {
    const idx = order[oi];
    const [hw, len, angle] = fingers[idx];
    const dkR = idx === 0 ? 1.0 : (idx < 3 ? 0.92 : (idx < 7 ? 0.82 : 0.72));

    // Dark outer leaflet
    const darkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.20 * dkR, 0.43 * dkR, 0.12 * dkR),
      roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide,
      emissive: new THREE.Color(0.02, 0.06, 0.01), emissiveIntensity: 0.3
    });

    const shape = makeLeafletShape(hw, len);
    const geo = new THREE.ShapeGeometry(shape, 12);
    const mesh = new THREE.Mesh(geo, darkMat);
    mesh.rotation.z = -angle;
    mesh.position.z = oi * 0.003;
    group.add(mesh);

    // Light inner patch
    const lightMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.31 * dkR, 0.61 * dkR, 0.18 * dkR),
      roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide,
      emissive: new THREE.Color(0.04, 0.10, 0.02), emissiveIntensity: 0.25
    });
    const innerShape = makeLeafletShape(hw * 0.35, len * 0.92);
    const innerGeo = new THREE.ShapeGeometry(innerShape, 8);
    const innerMesh = new THREE.Mesh(innerGeo, lightMat);
    innerMesh.rotation.z = -angle;
    innerMesh.position.z = oi * 0.003 + 0.005;
    group.add(innerMesh);

    // Veins
    const numVeins = Math.max(3, Math.round(len / (hw * 1.5)));
    const veins = makeVeinLines(hw, len, numVeins, 0x1a4e10);
    veins.rotation.z = -angle;
    veins.position.z = oi * 0.003 + 0.008;
    group.add(veins);
  }

  // Stem — simple cylinder
  const stemGeo = new THREE.CylinderGeometry(L * 0.01, L * 0.018, L * 0.3, 6);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x1a4010, roughness: 0.7 });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.set(0, -L * 0.15, 0);
  group.add(stem);

  // Center the leaf — shift so it visually centers
  group.position.y = -L * 0.3;

  return group;
}

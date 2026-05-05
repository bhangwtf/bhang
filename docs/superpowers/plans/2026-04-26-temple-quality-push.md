# Temple Scene Quality Push — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the Temple scene to a premium grounded 3D environment with post-processing, upgraded geometry, shadows, and physical leaf materials.

**Architecture:** All visual changes happen in `src/main.js` — the `buildTemple()` function gets new geometry/lighting, `buildLeaf()` gets physical materials, `init()` gets the post-processing composer, and `render()` uses the composer. No module restructuring.

**Tech Stack:** Three.js, pmndrs postprocessing, GSAP (existing)

**Spec:** `docs/superpowers/specs/2026-04-26-temple-quality-push-design.md`

---

### Task 1: Install postprocessing and wire up EffectComposer

**Files:**
- Modify: `package.json` (new dependency)
- Modify: `src/main.js:1-11` (imports), `src/main.js:322-337` (init), `src/main.js:371-411` (render)

- [ ] **Step 1: Install postprocessing**

Run:
```bash
cd C:/Users/akhil/Main/wtf/projects/bhang.wtf && npm install postprocessing
```

- [ ] **Step 2: Add imports at top of main.js**

Add after the existing `import * as THREE from 'three';` line at `src/main.js:4`:

```js
import { EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect } from 'postprocessing';
```

- [ ] **Step 3: Add composer to state variables**

At `src/main.js:7`, add `composer` to the state declarations:

```js
let renderer, camera, clock, composer;
```

- [ ] **Step 4: Create EffectComposer in init()**

In the `init()` function, after `renderer.toneMappingExposure = 1.0;` (line ~332) and before `container.appendChild(renderer.domElement);`, add:

```js
  // Post-processing
  composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType
  });
```

Then after `camera.lookAt(0, 0, 0);` (line ~337), add:

```js
  // Composer passes — RenderPass added after scenes are built
```

Then after `scenes[0].scene.add(leaf);` (line ~342), add the passes:

```js
  // Post-processing passes
  const renderPass = new RenderPass(scenes[0].scene, camera);
  const bloom = new BloomEffect({
    intensity: 0.6,
    luminanceThreshold: 0.7,
    luminanceSmoothing: 0.3,
    mipmapBlur: true
  });
  const smaa = new SMAAEffect();
  composer.addPass(renderPass);
  composer.addPass(new EffectPass(camera, bloom, smaa));
  composer.renderPass = renderPass; // store ref for scene switching
```

- [ ] **Step 5: Replace renderer.render with composer.render in render loop**

In the `render()` function, replace the last line (`src/main.js:410`):

```js
  renderer.render(scenes[activeSceneIdx].scene, camera);
```

with:

```js
  composer.renderPass.mainScene = scenes[activeSceneIdx].scene;
  composer.render(delta);
```

- [ ] **Step 6: Update resize handler to resize composer**

In the resize event listener (line ~363), add after `renderer.setSize(...)`:

```js
    composer.setSize(window.innerWidth, window.innerHeight);
```

- [ ] **Step 7: Verify in browser**

Run: open `http://localhost:4201` in browser.
Expected: Temple scene renders with subtle bloom glow on the gold spotlight and embers, anti-aliased edges. No visual breakage.

---

### Task 2: Build multi-tier octagonal pedestal

**Files:**
- Modify: `src/main.js:135-181` (buildTemple function)

- [ ] **Step 1: Replace the single cylinder pedestal**

In `buildTemple()`, find the pedestal section (line ~152-153):

```js
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.25, metalness: 0.85 });
  addMesh(s, new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 1.8, 24), pedMat), 0, -1.6, 0);
```

Replace with multi-tier octagonal pedestal:

```js
  // Pedestal materials
  const pedGold = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.25, metalness: 0.85 });
  const pedStone = new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.7, metalness: 0.1 });
  const pedStoneLight = new THREE.MeshStandardMaterial({ color: 0x2a2218, roughness: 0.6, metalness: 0.1 });
  const pedPolished = new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.3, metalness: 0.2 });

  // Base tier — wide octagonal platform
  addMesh(s, new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.3, 8), pedStone), 0, -2.35, 0);
  // Gold trim ring between base and middle
  const trim1 = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.04, 8, 8), pedGold);
  trim1.rotation.x = -Math.PI / 2;
  trim1.position.set(0, -2.2, 0);
  s.add(trim1);

  // Middle tier — narrower octagonal column
  addMesh(s, new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.2, 8), pedStoneLight), 0, -1.6, 0);
  // Gold trim ring between middle and top
  const trim2 = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.035, 8, 8), pedGold);
  trim2.rotation.x = -Math.PI / 2;
  trim2.position.set(0, -1.0, 0);
  s.add(trim2);

  // Top platform — polished surface
  addMesh(s, new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.2, 8), pedPolished), 0, -0.9, 0);
  // Top gold trim ring
  const trim3 = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.03, 8, 8), pedGold);
  trim3.rotation.x = -Math.PI / 2;
  trim3.position.set(0, -0.8, 0);
  s.add(trim3);
```

- [ ] **Step 2: Adjust leaf position to sit on pedestal top**

In `buildLeaf()` at the bottom (line ~105), change:

```js
  group.position.y = -0.3;
```

to:

```js
  group.position.y = -0.55;
```

And in the `render()` function, update the floating bob (line ~381):

```js
  leaf.position.y = -0.3 + Math.sin(time * 0.4) * 0.08;
```

to:

```js
  leaf.position.y = -0.55 + Math.sin(time * 0.4) * 0.06;
```

This places the leaf just above the top platform with a subtle hover.

- [ ] **Step 3: Verify in browser**

Expected: Multi-tier octagonal pedestal with gold trim rings. Leaf floats just above the top platform. Gold trim catches the bloom glow.

---

### Task 3: Upgrade columns with base, capital, and lintel

**Files:**
- Modify: `src/main.js:155-159` (columns section in buildTemple)

- [ ] **Step 1: Replace simple cylinder columns**

Find the columns loop in `buildTemple()` (line ~156-159):

```js
  for (let i = 0; i < 8; i++) {
    const a = Math.PI + (i / 7) * Math.PI, r = 8;
    addMesh(s, new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 10, 8), new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.85 })), Math.cos(a) * r, 2.5, Math.sin(a) * r);
  }
```

Replace with:

```js
  // Column materials
  const colMat = new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.85 });
  const colCapMat = new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.7, metalness: 0.1 });

  const colPositions = [];
  for (let i = 0; i < 8; i++) {
    const a = Math.PI + (i / 7) * Math.PI;
    const r = 8;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    colPositions.push({ x, z, a });

    // Base — wider cylinder at bottom
    addMesh(s, new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.5, 8), colCapMat), x, -2.25, z);
    // Shaft — main column
    addMesh(s, new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 12, 8), colMat), x, 3.75, z);
    // Capital — wider cylinder at top
    addMesh(s, new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.25, 0.5, 8), colCapMat), x, 9.75, z);
  }

  // Lintels connecting adjacent columns
  const lintelMat = new THREE.MeshStandardMaterial({ color: 0x151008, roughness: 0.9 });
  for (let i = 0; i < colPositions.length - 1; i++) {
    const p1 = colPositions[i];
    const p2 = colPositions[i + 1];
    const mx = (p1.x + p2.x) / 2;
    const mz = (p1.z + p2.z) / 2;
    const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.z - p1.z) ** 2);
    const angle = Math.atan2(p2.z - p1.z, p2.x - p1.x);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(dist, 0.4, 0.5), lintelMat);
    lintel.position.set(mx, 10.0, mz);
    lintel.rotation.y = -angle;
    s.add(lintel);
  }
```

- [ ] **Step 2: Verify in browser**

Expected: 8 columns with visible base and capital details, connected by stone lintels across the top. Columns fade into fog at the edges.

---

### Task 4: Add rear wall and floor detail

**Files:**
- Modify: `src/main.js` (buildTemple function — after columns, before particles)

- [ ] **Step 1: Add curved rear wall**

After the lintels code, add:

```js
  // Rear wall — curved half-cylinder behind columns
  const wallGeo = new THREE.CylinderGeometry(10, 10, 14, 32, 1, true, Math.PI * 0.05, Math.PI * 0.9);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 0.9, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(0, 4.5, 0);
  s.add(wall);
```

- [ ] **Step 2: Add concentric floor rings around pedestal**

After the existing floor mesh (line ~149), add:

```js
  // Floor ring inlays
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x0d0a07, roughness: 0.5, metalness: 0.2 });
  for (const radius of [1.4, 2.0, 2.8, 3.8]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.025, 6, 64), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -2.49;
    s.add(ring);
  }
```

- [ ] **Step 3: Add fog layer planes**

After the floor rings, add:

```js
  // Volumetric fog layers — horizontal planes catching spotlight
  const fogLayerMat = new THREE.MeshBasicMaterial({
    color: 0x030201,
    transparent: true,
    opacity: 0.04,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  for (const y of [-1, 0.5, 2, 4, 6]) {
    const fogPlane = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), fogLayerMat);
    fogPlane.rotation.x = -Math.PI / 2;
    fogPlane.position.y = y;
    s.add(fogPlane);
  }
```

- [ ] **Step 4: Verify in browser**

Expected: Curved dark wall visible behind columns in the fog. Concentric ring pattern on floor around pedestal. Subtle fog layers create depth in the spotlight beam.

---

### Task 5: Enable shadow mapping and upgrade lighting

**Files:**
- Modify: `src/main.js:327-332` (renderer setup in init), `src/main.js:135-180` (buildTemple lighting)

- [ ] **Step 1: Enable shadow mapping on renderer**

In `init()`, after `renderer.toneMappingExposure = 1.0;` (line ~332), add:

```js
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
```

And change the exposure line from:

```js
  renderer.toneMappingExposure = 1.0;
```

to:

```js
  renderer.toneMappingExposure = 1.1;
```

- [ ] **Step 2: Enable shadows on spotlight in buildTemple**

Find the spotlight setup in `buildTemple()` (line ~141-142):

```js
  const spot = new THREE.SpotLight(0xD4AF37, 5, 20, Math.PI / 5, 0.5, 1);
  spot.position.set(0, 7, 3); s.add(spot);
```

Replace with:

```js
  const spot = new THREE.SpotLight(0xD4AF37, 5, 20, Math.PI / 5, 0.5, 1);
  spot.position.set(0, 7, 3);
  spot.castShadow = true;
  spot.shadow.mapSize.width = 1024;
  spot.shadow.mapSize.height = 1024;
  spot.shadow.radius = 4;
  spot.shadow.bias = -0.0005;
  s.add(spot);
```

- [ ] **Step 3: Enable shadow receive on floor**

Find the floor mesh in `buildTemple()` (line ~149):

```js
  addMesh(s, new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 0.7, metalness: 0.15 })), 0, -2.5, 0, -Math.PI / 2);
```

Replace with:

```js
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 0.7, metalness: 0.15 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.5;
  floor.receiveShadow = true;
  s.add(floor);
```

- [ ] **Step 4: Enable shadows on pedestal tiers**

Go back to the pedestal code from Task 2. For each `addMesh` call that creates a pedestal tier, we need to set `castShadow` and `receiveShadow`. Replace the pedestal `addMesh` calls with explicit mesh creation:

```js
  // Base tier
  const pedBase = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.3, 8), pedStone);
  pedBase.position.set(0, -2.35, 0);
  pedBase.castShadow = true;
  pedBase.receiveShadow = true;
  s.add(pedBase);

  // Middle tier
  const pedMid = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.2, 8), pedStoneLight);
  pedMid.position.set(0, -1.6, 0);
  pedMid.castShadow = true;
  pedMid.receiveShadow = true;
  s.add(pedMid);

  // Top platform
  const pedTop = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.2, 8), pedPolished);
  pedTop.position.set(0, -0.9, 0);
  pedTop.castShadow = true;
  pedTop.receiveShadow = true;
  s.add(pedTop);
```

(Keep the gold trim rings as-is — they don't need shadows.)

- [ ] **Step 5: Enable castShadow on leaf**

In `init()`, after `leaf = buildLeaf();` (line ~339), add:

```js
  leaf.traverse(child => {
    if (child.isMesh) child.castShadow = true;
  });
```

- [ ] **Step 6: Add rim lights and bounce light**

In `buildTemple()`, the current lights at lines ~144-146 already include some of these positions. Replace the full lighting section (after the spotlight, lines ~144-146):

```js
  addLight(s, new THREE.PointLight(0x22aa44, 1.5, 10), 0, 1, -3);
  addLight(s, new THREE.PointLight(0xFF6600, 0.5, 12), -5, 1, -2);
  addLight(s, new THREE.PointLight(0xD4AF37, 0.4, 6), 0, -3, 1);
```

with:

```js
  // Green backlight
  addLight(s, new THREE.PointLight(0x22aa44, 1.5, 10), 0, 1, -3);
  // Rim lights — edge separation
  addLight(s, new THREE.PointLight(0xFF6600, 0.4, 12), -3, 1, -2);
  addLight(s, new THREE.PointLight(0x22aa44, 0.3, 10), 3, 0.5, -2);
  // Floor bounce — gold reflection from trim
  addLight(s, new THREE.PointLight(0xD4AF37, 0.2, 6), 0, -2.3, 0);
```

- [ ] **Step 7: Verify in browser**

Expected: Pedestal and leaf cast soft shadows on the floor. Rim lights create visible edge glow on leaf. Gold bounce light subtly illuminates floor around pedestal base.

---

### Task 6: Upgrade leaf materials to MeshPhysicalMaterial

**Files:**
- Modify: `src/main.js:41-108` (buildLeaf function), `src/main.js:166-179` (buildTemple update)

- [ ] **Step 1: Replace outer leaflet MeshStandardMaterial**

In `buildLeaf()`, find the outer leaflet material (line ~70-73):

```js
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.20 * dkR, 0.43 * dkR, 0.12 * dkR),
      roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide,
      emissive: new THREE.Color(0.03 * dkR, 0.08 * dkR, 0.02 * dkR), emissiveIntensity: 0.4
    }));
```

Replace with:

```js
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0.20 * dkR, 0.43 * dkR, 0.12 * dkR),
      roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide,
      emissive: new THREE.Color(0.03 * dkR, 0.08 * dkR, 0.02 * dkR), emissiveIntensity: 0.4,
      transmission: 0.15, thickness: 0.3,
      clearcoat: 0.3, clearcoatRoughness: 0.4
    }));
```

- [ ] **Step 2: Replace inner patch MeshStandardMaterial**

Find the inner patch material (line ~84-87):

```js
    const inner = new THREE.Mesh(new THREE.ShapeGeometry(innerShape), new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.31 * dkR, 0.61 * dkR, 0.18 * dkR),
      roughness: 0.55, side: THREE.DoubleSide,
      emissive: new THREE.Color(0.05 * dkR, 0.12 * dkR, 0.03 * dkR), emissiveIntensity: 0.3
    }));
```

Replace with:

```js
    const inner = new THREE.Mesh(new THREE.ShapeGeometry(innerShape), new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0.31 * dkR, 0.61 * dkR, 0.18 * dkR),
      roughness: 0.45, metalness: 0.05, side: THREE.DoubleSide,
      emissive: new THREE.Color(0.05 * dkR, 0.12 * dkR, 0.03 * dkR), emissiveIntensity: 0.3,
      transmission: 0.15, thickness: 0.3,
      clearcoat: 0.3, clearcoatRoughness: 0.4
    }));
```

- [ ] **Step 3: Brighten vein lines**

Find the midrib line material (line ~96):

```js
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x1a4e10, transparent: true, opacity: 0.5 }));
```

Replace with:

```js
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x1a6e10, transparent: true, opacity: 0.6 }));
```

- [ ] **Step 4: Add breathing pulse to inner patches in Temple update**

In `buildTemple()`'s `update(time, delta)` function (line ~168), add before the closing `}`:

```js
      // Pulse leaf inner patches
      leaf.children.forEach(child => {
        if (child.isMesh && child.material.roughness < 0.5) {
          child.material.emissiveIntensity = 0.25 + Math.sin(time * 0.8) * 0.15;
        }
      });
```

Note: This references the `leaf` variable from the outer scope. It's already accessible since `leaf` is a module-level variable.

- [ ] **Step 5: Verify in browser**

Expected: Leaf edges show subtle translucency when backlit. Clearcoat creates visible rim/fresnel effect. Inner patches pulse gently. Veins are slightly brighter and catch bloom.

---

### Task 7: Add chromatic aberration and vignette

**Files:**
- Modify: `src/main.js:5` (imports), `src/main.js` (init — composer setup)

- [ ] **Step 1: Update imports**

Change the postprocessing import line from:

```js
import { EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect } from 'postprocessing';
```

to:

```js
import { EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect, ChromaticAberrationEffect, VignetteEffect } from 'postprocessing';
```

- [ ] **Step 2: Add effects to the EffectPass**

Find the EffectPass creation in `init()`:

```js
  const smaa = new SMAAEffect();
  composer.addPass(new EffectPass(camera, bloom, smaa));
```

Replace with:

```js
  const smaa = new SMAAEffect();
  const ca = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0008, 0.0008) });
  const vignette = new VignetteEffect({ darkness: 0.5, offset: 0.3 });
  composer.addPass(new EffectPass(camera, bloom, smaa, ca, vignette));
```

- [ ] **Step 3: Verify in browser**

Expected: Subtle RGB fringing visible at screen edges. Dark vignette draws eye to center. Combined with bloom, the scene should feel significantly more polished — like looking through a premium lens.

---

### Task 8: Final tuning pass

**Files:**
- Modify: `src/main.js` (buildTemple — fog density, various values)

- [ ] **Step 1: Tune fog density for rear wall visibility**

In `buildTemple()`, find the fog line:

```js
  s.fog = new THREE.FogExp2(0x030201, 0.05);
```

Adjust to:

```js
  s.fog = new THREE.FogExp2(0x030201, 0.045);
```

This slightly lighter fog allows the rear wall and column edges to be more visible while still fading naturally.

- [ ] **Step 2: Verify full scene in browser**

Check the complete scene at `http://localhost:4201`:
- Pedestal: multi-tier with gold trim, leaf hovers just above
- Columns: base/capital/lintel visible, fading into fog
- Rear wall: barely visible dark mass behind columns
- Floor: concentric ring detail around pedestal, receives shadows
- Leaf: translucent edges, clearcoat rim, breathing vein pulse
- Lighting: soft shadows from spotlight, rim edge separation, gold bounce
- Post-processing: bloom on gold/embers, SMAA clean edges, subtle CA + vignette
- Fog layers: subtle volumetric light shaft effect from spotlight
- Scene transitions: still work correctly between Temple/Cosmos/Garden

- [ ] **Step 3: Commit all changes**

```bash
cd C:/Users/akhil/Main/wtf/projects/bhang.wtf
git add src/main.js package.json package-lock.json
git commit -m "feat(temple): premium 3D environment — geometry, post-processing, physical materials, shadows

- Multi-tier octagonal pedestal with gold trim rings
- Columns with base/capital details and connecting lintels
- Curved rear wall and concentric floor ring inlays
- Volumetric fog layers for light shaft effect
- pmndrs postprocessing: bloom, SMAA, chromatic aberration, vignette
- Leaf upgraded to MeshPhysicalMaterial with transmission/clearcoat
- VSM shadow mapping with soft shadows from spotlight
- Rim lights and gold bounce light for edge separation

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

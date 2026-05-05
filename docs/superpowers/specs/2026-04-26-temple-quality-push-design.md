# Temple Scene Quality Push — Design Spec

**Date:** 2026-04-26
**Goal:** Elevate the Temple scene from "leaf floating in void" to a premium, grounded 3D environment approaching igloo.inc quality.
**Scope:** Temple scene only. Pure 3D visual quality. No UI overlays, no refactoring unrelated to visual output.
**New dependency:** `postprocessing` (pmndrs)

---

## 1. Temple Environment Geometry

All changes in the `buildTemple()` function in `src/main.js`.

### Floor
- Replace current flat `PlaneGeometry(40, 40)` with a larger stone floor.
- Add a circular inlaid pattern around the pedestal: concentric ring grooves using `TorusGeometry` (3-4 rings, dark stone material, flush with floor).
- Dark stone `MeshStandardMaterial` with roughness ~0.7, metalness ~0.15. Subtle roughness variation across the surface.

### Pedestal
- Replace single cylinder with a multi-tier octagonal pedestal:
  - **Base:** Wide octagonal platform (`CylinderGeometry` with 8 segments), low height (~0.3), dark stone.
  - **Middle:** Narrower octagonal column, taller (~1.2), slightly lighter stone.
  - **Top platform:** Smallest tier (~0.2 height), polished surface where the leaf sits.
  - **Gold trim ring:** `TorusGeometry` between each tier, gold material (color `0x8B6914`, roughness 0.25, metalness 0.85).
- Leaf position adjusted so it visually rests on the top platform (not floating in space).

### Columns
- 8 columns in semicircle behind the leaf (current layout preserved).
- Each column gets:
  - **Base:** Wider cylinder segment (capital-style) at the bottom.
  - **Shaft:** Main cylinder, taller than current (height ~12).
  - **Capital:** Wider cylinder segment at the top.
- Connected by a stone **lintel/archway**: horizontal cylinder or box segments spanning between column capitals.
- Material: dark stone, roughness 0.85.

### Rear Wall
- Curved rear wall behind the columns: a half-cylinder (`CylinderGeometry` with `openEnded: true`, large radius, partial arc) or arc of flat `BoxGeometry` panels.
- Dark stone material, barely visible in fog but provides depth and light catch.
- Height matches or exceeds column height.

### Fog Layers
- Keep existing `FogExp2(0x030201, 0.05)`.
- Add 3-5 horizontal transparent planes at varying heights (y = -1, 0.5, 2, 4) with a semi-transparent dark material.
- These catch the spotlight beam, creating visible volumetric light shaft effect.
- Material: `MeshBasicMaterial`, color matching fog, opacity ~0.03-0.06, `side: DoubleSide`, additive blending.

---

## 2. Post-Processing Pipeline

New `EffectComposer` replaces direct `renderer.render()` call in the render loop.

### Setup
```
npm install postprocessing
```

### Effects
| Effect | Settings | Purpose |
|--------|----------|---------|
| **BloomEffect** | `intensity: 0.6, luminanceThreshold: 0.7, mipmapBlur: true` | Glow on gold, embers, leaf veins |
| **SMAAEffect** | default preset | Anti-aliased geometry edges |
| **ChromaticAberrationEffect** | `offset: [0.0008, 0.0008]` | Subtle lens feel |
| **VignetteEffect** | `darkness: 0.5, offset: 0.3` | Focus toward center |

### Framebuffer
- `HalfFloatType` for HDR rendering so bloom works correctly on bright values.

### Integration
- `EffectComposer` created in `init()`.
- Single `EffectPass` merging SMAA + ChromaticAberration + Vignette (pmndrs merges these into one pass).
- Bloom gets its own pass (requires downsample chain).
- `composer.render(delta)` replaces `renderer.render(scene, camera)` in the render loop.
- During scene transitions, the composer's scene reference must update to the active scene.

---

## 3. Leaf Material Upgrade

Changes to the `buildLeaf()` function in `src/main.js`. Swap `MeshStandardMaterial` for `MeshPhysicalMaterial`.

### Outer Leaflets
- `MeshPhysicalMaterial` with:
  - `transmission: 0.15, thickness: 0.3` — subtle subsurface scattering, backlit edges glow.
  - `clearcoat: 0.3, clearcoatRoughness: 0.4` — fresnel rim effect at edges.
  - `roughness: 0.55, metalness: 0.05` — slightly smoother than current.
  - `emissive` and `emissiveIntensity` unchanged from current.
  - Base color unchanged.

### Inner Patches
- Same `MeshPhysicalMaterial` swap.
- `emissiveIntensity` animated with a slow breathing pulse: `0.25 + sin(time * 0.8) * 0.15` in the Temple update loop.
- Slightly lower roughness (0.45) for wet/dewy look.

### Vein Lines
- Bump `LineBasicMaterial` opacity from 0.5 to 0.6.
- Color shift slightly brighter (`0x1a6e10`) so bloom catches them.

---

## 4. Lighting Upgrade

### Shadow Mapping
- `renderer.shadowMap.enabled = true`
- `renderer.shadowMap.type = THREE.VSMShadowMap` (soft shadows).
- Main gold spotlight (`spot`): `castShadow = true`, `shadow.mapSize = 1024x1024`, `shadow.radius = 4`.
- Pedestal meshes: `castShadow = true, receiveShadow = true`.
- Floor: `receiveShadow = true`.
- Leaf group: `castShadow = true`.

### Rim Lights
- Two new point lights behind and to the sides of the leaf:
  - Left: warm orange `0xFF6600`, intensity 0.4, positioned at `(-3, 1, -2)`.
  - Right: cool green `0x22aa44`, intensity 0.3, positioned at `(3, 0.5, -2)`.
- Creates edge separation between leaf and dark background.

### Floor Bounce
- Dim upward point light below pedestal: gold `0xD4AF37`, intensity 0.2, position `(0, -2.3, 0)`.
- Simulates gold trim reflecting onto floor.

### Fog Tuning
- `FogExp2` density adjusted to work with new rear wall: objects fade correctly (columns partially visible, wall barely visible at edges).
- Test density range 0.04-0.06 for best result.

### Exposure
- `renderer.toneMappingExposure = 1.1` (slight bump to compensate for darker enclosed environment).
- ACES Filmic tone mapping kept.

---

## Implementation Order

1. Install `postprocessing`, wire up basic EffectComposer (bloom + SMAA) so we can see effects immediately.
2. Build Temple environment geometry (pedestal, columns, wall, floor detail, fog layers).
3. Enable shadow mapping and tune lighting.
4. Upgrade leaf materials to `MeshPhysicalMaterial`.
5. Add remaining post-processing effects (chromatic aberration, vignette).
6. Tune and iterate against dev server.

---

## What We Are NOT Doing

- No Cosmos/Garden scene changes.
- No UI overlays, branding text, or Sanskrit text.
- No code refactoring (module splitting, wiring up Leaf.js/TempleScene.js).
- No HDR environment maps or external textures.
- No DOF or God Rays effects.
- No mobile optimization pass.

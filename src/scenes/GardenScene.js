/**
 * Garden Scene — The leaf floats in a bioluminescent forest
 */
import * as THREE from 'three';

export class GardenScene {
  constructor(leaf) {
    this.leaf = leaf;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x010805);
    this.scene.fog = new THREE.FogExp2(0x010805, 0.04);
    this.glowTips = [];
    this._build();
  }

  _build() {
    this.scene.add(new THREE.AmbientLight(0x041a08, 0.2));

    // Moon
    const moon = new THREE.DirectionalLight(0x2244aa, 0.35);
    moon.position.set(8, 12, -5);
    this.scene.add(moon);

    // Bio glow lights
    this.scene.add(Object.assign(new THREE.PointLight(0x00ff44, 1.2, 15), { position: new THREE.Vector3(-3, -1.5, 2) }));
    this.scene.add(Object.assign(new THREE.PointLight(0x22ff88, 0.8, 12), { position: new THREE.Vector3(4, -1, -3) }));
    this.scene.add(Object.assign(new THREE.PointLight(0x00aa44, 0.6, 10), { position: new THREE.Vector3(0, -2, 5) }));

    // Leaf light from front
    const artLight = new THREE.SpotLight(0x88ffaa, 2, 12, Math.PI / 4, 0.5, 1);
    artLight.position.set(0, 4, 5);
    artLight.target.position.set(0, 0, 0);
    this.scene.add(artLight);
    this.scene.add(artLight.target);

    // Ground
    this.scene.add(Object.assign(new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshStandardMaterial({ color: 0x0a1a08, roughness: 0.95 })), { rotation: new THREE.Euler(-Math.PI / 2, 0, 0), position: new THREE.Vector3(0, -2.5, 0) }));

    // Plants with glow tips
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x1a4a1a, emissive: 0x003300, emissiveIntensity: 0.1, roughness: 0.8 });
    const tipMat = new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 1.5, roughness: 0.3 });

    for (let i = 0; i < 35; i++) {
      const h = 1 + Math.random() * 4;
      const x = (Math.random() - 0.5) * 22;
      const z = (Math.random() - 0.5) * 22;
      if (Math.sqrt(x * x + z * z) < 2.5) continue;

      this.scene.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.035, h, 4), stemMat), { position: new THREE.Vector3(x, -2.5 + h / 2, z), rotation: new THREE.Euler(0, 0, (Math.random() - 0.5) * 0.15) }));

      const ts = 0.03 + Math.random() * 0.06;
      const tip = new THREE.Mesh(new THREE.SphereGeometry(ts, 6, 6), tipMat.clone());
      tip.position.set(x, -2.5 + h, z);
      tip.userData = { baseY: tip.position.y, speed: 0.8 + Math.random() * 1.5, phase: Math.random() * 6 };
      this.glowTips.push(tip);
      this.scene.add(tip);
    }

    // Mushrooms
    const capMat = new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x22ff66, emissiveIntensity: 0.6, roughness: 0.4 });
    for (let i = 0; i < 15; i++) {
      const x = (Math.random() - 0.5) * 18;
      const z = (Math.random() - 0.5) * 18;
      if (Math.sqrt(x * x + z * z) < 3) continue;
      const s = 0.3 + Math.random() * 0.5;
      this.scene.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.04 * s, 0.3 * s, 6), stemMat), { position: new THREE.Vector3(x, -2.35, z) }));
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1 * s, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), capMat.clone());
      cap.material.emissive = new THREE.Color().setHSL(0.35 + Math.random() * 0.1, 0.8, 0.3);
      cap.position.set(x, -2.2, z);
      this.scene.add(cap);
    }

    // Fireflies
    this.fireflies = this._makeParticles(180, null, 0.045, 0.7, 20, 7, true);

    // Spores
    this.spores = this._makeParticles(100, 0xaaffcc, 0.018, 0.25, 15, 8, false);

    // Ground fog
    const fogMat = new THREE.MeshBasicMaterial({ color: 0x112211, transparent: true, opacity: 0.06, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) {
      const fog = new THREE.Mesh(new THREE.PlaneGeometry(10 + Math.random() * 8, 1.2), fogMat);
      fog.rotation.x = -Math.PI / 2;
      fog.position.set((Math.random() - 0.5) * 12, -2.2 + Math.random() * 0.3, (Math.random() - 0.5) * 12);
      this.scene.add(fog);
    }
  }

  _makeParticles(count, color, size, opacity, spread, height, useVertexColors) {
    const pos = new Float32Array(count * 3);
    const colors = useVertexColors ? new Float32Array(count * 3) : null;
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = Math.random() * height - 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
      if (colors) {
        const c = new THREE.Color().setHSL(0.25 + Math.random() * 0.15, 0.9, 0.5);
        colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    if (colors) geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      color: color || undefined, size, transparent: true, opacity,
      vertexColors: !!useVertexColors, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    return pts;
  }

  activate() { this.scene.add(this.leaf); }
  deactivate() { this.scene.remove(this.leaf); }

  update(time, delta) {
    // Fireflies wander
    const fp = this.fireflies.geometry.attributes.position.array;
    for (let i = 0; i < fp.length; i += 3) {
      fp[i] += Math.sin(time * 0.7 + i * 0.3) * delta * 0.12;
      fp[i + 1] += Math.sin(time * 0.5 + i * 0.5) * delta * 0.08;
      fp[i + 2] += Math.cos(time * 0.4 + i * 0.7) * delta * 0.1;
    }
    this.fireflies.geometry.attributes.position.needsUpdate = true;
    this.fireflies.material.opacity = 0.4 + Math.sin(time * 3) * 0.3;

    // Spores rise
    const sp = this.spores.geometry.attributes.position.array;
    for (let i = 0; i < sp.length; i += 3) {
      sp[i + 1] += delta * 0.06;
      sp[i] += Math.sin(time + i) * delta * 0.015;
      if (sp[i + 1] > 6) { sp[i + 1] = -2; sp[i] = (Math.random() - 0.5) * 15; }
    }
    this.spores.geometry.attributes.position.needsUpdate = true;

    // Glow tips pulse
    for (const tip of this.glowTips) {
      tip.position.y = tip.userData.baseY + Math.sin(time * tip.userData.speed + tip.userData.phase) * 0.06;
      tip.material.emissiveIntensity = 1.0 + Math.sin(time * 2 + tip.userData.phase) * 0.5;
    }
  }
}

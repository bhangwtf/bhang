/**
 * Temple Scene — Sacred sanctum, the leaf floats as a divine artifact
 */
import * as THREE from 'three';

export class TempleScene {
  constructor(leaf) {
    this.leaf = leaf;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030201);
    this.scene.fog = new THREE.FogExp2(0x030201, 0.05);
    this._build();
  }

  _build() {
    this.scene.add(new THREE.AmbientLight(0x1a0f05, 0.25));

    // Gold spotlight from above
    this.spot = new THREE.SpotLight(0xD4AF37, 5, 20, Math.PI / 5, 0.5, 1);
    this.spot.position.set(0, 7, 3);
    this.spot.target.position.set(0, 0, 0);
    this.scene.add(this.spot);
    this.scene.add(this.spot.target);

    // Green backlight to make leaf edges pop
    const backlight = new THREE.PointLight(0x22aa44, 1.5, 10);
    backlight.position.set(0, 1, -3);
    this.scene.add(backlight);

    // Warm rim lights
    this.scene.add(Object.assign(new THREE.PointLight(0xFF6600, 0.5, 12), { position: new THREE.Vector3(-5, 1, -2) }));
    this.scene.add(Object.assign(new THREE.PointLight(0xFF4400, 0.4, 10), { position: new THREE.Vector3(5, 0, -3) }));
    this.scene.add(Object.assign(new THREE.PointLight(0xD4AF37, 0.4, 6), { position: new THREE.Vector3(0, -3, 1) }));

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 0.7, metalness: 0.15 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.5;
    this.scene.add(floor);

    // Pedestal
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.25, metalness: 0.85 });
    this.scene.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 2, 24), pedMat), { position: new THREE.Vector3(0, -1.5, 0) }));
    this.scene.add(Object.assign(new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.06, 8, 32), pedMat), { position: new THREE.Vector3(0, -2.45, 0), rotation: new THREE.Euler(-Math.PI / 2, 0, 0) }));

    // Columns
    const colMat = new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.85 });
    for (let i = 0; i < 8; i++) {
      const a = Math.PI + (i / 7) * Math.PI;
      const r = 9;
      this.scene.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 12, 10), colMat), { position: new THREE.Vector3(Math.cos(a) * r, 3.5, Math.sin(a) * r) }));
      this.scene.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 0.35, 10), pedMat), { position: new THREE.Vector3(Math.cos(a) * r, 9.5, Math.sin(a) * r) }));
    }

    // Particles
    this.particles = this._makeParticles(300, 0xD4AF37, 0.03, 0.2, 12, 10);
    this.embers = this._makeParticles(60, 0xFF6600, 0.02, 0.5, 5, 6);
  }

  _makeParticles(count, color, size, opacity, spread, height) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = Math.random() * height - 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color, size, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    this.scene.add(pts);
    return pts;
  }

  activate() { this.scene.add(this.leaf); }
  deactivate() { this.scene.remove(this.leaf); }

  update(time, delta) {
    for (const pts of [this.particles, this.embers]) {
      const p = pts.geometry.attributes.position.array;
      const speed = pts === this.embers ? 0.3 : 0.1;
      for (let i = 0; i < p.length; i += 3) {
        p[i + 1] += delta * speed;
        p[i] += Math.sin(time * 0.5 + i) * delta * 0.02;
        if (p[i + 1] > 8) { p[i + 1] = -2; p[i] = (Math.random() - 0.5) * 6; }
      }
      pts.geometry.attributes.position.needsUpdate = true;
    }
    this.spot.intensity = 4.5 + Math.sin(time * 1.5) * 0.5;
  }
}

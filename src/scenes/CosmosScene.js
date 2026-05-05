/**
 * Cosmos Scene — The leaf floats in deep space among data streams
 */
import * as THREE from 'three';

export class CosmosScene {
  constructor(leaf) {
    this.leaf = leaf;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000004);
    this.cubes = [];
    this.streams = [];
    this._build();
  }

  _build() {
    this.scene.add(new THREE.AmbientLight(0x080818, 0.3));

    // Blue/purple/orange lights
    this.scene.add(Object.assign(new THREE.PointLight(0x4466ff, 2.5, 25), { position: new THREE.Vector3(6, 4, -4) }));
    this.scene.add(Object.assign(new THREE.PointLight(0x7b61ff, 2, 20), { position: new THREE.Vector3(-5, -2, 5) }));
    this.scene.add(Object.assign(new THREE.PointLight(0xFF8C00, 2, 15), { position: new THREE.Vector3(0, 3, 5) }));

    // Front light for leaf visibility
    this.scene.add(Object.assign(new THREE.PointLight(0xaaccff, 1, 10), { position: new THREE.Vector3(0, 0, 4) }));

    // Stars — 2 layers
    this.stars = this._makeStars(2500, 0.08, 0.6, 120);
    this._makeStars(400, 0.25, 0.3, 60);

    // Nebula
    for (let i = 0; i < 5; i++) {
      const s = 8 + Math.random() * 15;
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.6 + Math.random() * 0.2, 0.5, 0.12), transparent: true, opacity: 0.04, side: THREE.BackSide });
      const m = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 12), mat);
      m.position.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 20, -20 - Math.random() * 30);
      this.scene.add(m);
    }

    // Grid floor
    const grid = new THREE.GridHelper(50, 50, 0x1a1a5a, 0x080828);
    grid.position.y = -4;
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    this.scene.add(grid);

    // Orbit rings
    this.ring1 = new THREE.Mesh(new THREE.TorusGeometry(3, 0.012, 8, 100), new THREE.MeshBasicMaterial({ color: 0xFF8C00, transparent: true, opacity: 0.35 }));
    this.ring1.rotation.x = Math.PI / 2;
    this.scene.add(this.ring1);

    this.ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.008, 8, 100), new THREE.MeshBasicMaterial({ color: 0x4466ff, transparent: true, opacity: 0.2 }));
    this.ring2.rotation.x = Math.PI * 0.55;
    this.ring2.rotation.z = 0.3;
    this.scene.add(this.ring2);

    // Data cubes
    const cubeColors = [0xFF8C00, 0x4466ff, 0x7b61ff, 0x50C878, 0xD4AF37];
    for (let i = 0; i < 50; i++) {
      const s = 0.03 + Math.random() * 0.1;
      const mat = new THREE.MeshStandardMaterial({ color: cubeColors[i % 5], emissive: cubeColors[i % 5], emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.8 });
      const cube = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat);
      const orbit = 3.5 + Math.random() * 10;
      const angle = Math.random() * Math.PI * 2;
      cube.position.set(Math.cos(angle) * orbit, (Math.random() - 0.5) * 6, Math.sin(angle) * orbit);
      cube.userData = { orbit, speed: 0.08 + Math.random() * 0.3, offset: angle, yBase: cube.position.y };
      this.cubes.push(cube);
      this.scene.add(cube);
    }

    // Data streams
    for (let i = 0; i < 15; i++) {
      const count = 25;
      const pos = new Float32Array(count * 3);
      const x = (Math.random() - 0.5) * 25;
      const z = (Math.random() - 0.5) * 25 - 5;
      for (let j = 0; j < count; j++) {
        pos[j * 3] = x + (Math.random() - 0.5) * 0.15;
        pos[j * 3 + 1] = j * 0.4 - 5;
        pos[j * 3 + 2] = z;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const stream = new THREE.Points(geo, new THREE.PointsMaterial({
        color: 0x44ff88, size: 0.035, transparent: true, opacity: 0.35,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      stream.userData = { speed: 1 + Math.random() * 2 };
      this.streams.push(stream);
      this.scene.add(stream);
    }
  }

  _makeStars(count, size, opacity, spread) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xccccff, size, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    this.scene.add(pts);
    return pts;
  }

  activate() { this.scene.add(this.leaf); }
  deactivate() { this.scene.remove(this.leaf); }

  update(time, delta) {
    if (this.stars) this.stars.rotation.y = time * 0.004;
    this.ring1.rotation.z = time * 0.12;
    this.ring2.rotation.z = time * 0.07;

    for (const c of this.cubes) {
      const a = time * c.userData.speed + c.userData.offset;
      c.position.x = Math.cos(a) * c.userData.orbit;
      c.position.z = Math.sin(a) * c.userData.orbit;
      c.position.y = c.userData.yBase + Math.sin(time + c.userData.offset) * 0.4;
      c.rotation.x = time * c.userData.speed * 2;
      c.rotation.y = time * c.userData.speed;
    }

    for (const s of this.streams) {
      const p = s.geometry.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) {
        p[i + 1] -= delta * s.userData.speed;
        if (p[i + 1] < -6) p[i + 1] = 6;
      }
      s.geometry.attributes.position.needsUpdate = true;
    }
  }
}

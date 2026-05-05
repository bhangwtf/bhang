/**
 * BhangArt — Loads BHANG Time p5.js art in a same-origin iframe,
 * captures its canvas as a live Three.js texture every frame.
 *
 * The art HTML is served from /bhang-art.html (Vite public dir).
 * Same origin = no cross-origin restrictions on canvas access.
 */

import * as THREE from 'three';

export class BhangArt {
  constructor() {
    this.iframe = null;
    this.artCanvas = null;
    this.texture = null;
    this.ready = false;
  }

  init() {
    return new Promise((resolve, reject) => {
      // Create hidden iframe loading same-origin art page
      this.iframe = document.createElement('iframe');
      this.iframe.src = '/bhang-art.html';
      this.iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1024px;height:768px;border:none;pointer-events:none;';
      document.body.appendChild(this.iframe);

      let attempts = 0;
      const maxAttempts = 60; // 12 seconds

      const check = () => {
        attempts++;
        try {
          const doc = this.iframe.contentDocument || this.iframe.contentWindow.document;
          const cvs = doc.querySelector('canvas');
          if (cvs && cvs.width > 10) {
            this.artCanvas = cvs;

            // Create texture directly from the p5 canvas
            this.texture = new THREE.CanvasTexture(cvs);
            this.texture.minFilter = THREE.LinearFilter;
            this.texture.magFilter = THREE.LinearFilter;
            this.texture.colorSpace = THREE.SRGBColorSpace;

            this.ready = true;
            console.log('BHANG art loaded:', cvs.width, 'x', cvs.height);
            resolve();
            return;
          }
        } catch (e) {
          // Not ready yet
        }

        if (attempts >= maxAttempts) {
          reject(new Error('BHANG art canvas not found'));
          return;
        }
        setTimeout(check, 200);
      };

      this.iframe.addEventListener('load', () => setTimeout(check, 300));
    });
  }

  update() {
    if (!this.ready || !this.texture) return;
    // Mark texture as needing update — Three.js re-reads the canvas
    this.texture.needsUpdate = true;
  }

  dispose() {
    if (this.iframe) {
      document.body.removeChild(this.iframe);
      this.iframe = null;
    }
    if (this.texture) this.texture.dispose();
  }
}

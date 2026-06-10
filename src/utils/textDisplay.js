import * as THREE from 'three';

export default class TextDisplay {
  constructor(title, description) {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');

    // Resolution elevee pour un texte bien net
    this.canvas.width = 1280;
    this.canvas.height = 860;

    this.title = title;
    this.description = description;
    this.isVisible = false;

    this._draw();

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    // Net : pas de mipmaps (source du flou), filtrage lineaire + anisotropie
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.anisotropy = 16;

    const material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
      opacity: 0.0
    });

    this.sprite = new THREE.Sprite(material);
    this.sprite.renderOrder = 999;
    // Panneau plus grand (ratio ~1.49 comme le canvas)
    this.sprite.scale.set(7.5, 5.0, 1);
  }

  setVisible(v) {
    this.isVisible = v;
    this.sprite.material.opacity = v ? 1.0 : 0.0;
  }

  toggle() { this.setVisible(!this.isVisible); }

  _draw() {
    const ctx = this.context;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(10, 15, 30, 0.9)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(15, 15, w - 30, h - 30, 30); ctx.fill(); }
    else ctx.fillRect(15, 15, w - 30, h - 30);

    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 6;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(15, 15, w - 30, h - 30, 30); ctx.stroke(); }
    else ctx.strokeRect(15, 15, w - 30, h - 30);

    // Titre
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.title, w / 2, 110);

    // Separateur
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(70, 150);
    ctx.lineTo(w - 70, 150);
    ctx.stroke();

    // Description
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '46px Arial';
    ctx.textAlign = 'left';
    this._wrapText(ctx, this.description, 70, 230, w - 140, 62);
  }

  _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }
}
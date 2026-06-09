import * as THREE from 'three';

export default class TextDisplay {
  constructor(title, description) {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');

    // Panneau plus grand pour accueillir des textes plus longs
    this.canvas.width = 1024;
    this.canvas.height = 768;

    this.title = title;
    this.description = description;
    this.isVisible = false;

    this._draw();

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,   // le panneau reste lisible meme devant une planete
      opacity: 0.0
    });

    this.sprite = new THREE.Sprite(material);
    this.sprite.renderOrder = 999;
    // Taille du panneau dans l'espace 3D (ratio 4:3 comme le canvas)
    this.sprite.scale.set(6, 4.5, 1);
  }

  setVisible(v) {
    this.isVisible = v;
    this.sprite.material.opacity = v ? 1.0 : 0.0;
  }

  toggle() {
    this.setVisible(!this.isVisible);
  }

  _draw() {
    const ctx = this.context;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Fond sombre semi-transparent (style HUD)
    ctx.fillStyle = 'rgba(10, 15, 30, 0.88)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(15, 15, w - 30, h - 30, 28); ctx.fill(); }
    else ctx.fillRect(15, 15, w - 30, h - 30);

    // Bordure lumineuse
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 5;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(15, 15, w - 30, h - 30, 28); ctx.stroke(); }
    else ctx.strokeRect(15, 15, w - 30, h - 30);

    // Titre
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.title, w / 2, 95);

    // Ligne de separation
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 125);
    ctx.lineTo(w - 60, 125);
    ctx.stroke();

    // Description (justifiee a gauche, avec retour a la ligne)
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '34px Arial';
    ctx.textAlign = 'left';
    this._wrapText(ctx, this.description, 60, 190, w - 120, 48);
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
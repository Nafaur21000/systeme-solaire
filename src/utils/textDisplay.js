import * as THREE from 'three';

export default class TextDisplay {
  constructor(title, description) {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    
    // Résolution interne de la texture
    this.canvas.width = 512;
    this.canvas.height = 256;

    this.title = title;
    this.description = description;
    this.isVisible = false;

    this._draw();

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.0 // Caché au démarrage
    });

    this.sprite = new THREE.Sprite(material);
    // Proportion du panneau dans l'univers 3D
    this.sprite.scale.set(4, 2, 1);
  }

  // Alterne l'affichage (rendu visible ou invisible)
  toggle() {
    this.isVisible = !this.isVisible;
    this.sprite.material.opacity = this.isVisible ? 1.0 : 0.0;
  }

  // Dessine l'interface utilisateur graphique 2D
  _draw() {
    const ctx = this.context;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Fond futuriste semi-transparent
    ctx.fillStyle = 'rgba(8, 12, 28, 0.85)';
    if (ctx.roundRect) {
      ctx.roundRect(10, 10, w - 20, h - 20, 15);
    } else {
      ctx.fillRect(10, 10, w - 20, h - 20);
    }
    ctx.fill();

    // Bordure lumineuse néon cyan
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Nom de la planète
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.title, w / 2, 55);

    // Ligne de séparation
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 75);
    ctx.lineTo(w - 30, 75);
    ctx.stroke();

    // Paragraphe de description
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px Arial';
    this._wrapText(ctx, this.description, w / 2, 115, w - 60, 26);
  }

  // Permet de gérer les retours automatiques à la ligne
  _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
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
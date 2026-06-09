import * as THREE from 'three';

export default class TextDisplay {
  constructor(title, description) {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    
    // Définition de la résolution du panneau textuel
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
      opacity: 0.0 // Caché par défaut au démarrage
    });

    this.sprite = new THREE.Sprite(material);
    // Ajustement de la taille du panneau dans l'espace 3D
    this.sprite.scale.set(4, 2, 1);
  }

  // Permet d'afficher ou cacher le panneau textuel
  toggle() {
    this.isVisible = !this.isVisible;
    this.sprite.material.opacity = this.isVisible ? 1.0 : 0.0;
  }

  // Dessin 2D dans le canvas pour créer la texture
  _draw() {
    const ctx = this.context;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Fond d'affichage noir semi-transparent (style HUD futuriste)
    ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
    ctx.roundRect ? ctx.roundRect(10, 10, w - 20, h - 20, 20) : ctx.fillRect(10, 10, w - 20, h - 20);
    ctx.fill();

    // Bordure lumineuse cyan / verte
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Dessin du titre (Nom de la planète)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.title, w / 2, 60);

    // Ligne de séparation sous le titre
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 80);
    ctx.lineTo(w - 40, 80);
    ctx.stroke();

    // Dessin de la description (avec retour à la ligne basique)
    ctx.fillStyle = '#a0aec0';
    ctx.font = '20px Arial';
    this._wrapText(ctx, this.description, w / 2, 120, w - 80, 28);
  }

  // Fonction utilitaire pour découper le texte en plusieurs lignes si besoin
  _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = ctx.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
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
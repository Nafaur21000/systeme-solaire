import * as THREE from 'three';

/**
 * Classe responsable de l'affichage d'un panneau d'information
 * sous forme de Sprite Three.js généré à partir d'un canvas HTML.
 */
export default class TextDisplay {

  /**
   * Initialise le canvas, dessine le contenu texte
   * puis crée la texture et le sprite associés.
   */
  constructor(title, description) {

    // Canvas utilisé pour dessiner le panneau d'information
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');

    // Résolution élevée afin d'obtenir un texte net
    // lorsqu'il est affiché dans la scène 3D.
    this.canvas.width = 1280;
    this.canvas.height = 860;

    this.title = title;
    this.description = description;

    // État d'affichage du panneau
    this.isVisible = false;

    // Génération du contenu graphique du panneau
    this._draw();

    // Création de la texture Three.js à partir du canvas
    this.texture = new THREE.CanvasTexture(this.canvas);

    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.anisotropy = 16;

    // Matériau du sprite
    const material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
      opacity: 0.0
    });

    // Sprite affiché dans la scène
    this.sprite = new THREE.Sprite(material);

    // Affichage prioritaire par rapport aux autres objets
    this.sprite.renderOrder = 999;

    // Taille du panneau dans l'espace 3D
    this.sprite.scale.set(7.5, 5.0, 1);
  }

  /**
   * Affiche ou masque le panneau d'information.
   */
  setVisible(v) {
    this.isVisible = v;
    this.sprite.material.opacity = v ? 1.0 : 0.0;
  }

  /**
   * Inverse l'état actuel du panneau.
   */
  toggle() {
    this.setVisible(!this.isVisible);
  }

  /**
   * Dessine le contenu graphique du panneau :
   * - fond
   * - bordure
   * - titre
   * - description
   */
  _draw() {

    const ctx = this.context;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Nettoyage du canvas
    ctx.clearRect(0, 0, w, h);

    // Fond semi-transparent
    ctx.fillStyle = 'rgba(10, 15, 30, 0.9)';

    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(15, 15, w - 30, h - 30, 30);
      ctx.fill();
    } else {
      ctx.fillRect(15, 15, w - 30, h - 30);
    }

    // Bordure décorative
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 6;

    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(15, 15, w - 30, h - 30, 30);
      ctx.stroke();
    } else {
      ctx.strokeRect(15, 15, w - 30, h - 30);
    }

    // Affichage du titre
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';

    ctx.fillText(
      this.title,
      w / 2,
      110
    );

    // Ligne de séparation entre le titre et la description
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.5)';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(70, 150);
    ctx.lineTo(w - 70, 150);
    ctx.stroke();

    // Affichage de la description
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '46px Arial';
    ctx.textAlign = 'left';

    this._wrapText(
      ctx,
      this.description,
      70,
      230,
      w - 140,
      62
    );
  }

  /**
   * Découpe automatiquement un texte en plusieurs lignes
   * afin qu'il reste dans la largeur maximale autorisée.
   */
  _wrapText(ctx, text, x, y, maxWidth, lineHeight) {

    const words = text.split(' ');

    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {

      const testLine = line + words[n] + ' ';

      if (
        ctx.measureText(testLine).width > maxWidth &&
        n > 0
      ) {

        ctx.fillText(
          line,
          x,
          currentY
        );

        line = words[n] + ' ';
        currentY += lineHeight;

      } else {

        line = testLine;
      }
    }

    // Affichage de la dernière ligne
    ctx.fillText(
      line,
      x,
      currentY
    );
  }
}
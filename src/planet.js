import { Group, SphereGeometry, MeshBasicMaterial, MeshStandardMaterial, Mesh, TextureLoader, PointLight, MathUtils, SRGBColorSpace, Audio, AudioLoader } from 'three';
import TextDisplay from './utils/textDisplay.js';

export default class Planet {
  constructor(scene, config, parent = null, audioListener = null) {
    this.scene = scene;
    this.parentObject = parent !== null ? parent : scene;
    this.name = config.name ?? '';
    this.vitesseRotation = config.vitesseRotation ?? 0;
    this.vitesseOrbite = config.vitesseOrbite ?? 0;
    this.distanceOrbite = config.distanceOrbite ?? 0;
    this.texturePath = config.texturePath;
    this.rayon = config.rayon ?? 1;
    this.inclinaison = config.inclinaison ?? 0;
    this.emissif = config.emissif ?? false;
    this.hasLight = config.lumiere ?? false;
    this.audioListener = audioListener;
    this.soundPath = config.soundPath ?? null;
    this.description = config.description ?? "Aucune description disponible.";
    this.sound = null;
    this.textDisplay = null;
  }

  init() {
    this.pivot = new Group();
    this.parentObject.add(this.pivot);

    this.anchor = new Group();
    this.anchor.position.x = this.distanceOrbite;
    this.pivot.add(this.anchor);

    this.tilt = new Group();
    this.tilt.rotation.z = MathUtils.degToRad(this.inclinaison);
    this.anchor.add(this.tilt);

    const geometry = new SphereGeometry(this.rayon, 64, 64);
    const texture = new TextureLoader().load(this.texturePath);
    texture.colorSpace = SRGBColorSpace;

    const material = this.emissif ? new MeshBasicMaterial({ map: texture }) : new MeshStandardMaterial({ map: texture });
    this.mesh = new Mesh(geometry, material);

    if (!this.emissif) {
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
    }

    // Associe l'interaction de sélection sur le maillage de l'astre
    this.mesh.onSelected = () => this.onPlanetClicked();

    this.tilt.add(this.mesh);

    // --- INSTANCIATION DU TEXT DISPLAY ---
    this.textDisplay = new TextDisplay(this.name, this.description);
    // On place le texte juste au-dessus de la planète (rayon de la planète + marge)
    this.textDisplay.sprite.position.set(0, this.rayon + 1.8, 0);
    this.anchor.add(this.textDisplay.sprite);

    if (this.hasLight) {
      const lumiere = new PointLight(0xffffff, 100, 0, 1);
      lumiere.castShadow = true;
      lumiere.shadow.mapSize.width = 1024;
      lumiere.shadow.mapSize.height = 1024;
      this.pivot.add(lumiere);
    }

    // Initialisation audio avec le fichier d'ambiance de la NASA
    if (this.audioListener && this.soundPath) {
      this.sound = new Audio(this.audioListener);
      new AudioLoader().load(this.soundPath, (buf) => {
        this.sound.setBuffer(buf);
        this.sound.setVolume(0.5);
      }, undefined, (err) => console.error(`Erreur chargement audio pour ${this.name}`));
    }
  }

  onPlanetClicked() {
    console.log(`Planète sélectionnée : ${this.name}`);
    
    // Alterne l'affichage / masquage du panneau textuel
    if (this.textDisplay) {
      this.textDisplay.toggle();
    }

    // Joue le son d'ambiance de la NASA
    if (this.sound && this.sound.buffer) {
      if (this.sound.isPlaying) this.sound.stop();
      this.sound.play();
    }
  }

  // Appelé pour forcer le panneau de texte à faire face à la caméra
  lookAtCamera(camera) {
    if (this.textDisplay && this.textDisplay.isVisible) {
      this.textDisplay.sprite.lookAt(camera.position);
    }
  }

  update() {
    this.mesh.rotation.y += this.vitesseRotation;
    this.pivot.rotation.y += this.vitesseOrbite;
  }
}
import { Group, SphereGeometry, MeshBasicMaterial, MeshStandardMaterial, Mesh, TextureLoader, PointLight, MathUtils, SRGBColorSpace, Audio, AudioLoader, Vector3 } from 'three';
import TextDisplay from './utils/textDisplay.js';
import { sim } from './state.js';

const _camWorldPos = new Vector3();

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

    // Permet de retrouver cette instance Planet a partir du maillage touche par le laser
    this.mesh.planetRef = this;

    this.tilt.add(this.mesh);

    // Panneau de texte (cache au depart)
    this.textDisplay = new TextDisplay(this.name, this.description);
    this.textDisplay.sprite.position.set(0, this.rayon + 1.8, 0);
    this.anchor.add(this.textDisplay.sprite);

    if (this.hasLight) {
      const lumiere = new PointLight(0xffffff, 100, 0, 1);
      lumiere.castShadow = true;
      lumiere.shadow.mapSize.width = 1024;
      lumiere.shadow.mapSize.height = 1024;
      this.pivot.add(lumiere);
    }

    if (this.audioListener && this.soundPath) {
      this.sound = new Audio(this.audioListener);
      this.sound.setLoop(true);
      new AudioLoader().load(this.soundPath, (buf) => {
        this.sound.setBuffer(buf);
        this.sound.setVolume(0.5);
      }, undefined, () => console.error(`Erreur chargement audio pour ${this.name} (${this.soundPath})`));
    }
  }

  // Affiche le panneau et lance le son de cette planete (un seul son a la fois)
  showInfo() {
    if (this.textDisplay) this.textDisplay.setVisible(true);

    if (sim.activeSound && sim.activeSound !== this.sound && sim.activeSound.isPlaying) {
      sim.activeSound.stop();
    }
    if (this.sound && this.sound.buffer) {
      const ctx = this.sound.context;
      if (ctx && ctx.state === 'suspended') ctx.resume();
      if (!this.sound.isPlaying) this.sound.play();
      sim.activeSound = this.sound;
    }
  }

  // Cache le panneau et coupe le son de cette planete
  hideInfo() {
    if (this.textDisplay) this.textDisplay.setVisible(false);
    if (this.sound && this.sound.isPlaying) this.sound.stop();
    if (sim.activeSound === this.sound) sim.activeSound = null;
  }

  // Position de la planete dans le monde (elle bouge car elle orbite)
  getWorldPosition(target) {
    return this.mesh.getWorldPosition(target);
  }

  lookAtCamera(camera) {
    if (this.textDisplay && this.textDisplay.isVisible) {
      camera.getWorldPosition(_camWorldPos);
      this.textDisplay.sprite.lookAt(_camWorldPos);
    }
  }

  update() {
    // sim.speed * 0.5 : le curseur a 1 vaut la moitie de l'ancienne vitesse
    const s = sim.speed * 0.5;
    this.mesh.rotation.y += this.vitesseRotation * s;
    this.pivot.rotation.y += this.vitesseOrbite * s;
  }
}
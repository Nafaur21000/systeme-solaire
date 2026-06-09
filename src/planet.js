import { Group, SphereGeometry, MeshBasicMaterial, MeshStandardMaterial, Mesh, TextureLoader, PointLight, MathUtils, SRGBColorSpace, Audio, AudioLoader, Vector3 } from 'three';
import TextDisplay from './utils/textDisplay.js';
import { sim } from './state.js';

// Vecteur reutilise pour orienter les panneaux (evite d'en creer un par frame)
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

    // Associe l'interaction de selection sur le maillage de l'astre
    this.mesh.onSelected = () => this.onPlanetClicked();

    this.tilt.add(this.mesh);

    // --- INSTANCIATION DU TEXT DISPLAY ---
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

    // Initialisation audio avec le fichier d'ambiance de la NASA
    if (this.audioListener && this.soundPath) {
      this.sound = new Audio(this.audioListener);
      this.sound.setLoop(true); // ambiance : on boucle tant que le panneau est ouvert
      new AudioLoader().load(this.soundPath, (buf) => {
        this.sound.setBuffer(buf);
        this.sound.setVolume(0.5);
      }, undefined, () => console.error(`Erreur chargement audio pour ${this.name} (${this.soundPath})`));
    }
  }

  onPlanetClicked() {
    console.log(`Planete selectionnee : ${this.name}`);

    // Alterne l'affichage / masquage du panneau textuel
    if (this.textDisplay) this.textDisplay.toggle();
    const nowVisible = this.textDisplay ? this.textDisplay.isVisible : true;

    // Un seul son a la fois : on coupe le son de la planete precedente
    if (sim.activeSound && sim.activeSound !== this.sound && sim.activeSound.isPlaying) {
      sim.activeSound.stop();
    }

    if (this.sound && this.sound.buffer) {
      // Reveille le contexte audio (les navigateurs le demarrent en pause)
      const ctx = this.sound.context;
      if (ctx && ctx.state === 'suspended') ctx.resume();

      if (nowVisible) {
        if (this.sound.isPlaying) this.sound.stop();
        this.sound.play();
        sim.activeSound = this.sound;
      } else {
        // On a referme le panneau de cette planete : on coupe son son
        if (this.sound.isPlaying) this.sound.stop();
        if (sim.activeSound === this.sound) sim.activeSound = null;
      }
    }
  }

  // Force le panneau de texte a faire face a la camera
  lookAtCamera(camera) {
    if (this.textDisplay && this.textDisplay.isVisible) {
      camera.getWorldPosition(_camWorldPos); // position monde (compatible camera rig)
      this.textDisplay.sprite.lookAt(_camWorldPos);
    }
  }

  update() {
    // sim.speed * 0.5 : la nouvelle vitesse de reference (curseur a 1) vaut
    // la moitie de l'ancienne, comme demande.
    const s = sim.speed * 0.5;
    this.mesh.rotation.y += this.vitesseRotation * s;
    this.pivot.rotation.y += this.vitesseOrbite * s;
  }
}
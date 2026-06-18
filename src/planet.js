import { Group, SphereGeometry, RingGeometry, MeshBasicMaterial, MeshStandardMaterial, Mesh, TextureLoader, PointLight, MathUtils, SRGBColorSpace, DoubleSide, Audio, AudioLoader, Vector3 } from 'three';
import TextDisplay from './utils/textDisplay.js';
import { sim } from './state.js';

const _camWorldPos = new Vector3();
const _ringVert = new Vector3();

// Représente une planète ou une lune dans la scène Three.js.
// Chaque objet possède sa propre orbite, rotation, texture, son et panneau d'information.
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
    this.ringConfig = config.ring ?? null;
    this.audioListener = audioListener;
    this.soundPath = config.soundPath ?? null;
    this.description = config.description ?? 'Aucune description disponible.';
    this.sound = null;
    this.ring = null;
    this.textDisplay = null;
  }

  // Initialise la géométrie, le matériau, la structure de groupes et les composants audio/texte.
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

    this.mesh.planetRef = this;
    this.tilt.add(this.mesh);

    if (this.ringConfig) this._createRing();

    this.textDisplay = new TextDisplay(this.name, this.description);
    this.textDisplay.sprite.position.set(this.rayon + 4, 0, 0);
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
      }, undefined, () => console.error('Erreur chargement audio pour ' + this.name + ' (' + this.soundPath + ')'));
    }
  }

  // Crée un anneau autour de la planète si une configuration d'anneau est fournie.
  _createRing() {
    const inner = this.ringConfig.innerRadius ?? this.rayon * 1.3;
    const outer = this.ringConfig.outerRadius ?? this.rayon * 2.2;
    const geo = new RingGeometry(inner, outer, 128);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      _ringVert.fromBufferAttribute(pos, i);
      const r = _ringVert.length();
      uv.setXY(i, (r - inner) / (outer - inner), 1);
    }
    uv.needsUpdate = true;
    const tex = new TextureLoader().load(this.ringConfig.texturePath);
    tex.colorSpace = SRGBColorSpace;
    const mat = new MeshBasicMaterial({ map: tex, side: DoubleSide, transparent: true, depthWrite: false });
    this.ring = new Mesh(geo, mat);
    this.ring.rotation.x = -Math.PI / 2;
    this.tilt.add(this.ring);
  }

  setMeshVisible(v) {
    this.mesh.visible = v;
    if (this.ring) this.ring.visible = v;
  }

  // Affiche les informations et lance le son associé à la planète.
  showInfo() {
    if (this.textDisplay) this.textDisplay.setVisible(true);

    if (sim.activeSound && sim.activeSound !== this.sound && sim.activeSound.isPlaying) {
      sim.activeSound.stop();
    }
    if (this.sound && this.sound.buffer) {
      const ctx = this.sound.context;
      if (ctx && ctx.state === 'suspended') ctx.resume();
      if (this.sound.isPlaying) this.sound.stop();
      this.sound.play();
      sim.activeSound = this.sound;
      console.log('Son joue :', this.name);
    } else {
      console.warn('Aucun son charge pour', this.name, '(', this.soundPath, ')');
    }
  }

  // Cache le panneau d'information et arrête le son de cette planète.
  hideInfo() {
    if (this.textDisplay) this.textDisplay.setVisible(false);
    if (this.sound && this.sound.isPlaying) this.sound.stop();
    if (sim.activeSound === this.sound) sim.activeSound = null;
  }

  getWorldPosition(target) {
    return this.mesh.getWorldPosition(target);
  }

  lookAtCamera(camera) {
    if (this.textDisplay && this.textDisplay.isVisible) {
      camera.getWorldPosition(_camWorldPos);
      this.textDisplay.sprite.lookAt(_camWorldPos);
    }
  }

  // Met à jour la rotation de la planète et l'orbite si la simulation n'est pas figée.
  update() {
    const s = sim.speed * 0.5;
    this.mesh.rotation.y += this.vitesseRotation * s;
    if (!sim.frozen) this.pivot.rotation.y += this.vitesseOrbite * s;
  }
}

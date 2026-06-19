import {
  Group,
  SphereGeometry,
  RingGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Mesh,
  TextureLoader,
  PointLight,
  MathUtils,
  SRGBColorSpace,
  DoubleSide,
  Audio,
  AudioLoader,
  Vector3,
} from "three";

import TextDisplay from "./utils/textDisplay.js";
import { sim } from "./state.js";

// Vecteurs réutilisés pour éviter de recréer des objets en boucle (optimisation)
const _camWorldPos = new Vector3();
const _ringVert = new Vector3();

/**
 * PLANÈTE = objet 3D complet dans le système solaire
 *
 * Une planète contient :
 * - une sphère (la planète)
 * - une orbite autour du soleil
 * - une rotation sur elle-même
 * - un texte descriptif
 * - un son
 * - parfois des anneaux
 */
export default class Planet {

  constructor(scene, config, parent = null, audioListener = null) {

    // scène 3D où la planète est affichée
    this.scene = scene;

    // objet autour duquel la planète tourne (souvent le soleil)
    this.parentObject = parent !== null ? parent : scene;

    // nom de la planète
    this.name = config.name ?? "";

    // vitesse à laquelle la planète tourne sur elle-même
    this.vitesseRotation = config.vitesseRotation ?? 0;

    // vitesse à laquelle elle tourne autour du soleil
    this.vitesseOrbite = config.vitesseOrbite ?? 0;

    // distance entre la planète et le centre (soleil)
    this.distanceOrbite = config.distanceOrbite ?? 0;

    // image utilisée pour la planète
    this.texturePath = config.texturePath;

    // taille de la planète
    this.rayon = config.rayon ?? 1;

    // inclinaison de l’axe (ex: Terre penchée)
    this.inclinaison = config.inclinaison ?? 0;

    // si true → la planète émet sa propre lumière (ex: Soleil)
    this.emissif = config.emissif ?? false;

    // si true → la planète éclaire les autres
    this.hasLight = config.lumiere ?? false;

    // infos des anneaux (ex: Saturne)
    this.ringConfig = config.ring ?? null;

    // audio (voix / ambiance propre à la planète)
    this.audioListener = audioListener;
    this.soundPath = config.soundPath ?? null;

    // texte affiché quand on clique sur la planète
    this.description = config.description ?? "Aucune description disponible.";

    // variables qui seront créées plus tard
    this.sound = null;
    this.ring = null;
    this.textDisplay = null;
  }

  /**
   * CRÉATION DE LA PLANÈTE DANS LA SCÈNE
   */
  init() {

    // 1) pivot = fait tourner toute la planète autour du centre
    this.pivot = new Group();
    this.parentObject.add(this.pivot);

    // 2) anchor = positionne la planète à une distance du centre
    this.anchor = new Group();
    this.anchor.position.x = this.distanceOrbite;
    this.pivot.add(this.anchor);

    // 3) tilt = incline la planète (axe penché)
    this.tilt = new Group();
    this.tilt.rotation.z = MathUtils.degToRad(this.inclinaison);
    this.anchor.add(this.tilt);

    // création de la sphère (la planète)
    const geometry = new SphereGeometry(this.rayon, 64, 64);

    // chargement de l’image de la planète
    const texture = new TextureLoader().load(this.texturePath);
    texture.colorSpace = SRGBColorSpace;

    // matériau (type de rendu de la planète)
    const material = this.emissif
      ? new MeshBasicMaterial({ map: texture }) // lumière propre
      : new MeshStandardMaterial({ map: texture }); // rendu réaliste

    // création de la planète visible
    this.mesh = new Mesh(geometry, material);

    // ombres (désactivées pour les objets lumineux comme le soleil)
    if (!this.emissif) {
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
    }

    // lien utilisé pour le clic / raycast
    this.mesh.planetRef = this;

    // ajout dans la scène
    this.tilt.add(this.mesh);

    // création des anneaux si la planète en a
    if (this.ringConfig) this._createRing();

    // création du panneau de texte
    this.textDisplay = new TextDisplay(this.name, this.description);

    // position du texte à côté de la planète
    this.textDisplay.sprite.position.set(this.rayon + 4, 0, 0);
    this.anchor.add(this.textDisplay.sprite);

    // lumière (si planète spéciale comme le soleil)
    if (this.hasLight) {
      const lumiere = new PointLight(0xffffff, 100, 0, 1);
      lumiere.castShadow = true;
      lumiere.shadow.mapSize.width = 1024;
      lumiere.shadow.mapSize.height = 1024;
      this.pivot.add(lumiere);
    }

    // chargement du son de la planète
    if (this.audioListener && this.soundPath) {
      this.sound = new Audio(this.audioListener);
      this.sound.setLoop(true);

      new AudioLoader().load(
        this.soundPath,
        (buf) => {
          this.sound.setBuffer(buf);
          this.sound.setVolume(0.5);
        },
        undefined,
        () =>
          console.error(
            "Erreur chargement audio pour " +
              this.name +
              " (" +
              this.soundPath +
              ")"
          )
      );
    }
  }

  /**
   * CRÉATION DES ANNEAUX (ex: Saturne)
   */
  _createRing() {

    const inner = this.ringConfig.innerRadius ?? this.rayon * 1.3;
    const outer = this.ringConfig.outerRadius ?? this.rayon * 2.2;

    const geo = new RingGeometry(inner, outer, 128);

    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;

    // correction des textures sur l’anneau
    for (let i = 0; i < pos.count; i++) {
      _ringVert.fromBufferAttribute(pos, i);
      const r = _ringVert.length();
      uv.setXY(i, (r - inner) / (outer - inner), 1);
    }

    uv.needsUpdate = true;

    const tex = new TextureLoader().load(this.ringConfig.texturePath);
    tex.colorSpace = SRGBColorSpace;

    const mat = new MeshBasicMaterial({
      map: tex,
      side: DoubleSide,
      transparent: true,
      depthWrite: false,
    });

    this.ring = new Mesh(geo, mat);

    // on met l’anneau à plat
    this.ring.rotation.x = -Math.PI / 2;

    this.tilt.add(this.ring);
  }

  /**
   * affiche / cache la planète
   */
  setMeshVisible(v) {
    this.mesh.visible = v;
    if (this.ring) this.ring.visible = v;
  }

  /**
   * affiche les infos + joue le son
   */
  showInfo() {
    if (this.textDisplay) this.textDisplay.setVisible(true);

    // stop autre son déjà en cours
    if (
      sim.activeSound &&
      sim.activeSound !== this.sound &&
      sim.activeSound.isPlaying
    ) {
      sim.activeSound.stop();
    }

    // joue le son de cette planète
    if (this.sound && this.sound.buffer) {
      const ctx = this.sound.context;

      if (ctx && ctx.state === "suspended") ctx.resume();

      if (this.sound.isPlaying) this.sound.stop();

      this.sound.play();

      sim.activeSound = this.sound;
    }
  }

  /**
   * cache les infos + stop son
   */
  hideInfo() {
    if (this.textDisplay) this.textDisplay.setVisible(false);
    if (this.sound && this.sound.isPlaying) this.sound.stop();
    if (sim.activeSound === this.sound) sim.activeSound = null;
  }

  /**
   * récupère la position réelle de la planète dans l’espace
   */
  getWorldPosition(target) {
    return this.mesh.getWorldPosition(target);
  }

  /**
   * fait toujours regarder le texte vers la caméra
   */
  lookAtCamera(camera) {
    if (this.textDisplay && this.textDisplay.isVisible) {
      camera.getWorldPosition(_camWorldPos);
      this.textDisplay.sprite.lookAt(_camWorldPos);
    }
  }

  /**
   * appelé à chaque frame (boucle du jeu)
   */
  update() {

    const s = sim.speed * 0.5;

    // la planète tourne sur elle-même
    this.mesh.rotation.y += this.vitesseRotation * s;

    // la planète tourne autour du soleil
    if (!sim.frozen) {
      this.pivot.rotation.y += this.vitesseOrbite * s;
    }
  }
}
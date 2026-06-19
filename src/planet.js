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

// Vecteurs réutilisés pour éviter de créer de nouveaux objets à chaque frame
const _camWorldPos = new Vector3();
const _ringVert = new Vector3();

/**
 * Classe représentant une planète ou une lune.
 * Gère :
 * - son affichage 3D
 * - son orbite
 * - sa rotation
 * - ses anneaux
 * - son texte descriptif
 * - son audio
 */
export default class Planet {
  constructor(scene, config, parent = null, audioListener = null) {
    // Scène Three.js
    this.scene = scene;

    // Objet parent (une planète peut être attachée à une autre)
    this.parentObject = parent !== null ? parent : scene;

    // Nom affiché
    this.name = config.name ?? "";

    // Vitesse de rotation sur elle-même
    this.vitesseRotation = config.vitesseRotation ?? 0;

    // Vitesse d'orbite autour du parent
    this.vitesseOrbite = config.vitesseOrbite ?? 0;

    // Distance par rapport au parent
    this.distanceOrbite = config.distanceOrbite ?? 0;

    // Texture de la planète
    this.texturePath = config.texturePath;

    // Rayon de la planète
    this.rayon = config.rayon ?? 1;

    // Inclinaison de l'axe de rotation
    this.inclinaison = config.inclinaison ?? 0;

    // Indique si la planète est auto-éclairée (comme le Soleil)
    this.emissif = config.emissif ?? false;

    // Indique si la planète génère une lumière
    this.hasLight = config.lumiere ?? false;

    // Configuration éventuelle d'un anneau
    this.ringConfig = config.ring ?? null;

    // Gestion audio
    this.audioListener = audioListener;
    this.soundPath = config.soundPath ?? null;

    // Description affichée dans le panneau d'information
    this.description = config.description ?? "Aucune description disponible.";

    // Variables initialisées plus tard
    this.sound = null;
    this.ring = null;
    this.textDisplay = null;
  }

  /**
   * Initialise tous les objets Three.js :
   * groupes, géométrie, texture, audio, texte, lumière...
   */
  init() {
    // Groupe servant de pivot pour l'orbite
    this.pivot = new Group();
    this.parentObject.add(this.pivot);

    // Groupe positionné à la distance d'orbite
    this.anchor = new Group();
    this.anchor.position.x = this.distanceOrbite;
    this.pivot.add(this.anchor);

    // Groupe permettant d'appliquer l'inclinaison
    this.tilt = new Group();
    this.tilt.rotation.z = MathUtils.degToRad(this.inclinaison);
    this.anchor.add(this.tilt);

    // Géométrie sphérique
    const geometry = new SphereGeometry(this.rayon, 64, 64);

    // Chargement de la texture
    const texture = new TextureLoader().load(this.texturePath);
    texture.colorSpace = SRGBColorSpace;

    // Choix du matériau selon si l'objet est lumineux ou non
    const material = this.emissif
      ? new MeshBasicMaterial({ map: texture })
      : new MeshStandardMaterial({ map: texture });

    // Création du mesh
    this.mesh = new Mesh(geometry, material);

    // Ombres uniquement pour les objets non émissifs
    if (!this.emissif) {
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
    }

    // Référence utilisée pour le raycasting
    this.mesh.planetRef = this;

    // Ajout du mesh dans la hiérarchie
    this.tilt.add(this.mesh);

    // Création de l'anneau si nécessaire
    if (this.ringConfig) this._createRing();

    // Création du texte descriptif
    this.textDisplay = new TextDisplay(this.name, this.description);

    // Positionnement du panneau à côté de la planète
    this.textDisplay.sprite.position.set(this.rayon + 4, 0, 0);

    this.anchor.add(this.textDisplay.sprite);

    // Création d'une source lumineuse
    if (this.hasLight) {
      const lumiere = new PointLight(0xffffff, 100, 0, 1);

      lumiere.castShadow = true;

      lumiere.shadow.mapSize.width = 1024;
      lumiere.shadow.mapSize.height = 1024;

      this.pivot.add(lumiere);
    }

    // Chargement du son associé à la planète
    if (this.audioListener && this.soundPath) {
      this.sound = new Audio(this.audioListener);

      this.sound.setLoop(true);

      new AudioLoader().load(
        this.soundPath,

        // Succès
        (buf) => {
          this.sound.setBuffer(buf);
          this.sound.setVolume(0.5);
        },

        undefined,

        // Erreur
        () =>
          console.error(
            "Erreur chargement audio pour " +
              this.name +
              " (" +
              this.soundPath +
              ")",
          ),
      );
    }
  }

  /**
   * Crée un anneau autour de la planète.
   */
  _createRing() {
    // Rayons intérieur et extérieur
    const inner = this.ringConfig.innerRadius ?? this.rayon * 1.3;

    const outer = this.ringConfig.outerRadius ?? this.rayon * 2.2;

    // Géométrie de l'anneau
    const geo = new RingGeometry(inner, outer, 128);

    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;

    // Recalcul des coordonnées UV pour appliquer correctement la texture
    for (let i = 0; i < pos.count; i++) {
      _ringVert.fromBufferAttribute(pos, i);

      const r = _ringVert.length();

      uv.setXY(i, (r - inner) / (outer - inner), 1);
    }

    uv.needsUpdate = true;

    // Chargement de la texture
    const tex = new TextureLoader().load(this.ringConfig.texturePath);

    tex.colorSpace = SRGBColorSpace;

    // Matériau transparent visible des deux côtés
    const mat = new MeshBasicMaterial({
      map: tex,
      side: DoubleSide,
      transparent: true,
      depthWrite: false,
    });

    // Création du mesh de l'anneau
    this.ring = new Mesh(geo, mat);

    // Mise à plat de l'anneau
    this.ring.rotation.x = -Math.PI / 2;

    this.tilt.add(this.ring);
  }

  /**
   * Affiche ou masque la planète.
   */
  setMeshVisible(v) {
    this.mesh.visible = v;

    if (this.ring) {
      this.ring.visible = v;
    }
  }

  /**
   * Affiche les informations de la planète
   * et lance son audio.
   */
  showInfo() {
    if (this.textDisplay) {
      this.textDisplay.setVisible(true);
    }

    // Arrête le son actuellement joué
    if (
      sim.activeSound &&
      sim.activeSound !== this.sound &&
      sim.activeSound.isPlaying
    ) {
      sim.activeSound.stop();
    }

    // Lance le son de la planète
    if (this.sound && this.sound.buffer) {
      const ctx = this.sound.context;

      if (ctx && ctx.state === "suspended") {
        ctx.resume();
      }

      if (this.sound.isPlaying) {
        this.sound.stop();
      }

      this.sound.play();

      sim.activeSound = this.sound;

      console.log("Son joue :", this.name);
    } else {
      console.warn(
        "Aucun son charge pour",
        this.name,
        "(",
        this.soundPath,
        ")",
      );
    }
  }

  /**
   * Cache les informations et arrête le son.
   */
  hideInfo() {
    if (this.textDisplay) {
      this.textDisplay.setVisible(false);
    }

    if (this.sound && this.sound.isPlaying) {
      this.sound.stop();
    }

    if (sim.activeSound === this.sound) {
      sim.activeSound = null;
    }
  }

  /**
   * Retourne la position mondiale de la planète.
   */
  getWorldPosition(target) {
    return this.mesh.getWorldPosition(target);
  }

  /**
   * Oriente le panneau de texte vers la caméra.
   */
  lookAtCamera(camera) {
    if (this.textDisplay && this.textDisplay.isVisible) {
      camera.getWorldPosition(_camWorldPos);

      this.textDisplay.sprite.lookAt(_camWorldPos);
    }
  }

  /**
   * Mise à jour appelée à chaque frame.
   * Gère :
   * - la rotation de la planète
   * - son orbite
   */
  update() {
    const s = sim.speed * 0.5;

    // Rotation sur elle-même
    this.mesh.rotation.y += this.vitesseRotation * s;

    // Rotation autour du parent
    if (!sim.frozen) {
      this.pivot.rotation.y += this.vitesseOrbite * s;
    }
  }
}

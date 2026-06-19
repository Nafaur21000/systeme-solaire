import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

// Position initiale du joueur en réalité virtuelle.
// Permet d'obtenir une vue globale du système solaire dès le démarrage.
export const INITIAL_RIG_POS = new THREE.Vector3(0, 12, 30);
export const INITIAL_RIG_ROT = new THREE.Euler(0, 0, 0);

/**
 * Classe responsable de l'environnement 3D.
 *
 * Elle gère :
 * - la scène Three.js
 * - la caméra
 * - le moteur de rendu
 * - les contrôles utilisateur
 * - la réalité virtuelle (WebXR)
 * - l'audio global
 * - le fond étoilé
 */
export default class Espace {

  /**
   * Initialise l'ensemble des composants nécessaires
   * au fonctionnement de la scène.
   */
  constructor() {

    // Création de la scène principale
    this.scene = new THREE.Scene();

    // Création de la caméra perspective
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.camera.position.set(0, 20, 35);

    // Groupe contenant la caméra.
    // Utilisé pour déplacer le joueur en VR.
    this.cameraRig = new THREE.Group();
    this.cameraRig.add(this.camera);
    this.scene.add(this.cameraRig);

    // Configuration du moteur de rendu WebGL
    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });

    this.renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );

    this.renderer.setPixelRatio(
      window.devicePixelRatio
    );

    // Activation des ombres
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type =
      THREE.PCFSoftShadowMap;

    // Activation du support WebXR
    this.renderer.xr.enabled = true;

    // Insertion du canvas dans la page
    document.body.appendChild(
      this.renderer.domElement
    );

    // Ajout du bouton d'entrée en VR
    document.body.appendChild(
      VRButton.createButton(this.renderer)
    );

    // Contrôles de navigation classiques (souris)
    this.controls = new OrbitControls(
      this.camera,
      this.renderer.domElement
    );

    this.controls.enableDamping = true;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 200;
    this.controls.target.set(0, 0, 0);

    // Gestion de l'audio 3D
    this.audioListener =
      new THREE.AudioListener();

    this.camera.add(this.audioListener);

    // Création de l'ambiance sonore générale
    this.ambient =
      new THREE.Audio(this.audioListener);

    this.ambient.setLoop(true);
    this.ambient.setVolume(0.22);

    // Chargement du fichier audio d'ambiance
    new THREE.AudioLoader().load(

      '/audio/ambiance.mp3',

      (buf) => {
        this.ambient.setBuffer(buf);
      },

      undefined,

      () =>
        console.error(
          'Erreur chargement de /audio/ambiance.mp3'
        )
    );

    /**
     * Événements liés à la réalité virtuelle.
     * Lors de l'entrée en VR :
     * - les contrôles souris sont désactivés
     * - le joueur est placé à la position initiale
     * - l'ambiance sonore démarre
     */
    this.renderer.xr.addEventListener(
      'sessionstart',
      () => {

        this.controls.enabled = false;

        this.cameraRig.position.copy(
          INITIAL_RIG_POS
        );

        this.cameraRig.rotation.copy(
          INITIAL_RIG_ROT
        );

        this.startAmbient();
      }
    );

    /**
     * Réinitialisation lors de la sortie de VR.
     */
    this.renderer.xr.addEventListener(
      'sessionend',
      () => {

        this.cameraRig.position.set(
          0,
          0,
          0
        );

        this.cameraRig.rotation.set(
          0,
          0,
          0
        );

        this.controls.enabled = true;
      }
    );

    // Génération du fond étoilé
    this._createStarfield();

    /**
     * Adaptation automatique du rendu
     * lorsque la fenêtre change de taille.
     */
    window.addEventListener(
      'resize',
      () => {

        this.camera.aspect =
          window.innerWidth /
          window.innerHeight;

        this.camera.updateProjectionMatrix();

        this.renderer.setSize(
          window.innerWidth,
          window.innerHeight
        );
      }
    );
  }

  /**
   * Lance l'ambiance sonore globale.
   *
   * Vérifie également que le contexte audio
   * n'est pas suspendu par le navigateur.
   */
  startAmbient() {

    const ctx =
      this.audioListener.context;

    if (
      ctx &&
      ctx.state === 'suspended'
    ) {
      ctx.resume();
    }

    if (
      this.ambient &&
      this.ambient.buffer &&
      !this.ambient.isPlaying
    ) {
      this.ambient.play();
    }
  }

  /**
   * Génère un champ d'étoiles aléatoire autour
   * du système solaire afin de créer un décor spatial.
   */
  _createStarfield() {

    const count = 8000;

    const positions =
      new Float32Array(count * 3);

    const sizes =
      new Float32Array(count);

    for (let i = 0; i < count; i++) {

      // Position sphérique aléatoire
      const r =
        150 + Math.random() * 350;

      const theta =
        Math.random() * Math.PI * 2;

      const phi =
        Math.acos(
          2 * Math.random() - 1
        );

      positions[i * 3] =
        r *
        Math.sin(phi) *
        Math.cos(theta);

      positions[i * 3 + 1] =
        r *
        Math.sin(phi) *
        Math.sin(theta);

      positions[i * 3 + 2] =
        r * Math.cos(phi);

      // Taille aléatoire de chaque étoile
      sizes[i] =
        0.4 + Math.random() * 1.2;
    }

    // Création de la géométrie des étoiles
    const geometry =
      new THREE.BufferGeometry();

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        positions,
        3
      )
    );

    geometry.setAttribute(
      'size',
      new THREE.BufferAttribute(
        sizes,
        1
      )
    );

    // Matériau utilisé pour afficher les étoiles
    const material =
      new THREE.PointsMaterial({
        color: 0xffffff,
        sizeAttenuation: true,
        size: 0.25,
        transparent: true,
        opacity: 0.85
      });

    // Ajout du champ d'étoiles à la scène
    this.scene.add(
      new THREE.Points(
        geometry,
        material
      )
    );
  }

  /**
   * Effectue le rendu de la scène.
   *
   * Les contrôles OrbitControls sont mis à jour
   * uniquement hors du mode VR.
   */
  render() {

    if (!this.renderer.xr.isPresenting) {
      this.controls.update();
    }

    this.renderer.render(
      this.scene,
      this.camera
    );
  }
}
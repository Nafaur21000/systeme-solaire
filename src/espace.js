import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

// Pose initiale du rig en VR (vue d'ensemble). Rig droit (non incline) :
// plus confortable pour voler librement aux joysticks ; tu regardes vers le
// bas avec la tete pour voir le systeme etale devant/sous toi.
export const INITIAL_RIG_POS = new THREE.Vector3(0, 12, 30);
export const INITIAL_RIG_ROT = new THREE.Euler(0, 0, 0);

export default class Espace {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 20, 35); // vue initiale sur ordinateur

    // --- CAMERA RIG : Object3D qui contient la camera ---
    this.cameraRig = new THREE.Group();
    this.cameraRig.add(this.camera);
    this.scene.add(this.cameraRig);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.xr.enabled = true;
    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 200;
    this.controls.target.set(0, 0, 0);

    // --- AUDIO ---
    this.audioListener = new THREE.AudioListener();
    this.camera.add(this.audioListener);

    // Son d'ambiance global (different des sons de planetes), en boucle, en fond
    this.ambient = new THREE.Audio(this.audioListener);
    this.ambient.setLoop(true);
    this.ambient.setVolume(0.22);
    new THREE.AudioLoader().load('/audio/ambiance.mp3', (buf) => {
      this.ambient.setBuffer(buf);
    }, undefined, () => console.error("Erreur chargement de /audio/ambiance.mp3"));

    // --- PLACEMENT DU JOUEUR EN VR ---
    this.renderer.xr.addEventListener('sessionstart', () => {
      this.controls.enabled = false;
      this.cameraRig.position.copy(INITIAL_RIG_POS);
      this.cameraRig.rotation.copy(INITIAL_RIG_ROT);
      this.startAmbient();
    });
    this.renderer.xr.addEventListener('sessionend', () => {
      this.cameraRig.position.set(0, 0, 0);
      this.cameraRig.rotation.set(0, 0, 0);
      this.controls.enabled = true;
    });

    this._createStarfield();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // Demarre le son d'ambiance (a appeler sur une action utilisateur a cause
  // des regles d'autoplay des navigateurs)
  startAmbient() {
    const ctx = this.audioListener.context;
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (this.ambient && this.ambient.buffer && !this.ambient.isPlaying) {
      this.ambient.play();
    }
  }

  _createStarfield() {
    const count = 8000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 150 + Math.random() * 350;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.4 + Math.random() * 1.2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const material = new THREE.PointsMaterial({ color: 0xffffff, sizeAttenuation: true, size: 0.25, transparent: true, opacity: 0.85 });
    this.scene.add(new THREE.Points(geometry, material));
  }

  render() {
    if (!this.renderer.xr.isPresenting) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
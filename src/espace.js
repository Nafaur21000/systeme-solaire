import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

export default class Espace {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 20, 35); // vue initiale sur ordinateur

    // --- CAMERA RIG ---
    // Un Object3D (Group) qui CONTIENT la camera. En VR, la camera est pilotee
    // par le casque : on ne la bouge pas directement, on bouge le rig. C'est le
    // rig qui definit ou se trouve le joueur dans le monde.
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
    this.controls.maxDistance = 200;       // augmente pour pouvoir voir tout le systeme
    this.controls.target.set(0, 0, 0);     // on regarde le Soleil (a l'origine)

    // --- ECOUTEUR AUDIO SUR LA CAMERA ---
    this.audioListener = new THREE.AudioListener();
    this.camera.add(this.audioListener);

    // --- PLACEMENT DU JOUEUR EN VR ---
    // A l'entree dans le casque : on monte le rig au-dessus du systeme et on
    // l'incline de ~45 degres vers le bas => vue "du dessus", Soleil au centre.
    // A la sortie : on remet tout a zero pour retrouver la vue souris (OrbitControls).
    this.renderer.xr.addEventListener('sessionstart', () => {
      this.controls.enabled = false;
      this.cameraRig.position.set(0, 18, 26);
      this.cameraRig.rotation.set(-Math.PI / 5, 0, 0);
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
    // OrbitControls ne sert que sur ordinateur ; en VR c'est le casque qui pilote
    if (!this.renderer.xr.isPresenting) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
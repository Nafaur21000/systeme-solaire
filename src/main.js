import * as THREE from 'three';
import Espace, { INITIAL_RIG_POS, INITIAL_RIG_ROT } from './espace.js';
import Planet from './planet.js';
import configsPlanetes from './planetes.json';
import { createLaserPointer, getVRRaycaster, LASER_LENGTH } from './utils/vrGamepad.js';
import { sim } from './state.js';
import './style.css';

const espace = new Espace();
const planetes = [];

// 1. Instanciation des astres
for (const config of configsPlanetes) {
  const planete = new Planet(espace.scene, config, null, espace.audioListener);
  planete.init();
  planetes.push(planete);

  if (config.moons) {
    for (const moonConfig of config.moons) {
      const satellite = new Planet(espace.scene, moonConfig, planete.anchor, espace.audioListener);
      satellite.init();
      planetes.push(satellite);
    }
  }
}

// Liste des maillages cliquables (on ne raycast que ca : evite de toucher le laser)
const planetMeshes = planetes.map((p) => p.mesh);

// --- Vecteurs reutilises ---
const ORIGIN = new THREE.Vector3(0, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);
const _p = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();

// =========================================================================
//  MODE FICHE : un clic isole la planete (les autres disparaissent), elle ne
//  derive plus, texte a cote + son. Un clic n'importe ou -> retour au systeme.
// =========================================================================
function focusOn(planet) {
  for (const q of planetes) { q.hideInfo(); q.setMeshVisible(q === planet); }
  planet.showInfo();
  sim.focus = planet;
  sim.frozen = true; // on fige les orbites : la planete ne derive plus
  sim.zoom = 1;

  if (espace.renderer.xr.isPresenting) {
    facePlanetInVR(planet);
  } else {
    planet.getWorldPosition(_p);
    const r = planet.rayon;
    espace.controls.target.copy(_p);
    espace.camera.position.set(_p.x, _p.y + r * 1.2, _p.z + r * 4 + 3);
  }
}

function resetView() {
  for (const q of planetes) { q.hideInfo(); q.setMeshVisible(true); } // on remontre tout
  sim.focus = null;
  sim.frozen = false;
  sim.zoom = 1;
  if (espace.renderer.xr.isPresenting) {
    espace.cameraRig.position.copy(INITIAL_RIG_POS);
    espace.cameraRig.rotation.copy(INITIAL_RIG_ROT);
  } else {
    espace.camera.position.set(0, 20, 35);
    espace.controls.target.set(0, 0, 0);
  }
}

// Regle commune a la souris et a la manette :
//  - en mode fiche : n'importe quel clic ramene au systeme
//  - sinon         : un clic sur une planete ouvre sa fiche
function handleClick(planet) {
  espace.startAmbient();
  if (sim.focus) { resetView(); return; }
  if (planet) focusOn(planet);
}

function facePlanetInVR(planet) {
  if (!espace.renderer.xr.isPresenting) return;
  planet.getWorldPosition(_p);
  _dir.copy(_p);
  if (_dir.lengthSq() < 0.001) _dir.set(0, 0, 1);
  _dir.normalize();
  const d = (planet.rayon * 5 + 4) * sim.zoom;
  _desired.copy(_p).addScaledVector(_dir, d);
  _desired.y += planet.rayon * 2 + 1.5;
  _dummy.position.copy(_desired);
  _dummy.lookAt(_p);
  espace.cameraRig.rotation.copy(_dummy.rotation);
}

// 2. Manettes VR (attachees au rig pour suivre le joueur)
const controllers = [];
for (let i = 0; i < 2; i++) {
  const controller = espace.renderer.xr.getController(i);
  const laser = createLaserPointer();
  controller.add(laser);
  controller.userData.marker = laser.userData.marker;
  espace.cameraRig.add(controller);

  controller.addEventListener('select', () => {
    handleClick(controller.userData.hovered);
  });

  controllers.push(controller);
}

// Survol : a chaque image on calcule la planete visee et on pose le reticule
// (inutile en mode fiche, ou tout clic ramene au systeme)
function updateHover() {
  if (!espace.renderer.xr.isPresenting) return;
  for (const c of controllers) {
    const marker = c.userData.marker;
    if (sim.focus) { c.userData.hovered = null; if (marker) marker.position.z = -LASER_LENGTH; continue; }
    const hits = getVRRaycaster(c).intersectObjects(planetMeshes, false);
    if (hits.length > 0) {
      c.userData.hovered = hits[0].object.planetRef;
      if (marker) marker.position.z = -hits[0].distance;
    } else {
      c.userData.hovered = null;
      if (marker) marker.position.z = -LASER_LENGTH;
    }
  }
}

// 2b. Clic souris sur ordinateur
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downX = 0, downY = 0;
window.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });
window.addEventListener('pointerup', (e) => {
  if (espace.renderer.xr.isPresenting) return;
  if (e.target.closest && e.target.closest('#speed-ui')) return;
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return;

  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, espace.camera);
  const hits = raycaster.intersectObjects(planetMeshes, false);
  handleClick(hits.length > 0 ? hits[0].object.planetRef : null);
});

// =========================================================================
//  COMMANDES JOYSTICKS EN VR
//  Mode libre (aucune planete selectionnee) :
//    GAUCHE : avancer/reculer (haut/bas) + se decaler (gauche/droite)
//    DROIT  : monter/descendre (haut/bas) + vitesse de simulation (gauche/droite)
//  Mode focus :
//    DROIT  : distance a la planete (haut/bas) + vitesse (gauche/droite)
// =========================================================================
function updateVRInput() {
  const session = espace.renderer.xr.getSession();
  if (!session) return;
  const rig = espace.cameraRig;
  let moveF = 0, moveS = 0, moveU = 0;

  for (const src of session.inputSources) {
    const gp = src.gamepad;
    if (!gp || !gp.axes) continue;
    const ax = gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0];
    const ay = gp.axes.length >= 4 ? gp.axes[3] : gp.axes[1];
    const X = Math.abs(ax) > 0.15 ? ax : 0;
    const Y = Math.abs(ay) > 0.15 ? ay : 0;

    if (src.handedness === 'right') {
      if (X) { sim.speed = Math.min(5, Math.max(0, sim.speed + X * 0.02)); if (slider) slider.value = sim.speed; }
      if (sim.focus) { if (Y) sim.zoom = Math.min(5, Math.max(0.4, sim.zoom + Y * 0.03)); }
      else { moveU += -Y; } // haut = monter
      // Boutons A / B (manette droite) = volume - / +
      if (gp.buttons[4] && gp.buttons[4].pressed) sim.volume = Math.max(0, sim.volume - 0.01);
      if (gp.buttons[5] && gp.buttons[5].pressed) sim.volume = Math.min(1, sim.volume + 0.01);
    } else {
      if (!sim.focus) { moveS += X; moveF += -Y; } // haut = avancer
    }
  }

  if (!sim.focus && (moveF || moveS || moveU)) {
    espace.camera.getWorldDirection(_fwd);
    _fwd.y = 0;
    if (_fwd.lengthSq() < 0.0001) _fwd.set(0, 0, -1);
    _fwd.normalize();
    _right.crossVectors(_fwd, UP).normalize();
    const sp = 0.4;
    rig.position.addScaledVector(_fwd, moveF * sp);
    rig.position.addScaledVector(_right, moveS * sp);
    rig.position.y += moveU * sp;
  }
}

// 3. Director : en mode focus on suit la planete ; en mode libre c'est toi qui pilotes
function updateCamera() {
  const inVR = espace.renderer.xr.isPresenting;
  if (sim.focus) {
    sim.focus.getWorldPosition(_p);
    if (inVR) {
      _dir.copy(_p);
      if (_dir.lengthSq() < 0.001) _dir.set(0, 0, 1);
      _dir.normalize();
      const d = (sim.focus.rayon * 5 + 4) * sim.zoom;
      _desired.copy(_p).addScaledVector(_dir, d);
      _desired.y += sim.focus.rayon * 2 + 1.5;
      espace.cameraRig.position.lerp(_desired, 0.08);
    } else {
      espace.controls.target.lerp(_p, 0.1);
    }
  } else if (!inVR) {
    espace.controls.target.lerp(ORIGIN, 0.1);
  }
}

// 4. Interface vitesse sur ordinateur
const ui = document.createElement('div');
ui.id = 'speed-ui';
ui.innerHTML = `
  <label>Vitesse : <span id="speed-val">1.0</span>x</label>
  <input id="speed-slider" type="range" min="0" max="5" step="0.1" value="1">
  <label style="margin-top:8px;">Volume : <span id="vol-val">80</span>%</label>
  <input id="vol-slider" type="range" min="0" max="1" step="0.05" value="0.8">
`;
document.body.appendChild(ui);
const slider = document.getElementById('speed-slider');
const speedVal = document.getElementById('speed-val');
const volSlider = document.getElementById('vol-slider');
const volVal = document.getElementById('vol-val');
slider.addEventListener('input', () => { sim.speed = parseFloat(slider.value); });
volSlider.addEventListener('input', () => { sim.volume = parseFloat(volSlider.value); });
window.addEventListener('keydown', (e) => {
  if (e.key === '+' || e.key === 'ArrowUp')   sim.speed = Math.min(5, sim.speed + 0.1);
  if (e.key === '-' || e.key === 'ArrowDown')  sim.speed = Math.max(0, sim.speed - 0.1);
  slider.value = sim.speed;
});
espace.renderer.xr.addEventListener('sessionstart', () => { ui.style.display = 'none'; });
espace.renderer.xr.addEventListener('sessionend',   () => { ui.style.display = 'block'; });

// 5. Boucle d'animation
function animate() {
  updateVRInput();
  updateHover();
  updateCamera();
  espace.audioListener.setMasterVolume(sim.volume); // volume general
  if (speedVal) speedVal.textContent = sim.speed.toFixed(1);
  if (volSlider) volSlider.value = sim.volume;
  if (volVal) volVal.textContent = Math.round(sim.volume * 100);

  for (const planete of planetes) {
    planete.update();
    planete.lookAtCamera(espace.camera);
  }
  espace.render();
}
espace.renderer.setAnimationLoop(animate);
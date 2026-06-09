import * as THREE from 'three';
import Espace, { INITIAL_RIG_POS, INITIAL_RIG_ROT } from './espace.js';
import Planet from './planet.js';
import configsPlanetes from './planetes.json';
import { createLaserPointer, getVRRaycaster } from './utils/vrGamepad.js';
import { sim } from './state.js';
import './style.css';

const espace = new Espace();
const planetes = [];

// 1. Instanciation des astres (Planetes et Lunes)
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

// --- Outils reutilises ---
const ORIGIN = new THREE.Vector3(0, 0, 0);
const _p = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _dummy = new THREE.Object3D();

// =========================================================================
//  FOCUS : clic sur une planete -> on se recentre dessus + texte + son
//          clic dans le vide   -> retour a la vue initiale
// =========================================================================
function focusOn(planet) {
  for (const q of planetes) if (q !== planet) q.hideInfo();
  planet.showInfo();
  sim.focus = planet;
  facePlanetInVR(planet); // oriente la vue vers la planete (en VR seulement)
}

function resetView() {
  for (const q of planetes) q.hideInfo();
  sim.focus = null;
  if (espace.renderer.xr.isPresenting) {
    espace.cameraRig.rotation.copy(INITIAL_RIG_ROT); // l'orientation revient tout de suite
  }
}

// En VR, on ne peut pas forcer l'orientation en continu (c'est le casque qui
// regarde), mais on peut l'orienter une fois vers la planete au moment du clic.
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

// Traite les objets touches par un rayon (manette VR ou souris)
function handleHits(intersects) {
  espace.startAmbient(); // le 1er clic demarre aussi l'ambiance
  let planet = null;
  for (const hit of intersects) {
    if (hit.object.planetRef) { planet = hit.object.planetRef; break; }
  }
  if (planet) focusOn(planet);
  else resetView();
}

// 2. Manettes VR (attachees au rig pour qu'elles suivent le joueur)
const controllers = [];
for (let i = 0; i < 2; i++) {
  const controller = espace.renderer.xr.getController(i);
  controller.add(createLaserPointer());
  espace.cameraRig.add(controller);

  controller.addEventListener('select', () => {
    const raycaster = getVRRaycaster(controller);
    handleHits(raycaster.intersectObjects(espace.scene.children, true));
  });

  controllers.push(controller);
}

// 2b. Clic souris sur ordinateur (avec detection de glisser pour ne pas
//     declencher quand on tourne la vue)
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
  handleHits(raycaster.intersectObjects(espace.scene.children, true));
});

// 3. Commandes VR aux joysticks :
//    DROIT vertical  = vitesse de simulation (haut = plus vite)
//    GAUCHE vertical = zoom (haut = se rapprocher)
function updateVRControls() {
  const session = espace.renderer.xr.getSession();
  if (!session) return;
  for (const src of session.inputSources) {
    const gp = src.gamepad;
    if (!gp || !gp.axes) continue;
    const y = gp.axes.length >= 4 ? gp.axes[3] : gp.axes[1];
    if (Math.abs(y) < 0.15) continue;

    if (src.handedness === 'right') {
      sim.speed = Math.min(5, Math.max(0, sim.speed - y * 0.02));
      if (slider) slider.value = sim.speed;
    } else {
      // y < 0 (stick vers le haut) => sim.zoom diminue => on se rapproche
      sim.zoom = Math.min(4, Math.max(0.3, sim.zoom + y * 0.03));
    }
  }
}

// 4. Director : positionne la camera/rig selon le mode (focus ou vue d'ensemble)
function updateCamera() {
  const rig = espace.cameraRig;
  const inVR = espace.renderer.xr.isPresenting;

  if (inVR) {
    if (sim.focus) {
      sim.focus.getWorldPosition(_p);
      _dir.copy(_p);
      if (_dir.lengthSq() < 0.001) _dir.set(0, 0, 1);
      _dir.normalize();
      const d = (sim.focus.rayon * 5 + 4) * sim.zoom;
      _desired.copy(_p).addScaledVector(_dir, d);
      _desired.y += sim.focus.rayon * 2 + 1.5;
      rig.position.lerp(_desired, 0.08);
    } else {
      _desired.copy(INITIAL_RIG_POS).multiplyScalar(sim.zoom);
      rig.position.lerp(_desired, 0.08);
    }
  } else {
    // Ordinateur : OrbitControls suit la cible (planete ou Soleil)
    if (sim.focus) {
      sim.focus.getWorldPosition(_p);
      espace.controls.target.lerp(_p, 0.1);
    } else {
      espace.controls.target.lerp(ORIGIN, 0.1);
    }
  }
}

// 5. Interface vitesse sur ordinateur (curseur + touches + / -)
const ui = document.createElement('div');
ui.id = 'speed-ui';
ui.innerHTML = `
  <label>Vitesse : <span id="speed-val">1.0</span>x</label>
  <input id="speed-slider" type="range" min="0" max="5" step="0.1" value="1">
`;
document.body.appendChild(ui);

const slider = document.getElementById('speed-slider');
const speedVal = document.getElementById('speed-val');
slider.addEventListener('input', () => { sim.speed = parseFloat(slider.value); });
window.addEventListener('keydown', (e) => {
  if (e.key === '+' || e.key === 'ArrowUp')   sim.speed = Math.min(5, sim.speed + 0.1);
  if (e.key === '-' || e.key === 'ArrowDown')  sim.speed = Math.max(0, sim.speed - 0.1);
  slider.value = sim.speed;
});

espace.renderer.xr.addEventListener('sessionstart', () => { ui.style.display = 'none'; });
espace.renderer.xr.addEventListener('sessionend',   () => { ui.style.display = 'block'; });

// 6. Boucle d'animation WebXR
function animate() {
  updateVRControls();
  updateCamera();
  if (speedVal) speedVal.textContent = sim.speed.toFixed(1);

  for (const planete of planetes) {
    planete.update();
    planete.lookAtCamera(espace.camera);
  }
  espace.render();
}

espace.renderer.setAnimationLoop(animate);
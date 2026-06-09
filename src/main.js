import * as THREE from 'three';
import Espace from './espace.js';
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

// 2. Configuration des DEUX manettes (avant on n'en cablait qu'une seule)
const controllers = [];
for (let i = 0; i < 2; i++) {
  const controller = espace.renderer.xr.getController(i);
  controller.add(createLaserPointer());
  espace.scene.add(controller);

  // --- CLIC DE LA GACHETTE VR ---
  controller.addEventListener('select', () => {
    // Reveille le contexte audio des l'entree en interaction
    const ctx = espace.audioListener.context;
    if (ctx && ctx.state === 'suspended') ctx.resume();

    const raycaster = getVRRaycaster(controller);
    const intersects = raycaster.intersectObjects(espace.scene.children, true);

    // On parcourt TOUS les objets touches et on declenche le PREMIER
    // qui possede onSelected (avant : seul intersects[0] etait teste,
    // donc une etoile ou un panneau devant une planete bloquait le clic).
    for (const hit of intersects) {
      if (hit.object.onSelected) {
        hit.object.onSelected();
        break;
      }
    }
  });

  controllers.push(controller);
}

// 2b. --- CLIC SOURIS SUR ORDINATEUR ---
// Avant, le clic n'etait gere QUE pour les manettes VR : sur ordinateur,
// cliquer sur une planete ne faisait rien (d'ou le texte qui ne s'affichait pas).
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downX = 0, downY = 0;

window.addEventListener('pointerdown', (e) => {
  downX = e.clientX; downY = e.clientY;
});
window.addEventListener('pointerup', (e) => {
  if (espace.renderer.xr.isPresenting) return;       // en VR : on passe par les manettes
  if (e.target.closest && e.target.closest('#speed-ui')) return; // pas sur le curseur
  // On ignore si c'etait un glisser (rotation de la vue), pas un vrai clic
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return;

  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, espace.camera);

  const intersects = raycaster.intersectObjects(espace.scene.children, true);
  for (const hit of intersects) {
    if (hit.object.onSelected) { hit.object.onSelected(); break; }
  }
});

// 3. --- REGLAGE DE LA VITESSE ---

// 3a. En VR : joystick (thumbstick) vertical de n'importe quelle manette.
//     Vers le haut = plus vite, vers le bas = plus lent.
function updateSpeedFromVR() {
  const session = espace.renderer.xr.getSession();
  if (!session) return;
  for (const src of session.inputSources) {
    const gp = src.gamepad;
    if (!gp || !gp.axes) continue;
    // Sur Quest le joystick est en axes[2]/axes[3]; sinon on prend axes[1].
    const y = gp.axes.length >= 4 ? gp.axes[3] : gp.axes[1];
    if (Math.abs(y) > 0.15) {
      sim.speed = Math.min(5, Math.max(0, sim.speed - y * 0.02));
      if (slider) slider.value = sim.speed;
    }
  }
}

// 3b. Sur ordinateur : un petit curseur HTML + les touches + et -.
const ui = document.createElement('div');
ui.id = 'speed-ui';
ui.innerHTML = `
  <label>Vitesse : <span id="speed-val">1.0</span>x</label>
  <input id="speed-slider" type="range" min="0" max="5" step="0.1" value="1">
`;
document.body.appendChild(ui);

const slider = document.getElementById('speed-slider');
const speedVal = document.getElementById('speed-val');
slider.addEventListener('input', () => {
  sim.speed = parseFloat(slider.value);
});
window.addEventListener('keydown', (e) => {
  if (e.key === '+' || e.key === 'ArrowUp')   sim.speed = Math.min(5, sim.speed + 0.1);
  if (e.key === '-' || e.key === 'ArrowDown')  sim.speed = Math.max(0, sim.speed - 0.1);
  slider.value = sim.speed;
});

// On cache le curseur HTML pendant qu'on est dans le casque
espace.renderer.xr.addEventListener('sessionstart', () => { ui.style.display = 'none'; });
espace.renderer.xr.addEventListener('sessionend',   () => { ui.style.display = 'block'; });

// 4. Animation WebXR
function animate() {
  updateSpeedFromVR();
  if (speedVal) speedVal.textContent = sim.speed.toFixed(1);

  for (const planete of planetes) {
    planete.update();
    planete.lookAtCamera(espace.camera);
  }
  espace.render();
}

espace.renderer.setAnimationLoop(animate);
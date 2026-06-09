import Espace from './espace.js';
import Planet from './planet.js';
import configsPlanetes from './planetes.json';
import { createLaserPointer, getVRRaycaster } from './utils/vrGamepad.js';
import './style.css';

const espace = new Espace();
const planetes = [];

// 1. Instanciation des astres (Planètes et Lunes)
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

// 2. Configuration de la manette principale (Cours 8.4 & 8.5)
const controller = espace.renderer.xr.getController(0);
controller.add(createLaserPointer()); // Ajoute le pointeur vert sur la manette
espace.scene.add(controller);

// 3. --- GESTION COMPLÈTE DU CLIC DE LA GÂCHETTE VR (Cours 8.8) ---
controller.addEventListener('select', () => {
  const raycaster = getVRRaycaster(controller);
  const intersects = raycaster.intersectObjects(espace.scene.children, true);
  
  // Si le laser touche un objet possédant la méthode onSelected, on l'active !
  if (intersects.length > 0 && intersects[0].object.onSelected) {
    intersects[0].object.onSelected();
  }
});

// 4. Animation WebXR obligatoire (Cours 8.2)
function animate() {
  for (const planete of planetes) {
    planete.update();
    // Oriente le panneau textuel face à l'utilisateur / caméra à chaque frame
    planete.lookAtCamera(espace.camera);
  }
  espace.render();
}

espace.renderer.setAnimationLoop(animate);
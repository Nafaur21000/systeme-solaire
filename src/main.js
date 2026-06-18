import * as THREE from 'three';
import Espace, { INITIAL_RIG_POS, INITIAL_RIG_ROT } from './espace.js';
import Planet from './planet.js';
import configsPlanetes from './planetes.json';
import { createLaserPointer, getVRRaycaster, LASER_LENGTH } from './utils/vrGamepad.js';
import { sim } from './state.js';
import './style.css';

const espace = new Espace();
const planetes = [];

// Instancie chaque planète (et ses lunes si elles existent).
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

// Liste des meshes cliquables pour le raycasting.
const planetMeshes = planetes.map((p) => p.mesh);

// Vecteurs réutilisés pour limiter les allocations dans la boucle.
const ORIGIN = new THREE.Vector3(0, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);
const _p = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _camPos = new THREE.Vector3();

function focusOn(planet) {
  for (const q of planetes) {
    q.hideInfo();
    q.setMeshVisible(q === planet);
  }
  planet.showInfo();
  sim.focus = planet;
  sim.frozen = true;
  sim.zoom = 1;

  if (espace.renderer.xr.isPresenting) {
    placePlanetInFront(planet);
  } else {
    planet.getWorldPosition(_p);
    const r = planet.rayon;
    espace.controls.target.copy(_p);
    espace.camera.position.set(_p.x, _p.y + r * 1.2, _p.z + r * 4 + 3);
  }
}

function resetView() {
  for (const q of planetes) {
    q.hideInfo();
    q.setMeshVisible(true);
  }
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

function handleClick(planet) {
  espace.startAmbient();
  if (sim.focus) {
    resetView();
    return;
  }
  if (planet) focusOn(planet);
}

function placePlanetInFront(planet) {
  if (!espace.renderer.xr.isPresenting) return;
  planet.getWorldPosition(_p);
  espace.camera.getWorldPosition(_camPos);
  espace.camera.getWorldDirection(_fwd);
  _fwd.normalize();
  const d = planet.rayon * 3.5 + 5;
  _desired.copy(_p).addScaledVector(_fwd, -d);
  _desired.sub(_camPos);
  espace.cameraRig.position.add(_desired);
}

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

function updateHover() {
  if (!espace.renderer.xr.isPresenting) return;
  for (const c of controllers) {
    const marker = c.userData.marker;
    if (sim.focus) {
      c.userData.hovered = null;
      if (marker) marker.position.z = -LASER_LENGTH;
      continue;
    }
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

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downX = 0, downY = 0;
window.addEventListener('pointerdown', (e) => {
  downX = e.clientX;
  downY = e.clientY;
});
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
      if (X) {
        sim.speed = Math.min(5, Math.max(0, sim.speed + X * 0.02));
        if (slider) slider.value = sim.speed;
      }
      if (sim.focus) {
        if (Y) {
          sim.focus.getWorldPosition(_p);
          espace.camera.getWorldPosition(_camPos);
          _dir.copy(_p).sub(_camPos);
          const dist = _dir.length();
          if (dist > 0.001) {
            _dir.normalize();
            let step = -Y * 0.5;
            if (step > 0) step = Math.min(step, Math.max(0, dist - (sim.focus.rayon + 1.5)));
            espace.cameraRig.position.addScaledVector(_dir, step);
          }
        }
      } else {
        moveU += -Y;
      }
      if (gp.buttons[4] && gp.buttons[4].pressed) sim.volume = Math.max(0, sim.volume - 0.01);
      if (gp.buttons[5] && gp.buttons[5].pressed) sim.volume = Math.min(1, sim.volume + 0.01);
    } else {
      if (!sim.focus) {
        moveS += X;
        moveF += -Y;
      }
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

function updateCamera() {
  const inVR = espace.renderer.xr.isPresenting;
  if (sim.focus) {
    if (!inVR) {
      sim.focus.getWorldPosition(_p);
      espace.controls.target.lerp(_p, 0.1);
    }
  } else if (!inVR) {
    espace.controls.target.lerp(ORIGIN, 0.1);
  }
}

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
  if (e.key === '+' || e.key === 'ArrowUp') sim.speed = Math.min(5, sim.speed + 0.1);
  if (e.key === '-' || e.key === 'ArrowDown') sim.speed = Math.max(0, sim.speed - 0.1);
  slider.value = sim.speed;
});
espace.renderer.xr.addEventListener('sessionstart', () => { ui.style.display = 'none'; });
espace.renderer.xr.addEventListener('sessionend', () => { ui.style.display = 'block'; });

function animate() {
  updateVRInput();
  updateHover();
  updateCamera();
  espace.audioListener.setMasterVolume(sim.volume);
  if (speedVal) speedVal.textContent = sim.speed.toFixed(1);
  if (volSlider) volSlider.value = sim.volume;
  if (volVal) volVal.textContent = Math.round(sim.volume * 100);

  for (const planete of planetes) {
    planete.update();
  }
  espace.render();
}
espace.renderer.setAnimationLoop(animate);

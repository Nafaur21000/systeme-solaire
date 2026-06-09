import * as THREE from 'three';

const LASER_LENGTH = 60; // assez long pour atteindre les planetes eloignees

// Cree le rayon laser vert et son marqueur
export function createLaserPointer() {
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -LASER_LENGTH)];
  const geometryLine = new THREE.BufferGeometry().setFromPoints(points);
  const geometryMarker = new THREE.SphereGeometry(0.15, 16, 16);
  const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });

  const group = new THREE.Group();
  group.add(new THREE.Line(geometryLine, material));

  const marker = new THREE.Mesh(geometryMarker, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
  marker.position.set(0, 0, -LASER_LENGTH);
  group.add(marker);

  return group;
}

// Calcule l'origine et l'orientation du rayon depuis la manette
export function getVRRaycaster(controller) {
  const origin = new THREE.Vector3();
  controller.getWorldPosition(origin);

  const direction = new THREE.Vector3(0, 0, -1); // tout objet regarde vers -z
  const quaternion = new THREE.Quaternion();
  controller.getWorldQuaternion(quaternion);

  direction.applyQuaternion(quaternion);
  return new THREE.Raycaster(origin, direction);
}
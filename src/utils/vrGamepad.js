import * as THREE from 'three';

export const LASER_LENGTH = 60;

// Cree le rayon laser + son reticule (accessible via group.userData.marker)
export function createLaserPointer() {
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -LASER_LENGTH)];
  const geometryLine = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });

  const group = new THREE.Group();
  group.add(new THREE.Line(geometryLine, material));

  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  );
  marker.position.set(0, 0, -LASER_LENGTH);
  group.add(marker);

  group.userData.marker = marker; // pour deplacer le reticule sur la cible
  return group;
}

// Origine + direction du rayon depuis la manette (methode compatible emulateur)
export function getVRRaycaster(controller) {
  const origin = new THREE.Vector3();
  controller.getWorldPosition(origin);

  const direction = new THREE.Vector3(0, 0, -1);
  const quaternion = new THREE.Quaternion();
  controller.getWorldQuaternion(quaternion);
  direction.applyQuaternion(quaternion);

  return new THREE.Raycaster(origin, direction);
}
import * as THREE from 'three';

export const LASER_LENGTH = 60;

// Crée un pointeur laser et un marqueur pour les contrôleurs VR.
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

  group.userData.marker = marker;
  return group;
}

// Calcule l'origine et la direction du rayon depuis la manette VR.
export function getVRRaycaster(controller) {
  const origin = new THREE.Vector3();
  controller.getWorldPosition(origin);

  const direction = new THREE.Vector3(0, 0, -1);
  const quaternion = new THREE.Quaternion();
  controller.getWorldQuaternion(quaternion);
  direction.applyQuaternion(quaternion);

  return new THREE.Raycaster(origin, direction);
}

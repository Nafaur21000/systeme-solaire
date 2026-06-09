import * as THREE from 'three';

// Crée le rayon laser vert et son marqueur (Cours 8.5)
export function createLaserPointer() {
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -20)];
  const geometryLine = new THREE.BufferGeometry().setFromPoints(points);
  const geometryMarker = new THREE.SphereGeometry(0.05, 16, 16);
  const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });

  const group = new THREE.Group();
  group.add(new THREE.Line(geometryLine, material));
  
  const marker = new THREE.Mesh(geometryMarker, material);
  marker.position.set(0, 0, -20);
  group.add(marker);
  
  return group;
}

// Calcule l'origine et l'orientation du rayon depuis la manette (Cours 8.7)
export function getVRRaycaster(controller) {
  const origin = new THREE.Vector3();
  controller.getWorldPosition(origin);

  const direction = new THREE.Vector3(0, 0, -1); // Tout objet regarde vers -z (Cours 8.5)
  const quaternion = new THREE.Quaternion();
  controller.getWorldQuaternion(quaternion);
  
  direction.applyQuaternion(quaternion);
  return new THREE.Raycaster(origin, direction);
}
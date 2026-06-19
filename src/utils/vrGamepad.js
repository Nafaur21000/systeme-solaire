import * as THREE from 'three';

// Longueur maximale du pointeur laser VR
export const LASER_LENGTH = 60;

/**
 * Crée un pointeur laser utilisé par les contrôleurs VR.
 *
 * Le pointeur est composé :
 * - d'une ligne représentant le rayon
 * - d'un marqueur sphérique indiquant le point d'impact
 */
export function createLaserPointer() {

  // Points de départ et d'arrivée du laser
  const points = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -LASER_LENGTH)
  ];

  // Géométrie de la ligne laser
  const geometryLine =
    new THREE.BufferGeometry().setFromPoints(points);

  // Matériau du laser
  const material =
    new THREE.LineBasicMaterial({
      color: 0x00ff00
    });

  // Groupe contenant tous les éléments du pointeur
  const group = new THREE.Group();

  // Création de la ligne laser
  group.add(
    new THREE.Line(
      geometryLine,
      material
    )
  );

  // Création du marqueur situé à l'extrémité du laser
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0x00ff00
    })
  );

  // Position initiale du marqueur
  marker.position.set(
    0,
    0,
    -LASER_LENGTH
  );

  group.add(marker);

  // Stockage du marqueur pour pouvoir le mettre à jour facilement
  group.userData.marker = marker;

  return group;
}

/**
 * Crée un raycaster à partir de la position
 * et de l'orientation d'un contrôleur VR.
 *
 * Ce rayon est utilisé pour détecter les objets
 * pointés par le joueur (planètes, interfaces, etc.).
 */
export function getVRRaycaster(controller) {

  // Position du contrôleur dans le monde
  const origin = new THREE.Vector3();

  controller.getWorldPosition(origin);

  // Direction par défaut : vers l'avant local du contrôleur
  const direction =
    new THREE.Vector3(0, 0, -1);

  // Récupération de l'orientation du contrôleur
  const quaternion =
    new THREE.Quaternion();

  controller.getWorldQuaternion(quaternion);

  // Application de la rotation à la direction du rayon
  direction.applyQuaternion(quaternion);

  // Création du raycaster utilisé pour le raycasting VR
  return new THREE.Raycaster(
    origin,
    direction
  );
}
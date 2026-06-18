// État global partagé de la simulation.
// Ce petit objet contient les paramètres de vitesse, volume et d'affichage.
export const sim = {
  speed: 1.0,        // multiplicateur de vitesse (0 = pause)
  activeSound: null, // son de planète en cours (un seul à la fois)
  focus: null,       // planète inspectée (null = vue système)
  frozen: false,     // true en mode fiche : les orbites sont figées
  zoom: 1.0,         // distance en mode fiche (joystick droit)
  volume: 0.8,       // volume général (0 = muet, 1 = max)
};

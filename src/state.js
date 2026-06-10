// Etat global partage de la simulation.
export const sim = {
  speed: 1.0,        // multiplicateur de vitesse (0 = pause)
  activeSound: null, // son de planete en cours (un seul a la fois)
  focus: null,       // planete inspectee (null = vue systeme)
  frozen: false,     // true en mode fiche : les orbites sont figees
  zoom: 1.0,         // distance en mode fiche (joystick droit)
  volume: 0.8,       // volume general (0 = muet, 1 = max)
};
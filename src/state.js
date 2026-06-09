// Etat global partage de la simulation.
export const sim = {
    speed: 1.0,        // multiplicateur de vitesse (0 = pause)
    activeSound: null, // son de planete en cours (un seul a la fois)
    focus: null,       // planete sur laquelle on est centre (null = vue d'ensemble)
    zoom: 1.0,         // facteur de zoom regle au joystick gauche en VR
  };
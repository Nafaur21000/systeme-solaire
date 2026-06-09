// Etat global partage de la simulation.
// On l'importe la ou on en a besoin (planet.js, main.js).
export const sim = {
    speed: 1.0,        // multiplicateur de vitesse (0 = pause, 1 = normal)
    activeSound: null, // le son de planete en cours de lecture (un seul a la fois)
  };
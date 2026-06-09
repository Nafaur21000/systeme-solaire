#!/bin/bash
# Telecharge les sons NASA dans public/audio/ avec les noms attendus par
# planetes.json. A lancer depuis la RACINE du projet (dossier contenant public/) :
#   bash download_nasa_sounds.sh
#
# -f : curl echoue (et n'ecrit rien) si le serveur renvoie une erreur 404,
#      ca evite de se retrouver avec un faux .mp3 qui est en fait une page web.

mkdir -p public/audio
cd public/audio || exit 1

dl () {  # dl <nom_fichier> <url>
  echo "-> $1"
  if curl -fL -o "$1" "$2"; then
    size=$(wc -c < "$1")
    if [ "$size" -lt 10000 ]; then
      echo "   ATTENTION : $1 fait seulement $size octets, probablement invalide."
    fi
  else
    echo "   ECHEC du telechargement de $1"
  fi
}

dl earth_chorus.mp3        "https://www.nasa.gov/wp-content/uploads/2015/01/693857main_emfisis_chorus_1.mp3"
dl apollo11_countdown.mp3  "https://www.nasa.gov/wp-content/uploads/2015/01/590320main_ringtone_apollo11_countdown.mp3"
dl jupiter_sounds.mp3      "https://www.nasa.gov/wp-content/uploads/2015/01/603921main_voyager_jupiter_lightning.mp3"
dl saturn_radio.mp3        "https://www.nasa.gov/wp-content/uploads/2015/01/584795main_saturn_radio_waves.mp3"
dl plasma_waves.mp3        "https://www.nasa.gov/externalflash/interstellar.mp3"
dl solar_wind.mp3          "https://www.nasa.gov/wp-content/uploads/2015/01/578358main_kepler_star_KIC12268220C.mp3"
dl venus_lightning.mp3     "https://www.nasa.gov/wp-content/uploads/2015/01/584791main_spookysaturn.mp3"
dl mars_quake.mp3          "https://www.nasa.gov/wp-content/uploads/2015/01/578359main_kepler_star_KIC7671081B.mp3"

echo ""
echo "Contenu final de public/audio :"
ls -lh

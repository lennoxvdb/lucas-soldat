# Starshiprout : Lucas, le héros de la planète Prout

Jeu pour enfants dans l'esprit de *Starship Troopers*, en version cartoon et rigolote :
Lucas, petit soldat de la Fédération des bonbons, s'écrase sur la planète Prout,
survit aux hordes de monstres, construit sa base et répare son vaisseau pour rentrer chez lui.

- **Jouer dans le navigateur** : https://lennoxvdb.github.io/lucas-soldat/
- **Appli Android** : https://github.com/lennoxvdb/lucas-soldat/releases/latest/download/lucas-soldat.apk
  (ouvrir le lien sur le téléphone, puis ouvrir le fichier pour l'installer).
  Ensuite, le jeu se met à jour tout seul.

## Comment ça marche

- Moteur : Three.js (vue isométrique 3D), sons synthétisés, dessins faits avec Gemini et découpés par `tools/cut_planches.py`.
- 5 missions qui alternent mode héros (survie) et mode base (construction façon Command & Conquer).
- À chaque envoi sur la branche `main`, GitHub (`.github/workflows/publier.yml`) :
  1. met le jeu en ligne sur GitHub Pages,
  2. fabrique l'appli Android signée et la publie dans *Releases*.
- L'appli vérifie au lancement s'il existe une nouvelle version sur GitHub Pages et la télécharge toute seule
  (`src/engine/update.js`, extension libre `@capgo/capacitor-updater`).

## Sur le PC

- Jouer : XAMPP, puis http://localhost/lucas_soldat/ (`?fast` pour des missions courtes).
- Fabriquer l'APK : `powershell -File tools/build_apk.ps1` (la clé de signature est hors du projet).

Modèle 3D du soldat : KayKit (CC0), voir `assets/3d/LICENCE.txt`.

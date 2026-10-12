# Starshiprout : Lucas, le héros du gaz

Nom du jeu choisi par l'utilisateur : **Starshiprout** (héros : Lucas). Ancien nom : « Lucas Soldat : Opération Planète Prout » (dépôt et appId gardent `lucas-soldat`).

Jeu web (Three.js) dans l'esprit de Starship Troopers, version cartoon pour enfants.
Cahier des charges d'origine : `C:\Users\Miss_\Downloads\lucas soldat.md`
(copie : `C:\Users\Miss_\PTT\planete-prout\CLAUDE.md`). Les règles de travail de ce fichier s'appliquent
(utilisateur non développeur, réponses courtes en français, outils gratuits, pas de clés dans le code,
ne pas toucher au port 3000, pas de tests sur son téléphone branché).

## Lancer
- XAMPP (Apache, port 80) : http://localhost/lucas_soldat/
- Barre du haut : « Navigateur » / « Téléphone Android » (412 × 915) / « Tourner » (paysage).
  Elle disparaît toute seule sur un vrai téléphone ou dans l'appli.
- `?fast` dans l'adresse : mission de 25 s au lieu de 3 min (pour tester).

## Choix faits (à confirmer avec l'utilisateur)
- Type : survie (idée 1), vue de dessus en 3D isométrique (caméra orthographique).
- Lucas **enfant** (dessin `game_lucas_soldier` de Pokepetro).
- 5 missions = 5 pièces de fusée, chaque mission : 3 min de vagues puis un gardien.
  Boss final (mission 5) : **l'Empereur Pétaros** (monstre 109 + couronne 3D).
- Armes jouets : pistolet à prout, bombes puantes, bazooka à haricots, spray désodorisant,
  chien renifleur, frappe de la Flotte (rayon orbital). Bonus : bottes, gâchette, haricots épicés,
  casque, aimant, bouclier de gaz.
- Clins d'œil Starship Troopers : hordes qui sortent des terriers, « Sergent Pouet » à la radio,
  « La Fédération des bonbons », « Voulez-vous en savoir plus ? ».

## Histoire (voulue par l'utilisateur)
Lucas se trompe de route (GPS) et atterrit sur la planète Prout. Il découvre que son gaz est un trésor (énergie pour toute la Fédération),
envoie un SOS à son équipe, qui vient construire une base pour exploiter le gaz (pompes sur les geysers). Les monstres et l'Empereur Pétaros
défendent leur gaz. Le vaisseau a été abîmé à l'atterrissage : une pièce par mission. Fin : base finie, gaz envoyé à la Fédération,
Lucas rentre en héros. Textes : `STORY` / `ENDING` dans `src/main.js` (`bd_7` SOS et `bd_8` base finie : faits, images larges ; `alt` = dessin de secours si une image manque).

## Missions (héros et base en alternance, choix de l'utilisateur)
1 héros (40 s, puis un vaisseau de la Flotte dépose des renforts et on enchaîne directement sur la base, Lucas y est une unité) · 2 base (3 nids) · 3 héros · 4 base (5 nids, tout débloqué) · 5 héros (Empereur Pétaros).
Bâtiments, chars, récolteurs, nids et tas de haricots = dessins Gemini (`assets/base`, planches `batiments` et `vehicules_nids`) ; les murs restent en 3D (ils ont un sens).
Mode base « à la Command & Conquer » (`js/rts.js`) : le vaisseau écrasé de Lucas = QG (ce n'est PAS une fusée : demande de l'utilisateur) (canon à gaz, plus solide à chaque pièce),
récolteur + champs de haricots, bâtiments (murs, tourelles, champ, caserne ; puis lance-bombes, ventilateur,
pompe à gaz sur geyser, garage), unités (soldats, chiens, chars, récolteurs), nids qui envoient des vagues.
Bouton « 🎓 Apprendre à construire » sur l'écran titre : lance le tuto de la base en entraînement (`game.practice`, ne change pas la progression).
Tutoriel guidé de la première base (`src/game/tuto.js`, une seule fois, sauvegarde `ls_tuto_base`, bouton « Passer ») : champ → 2 tourelles → mur (6 sacs) → porte → caserne finie → escouade → défense (les nids dorment jusque-là) → « À l'attaque ! » → fin. Chaque étape : carte du Sergent en haut, bouton qui clignote (`tuto-hl`), récompense en haricots.
Porte fortifiée (`gate`, 3D : piliers + barrière rayée qui se lève quand un soldat approche) : se pose sur un mur, nos unités passent (`gateCell`, `pushOut(..., friend)`), les monstres non. Mur/porte : toucher puis « 💥 Démolir ». Retoucher le bouton d'un bâtiment annule la construction.
Commandes (comme les jeux de stratégie sur téléphone) : glisser = bouger la carte (avec élan), toucher une unité puis un endroit/nid = ordre, appui long puis glisser (PC : Maj + glisser) = cadre de sélection, pincer/molette = zoom, PC : clic droit = ordre, flèches/bords = carte.

## Planches Gemini
`planches/` (originaux) → `tools/cut_planches.py` → `assets/lucas`, `assets/lucas_dos`, `assets/boss`,
`assets/objets`, `assets/sergent`, `assets/lucas_marche`, `assets/base`, `assets/vaisseaux`, `assets/murs` (pas utilisé : les murs restent en 3D),
`assets/monstres3` (Proute-Renvoie, Vomi, Crotte de Nez), `assets/decor`, `assets/effets`, `assets/icones`, `assets/sol.webp`, `assets/affiche.webp` (+ JSON taille/pieds).
Aussi : `assets/insectes` (ennemis de base, mélangés aux monstres Pokepetro), `assets/gardiens` (Ogre Moisi = boss mission 3 ; les autres arrivent avec les vagues en mode base), `assets/portraits` (radio : Lucas, pilote, Pétaros…), `assets/bd` (histoire), `assets/base2` (chantier, bâtiments abîmés, reine des nids, tour radio, tente médicale, ruines), `assets/sol_marais.webp` (mission 3).
Mondes par mission (`MISSIONS[i].theme`, `world.setTheme`) : planete (1-2), marais (3), volcan (4), palais (5) ; même placement des objets, dessins et sol changés (`assets/decor2`, `assets/palais`, `assets/sol_*.webp`). Victoire/défaite/médailles : `assets/victoire`.
Intégrés : logo « Starshiprout » (`assets/logo/starshiprout.webp`, l'ancien logo_1 n'est plus utilisé), écran de chargement (`assets/chargement.webp`), kit d'interface (`assets/ui`), illustrations de mission (`assets/missions`), char 8 directions (`assets/char8`), explosion 8 images (`assets/explosion`, découpée case par case à cause de la grille), Proute-Renvoie animé 12 images (`assets/proute`), tourelle et caserne niveaux 1-3 (`assets/niveaux`, bouton ⬆ dans le panneau). `publication/` : icônes de l'appli (512/192/64) et image Play Store 1024×500.
Aussi intégrés : récolteur 8 directions (`assets/recolteur`), Vomi et Crotte de Nez animés 12 images (`assets/vomi`, `assets/crotte` ; flaque = `cr_9`), Pétaros animé 12 images (`assets/petaros2`, `bossPose` avec `m.pet`), gestes du tutoriel (`assets/tuto`, dans les ordres de mission), chien 8 directions (`assets/chien8`), sortie du nid 8 images (`assets/nid`), 12 trophées (`assets/trophees`, `src/game/trophies.js`, écran « Trophées » au menu, sauvegarde `ls_trophees`).
8 directions : `dir8()` + tables `DOG8`/`REC8` dans `gfx.js` (Gemini ne respecte pas toujours l'ordre demandé : on choisit le dessin et on le retourne).
Aussi : décor du menu (`assets/menu.webp`, fond de l'écran titre), Ogre Moisi animé (`assets/ogre`, `boss.anim`), insectes animés 12 images (`assets/fourmi`, `mouche`, `scarabee`, `crapaud`), vaisseau QG en 6 étapes (`assets/qg`, `world.setShipStage(parts)`). Ces 5 planches de monstres regardaient à droite : retournées après découpe (tous les dessins de monstres regardent à gauche).
Si une planche Gemini a des mots écrits sous les dessins : les effacer (bandes blanches) avant `cut_planches.py`.

## Lucas en 3D
`js/hero3d.js` : modèle KayKit « Knight » (CC0, `assets/3d/trooper.glb`, voir `assets/3d/LICENCE.txt`),
repeint en camouflage par shader, casque + pistolet à prout ajoutés, animations mélangées
(jambes : course/repos ; haut du corps : vise/tire), torse tourné vers la cible. Sert aussi aux soldats du mode base.
Les dessins 2D de Lucas restent en secours si le modèle ne charge pas.

## Fichiers (rangés par rôle)
- `src/main.js` démarrage, mode téléphone, commandes (clavier, joystick, souris/doigt façon C&C), menus.
- `src/engine/` : `gfx.js` (style cartoon, chargement des dessins, particules), `audio.js` (sons de synthèse).
- `src/world/world.js` décor 3D, vaisseau écrasé (QG), vaisseau de la Flotte dessiné.
- `src/entities/hero3d.js` Lucas et les soldats en 3D animée.
- `src/game/game.js` missions, mode héros, monstres (dont Proute-Renvoie, Vomi, Crotte de Nez), compétence Méga-Prout.
- `src/game/rts.js` mode base : construction, escouades, brouillard de guerre, pouvoirs de la Flotte.
- `src/ui/ui.js` + `css/style.css` écrans et HUD.
- `assets/` dessins (Pokepetro + planches Gemini découpées par `tools/cut_planches.py`), `lib/` Three.js en local.

## Publication (GitHub, Android, mises à jour)
- Dépôt public : https://github.com/lennoxvdb/lucas-soldat (branche `main`). Jeu en ligne : https://lennoxvdb.github.io/lucas-soldat/
- `.github/workflows/publier.yml` : à chaque envoi, met `www/` sur GitHub Pages avec `version.json` (1.0.<numéro>) et `update.zip`.
  Le travail Android de GitHub ne tourne qu'avec « Run workflow » et demande les secrets KEYSTORE_BASE64 / KEYSTORE_PASSWORD (pas encore rangés : refusé par sécurité, l'utilisateur peut le faire).
- Appli : Capacitor 8 (`android/`, appId `com.lennoxvdb.lucassoldat`), `node tools/build_www.mjs` prépare `www/`, `tools/build_apk.ps1` fabrique l'APK signé → `publication/lucas-soldat.apk` (pas dans git) puis on le met dans une Release GitHub.
- Clé de signature HORS du projet : `%USERPROFILE%\lucas-soldat-signature` (jks + mot de passe, ne jamais afficher). JDK : `%USERPROFILE%\.jdks\jdk-21…`, SDK : `%LOCALAPPDATA%\Android\Sdk`.
- Mises à jour automatiques : `src/engine/update.js` (extension libre `@capgo/capacitor-updater`) compare `version.json` local et celui de GitHub Pages, télécharge `update.zip` et l'installe au lancement suivant.
- Ne jamais installer sur le téléphone branché (règle) : l'utilisateur télécharge l'APK depuis le lien de la Release.

## Équilibrage
Difficulté au choix sur l'écran titre (`DIFFS` dans `game.js`, sauvegarde `save.diff`) : **Facile par défaut** (dégâts reçus ×0,45, monstres ×0,6, solidité ×0,65, gardiens/nids ×0,6, +600 haricots en base), Normal, Difficile. L'utilisateur trouvait le jeu « injouable, trop dur ». Puis « encore difficile » : Facile ajoute 3 vies (Lucas se relève dans un Méga-Prout, `p.lives`), missions héros ×0,7 (126 s), récupération ×2,5, QG ×1,6 qui se répare seul. Partout : la pièce du vaisseau vole vers Lucas après le gardien (avant, un enfant ne la trouvait pas), les sandwichs proches viennent vers lui. Testé : un joueur immobile gagne les missions héros en Facile.
`tools/bot_hero.js` : robot qui joue une mission héros (à importer dans la console, `botHero(mission, {skill})`).
Réglages actuels : montée douce par mission (vitesse d'apparition +12 %/mission, PV +15 %, dégâts +8 %), gardiens 450×(1+0,35×mission),
et Lucas reçoit une amélioration par mission déjà gagnée au début de chaque mission héros (`startBonus`).

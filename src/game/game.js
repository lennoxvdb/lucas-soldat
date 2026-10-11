// Le cœur du jeu : Lucas, les monstres, les armes rigolotes, les missions.
import * as THREE from 'three';
import { dir8, DOG8 } from '../engine/gfx.js';
import { InstPool, Particles, spriteMats, toon, toonMat, puffTexture, blobTexture, ringTexture, emojiTexture, wordTexture } from '../engine/gfx.js';
import { buildWorld, ARENA, makeCrown, makeShip, makeDropshipSprite } from '../world/world.js';
import { Rts } from './rts.js';
import { Trooper } from '../entities/hero3d.js';
import { toon as toonMesh } from '../engine/gfx.js';

export const ISO = new THREE.Vector3(1, 1.3, 1).normalize();       // direction de la caméra
const RIGHT = new THREE.Vector3(1, 0, -1).normalize();              // droite de l'écran, au sol
const UP = new THREE.Vector3(-1, 0, -1).normalize();                // haut de l'écran, au sol
const FAST = new URLSearchParams(location.search).has('fast');
export const MISSION_TIME = FAST ? 25 : 180;
export const missionTime = (M) => FAST ? 25 : (M.time || 180);

export const MISSIONS = [
  { type: 'hero', time: 40, ship: true, part: 'Le réacteur', icon: '⚙️', img: 'assets/objets/obj_7.webp',  boss: { img: 'm111', name: 'Gros Caillou Puant', h: 4.8 } },
  { type: 'base', nests: 3, part: "L'aileron", icon: '🔺', img: 'assets/objets/obj_8.webp',  boss: { img: 'm33', name: 'Crocodégoûtant', h: 4.6 } },
  { type: 'hero', theme: 'marais', part: 'Le hublot', icon: '🔵', img: 'assets/objets/obj_9.webp',  boss: { img: 'm64', name: 'Ogre Moisi', h: 5.4, gar: ['gar_5', 'gar_6'], anim: 'og' } },
  { type: 'base', nests: 5, theme: 'volcan', part: "L'antenne", icon: '📡', img: 'assets/objets/obj_10.webp',  boss: { img: 'm28', name: "Sa Majesté Caca d'Or", h: 5.0 } },
  { type: 'hero', theme: 'palais', part: 'Le nez du vaisseau', icon: '🚀', img: 'assets/objets/obj_11.webp',  boss: { img: 'm109', name: "L'Empereur Pétaros", h: 6.4, frames: true, anim: 'pt' } },
];

const TYPES = {
  grunt: { anim: ['bug_1', 'bug_2', 'bug_1', 'bug_2'], animP: 0.7, dead: 3, walk: ['an_1', 'an_2', 'an_3', 'an_4'], atk: ['an_5', 'an_6', 'an_7', 'an_8'], die: 'an_10', imgs: ['m08', 'm38', 'm12', 'm23', 'm13', 'm16', 'm22', 'm45', 'm74', 'm62', 'm63', 'm44', 'm37'], hp: 8, speed: 3.1, h: 1.8, r: 0.6, dmg: 5, xp: 1 },
  bug: { imgs: ['m118', 'm29', 'm84', 'm113'], hp: 6, speed: 5.0, h: 1.6, r: 0.55, dmg: 4, xp: 1 },
  flyer: { anim: ['bug_5', 'bug_6', 'bug_5', 'bug_6'], animP: 0.7, dead: 3, walk: ['mo_1', 'mo_2', 'mo_3', 'mo_4'], atk: ['mo_5', 'mo_6', 'mo_7', 'mo_8'], die: 'mo_11', imgs: ['m114', 'm39', 'm127'], hp: 9, speed: 3.8, h: 1.8, r: 0.6, dmg: 5, xp: 1, fly: true },
  spitter: { anim: ['bug_7', 'bug_8', 'bug_8', 'bug_7'], animP: 0.7, dead: 3, walk: ['cp_1', 'cp_2', 'cp_3', 'cp_4'], atk: ['cp_5', 'cp_6', 'cp_7', 'cp_8'], die: 'cp_10', imgs: ['m34', 'm26', 'm137', 'm117', 'm129'], hp: 20, speed: 2.4, h: 2.2, r: 0.7, dmg: 6, xp: 2, ranged: true },
  tank: { anim: ['bug_3', 'bug_4', 'bug_3', 'bug_4'], animP: 0.6, dead: 3, walk: ['sc_1', 'sc_2', 'sc_3', 'sc_4'], atk: ['sc_5', 'sc_6', 'sc_7', 'sc_8'], die: 'sc_10', imgs: ['m111', 'm64', 'm33', 'm90', 'm70', 'm01'], hp: 85, speed: 1.7, h: 3.2, r: 1.1, dmg: 12, xp: 5, heavy: true },
  // Proute-Renvoie : au corps à corps, il lâche des nuages de gaz toxique autour de lui
  proute: { name: 'Proute-Renvoie', imgs: ['mon_1'], anim: ['mon_1', 'mon_2', 'mon_3', 'mon_4'], dead: 3,
    walk: ['pr_1', 'pr_2', 'pr_3', 'pr_4'], atk: ['pr_5', 'pr_6', 'pr_7', 'pr_8'], die: 'pr_10', hp: 28, speed: 2.9, h: 2.1, r: 0.7, dmg: 5, xp: 2, gas: true },
  // Vomi : de loin, il crache un vomi collant qui ralentit
  vomi: { name: 'Vomi', imgs: ['mon_5'], anim: ['mon_5', 'mon_6', 'mon_7', 'mon_8'], dead: 3,
    walk: ['vo_1', 'vo_2', 'vo_3', 'vo_4'], atk: ['vo_5', 'vo_6', 'vo_7', 'vo_8'], die: 'vo_10', hp: 18, speed: 2.5, h: 2.1, r: 0.65, dmg: 5, xp: 2, ranged: true, vomit: true },
  // Crotte de Nez : kamikaze rapide, il s'écrase sur les troupes et les englue
  crotte: { name: 'Crotte de Nez', imgs: ['mon_9'], anim: ['mon_9', 'mon_10', 'mon_11', 'mon_12'], dead: 3,
    walk: ['cr_1', 'cr_2', 'cr_3', 'cr_4'], atk: ['cr_5', 'cr_6', 'cr_7', 'cr_8'], die: 'cr_8', hp: 10, speed: 5.8, h: 1.7, r: 0.55, dmg: 18, xp: 1, kamikaze: true },
};
const ANNOUNCE = {
  proute: 'Attention ! Des Proute-Renvoie ! Leur gaz est toxique, ne restez pas collés à eux !',
  vomi: 'Des Vomis ! Ils crachent de loin un vomi collant qui ralentit !',
  crotte: 'Des Crottes de Nez kamikazes ! Tirez-leur dessus avant qu’elles explosent !',
};

export const UPGRADES = {
  blaster: { w: 1, icon: '🔫', img: 'assets/objets/obj_1.webp',  name: 'Pistolet à prout', max: 6, desc: (l) => l === 1 ? 'Tire des boules de gaz sur le monstre le plus proche.' : '+1 boule de gaz et tire plus vite.' },
  bombs: { w: 1, icon: '💣', img: 'assets/objets/obj_2.webp',  name: 'Bombes puantes', max: 6, desc: (l) => l === 1 ? 'Lance des bombes qui explosent en gros nuage vert.' : 'Plus de bombes, nuage plus gros.' },
  beans: { w: 1, icon: '🥫', img: 'assets/objets/obj_3.webp',  name: 'Bazooka à haricots', max: 6, desc: (l) => l === 1 ? 'Mitraille des haricots en éventail qui traversent les monstres.' : '+1 haricot, plus de dégâts.' },
  spray: { w: 1, icon: '🧴', img: 'assets/objets/obj_4.webp',  name: 'Spray désodorisant', max: 6, desc: (l) => l === 1 ? 'Des sprays tournent autour de Lucas et repoussent les monstres.' : 'Un spray de plus, tourne plus vite.' },
  dog: { w: 1, icon: '🐶', img: 'assets/sprites/item_dog_walk_1.webp',  name: 'Chien renifleur', max: 6, desc: (l) => l === 1 ? 'Un chien courageux qui court mordre les monstres.' : (l === 4 ? 'Un deuxième chien arrive !' : 'Mord plus fort et court plus vite.') },
  strike: { w: 1, icon: '🛰️', img: 'assets/objets/obj_5.webp',  name: 'Frappe de la Flotte', max: 6, desc: (l) => l === 1 ? 'Le vaisseau en orbite tire un rayon géant sur les monstres.' : 'Rayon plus gros et plus souvent.' },
  speed: { icon: '👟', name: 'Bottes rapides', max: 5, desc: () => 'Lucas court plus vite.' },
  rate: { icon: '⚡', name: 'Gâchette turbo', max: 5, desc: () => 'Toutes les armes tirent plus souvent.' },
  power: { icon: '🌶️', name: 'Haricots épicés', max: 5, desc: () => 'Toutes les armes font plus mal.' },
  helmet: { icon: '🪖', name: 'Casque renforcé', max: 5, desc: () => '+25 de vie maximum, et soigne Lucas.' },
  magnet: { icon: '🧲', name: 'Aimant à haricots', max: 4, desc: () => 'Attire les haricots de plus loin.' },
  shield: { icon: '🛡️', name: 'Bouclier de gaz', max: 4, desc: (l) => l === 1 ? 'Une bulle qui bloque un coup de temps en temps.' : 'La bulle revient plus vite.' },
};
const HEAL_CARD = { id: 'heal', icon: '🍔', img: 'assets/objets/obj_12.webp',  name: 'Gros sandwich', desc: () => 'Rend 50 points de vie.' };

const RADIO = {
  start: ['Soldat Lucas ! Tiens bon, on cherche les pièces de ton vaisseau !', 'Ce gaz va éclairer toute la Fédération, soldat ! Protège-le !', 'Pince-toi le nez, soldat, et dégonfle-les tous !', 'Bienvenue sur la planète Prout. Ça sent… très fort.'],
  random: ['Ils sont des milliers… mais ils sentent mauvais !', 'Le seul bon monstre, c’est un monstre dégonflé !', 'Allez soldat, tu veux vivre pour toujours ?!', 'Le service garantit les bonbons !',
    'Ne respire que par la bouche, soldat !', 'Les geysers verts envoient les monstres en l’air, sers-t’en !', 'Les marais collent aux pieds, évite-les !', 'Ramasse les haricots, ils te rendent plus fort !'],
  horde: ['ALERTE ! Une horde arrive de partout !', 'Ils sortent des terriers ! Tenez la position !'],
  boss: ['Le Gardien de la pièce est là ! Dégonfle-le !', 'Attention, un très gros puant arrive !'],
  bossDown: ['Bravo soldat ! Ramasse vite la pièce du vaisseau !'],
  low: ['Attention soldat, tu es tout vert ! Cherche un sandwich !'],
  strike: ['Ici la Flotte : frappe orbitale en approche !'],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const CELL = 2.5;

export class Game {
  constructor({ scene, camera, renderer, tex, sfx, ui, trophy }) {
    this.trophy = trophy || { unlock() {}, add() {} };
    Object.assign(this, { scene, camera, renderer, tex, sfx, ui });
    this.state = 'menu';
    this.time = 0;
    this.particles = new Particles(scene, puffTexture());
    this.world = buildWorld(scene, this.particles, tex);
    this.makeDropship = () => (tex.vais_3 ? makeDropshipSprite(tex) : makeShip({})); // le vaisseau de la Flotte
    this.colliders = this.world.colliders;

    // matériaux des monstres (normal / retourné / flash blanc)
    this.mats = {};
    for (const k of Object.keys(tex)) if (/^m\d/.test(k)) this.mats[k] = spriteMats(tex[k]);
    for (let i = 1; i <= 12; i++) {
      if (tex['mon_' + i]) this.mats['mon_' + i] = spriteMats(tex['mon_' + i], tex.meta['mon_' + i]);
      for (const p of ['pr_', 'vo_', 'cr_', 'pt_', 'og_', 'an_', 'mo_', 'sc_', 'cp_']) if (tex[p + i]) this.mats[p + i] = spriteMats(tex[p + i], tex.meta[p + i]);
    }
    for (let i = 1; i <= 8; i++) {
      if (tex['bug_' + i]) this.mats['bug_' + i] = spriteMats(tex['bug_' + i], tex.meta['bug_' + i]);
      if (tex['gar_' + i]) this.mats['gar_' + i] = spriteMats(tex['gar_' + i], tex.meta['gar_' + i]);
    }
    this.fxs = [];
    this.petF = [null, 1, 2, 3, 4, 5].map((i) => i && spriteMats(tex['petaros_' + i], tex.meta['petaros_' + i]));
    this.dogMats = [1, 2, 3, 4].map((i) => spriteMats(tex['item_dog_walk_' + i]));
    // le chien renifleur dessiné dans les 8 directions
    this.dog8 = tex.dog_1 ? [null, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => i && spriteMats(tex['dog_' + i], tex.meta['dog_' + i])) : null;

    // Lucas
    // les 10 poses de la planche Gemini (même échelle pour toutes)
    this.lucasF = [null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => i && spriteMats(tex['lucas_' + i], tex.meta['lucas_' + i]));
    this.walkF = [null, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => i && spriteMats(tex['marche_' + i], tex.meta['marche_' + i])); // marche de côté
    this.dosF = [null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => i && spriteMats(tex['dos_' + i], tex.meta['dos_' + i])); // marche de dos
    this.lucas = new THREE.Sprite(this.lucasF[1].L);
    this.lucas.center.set(0.5, 0);
    scene.add(this.lucas);
    // Lucas en vraie 3D animée (si le modèle est chargé)
    this.hero = tex.trooper ? new Trooper(tex.trooper, 2.7) : null;
    if (this.hero) { this.hero.root.visible = false; scene.add(this.hero.root); this.lucas.visible = false; }
    this._v = new THREE.Vector3();
    this.bubble = new THREE.Mesh(new THREE.SphereGeometry(1.25, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0x8ce0ff, transparent: true, opacity: 0.22, depthWrite: false }));
    this.bubble.visible = false;
    scene.add(this.bubble);

    // objets dessinés en grand nombre
    const blobMat = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false });
    const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.shadows = new InstPool(scene, blobGeo, blobMat, 700);
    this.shadows.mesh.renderOrder = 1;
    this.beanPoolG = new InstPool(scene, new THREE.CapsuleGeometry(0.13, 0.22, 3, 8), toonMat(0x9cff3a, 0x4a9a10), 600);
    this.beanPoolY = new InstPool(scene, new THREE.CapsuleGeometry(0.2, 0.32, 3, 8), toonMat(0xffd23f, 0x996600), 300);
    this.gasPool = new InstPool(scene, new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshBasicMaterial({ color: 0x9cff3a }), 300);
    this.bulletBeanPool = new InstPool(scene, new THREE.CapsuleGeometry(0.12, 0.26, 3, 8), toonMat(0xb5522b), 300);
    this.spitPool = new InstPool(scene, new THREE.SphereGeometry(0.34, 12, 8), toonMat(0x8b6b1e, 0x332200), 200);
    this.vomitPool = new InstPool(scene, new THREE.SphereGeometry(0.4, 12, 8), toonMat(0xe8d84a, 0x6a5a10), 120);
    this.bombPool = new InstPool(scene, new THREE.SphereGeometry(0.34, 12, 8), toonMat(0x7a3fa0, 0x220033), 40);

    // explosions dessinées (bande de 9 images)
    this.booms = [];
    this.expTex = tex.exp_1 ? [1, 2, 3, 4, 5, 6, 7, 8].map((i) => tex['exp_' + i]) : null; // explosion dessinée en 8 images
    for (let i = 0; i < 14; i++) {
      const t = this.expTex ? this.expTex[0] : tex.gas_boom.clone();
      if (!this.expTex) { t.repeat.set(1 / 9, 1); t.needsUpdate = true; }
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
      s.visible = false; s.renderOrder = 6;
      scene.add(s);
      this.booms.push({ s, t, life: 0, max: 0.5 });
    }
    // mots rigolos qui sautent à l'écran
    this.wordTex = [['PFFT!', '#b8ff6a'], ['POUET!', '#ffd23f'], ['PROUT!', '#ff9ad5'], ['SPLOTCH!', '#8ce0ff'], ['BOUM!', '#ff7a4e']].map(([w, c]) => wordTexture(w, c));
    this.words = [];
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.wordTex[0], transparent: true, depthTest: false }));
      s.visible = false; s.renderOrder = 10;
      scene.add(s);
      this.words.push({ s, life: 0 });
    }
    this.ringTex = ringTexture();
    this.emoji = { food: tex.obj_12, magnet: emojiTexture('🧲') };
    this.sprayMat = new THREE.SpriteMaterial({ map: tex.item_spray, alphaTest: 0.5 });

    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.camTarget = new THREE.Vector3(0, 0, 3);
    this.shake = 0;
    this.input = { x: 0, y: 0 };
    this.menuAngle = 0;
    this.zoom = 1;
    this.mode = 'hero';
    this.resetEntities();
    this.rts = new Rts(this);
  }

  // ------------------------------------------------------------------ partie
  resetEntities() {
    for (const m of this.monsters || []) this.scene.remove(m.sprite);
    for (const d of this.dying || []) { this.scene.remove(d.sprite); d.mat.dispose(); }
    for (const d of this.dogs || []) this.scene.remove(d.sprite);
    for (const s of this.sprays || []) this.scene.remove(s);
    for (const it of this.items || []) this.scene.remove(it.obj);
    for (const st of this.strikes || []) { this.scene.remove(st.ring); if (st.beam) this.scene.remove(st.beam); }
    if (this.crown) { this.scene.remove(this.crown); this.crown = null; }
    if (this.ship) { this.scene.remove(this.ship.obj, this.ship.ring); this.ship = null; }
    this.monsters = []; this.dying = []; this.beans = []; this.shots = []; this.spits = []; this.bombs = [];
    this.dogs = []; this.sprays = []; this.items = []; this.strikes = [];
    for (const b of this.booms) { b.life = 0; b.s.visible = false; }
    for (const w of this.words) { w.life = 0; w.s.visible = false; }
    this.particles.clear();
    for (const f of this.fxs || []) this.scene.remove(f.s);
    this.fxs = [];
    this.grid = new Map();
    if (this.rts) this.rts.clear();
    this.mode = 'hero';
    if (this.lucas) this.lucas.visible = false;
    if (this.hero) this.hero.root.visible = false;
    this.setZoom(1);
  }

  startMission(index, opts = {}) {
    this.resetEntities();
    this.mission = index;
    this.world.setTheme(MISSIONS[index].theme || 'planete');
    this.world.setShipStage(this.parts || 0);
    this.menuTheme = false;
    this.mTime = missionTime(MISSIONS[index]);
    this.announced = {};
    this.t = 0;
    this.kills = 0;
    this.spawnAcc = 0;
    this.nextHorde = 50;
    this.nextRadio = 18;
    this.boss = null;
    this.bossPhase = 'none'; // none -> fight -> part -> done
    this.endTimer = 0;
    this.lowWarned = false;
    this.p = {
      pos: new THREE.Vector3(2, 0, 3), hp: 100, maxHp: 100, speed: 6.2, inv: 0, magnet: 3.2, dmgMul: 1, cdMul: 1,
      lvl: 1, xp: 0, need: 5, weapons: { blaster: { lvl: 1, t: 0 } }, passives: {}, shieldCd: 0, shieldReady: false,
      lean: 0, walk: 0, dead: false,
    };
    this.camTarget.copy(this.p.pos);
    this.pendingLevels = 0;
    this.state = 'play';
    this.mode = MISSIONS[index].type;
    this.ui.hud(true, this.mode);
    this.ui.bossBar(null);
    if (this.mode === 'base') {
      this.rts.start(index, opts);
      this.ui.banner(`MISSION ${index + 1}`, 'Construis ta base et détruis les nids !');
      return;
    }
    this.ui.setWeapons(this.p);
    // Lucas a de l'expérience : une amélioration à choisir par mission déjà gagnée
    this.startBonus = index;
    if (MISSIONS[index].ship) this.radio(`SOS bien reçu, Lucas ! Ton équipe arrive dans ${this.mTime} secondes, tiens bon !`, 1);
    else this.radio(pick(RADIO.start), 1);
    this.ui.banner(`MISSION ${index + 1}`, 'Tiens bon et dégonfle les monstres !');
  }

  radio(text, face = 2) { this.ui.radio(text, face); this.sfx.radio(); }

  // ------------------------------------------------------------------ boucle
  update(dt) {
    if (this.state === 'pause' || this.state === 'levelup') return;
    this.time += dt;
    this.world.update(dt, this.time);
    if (this.state === 'menu') {
      this.menuAngle += dt * 0.08;
      this.camTarget.set(Math.cos(this.menuAngle) * 6, 0, Math.sin(this.menuAngle) * 6);
      this.lucas.visible = false;
      if (this.hero) this.hero.root.visible = false;
      if (!this.menuTheme) { this.menuTheme = true; this.world.setTheme('planete'); this.world.setShipStage(this.parts || 0); }
      this.particles.update(dt);
      this.drawPools();
      this.updateCamera(dt);
      return;
    }
    if (this.state === 'play' || this.state === 'ending' || this.state === 'dead') {
      if (this.state === 'play') this.t += dt;
      this.buildGrid();
      if (this.mode === 'base') {
        this.rts.update(dt);
      } else {
        if (this.startBonus > 0 && this.state === 'play' && this.t > 1.2) {
          this.pendingLevels += this.startBonus; this.startBonus = 0;
          this.radio('Tu as de l’expérience, soldat ! Choisis tes améliorations !', 1);
          this.openLevelUp();
        }
        this.updatePlayer(dt);
        if (this.state === 'play') { this.director(dt); this.updateWeapons(dt); }
        if (this.ship) this.updateShip(dt);
      }
      this.updateMonsters(dt);
      this.updateShots(dt);
      if (this.mode !== 'base') { this.updateBeans(dt); this.updateItems(dt); }
      this.updateGeysers(dt);
      this.updateEndings(dt);
    }
    this.updateDying(dt);
    this.updateFx(dt);
    this.updateFxSprites(dt);
    this.particles.update(dt);
    this.drawPools();
    this.updateCamera(dt);
    this.updateHud();
  }

  // ------------------------------------------------------------------ Lucas
  updatePlayer(dt) {
    const p = this.p;
    let ix = this.input.x, iy = this.input.y;
    if (this.state !== 'play') ix = iy = 0;
    const len = Math.hypot(ix, iy);
    p.moving = len > 0.05;
    let vx = 0, vz = 0;
    if (p.moving) {
      if (len > 1) { ix /= len; iy /= len; }
      let sp = p.speed * (this.inSwamp(p.pos.x, p.pos.z) ? 0.6 : 1) * (p.slowT > 0 ? 0.55 : 1);
      vx = (RIGHT.x * ix - UP.x * iy) * sp;
      vz = (RIGHT.z * ix - UP.z * iy) * sp;
      p.pos.x += vx * dt; p.pos.z += vz * dt;
      p.walk += dt * 13;
      if (Math.random() < dt * 6) this.particles.emit(p.pos.x, 0.2, p.pos.z, 0xa58aad, { vy: 0.6, life: 0.5, s0: 0.3, s1: 0.8, alpha: 0.5 });
    }
    this.pushOut(p.pos, 0.45);
    const d = Math.hypot(p.pos.x, p.pos.z);
    if (d > ARENA - 1) { p.pos.x *= (ARENA - 1) / d; p.pos.z *= (ARENA - 1) / d; }
    p.inv = Math.max(0, p.inv - dt);
    p.slowT = Math.max(0, (p.slowT || 0) - dt);
    p.skillCd = Math.max(0, (p.skillCd || 0) - dt);
    if (p.slowT > 0 && Math.random() < dt * 10) this.particles.emit(p.pos.x, 0.4, p.pos.z, 0xe8d84a, { vy: 0.4, life: 0.5, s0: 0.4, s1: 0.8, alpha: 0.7 });
    if (!p.dead) p.hp = Math.min(p.maxHp, p.hp + dt * 0.6); // Lucas récupère doucement
    p.lean += ((ix * -0.14) - p.lean) * Math.min(1, dt * 10);

    if (p.passives.shield) {
      if (!p.shieldReady) { p.shieldCd -= dt; if (p.shieldCd <= 0) p.shieldReady = true; }
    }
    // dessin de Lucas : on choisit la bonne pose de la planche
    p.fireT = Math.max(0, (p.fireT || 0) - dt);
    if (ix > 0.15) p.face = 1; else if (ix < -0.15) p.face = -1;
    let f = 1, face = p.face || 1, set = this.lucasF, k = 2.9 / this.lucasF[1].h;
    if (p.moving) p.back = iy < -0.35;
    if (p.dead || (p.inv > 0.6 && p.hitT > 0)) f = 9;                       // tout étourdi
    else if (this.state === 'ending' || this.state === 'won') f = 10;      // saute de joie
    else if (p.moving && p.back) { set = this.dosF; f = 1 + Math.floor(p.walk / 1.3) % 10; k = 2.9 / 348; } // de dos, 10 images
    else if (p.moving) { set = this.walkF; f = 1 + Math.floor(p.walk / 1.2) % 8; k = 2.9 / 348; } // marche, 8 images
    else if (p.fireT > 0) { f = 8; face = p.aim || face; }                 // tire
    else if (p.back) { set = this.dosF; f = 11; k = 2.9 / 348; }           // arrêté, de dos
    p.hitT = Math.max(0, (p.hitT || 0) - dt);
    const F = set[f];
    let bob = p.moving ? 0 : Math.sin(this.time * 3) * 0.03; // les dessins de marche bougent déjà
    if (this.state === 'ending') bob = Math.abs(Math.sin(this.time * 7)) * 1.2;
    const sq = 1;
    this.lucas.material = face > 0 ? F.L : F.R;
    this.lucas.center.set(face > 0 ? F.ax : 1 - F.ax, 0);
    this.lucas.position.set(p.pos.x, bob, p.pos.z);
    this.lucas.scale.set(F.w * k / sq, F.h * k * sq, 1);
    this.lucas.material.rotation = 0;
    this.lucas.visible = !(p.inv > 0 && p.inv < 0.6 && !p.dead && Math.floor(p.inv * 14) % 2 === 0);
    if (this.hero) {
      this.lucas.visible = false;
      const H = this.hero;
      H.root.visible = !p.boarded && !(p.inv > 0 && p.inv < 0.6 && !p.dead && Math.floor(p.inv * 14) % 2 === 0);
      H.root.position.set(p.pos.x, 0, p.pos.z);
      const near = !p.dead && this.nearest(p.pos.x, p.pos.z, 14);
      const aimYaw = near ? Math.atan2(near.pos.x - p.pos.x, near.pos.z - p.pos.z) : null;
      H.update(dt, {
        moving: p.moving && this.state === 'play', speed: p.speed, moveYaw: p.moving ? Math.atan2(vx, vz) : null, aimYaw,
        firing: p.fireT > 0, dead: p.dead, cheer: this.state === 'ending' || this.state === 'won',
      });
    }
    this.bubble.visible = !!(p.passives.shield && p.shieldReady) && !p.dead;
    this.bubble.position.set(p.pos.x, 1.15, p.pos.z);
    this.bubble.scale.setScalar(1 + Math.sin(this.time * 4) * 0.04);
  }

  hurtPlayer(dmg) {
    const p = this.p;
    if (p.inv > 0 || p.dead || this.state !== 'play') return;
    if (p.shieldReady) {
      p.shieldReady = false;
      p.shieldCd = 13 - p.passives.shield * 2;
      p.inv = 0.6;
      this.particles.burst(p.pos.x, 1.2, p.pos.z, 0x8ce0ff, 14, 5, { life: 0.6, s0: 0.4, s1: 1.1 });
      this.sfx.squeak();
      return;
    }
    p.hp -= dmg;
    p.inv = 1.0;
    p.hitT = 0.4;
    if (this.hero) this.hero.hit();
    this.shake = Math.max(this.shake, 0.35);
    this.sfx.hurt();
    this.ui.hitFlash();
    if (p.hp <= p.maxHp * 0.3 && !this.lowWarned) { this.lowWarned = true; this.radio(pick(RADIO.low), 3); }
    if (p.hp <= 0) {
      p.hp = 0; p.dead = true;
      this.state = 'dead';
      this.endTimer = 0;
      this.sfx.sad();
      this.particles.burst(p.pos.x, 1, p.pos.z, 0x9cff3a, 30, 6, { life: 1.2, s0: 0.6, s1: 2 });
      this.addFx('fx_8', p.pos.x, 2.4, p.pos.z, 2.4, 2.5, { cy: 0.5 });
    }
  }

  inSwamp(x, z) {
    for (const s of this.world.swamps) if ((s.x - x) ** 2 + (s.z - z) ** 2 < s.r * s.r) return true;
    return false;
  }

  pushOut(pos, r) {
    for (const c of this.colliders) {
      const dx = pos.x - c.x, dz = pos.z - c.z, rr = c.r + r;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        pos.x = c.x + dx / d * rr; pos.z = c.z + dz / d * rr;
      }
    }
  }

  // ------------------------------------------------------------------ apparition des monstres
  offscreenPoint(margin = 1.18) {
    const w = this.camera.right - this.camera.left, h = this.camera.top - this.camera.bottom;
    const r = Math.random() * (2 * w + 2 * h);
    const t = Math.random() * 2.2 - 1.1;
    let nx, ny;
    if (r < w) { nx = t; ny = margin + 0.05; }
    else if (r < 2 * w) { nx = t; ny = -margin - 0.12; }
    else if (r < 2 * w + h) { nx = -margin; ny = t; }
    else { nx = margin; ny = t; }
    return this.ndcToGround(nx, ny);
  }

  ndcToGround(nx, ny) {
    this.raycaster.setFromCamera({ x: nx, y: ny }, this.camera);
    const out = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, out);
    const d = Math.hypot(out.x, out.z);
    if (d > ARENA - 1.5) { out.x *= (ARENA - 1.5) / d; out.z *= (ARENA - 1.5) / d; }
    return out;
  }

  director(dt) {
    const n = this.mission, t = this.t;
    const cap = this.ui.isMobile ? 120 : 170;
    let rate = (0.7 + t * 0.016) * (1 + n * 0.12);
    if (this.bossPhase === 'fight' || this.bossPhase === 'ship') rate *= 0.5;
    if (this.bossPhase === 'part') rate *= 0.35;
    this.spawnAcc += rate * dt;
    const tt = t + n * 12;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.monsters.length >= cap) break;
      const w = { grunt: 10, bug: tt > 15 ? 4 : 0, crotte: tt > 12 ? 2.5 : 0, proute: tt > 22 ? 2.2 : 0, vomi: tt > 30 ? 2 : 0,
        spitter: tt > 40 ? 1.5 : 0, flyer: tt > 55 ? 3 : 0, tank: tt > 70 ? 1 + tt / 120 : 0 };
      let sum = 0; for (const k in w) sum += w[k];
      let r = Math.random() * sum, type = 'grunt';
      for (const k in w) { r -= w[k]; if (r <= 0) { type = k; break; } }
      const pt = this.offscreenPoint();
      this.spawnMonster(type, pt.x, pt.z);
    }
    if (t >= this.nextHorde && this.bossPhase === 'none') {
      this.nextHorde += 45;
      this.horde(10 + n * 2 + Math.floor(t / 18));
    }
    if (t >= this.nextRadio) { this.nextRadio = t + 22 + Math.random() * 14; this.radio(pick(RADIO.random), Math.random() < 0.5 ? 2 : 4); }
    if (t >= this.mTime && this.bossPhase === 'none') { if (MISSIONS[this.mission].ship) this.callShip(); else this.spawnBoss(); }
  }

  horde(count) {
    this.radio(pick(RADIO.horde), 3);
    this.sfx.alarm();
    this.ui.banner('ILS ARRIVENT !', 'Une horde sort des terriers');
    const w = this.camera.right - this.camera.left, h = this.camera.top - this.camera.bottom;
    const rad = Math.max(w * 0.6, h * 0.6 / Math.sin(Math.asin(ISO.y))) + 2;
    const type = this.t > 60 && Math.random() < 0.5 ? 'bug' : 'grunt';
    const img = pick(TYPES[type].imgs);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      let x = this.p.pos.x + Math.cos(a) * rad, z = this.p.pos.z + Math.sin(a) * rad;
      const d = Math.hypot(x, z);
      if (d > ARENA - 1.5) { x *= (ARENA - 1.5) / d; z *= (ARENA - 1.5) / d; }
      this.spawnMonster(type, x, z, { img, delay: Math.random() * 0.6 });
    }
  }

  spawnMonster(type, x, z, o = {}) {
    const T = TYPES[type] || TYPES.grunt;
    // insectes dessinés : une partie des monstres de chaque sorte (les nouveaux monstres : toujours)
    const useAnim = !o.img && !o.mats && T.anim && this.mats[T.anim[0]] && (!T.animP || Math.random() < T.animP);
    const img = o.img || (useAnim ? T.anim[0] : pick(T.imgs));
    const mats = o.mats || this.mats[img];
    const s = new THREE.Sprite(mats.L);
    s.center.set(0.5, 0);
    const h = o.h || T.h;
    s.scale.set(0.01, 0.01, 1);
    s.position.set(x, 0, z);
    this.scene.add(s);
    const hpMul = o.boss ? 1 : (1 + this.t / 220) * (1 + this.mission * 0.15);
    const m = {
      type, T, mats, sprite: s, h, w: h * mats.aspect, pos: new THREE.Vector3(x, 0, z),
      hp: (o.hp || T.hp) * hpMul, maxHp: (o.hp || T.hp) * hpMul, speed: (o.speed || T.speed) * (0.9 + Math.random() * 0.2),
      r: o.r || T.r, dmg: T.dmg * (1 + this.mission * 0.08), xp: T.xp, fly: T.fly, ranged: T.ranged,
      face: 1, flash: 0, kbx: 0, kbz: 0, spawn: 0.45 + (o.delay || 0), delay: o.delay || 0, phase: Math.random() * 6.28,
      cd: 1 + Math.random() * 2, sprayCd: 0, alive: true, boss: !!o.boss, act: 3, mode: 'walk', modeT: 0, cdx: 0, cdz: 0,
    };
    if (ANNOUNCE[type] && !this.announced[type] && this.state === 'play') { this.announced[type] = true; this.radio(ANNOUNCE[type], 3); }
    if (!m.fly) this.particles.burst(x, 0.3, z, 0x6d4a63, 6, 2.5, { life: 0.7, s0: 0.4, s1: 1.1, alpha: 0.8, delay: 0 });
    if (useAnim) m.anim = T.anim.map((k) => this.mats[k]);
    if (useAnim && T.walk && this.mats[T.walk[0]]) {
      // animation complète : 4 images de marche, 4 d'attaque, 1 de défaite
      m.walk = T.walk.map((k) => this.mats[k]); m.atk = T.atk.map((k) => this.mats[k]);
      m.anim = [m.walk[0], m.walk[1], m.atk[2], this.mats[T.die]];
      m.sprite.material = m.walk[0].L;
    }
    if (o.anim) { m.anim = o.anim; m.deadIdx = 3; }
    this.monsters.push(m);
    return m;
  }

  spawnBoss() {
    const M = MISSIONS[this.mission];
    const pt = this.offscreenPoint(1.05);
    const hp = 450 * (1 + this.mission * 0.35) * (this.mission === 4 ? 1.3 : 1);
    this.boss = this.spawnMonster('tank', pt.x, pt.z, { img: M.boss.img, mats: M.boss.frames ? this.petF[1] : null, h: M.boss.h, hp, speed: 2.2, r: M.boss.h * 0.28, boss: true });
    if (M.boss.frames) { this.boss.frames = this.petF; this.boss.blowT = 0; }

    if (M.boss.gar && this.mats[M.boss.gar[0]]) {
      const W = this.mats[M.boss.gar[0]], D = this.mats[M.boss.gar[1]];
      this.boss.frames = [null, W, W, W, W, D]; this.boss.allLeft = true; this.boss.blowT = 0;
    }
    // 1-4 marche, 5 prépare, 6 fonce, 7 attaque, 8 rit, 10 se dégonfle
    if (M.boss.anim && this.mats[M.boss.anim + '_1']) {
      const P = [null]; for (let i = 1; i <= 12; i++) P.push(this.mats[M.boss.anim + '_' + i]);
      this.boss.pet = P; this.boss.blowT = 0;
      this.boss.frames = [null, P[1], P[1], P[1], P[1], P[10]];
    }
    if (M.boss.name === "L'Empereur Pétaros") this.radio('Hé hé hé ! Personne ne quitte MA planète, petit soldat !', 'petaros');
    this.boss.dmg = 20 + this.mission * 4;
    this.boss.xp = 40;
    this.bossPhase = 'fight';
    if (M.boss.crown) { this.crown = makeCrown(); this.crown.scale.setScalar(1.3); this.scene.add(this.crown); }
    this.ui.bossBar(M.boss.name, 1);
    this.ui.banner('LE GARDIEN ARRIVE !', M.boss.name);
    this.radio(pick(RADIO.boss), 3);
    this.sfx.alarm();
    this.shake = 0.6;
  }

  // la zone d'atterrissage dessinée (planche Gemini) posée au sol
  landingZone(x, z, w = 7) {
    const t = this.tex.vais_6;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false }));
    s.scale.set(w, w * t.image.height / t.image.width, 1);
    s.position.set(x, 0.05, z);
    s.renderOrder = 1;
    this.scene.add(s);
    return s;
  }

  // frappe orbitale : cible rouge au sol, puis rayon géant (utilisée par les armes et les pouvoirs de la Flotte)
  addStrike(x, z, r, dmg) {
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: this.ringTex, transparent: true, depthWrite: false }));
    ring.scale.set(r * 2, 1, r * 2);
    ring.position.set(x, 0.08, z);
    ring.renderOrder = 2;
    this.scene.add(ring);
    this.strikes.push({ x, z, r, dmg, t: 0, ring, beam: null, follow: null });
    this.sfx.strikeWarn();
  }

  // ------------------------------------------------------------------ le vaisseau de la Flotte (fin de la mission 1)
  callShip() {
    this.bossPhase = 'ship';
    const P = this.p.pos;
    // il se pose à côté du vaisseau écrasé de Lucas, là où on construira la base
    let x = 4, z = 1;
    for (let i = 0; i < 20; i++) {
      let ok = Math.hypot(x, z) < ARENA - 8;
      for (const c of this.colliders) if ((c.x - x) ** 2 + (c.z - z) ** 2 < (c.r + 4) ** 2) ok = false;
      if (ok) break;
      x = 4 + (Math.random() - 0.5) * 10; z = 1 + (Math.random() - 0.5) * 10;
    }
    const obj = this.makeDropship();
    obj.position.set(x, 30, z);
    obj.rotation.y = -Math.PI / 4;
    this.scene.add(obj);
    const ring = this.landingZone(x, z);
    this.ship = { obj, ring, x, z, t: 0, state: 'descend', cd: 0 };
    this.radio('Ici la Flotte ! On t’envoie des soldats pour construire une base !', 'pilote');
    this.ui.banner('LES RENFORTS ARRIVENT !', 'Un vaisseau de la Flotte se pose');
    this.sfx.alarm();
  }

  updateShip(dt) {
    const S = this.ship, o = S.obj;
    S.t += dt;
    const P = this.p.pos;
    S.ring.rotation.y += dt;
    S.ring.material.opacity = 0.55 + Math.sin(S.t * 6) * 0.35;
    if (S.state === 'descend') {
      const k = Math.min(1, S.t / 5), e = 1 - (1 - k) ** 3;
      o.position.y = 30 - (30 - 2.4) * e;
      if (k >= 1) { S.state = 'landed'; S.t = 0; this.shake = 0.5; this.sfx.boom(); this.scene.remove(S.ring); }
    } else if (S.state === 'landed') {
      o.position.y = 2.4 + Math.sin(S.t * 3) * 0.12;
      // les soldats descendent du vaisseau, et on commence la base
      if (this.state === 'play' && S.t > 1.2) { this.lastShip = { x: S.x, z: S.z }; this.winMission(); }
    } else if (S.state === 'away') {
      o.position.y += dt * (2 + S.t * 8);
      o.rotation.z = Math.min(0.3, S.t * 0.2);
    }
    // les moteurs soufflent du gaz vers le bas
    if (Math.random() < dt * 30) {
      const a = Math.random() * 6.28;
      this.particles.emit(S.x + Math.cos(a) * 1.5, Math.max(0.3, o.position.y - 1), S.z + Math.sin(a) * 1.5, Math.random() < 0.5 ? 0xffd27a : 0xd0d0d0,
        { vx: Math.cos(a) * 4, vy: -3, vz: Math.sin(a) * 4, life: 0.8, s0: 0.6, s1: 2, alpha: 0.7 });
    }
    // il tire sur les monstres pour protéger Lucas
    S.cd -= dt;
    if (S.state !== 'away' && S.cd <= 0) {
      const m = this.nearest(S.x, S.z, 16);
      if (m) {
        S.cd = 0.25;
        const sy = o.position.y - 0.5;
        const dx = m.pos.x - S.x, dz = m.pos.z - S.z, d = Math.hypot(dx, dz) || 1;
        this.shots.push({ kind: 'gas', x: S.x, z: S.z, y: Math.max(1, sy), vx: dx / d * 22, vz: dz / d * 22, life: 0.9, dmg: 30, pierce: 2, hit: new Set() });
        this.sfx.shoot();
      }
    }
    if (this.p.boarded && this.hero) this.hero.root.visible = false;
  }

  // ------------------------------------------------------------------ monstres
  buildGrid() {
    const g = this.grid; g.clear();
    for (const m of this.monsters) {
      if (m.spawn > 0.2) continue;
      const k = (Math.floor(m.pos.x / CELL) + 500) * 1000 + Math.floor(m.pos.z / CELL) + 500;
      let a = g.get(k); if (!a) { a = []; g.set(k, a); }
      a.push(m);
    }
  }

  query(x, z, r, fn) {
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
    const z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const a = this.grid.get((ix + 500) * 1000 + iz + 500);
      if (a) for (const m of a) if (m.alive) fn(m);
    }
  }

  updateMonsters(dt) {
    const p = this.p;
    for (const m of this.monsters) {
      if (!m.alive) continue;
      if (m.spawn > 0) {
        m.spawn -= dt;
        const k = Math.max(0, Math.min(1, 1 - (m.spawn) / (0.45)));
        m.sprite.scale.set(m.w * k, m.h * k, 1);
        m.sprite.position.set(m.pos.x, m.fly ? 1.2 * k : 0, m.pos.z);
        if (m.spawn <= 0 && m.delay && !m.fly) this.particles.burst(m.pos.x, 0.3, m.pos.z, 0x6d4a63, 4, 2.5, { life: 0.6, s0: 0.4, s1: 1 });
        continue;
      }
      m.flash -= dt; m.sprayCd -= dt; m.dogCd = (m.dogCd || 0) - dt;
      let gx = p.pos.x, gz = p.pos.z, gr = 0.45, gent = null;
      if (this.mode === 'base') { const t = this.rts.monsterGoal(m, dt); gx = t.x; gz = t.z; gr = t.r; gent = t.ent; }
      let dx = gx - m.pos.x, dz = gz - m.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      dx /= d; dz /= d;
      let sp = m.speed * (!m.fly && this.inSwamp(m.pos.x, m.pos.z) ? 0.55 : 1);
      if (m.slowT > 0) { m.slowT -= dt; sp *= 0.45; }
      if (gent && d < m.r + gr + 0.25) sp = 0; // il mord ce qu'il a devant lui
      if (this.state !== 'play') sp *= 0.3;

      if (m.boss) sp = this.bossBrain(m, dt, d, dx, dz, sp);
      else if (m.ranged && d < 8.5 && (this.mode !== 'base' || gent)) {
        sp = d < 5 ? -m.speed * 0.5 : 0;
        m.cd -= dt;
        if (m.cd <= 0 && this.state === 'play') {
          m.cd = 2.4 + Math.random();
          this.spits.push({ x: m.pos.x, z: m.pos.z, vx: dx * 7, vz: dz * 7, life: 3, vomit: !!m.T.vomit });
          m.atkT = m.walk ? 0.8 : 0.5;
          if (m.T.vomit) this.sfx.fart(1.8, 0.25, 0.2);
          this.particles.emit(m.pos.x + dx * 0.6, 1, m.pos.z + dz * 0.6, 0x9b7a2a, { life: 0.4, s0: 0.5, s1: 1.2 });
        }
      }
      let vx = dx * sp, vz = dz * sp;
      if (m.mode === 'charge') { vx = m.cdx * 11; vz = m.cdz * 11; }
      m.pos.x += (vx + m.kbx) * dt; m.pos.z += (vz + m.kbz) * dt;
      const kd = Math.exp(-7 * dt); m.kbx *= kd; m.kbz *= kd;
      // les monstres se poussent entre eux pour ne pas s'empiler
      this.query(m.pos.x, m.pos.z, m.r + 1, (o) => {
        if (o === m || o.fly !== m.fly) return;
        const ox = m.pos.x - o.pos.x, oz = m.pos.z - o.pos.z, rr = (m.r + o.r) * 0.85;
        const d2 = ox * ox + oz * oz;
        if (d2 < rr * rr && d2 > 1e-6) {
          const dd = Math.sqrt(d2), push = (rr - dd) * 0.5;
          const wm = m.boss ? 0.1 : (o.boss ? 1.6 : 1);
          m.pos.x += ox / dd * push * wm; m.pos.z += oz / dd * push * wm;
        }
      });
      if (!m.fly) this.pushOut(m.pos, m.r * 0.8);
      const md = Math.hypot(m.pos.x, m.pos.z);
      if (md > ARENA + 2) { m.pos.x *= (ARENA + 2) / md; m.pos.z *= (ARENA + 2) / md; }

      // tourné vers où il marche (les dessins regardent à gauche)
      const sx = vx * RIGHT.x + vz * RIGHT.z;
      if (Math.abs(sx) > 0.15) m.face = sx > 0 ? -1 : 1;
      const fl = m.flash > 0;
      m.sprite.material = m.face > 0 ? (fl ? m.mats.fL : m.mats.L) : (fl ? m.mats.fR : m.mats.R);
      const wob = Math.sin(this.time * (m.fly ? 14 : 9) + m.phase);
      let shakeX = 0;
      if (m.mode === 'windup') shakeX = Math.sin(this.time * 60) * 0.15;
      m.sprite.scale.set(m.w * (1 - wob * 0.04), m.h * (1 + wob * 0.05), 1);
      m.sprite.position.set(m.pos.x + shakeX, m.fly ? 1.2 + wob * 0.2 : 0, m.pos.z);
      if (m.frames) this.bossPose(m, dt, vx, vz, fl, wob);
      if (m.anim) {
        // les 3 monstres dessinés : 2 images de marche, 1 d'attaque
        m.atkT = Math.max(0, (m.atkT || 0) - dt);
        let F = m.anim[m.atkT > 0 ? 2 : Math.floor(this.time * 5 + m.phase) % 2];
        if (m.walk) F = m.atkT > 0 ? m.atk[Math.min(3, Math.floor((1 - m.atkT / 0.8) * 4))] : m.walk[Math.floor(this.time * 7 + m.phase) % 4];
        const orig = m.face > 0, k = m.h / m.anim[0].h;
        m.sprite.material = orig ? (fl ? F.fL : F.L) : (fl ? F.fR : F.R);
        m.sprite.center.set(orig ? F.ax : 1 - F.ax, 0);
        m.sprite.scale.set(F.w * k * (1 - wob * 0.04), F.h * k * (1 + wob * 0.05), 1);
      }

      if (this.mode === 'base') { if (gent && d < m.r + gr + 0.35) this.rts.monsterBite(m, gent, dt); }
      else if (d < m.r + 0.45) this.hurtPlayer(m.dmg);
      const near = this.mode === 'base' ? (gent ? d - gr : 99) : d;
      if (m.walk && !m.ranged && !m.T.gas && !m.T.kamikaze && near < m.r + 0.9 && !(m.atkT > 0)) m.atkT = 0.8;
      if (m.T.gas && near < 3 && this.state === 'play') {
        m.gasCd = (m.gasCd ?? 0.5) - dt;
        if (m.gasCd <= 0) { m.gasCd = 1.5; m.atkT = 0.8; this.toxicCloud(m.pos.x, m.pos.z, 2.8, m.dmg + 2); }
      }
      // la Crotte de Nez s'accroupit, saute et gonfle juste avant d'exploser
      if (m.T.kamikaze && m.walk && near < 3.4 && !m.lunged) { m.lunged = true; m.atkT = 0.8; }
      if (m.T.kamikaze && near < m.r + 0.7 && this.state === 'play') this.kamikaze(m);
    }
    // retire ceux qui sont partis
    if (this.monsters.some((m) => !m.alive)) this.monsters = this.monsters.filter((m) => m.alive);
    if (this.crown && this.boss && this.boss.alive) {
      const b = this.boss;
      this.crown.position.set(b.sprite.position.x, b.sprite.position.y + b.sprite.scale.y * 0.86, b.pos.z);
      this.crown.rotation.y += dt;
    }
  }

  // l'Empereur Pétaros a ses propres poses (planche Gemini)
  bossPose(m, dt, vx, vz, fl, wob) {
    m.blowT = Math.max(0, (m.blowT || 0) - dt);
    const sx = vx * RIGHT.x + vz * RIGHT.z;
    if (m.pet) {
      // tous les dessins de la planche regardent à gauche
      const P = m.pet, px = (this.p.pos.x - m.pos.x) * RIGHT.x + (this.p.pos.z - m.pos.z) * RIGHT.z;
      let F, right = m.face < 0;
      if (m.mode === 'windup') { F = P[m.modeT > 0.35 ? 5 : 6]; right = px > 0; }
      else if (m.mode === 'charge') { F = P[6]; right = m.cdx * RIGHT.x + m.cdz * RIGHT.z > 0; }
      else if (m.blowT > 0) { F = P[m.blowT > 0.3 ? 7 : 8]; right = px > 0; }
      else F = P[1 + Math.floor(this.time * 5 + m.phase) % 4];
      const orig = !right, k = m.h / P[1].h;
      m.sprite.material = orig ? (fl ? F.fL : F.L) : (fl ? F.fR : F.R);
      m.sprite.center.set(orig ? F.ax : 1 - F.ax, 0);
      m.sprite.scale.set(F.w * k * (1 - wob * 0.03), F.h * k * (1 + wob * 0.04), 1);
      return;
    }
    let fi = 1, right = m.face < 0;
    if (m.mode === 'windup' || m.mode === 'charge') { fi = 2; right = (m.mode === 'charge' ? m.cdx * RIGHT.x + m.cdz * RIGHT.z : sx) > 0; }
    else if (m.blowT > 0) {
      const px = (this.p.pos.x - m.pos.x) * RIGHT.x + (this.p.pos.z - m.pos.z) * RIGHT.z;
      fi = px > 0 ? 3 : 4; right = true;
    }
    const F = m.frames[fi];
    // dessins 2, 3 et 4 regardent à droite ; le 1 regarde à gauche
    const orig = (fi === 1 || m.allLeft) ? !right : right;
    m.sprite.material = orig ? (fl ? F.fL : F.L) : (fl ? F.fR : F.R);
    m.sprite.center.set(orig ? F.ax : 1 - F.ax, 0);
    const k = m.h / m.frames[1].h;
    m.sprite.scale.set(F.w * k * (1 - wob * 0.03), F.h * k * (1 + wob * 0.04), 1);
  }

  bossBrain(m, dt, d, dx, dz, sp) {
    m.modeT -= dt;
    if (m.mode === 'walk') {
      m.act -= dt;
      if (m.act <= 0 && this.state === 'play') {
        const r = Math.random();
        if (r < 0.45 && d < 16) { m.mode = 'windup'; m.modeT = 0.7; }
        else if (r < 0.8) {
          const n = 10 + this.mission * 2;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            this.spits.push({ x: m.pos.x, z: m.pos.z, vx: Math.cos(a) * 6, vz: Math.sin(a) * 6, life: 3.5 });
          }
          this.sfx.fart(0.5, 0.5, 0.4);
          m.blowT = 0.8;
          this.particles.burst(m.pos.x, 1.5, m.pos.z, 0x9b7a2a, 16, 5, { life: 0.8, s0: 0.8, s1: 2 });
          m.act = 2.5;
        } else {
          for (let i = 0; i < 4 + this.mission; i++) {
            const a = Math.random() * 6.28;
            this.spawnMonster('grunt', m.pos.x + Math.cos(a) * 3, m.pos.z + Math.sin(a) * 3);
          }
          m.act = 2.5;
        }
        if (m.mode === 'walk' && m.act <= 0) m.act = 2.5;
      }
      return sp;
    }
    if (m.mode === 'windup') {
      if (m.modeT <= 0) { m.mode = 'charge'; m.modeT = 0.9; m.cdx = dx; m.cdz = dz; this.sfx.fart(0.4, 0.6, 0.5); }
      return 0;
    }
    if (m.mode === 'charge') {
      if (Math.random() < 0.6) this.particles.emit(m.pos.x, 0.5, m.pos.z, 0x9b7a2a, { life: 0.7, s0: 0.8, s1: 1.8 });
      if (m.modeT <= 0) { m.mode = 'walk'; m.act = 2 + Math.random() * 1.5; }
      return 0;
    }
    return sp;
  }

  // un effet dessiné (planche Gemini) qui grossit et s'efface
  addFx(key, x, y, z, w, life, o = {}) {
    const t = this.tex[key];
    if (!t) return;
    const mat = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: !o.ground });
    const s = new THREE.Sprite(mat);
    s.center.set(0.5, o.ground ? 0.5 : (o.cy ?? 0.15));
    s.position.set(x, y, z);
    s.renderOrder = o.ground ? 1 : 6;
    this.scene.add(s);
    this.fxs.push({ s, t: 0, life, w, ratio: t.image.height / t.image.width, grow: o.grow || 1, rise: o.rise || 0, fadeAt: o.fadeAt ?? 0.5 });
  }

  updateFxSprites(dt) {
    for (const f of this.fxs) {
      f.t += dt;
      const k = f.t / f.life, w = f.w * (1 + (f.grow - 1) * Math.min(1, k * 1.5));
      f.s.scale.set(w, w * f.ratio, 1);
      f.s.position.y += f.rise * dt;
      f.s.material.opacity = k < f.fadeAt ? 1 : Math.max(0, 1 - (k - f.fadeAt) / (1 - f.fadeAt));
      if (k >= 1) { this.scene.remove(f.s); f.s.material.dispose(); f.done = true; }
    }
    if (this.fxs.some((f) => f.done)) this.fxs = this.fxs.filter((f) => !f.done);
  }

  // nuage toxique du Proute-Renvoie : fait mal à tout ce qui est autour
  toxicCloud(x, z, r, dmg) {
    this.addFx('fx_1', x, 0, z, r * 1.6, 1.1, { grow: 1.4, rise: 0.6 });
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * 6.28, d = Math.random() * r;
      this.particles.emit(x + Math.cos(a) * d, 0.6 + Math.random(), z + Math.sin(a) * d, Math.random() < 0.5 ? 0x7fd62a : 0xb8ff6a,
        { vx: Math.cos(a), vy: 0.5, vz: Math.sin(a), life: 1.2, s0: 0.8, s1: 2.2, alpha: 0.75, drag: 2 });
    }
    if (this.sfx.ok('toxic', 400)) this.sfx.fart(0.7, 0.4, 0.3);
    if (this.mode === 'base') this.rts.areaDamage(x, z, r, dmg, 0);
    else if ((this.p.pos.x - x) ** 2 + (this.p.pos.z - z) ** 2 < r * r) this.hurtPlayer(dmg);
  }

  // la Crotte de Nez s'écrase : grosse éclaboussure gluante qui ralentit
  kamikaze(m) {
    const x = m.pos.x, z = m.pos.z, r = 2.8;
    this.particles.burst(x, 0.8, z, 0x9ccf3a, 26, 7, { life: 0.9, s0: 0.6, s1: 1.8 });
    this.addFx('fx_3', x, 0, z, 4.2, 0.6, { grow: 1.3, cy: 0.3 });
    this.addFx(this.tex.cr_9 ? 'cr_9' : 'mon_12', x, 0.05, z, 3, 5, { ground: true, fadeAt: 0.7 });
    this.word(x, 2, z, 3);
    this.sfx.boom();
    if (this.mode === 'base') this.rts.areaDamage(x, z, r, m.dmg, 3);
    else if ((this.p.pos.x - x) ** 2 + (this.p.pos.z - z) ** 2 < r * r) { this.hurtPlayer(m.dmg); this.slowPlayer(3); }
    this.kill(m);
  }

  slowPlayer(t) {
    this.p.slowT = Math.max(this.p.slowT || 0, t);
    if (!this.slowWarned) { this.slowWarned = true; this.radio('Beurk ! Je suis tout collant, j’avance moins vite !', 'lucasSur'); }
  }

  // ⭐ compétence spéciale de Lucas : le MÉGA-PROUT (onde de choc autour de lui)
  megaProut(x, z, power = 1) {
    const r = 6.5;
    this.explode(x, z, r, 90 * power, true);
    this.query(x, z, r + 2, (m) => {
      const dx = m.pos.x - x, dz = m.pos.z - z, d = Math.hypot(dx, dz) || 1;
      m.kbx += dx / d * 18; m.kbz += dz / d * 18;
    });
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * 6.28;
      this.particles.emit(x, 0.6, z, i % 2 ? 0xb8ff6a : 0x7fd62a, { vx: Math.cos(a) * 14, vz: Math.sin(a) * 14, vy: 1, life: 0.8, s0: 1, s1: 2.6, drag: 2.5 });
    }
    this.sfx.fart(0.35, 1.0, 0.6);
    this.addFx('fx_4', x, 0.05, z, r * 2.2, 0.9, { ground: true, grow: 1.5, fadeAt: 0.3 });
    this.shake = 0.9;
    this.word(x, 3, z, 2, 2);
  }

  useSkill() {
    const p = this.p;
    if (this.state !== 'play' || this.mode !== 'hero' || p.dead) return;
    if ((p.skillCd || 0) > 0) return;
    p.skillCd = 20;
    this.trophy.unlock('mega');
    this.megaProut(p.pos.x, p.pos.z, 1 + p.lvl * 0.1);
    this.radio('MÉGA-PROUT DE LUCAS !!!', 'lucasCri');
  }

  damage(m, dmg, kx = 0, kz = 0, kb = 4) {
    if (!m.alive || m.spawn > 0) return;
    m.hp -= dmg;
    m.flash = 0.08;
    const mass = m.boss ? 12 : (m.T.heavy ? 4 : 1);
    m.kbx += kx * kb / mass; m.kbz += kz * kb / mass;
    if (m.boss) this.ui.bossBar(null, m.hp / m.maxHp, true);
    if (m.hp <= 0) this.kill(m);
  }

  kill(m, drop = true) {
    if (!m.alive) return;
    m.alive = false;
    if (drop) this.trophy.add('kills');
    const FA = m.anim && !m.boss && m.anim[m.deadIdx ?? m.T.dead ?? 0];
    if (FA) {
      const k = m.h / m.anim[0].h, orig = m.face > 0;
      const mat = (orig ? FA.L : FA.R).clone();
      m.sprite.material = mat;
      m.sprite.center.set(orig ? FA.ax : 1 - FA.ax, 0);
      this.dying.push({ sprite: m.sprite, mat, t: 0, w: FA.w * k, h: FA.h * k, y: m.sprite.position.y, spin: Math.random() < 0.5 ? -1 : 1, vx: (Math.random() - 0.5) * 3, boss: false });
      this.particles.burst(m.pos.x, m.h * 0.5, m.pos.z, 0xb8ff6a, 7, 3.5, { life: 0.8, s0: 0.5, s1: 1.6 });
      this.sfx.deflate();
      if (drop) { this.kills++; if (this.mode === 'base') { this.rts.money += m.xp * 4; return; } for (let i = 0; i < m.xp; i++) this.addBean(m.pos.x + (Math.random() - 0.5) * 0.6, m.pos.z + (Math.random() - 0.5) * 0.6, 1); }
      return;
    }
    const F5 = m.frames && m.frames[5];
    const mat = F5 ? F5.L.clone() : (m.face > 0 ? m.mats.L : m.mats.R).clone();
    m.sprite.material = mat;
    let dw = m.w, dh = m.h;
    if (F5) { const k = m.h / m.frames[1].h; dw = F5.w * k; dh = F5.h * k; m.sprite.center.set(0.5, 0); }
    this.dying.push({ sprite: m.sprite, mat, t: 0, w: dw, h: dh, y: m.sprite.position.y, spin: Math.random() < 0.5 ? -1 : 1, vx: (Math.random() - 0.5) * 3, boss: m.boss });
    this.particles.burst(m.pos.x, m.h * 0.5, m.pos.z, pick([0x9cff3a, 0xb8ff6a, 0xd8ff7a]), m.boss ? 40 : 7, m.boss ? 8 : 3.5, { life: 0.8, s0: 0.5, s1: 1.6 });
    this.sfx.deflate();
    if (!drop) return;
    this.kills++;
    if (this.mode === 'base') { this.rts.money += m.xp * 4; return; }
    if (m.boss) {
      this.bossPhase = 'part';
      this.ui.bossBar(null);
      this.shake = 1;
      this.sfx.boom();
      this.word(m.pos.x, m.h, m.pos.z, 4, 2);
      if (this.crown) { this.scene.remove(this.crown); this.crown = null; }
      if (this.mission === MISSIONS.length - 1) this.trophy.unlock('emperor');
      this.dropPart(m.pos.x, m.pos.z);
      for (let i = 0; i < 12; i++) this.addBean(m.pos.x + (Math.random() - 0.5) * 4, m.pos.z + (Math.random() - 0.5) * 4, 5);
      this.radio(pick(RADIO.bossDown), 4);
      return;
    }
    if (m.xp >= 5) this.addBean(m.pos.x, m.pos.z, 5);
    else for (let i = 0; i < m.xp; i++) this.addBean(m.pos.x + (Math.random() - 0.5) * 0.6, m.pos.z + (Math.random() - 0.5) * 0.6, 1);
    const r = Math.random();
    if (r < (m.T.heavy ? 0.25 : 0.02)) this.addItem('food', m.pos.x, m.pos.z);
    else if (r > 0.997) this.addItem('magnet', m.pos.x, m.pos.z);
    if (m.T.heavy || Math.random() < 0.04) this.word(m.pos.x, m.h * 0.8, m.pos.z);
  }

  updateDying(dt) {
    for (const d of this.dying) {
      d.t += dt;
      const s = d.sprite;
      if (d.t < 0.18) {
        const k = 1 + d.t * 2.2;
        s.scale.set(d.w * k, d.h * k * 0.95, 1);
      } else {
        const k = (d.t - 0.18) / (d.boss ? 1.4 : 0.62);
        const sc = Math.max(0, 1.3 * (1 - k));
        s.scale.set(d.w * sc, d.h * sc, 1);
        d.y += dt * (3 + k * 10);
        s.position.y = d.y;
        s.position.x += d.vx * dt;
        d.mat.rotation += dt * 13 * d.spin;
        if (Math.random() < 0.5) this.particles.emit(s.position.x, d.y + 0.3, s.position.z, 0xd8ff7a, { life: 0.4, s0: 0.2, s1: 0.6, alpha: 0.7 });
        if (k >= 1) d.done = true;
      }
    }
    if (this.dying.some((d) => d.done)) {
      this.dying = this.dying.filter((d) => {
        if (!d.done) return true;
        this.scene.remove(d.sprite); d.mat.dispose();
        return false;
      });
    }
  }

  // ------------------------------------------------------------------ armes
  nearest(x, z, maxD, exclude) {
    let best = null, bd = maxD * maxD;
    for (const m of this.monsters) {
      if (!m.alive || m.spawn > 0 || (exclude && exclude.has(m))) continue;
      const d2 = (m.pos.x - x) ** 2 + (m.pos.z - z) ** 2;
      if (d2 < bd) { bd = d2; best = m; }
    }
    return best;
  }

  crowded(range) {
    // l'endroit où il y a le plus de monstres près de Lucas
    const p = this.p.pos;
    const near = this.monsters.filter((m) => m.alive && m.spawn <= 0 && (m.pos.x - p.x) ** 2 + (m.pos.z - p.z) ** 2 < range * range);
    if (!near.length) return null;
    let best = near[0], bc = -1;
    for (let i = 0; i < Math.min(6, near.length); i++) {
      const c = near[Math.floor(Math.random() * near.length)];
      let cnt = 0;
      this.query(c.pos.x, c.pos.z, 3, () => cnt++);
      if (c.boss) cnt += 8;
      if (cnt > bc) { bc = cnt; best = c; }
    }
    return best;
  }

  updateWeapons(dt) {
    const p = this.p, P = p.pos;
    const dm = p.dmgMul, cm = p.cdMul;
    for (const [id, w] of Object.entries(p.weapons)) {
      const L = w.lvl;
      w.t -= dt;
      if (id === 'blaster' && w.t <= 0) {
        const count = 1 + Math.floor(L / 2);
        const used = new Set();
        let fired = false;
        // le gardien est une cible prioritaire quand il est proche
        if (this.boss && this.boss.alive && this.boss.spawn <= 0 && (this.boss.pos.x - P.x) ** 2 + (this.boss.pos.z - P.z) ** 2 < 144) used.add(this.boss);
        for (let i = 0; i < count; i++) {
          const m = (i === 0 && used.size) ? this.boss : (this.nearest(P.x, P.z, 15, used) || [...used][0]);
          if (!m) break;
          used.add(m);
          let dx = m.pos.x - P.x, dz = m.pos.z - P.z;
          const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
          const spread = (i - (count - 1) / 2) * 0.08;
          const c = Math.cos(spread), s = Math.sin(spread);
          const ux = dx * c - dz * s, uz = dx * s + dz * c;
          let sx0 = P.x + ux * 0.6, sz0 = P.z + uz * 0.6, sy0 = 1.2;
          if (this.hero) { const mz = this.hero.muzzleWorld(this._v); sx0 = mz.x; sz0 = mz.z; sy0 = Math.max(0.6, mz.y); }
          this.shots.push({ kind: 'gas', x: sx0, z: sz0, y: sy0, vx: ux * 18, vz: uz * 18, life: 1, dmg: (10 + 3 * L) * dm, pierce: L >= 5 ? 1 : 0, hit: new Set() });
          this.particles.emit(sx0, sy0, sz0, 0x9cff3a, { vx: ux * 2, vz: uz * 2, life: 0.3, s0: 0.4, s1: 0.9 });
          p.fireT = 0.3; p.aim = (ux * RIGHT.x + uz * RIGHT.z) >= 0 ? 1 : -1;
          fired = true;
        }
        w.t = Math.max(0.22, 0.55 - 0.04 * L) * cm;
        if (fired) this.sfx.shoot();
      }
      if (id === 'beans' && w.t <= 0) {
        const m = this.nearest(P.x, P.z, 13);
        if (m) {
          const base = Math.atan2(m.pos.z - P.z, m.pos.x - P.x);
          const n = 3 + L, spread = 0.75;
          for (let i = 0; i < n; i++) {
            const a = base + (i / (n - 1) - 0.5) * spread;
            this.shots.push({ kind: 'bean', x: P.x, z: P.z, y: 1.1, vx: Math.cos(a) * 15, vz: Math.sin(a) * 15, life: 0.75, dmg: (6 + 2 * L) * dm, pierce: 2, hit: new Set(), rot: Math.random() * 6 });
          }
          this.sfx.fart(1.4, 0.15, 0.2);
          w.t = Math.max(0.8, 1.6 - 0.1 * L) * cm;
        } else w.t = 0.3;
      }
      if (id === 'bombs' && w.t <= 0) {
        const n = 1 + Math.floor((L - 1) / 2);
        let any = false;
        for (let i = 0; i < n; i++) {
          const m = this.crowded(13);
          if (!m) break;
          any = true;
          const tx = m.pos.x + (Math.random() - 0.5) * 2 * i, tz = m.pos.z + (Math.random() - 0.5) * 2 * i;
          this.bombs.push({ x0: P.x, z0: P.z, x1: tx, z1: tz, t: 0, dur: 0.75, r: 2.4 + 0.3 * L, dmg: (14 + 6 * L) * dm });
        }
        w.t = any ? Math.max(1.2, 2.5 - 0.2 * L) * cm : 0.4;
      }
      if (id === 'strike' && w.t <= 0) {
        const m = this.crowded(16);
        if (m) {
          const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ map: this.ringTex, transparent: true, depthWrite: false }));
          const r = 3.2 + 0.35 * L;
          ring.scale.set(r * 2, 1, r * 2);
          ring.position.set(m.pos.x, 0.08, m.pos.z);
          ring.renderOrder = 2;
          this.scene.add(ring);
          this.strikes.push({ x: m.pos.x, z: m.pos.z, r, dmg: (45 + 15 * L) * dm, t: 0, ring, beam: null, follow: m });
          this.sfx.strikeWarn();
          if (Math.random() < 0.3) this.radio(pick(RADIO.strike), 1);
          w.t = Math.max(3.5, 7.5 - 0.7 * L) * cm;
        } else w.t = 0.5;
      }
      if (id === 'spray') this.updateSpray(dt, w, L, dm);
      if (id === 'dog') this.updateDogs(dt, w, L, dm);
    }
  }

  updateSpray(dt, w, L, dm) {
    const n = Math.min(4, 1 + Math.floor(L / 2));
    while (this.sprays.length < n) {
      const s = new THREE.Sprite(this.sprayMat);
      s.center.set(0.5, 0.2);
      const h = 1.1;
      s.scale.set(h * this.tex.item_spray.image.width / this.tex.item_spray.image.height, h, 1);
      this.scene.add(s);
      this.sprays.push(s);
    }
    w.ang = (w.ang || 0) + dt * (2.6 + 0.25 * L);
    const rad = 2.4 + 0.15 * L, P = this.p.pos;
    for (let i = 0; i < this.sprays.length; i++) {
      const a = w.ang + (i / this.sprays.length) * Math.PI * 2;
      const x = P.x + Math.cos(a) * rad, z = P.z + Math.sin(a) * rad;
      this.sprays[i].position.set(x, 0.6 + Math.sin(this.time * 6 + i) * 0.15, z);
      if (Math.random() < dt * 25) this.particles.emit(x, 0.9, z, 0xbfefff, { vx: -Math.sin(a) * 2, vz: Math.cos(a) * 2, life: 0.5, s0: 0.3, s1: 1.1, alpha: 0.55 });
      this.query(x, z, 1.4, (m) => {
        if (m.sprayCd > 0 || m.spawn > 0) return;
        if ((m.pos.x - x) ** 2 + (m.pos.z - z) ** 2 < (m.r + 0.6) ** 2) {
          m.sprayCd = 0.45;
          const dx = m.pos.x - P.x, dz = m.pos.z - P.z, d = Math.hypot(dx, dz) || 1;
          this.damage(m, (6 + 3 * L) * dm, dx / d, dz / d, 7);
        }
      });
    }
  }

  updateDogs(dt, w, L, dm) {
    const want = L >= 4 ? 2 : 1;
    while (this.dogs.length < want) {
      const s = new THREE.Sprite(this.dogMats[0].L);
      s.center.set(0.5, 0);
      this.scene.add(s);
      this.dogs.push({ sprite: s, x: this.p.pos.x + 1, z: this.p.pos.z + 1, target: null, cd: 0, f: 0, face: 1 });
    }
    const P = this.p.pos, sp = 7 + 0.6 * L;
    this.dogs.forEach((g, i) => {
      g.cd -= dt;
      if (!g.target || !g.target.alive || (g.target.pos.x - P.x) ** 2 + (g.target.pos.z - P.z) ** 2 > 196) {
        g.target = this.nearest(g.x, g.z, 11);
        if (g.target && i === 1 && this.dogs[0].target === g.target) g.target = this.nearest(g.x, g.z, 11, new Set([g.target])) || g.target;
      }
      let tx, tz;
      if (g.target) { tx = g.target.pos.x; tz = g.target.pos.z; }
      else { tx = P.x + (i ? -1.6 : 1.6); tz = P.z + 1.2; }
      let dx = tx - g.x, dz = tz - g.z;
      const d = Math.hypot(dx, dz);
      let moving = false;
      if (d > (g.target ? g.target.r + 0.5 : 0.6)) {
        g.x += dx / d * sp * dt; g.z += dz / d * sp * dt; moving = true;
      } else if (g.target && g.cd <= 0) {
        g.cd = 0.6;
        this.damage(g.target, (10 + 5 * L) * dm, dx / (d || 1), dz / (d || 1), 5);
        this.particles.burst(tx, 0.8, tz, 0xffffff, 4, 3, { life: 0.3, s0: 0.3, s1: 0.7 });
        if (Math.random() < 0.3) this.sfx.squeak();
      }
      if (moving) g.f += dt * 12;
      const sx = dx * RIGHT.x + dz * RIGHT.z;
      if (Math.abs(sx) > 0.1) g.face = sx > 0 ? -1 : 1;
      if (this.dog8) {
        if (moving) g.d8 = dir8(dx, dz);
        const [fi, flip] = DOG8[g.d8 || 0], F = this.dog8[fi], k = 1.45 / 260;
        g.sprite.material = flip ? F.R : F.L;
        g.sprite.center.set(flip ? 1 - F.ax : F.ax, 0);
        g.sprite.scale.set(F.w * k, F.h * k, 1);
      } else {
        const mats = this.dogMats[Math.floor(g.f) % 4];
        g.sprite.material = g.face > 0 ? mats.L : mats.R;
        const h = 1.25;
        g.sprite.scale.set(h * mats.aspect, h, 1);
      }
      g.sprite.position.set(g.x, moving ? Math.abs(Math.sin(g.f)) * 0.15 : 0, g.z);
    });
  }

  updateShots(dt) {
    const P = this.p.pos;
    for (const s of this.shots) {
      s.x += s.vx * dt; s.z += s.vz * dt; s.life -= dt;
      if (s.kind === 'gas' && Math.random() < 0.5) this.particles.emit(s.x, s.y, s.z, 0x9cff3a, { life: 0.25, s0: 0.35, s1: 0.1, alpha: 0.6 });
      if (s.kind === 'bean') s.rot += dt * 15;
      this.query(s.x, s.z, 1.6, (m) => {
        if (s.life <= 0 || s.hit.has(m) || m.spawn > 0) return;
        const rr = m.r + 0.3;
        if ((m.pos.x - s.x) ** 2 + (m.pos.z - s.z) ** 2 < rr * rr) {
          s.hit.add(m);
          const v = Math.hypot(s.vx, s.vz) || 1;
          this.damage(m, s.dmg, s.vx / v, s.vz / v, s.kind === 'bean' ? 3 : 4);
          this.particles.emit(s.x, s.y, s.z, s.kind === 'gas' ? 0xb8ff6a : 0xb5522b, { life: 0.35, s0: 0.5, s1: 1.2 });
          if (s.pierce-- <= 0) s.life = 0;
        }
      });
      if (this.mode === 'base' && s.life > 0 && this.rts.shotNest(s)) s.life = 0;
    }
    this.shots = this.shots.filter((s) => s.life > 0);

    for (const s of this.spits) {
      s.x += s.vx * dt; s.z += s.vz * dt; s.life -= dt;
      if (Math.random() < 0.3) this.particles.emit(s.x, 1, s.z, s.vomit ? 0xe8d84a : 0x9b7a2a, { life: 0.3, s0: 0.4, s1: 0.1, alpha: 0.5 });
      if (this.mode === 'base') { if (this.rts.spitHit(s)) s.life = 0; }
      else if ((s.x - P.x) ** 2 + (s.z - P.z) ** 2 < 0.55) {
        this.hurtPlayer(6 + this.mission * 2); s.life = 0;
        if (s.vomit) this.slowPlayer(2.5);
      }
      if (s.life <= 0 && s.vomit) { this.particles.burst(s.x, 0.5, s.z, 0xe8d84a, 8, 3, { life: 0.6, s0: 0.4, s1: 1.2 }); this.addFx('fx_2', s.x, 0.05, s.z, 2.4, 3, { ground: true, fadeAt: 0.6 }); }
    }
    this.spits = this.spits.filter((s) => s.life > 0);

    for (const b of this.bombs) {
      b.t += dt;
      if (b.t >= b.dur) { b.done = true; this.explode(b.x1, b.z1, b.r, b.dmg); }
    }
    this.bombs = this.bombs.filter((b) => !b.done);
  }

  explode(x, z, r, dmg, big = false) {
    if (this.mode === 'base') this.rts.blastNests(x, z, r, dmg);
    this.query(x, z, r + 1.5, (m) => {
      const dx = m.pos.x - x, dz = m.pos.z - z, d = Math.hypot(dx, dz);
      if (d < r + m.r) this.damage(m, dmg, dx / (d || 1), dz / (d || 1), big ? 12 : 8);
    });
    const b = this.booms.find((o) => o.life <= 0) || this.booms[0];
    b.life = b.max = big ? 0.7 : 0.5;
    b.s.visible = true;
    b.s.position.set(x, big ? -0.6 : -0.3, z);
    b.s.center.set(0.5, 0.15);
    b.s.scale.set(r * 2.8, r * 2.8, 1);
    this.particles.burst(x, 0.6, z, 0x7fd62a, big ? 26 : 12, big ? 9 : 5, { life: 0.9, s0: 0.8, s1: 2.4 });
    this.sfx.boom();
    this.shake = Math.max(this.shake, big ? 0.55 : 0.2);
    if (big || Math.random() < 0.25) this.word(x, 2, z, big ? 4 : undefined);
  }

  addBean(x, z, v) {
    if (this.beans.length > 420) {
      const b = this.beans[Math.floor(Math.random() * this.beans.length)];
      b.v += v; b.gold = true;
      return;
    }
    this.beans.push({ x, z, v, gold: v >= 5, pull: false, ph: Math.random() * 6, sp: 0 });
  }

  addItem(kind, x, z) {
    let obj;
    if (kind === 'part') {
      // le dessin de la pièce (planche Gemini) dans un rayon de lumière
      obj = new THREE.Group();
      const t = this.tex['obj_' + (7 + this.mission)];
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, alphaTest: 0.4 }));
      spr.center.set(0.5, 0);
      const h = 1.8;
      spr.scale.set(h * t.image.width / t.image.height, h, 1);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 14, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = 6;
      obj.add(spr, beam);
      obj.userData.spin = spr;
    } else {
      obj = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.emoji[kind], alphaTest: 0.3 }));
      obj.center.set(0.5, 0);
      obj.scale.set(1.1, 1.1, 1);
    }
    obj.position.set(x, 0, z);
    this.scene.add(obj);
    this.items.push({ kind, obj, x, z, t: 0 });
  }

  dropPart(x, z) {
    const d = Math.hypot(x, z);
    if (d > ARENA - 4) { x *= (ARENA - 4) / d; z *= (ARENA - 4) / d; }
    this.addItem('part', x, z);
    this.ui.banner('PIÈCE TROUVÉE !', 'Va la ramasser');
  }

  updateBeans(dt) {
    const p = this.p, P = p.pos;
    const mag = p.magnet;
    for (const b of this.beans) {
      const dx = P.x - b.x, dz = P.z - b.z, d2 = dx * dx + dz * dz;
      if (!b.pull && d2 < mag * mag) b.pull = true;
      if (b.pull) {
        const d = Math.sqrt(d2) || 1;
        b.sp = Math.min(22, b.sp + dt * 40);
        b.x += dx / d * b.sp * dt; b.z += dz / d * b.sp * dt;
        if (d < 0.6) { b.got = true; this.gainXp(b.v); }
      }
    }
    if (this.beans.some((b) => b.got)) { this.beans = this.beans.filter((b) => !b.got); this.sfx.bean(); }
  }

  gainXp(v) {
    const p = this.p;
    p.xp += v;
    while (p.xp >= p.need) {
      p.xp -= p.need;
      p.lvl++;
      p.need = Math.floor(5 + (p.lvl - 1) * 3 + Math.pow(p.lvl - 1, 1.5));
      this.pendingLevels++;
    }
    if (this.pendingLevels > 0 && this.state === 'play') this.openLevelUp();
  }

  openLevelUp() {
    this.state = 'levelup';
    this.sfx.levelUp();
    this.particles.burst(this.p.pos.x, 1, this.p.pos.z, 0xffd23f, 24, 6, { life: 0.8, s0: 0.4, s1: 1 });
    this.ui.levelUp(this.p.lvl, this.offers(), (id) => {
      this.applyUpgrade(id);
      this.pendingLevels--;
      if (this.pendingLevels > 0) { this.state = 'play'; this.openLevelUp(); }
      else this.state = 'play';
    });
  }

  offers() {
    const p = this.p;
    const nW = Object.keys(p.weapons).length;
    const pool = [];
    for (const [id, U] of Object.entries(UPGRADES)) {
      const cur = U.w ? (p.weapons[id]?.lvl || 0) : (p.passives[id] || 0);
      if (cur >= U.max) continue;
      if (U.w && !cur && nW >= 4) continue;
      pool.push({ id, ...U, next: cur + 1, weight: U.w ? (cur ? 3 : 2.2) : 1.4 });
    }
    const out = [];
    while (out.length < 3 && pool.length) {
      let sum = pool.reduce((a, o) => a + o.weight, 0), r = Math.random() * sum;
      let i = 0;
      for (; i < pool.length - 1; i++) { r -= pool[i].weight; if (r <= 0) break; }
      out.push(pool.splice(i, 1)[0]);
    }
    if (out.length < 3 || p.hp < p.maxHp * 0.5) {
      if (out.length >= 3) out.pop();
      out.push({ ...HEAL_CARD, next: 0 });
    }
    return out.map((o) => ({ id: o.id, icon: o.icon, img: o.img, name: o.name, lvl: o.next, desc: o.desc(o.next) }));
  }

  applyUpgrade(id) {
    const p = this.p;
    if (id === 'heal') { p.hp = Math.min(p.maxHp, p.hp + 50); }
    else if (UPGRADES[id].w) {
      if (p.weapons[id]) p.weapons[id].lvl++;
      else p.weapons[id] = { lvl: 1, t: 0.5 };
    } else {
      p.passives[id] = (p.passives[id] || 0) + 1;
      if (id === 'speed') p.speed *= 1.1;
      if (id === 'rate') p.cdMul *= 0.9;
      if (id === 'power') p.dmgMul *= 1.15;
      if (id === 'helmet') { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 40); }
      if (id === 'magnet') p.magnet *= 1.45;
      if (id === 'shield' && p.passives.shield === 1) p.shieldReady = true;
    }
    if (p.hp > p.maxHp * 0.3) this.lowWarned = false;
    this.ui.setWeapons(p);
  }

  updateItems(dt) {
    const P = this.p.pos;
    for (const it of this.items) {
      it.t += dt;
      if (it.kind === 'part') {
        it.obj.userData.spin.material.rotation = Math.sin(it.t * 2) * 0.15;
        it.obj.userData.spin.position.y = 0.6 + Math.sin(it.t * 3) * 0.25;
        if (Math.random() < dt * 8) this.particles.emit(it.x + (Math.random() - 0.5) * 2, 0.2, it.z + (Math.random() - 0.5) * 2, 0xfff2a0, { vy: 2, life: 1, s0: 0.2, s1: 0.5 });
      } else {
        it.obj.position.y = 0.2 + Math.abs(Math.sin(it.t * 4)) * 0.3;
      }
      if ((it.x - P.x) ** 2 + (it.z - P.z) ** 2 < (it.kind === 'part' ? 2.2 : 1.2) && this.state === 'play') {
        it.got = true;
        this.scene.remove(it.obj);
        if (it.kind === 'food') { this.p.hp = Math.min(this.p.maxHp, this.p.hp + 30); this.sfx.pickup(); this.word(P.x, 2.4, P.z, 3); }
        if (it.kind === 'magnet') { for (const b of this.beans) b.pull = true; this.sfx.pickup(); }
        if (it.kind === 'part') this.winMission();
      }
    }
    if (this.items.some((i) => i.got)) this.items = this.items.filter((i) => !i.got);
  }

  winMission() {
    this.state = 'ending';
    this.endTimer = 0;
    this.bossPhase = 'done';
    this.sfx.victory();
    if (this.ship) this.ui.banner('LES RENFORTS SONT LÀ !', 'Construis ta base avec eux !');
    else this.ui.banner('MISSION RÉUSSIE !', MISSIONS[this.mission].part + ' récupéré' + (this.mission === 1 || this.mission === 3 ? 'e' : ''));
    for (const m of this.monsters) this.kill(m, false);
    for (const b of this.beans) b.pull = true;
    this.spits = [];
  }

  updateEndings(dt) {
    this.endTimer += dt;
    if (this.state === 'dead' && this.endTimer > 1.8) {
      this.state = 'over';
      this.ui.gameOver({ time: this.t, kills: this.kills, lvl: this.p.lvl, mission: this.mission, mode: this.mode });
    }
    if (this.state === 'ending') {
      if (Math.random() < dt * 6) this.particles.burst(this.camTarget.x + (Math.random() - 0.5) * 8, 3 + Math.random() * 3, this.camTarget.z + (Math.random() - 0.5) * 8, pick([0xffd23f, 0xff9ad5, 0x8ce0ff, 0xb8ff6a]), 10, 4, { life: 1, s0: 0.3, s1: 0.8 });
      if (this.endTimer > 2.8) {
        this.state = 'won';
        this.ui.victory({ time: this.t, kills: this.kills, lvl: this.p.lvl, mission: this.mission });
      }
    }
  }

  updateGeysers(dt) {
    for (const g of this.world.geysers) {
      if (g.state !== 'erupt') continue;
      g.tick -= dt;
      if (g.justErupted) g.tick = 0;
      if (g.tick > 0) continue;
      g.tick = 0.3;
      this.query(g.x, g.z, g.r + 1, (m) => {
        const dx = m.pos.x - g.x, dz = m.pos.z - g.z, d = Math.hypot(dx, dz);
        if (d < g.r) this.damage(m, 9 + this.mission * 3, dx / (d || 1), dz / (d || 1), 10);
      });
      const P = this.p.pos, dx = P.x - g.x, dz = P.z - g.z, d = Math.hypot(dx, dz);
      if (d < g.r * 0.8) { P.x += dx / (d || 1) * 0.5; P.z += dz / (d || 1) * 0.5; }
    }
  }

  updateFx(dt) {
    for (const b of this.booms) {
      if (b.life <= 0) continue;
      b.life -= dt;
      if (this.expTex) b.s.material.map = this.expTex[Math.min(7, Math.floor((1 - b.life / b.max) * 8))];
      else b.t.offset.x = Math.min(8, Math.floor((1 - b.life / b.max) * 9)) / 9;
      if (b.life <= 0) b.s.visible = false;
    }
    for (const w of this.words) {
      if (w.life <= 0) continue;
      w.life -= dt;
      const k = 1 - w.life / 0.9;
      w.s.position.y += dt * 1.5;
      const sc = (k < 0.15 ? k / 0.15 * 1.2 : 1.2 - (k - 0.15) * 0.3) * w.size;
      w.s.scale.set(sc * 2.67, sc, 1);
      w.s.material.opacity = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      if (w.life <= 0) w.s.visible = false;
    }
    for (const st of this.strikes) {
      st.t += dt;
      if (st.follow && st.follow.alive && st.t < 0.5) { st.x += (st.follow.pos.x - st.x) * dt * 3; st.z += (st.follow.pos.z - st.z) * dt * 3; st.ring.position.set(st.x, 0.08, st.z); }
      st.ring.rotation.y += dt * 2;
      st.ring.material.opacity = 0.5 + Math.sin(st.t * 20) * 0.5;
      if (!st.beam && st.t > 0.9) {
        st.beam = new THREE.Mesh(new THREE.CylinderGeometry(st.r * 0.55, st.r * 0.75, 40, 20, 1, true),
          new THREE.MeshBasicMaterial({ color: 0xfff7c2, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
        st.beam.position.set(st.x, 20, st.z);
        this.addFx('fx_5', st.x, 0, st.z, st.r * 2.2, 0.8, { cy: 0.1, fadeAt: 0.4 });
        st.beam.renderOrder = 7;
        this.scene.add(st.beam);
        this.explode(st.x, st.z, st.r, st.dmg, true);
      }
      if (st.beam) {
        const k = (st.t - 0.9) / 0.45;
        st.beam.material.opacity = Math.max(0, 0.85 * (1 - k));
        st.beam.scale.set(1 - k * 0.7, 1, 1 - k * 0.7);
        if (k >= 1) st.done = true;
      }
    }
    if (this.strikes.some((s) => s.done)) {
      this.strikes = this.strikes.filter((s) => {
        if (!s.done) return true;
        this.scene.remove(s.ring, s.beam);
        s.ring.material.dispose(); s.ring.geometry.dispose(); s.beam.material.dispose(); s.beam.geometry.dispose();
        return false;
      });
    }
  }

  word(x, y, z, idx, size = 1) {
    const w = this.words.find((o) => o.life <= 0);
    if (!w) return;
    w.s.material.map = this.wordTex[idx ?? Math.floor(Math.random() * 4)];
    w.s.visible = true;
    w.life = 0.9;
    w.size = size;
    w.s.position.set(x, y, z);
  }

  // ------------------------------------------------------------------ dessin
  drawPools() {
    const sh = this.shadows; sh.begin();
    if (this.state !== 'menu' && this.mode !== 'base') { const P = this.p.pos; sh.push(P.x, 0.03, P.z, 1.8, 1, 1.2); }
    if (this.mode === 'base') this.rts.drawShadows(sh);
    for (const m of this.monsters) {
      if (m.spawn > 0.3) continue;
      const s = m.w * 0.85 * (m.fly ? 0.6 : 1);
      sh.push(m.pos.x, 0.03, m.pos.z, s, 1, s * 0.6);
    }
    for (const g of this.dogs) sh.push(g.x, 0.03, g.z, 1.2, 1, 0.7);
    for (const b of this.bombs) { const k = b.t / b.dur; sh.push(b.x0 + (b.x1 - b.x0) * k, 0.03, b.z0 + (b.z1 - b.z0) * k, 0.7, 1, 0.5); }
    sh.end();

    const G = this.beanPoolG, Y = this.beanPoolY;
    G.begin(); Y.begin();
    for (const b of this.beans) {
      const y = 0.35 + Math.sin(this.time * 4 + b.ph) * 0.1;
      (b.gold ? Y : G).push(b.x, y, b.z, 1, 1, 1, this.time * 2 + b.ph, 0, 1.2);
    }
    G.end(); Y.end();

    const gp = this.gasPool, bp = this.bulletBeanPool;
    gp.begin(); bp.begin();
    for (const s of this.shots) {
      if (s.kind === 'gas') gp.push(s.x, s.y, s.z, 1, 1, 1);
      else bp.push(s.x, s.y, s.z, 1, 1, 1, s.rot, s.rot * 0.7, 0);
    }
    gp.end(); bp.end();

    const sp = this.spitPool, vp = this.vomitPool; sp.begin(); vp.begin();
    for (const s of this.spits) (s.vomit ? vp : sp).push(s.x, 1, s.z, 1, 1, 1);
    sp.end(); vp.end();

    const bo = this.bombPool; bo.begin();
    if (!this.bombSpr) this.bombSpr = [];
    let ns = 0;
    for (const b of this.bombs) {
      const k = b.t / b.dur, x = b.x0 + (b.x1 - b.x0) * k, y = 1 + Math.sin(k * Math.PI) * 5, z = b.z0 + (b.z1 - b.z0) * k;
      const key = b.shell ? 'ti_7' : 'ti_3';
      if (!this.tex[key]) { bo.push(x, y, z, 1, 1, 1, k * 9, k * 7); continue; }
      let s = this.bombSpr[ns];
      if (!s) { s = this.bombSpr[ns] = new THREE.Sprite(); s.center.set(0.5, 0.5); this.scene.add(s); }
      ns++;
      if (!this.bombMats) this.bombMats = {};
      const M = this.bombMats[key] || (this.bombMats[key] = new THREE.SpriteMaterial({ map: this.tex[key], alphaTest: 0.4 }));
      s.material = M; s.visible = true;
      const w = b.shell ? 1.3 : 1.1;
      s.scale.set(w, w * this.tex[key].image.height / this.tex[key].image.width, 1);
      s.material.rotation = b.shell ? (k < 0.5 ? 0.6 : -0.6) : k * 9;
      s.position.set(x, y, z);
    }
    for (let i = ns; i < this.bombSpr.length; i++) this.bombSpr[i].visible = false;
    bo.end();
  }

  updateCamera(dt) {
    if (this.state !== 'menu' && this.mode !== 'base') {
      const P = this.p.pos;
      this.camTarget.x += (P.x - this.camTarget.x) * Math.min(1, dt * 7);
      this.camTarget.z += (P.z - this.camTarget.z) * Math.min(1, dt * 7);
    }
    this.shake = Math.max(0, this.shake - dt * 1.8);
    const s = this.shake * this.shake * 0.9;
    const ox = (Math.random() - 0.5) * s, oz = (Math.random() - 0.5) * s;
    const c = this.camera;
    c.position.set(this.camTarget.x + ox + ISO.x * 80, ISO.y * 80, this.camTarget.z + oz + ISO.z * 80);
    c.lookAt(this.camTarget.x + ox, 0, this.camTarget.z + oz);
  }

  updateHud() {
    if (this.state === 'menu') return;
    if (this.mode === 'base') { this.ui.rtsHud(this.rts); return; }
    const p = this.p;
    const left = Math.max(0, this.mTime - this.t);
    let timer;
    if (this.bossPhase === 'none') timer = (MISSIONS[this.mission].ship ? '🛸 ' : '') + `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    else if (this.bossPhase === 'fight') timer = '⚠️';
    else if (this.bossPhase === 'ship') timer = '🛸';
    else timer = '🚀';
    this.ui.hudValues(p.hp / p.maxHp, p.xp / p.need, p.lvl, timer, this.kills, p.skillCd || 0);
    // flèche vers le gardien ou la pièce si on ne les voit pas
    let target = null;
    const part = this.items.find((i) => i.kind === 'part');
    if (part) target = part;
    else if (this.boss && this.boss.alive) target = this.boss.pos;
    else if (this.ship && this.ship.state !== 'away') target = this.ship;
    if (target && this.state === 'play') {
      const v = new THREE.Vector3(target.x, 1, target.z).project(this.camera);
      if (Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95) this.ui.pointer(v.x, v.y);
      else this.ui.pointer(null);
    } else this.ui.pointer(null);
  }

  // retourne la caméra pour un écran (taille du jeu en pixels)
  setZoom(z) { this.zoom = Math.max(0.6, Math.min(2.2, z)); if (this.vw) this.resize(this.vw, this.vh); }

  resize(w, h) {
    this.vw = w; this.vh = h;
    const A = (24 * this.zoom) ** 2, aspect = w / h;
    let vw = Math.sqrt(A * aspect), vh = Math.sqrt(A / aspect);
    const minDim = 17 * this.zoom;
    if (vw < minDim) { const k = minDim / vw; vw *= k; vh *= k; }
    if (vh < minDim) { const k = minDim / vh; vw *= k; vh *= k; }
    const c = this.camera;
    c.left = -vw / 2; c.right = vw / 2; c.top = vh / 2; c.bottom = -vh / 2;
    c.updateProjectionMatrix();
  }
}


// Le tutoriel guidé de la première base : une étape à la fois, le Sergent explique,
// le bon bouton clignote et chaque étape réussie rapporte des haricots.
// Les nids dorment jusqu'à l'étape de défense. Ensuite, le joueur se débrouille.
import * as THREE from 'three';
import { canvasTex } from '../engine/gfx.js';

const KEY = 'ls_tuto_base';
export const tutoDone = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
const markDone = () => { try { localStorage.setItem(KEY, '1'); } catch (e) { /* rien */ } };

const count = (r, type) => r.buildings.filter((b) => b.type === type).length;
// le bouton à faire clignoter pour construire un bâtiment
const buildBtn = (r, type) => {
  if (r.place && r.place.type === type) return r.place.pending ? 'ok' : null; // le fantôme est posé : il reste ✔
  return r.tab !== 'build' ? 'tab:build' : 'build:' + type;
};

// l'endroit à toucher sur la carte (quand le bâtiment est choisi et pas encore posé)
const groundSpot = (r, type) => {
  const pl = r.place;
  if (!pl || pl.type !== type || pl.pending) return null;
  if (type === 'gate') {
    // la porte se pose sur un sac du mur : le plus proche du vaisseau
    let best = null, bd = 1e9;
    for (const b of r.buildings) if (b.type === 'wall') { const d = (b.x - r.hq.x) ** 2 + (b.z - r.hq.z) ** 2; if (d < bd) { bd = d; best = b; } }
    return best ? { x: best.x, z: best.z } : null;
  }
  return { x: r.cellX(pl.ix, type), z: r.cellX(pl.iz, type), big: r.cellX(0, type) !== r.cellX(0, 'wall') };
};

const STEPS = [
  { face: 'sg1', wait: 6, text: 'Bienvenue, chef ! Je vais t’apprendre à construire la base. Les monstres dorment encore : on a le temps !' },
  { face: 'sg2', reward: 200, spot: (r) => groundSpot(r, 'farm'), target: (r) => buildBtn(r, 'farm'), done: (r) => count(r, 'farm') >= 1,
    text: 'D’abord, des haricots ! Touche <b>Construire</b>, puis <b>Champ de haricots</b>, touche le sol près du vaisseau, puis <b>✔</b>.' },
  { face: 'sg3', reward: 250, spot: (r) => groundSpot(r, 'turret'), target: (r) => buildBtn(r, 'turret'), done: (r) => count(r, 'turret') >= 2,
    text: 'Les monstres attaqueront le vaisseau. Pose <b>2 Tourelles à prout</b> tout autour.' },
  { face: 'sg5', reward: 150, spot: (r) => groundSpot(r, 'wall'), target: (r) => buildBtn(r, 'wall'), done: (r) => count(r, 'wall') + count(r, 'gate') >= 6,
    text: 'Fais une barrière : touche <b>Mur de sacs</b>, puis <b>glisse le doigt</b> pour tracer une ligne d’au moins 6 sacs, puis <b>✔</b>.' },
  { face: 'sg2', reward: 100, spot: (r) => groundSpot(r, 'gate'), target: (r) => buildBtn(r, 'gate'), done: (r) => count(r, 'gate') >= 1,
    text: 'Tes soldats doivent pouvoir sortir : pose une <b>Porte fortifiée</b> directement sur ton mur.' },
  { face: 'sg5', reward: 200, spot: (r) => groundSpot(r, 'barracks'), target: (r) => buildBtn(r, 'barracks'), done: (r) => r.buildings.some((b) => b.type === 'barracks' && b.built >= 1),
    text: 'Construis une <b>Caserne</b> : c’est là qu’on entraîne les soldats. Attends qu’elle soit finie !' },
  { face: 'sg4', reward: 150, target: (r) => (r.tab !== 'army' ? 'tab:army' : 'train:soldier'), done: (r) => (r.trainedN || 0) >= 1,
    text: 'La caserne est prête ! Touche <b>Armée</b>, puis <b>Escouade</b> : 3 nouveaux soldats vont en sortir.' },
  { face: 'sg5', wake: true, done: (r, T) => r.g.kills - T.k0 >= 6 || T.t > 50,
    text: 'ALERTE ! Les nids se réveillent ! Tes tourelles et tes soldats vont défendre la base. Tiens bon, chef !' },
  { face: 'sg1', reward: 300, target: () => 'attack', done: (r) => r.nests.some((n) => n.hp <= 0),
    text: 'À nous d’attaquer ! Appuie sur <b>À l’attaque !</b> : toute ton armée part détruire un nid de monstres.' },
  { face: 'sg7', wait: 9, last: true,
    text: 'BRAVO, CHEF ! Tu sais tout ! Astuce : agrandis la base vers un geyser vert et pose une <b>Pompe à gaz</b>, c’est le trésor ! Maintenant, détruis les autres nids !' },
];

export class Tuto {
  constructor(rts) {
    this.r = rts;
    this.i = -1;
    this.active = true;
    // les nids dorment pendant le tuto (jusqu'à l'étape de défense)
    rts.calmT = 1e9; rts.waveT = 1e9;
    // la grosse flèche jaune qui saute et le cercle qui pulse, posés sur le sol
    const arrowTex = canvasTex(128, 160, (c) => {
      c.fillStyle = '#ffd23f'; c.strokeStyle = '#3a2412'; c.lineWidth = 8; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(40, 8); c.lineTo(88, 8); c.lineTo(88, 82); c.lineTo(118, 82); c.lineTo(64, 150); c.lineTo(10, 82); c.lineTo(40, 82); c.closePath();
      c.fill(); c.stroke();
    });
    this.arrow = new THREE.Sprite(new THREE.SpriteMaterial({ map: arrowTex, depthTest: false, transparent: true }));
    this.arrow.center.set(0.5, 0); this.arrow.scale.set(2.6, 3.25, 1); this.arrow.renderOrder = 20;
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, depthTest: false }));
    this.ring.renderOrder = 19;
    this.arrow.visible = this.ring.visible = false;
    rts.scene.add(this.arrow, this.ring);
    this.next();
  }

  next() {
    const r = this.r, g = r.g;
    this.i++;
    if (this.i >= STEPS.length) { this.finish(); return; }
    const S = STEPS[this.i];
    this.t = 0;
    this.k0 = g.kills;
    if (S.wake) this.wake();
    g.ui.tuto(S, this.i, STEPS.length);
    g.sfx.radio();
  }

  wake() {
    const r = this.r;
    r.calmT = r.t; r.waveT = 100;
  }

  update(dt) {
    if (!this.active) return;
    const r = this.r, g = r.g, S = STEPS[this.i];
    this.t += dt;
    const ok = S.wait ? this.t >= S.wait : S.done(r, this);
    if (ok && this.t > 1.2) {
      if (S.reward) {
        r.money += S.reward;
        g.ui.banner('BRAVO !', `+${S.reward} haricots`);
        g.sfx.levelUp();
      }
      this.next();
      return;
    }
    g.ui.tutoTarget(S.target ? S.target(r) : null);
    // l'endroit à toucher sur la carte clignote
    const p = S.spot && S.spot(r);
    this.arrow.visible = this.ring.visible = !!p;
    if (p) {
      const k = (Math.sin(g.time * 7) + 1) / 2;
      this.arrow.position.set(p.x, 2.2 + k * 1.3, p.z);
      this.ring.position.set(p.x, 0.12, p.z);
      const s = (1.3 + k * 1.1) * (p.big ? 1.8 : 1); this.ring.scale.set(s, 1, s);
      this.ring.material.opacity = 0.45 + 0.55 * (1 - k);
    }
  }

  // « Passer » : on arrête le tuto, les nids se réveillent
  skip() { if (this.r.calmT > this.r.t + 60) { this.r.calmT = this.r.t + 20; this.r.waveT = 120; } this.finish(); }

  finish() {
    this.active = false;
    if (this.arrow) { this.r.scene.remove(this.arrow, this.ring); this.arrow = null; }
    markDone();
    this.r.g.ui.tuto(null);
    this.r.g.ui.tutoTarget(null);
  }
}

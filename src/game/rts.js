// Le mode « base et armée » à la Command & Conquer : on construit autour de la fusée,
// on récolte des haricots, on fabrique une armée et on détruit les nids de monstres.
import * as THREE from 'three';
import { toon, toonMat, InstPool, spriteMats, outlineGeo, outlineMat, canvasTex } from '../engine/gfx.js';
import { ARENA } from '../world/world.js';
import { mergeGeometries } from '../../lib/BufferGeometryUtils.js';
import { Trooper } from '../entities/hero3d.js';
import { Tuto, tutoDone } from './tuto.js';
import { dir8, DOG8, REC8 } from '../engine/gfx.js';

const CS = 2, OFF = 60, N = 60;                  // cases de 2 m, de -60 à +60
const cellOf = (v) => Math.max(0, Math.min(N - 1, Math.floor((v + OFF) / CS)));
const ctr = (i) => i * CS - OFF + CS / 2;        // milieu d'une case
const RIGHT = new THREE.Vector3(1, 0, -1).normalize();
const HQ_POS = { x: -3.5, z: -5.5 };

const O = (n) => `assets/objets/obj_${n}.webp`;
const Bt = (n) => `assets/icones2/ic_${n}.webp`;
export const BUILDINGS = {
  wall: { name: 'Mur de sacs', icon: '🧱', img: Bt(1), cost: 25, size: 1, hp: 260, time: 1.2, desc: 'Bloque les monstres' },
  gate: { name: 'Porte fortifiée', icon: '🚧', cost: 60, size: 1, hp: 700, time: 2, desc: 'Tes soldats passent, pas les monstres (se pose aussi sur un mur)' },
  turret: { name: 'Tourelle à prout', img: Bt(2), cost: 150, size: 1, hp: 170, time: 4, range: 9, dmg: 9, cd: 0.55, desc: 'Tire du gaz' },
  farm: { name: 'Champ de haricots', img: Bt(3), cost: 200, size: 2, hp: 220, time: 5, income: 2.5, desc: '+haricots' },
  barracks: { name: 'Caserne', icon: '⛺', img: Bt(4), cost: 300, size: 2, hp: 420, time: 7, desc: 'Soldats et chiens' },
  radio: { name: 'Tour radio', img: Bt(5), cost: 300, size: 1, hp: 180, time: 6, desc: 'Pouvoirs plus rapides, voit loin' },
  medic: { name: 'Tente médicale', img: Bt(6), cost: 200, size: 1, hp: 160, time: 5, range: 7, desc: 'Soigne les soldats' },
  mortar: { name: 'Lance-bombes', img: Bt(7), cost: 250, size: 1, hp: 170, time: 6, range: 15, min: 3.5, dmg: 32, cd: 2.6, need: 3, desc: 'Bombes de loin' },
  fan: { name: 'Ventilateur géant', icon: '🌀', img: Bt(8), cost: 120, size: 1, hp: 150, time: 4, range: 6, need: 3, desc: 'Ralentit les monstres' },
  pump: { name: 'Pompe à gaz', icon: '⛽', img: Bt(9), cost: 250, size: 1, hp: 200, time: 5, income: 6, geyser: true, desc: 'Sur un geyser : le trésor !' },
  garage: { name: 'Garage', icon: '🏭', img: Bt(10), cost: 500, size: 2, hp: 520, time: 9, need: 3, desc: 'Chars à prout' },
};
// Les pouvoirs de la Flotte (comme dans Starship Troopers) : on touche le bouton, puis l'endroit sur la carte
export const POWERS = {
  drop: { name: 'Renforts', icon: '🛸', img: 'assets/icones/ico_1.webp', cd: 40, cost: 150, r: 3, hint: 'touche l’endroit où le vaisseau dépose une escouade' },
  strike: { name: 'Frappe orbitale', icon: '☄️', img: 'assets/icones/ico_2.webp', cd: 35, cost: 0, r: 5.5, hint: 'touche l’endroit à bombarder' },
  heal: { name: 'Soins', icon: '🩹', img: 'assets/icones/ico_3.webp', cd: 30, cost: 0, r: 8, hint: 'touche l’endroit à soigner' },
  mega: { name: 'Méga-Prout de Lucas', icon: '💨', img: 'assets/icones/ico_4.webp', cd: 25, cost: 0, r: 6.5, instant: true, hint: '' },
};

export const UNITS = {
  soldier: { name: 'Escouade (3 soldats)', img: 'assets/icones/ico_5.webp', cost: 250, squad: 3, hp: 70, speed: 4.6, range: 7.5, dmg: 8, cd: 0.7, from: 'barracks', time: 6, r: 0.5 },
  dog: { name: 'Chien renifleur', img: 'assets/chien8/dog_2.webp', cost: 70, hp: 55, speed: 7.5, range: 1.4, dmg: 14, cd: 0.6, from: 'barracks', time: 3, r: 0.5 },
  tank: { name: 'Char à prout', icon: '🛡️', img: Bt(11), cost: 350, hp: 320, speed: 3.3, range: 10, dmg: 30, cd: 2.1, splash: 2.4, from: 'garage', time: 8, need: 3, r: 1.1 },
  harvester: { name: 'Récolteur', icon: '🚚', img: Bt(12), cost: 150, hp: 160, speed: 4.2, from: 'hq', time: 5, r: 0.9 },
  lucas: { name: 'Lucas', hero: true, cost: 0, hp: 260, speed: 5.6, range: 8.5, dmg: 13, cd: 0.45, from: 'hq', time: 0, r: 0.6 },
};

// ---------- petite file de priorité (pour les chemins) ----------
class Heap {
  constructor() { this.k = []; this.v = []; }
  push(key, val) {
    const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val);
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= k[i]) break; [k[p], k[i]] = [k[i], k[p]]; [v[p], v[i]] = [v[i], v[p]]; i = p; }
  }
  pop() {
    const k = this.k, v = this.v, top = v[0], last = k.length - 1;
    k[0] = k[last]; v[0] = v[last]; k.pop(); v.pop();
    let i = 0;
    for (;;) {
      const l = 2 * i + 1, r = l + 1; let m = i;
      if (l < k.length && k[l] < k[m]) m = l;
      if (r < k.length && k[r] < k[m]) m = r;
      if (m === i) break;
      [k[m], k[i]] = [k[i], k[m]]; [v[m], v[i]] = [v[i], v[m]]; i = m;
    }
    return top;
  }
  get size() { return this.k.length; }
}
const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

export class Rts {
  constructor(game) {
    this.g = game;
    this.scene = game.scene;
    this.active = false;
    this.buildings = []; this.units = []; this.nests = []; this.fields = [];
    this.sel = new Set(); this.selB = null; this.place = null;
    this.stat = new Uint8Array(N * N);
    this.occ = new Int32Array(N * N);
    this.flow = new Float32Array(N * N);
    this.swamp = new Uint8Array(N * N);
    this.gateCell = new Uint8Array(N * N); // les cases des portes : les soldats passent
    this.staticColliders = game.colliders.slice();
    const tex = game.tex;
    this.soldierF = [1, 2, 8].map((i) => spriteMats(tex['lucas_' + i], tex.meta['lucas_' + i]));
    // les dessins de la base (planches Gemini) : bâtiments, véhicules, nids, haricots
    this.sp = {};
    for (let i = 1; i <= 8; i++) { if (tex['tank_' + i]) this.sp['tank_' + i] = spriteMats(tex['tank_' + i]); if (i <= 6 && tex['niv_' + i]) this.sp['niv_' + i] = spriteMats(tex['niv_' + i]);
      for (const p of ['rec_', 'dog_', 'nid_', 'nv_']) if (tex[p + i]) this.sp[p + i] = spriteMats(tex[p + i], tex.meta[p + i]);
      this.sp['bat_' + i] = spriteMats(tex['bat_' + i]); this.sp['veh_' + i] = spriteMats(tex['veh_' + i]); if (tex['bat2_' + i]) this.sp['bat2_' + i] = spriteMats(tex['bat2_' + i]); }

    // dessins en grand nombre : murs, haricots des champs, anneaux de sélection, barres de vie
    const bag = (x, y, z, ry, len = 0.42) => {
      const g = new THREE.CapsuleGeometry(0.34, len, 4, 8);
      g.rotateZ(Math.PI / 2); g.scale(1, 0.82, 1.3); g.rotateY(ry); g.translate(x, y, z);
      return g.toNonIndexed();
    };
    // le poteau : une petite pile carrée de sacs
    const postGeo = mergeGeometries([bag(0, 0.3, -0.36, 0), bag(0, 0.3, 0.36, 0), bag(-0.36, 0.84, 0, Math.PI / 2), bag(0.36, 0.84, 0, Math.PI / 2), bag(0, 1.36, 0, 0)]);
    postGeo.computeVertexNormals();
    // le tronçon : relie le milieu de deux cases (longueur 2, étiré pour les diagonales)
    const segGeo = mergeGeometries([bag(-0.5, 0.3, 0, 0), bag(0.5, 0.3, 0, 0), bag(0, 0.84, 0, 0, 0.8)]);
    segGeo.computeVertexNormals();
    const wallGeo = postGeo;
    this.postGeo = postGeo; this.segGeo = segGeo;
    const sand = toonMat(0xd9c38f);
    this.wallPool = new InstPool(this.scene, postGeo, sand, 300, true);
    this.wallLine = new InstPool(this.scene, outlineGeo(postGeo, 0.05), outlineMat, 300);
    this.segPool = new InstPool(this.scene, segGeo, sand, 600, true);
    this.segLine = new InstPool(this.scene, outlineGeo(segGeo, 0.05), outlineMat, 600);
    this.fieldPool = new InstPool(this.scene, new THREE.CapsuleGeometry(0.16, 0.26, 3, 8), toonMat(0x9cff3a, 0x4a9a10), 400);
    const ring = new THREE.RingGeometry(0.82, 1, 32).rotateX(-Math.PI / 2);
    this.ringPool = new InstPool(this.scene, ring, new THREE.MeshBasicMaterial({ color: 0x7dff4a, transparent: true, opacity: 0.9, depthWrite: false }), 200);
    this.ringPool.mesh.renderOrder = 2;
    const bar = new THREE.PlaneGeometry(1, 1);
    this.barBack = new InstPool(this.scene, bar, new THREE.MeshBasicMaterial({ color: 0x2a1020, depthTest: false }), 300);
    this.barFront = new InstPool(this.scene, bar, new THREE.MeshBasicMaterial({ color: 0x7dff4a, depthTest: false }), 300);
    this.barRed = new InstPool(this.scene, bar, new THREE.MeshBasicMaterial({ color: 0xff5a4e, depthTest: false }), 300);
    this.barBack.mesh.renderOrder = 20; this.barFront.mesh.renderOrder = 21; this.barRed.mesh.renderOrder = 21;

    // fantôme pour placer un bâtiment
    this.ghostMat = new THREE.MeshLambertMaterial({ color: 0x7dff4a, emissive: 0x1c5a10, transparent: true, opacity: 0.75, depthWrite: false });
    this.ghostWalls = new InstPool(this.scene, wallGeo, this.ghostMat, 30);
    this.ghostWallsBad = new InstPool(this.scene, wallGeo, new THREE.MeshLambertMaterial({ color: 0xff4a4a, emissive: 0x5a1010, transparent: true, opacity: 0.45, depthWrite: false }), 30);
    this.ghostWalls.mesh.renderOrder = this.ghostWallsBad.mesh.renderOrder = 3;
    this.ghostSegs = new InstPool(this.scene, segGeo, this.ghostMat, 40);
    this.ghostSegs.mesh.renderOrder = 3;
    // case déjà occupée : juste un carré rouge au sol (on continue de voir le mur qui est là)
    this.ghostBusy = new InstPool(this.scene, new THREE.PlaneGeometry(1.9, 1.9).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.45, depthWrite: false }), 30);
    this.ghostBusy.mesh.renderOrder = 2;
    this.ghostTile = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7dff4a, transparent: true, opacity: 0.35, depthWrite: false }));
    this.ghostTile.visible = false;
    this.ghost = this.ghostTile;
    this.zonePool = new InstPool(this.scene, new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x7dff4a, transparent: true, opacity: 0.13, depthWrite: false }), 120);
    this.zonePool.mesh.renderOrder = 1;
    this.ghostRange = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }));
    this.ghostRange.visible = false;
    this.scene.add(this.ghost, this.ghostRange);
    this.hpBar = new THREE.Euler();
    // brouillard de guerre : on ne voit que ce que voient ses soldats et ses bâtiments
    this.vis = new Uint8Array(N * N); this.seen = new Uint8Array(N * N);
    this.fogData = new Uint8Array(N * N * 4);
    for (let i = 0; i < N * N; i++) { this.fogData[i * 4] = 12; this.fogData[i * 4 + 1] = 6; this.fogData[i * 4 + 2] = 20; this.fogData[i * 4 + 3] = 235; }
    this.fogTex = new THREE.DataTexture(this.fogData, N, N, THREE.RGBAFormat);
    this.fogTex.magFilter = this.fogTex.minFilter = THREE.LinearFilter;
    this.fogTex.needsUpdate = true;
    const FH = 1.0; // hauteur du voile : on le décale pour qu'il tombe pile sur les cases du sol vues de la caméra
    this.fog = new THREE.Mesh(new THREE.PlaneGeometry(N * CS, N * CS).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: this.fogTex, transparent: true, depthWrite: false, depthTest: false }));
    this.fog.position.set(FH / 1.3, FH, FH / 1.3);
    this.fog.renderOrder = 15;
    this.fog.visible = false;
    this.scene.add(this.fog);
    this.fogT = 0;
    // le rectangle de sélection et les vaisseaux de renfort
    this.drops = [];
    this.tap = null;
  }

  // ------------------------------------------------------------------ début / fin
  clear() {
    for (const d of this.drops || []) { this.scene.remove(d.obj); if (d.zone) this.scene.remove(d.zone); }
    for (const c of this.crates || []) this.scene.remove(c.obj);
    this.crates = [];
    this.drops = [];
    this.power = null;
    if (this.fog) this.fog.visible = false;
    if (this.shipOut) { this.scene.remove(this.shipOut.obj); this.shipOut = null; }
    for (const b of this.buildings) if (b.obj) this.scene.remove(b.obj);
    for (const u of this.units) this.scene.remove(u.obj);
    for (const n of this.nests) this.scene.remove(n.obj);
    for (const f of this.fields) { this.scene.remove(f.obj); if (f.pile) this.scene.remove(f.pile); }
    this.buildings = []; this.units = []; this.nests = []; this.fields = [];
    this.sel.clear(); this.selB = null; this.place = null;
    if (this.ghostObj) { this.scene.remove(this.ghostObj); this.ghostObj = null; }
    this.ghostTile.visible = this.ghostRange.visible = false;
    for (const p of [this.ghostWalls, this.ghostWallsBad, this.ghostBusy, this.ghostSegs, this.zonePool]) { p.begin(); p.end(); }
    this.g.colliders.length = 0;
    this.g.colliders.push(...this.staticColliders);
    for (const p of [this.wallPool, this.wallLine, this.segPool, this.segLine, this.fieldPool, this.ringPool, this.barBack, this.barFront, this.barRed]) { p.begin(); p.end(); }
    this.active = false;
  }

  start(mi, opts = {}) {
    this.clear();
    this.active = true;
    this.mi = mi;
    this.parts = this.g.parts || 0;
    this.money = 800 + this.g.diff.money;
    this.t = 0;
    this.waveN = 0;
    this.waveT = mi <= 1 ? 150 : 120;
    this.awake = false;
    this.calmT = mi <= 1 ? 60 : 35; // au début, les nids dorment : on a le temps de construire
    this.hintT = 0; this.hint = 0; this.gateTip = false; this.trainedN = 0;
    if (this.tuto) { this.tuto.finish && this.tuto.active && (this.tuto.active = false); if (this.tuto.arrow) { this.scene.remove(this.tuto.arrow, this.tuto.ring); } this.g.ui.tuto(null); this.g.ui.tutoTarget(null); }
    this.tuto = null;
    this.tab = 'build';
    this.uiDirty = true;
    this.nextId = 1;
    this.nextSquad = 1;
    this.byId = new Map();
    this.vis.fill(0); this.seen.fill(0); this.fog.visible = true; this.fogT = 0;
    this.pcd = { drop: 15, strike: 25, heal: 5, mega: 0 };
    this.power = null;
    this.occ.fill(0);
    // cases bloquées par le décor
    this.stat.fill(0); this.swamp.fill(0);
    for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
      const x = ctr(ix), z = ctr(iz), k = iz * N + ix;
      if (Math.hypot(x, z) > ARENA - 1.5) { this.stat[k] = 1; continue; }
      for (const c of this.staticColliders) {
        if (Math.hypot(c.x - HQ_POS.x, c.z - HQ_POS.z) < 4) continue; // la fusée = le QG
        if ((c.x - x) ** 2 + (c.z - z) ** 2 < (c.r + 0.7) ** 2) { this.stat[k] = 1; break; }
      }
      for (const s of this.g.world.swamps) if ((s.x - x) ** 2 + (s.z - z) ** 2 < s.r * s.r) this.swamp[k] = 1;
    }
    // le QG : la fusée de Lucas (plus solide à chaque pièce réparée)
    const hq = { type: 'hq', id: this.nextId++, x: HQ_POS.x, z: HQ_POS.z, r: 3, hp: 0, maxHp: (1200 + 250 * this.parts) * (this.g.diff.hq || 1), built: 1, cells: [], queue: [], prog: 0, h: 4, cd: 0 };
    hq.hp = hq.maxHp;
    for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
      const x = ctr(ix), z = ctr(iz);
      if ((x - hq.x) ** 2 + (z - hq.z) ** 2 < 3.2 * 3.2) { this.occ[iz * N + ix] = hq.id; hq.cells.push(iz * N + ix); }
    }
    this.hq = hq;
    this.byId.set(hq.id, hq);
    this.buildings.push(hq);

    // champs de haricots sauvages (on les récolte)
    const R = this.rand(11 + mi);
    for (let i = 0; i < 4; i++) {
      for (let tries = 0; tries < 80; tries++) {
        const a = (i / 4) * Math.PI * 2 + R() * 1.2, d = 13 + R() * 12;
        const x = HQ_POS.x + Math.cos(a) * d, z = HQ_POS.z + Math.sin(a) * d;
        if (!this.freeArea(x, z, 2.5)) continue;
        const beans = [];
        for (let k = 0; k < 26; k++) {
          const aa = R() * 6.28, dd = Math.sqrt(R()) * 2.2;
          beans.push([x + Math.cos(aa) * dd, z + Math.sin(aa) * dd, R() * 6, R() * 3]);
        }
        const glow = new THREE.Mesh(new THREE.CircleGeometry(2.8, 24), new THREE.MeshBasicMaterial({ color: 0x5fae2a, transparent: true, opacity: 0.45, depthWrite: false }));
        glow.rotation.x = -Math.PI / 2; glow.position.set(x, 0.04, z);
        this.scene.add(glow);
        const pile = new THREE.Sprite(this.sp.veh_7.L);
        pile.center.set(0.5, 0.15);
        pile.position.set(x + 1, 0, z + 1);
        this.scene.add(pile);
        this.fields.push({ x, z, amount: 1600, max: 1600, beans, obj: glow, pile });
        this.markStat(x, z, 0); // champ traversable
        break;
      }
    }
    // les nids de monstres, loin de la base
    const nN = mi <= 1 ? 3 : 5;
    const base = R() * 6.28;
    for (let i = 0; i < nN; i++) {
      for (let tries = 0; tries < 120; tries++) {
        const a = base + (i / nN) * Math.PI * 2 + (R() - 0.5) * 0.8, d = 34 + R() * 14;
        const x = HQ_POS.x + Math.cos(a) * d, z = HQ_POS.z + Math.sin(a) * d;
        if (Math.hypot(x, z) > ARENA - 5 || !this.freeArea(x, z, 2.2)) continue;
        const queen = i === nN - 1;
        this.addNest(x, z, (mi <= 1 ? 700 : 1000) * (queen ? 2 : 1) * this.g.diff.boss, queen);
        break;
      }
    }
    // au départ : Lucas, un récolteur et trois soldats (déposés par le vaisseau de la Flotte en mission 2)
    const L = this.g.lastShip && opts.fromShip ? this.g.lastShip : { x: HQ_POS.x + 6, z: HQ_POS.z + 6 };
    const lp = opts.lucasPos && Math.hypot(opts.lucasPos.x - HQ_POS.x, opts.lucasPos.z - HQ_POS.z) < 20 ? opts.lucasPos : { x: L.x - 2, z: L.z + 2 };
    this.lucas = this.addUnit('lucas', lp.x, lp.z);
    this.addUnit('harvester', L.x + 2.5, L.z - 1);
    const sq0 = this.nextSquad++;
    for (let i = 0; i < 3; i++) this.addUnit('soldier', L.x - 1.5 + i * 1.4, L.z + 2.2).squad = sq0;
    if (opts.fromShip) {
      const obj = this.g.makeDropship();
      obj.position.set(L.x, 2.4, L.z);
      this.scene.add(obj);
      this.shipOut = { obj, t: 0 };
    }
    this.flowDirty = true;
    this.g.camTarget.set(HQ_POS.x + 2, 0, HQ_POS.z + 3);
    this.g.setZoom(1.2);
    this.g.radio(opts.fromShip ? 'Mon équipe a reçu mon SOS ! On construit la base et on exploite le gaz !' : 'Soldat Lucas ! Agrandis la base, pompe le gaz et détruis les nids de monstres !', opts.fromShip ? 'lucas' : 1);
    if (mi === 1 && !tutoDone()) this.tuto = new Tuto(this);
  }

  rand(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  freeArea(x, z, r) {
    for (const c of this.staticColliders) if ((c.x - x) ** 2 + (c.z - z) ** 2 < (c.r + r) ** 2) return false;
    for (const s of this.g.world.swamps) if ((s.x - x) ** 2 + (s.z - z) ** 2 < (s.r + r) ** 2) return false;
    if ((x - HQ_POS.x) ** 2 + (z - HQ_POS.z) ** 2 < (r + 5) ** 2) return false;
    for (const f of this.fields) if ((f.x - x) ** 2 + (f.z - z) ** 2 < (r + 4) ** 2) return false;
    for (const n of this.nests) if ((n.x - x) ** 2 + (n.z - z) ** 2 < (r + 8) ** 2) return false;
    return true;
  }

  markStat(x, z, v) {
    const ix = cellOf(x), iz = cellOf(z);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const a = ix + dx, b = iz + dz;
      if (a >= 0 && b >= 0 && a < N && b < N && v === 0 && Math.hypot(ctr(a), ctr(b)) < ARENA - 1.5) this.stat[b * N + a] = 0;
    }
  }

  // ------------------------------------------------------------------ nids
  addNest(x, z, hp, queen = false) {
    const grp = new THREE.Group();
    const M = (queen && this.sp.bat2_5) || this.sp.veh_5, w = queen ? 7.5 : 6;
    const spr = new THREE.Sprite(M.L);
    spr.scale.set(w, w / M.aspect, 1);
    spr.center.set(0.5, 0.12);
    spr.position.set(1.2, 0, 1.2);
    grp.add(spr);
    const glow = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 20), new THREE.MeshBasicMaterial({ color: 0xb04bff }));
    glow.visible = false;
    grp.add(glow);
    grp.position.set(x, 0, z);
    this.scene.add(grp);
    const n = { kind: 'nest', queen, x, z, r: queen ? 3 : 2.4, hp, maxHp: hp, obj: grp, glow, spr, spawnT: 4 + Math.random() * 4, h: queen ? 2.8 : 2.2 };
    this.nests.push(n);
    this.g.colliders.push(n.col = { x, z, r: 2.1 });
  }

  // ------------------------------------------------------------------ unités
  addUnit(type, x, z) {
    const U = UNITS[type];
    let obj;
    let trooper = null;
    if ((type === 'soldier' || type === 'lucas') && this.g.tex.trooper) {
      trooper = new Trooper(this.g.tex.trooper, type === 'lucas' ? 2.6 : 1.9);
      obj = trooper.root;
    } else if (type === 'soldier') {
      obj = new THREE.Sprite(this.soldierF[0].L);
      obj.center.set(this.soldierF[0].ax, 0);
    } else if (type === 'dog') {
      obj = new THREE.Sprite(this.g.dogMats[0].L);
      obj.center.set(0.5, 0);
    } else {
      obj = new THREE.Sprite(this.sp[type === 'tank' ? 'veh_1' : 'veh_3'].L);
      obj.center.set(0.5, 0.08);
    }
    obj.position.set(x, 0, z);
    this.scene.add(obj);
    const u = { kind: 'unit', type, U, id: this.nextId++, x, z, r: U.r, hp: U.hp, maxHp: U.hp, obj, path: [], cd: 0, tgt: null, order: 'idle', home: { x, z },
      trooper, face: 1, walk: Math.random() * 6, fireT: 0, rot: 0, load: 0, state: 'toField', field: null, repath: 0, h: type === 'tank' ? 2.2 : 2 };
    this.units.push(u);
    this.byId.set(u.id, u);
    return u;
  }

  makeTank() {
    const grp = new THREE.Group();
    const body = toon(new THREE.BoxGeometry(1.7, 0.6, 2.3), 0x5e7d3a); body.position.y = 0.65; grp.add(body);
    for (const sx of [-1, 1]) {
      const tr = toon(new THREE.CapsuleGeometry(0.32, 1.9, 4, 10), 0x3b3530, { outline: 0.05 });
      tr.rotation.x = Math.PI / 2; tr.position.set(sx * 0.9, 0.35, 0); grp.add(tr);
    }
    const turret = new THREE.Group();
    const dome = toon(new THREE.SphereGeometry(0.62, 16, 10), 0x6f9444); dome.scale.y = 0.7; turret.add(dome);
    const tank = toon(new THREE.SphereGeometry(0.38, 14, 10), 0x9cff3a, { emissive: 0x3a7a10 }); tank.position.set(0, 0.45, -0.25); turret.add(tank);
    const barrel = toon(new THREE.CylinderGeometry(0.13, 0.13, 1.3, 10), 0x4c6a2c); barrel.rotation.x = Math.PI / 2; barrel.position.z = 0.8; turret.add(barrel);
    const funnel = toon(new THREE.ConeGeometry(0.32, 0.45, 12, 1, true), 0x9cff3a); funnel.rotation.x = -Math.PI / 2; funnel.position.z = 1.55; turret.add(funnel);
    turret.position.y = 1.05;
    grp.add(turret);
    grp.userData.turret = turret;
    return grp;
  }

  makeHarvester() {
    const grp = new THREE.Group();
    const chassis = toon(new THREE.BoxGeometry(1.3, 0.35, 2.2), 0x4a4a52); chassis.position.y = 0.45; grp.add(chassis);
    for (const [sx, sz] of [[-0.7, 0.7], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7]]) {
      const w = toon(new THREE.CylinderGeometry(0.32, 0.32, 0.25, 14), 0x2b2522, { outline: 0.04 });
      w.rotation.z = Math.PI / 2; w.position.set(sx, 0.32, sz); grp.add(w);
    }
    const cab = toon(new THREE.BoxGeometry(1.2, 0.8, 0.8), 0xffc61a); cab.position.set(0, 1.0, 0.65); grp.add(cab);
    const win = toon(new THREE.BoxGeometry(1.0, 0.35, 0.05), 0x6fd3ff, { outline: 0 }); win.position.set(0, 1.15, 1.06); grp.add(win);
    const bin = toon(new THREE.BoxGeometry(1.25, 0.7, 1.1), 0xffc61a); bin.position.set(0, 0.95, -0.5); grp.add(bin);
    const load = toon(new THREE.SphereGeometry(0.55, 12, 8), 0x9cff3a, { outline: 0.04, emissive: 0x3a7a10 });
    load.scale.set(1, 0.45, 0.9); load.position.set(0, 1.3, -0.5); grp.add(load);
    grp.userData.load = load;
    return grp;
  }

  // ------------------------------------------------------------------ bâtiments
  canAfford(cost) { return this.money >= cost; }
  unlocked(def) { return !def.need || this.mi >= def.need; }
  has(type) { return this.buildings.some((b) => b.type === type && b.built >= 1); }

  cellsFor(type, ix, iz) {
    const s = BUILDINGS[type].size, out = [];
    for (let dz = 0; dz < s; dz++) for (let dx = 0; dx < s; dx++) out.push([ix + dx, iz + dz]);
    return out;
  }

  cellX(i, type) { return ctr(i) + (BUILDINGS[type].size - 1) * CS / 2; }

  canPlace(type, ix, iz) {
    const B = BUILDINGS[type];
    const cells = this.cellsFor(type, ix, iz);
    const no = (why) => { this.why = why; return false; };
    for (const [a, b] of cells) {
      if (a < 0 || b < 0 || a >= N || b >= N) return no('Pas ici, c’est le bord de la carte !');
      const k = b * N + a;
      if (this.occ[k] && !(type === 'gate' && (this.byId.get(this.occ[k]) || {}).type === 'wall')) return no('Il y a déjà quelque chose ici !');
      if (this.stat[k]) return no('Pas ici : il y a un rocher ou un champignon !');
    }
    const cx = ctr(ix) + (B.size - 1) * CS / 2, cz = ctr(iz) + (B.size - 1) * CS / 2;
    for (const f of this.fields) if ((f.x - cx) ** 2 + (f.z - cz) ** 2 < 3.2 * 3.2) return no('Pas sur le champ de haricots, le récolteur en a besoin !');
    for (const n of this.nests) if ((n.x - cx) ** 2 + (n.z - cz) ** 2 < 6 * 6) return no('Trop près d’un nid de monstres !');
    if (B.geyser) {
      if (!this.g.world.geysers.some((gy) => (gy.x - cx) ** 2 + (gy.z - cz) ** 2 < 1.8 * 1.8)) return no('La pompe se pose sur un geyser de gaz vert !');
      if (this.buildings.some((b) => b.type === 'pump' && (b.x - cx) ** 2 + (b.z - cz) ** 2 < 4)) return no('Ce geyser a déjà sa pompe !');
    }
    // on construit près de la base (comme dans Command & Conquer) : la zone verte
    if (!this.buildings.some((b) => (b.x - cx) ** 2 + (b.z - cz) ** 2 < (b.type === 'hq' ? 13 : 8) ** 2 && b.built >= 1)) return no('Trop loin ! Construis dans la zone verte, près de la base.');
    this.why = '';
    return true;
  }

  build(type, ix, iz, rot = 0) {
    const B = BUILDINGS[type];
    if (!this.canPlace(type, ix, iz) || !this.canAfford(B.cost)) return false;
    this.money -= B.cost;
    if (type === 'gate') { const w = this.byId.get(this.occ[iz * N + ix]); if (w && w.type === 'wall') this.removeEnt(w); }
    const cx = ctr(ix) + (B.size - 1) * CS / 2, cz = ctr(iz) + (B.size - 1) * CS / 2;
    const b = { kind: 'building', type, B, id: this.nextId++, wrot: rot, x: cx, z: cz, r: B.size === 2 ? 1.9 : 1.05, hp: B.hp * 0.25, maxHp: B.hp, built: 0,
      cells: [], queue: [], prog: 0, cd: 0, rot: 0, h: B.size === 2 ? 3 : 2.2 };
    if (type === 'pump') { const gy = this.g.world.geysers.find((g) => (g.x - cx) ** 2 + (g.z - cz) ** 2 < 4); if (gy) gy.capped = true; }
    for (const [a, c] of this.cellsFor(type, ix, iz)) { const k = c * N + a; this.occ[k] = b.id; b.cells.push(k); if (type === 'gate') this.gateCell[k] = 1; }
    if (type !== 'wall') {
      b.obj = this.makeBuilding(type);
      b.obj.position.set(cx, 0, cz);
      b.obj.scale.y = 0.4;
      this.scene.add(b.obj);
    }
    if (type === 'wall') this.g.trophy.add('walls'); else if (type === 'turret') this.g.trophy.unlock('turret');
    b.col = { x: cx, z: cz, r: b.r, gate: type === 'gate' };
    this.g.colliders.push(b.col);
    this.buildings.push(b);
    this.byId.set(b.id, b);
    this.flowDirty = true;
    this.g.particles.burst(cx, 0.5, cz, 0xd9c38f, 10, 3, { life: 0.7, s0: 0.5, s1: 1.4 });
    this.g.sfx.build();
    this.uiDirty = true;
    return true;
  }

  makeGate(ghost = false) {
    const grp = new THREE.Group();
    if (!this.gateMats) {
      const stripes = canvasTex(64, 16, (c, w, h) => { c.fillStyle = '#ffd23f'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a1a10'; for (let x = -16; x < w; x += 16) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 8, 0); c.lineTo(x + 16, 0); c.lineTo(x + 8, h); c.fill(); } });
      this.gateMats = { bar: new THREE.MeshToonMaterial({ map: stripes }), post: toonMat(0xb89a5e), cap: toonMat(0x6b7a3a) };
    }
    const mk = (geo, mat) => { const m = new THREE.Mesh(geo, ghost ? mat.clone() : mat); if (ghost) { m.material.transparent = true; m.material.opacity = 0.7; } m.castShadow = !ghost; return m; };
    for (const s of [-1, 1]) {
      const post = mk(new THREE.CylinderGeometry(0.42, 0.5, 1.7, 10), this.gateMats.post); post.position.set(s * 0.85, 0.85, 0); grp.add(post);
      const cap = mk(new THREE.CylinderGeometry(0.48, 0.48, 0.22, 10), this.gateMats.cap); cap.position.set(s * 0.85, 1.75, 0); grp.add(cap);
    }
    const pivot = new THREE.Group(); pivot.position.set(-0.85, 1.25, 0); grp.add(pivot);
    const bar = mk(new THREE.BoxGeometry(1.75, 0.26, 0.26), this.gateMats.bar); bar.position.set(0.88, 0, 0); pivot.add(bar);
    grp.userData.pivot = pivot; grp.userData.gate = true;
    if (ghost) grp.userData.mat = bar.material;
    return grp;
  }

  makeBuilding(type, ghost = false) {
    if (type === 'gate') return this.makeGate(ghost);
    const grp = new THREE.Group();
    const B = BUILDINGS[type], M = this.sp[BSPR[type]];
    const mat = ghost ? new THREE.SpriteMaterial({ map: M.L.map, transparent: true, opacity: 0.75, depthWrite: false }) : M.L;
    const spr = new THREE.Sprite(mat);
    const w = B.size * CS * Math.SQRT2 * 1.06;          // largeur du losange de la case, vue d'en haut
    spr.scale.set(w, w / M.aspect, 1);
    spr.center.set(0.5, 0);
    const half = B.size * CS / 2;
    spr.position.set(half, 0, half);                    // le bas du dessin = le coin de la case côté caméra
    grp.add(spr);
    grp.userData.spr = spr;
    grp.userData.M = M;
    if (ghost) grp.userData.mat = mat;
    return grp;
  }

  removeEnt(e) {
    if (e.kind === 'unit') {
      this.scene.remove(e.obj);
      this.units = this.units.filter((u) => u !== e);
      this.sel.delete(e);
    } else {
      if (e.obj) this.scene.remove(e.obj);
      for (const k of e.cells) { this.occ[k] = 0; this.gateCell[k] = 0; }
      const i = this.g.colliders.indexOf(e.col); if (i >= 0) this.g.colliders.splice(i, 1);
      this.buildings = this.buildings.filter((b) => b !== e);
      if (this.selB === e) this.selB = null;
      if (e.type === 'pump') for (const gy of this.g.world.geysers) if ((gy.x - e.x) ** 2 + (gy.z - e.z) ** 2 < 4) gy.capped = false;
      this.flowDirty = true;
    }
    e.dead = true;
    this.byId.delete(e.id);
    this.uiDirty = true;
  }

  damageEnt(e, dmg) {
    if (e.dead) return;
    e.hp -= dmg * this.g.diff.dmg;
    e.hitT = 0.12;
    if (e.hp > 0) return;
    if (e.type === 'lucas') {
      // Lucas n'est jamais vaincu : il retourne au vaisseau reprendre des forces
      e.hp = e.maxHp * 0.6; e.x = this.hq.x + 3; e.z = this.hq.z + 4; e.path = []; e.order = 'idle'; e.tgt = null; e.vx = e.vz = 0;
      e.home = { x: e.x, z: e.z };
      this.g.radio('Ouille… je retourne au vaisseau reprendre des forces !', 'lucasSur');
      this.g.particles.burst(e.x, 1, e.z, 0x9cff3a, 16, 4, { life: 0.8, s0: 0.5, s1: 1.4 });
      return;
    }
    const g = this.g;
    g.particles.burst(e.x, 1, e.z, e.kind === 'unit' ? 0xd9c38f : 0x9a9aa6, e.kind === 'unit' ? 10 : 22, 5, { life: 0.8, s0: 0.6, s1: 1.8 });
    g.sfx.boom();
    if (e.type === 'hq') { this.lose(); return; }
    this.removeEnt(e);
    if (e.kind === 'building' && e.type !== 'wall') {
      g.radio('Un bâtiment est détruit ! Défends la base !', 3);
      g.addFx('bat2_8', e.x + e.r * 0.6, 0, e.z + e.r * 0.6, e.B.size === 2 ? 5 : 3.2, 12, { cy: 0.06, fadeAt: 0.75 });
    }
  }

  lose() {
    const g = this.g;
    g.shake = 1;
    g.p.dead = true;
    g.state = 'dead';
    g.endTimer = 0;
    g.sfx.sad();
    g.particles.burst(this.hq.x, 2, this.hq.z, 0x9a9aa6, 40, 8, { life: 1.4, s0: 1, s1: 3 });
  }

  // ------------------------------------------------------------------ chemins
  passable(k) { return !this.stat[k] && (!this.occ[k] || this.gateCell[k] === 1); }

  computeFlow() {
    // carte des distances jusqu'à la fusée : les monstres la suivent.
    // Un mur coûte cher à traverser : les monstres le contournent s'ils peuvent, sinon ils le cassent.
    const F = this.flow; F.fill(1e9);
    const h = new Heap();
    for (const k of this.hq.cells) { F[k] = 0; h.push(0, k); }
    while (h.size) {
      const k = h.pop();
      const ix = k % N, iz = (k / N) | 0, d0 = F[k];
      for (const [dx, dz, c] of NB) {
        const a = ix + dx, b = iz + dz;
        if (a < 0 || b < 0 || a >= N || b >= N) continue;
        const nk = b * N + a;
        if (this.stat[nk]) continue;
        if (dx && dz && (this.stat[iz * N + a] || this.stat[b * N + ix] || (this.occ[iz * N + a] && this.occ[b * N + ix]))) continue;
        let cost = c * (this.swamp[nk] ? 1.6 : 1);
        const o = this.occ[nk];
        if (o && o !== this.hq.id) cost += 9;
        const nd = d0 + cost;
        if (nd < F[nk]) { F[nk] = nd; h.push(nd, nk); }
      }
    }
    this.flowDirty = false;
  }

  findPath(x0, z0, x1, z1) {
    const sx = cellOf(x0), sz = cellOf(z0);
    let tx = cellOf(x1), tz = cellOf(z1);
    const tk0 = tz * N + tx;
    if (!this.passable(tk0)) {
      // case d'arrivée occupée : on vise la case libre la plus proche
      let best = null, bd = 1e9;
      for (let r = 1; r < 5 && !best; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        const a = tx + dx, b = tz + dz;
        if (a < 0 || b < 0 || a >= N || b >= N || !this.passable(b * N + a)) continue;
        const d = (ctr(a) - x0) ** 2 + (ctr(b) - z0) ** 2 + (dx * dx + dz * dz) * 20;
        if (d < bd) { bd = d; best = [a, b]; }
      }
      if (!best) return [{ x: x1, z: z1 }];
      [tx, tz] = best;
    }
    const tk = tz * N + tx, sk = sz * N + sx;
    if (tk === sk) return [{ x: x1, z: z1 }];
    const gS = new Map([[sk, 0]]), from = new Map();
    const h = new Heap();
    h.push(0, sk);
    let found = false, steps = 0;
    while (h.size && steps++ < 4000) {
      const k = h.pop();
      if (k === tk) { found = true; break; }
      const ix = k % N, iz = (k / N) | 0, g0 = gS.get(k);
      for (const [dx, dz, c] of NB) {
        const a = ix + dx, b = iz + dz;
        if (a < 0 || b < 0 || a >= N || b >= N) continue;
        const nk = b * N + a;
        if (!this.passable(nk) && nk !== tk) continue;
        if (dx && dz && (!this.passable(iz * N + a) || !this.passable(b * N + ix))) continue;
        const ng = g0 + c * (this.swamp[nk] ? 1.5 : 1);
        if (ng < (gS.get(nk) ?? 1e9)) {
          gS.set(nk, ng); from.set(nk, k);
          h.push(ng + Math.hypot(a - tx, b - tz), nk);
        }
      }
    }
    if (!found) return [{ x: x1, z: z1 }];
    const pts = [];
    let k = tk;
    while (k !== sk) { pts.push({ x: ctr(k % N), z: ctr((k / N) | 0) }); k = from.get(k); }
    pts.reverse();
    pts[pts.length - 1] = this.passable(tk0) ? { x: x1, z: z1 } : pts[pts.length - 1];
    // chemin lissé : on va en ligne droite vers le point le plus loin qu'on voit sans obstacle
    const out = [];
    let cur = { x: x0, z: z0 }, i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.clearLine(cur, pts[j], tk)) j--;
      out.push(pts[j]);
      cur = pts[j];
      i = j + 1;
    }
    return out;
  }

  // peut-on aller tout droit de a à b sans traverser une case bloquée ? (on vérifie aussi un peu sur les côtés)
  clearLine(a, b, tk) {
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    const n = Math.ceil(d / 0.5), px = -dz / (d || 1) * 0.6, pz = dx / (d || 1) * 0.6;
    for (let i = 1; i <= n; i++) {
      const x = a.x + dx * i / n, z = a.z + dz * i / n;
      for (const o of [0, 1, -1]) {
        const k = cellOf(z + pz * o) * N + cellOf(x + px * o);
        if (k !== tk && !this.passable(k) && k !== cellOf(a.z) * N + cellOf(a.x)) return false;
      }
    }
    return true;
  }

  moveUnit(u, x, z) { u.path = this.findPath(u.x, u.z, x, z); }

  // ------------------------------------------------------------------ monstres (appelé par le jeu)
  alive(t) { return t && (t.kind === 'nest' ? t.hp > 0 : (t.kind ? !t.dead : t.alive)); }

  monsterGoal(m, dt) {
    m.rtT = (m.rtT || 0) - dt;
    if (m.rtT <= 0 || (m.tgt && !this.alive(m.tgt))) {
      m.rtT = 0.4 + Math.random() * 0.3;
      m.tgt = null;
      let bd = 8 * 8;
      for (const u of this.units) { const d = (u.x - m.pos.x) ** 2 + (u.z - m.pos.z) ** 2; if (d < bd) { bd = d; m.tgt = u; } }
      for (const b of this.buildings) {
        if (b.type === 'wall' || b.type === 'gate') continue;
        const d = (b.x - m.pos.x) ** 2 + (b.z - m.pos.z) ** 2 - b.r * b.r;
        if (d < bd) { bd = d; m.tgt = b; }
      }
    }
    if (m.tgt) return { x: m.tgt.x, z: m.tgt.z, r: m.tgt.r, ent: m.tgt };
    if (m.fly) return { x: this.hq.x, z: this.hq.z, r: this.hq.r, ent: this.hq };
    const ix = cellOf(m.pos.x), iz = cellOf(m.pos.z), k = iz * N + ix;
    if (this.occ[k] === this.hq.id || this.flow[k] < 2.5) return { x: this.hq.x, z: this.hq.z, r: this.hq.r, ent: this.hq };
    let best = -1, bf = this.flow[k];
    for (const [dx, dz] of NB) {
      const a = ix + dx, b = iz + dz;
      if (a < 0 || b < 0 || a >= N || b >= N) continue;
      const nk = b * N + a;
      if (this.flow[nk] < bf) { bf = this.flow[nk]; best = nk; }
    }
    if (best < 0) return { x: this.hq.x, z: this.hq.z, r: this.hq.r, ent: this.hq };
    const o = this.occ[best];
    if (o) { const b = this.byId.get(o); if (b) return { x: b.x, z: b.z, r: b.r, ent: b }; }
    return { x: ctr(best % N), z: ctr((best / N) | 0), r: 0, ent: null };
  }

  monsterBite(m, ent, dt) {
    m.biteCd = (m.biteCd || 0) - dt;
    if (m.biteCd > 0) return;
    m.biteCd = 0.9;
    this.damageEnt(ent, m.dmg * 1.3);
    this.g.particles.emit(m.pos.x, 0.8, m.pos.z, 0xffffff, { life: 0.3, s0: 0.4, s1: 0.8 });
  }

  // dégâts de zone (gaz, explosion) ; slow = secondes de ralentissement
  areaDamage(x, z, r, dmg, slow) {
    for (const u of [...this.units]) if ((u.x - x) ** 2 + (u.z - z) ** 2 < (r + u.r) ** 2) { if (slow) u.slowT = Math.max(u.slowT || 0, slow); this.damageEnt(u, dmg); }
    for (const b of [...this.buildings]) if ((b.x - x) ** 2 + (b.z - z) ** 2 < (r + b.r) ** 2) this.damageEnt(b, dmg * 0.7);
  }

  spitHit(s) {
    for (const u of this.units) if ((u.x - s.x) ** 2 + (u.z - s.z) ** 2 < (u.r + 0.3) ** 2) { if (s.vomit) u.slowT = Math.max(u.slowT || 0, 2.5); this.damageEnt(u, 8); return true; }
    for (const b of this.buildings) if ((b.x - s.x) ** 2 + (b.z - s.z) ** 2 < (b.r + 0.3) ** 2) { this.damageEnt(b, 8); return true; }
    return false;
  }

  spitTarget(m) {
    const t = m.tgt && this.alive(m.tgt) ? m.tgt : null;
    return t;
  }

  // les tirs et les explosions touchent aussi les nids
  shotNest(s) {
    for (const n of this.nests) if (n.hp > 0 && (n.x - s.x) ** 2 + (n.z - s.z) ** 2 < (n.r + 0.3) ** 2) { this.hitNest(n, s.dmg); return true; }
    return false;
  }
  blastNests(x, z, r, dmg) {
    for (const n of this.nests) if (n.hp > 0 && (n.x - x) ** 2 + (n.z - z) ** 2 < (n.r + r) ** 2) this.hitNest(n, dmg);
  }
  hitNest(n, dmg) {
    n.hp -= dmg;
    n.hitT = 0.1;
    if (n.hp > 0) return;
    const g = this.g;
    this.scene.remove(n.obj);
    const i = g.colliders.indexOf(n.col); if (i >= 0) g.colliders.splice(i, 1);
    g.explode(n.x, n.z, 4, 60, true);
    g.particles.burst(n.x, 1, n.z, 0xb04bff, 40, 9, { life: 1.2, s0: 0.8, s1: 2.5 });
    this.money += 250;
    this.uiDirty = true;
    g.trophy.unlock('nest');
    const left = this.nests.filter((o) => o.hp > 0).length;
    if (left === 0) {
      g.ui.banner('NIDS DÉTRUITS !', 'La pièce du vaisseau était cachée dedans');
      g.winMission();
    } else {
      g.radio(`Nid détruit ! Plus que ${left} !`, 4);
      g.ui.banner('NID DÉTRUIT !', `Plus que ${left}`);
    }
  }

  // ------------------------------------------------------------------ boucle
  update(dt) {
    const g = this.g;
    this.t += dt;
    if (this.flowDirty) this.computeFlow();
    if (this.shipOut) {
      // le vaisseau de renfort repart après avoir déposé les soldats
      const S = this.shipOut; S.t += dt;
      if (S.t < 3) S.obj.position.y = 2.4 + Math.sin(S.t * 3) * 0.12;
      else { S.obj.position.y += dt * (2 + (S.t - 3) * 8); S.obj.rotation.z = Math.min(0.3, (S.t - 3) * 0.2); }
      if (Math.random() < dt * 25) this.g.particles.emit(S.obj.position.x + (Math.random() - 0.5) * 3, Math.max(0.3, S.obj.position.y - 1), S.obj.position.z + (Math.random() - 0.5) * 3, 0xffd27a, { vy: -3, life: 0.7, s0: 0.6, s1: 1.8, alpha: 0.6 });
      if (S.obj.position.y > 45) { this.scene.remove(S.obj); this.shipOut = null; }
    }
    if (g.state !== 'play') { this.draw(); return; }

    // revenus
    let inc = 0;
    for (const b of this.buildings) if (b.built >= 1 && b.B && b.B.income) inc += b.B.income * (1 + 0.5 * ((b.lvl || 1) - 1));
    this.money += inc * dt;
    this.income = inc;

    this.updateNests(dt);
    this.updateBuildings(dt);
    this.updateUnits(dt);
    this.updateDrops(dt);
    const radios = this.buildings.reduce((n, b) => n + (b.type === 'radio' && b.built >= 1 ? (b.lvl || 1) : 0), 0);
    for (const k in this.pcd) this.pcd[k] = Math.max(0, this.pcd[k] - dt * (1 + 0.5 * Math.min(3, radios)));
    this.fogT -= dt;
    if (this.fogT <= 0) { this.fogT = 0.2; this.updateFog(); }
    if (this.tuto && this.tuto.active) this.tuto.update(dt); else this.hints(dt);
    this.draw();
  }

  // ---------- brouillard de guerre ----------
  updateFog() {
    const V = this.vis, S = this.seen;
    V.fill(0);
    const reveal = (x, z, rad) => {
      const cx = cellOf(x), cz = cellOf(z), rc = Math.ceil(rad / CS), r2 = (rad / CS) ** 2;
      for (let dz = -rc; dz <= rc; dz++) for (let dx = -rc; dx <= rc; dx++) {
        if (dx * dx + dz * dz > r2) continue;
        const a = cx + dx, b = cz + dz;
        if (a >= 0 && b >= 0 && a < N && b < N) V[b * N + a] = 1;
      }
    };
    for (const u of this.units) reveal(u.x, u.z, u.type === 'lucas' ? 13 : 10);
    for (const b of this.buildings) reveal(b.x, b.z, b.type === 'hq' ? 16 : (b.type === 'radio' && b.built >= 1 ? 24 + 6 * ((b.lvl || 1) - 1) : 9));
    for (const d of this.drops) reveal(d.x, d.z, 8);
    const D = this.fogData;
    for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
      const k = iz * N + ix;
      if (V[k]) S[k] = 1;
      D[((N - 1 - iz) * N + ix) * 4 + 3] = V[k] ? 0 : (S[k] ? 140 : 235);
    }
    this.fogTex.needsUpdate = true;
    // les monstres cachés dans le brouillard sont invisibles, les nids apparaissent une fois découverts
    for (const m of this.g.monsters) m.sprite.visible = !!V[cellOf(m.pos.z) * N + cellOf(m.pos.x)];
    for (const n of this.nests) if (n.hp > 0) n.obj.visible = !!S[cellOf(n.z) * N + cellOf(n.x)];
  }
  seenAt(x, z) { return !!this.seen[cellOf(z) * N + cellOf(x)]; }
  visibleAt(x, z) { return !!this.vis[cellOf(z) * N + cellOf(x)]; }

  // ---------- pouvoirs de la Flotte ----------
  startPower(type) {
    const P = POWERS[type];
    if (this.pcd[type] > 0) { this.g.radio(`${P.name} : la Flotte se prépare, encore ${Math.ceil(this.pcd[type])} secondes !`, 2); return; }
    if (P.cost && this.money < P.cost) { this.g.radio('Pas assez de haricots pour appeler la Flotte !', 3); return; }
    this.cancelPlace();
    if (P.instant) {
      // la compétence de Lucas part tout de suite, autour de lui
      const L = this.lucas;
      if (!L || L.dead) return;
      this.pcd[type] = P.cd;
      this.g.trophy.unlock('mega');
      this.g.megaProut(L.x, L.z, 1.4);
      this.g.radio('MÉGA-PROUT DE LUCAS !!!', 'lucasCri');
      this.uiDirty = true;
      return;
    }
    this.power = type;
    this.sel.clear(); this.selB = null;
    this.uiDirty = true;
    this.g.sfx.radio();
  }
  cancelPower() { this.power = null; this.ghostRange.visible = false; this.uiDirty = true; }

  castPower(x, z) {
    const type = this.power, P = POWERS[type], g = this.g;
    if (!this.seenAt(x, z)) { g.radio('La Flotte ne voit rien là-bas ! Choisis un endroit déjà exploré.', 3); g.sfx.hurt(); return; }
    this.power = null;
    this.ghostRange.visible = false;
    this.pcd[type] = P.cd;
    this.money -= P.cost || 0;
    if (type === 'strike') {
      g.trophy.unlock('strike');
      g.addStrike(x, z, P.r, 180);
      g.radio('Ici la Flotte : frappe orbitale en approche ! Écartez-vous !', 'pilote');
    } else if (type === 'heal') {
      const t = g.tex.vais_5;
      const obj = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, alphaTest: 0.4, transparent: true }));
      obj.center.set(0.5, 0); obj.scale.set(2.4, 2.4 * t.image.height / t.image.width, 1);
      obj.position.set(x, 18, z);
      this.scene.add(obj);
      this.crates.push({ obj, x, z, t: 0 });
      g.radio('Ici la Flotte : une caisse de soins arrive en parachute !', 'pilote');
      this.uiDirty = true;
      return;
    } else if (type === 'drop') {
      const obj = this.g.makeDropship();
      obj.position.set(x, 30, z);
      this.scene.add(obj);
      this.drops.push({ obj, x, z, t: 0, state: 'down', zone: this.g.landingZone(x, z, 6) });
      g.radio('Ici la Flotte : une escouade arrive en renfort !', 'pilote');
      g.sfx.alarm();
    }
    this.uiDirty = true;
  }

  healAt(x, z) {
    const g = this.g, P = POWERS.heal;
    g.addFx('fx_6', x, 0, z, P.r * 1.2, 1.4, { rise: 1.2, grow: 1.2 });
      for (const e of [...this.units, ...this.buildings]) {
        if ((e.x - x) ** 2 + (e.z - z) ** 2 > P.r * P.r || e.built < 1) continue;
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.6);
        g.particles.emit(e.x, 1.5, e.z, 0x8cffd0, { vy: 2, life: 0.9, s0: 0.5, s1: 1.4 });
      }
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * P.r;
        g.particles.emit(x + Math.cos(a) * d, 0.3, z + Math.sin(a) * d, 0x8cffd0, { vy: 2.5, life: 1.2, s0: 0.3, s1: 1, alpha: 0.7 });
      }
      g.sfx.levelUp();
      g.radio('Les infirmiers de la Flotte ont soigné tout le monde !', 4);
  }

  updateDrops(dt) {
    const g = this.g;
    for (const c of this.crates) {
      c.t += dt;
      c.obj.position.y = Math.max(0, 18 - c.t * 9);
      c.obj.material.rotation = Math.sin(c.t * 3) * 0.12;
      if (c.obj.position.y <= 0 && !c.done) { c.done = true; this.healAt(c.x, c.z); }
      if (c.done) c.obj.material.opacity = Math.max(0, 1 - (c.t - 2) );
      if (c.t > 3.2) { this.scene.remove(c.obj); c.gone = true; }
    }
    if (this.crates.some((c) => c.gone)) this.crates = this.crates.filter((c) => !c.gone);
    for (const d of this.drops) {
      d.t += dt;
      const o = d.obj;
      if (d.state === 'down') {
        const k = Math.min(1, d.t / 3), e = 1 - (1 - k) ** 3;
        o.position.y = 30 - (30 - 2.4) * e;
        if (k >= 1) {
          d.state = 'wait'; d.t = 0;
          if (d.zone) { this.scene.remove(d.zone); d.zone = null; }
          const sq = this.nextSquad++;
          for (let i = 0; i < 4; i++) {
            const u = this.addUnit('soldier', d.x + (i % 2 ? 1 : -1) * 1.3, d.z + (i < 2 ? 1.6 : -1.6));
            u.squad = sq; g.pushOut(u, u.r);
          }
          g.shake = 0.3; g.sfx.boom();
          this.uiDirty = true;
        }
      } else if (d.state === 'wait') {
        o.position.y = 2.4 + Math.sin(d.t * 3) * 0.1;
        if (d.t > 2) { d.state = 'up'; d.t = 0; }
      } else {
        o.position.y += dt * (2 + d.t * 8);
        if (o.position.y > 45) { this.scene.remove(o); d.done = true; }
      }
      if (Math.random() < dt * 25) g.particles.emit(d.x + (Math.random() - 0.5) * 3, Math.max(0.3, o.position.y - 1), d.z + (Math.random() - 0.5) * 3, 0xffd27a, { vy: -3, life: 0.7, s0: 0.6, s1: 1.8, alpha: 0.6 });
    }
    if (this.drops.some((d) => d.done)) this.drops = this.drops.filter((d) => !d.done);
  }

  hints(dt) {
    this.hintT += dt;
    if (!this.gateTip && this.buildings.filter((b) => b.type === 'wall').length >= 4 && !this.buildings.some((b) => b.type === 'gate')) {
      this.gateTip = true;
      g_radio(this.g, 'Astuce : pose une Porte fortifiée sur ton mur, tes soldats pourront sortir ! Pour enlever un mur : touche-le, puis 💥 Démolir.', 'sg2');
    }
    const H = [
      [6, () => !this.has('farm'), 'Construis un Champ de haricots pour gagner plus de haricots !', 'sg2'],
      [14, () => !this.has('pump'), 'Les geysers verts, c’est le trésor de la planète ! Pose une Pompe à gaz dessus !', 'sg2'],
      [22, () => !this.buildings.some((b) => b.type === 'turret'), 'Mets des Tourelles à prout autour du vaisseau !', 'sg3'],
      [40, () => !this.has('barracks'), 'Construis une Caserne pour fabriquer des soldats !', 'sg5'],
      [120, () => !this.has('radio'), 'Une Tour radio rend les pouvoirs de la Flotte plus rapides et montre loin dans le brouillard !', 'sg6'],
      [150, () => this.buildings.some((b) => UPGRADE_COST[b.type] && (b.lvl || 1) === 1 && b.built >= 1), 'Astuce : touche un bâtiment puis ⬆ pour l’améliorer !', 'sg4'],
      [70, () => true, 'Quand ton armée est prête, appuie sur « ⚔️ À l’attaque ! » pour détruire un nid !', 'sg1'],
    ];
    if (this.mi >= 3) H.push([95, () => !this.has('garage'), 'Nouveau : le Garage fabrique des Chars à prout !', 1]);
    while (this.hint < H.length && this.hintT > H[this.hint][0]) {
      const [, cond, txt, face] = H[this.hint++];
      if (cond()) g_radio(this.g, txt, face);
    }
  }

  updateNests(dt) {
    const g = this.g;
    this.waveT -= dt;
    const alive = this.nests.filter((n) => n.hp > 0);
    const cap = g.ui.isMobile ? 90 : 120;
    if (!this.awake && this.t >= this.calmT) { this.awake = true; g.radio('Les nids se réveillent ! Des monstres arrivent, protège la base !', 'sg5'); }
    const types = () => {
      const r = Math.random(), t = this.t + this.mi * 25;
      if (t > 150 && r < 0.1) return 'tank';
      if (t > 70 && r < 0.22) return 'vomi';
      if (t > 45 && r < 0.36) return 'proute';
      if (t > 25 && r < 0.5) return 'crotte';
      if (t > 60 && r < 0.6) return 'flyer';
      if (r < 0.82) return 'grunt';
      return 'bug';
    };
    for (const n of alive) {
      if (!n.queen && this.sp.nid_1) {
        // 1 calme, 2 tremble, 3 lueur, 4 main, 5 tête, 6 saut ; puis 8 fumée (abîmé : fume tout le temps)
        n.outT = (n.outT || 0) - dt;
        let fi = n.hp < n.maxHp * 0.5 ? 8 : 1;
        if (n.spawnT < 1.1) fi = 2 + Math.min(4, Math.floor((1.1 - n.spawnT) / 1.1 * 5));
        else if (n.outT > 0) fi = 8;
        const F = this.sp['nid_' + fi], W1 = this.sp.nid_1, k = 7 / W1.w;
        n.spr.material = n.hitT > 0 ? F.fL : F.L;
        n.spr.center.set(F.ax, 0.12 * W1.h / F.h);
        n.spr.scale.set(F.w * k, F.h * k, 1);
      } else {
        const NM = n.queen ? (this.sp.bat2_5 || this.sp.veh_5) : (n.hp < n.maxHp * 0.5 ? this.sp.veh_6 : this.sp.veh_5);
        n.spr.material = n.hitT > 0 ? NM.fL : NM.L;
        if (NM === this.sp.veh_6 && n.spr.userData.k !== 6) { n.spr.userData.k = 6; n.spr.scale.set(6, 6 / NM.aspect, 1); }
      }
      n.hitT = (n.hitT || 0) - dt;
      if (this.t < this.calmT) continue;
      n.spawnT -= dt;
      if (n.spawnT <= 0) {
        // quelques monstres au début, de plus en plus ensuite
        n.spawnT = Math.max(6, 16 - (this.t - this.calmT) / 25) * (0.8 + Math.random() * 0.4) / g.diff.rate;
        n.outT = 0.9;
        if (g.monsters.length < cap) {
          const a = Math.random() * 6.28;
          g.spawnMonster(types(), n.x + Math.cos(a) * 2.8, n.z + Math.sin(a) * 2.8);
        }
      }
    }
    if (this.waveT <= 0 && alive.length) {
      this.waveN++;
      this.waveT = 75;
      g.radio(pick(['ALERTE ! Une grosse attaque arrive sur la base !', 'Les nids envoient une horde ! Aux postes de combat !']), 3);
      g.ui.banner('ATTAQUE !', `Vague ${this.waveN}`);
      g.sfx.alarm();
      for (const n of alive) {
        const cnt = Math.max(1, Math.round((2 + this.waveN * 2 + Math.floor(this.mi / 2)) * g.diff.rate));
        if (this.waveN >= 2 && (n.queen || Math.random() < 0.3)) this.spawnGuardian(n);
        for (let i = 0; i < cnt && g.monsters.length < cap + 30; i++) {
          const a = Math.random() * 6.28;
          g.spawnMonster(types(), n.x + Math.cos(a) * 3, n.z + Math.sin(a) * 3, { delay: Math.random() * 1.5 });
        }
      }
    }
  }

  // un gardien dessiné (gros monstre) part attaquer la base avec la vague
  spawnGuardian(n) {
    const g = this.g;
    const pairs = [['gar_1', 'gar_2', 'Gros Caillou Puant'], ['gar_3', 'gar_4', 'Crocodégoûtant'], ['gar_7', 'gar_8', 'Sa Majesté Caca d’Or']];
    const [w, d, name] = pairs[Math.floor(Math.random() * pairs.length)];
    if (!g.mats[w]) return;
    const W = g.mats[w], D = g.mats[d];
    const a = Math.random() * 6.28;
    g.spawnMonster('tank', n.x + Math.cos(a) * 3.5, n.z + Math.sin(a) * 3.5, { mats: W, anim: [W, W, W, D], h: 4.4, hp: 420 + this.mi * 120, speed: 1.9, r: 1.3 });
    g.radio(`Un gardien arrive avec la vague : ${name} ! Concentrez le tir !`, 3);
  }

  updateBuildings(dt) {
    const g = this.g;
    for (const b of this.buildings) {
      b.hitT = (b.hitT || 0) - dt;
      if (b.built < 1) {
        const before = b.built;
        b.built = Math.min(1, b.built + dt / b.B.time);
        b.hp = Math.min(b.maxHp, b.hp + (b.built - before) * b.maxHp * 0.75);
        if (b.obj && b.obj.userData.spr) {
          const S = this.sp.bat2_1, spr = b.obj.userData.spr;
          if (S && b.built < 0.85) { spr.material = S.L; spr.scale.set(spr.scale.x, spr.scale.x / S.aspect, 1); b.obj.scale.y = 1; }
          else { const M = b.obj.userData.M; spr.material = M.L; spr.scale.set(spr.scale.x, spr.scale.x / M.aspect, 1); b.obj.scale.y = 0.85 + 0.15 * b.built; }
        }
        if (Math.random() < dt * 6) g.particles.emit(b.x + (Math.random() - 0.5) * 2, 0.4, b.z + (Math.random() - 0.5) * 2, 0xd9c38f, { vy: 1, life: 0.6, s0: 0.4, s1: 1 });
        if (b.built >= 1) { g.sfx.pickup(); this.uiDirty = true; }
        continue;
      }
      // production d'unités
      if (b.queue.length) {
        b.prog += dt;
        const U = UNITS[b.queue[0]];
        if (b.prog >= U.time * (1 - 0.25 * ((b.lvl || 1) - 1))) {
          b.prog = 0;
          const type = b.queue.shift();
          const a = Math.random() * 6.28, sq = this.nextSquad++, n = (UNITS[type].squad || 1) + (UNITS[type].squad ? (b.lvl || 1) - 1 : 0);
          for (let i = 0; i < n; i++) {
            const u = this.addUnit(type, b.x + Math.cos(a) * (b.r + 1.2) + (i - (n - 1) / 2) * 1.2, b.z + Math.sin(a) * (b.r + 1.2));
            u.squad = sq;
            if (type === 'soldier') g.trophy.unlock('squad');
            g.pushOut(u, u.r);
            if (b.rally) this.moveUnit(u, b.rally.x, b.rally.z);
          }
          g.sfx.pickup();
          this.uiDirty = true;
        }
      }
      if (b.type === 'hq') {
        // en Facile, le vaisseau se répare tout seul petit à petit
        if (g.diff.hq > 1 && b.hp < b.maxHp) b.hp = Math.min(b.maxHp, b.hp + 5 * dt);
        // la fusée réparée a un canon à gaz
        b.cd -= dt;
        const m = b.cd <= 0 && g.nearest(b.x, b.z, 10);
        if (m) {
          b.cd = 0.45;
          const dx = m.pos.x - b.x, dz = m.pos.z - b.z, d = Math.hypot(dx, dz) || 1;
          g.shots.push({ kind: 'gas', x: b.x + dx / d * 2, z: b.z + dz / d * 2, y: 2, vx: dx / d * 18, vz: dz / d * 18, life: 0.75, dmg: 10, pierce: 1, hit: new Set() });
          g.sfx.shoot();
        }
        continue;
      }
      const B = b.B;
      if (!B) continue;
      if (b.obj && b.obj.userData.spr) {
        const lv = BLEVELS[b.type] && this.sp[BLEVELS[b.type][(b.lvl || 1) - 1]];
        const M = ((b.lvl || 1) === 1 && BDAMAGED[b.type] && b.hp < b.maxHp * 0.4 && this.sp[BDAMAGED[b.type]]) || lv || b.obj.userData.M;
        const spr = b.obj.userData.spr;
        spr.material = b.hitT > 0 ? (b.flip ? M.fR : M.fL) : (b.flip ? M.R : M.L);
        if (lv && spr.userData.asp !== M.aspect) { spr.userData.asp = M.aspect; spr.scale.y = spr.scale.x / M.aspect; }
        if (b.type === 'medic' && b.built >= 1) {
          // la tente médicale soigne doucement les soldats autour d'elle
          const L = b.lvl || 1, R = 7 + 2 * (L - 1);
          for (const u of this.units) if (u.hp < u.maxHp && (u.x - b.x) ** 2 + (u.z - b.z) ** 2 < R * R) { u.hp = Math.min(u.maxHp, u.hp + 6 * L * dt); if (Math.random() < dt * 2) g.particles.emit(u.x, 1.6, u.z, 0x8cffd0, { vy: 1, life: 0.6, s0: 0.3, s1: 0.7 }); }
        }
      }
      b.cd -= dt;
      if (b.type === 'turret') {
        const m = g.nearest(b.x, b.z, B.range + (b.lvl || 1) - 1);
        if (m) {
          b.flip = ((m.pos.x - b.x) * RIGHT.x + (m.pos.z - b.z) * RIGHT.z) < 0;
          if (b.cd <= 0) {
            const L = b.lvl || 1;
            b.cd = B.cd * (1 - 0.15 * (L - 1));
            const dx = m.pos.x - b.x, dz = m.pos.z - b.z, d = Math.hypot(dx, dz) || 1;
            for (let s = 0; s < L; s++) {
              const sp = (s - (L - 1) / 2) * 0.12, c = Math.cos(sp), sn = Math.sin(sp);
              const ux = (dx / d) * c - (dz / d) * sn, uz = (dx / d) * sn + (dz / d) * c;
              g.shots.push({ kind: 'gas', x: b.x + ux, z: b.z + uz, y: 1.1, vx: ux * 18, vz: uz * 18, life: (B.range + L - 1) / 18 + 0.15, dmg: B.dmg * (1 + 0.3 * (L - 1)), pierce: L - 1, hit: new Set() });
            }
            g.sfx.shoot();
          }
        }
      } else if (b.type === 'mortar') {
        if (b.cd <= 0) {
          let best = null, bc = 0;
          for (let i = 0; i < 8; i++) {
            const m = g.monsters[Math.floor(Math.random() * g.monsters.length)];
            if (!m || !m.alive || m.spawn > 0) continue;
            const d = Math.hypot(m.pos.x - b.x, m.pos.z - b.z);
            if (d > B.range || d < B.min) continue;
            let c = 0; g.query(m.pos.x, m.pos.z, 3, () => c++);
            if (c > bc) { bc = c; best = m; }
          }
          if (best) {
            const L = b.lvl || 1;
            b.cd = B.cd * (1 - 0.15 * (L - 1));
            g.bombs.push({ x0: b.x, z0: b.z, x1: best.pos.x, z1: best.pos.z, t: 0, dur: 1.0, r: 2.8 + 0.5 * (L - 1), dmg: B.dmg * (1 + 0.35 * (L - 1)), shell: true });
            g.sfx.fart(0.7, 0.2, 0.25);
          } else b.cd = 0.4;
        }
      } else if (b.type === 'fan') {
        if (b.cd <= 0) {
          b.cd = 0.2;
          g.query(b.x, b.z, B.range, (m) => {
            const dx = m.pos.x - b.x, dz = m.pos.z - b.z, d = Math.hypot(dx, dz);
            if (d < B.range) { m.slowT = 0.5; m.kbx += dx / (d || 1) * 0.6; m.kbz += dz / (d || 1) * 0.6; }
          });
        }
        if (Math.random() < dt * 10) {
          const a = Math.random() * 6.28;
          g.particles.emit(b.x, 1.5, b.z, 0xd8f4ff, { vx: Math.cos(a) * 5, vz: Math.sin(a) * 5, life: 0.8, s0: 0.3, s1: 1.2, alpha: 0.4 });
        }
      } else if (b.type === 'pump' && Math.random() < dt * 3) {
        g.particles.emit(b.x, 1.8, b.z, 0x9cff3a, { vy: 1.5, life: 1, s0: 0.3, s1: 0.9, alpha: 0.6 });
      }
    }
  }

  updateUnits(dt) {
    const g = this.g;
    for (const u of this.units) {
      u.cd -= dt; u.fireT -= dt; u.slowT = Math.max(0, (u.slowT || 0) - dt);
      if (u.slowT > 0 && Math.random() < dt * 6) this.g.particles.emit(u.x, 0.4, u.z, 0xe8d84a, { vy: 0.4, life: 0.5, s0: 0.3, s1: 0.7, alpha: 0.7 }); u.hitT = (u.hitT || 0) - dt; u.repath -= dt;
      if (u.type === 'harvester') this.harvesterAI(u, dt);
      else this.combatAI(u, dt);
      // avance sur le chemin, en douceur : on accélère, on freine et on tourne progressivement
      let wx = 0, wz = 0;
      const heavy = u.type === 'tank' || u.type === 'harvester';
      while (u.path.length) {
        const p = u.path[0], last = u.path.length === 1;
        const dx = p.x - u.x, dz = p.z - u.z, d = Math.hypot(dx, dz);
        if (d < (last ? 0.25 : (heavy ? 1.4 : 0.9))) { u.path.shift(); continue; } // on prend le virage avant le point
        const sp = u.U.speed * (this.swamp[cellOf(u.z) * N + cellOf(u.x)] ? 0.6 : 1) * (last ? Math.min(1, 0.35 + d / 2) : 1) * (u.slowT > 0 ? 0.5 : 1);
        wx = dx / d * sp; wz = dz / d * sp;
        break;
      }
      const acc = Math.min(1, dt * (heavy ? 3.5 : 9));
      u.vx = (u.vx || 0) + (wx - (u.vx || 0)) * acc;
      u.vz = (u.vz || 0) + (wz - (u.vz || 0)) * acc;
      if (!u.path.length && Math.hypot(u.vx, u.vz) < 0.3) u.vx = u.vz = 0;
      u.x += u.vx * dt; u.z += u.vz * dt;
      const vx = u.vx, vz = u.vz;
      const moving = Math.hypot(vx, vz) > 0.4;
      // les unités se poussent entre elles
      for (const o of this.units) {
        if (o === u) continue;
        const dx = u.x - o.x, dz = u.z - o.z, rr = (u.r + o.r) * 0.9, d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), push = (rr - d) * 0.5; u.x += dx / d * push; u.z += dz / d * push; }
      }
      g.pushOut(u, u.r * 0.9, true);
      const dc = Math.hypot(u.x, u.z);
      if (dc > ARENA - 1) { u.x *= (ARENA - 1) / dc; u.z *= (ARENA - 1) / dc; }
      if (moving) u.walk += dt * 12;
      this.drawUnit(u, moving, vx, vz, dt);
    }
  }

  combatAI(u, dt) {
    const g = this.g, U = u.U;
    // cible donnée par le joueur
    if (u.order === 'attack') {
      if (!this.alive(u.tgt)) { u.order = 'idle'; u.tgt = null; u.home = { x: u.x, z: u.z }; u.path = []; }
      else {
        const t = u.tgt, tx = t.pos ? t.pos.x : t.x, tz = t.pos ? t.pos.z : t.z, tr = t.r || 0.6;
        const d = Math.hypot(tx - u.x, tz - u.z);
        if (d > U.range + tr) { if (u.repath <= 0) { u.repath = 0.8; this.moveUnit(u, tx, tz); } }
        else u.path = [];
        if (d <= U.range + tr) this.fire(u, t, tx, tz);
        return;
      }
    }
    // tir automatique sur le monstre le plus proche
    const m = g.nearest(u.x, u.z, U.range + (u.path.length ? 0 : 4));
    if (m) {
      const d = Math.hypot(m.pos.x - u.x, m.pos.z - u.z);
      if (d <= U.range + m.r) this.fire(u, m, m.pos.x, m.pos.z);
      else if (!u.path.length && Math.hypot(u.x - u.home.x, u.z - u.home.z) < 8 && u.repath <= 0) {
        u.repath = 0.6; u.path = [{ x: m.pos.x, z: m.pos.z }]; u.chasing = true;
      }
    } else if (u.chasing && !u.path.length) {
      u.chasing = false;
      if (Math.hypot(u.x - u.home.x, u.z - u.home.z) > 1.5) this.moveUnit(u, u.home.x, u.home.z);
    }
    if (u.order === 'move' && !u.path.length) { u.order = 'idle'; u.home = { x: u.x, z: u.z }; }
  }

  fire(u, t, tx, tz) {
    if (u.cd > 0) return;
    const g = this.g, U = u.U;
    u.cd = U.cd;
    u.fireT = 0.3;
    const dx = tx - u.x, dz = tz - u.z, d = Math.hypot(dx, dz) || 1;
    u.aimX = dx / d; u.aimZ = dz / d;
    if (u.type === 'soldier' || u.type === 'lucas') {
      let sx = u.x + dx / d * 0.6, sz = u.z + dz / d * 0.6, sy = 1.1;
      if (u.trooper) { const mz = u.trooper.muzzleWorld(new THREE.Vector3()); sx = mz.x; sz = mz.z; sy = Math.max(0.5, mz.y); }
      g.shots.push({ kind: 'gas', x: sx, z: sz, y: sy, vx: dx / d * 17, vz: dz / d * 17, life: (U.range + 1.5) / 17, dmg: U.dmg, pierce: 0, hit: new Set() });
      g.sfx.shoot();
    } else if (u.type === 'tank') {
      g.bombs.push({ x0: u.x, z0: u.z, x1: tx, z1: tz, t: 0, dur: 0.55, r: U.splash, dmg: U.dmg });
      g.sfx.fart(0.6, 0.25, 0.3);
      g.particles.emit(u.x + dx / d * 1.6, 1.1, u.z + dz / d * 1.6, 0x9cff3a, { life: 0.4, s0: 0.6, s1: 1.4 });
    } else if (u.type === 'dog') {
      if (t.kind === 'nest') this.hitNest(t, U.dmg);
      else g.damage(t, U.dmg, dx / d, dz / d, 5);
      g.particles.burst(tx, 0.8, tz, 0xffffff, 4, 3, { life: 0.3, s0: 0.3, s1: 0.7 });
    }
  }

  harvesterAI(u, dt) {
    const hq = this.hq;
    if (u.state === 'toField') {
      if (!u.field || u.field.amount <= 0) {
        let best = null, bd = 1e9;
        for (const f of this.fields) { if (f.amount <= 0) continue; const d = (f.x - u.x) ** 2 + (f.z - u.z) ** 2; if (d < bd) { bd = d; best = f; } }
        u.field = best;
        if (best) this.moveUnit(u, best.x, best.z); else return;
      }
      if (Math.hypot(u.field.x - u.x, u.field.z - u.z) < 2.4) { u.state = 'harvest'; u.path = []; }
      else if (!u.path.length) this.moveUnit(u, u.field.x, u.field.z);
    } else if (u.state === 'harvest') {
      const take = Math.min(dt * 30, u.field.amount, 100 - u.load);
      u.load += take; u.field.amount -= take;
      if (Math.random() < dt * 8) this.g.particles.emit(u.x, 1.2, u.z, 0x9cff3a, { vy: 1.5, life: 0.5, s0: 0.3, s1: 0.6 });
      if (u.load >= 100 || u.field.amount <= 0) { u.state = 'toHq'; this.moveUnit(u, hq.x, hq.z); }
    } else if (u.state === 'toHq') {
      if (Math.hypot(hq.x - u.x, hq.z - u.z) < hq.r + 1.6) {
        this.money += u.load; this.g.trophy.add('beans', u.load); u.load = 0; u.state = 'toField'; u.path = [];
        this.g.sfx.bean();
        this.g.word(u.x, 2.2, u.z, 1);
      } else if (!u.path.length) this.moveUnit(u, hq.x, hq.z);
    }
  }

  drawUnit(u, moving, vx, vz, dt) {
    if (u.trooper) {
      const aim = u.fireT > -0.6 && u.aimX !== undefined ? Math.atan2(u.aimX, u.aimZ) : null;
      u.trooper.update(dt, { moving, speed: u.U.speed, moveYaw: moving ? Math.atan2(vx, vz) : null, aimYaw: aim, firing: u.fireT > 0 });
      u.obj.position.set(u.x, 0, u.z);
      return;
    }
    const o = u.obj;
    const sx = (u.fireT > 0 ? u.aimX * RIGHT.x + u.aimZ * RIGHT.z : vx * RIGHT.x + vz * RIGHT.z);
    if (Math.abs(sx) > 0.1) u.face = sx > 0 ? 1 : -1;
    if (u.type === 'soldier') {
      // mêmes dessins que Lucas : marche de côté (8 images), de dos (10 images), tir
      const up = moving && (vx * -0.7071 + vz * -0.7071) > Math.abs(vx * RIGHT.x + vz * RIGHT.z);
      let F, k = 1.9 / 348;
      if (u.fireT > 0 && !moving) { F = this.soldierF[2]; k = 1.9 / this.soldierF[0].h; }
      else if (up) F = this.g.dosF[1 + Math.floor(u.walk / 1.2) % 10];
      else if (moving) F = this.g.walkF[1 + Math.floor(u.walk / 1.2) % 8];
      else { F = this.soldierF[0]; k = 1.9 / this.soldierF[0].h; }
      o.material = u.face > 0 ? F.L : F.R;
      o.center.set(u.face > 0 ? F.ax : 1 - F.ax, 0);
      o.scale.set(F.w * k, F.h * k, 1);
      o.position.set(u.x, 0, u.z);
    } else if (u.type === 'dog' && this.sp.dog_1) {
      const dx = u.fireT > 0 ? u.aimX : vx, dz = u.fireT > 0 ? u.aimZ : vz;
      if (moving || u.fireT > 0) u.dir8 = dir8(dx, dz);
      const [fi, flip] = DOG8[u.dir8 || 0], F = this.sp['dog_' + fi], k = 1.5 / 260;
      o.material = u.hitT > 0 ? (flip ? F.fR : F.fL) : (flip ? F.R : F.L);
      o.center.set(flip ? 1 - F.ax : F.ax, 0);
      o.scale.set(F.w * k, F.h * k, 1);
      o.position.set(u.x, moving ? Math.abs(Math.sin(u.walk)) * 0.18 : 0, u.z);
    } else if (u.type === 'dog') {
      const mats = this.g.dogMats[moving ? Math.floor(u.walk) % 4 : 0];
      o.material = u.face > 0 ? mats.R : mats.L;
      o.scale.set(1.3 * mats.aspect, 1.3, 1);
      o.position.set(u.x, moving ? Math.abs(Math.sin(u.walk)) * 0.15 : 0, u.z);
    } else {
      // de face (vers le bas de l'écran) ou de dos (vers le haut) ; les dessins regardent à gauche de face
      const dx = u.fireT > 0 ? u.aimX : vx, dz = u.fireT > 0 ? u.aimZ : vz;
      if (moving || u.fireT > 0) {
        const sx = dx * RIGHT.x + dz * RIGHT.z, sy = -(dx + dz) * Math.SQRT1_2;
        const L = Math.hypot(dx, dz) || 1;
        // un peu de marge pour ne pas clignoter entre deux dessins
        u.back = sy > 0.25 * L ? true : (sy < -0.25 * L ? false : u.back);
        if (Math.abs(sx) > 0.3 * L) u.face = sx > 0 ? 1 : -1;
      }
      const tank = u.type === 'tank';
      if (tank && this.sp.tank_1) {
        // 8 directions : 1 bas, 2 bas-droite, 3 droite, 4 haut-droite, 5 haut, 6 haut-gauche, 7 gauche, 8 bas-gauche
        if (moving || u.fireT > 0) {
          const sx = dx * RIGHT.x + dz * RIGHT.z, sy = -(dx + dz) * Math.SQRT1_2;
          const oct = ((Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) % 8) + 8) % 8; // 0 = droite, 2 = haut
          u.dir8 = [3, 4, 5, 6, 7, 8, 1, 2][oct];
        }
        const M8 = this.sp['tank_' + (u.dir8 || 1)];
        o.material = u.hitT > 0 ? M8.fL : M8.L;
        o.scale.set(3, 3 / M8.aspect, 1);
        o.position.set(u.x, moving ? Math.abs(Math.sin(u.walk * 2)) * 0.05 : 0, u.z);
        return;
      }
      if (!tank && this.sp.rec_1) {
        if (moving) u.dir8 = dir8(vx, vz);
        const [fi, flip] = REC8[u.dir8 || 0], F = this.sp['rec_' + fi], k = 3.2 / 300;
        o.material = u.hitT > 0 ? (flip ? F.fR : F.fL) : (flip ? F.R : F.L);
        o.center.set(0.5, 0.06);
        o.scale.set(F.w * k, F.h * k, 1);
        o.position.set(u.x, moving ? Math.abs(Math.sin(u.walk * 2)) * 0.05 : 0, u.z);
        return;
      }
      const M = this.sp[tank ? (u.back ? 'veh_2' : 'veh_1') : (u.back ? 'veh_4' : 'veh_3')];
      const nativeRight = u.back && tank;              // le char de dos regarde à droite, le reste à gauche
      const flip = nativeRight ? u.face < 0 : u.face > 0;
      o.material = u.hitT > 0 ? (flip ? M.fR : M.fL) : (flip ? M.R : M.L);
      const w = tank ? 2.9 : 3.1;
      o.scale.set(w, w / M.aspect, 1);
      o.position.set(u.x, moving ? Math.abs(Math.sin(u.walk * 2)) * 0.05 : 0, u.z);
    }
  }

  // ------------------------------------------------------------------ dessin (murs, champs, sélection, barres de vie)
  draw() {
    const g = this.g;
    const W = this.wallPool, WL = this.wallLine, S = this.segPool, SL = this.segLine;
    W.begin(); WL.begin(); S.begin(); SL.begin();
    const wallAt = new Map();
    for (const b of this.buildings) if (b.type === 'wall' || b.type === 'gate') wallAt.set(b.cells[0], b);
    // le pilier de la porte du côté de l'autre bout
    const end = (a, o) => a.type !== 'gate' ? [a.x, a.z] : [a.x + Math.sign(Math.round(o.x - a.x)) * 0.85 * (a.alongX ? 1 : 0), a.z + Math.sign(Math.round(o.z - a.z)) * 0.85 * (a.alongX ? 0 : 1)];
    for (const b of this.buildings) if (b.type === 'gate' && b.obj) {
      const ix = b.cells[0] % N, iz = (b.cells[0] / N) | 0;
      const wx = wallAt.has(iz * N + ix - 1) || wallAt.has(iz * N + ix + 1), wz = wallAt.has((iz - 1) * N + ix) || wallAt.has((iz + 1) * N + ix);
      b.alongX = wx || !wz;
      b.obj.rotation.y = b.alongX ? 0 : Math.PI / 2;
      const near = this.units.some((u) => (u.x - b.x) ** 2 + (u.z - b.z) ** 2 < 3.4 * 3.4);
      b.open = (b.open || 0) + ((near && b.built >= 1 ? 1 : 0) - (b.open || 0)) * Math.min(1, g.dt60 || 0.15);
      if (near && b.built >= 1 && !b.wasOpen) g.sfx.gate();
      b.wasOpen = near && b.built >= 1;
      b.obj.userData.pivot.rotation.z = b.open * 1.35;
      b.obj.scale.y = 0.4 + 0.6 * b.built;
    }
    const seg = (ax, az, bx, bz, k, P, PL) => {
      const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx);
      P.push((ax + bx) / 2, 0, (az + bz) / 2, L / 2, k, 1, ry);
      if (PL) PL.push((ax + bx) / 2, 0, (az + bz) / 2, L / 2, k, 1, ry);
    };
    this.wallSeg = seg;
    for (const [key, b] of wallAt) {
      const k = 0.4 + 0.6 * b.built;
      if (b.type !== 'gate') { W.push(b.x, 0, b.z, 1, k, 1); WL.push(b.x, 0, b.z, 1, k, 1); }
      const ix = key % N, iz = (key / N) | 0;
      for (const [dx, dz] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        const o = wallAt.get((iz + dz) * N + ix + dx);
        if (!o) continue;
        // en diagonale, seulement s'il n'y a pas déjà un coin en L
        if (dx && dz && (wallAt.has(iz * N + ix + dx) || wallAt.has((iz + dz) * N + ix))) continue;
        if ((b.type === 'gate' || o.type === 'gate') && dx && dz) continue;
        if (b.type === 'gate' && o.type === 'gate') continue;
        const [ax, az] = end(b, o), [bx, bz] = end(o, b);
        seg(ax, az, bx, bz, 0.4 + 0.6 * Math.min(b.built, o.built), S, SL);
      }
    }
    W.end(); WL.end(); S.end(); SL.end();
    const F = this.fieldPool; F.begin();
    for (const f of this.fields) {
      const k = f.amount > 0 ? 0.45 + 0.55 * f.amount / f.max : 0;
      const w = 4.6 * k * (1 + Math.sin(g.time * 2 + f.x) * 0.02);
      f.pile.visible = k > 0;
      f.pile.scale.set(w, w / this.sp.veh_7.aspect, 1);
      f.obj.material.opacity = 0.15 + 0.3 * f.amount / f.max;
    }
    F.end();
    const Z = this.zonePool; Z.begin();
    if (this.place) for (const b of this.buildings) if (b.built >= 1) { const rr = b.type === 'hq' ? 13 : 8; Z.push(b.x, 0.05, b.z, rr, 1, rr); }
    Z.end();
    const R = this.ringPool; R.begin();
    for (const u of this.sel) R.push(u.x, 0.06, u.z, u.r * 1.6, 1, u.r * 1.6);
    if (this.selB) R.push(this.selB.x, 0.06, this.selB.z, this.selB.r * 1.5, 1, this.selB.r * 1.5);
    R.end();
    // barres de vie tournées vers la caméra
    const cam = g.camera;
    const e = this.hpBar.setFromQuaternion(cam.quaternion);
    const rx = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const BB = this.barBack, BF = this.barFront, BR = this.barRed;
    BB.begin(); BF.begin(); BR.begin();
    const bar = (x, z, h, frac, w, sel) => {
      if (frac >= 0.999 && !sel) return;
      frac = Math.max(0, frac);
      BB.push(x, h, z, w + 0.12, 0.3, 1, e.y, e.x, e.z);
      const fw = w * frac, off = (fw - w) / 2;
      (frac < 0.35 ? BR : BF).push(x + rx.x * off, h + rx.y * off, z + rx.z * off, fw, 0.2, 1, e.y, e.x, e.z);
    };
    for (const u of this.units) bar(u.x, u.z, u.h, u.hp / u.maxHp, 1.2, this.sel.has(u));
    for (const b of this.buildings) bar(b.x, b.z, b.h, b.built < 1 ? b.built : b.hp / b.maxHp, b.r * 1.4, b === this.selB);
    for (const n of this.nests) if (n.hp > 0 && this.seenAt(n.x, n.z)) bar(n.x, n.z, 2.6, n.hp / n.maxHp, 3, false);
    BB.end(); BF.end(); BR.end();
  }

  drawShadows(sh) {
    for (const u of this.units) sh.push(u.x, 0.03, u.z, u.r * 2.4, 1, u.r * 1.6);
  }

  // ------------------------------------------------------------------ commandes du joueur
  screenToGround(px, py, W, H) { return this.g.ndcToGround(px / W * 2 - 1, -(py / H * 2 - 1)); }

  pickAt(p) {
    // une unité à moi ?
    let best = null, bd = 1.6 * 1.6;
    for (const u of this.units) { const d = (u.x - p.x) ** 2 + (u.z - p.z) ** 2; if (d < bd) { bd = d; best = u; } }
    if (best) return best;
    for (const n of this.nests) if (n.hp > 0 && (n.x - p.x) ** 2 + (n.z - p.z) ** 2 < (n.r + 0.6) ** 2) return n;
    let mb = null; bd = 1.6 * 1.6;
    for (const m of this.g.monsters) { if (!m.alive) continue; const d = (m.pos.x - p.x) ** 2 + (m.pos.z - p.z) ** 2; if (d < bd + m.r * m.r) { bd = d; mb = m; } }
    if (mb) return mb;
    const o = this.occ[cellOf(p.z) * N + cellOf(p.x)];
    if (o) return this.byId.get(o) || null;
    return null;
  }

  // ce que le doigt touche À L'ÉCRAN (un mur ou un soldat a une hauteur : on vise son dessin, pas le sol derrière)
  pickScreen(px, py, W, H, onlyBuildings = false) {
    const cam = this.g.camera, v = this._pv || (this._pv = new THREE.Vector3());
    const ppu = W / (cam.right - cam.left);
    let best = null, bd = 1e9;
    const test = (e, x, z, h, r) => {
      v.set(x, h, z).project(cam);
      const sx = (v.x + 1) / 2 * W, sy = (1 - v.y) / 2 * H;
      const d = Math.hypot(sx - px, sy - py), lim = r * ppu + 8;
      if (d < lim && d / lim < bd) { bd = d / lim; best = e; }
    };
    if (!onlyBuildings) for (const u of this.units) test(u, u.x, u.z, 0.9, Math.max(0.7, u.r));
    for (const b of this.buildings) test(b, b.x, b.z, b.type === 'wall' ? 0.5 : (b.type === 'hq' ? 1.5 : 1), b.r * 0.95);
    if (onlyBuildings) return best;
    for (const n of this.nests) if (n.hp > 0) test(n, n.x, n.z, 0.5, n.r);
    for (const m of this.g.monsters) if (m.alive) test(m, m.pos.x, m.pos.z, m.h * 0.45, Math.max(0.6, m.r));
    return best;
  }

  onTap(px, py, W, H) {
    const g = this.g;
    const p = this.screenToGround(px, py, W, H);
    if (this.power) { this.castPower(p.x, p.z); return; }
    if (this.place) return;
    const hit = this.pickScreen(px, py, W, H) || this.pickAt(p);
    if (hit && hit.kind === 'unit') {
      const now = performance.now();
      if (this.lastTapU === hit && now - this.lastTapT < 400 && hit.type !== 'harvester') {
        // double-toucher : toute l'armée visible à l'écran
        this.sel.clear();
        for (const u of this.army()) if (this.onScreen(u, W, H)) this.sel.add(u);
      } else if (this.sel.has(hit) && this.sel.size === this.squadOf(hit).length) this.sel.clear();
      else { this.sel.clear(); for (const u of this.squadOf(hit)) this.sel.add(u); }
      this.lastTapU = hit; this.lastTapT = now;
      this.selB = null;
      g.sfx.click();
      this.uiDirty = true;
      return;
    }
    if (this.sel.size) { this.command(p, hit); return; }
    if (hit && hit.kind === 'nest') { this.attackNest(hit); return; }
    if (hit && hit.kind === 'building') { this.selB = hit; this.sel.clear(); this.uiDirty = true; g.sfx.click(); return; }
    if (this.selB) { this.selB = null; this.uiDirty = true; }
  }

  // clic droit (ordinateur) : ordre pour les soldats choisis
  order(px, py, W, H) {
    if (this.power || this.place) { this.cancelPower(); this.cancelPlace(); return; }
    if (!this.sel.size) return;
    const p = this.screenToGround(px, py, W, H);
    this.command(p, this.pickScreen(px, py, W, H) || this.pickAt(p));
  }

  command(p, hit) {
    const g = this.g;
    const army = [...this.sel].filter((u) => u.type !== 'harvester');
    if (hit && (hit.kind === 'nest' || hit.alive)) {
      for (const u of army) { u.order = 'attack'; u.tgt = hit; u.repath = 0; }
      g.particles.burst(hit.pos ? hit.pos.x : hit.x, 0.3, hit.pos ? hit.pos.z : hit.z, 0xff5a4e, 8, 3, { life: 0.5, s0: 0.4, s1: 1 });
      g.radio(pick(['À l’attaque !', 'Allez les gars, on fonce !', 'Visez le nid !', 'Tu veux vivre pour toujours ?! À l’attaque !']), 1);
    } else {
      // en formation autour du point touché
      const n = army.length, cols = Math.ceil(Math.sqrt(n));
      army.forEach((u, i) => {
        const ox = (i % cols - (cols - 1) / 2) * 1.4, oz = (Math.floor(i / cols) - (cols - 1) / 2) * 1.4;
        u.order = 'move'; u.tgt = null; u.chasing = false;
        this.moveUnit(u, p.x + ox, p.z + oz);
        u.home = { x: p.x + ox, z: p.z + oz };
      });
      g.particles.burst(p.x, 0.2, p.z, 0x7dff4a, 8, 2.5, { life: 0.5, s0: 0.3, s1: 0.8 });
    }
    g.sfx.click();
  }

  squadOf(u) {
    if (u.type === 'harvester' || u.type === 'lucas' || !u.squad) return [u];
    return this.units.filter((o) => o.squad === u.squad);
  }

  onScreen(u, W, H) {
    const v = (this._pv || (this._pv = new THREE.Vector3())).set(u.x, 1, u.z).project(this.g.camera);
    return Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
  }

  // rectangle de sélection (on encadre ses soldats)
  boxSelect(x0, y0, x1, y1, W, H) {
    const ax = Math.min(x0, x1), bx = Math.max(x0, x1), ay = Math.min(y0, y1), by = Math.max(y0, y1);
    const v = this._pv || (this._pv = new THREE.Vector3());
    const inside = (u) => { v.set(u.x, 0.9, u.z).project(this.g.camera); const sx = (v.x + 1) / 2 * W, sy = (1 - v.y) / 2 * H; return sx >= ax && sx <= bx && sy >= ay && sy <= by; };
    let picked = this.units.filter((u) => u.type !== 'harvester' && inside(u));
    if (!picked.length) picked = this.units.filter((u) => inside(u));
    this.sel.clear(); this.selB = null;
    for (const u of picked) this.sel.add(u);
    this.uiDirty = true;
    if (picked.length) this.g.sfx.click();
  }

  // ---------- construction : le bâtiment suit le doigt en fantôme, on lâche (ou on clique) pour le poser ----------
  cellUnder(px, py, W, H) {
    const p = this.screenToGround(px, py, W, H);
    const s = BUILDINGS[this.place.type].size;
    const ix = cellOf(p.x), iz = cellOf(p.z);
    return [ix - (s === 2 ? (p.x - ctr(ix) < 0 ? 1 : 0) : 0), iz - (s === 2 ? (p.z - ctr(iz) < 0 ? 1 : 0) : 0)];
  }

  lineCells(a, b) {
    const dx = b[0] - a[0], dz = b[1] - a[1], n = Math.min(24, Math.max(Math.abs(dx), Math.abs(dz)));
    const out = [];
    for (let i = 0; i <= n; i++) {
      const c = n ? [Math.round(a[0] + dx * i / n), Math.round(a[1] + dz * i / n)] : [a[0], a[1]];
      if (!out.some((o) => o[0] === c[0] && o[1] === c[1])) out.push(c);
    }
    return out;
  }

  hover(px, py, W, H) {
    if (this.power) {
      const p = this.screenToGround(px, py, W, H), rr = POWERS[this.power].r;
      this.ghostRange.scale.set(rr, 1, rr); this.ghostRange.position.set(p.x, 0.1, p.z); this.ghostRange.visible = true;
      this.ghostRange.material.color.setHex(this.seenAt(p.x, p.z) ? 0xffd23f : 0xff4a4a);
      return;
    }
    const pl = this.place;
    if (!pl || pl.down || pl.pending) return;
    const [ix, iz] = this.cellUnder(px, py, W, H);
    if (ix === pl.ix && iz === pl.iz) return;
    [pl.ix, pl.iz] = [ix, iz];
    this.updateGhost();
  }

  // les cases du fantôme : la ligne qu'on trace, celle qui attend ✔, ou la case visée
  ghostCells() {
    const pl = this.place;
    if (pl.down) return pl.type === 'wall' ? this.lineCells(pl.start, [pl.ix, pl.iz]) : [[pl.ix, pl.iz]];
    if (pl.pending) return pl.pending;
    return [[pl.ix, pl.iz]];
  }

  placeDown(px, py, W, H) {
    const pl = this.place;
    const c = this.cellUnder(px, py, W, H);
    // on retouche le fantôme qui attend : ça veut dire « construis-le »
    pl.tapPending = !!(pl.pending && pl.pending.some(([x, z]) => Math.abs(x - c[0]) <= (pl.type === 'wall' ? 0 : 1) && Math.abs(z - c[1]) <= (pl.type === 'wall' ? 0 : 1)));
    pl.down = true;
    [pl.ix, pl.iz] = c;
    pl.start = c;
    if (!pl.tapPending) pl.pending = null;
    this.updateGhost();
  }

  placeMove(px, py, W, H) {
    const pl = this.place;
    if (!pl || !pl.down) return;
    const [ix, iz] = this.cellUnder(px, py, W, H);
    if (ix === pl.ix && iz === pl.iz) return;
    [pl.ix, pl.iz] = [ix, iz];
    if (pl.tapPending) { pl.tapPending = false; pl.pending = null; }
    this.updateGhost();
  }

  placeUp() {
    const pl = this.place;
    if (!pl || !pl.down) return;
    if (pl.tapPending) { pl.down = false; pl.tapPending = false; this.confirmPlace(); return; }
    // on a posé le fantôme : il attend qu'on appuie sur ✔ Construire
    pl.pending = pl.type === 'wall' ? this.lineCells(pl.start, [pl.ix, pl.iz]) : [[pl.ix, pl.iz]];
    pl.down = false;
    this.g.sfx.click();
    this.updateGhost();
    this.uiDirty = true;
  }

  // ✔ Construire
  confirmPlace() {
    const pl = this.place;
    if (!pl) return;
    const cells = pl.pending || [[pl.ix, pl.iz]];
    pl.pending = null;
    if (pl.type === 'wall') {
      let n = 0;
      for (const [x, z] of cells) if (this.canAfford(BUILDINGS.wall.cost) && this.build('wall', x, z)) n++;
      if (!n) this.refuse('wall', cells[0][0], cells[0][1]);
      if (!this.canAfford(BUILDINGS.wall.cost)) this.cancelPlace(); else { this.updateGhost(); this.uiDirty = true; }
      return;
    }
    const [x, z] = cells[0];
    if (this.build(pl.type, x, z)) this.cancelPlace();
    else { this.refuse(pl.type, x, z); this.updateGhost(); this.uiDirty = true; }
  }

  // prix de ce qui attend ✔ (pour l'afficher sur le bouton)
  pendingCost() {
    const pl = this.place;
    if (!pl || !pl.pending) return 0;
    if (pl.type !== 'wall') return BUILDINGS[pl.type].cost;
    return pl.pending.filter(([x, z]) => this.canPlace('wall', x, z)).length * BUILDINGS.wall.cost;
  }

  refuse(type, ix, iz) {
    this.g.sfx.hurt();
    const why = !this.canAfford(BUILDINGS[type].cost) ? 'Pas assez de haricots, soldat !' : (this.canPlace(type, ix, iz) ? '' : this.why);
    const now = performance.now();
    if (why && (why !== this.lastWhy || now - (this.lastWhyT || 0) > 2500)) { this.g.radio(why, 3); this.lastWhy = why; this.lastWhyT = now; }
  }

  startPlace(type) {
    this.power = null;
    const B = BUILDINGS[type];
    if (!this.unlocked(B)) return;
    if (!this.canAfford(B.cost)) { this.g.radio('Pas assez de haricots, soldat !', 3); return; }
    this.cancelPlace();
    // le fantôme apparaît tout de suite sur une place libre, près du milieu de l'écran
    const c = this.g.camTarget, cx = cellOf(c.x), cz = cellOf(c.z);
    let spot = [cx, cz];
    search: for (let r = 0; r < 12; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      if (this.canPlace(type, cx + dx, cz + dz)) { spot = [cx + dx, cz + dz]; break search; }
    }
    this.place = { type, ix: spot[0], iz: spot[1], down: false, pending: null };
    if (type !== 'wall') {
      // le vrai bâtiment, en transparent
      const obj = this.makeBuilding(type, true);
      if (obj.userData.spr) obj.userData.spr.renderOrder = 4;
      this.ghostObj = obj;
      this.scene.add(obj);
    }
    this.sel.clear(); this.selB = null;
    this.updateGhost();
    this.uiDirty = true;
  }

  updateGhost() {
    const pl = this.place;
    const GW = this.ghostWalls, GB = this.ghostWallsBad, GO = this.ghostBusy, GS = this.ghostSegs;
    GW.begin(); GB.begin(); GO.begin(); GS.begin();
    this.ghostTile.visible = this.ghostRange.visible = false;
    if (pl && pl.type === 'wall') {
      const B = BUILDINGS.wall;
      let money = this.money, prev = null;
      for (const [x, z] of this.ghostCells()) {
        const busy = x >= 0 && z >= 0 && x < N && z < N && this.occ[z * N + x];
        let ok = false;
        if (busy) GO.push(ctr(x), 0.06, ctr(z), 1, 1, 1);
        else {
          ok = this.canPlace('wall', x, z) && money >= B.cost;
          if (ok) money -= B.cost;
          (ok ? GW : GB).push(ctr(x), 0.02, ctr(z), 1, 1, 1);
        }
        if (prev && (ok || busy) && prev.good && this.wallSeg) this.wallSeg(ctr(prev.x), ctr(prev.z), ctr(x), ctr(z), 1, GS, null);
        prev = { x, z, good: ok || busy };
      }
    }
    GW.end(); GB.end(); GO.end(); GS.end();
    if (!pl || pl.type === 'wall') return;
    const B = BUILDINGS[pl.type];
    const [ix, iz] = this.ghostCells()[0];
    const ok = this.canPlace(pl.type, ix, iz) && this.canAfford(B.cost);
    const cx = ctr(ix) + (B.size - 1) * CS / 2, cz = ctr(iz) + (B.size - 1) * CS / 2;
    if (this.ghostObj) {
      const gm = this.ghostObj.userData.mat;
      gm.color.setRGB(ok ? 0.7 : 1.6, ok ? 1.4 : 0.45, ok ? 0.7 : 0.45); gm.opacity = ok ? 0.75 : 0.4;
      this.ghostObj.position.set(cx, 0.02, cz);
    }
    this.ghostTile.material.color.setHex(ok ? 0x7dff4a : 0xff4a4a);
    this.ghostTile.scale.set(B.size * CS - 0.1, 1, B.size * CS - 0.1);
    this.ghostTile.position.set(cx, 0.06, cz);
    this.ghostTile.visible = true;
    if (B.range) { this.ghostRange.scale.set(B.range, 1, B.range); this.ghostRange.position.set(cx, 0.08, cz); this.ghostRange.visible = true; }
    pl.ok = ok;
  }

  rotateWall() { /* les murs se raccordent tout seuls : plus besoin de les tourner */ }

  cancelPlace() {
    if (this.ghostObj) { this.scene.remove(this.ghostObj); this.ghostObj = null; }
    this.place = null; this.updateGhost(); this.uiDirty = true;
  }

  train(type) {
    const U = UNITS[type];
    if (!this.unlocked(U)) return;
    const from = U.from === 'hq' ? this.hq : this.buildings.find((b) => b.type === U.from && b.built >= 1 && (!this.selB || this.selB === b || this.selB.type !== U.from))
      || this.buildings.filter((b) => b.type === U.from && b.built >= 1).sort((a, b) => a.queue.length - b.queue.length)[0];
    if (!from) { this.g.radio(`Il faut d’abord construire : ${BUILDINGS[U.from].name} !`, 3); return; }
    if (!this.canAfford(U.cost)) { this.g.radio('Pas assez de haricots, soldat !', 3); return; }
    if (this.units.length + (U.squad || 1) > 48) { this.g.radio('L’armée est complète, soldat !', 2); return; }
    this.money -= U.cost;
    from.queue.push(type);
    if (type === 'soldier') this.trainedN++;
    this.g.sfx.click();
    this.uiDirty = true;
  }

  army() { return this.units.filter((u) => u.type !== 'harvester'); }

  // ⚔️ toute l'armée attaque un nid (le plus proche si on n'en donne pas)
  attackNest(n) {
    const army = this.army();
    if (!army.length) { this.g.radio('Tu n’as pas encore de soldats ! Construis une Caserne.', 3); return; }
    if (!n) {
      let bd = 1e9;
      for (const o of this.nests) if (o.hp > 0) { const d = (o.x - this.hq.x) ** 2 + (o.z - this.hq.z) ** 2; if (d < bd) { bd = d; n = o; } }
    }
    if (!n) return;
    for (const u of army) { u.order = 'attack'; u.tgt = n; u.repath = 0; }
    this.sel.clear(); for (const u of army) this.sel.add(u);
    this.g.particles.burst(n.x, 0.5, n.z, 0xff5a4e, 14, 4, { life: 0.6, s0: 0.5, s1: 1.4 });
    this.g.radio(pick(['À l’attaque ! Détruisez ce nid !', 'Allez les gars, on fonce sur le nid !']), 1);
    this.g.camTarget.set((n.x + this.hq.x) / 2, 0, (n.z + this.hq.z) / 2);
    this.uiDirty = true;
    this.g.sfx.alarm();
  }

  // 🏠 toute l'armée revient défendre la fusée
  defend() {
    const army = this.army();
    const n = army.length, cols = Math.ceil(Math.sqrt(n));
    army.forEach((u, i) => {
      const a = (i / Math.max(1, n)) * Math.PI * 2, rr = 6 + (i % 2) * 1.5;
      const x = this.hq.x + Math.cos(a) * rr, z = this.hq.z + Math.sin(a) * rr;
      u.order = 'move'; u.tgt = null; u.chasing = false;
      this.moveUnit(u, x, z); u.home = { x, z };
    });
    this.sel.clear();
    this.g.camTarget.set(this.hq.x, 0, this.hq.z);
    this.g.radio('Tout le monde à la base ! On défend le vaisseau !', 1);
    this.uiDirty = true;
    this.g.sfx.click();
  }

  selectArmy() {
    this.sel.clear(); this.selB = null;
    for (const u of this.units) if (u.type !== 'harvester') this.sel.add(u);
    this.uiDirty = true;
    this.g.sfx.click();
  }

  // ⬆ améliorer la tourelle ou la caserne (niveau 2, puis 3)
  upgrade() {
    const b = this.selB;
    if (!b || !UPGRADE_COST[b.type] || b.built < 1) return;
    const L = b.lvl || 1;
    if (L >= 3) return;
    const cost = UPGRADE_COST[b.type][L - 1];
    if (this.money < cost) { this.g.radio('Pas assez de haricots pour améliorer !', 3); return; }
    this.money -= cost;
    b.lvl = L + 1;
    b.maxHp = Math.round(b.maxHp * 1.4); b.hp = b.maxHp;
    this.g.particles.burst(b.x, 1.5, b.z, 0xffd23f, 24, 4, { life: 0.9, s0: 0.4, s1: 1.2 });
    this.g.sfx.levelUp();
    this.g.radio(UPGRADE_SAY[b.type](b.lvl), 'sg4');
    this.uiDirty = true;
  }

  sell() {
    const b = this.selB;
    if (!b || b.type === 'hq') return;
    this.money += Math.floor(b.B.cost * 0.5 * (b.hp / b.maxHp));
    this.g.particles.burst(b.x, 0.8, b.z, 0xd9c38f, 12, 3, { life: 0.7, s0: 0.5, s1: 1.4 });
    this.removeEnt(b);
    this.g.sfx.pickup();
  }
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const BSPR = { turret: 'niv_1', mortar: 'bat_3', fan: 'bat_4', farm: 'bat_5', pump: 'bat_6', barracks: 'niv_4', garage: 'bat_8', radio: 'bat2_6', medic: 'bat2_7' };
// les dessins par niveau d'amélioration
const BLEVELS = { turret: ['niv_1', 'niv_2', 'niv_3'], barracks: ['niv_4', 'niv_5', 'niv_6'], farm: ['bat_5', 'nv_1', 'nv_2'],
  radio: ['bat2_6', 'nv_3', 'nv_4'], medic: ['bat2_7', 'nv_5', 'nv_6'], mortar: ['bat_3', 'nv_7', 'nv_8'] };
export const UPGRADE_COST = { turret: [150, 300], barracks: [250, 450], farm: [200, 350], radio: [250, 400], medic: [150, 300], mortar: [250, 400] };
const UPGRADE_SAY = {
  turret: (l) => `Tourelle niveau ${l} : plus de canons, plus de gaz !`,
  barracks: (l) => `Caserne niveau ${l} : escouades plus grandes et plus rapides !`,
  farm: (l) => `Champ niveau ${l} : beaucoup plus de haricots !`,
  radio: (l) => `Tour radio niveau ${l} : la Flotte répond plus vite et on voit plus loin !`,
  medic: (l) => `Tente médicale niveau ${l} : elle soigne plus vite et plus loin !`,
  mortar: (l) => `Lance-bombes niveau ${l} : plus de bombes, plus grosses !`,
};
// le dessin « abîmé » de certains bâtiments
const BDAMAGED = { turret: 'bat2_2', barracks: 'bat2_3', garage: 'bat2_4' };
// en diagonale, un mur doit être plus long pour toucher le suivant
function wallStretch(rot) { return Math.abs(Math.sin(2 * rot)) > 0.5 ? 1.42 : 1; }
function g_radio(g, txt, face) { g.radio(txt, face); }

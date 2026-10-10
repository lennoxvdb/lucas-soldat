// Lucas (et ses copains soldats) en vraie 3D animée : il court, vise, tire, tombe, saute de joie.
// Modèle de base : « Knight » du KayKit Adventurers Pack (CC0), repeint en camouflage dans le code.
import * as THREE from 'three';
import { GLTFLoader } from '../../lib/GLTFLoader.js';
import { clone as skeletonClone } from '../../lib/SkeletonUtils.js';
import { gradMap, outlineGeo, outlineMat } from '../engine/gfx.js';

export function loadTrooper() {
  return new Promise((res, rej) => new GLTFLoader().load('assets/3d/trooper.glb', res, undefined, rej));
}

// Peinture camouflage : les parties grises de l'armure deviennent des taches vertes et marron,
// dessinées en 3D sur le corps (elles suivent les mouvements).
const CAMO = `
varying vec3 vCamo;
float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float n3(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
vec3 camo(vec3 p, float lum) {
  float n = n3(p * 5.0) * 0.65 + n3(p * 11.0) * 0.35;
  vec3 c = n < 0.38 ? vec3(0.16, 0.22, 0.11) : (n < 0.55 ? vec3(0.29, 0.40, 0.18) : (n < 0.7 ? vec3(0.42, 0.53, 0.25) : vec3(0.50, 0.40, 0.24)));
  return pow(c, vec3(2.2)) * (0.75 + lum * 0.9);
}`;

function camoMaterial(map, color = 0xffffff) {
  const m = new THREE.MeshToonMaterial({ map, color, gradientMap: gradMap });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCamo;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCamo = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + CAMO)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          float mx = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
          float mn = min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));
          if (mx > 0.03 && mx < 0.7 && (mx - mn) / mx < 0.4) diffuseColor.rgb = camo(vCamo, mx);
        }`);
  };
  m.customProgramCacheKey = () => 'camo';
  return m;
}

const HIDE = ['Knight_Cape', 'Knight_Helmet', '1H_Sword', '2H_Sword', '1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield'];
// (le chargeur 3D enlève les points des noms : « upperarm.l » devient « upperarml »)
const UPPER = new Set(['spine', 'chest', 'upperarml', 'lowerarml', 'wristl', 'handl', 'handslotl', 'upperarmr', 'lowerarmr', 'wristr', 'handr', 'handslotr', 'head']);

let shared = null;
function prepareShared(gltf) {
  if (shared) return shared;
  let tex = null;
  gltf.scene.traverse((o) => { if (o.isMesh && o.material.map) tex = o.material.map; });
  const clips = {};
  for (const c of gltf.animations) clips[c.name] = c;
  const part = (clip, upper) => {
    const c = clip.clone();
    c.tracks = c.tracks.filter((t) => UPPER.has(t.name.split('.').slice(0, -1).join('.')) === upper);
    return c;
  };
  shared = {
    body: camoMaterial(tex),
    helmet: camoMaterial(null, 0x8a8a8a),
    clips: {
      idleL: part(clips.Idle, false), idleU: part(clips.Idle, true),
      runL: part(clips.Running_A, false), runU: part(clips.Running_A, true),
      aimU: part(clips['2H_Ranged_Aiming'], true), shootU: part(clips['2H_Ranged_Shooting'], true),
      aimL: part(clips['2H_Ranged_Aiming'], false),
      death: clips.Death_A, cheer: clips.Cheer, hit: part(clips.Hit_A, true),
    },
  };
  return shared;
}

// le casque de soldat trop grand
function makeHelmet(mat) {
  const g = new THREE.Group();
  const domeGeo = new THREE.SphereGeometry(0.7, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const dome = new THREE.Mesh(domeGeo, mat);
  dome.scale.set(1, 0.82, 1.06);
  g.add(dome, new THREE.Mesh(outlineGeo(domeGeo, 0.035), outlineMat));
  const brimGeo = new THREE.CylinderGeometry(0.75, 0.78, 0.07, 26);
  const brim = new THREE.Mesh(brimGeo, mat);
  brim.position.y = 0.0; brim.scale.set(1, 1, 1.08);
  g.add(brim);
  const strapMat = new THREE.MeshToonMaterial({ color: 0x4a3a20, gradientMap: gradMap });
  for (const s of [-1, 1]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.06), strapMat);
    strap.position.set(s * 0.6, -0.22, 0.12);
    g.add(strap);
  }
  // mèches de cheveux qui dépassent
  const hairMat = new THREE.MeshToonMaterial({ color: 0x6b3a1f, gradientMap: gradMap });
  for (const [x, z, r] of [[-0.5, 0.42, 0.4], [-0.22, 0.56, 0.1], [0.3, 0.52, -0.3], [0.52, 0.34, -0.6]]) {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 6), hairMat);
    h.position.set(x, -0.06, z); h.rotation.set(1.9, 0, r);
    g.add(h);
  }
  return g;
}

// le pistolet à prout (vert, réservoir de gaz rond, embout en entonnoir), tenu dans la main droite
function makeBlaster() {
  const g = new THREE.Group();
  const green = new THREE.MeshToonMaterial({ color: 0x3fd13a, gradientMap: gradMap });
  const dark = new THREE.MeshToonMaterial({ color: 0x23801f, gradientMap: gradMap });
  const glass = new THREE.MeshToonMaterial({ color: 0xa8ff6a, gradientMap: gradMap, emissive: 0x3a8a10, emissiveIntensity: 0.6 });
  const add = (geo, mat, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx;
    const o = new THREE.Mesh(outlineGeo(geo, 0.018), outlineMat);
    o.position.copy(m.position); o.rotation.copy(m.rotation);
    g.add(m, o);
    return m;
  };
  add(new THREE.CylinderGeometry(0.07, 0.08, 0.55, 12), green, 0, 0.22, 0);            // canon
  add(new THREE.SphereGeometry(0.13, 14, 10), glass, 0, 0.12, -0.13);                    // réservoir
  add(new THREE.ConeGeometry(0.14, 0.18, 14, 1, true), green, 0, 0.55, 0, Math.PI);      // entonnoir
  add(new THREE.BoxGeometry(0.07, 0.08, 0.18), dark, 0, -0.04, 0.08);                    // poignée
  const muzzle = new THREE.Object3D(); muzzle.position.y = 0.66; g.add(muzzle);
  g.userData.muzzle = muzzle;
  return g;
}

export class Trooper {
  constructor(gltf, height = 2.6) {
    const S = prepareShared(gltf);
    this.root = new THREE.Group();
    const model = skeletonClone(gltf.scene);
    const k = height / 2.3;
    model.scale.setScalar(k);
    this.root.add(model);
    model.traverse((o) => {
      if (HIDE.includes(o.name)) o.visible = false;
      if (o.isSkinnedMesh) { o.material = S.body; o.frustumCulled = false; }
    });
    const head = model.getObjectByName('head');
    const helmet = makeHelmet(S.helmet);
    helmet.position.set(0, 0.66, -0.08);
    helmet.rotation.x = -0.3; // relevé devant : on voit la tête de Lucas
    head.add(helmet);
    const hand = model.getObjectByName('handslotr');
    this.blaster = makeBlaster();
    hand.add(this.blaster);
    this.spine = model.getObjectByName('spine');

    this.mixer = new THREE.AnimationMixer(model);
    this.act = {};
    for (const [n, c] of Object.entries(S.clips)) {
      const a = this.mixer.clipAction(c);
      if (n === 'death' || n === 'hit') { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = n === 'death'; }
      a.setEffectiveWeight(0);
      a.play();
      this.act[n] = a;
    }
    this.w = Object.fromEntries(Object.keys(this.act).map((n) => [n, 0]));
    this.state = '';
    this.yaw = 0;
    this.hitT = 0;
  }

  // appelé à chaque image : où il va, où il vise, ce qu'il fait
  update(dt, { moving = false, speed = 0, moveYaw = null, aimYaw = null, firing = false, dead = false, cheer = false }) {
    const tgt = Object.fromEntries(Object.keys(this.w).map((n) => [n, 0]));
    if (dead) tgt.death = 1;
    else if (cheer) tgt.cheer = 1;
    else {
      if (moving) tgt.runL = 1; else tgt[aimYaw !== null ? 'aimL' : 'idleL'] = 1;
      if (firing) tgt.shootU = 1;
      else if (aimYaw !== null) tgt.aimU = 1;
      else tgt[moving ? 'runU' : 'idleU'] = 1;
    }
    if (dead && this.state !== 'dead') { this.act.death.reset().play(); this.state = 'dead'; }
    if (!dead && this.state === 'dead') this.state = '';
    if (cheer && this.state !== 'cheer') { this.act.cheer.reset().play(); this.state = 'cheer'; }
    if (!cheer && this.state === 'cheer') this.state = '';
    if (this.hitT > 0) { this.hitT -= dt; tgt.hit = 1; tgt.aimU = tgt.shootU = tgt.runU = tgt.idleU = 0; }
    // mélange en douceur d'une animation à l'autre
    const blend = Math.min(1, dt * 10);
    for (const n in this.w) {
      this.w[n] += (tgt[n] - this.w[n]) * (n === 'death' ? 1 : blend);
      this.act[n].setEffectiveWeight(this.w[n]);
    }
    this.act.runL.timeScale = this.act.runU.timeScale = Math.max(0.6, speed / 5.5);

    // le corps se tourne vers où il court, le haut du corps vise
    const want = moveYaw ?? aimYaw ?? this.yaw;
    if (!dead) this.yaw = turn(this.yaw, want, dt * 12);
    this.root.rotation.y = this.yaw;
    this.mixer.update(dt);
    if (!dead && !cheer && aimYaw !== null) {
      let d = wrap(aimYaw - this.yaw);
      d = Math.max(-1.3, Math.min(1.3, d));
      this.twist = (this.twist || 0) + (d - (this.twist || 0)) * Math.min(1, dt * 14);
      this.spine.rotateY(this.twist);
    } else this.twist = 0;
  }

  hit() { this.hitT = 0.35; this.act.hit.reset().play(); }

  muzzleWorld(out) { return this.blaster.userData.muzzle.getWorldPosition(out); }
}

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function turn(a, b, k) { return a + wrap(b - a) * Math.min(1, k); }

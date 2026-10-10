// Le décor de la planète Prout : sol, fusée écrasée, geysers, marais, champignons, rochers.
import * as THREE from 'three';
import { toon, toonMat, groundTexture, rng, INK } from '../engine/gfx.js';
import { mergeGeometries } from '../../lib/BufferGeometryUtils.js';

export const ARENA = 56; // rayon de la zone de jeu

export function buildWorld(scene, particles, tex = {}) {
  const R = rng(42);
  const colliders = [];   // {x, z, r}
  const geysers = [];
  const swamps = [];
  const anims = [];       // petites animations du décor

  // ---- sol ----
  // le sol de la planète (dessin Gemini, répété en miroir pour ne pas voir de raccords)
  const gtex = tex.sol || groundTexture();
  if (tex.sol) { gtex.wrapS = gtex.wrapT = THREE.MirroredRepeatWrapping; gtex.needsUpdate = true; }
  gtex.repeat.set(tex.sol ? 15 : 26, tex.sol ? 15 : 26);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshLambertMaterial({ map: gtex }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  // l'extérieur de la zone est plus sombre (brume puante)
  const outside = new THREE.Mesh(new THREE.RingGeometry(ARENA + 3, 260, 64, 1),
    new THREE.MeshBasicMaterial({ color: 0x150a1f, transparent: true, opacity: 0.55, depthWrite: false }));
  outside.rotation.x = -Math.PI / 2; outside.position.y = 0.02;
  scene.add(outside);
  const edge = new THREE.Mesh(new THREE.RingGeometry(ARENA + 0.2, ARENA + 3, 64, 1),
    new THREE.MeshBasicMaterial({ color: 0x150a1f, transparent: true, opacity: 0.28, depthWrite: false }));
  edge.rotation.x = -Math.PI / 2; edge.position.y = 0.02;
  scene.add(edge);

  const stat = new THREE.Group(); // tout ce qui ne bouge pas : fusionné à la fin
  scene.add(stat);
  const M = {
    crater: new THREE.MeshBasicMaterial({ color: 0x3d2547, transparent: true, opacity: 0.45, depthWrite: false }),
    crack: new THREE.MeshBasicMaterial({ color: 0x2b1a14 }),
    hole: new THREE.MeshBasicMaterial({ color: 0x1d0f17 }),
    rim: new THREE.MeshBasicMaterial({ color: 0x3e5a1f }),
    pool: new THREE.MeshToonMaterial({ color: 0x79b53a, emissive: 0x2c4a10 }),
    shine: new THREE.MeshBasicMaterial({ color: 0xc8f07a, transparent: true, opacity: 0.6 }),
  };

  const free = (x, z, r) => {
    if (Math.hypot(x, z) < 9) return false;
    for (const c of colliders) if (Math.hypot(c.x - x, c.z - z) < c.r + r + 1.5) return false;
    for (const s of swamps) if (Math.hypot(s.x - x, s.z - z) < s.r + r + 1) return false;
    for (const g of geysers) if (Math.hypot(g.x - x, g.z - z) < r + 3) return false;
    return true;
  };
  const place = (r, fn, tries = 60, minD = 10, maxD = ARENA - 4) => {
    for (let i = 0; i < tries; i++) {
      const a = R() * Math.PI * 2, d = minD + R() * (maxD - minD);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (free(x, z, r)) { fn(x, z); return true; }
    }
    return false;
  };

  // ---- le vaisseau de Lucas, écrasé (à moitié planté dans le sol, une aile tordue) ----
  let rocket;
  if (tex.vais_1) {
    // le dessin Gemini du vaisseau écrasé, posé sur sa flaque
    rocket = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.vais_1, alphaTest: 0.5 }));
    const w = 11;
    rocket.scale.set(w, w * tex.vais_1.image.height / tex.vais_1.image.width, 1);
    rocket.center.set(0.5, 0.08);
    rocket.position.set(-3.5 + 2.4, 0, -5.5 + 2.4);
    scene.add(rocket);
    rocket.userData.engine = new THREE.Object3D();
    rocket.userData.engine.position.set(-5.6, 2.6, -7.4);
    scene.add(rocket.userData.engine);
  } else {
    rocket = makeShip({ hull: 0xf3efe6, wing: 0xdcd5c6, accent: 0xe0402f, stripe: 0xe0402f, broken: true });
    rocket.position.set(-3.5, 1.0, -5.5);
    rocket.rotation.set(0.22, 0.65, -0.18);
    stat.add(rocket);
  }
  // le vaisseau de Lucas en 6 étapes de réparation (planche Gemini) : une étape par pièce retrouvée
  const shipMats = {};
  let shipStage = 0;
  function setShipStage(parts) {
    if (!tex.qg_1 || !rocket.isSprite) return;
    const n = Math.max(1, Math.min(6, parts + 1)), t = tex['qg_' + n];
    shipStage = n;
    rocket.material = shipMats[n] || (shipMats[n] = new THREE.SpriteMaterial({ map: t, alphaTest: 0.5 }));
    const w = 10.5;
    rocket.scale.set(w, w * t.image.height / t.image.width, 1);
    rocket.center.set(0.5, 0.1);
  }
  colliders.push({ x: -5.2, z: -4.2, r: 1.7 }, { x: -3.5, z: -5.5, r: 1.8 }, { x: -1.8, z: -6.8, r: 1.6 },
    { x: -1.7, z: -3.1, r: 1.1 }, { x: -5.3, z: -7.9, r: 1.1 });
  rocket.updateMatrixWorld(true);
  const nozzleWorld = new THREE.Vector3();
  rocket.userData.engine.getWorldPosition(nozzleWorld);
  anims.push((dt, t) => {
    if (Math.random() < dt * (shipStage >= 5 ? 0 : shipStage >= 3 ? 3 : 9)) {
      particles.emit(nozzleWorld.x, nozzleWorld.y + 0.3, nozzleWorld.z, Math.random() < 0.5 ? 0x8a8a8a : 0x5c5c5c,
        { vx: (Math.random() - 0.5) * 0.6, vy: 1.6 + Math.random(), vz: (Math.random() - 0.5) * 0.6, life: 2.2, s0: 0.6, s1: 2.6, alpha: 0.6, drag: 0.4 });
    }
  });

  // ---- geysers de gaz vert ----
  for (let i = 0; i < 7; i++) {
    place(2, (x, z) => {
      const grp = new THREE.Group();
      const crack = new THREE.Mesh(new THREE.CircleGeometry(1.3, 7), M.crack);
      crack.rotation.x = -Math.PI / 2; crack.position.y = 0.04; crack.scale.set(1, 0.7, 1);
      grp.add(crack);
      const glow = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.95, 7), new THREE.MeshBasicMaterial({ color: 0x9cff3a }));
      glow.rotation.x = -Math.PI / 2; glow.position.set(x, 0.05, z);
      scene.add(glow);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + R();
        const rock = toon(new THREE.DodecahedronGeometry(0.35 + R() * 0.25, 0), 0x6e4a3a, { outline: 0.05 });
        rock.position.set(Math.cos(a) * 1.4, 0.15, Math.sin(a) * 1.1);
        grp.add(rock);
      }
      grp.position.set(x, 0, z);
      stat.add(grp);
      geysers.push({ x, z, r: 2.6, t: R() * 5, period: 5 + R() * 3, state: 'idle', glow, tick: 0 });
    });
  }

  // ---- marais qui font des bulles ----
  const bubbleGeo = new THREE.SphereGeometry(0.22, 12, 8);
  for (let i = 0; i < 6; i++) {
    const r = 2.6 + R() * 2.2;
    place(r, (x, z) => {
      const rim = new THREE.Mesh(new THREE.CircleGeometry(r + 0.45, 32), M.rim);
      rim.rotation.x = -Math.PI / 2; rim.position.set(x, 0.035, z);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(r, 32), M.pool);
      pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.05, z); pool.receiveShadow = true;
      const shine = new THREE.Mesh(new THREE.CircleGeometry(r * 0.35, 20), M.shine);
      shine.rotation.x = -Math.PI / 2; shine.position.set(x - r * 0.3, 0.06, z - r * 0.3); shine.scale.set(1.4, 0.7, 1);
      stat.add(rim, pool, shine);
      const bubbles = [];
      for (let k = 0; k < 5; k++) {
        const b = toon(bubbleGeo, 0xa6e05a, { outline: 0.03, shadow: false });
        b.position.set(x, 0.05, z);
        scene.add(b);
        bubbles.push({ m: b, t: R() * 2, bx: 0, bz: 0 });
      }
      swamps.push({ x, z, r, bubbles });
    }, 80, 10, ARENA - 6);
  }
  anims.push((dt) => {
    for (const s of swamps) for (const b of s.bubbles) {
      b.t -= dt;
      if (b.t < 0) {
        if (b.m.visible && b.m.scale.x > 0.5) particles.emit(b.m.position.x, 0.3, b.m.position.z, 0xa6e05a, { vy: 0.8, life: 0.6, s0: 0.3, s1: 0.9, alpha: 0.6 });
        b.t = 1.4 + Math.random() * 1.6;
        const a = Math.random() * 6.28, d = Math.random() * s.r * 0.8;
        b.bx = s.x + Math.cos(a) * d; b.bz = s.z + Math.sin(a) * d;
      }
      const k = 1 - b.t / 3;
      const sc = Math.max(0.05, Math.min(1.4, k * 2.2));
      b.m.position.set(b.bx, 0.06, b.bz);
      b.m.scale.setScalar(sc);
    }
  });

  // ---- champignons violets ----
  const stemGeo = new THREE.CylinderGeometry(0.22, 0.34, 1.2, 12);
  const capGeo = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const spotGeo = new THREE.SphereGeometry(0.16, 8, 6);
  const mushrooms = [];
  // un objet du décor dessiné (planche Gemini) : posé sur sa petite plaque de sol
  const decoMats = {};
  const decos = [];
  const decoMat = (key) => decoMats[key] || (decoMats[key] = new THREE.SpriteMaterial({ map: tex[key], alphaTest: 0.5 }));
  const deco = (key, x, z, w) => {
    const t = tex[key];
    const s = new THREE.Sprite(decoMat(key));
    s.center.set(0.5, 0.06);
    s.scale.set(w, w * t.image.height / t.image.width, 1);
    s.position.set(x + w * 0.22, 0, z + w * 0.22);
    scene.add(s);
    decos.push({ s, kind: key, w, i: decos.length });
    return s;
  };
  const makeMushroom = (x, z, s, collide = true) => {
    if (tex.dec_1) {
      deco('dec_1', x, z, 3.2 * s);
      if (collide) colliders.push({ x, z, r: 0.75 * s });
      mushrooms.push({ x, z, s: s * 1.6, t: R() * 6 });
      return;
    }
    const grp = new THREE.Group();
    const stem = toon(stemGeo, 0xf1e3c6, { outline: 0.05 });
    stem.position.y = 0.6; grp.add(stem);
    const cap = toon(capGeo, R() < 0.5 ? 0x9a4fd6 : 0xc04fb0, { outline: 0.06 });
    cap.position.y = 1.05; cap.scale.set(0.95, 0.65, 0.95); grp.add(cap);
    for (let k = 0; k < 5; k++) {
      const a = R() * 6.28, h = 0.25 + R() * 0.5;
      const sp = new THREE.Mesh(spotGeo, toonMat(0xfff4e0));
      sp.position.set(Math.cos(a) * 0.9 * Math.cos(h) * 0.95, 1.05 + Math.sin(h) * 0.62, Math.sin(a) * 0.9 * Math.cos(h) * 0.95);
      sp.scale.set(1, 0.5, 1);
      grp.add(sp);
    }
    grp.position.set(x, 0, z);
    grp.scale.setScalar(s);
    grp.rotation.y = R() * 6;
    stat.add(grp);
    if (collide) colliders.push({ x, z, r: 0.75 * s });
    mushrooms.push({ x, z, s, t: R() * 6 });
  };
  for (let i = 0; i < 16; i++) place(1.2, (x, z) => makeMushroom(x, z, 0.9 + R() * 0.9));
  anims.push((dt) => {
    for (const m of mushrooms) {
      m.t -= dt;
      if (m.t < 0) {
        m.t = 4 + Math.random() * 6;
        particles.burst(m.x, 1.3 * m.s, m.z, 0xc58bff, 5, 1.2, { life: 1.2, s0: 0.4, s1: 1.5, alpha: 0.55, up: 1 });
      }
    }
  });

  // ---- rochers en forme de crotte ----
  const makePoop = (x, z, s, collide = true) => {
    if (tex.dec_2) {
      deco('dec_2', x, z, 3.1 * s);
      if (collide) colliders.push({ x, z, r: 0.9 * s });
      return;
    }
    const grp = new THREE.Group();
    const col = R() < 0.5 ? 0x7a4a26 : 0x8a5a33;
    const tiers = [[0.95, 0.42], [0.72, 0.36], [0.48, 0.3]];
    let y = 0.3;
    for (const [r, h] of tiers) {
      const t = toon(new THREE.SphereGeometry(r, 16, 10), col, { outline: 0.06 });
      t.scale.set(1, h / r * 1.25, 1);
      t.position.y = y; y += h * 1.25;
      grp.add(t);
    }
    const tip = toon(new THREE.ConeGeometry(0.28, 0.5, 12), col, { outline: 0.05 });
    tip.position.y = y + 0.05; tip.rotation.z = 0.35; grp.add(tip);
    grp.position.set(x, 0, z);
    grp.scale.setScalar(s);
    grp.rotation.y = R() * 6;
    stat.add(grp);
    if (collide) colliders.push({ x, z, r: 0.9 * s });
  };
  for (let i = 0; i < 18; i++) place(1.4, (x, z) => makePoop(x, z, 0.9 + R() * 1.0));

  // ---- plantes à haricots ----
  const podGeo = new THREE.CapsuleGeometry(0.16, 0.5, 4, 8);
  for (let i = 0; i < 12; i++) {
    place(0.8, (x, z) => {
      if (tex.dec_5) { deco('dec_5', x, z, 2.8); colliders.push({ x, z, r: 0.5 }); return; }
      const grp = new THREE.Group();
      const stem = toon(new THREE.CylinderGeometry(0.07, 0.12, 1.8, 8), 0x4f8a2a, { outline: 0.04 });
      stem.position.y = 0.9; grp.add(stem);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * 6.28 + R();
        const pod = toon(podGeo, 0x8fdc3c, { outline: 0.04, emissive: 0x335511 });
        pod.position.set(Math.cos(a) * 0.35, 0.8 + k * 0.28, Math.sin(a) * 0.35);
        pod.rotation.set(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6);
        grp.add(pod);
      }
      const leaf = toon(new THREE.SphereGeometry(0.45, 10, 6), 0x5ea832, { outline: 0.04 });
      leaf.scale.set(1.4, 0.25, 0.8); leaf.position.y = 1.8; grp.add(leaf);
      grp.position.set(x, 0, z);
      stat.add(grp);
      colliders.push({ x, z, r: 0.35 });
    });
  }

  // ---- cristaux, cratères qui fument, vieux squelettes (dessins Gemini) ----
  if (tex.dec_6) {
    for (let i = 0; i < 8; i++) place(1, (x, z) => { deco('dec_6', x, z, 2.8); colliders.push({ x, z, r: 0.8 }); });
    for (let i = 0; i < 6; i++) place(1.2, (x, z) => {
      deco('dec_7', x, z, 3.4);
      anims.push(() => { if (Math.random() < 0.05) particles.emit(x, 0.6, z, 0xdadada, { vy: 1.5, life: 1.6, s0: 0.4, s1: 1.4, alpha: 0.5, drag: 0.5 }); });
    });
    for (let i = 0; i < 3; i++) place(2, (x, z) => { deco('dec_8', x, z, 4.4); colliders.push({ x, z, r: 1.3 }); });
  }

  // ---- bordure : grosse muraille de rochers et champignons géants ----
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * Math.PI * 2 + R() * 0.05;
    const d = ARENA + 1.5 + R() * 3;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (R() < 0.6) makePoop(x, z, 1.8 + R() * 1.4, false); else makeMushroom(x, z, 1.8 + R() * 1.6, false);
  }

  // ---- terriers d'où sortent les monstres (décor seulement) ----
  for (let i = 0; i < 14; i++) {
    place(1.5, (x, z) => {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(1.1, 16), M.hole);
      hole.rotation.x = -Math.PI / 2; hole.position.set(x, 0.045, z); hole.scale.set(1, 0.75, 1);
      stat.add(hole);
      const mound = toon(new THREE.TorusGeometry(1.15, 0.35, 8, 18), 0x6d4a63, { outline: 0.05 });
      mound.rotation.x = -Math.PI / 2; mound.position.set(x, 0.1, z); mound.scale.set(1, 0.75, 0.6);
      stat.add(mound);
    });
  }

  mergeStatic(stat);

  function update(dt, t) {
    for (const a of anims) a(dt, t);
    for (const g of geysers) {
      g.t += dt;
      const ph = g.t % g.period;
      const prev = g.state;
      if (ph > g.period - 1.2) g.state = 'warn';
      else if (ph < 1.4) g.state = 'erupt';
      else g.state = 'idle';
      g.justErupted = prev !== 'erupt' && g.state === 'erupt';
      g.glow.material.color.setHex(g.state === 'warn' ? (Math.floor(t * 10) % 2 ? 0xffff66 : 0x9cff3a) : 0x9cff3a);
      if (g.state === 'warn' && Math.random() < dt * 12) {
        particles.emit(g.x + (Math.random() - 0.5), 0.3, g.z + (Math.random() - 0.5), 0x9cff3a, { vy: 1, life: 0.6, s0: 0.3, s1: 0.8, alpha: 0.7 });
      }
      if (g.state === 'erupt') {
        for (let k = 0; k < 3; k++) {
          particles.emit(g.x + (Math.random() - 0.5) * 0.8, 0.4, g.z + (Math.random() - 0.5) * 0.8, Math.random() < 0.3 ? 0xd8ff7a : 0x7fd62a,
            { vx: (Math.random() - 0.5) * 2, vy: 9 + Math.random() * 5, vz: (Math.random() - 0.5) * 2, life: 1.1, s0: 0.8, s1: 2.6, alpha: 0.8, drag: 1.2 });
        }
      }
    }
  }

  // change le sol (chaque mission peut avoir son terrain)
  // les mondes : à chaque mission son décor (la place des objets ne change pas, seulement leur dessin)
  const THEMES = {
    planete: { sol: 'sol' },
    marais: { sol: 'sol_marais', dec_1: ['dec2_1'], dec_2: ['dec2_4', 'dec_2'], dec_5: ['dec2_2'], dec_6: ['dec2_3'], dec_8: ['dec2_3'] },
    volcan: { sol: 'sol_volcan', dec_1: ['dec2_8'], dec_2: ['dec2_6', 'dec2_5'], dec_5: ['dec2_7'], dec_6: ['dec2_5'], dec_8: ['dec_8'] },
    palais: { sol: 'sol_palais', dec_1: ['pal_2'], dec_2: ['pal_3', 'pal_8', 'pal_2'], dec_5: ['pal_4'], dec_6: ['pal_7'], dec_7: ['pal_6'], dec_8: ['pal_1'] },
  };
  let theme = 'planete';
  function setTheme(name) {
    const T = THEMES[name] || THEMES.planete;
    theme = name;
    setGround(T.sol);
    // les flaques changent selon le monde : marais vert, lave sur le volcan, slime turquoise au palais
    const PC = { planete: [0x79b53a, 0x2c4a10, 0x3e5a1f], marais: [0x4f8a3a, 0x1e3a10, 0x2e3a1a], volcan: [0xff7a1a, 0x8a2a00, 0x5a2a10], palais: [0x5fd0b0, 0x1a5a48, 0xc8a030] }[name] || [0x79b53a, 0x2c4a10, 0x3e5a1f];
    M.pool.color.setHex(PC[0]); M.pool.emissive.setHex(PC[1]); M.rim.color.setHex(PC[2]);
    for (const d of decos) {
      const list = T[d.kind];
      const key = list ? list[d.i % list.length] : d.kind;
      if (!tex[key]) continue;
      d.s.material = decoMat(key);
      d.s.scale.set(d.w, d.w * tex[key].image.height / tex[key].image.width, 1);
    }
  }

  function setGround(key) {
    const t = tex[key] || tex.sol;
    if (!t || ground.material.map === t) return;
    t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
    t.repeat.set(15, 15);
    t.needsUpdate = true;
    ground.material.map = t;
    ground.material.needsUpdate = true;
  }

  return { colliders, geysers, swamps, rocket, update, setGround, setTheme, setShipStage };
}

// Regroupe tous les morceaux du décor qui partagent la même peinture en un seul objet
// (des centaines d'objets deviennent une vingtaine : beaucoup plus rapide sur téléphone).
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    const key = o.material.uuid + (g.index ? 'i' : 'n') + (o.castShadow ? 's' : '');
    if (!groups.has(key)) groups.set(key, { mat: o.material, cast: o.castShadow, geos: [] });
    groups.get(key).geos.push(g);
  });
  root.clear();
  root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.scale.set(1, 1, 1);
  for (const { mat, cast, geos } of groups.values()) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = cast; m.receiveShadow = true;
    root.add(m);
  }
}

// La pièce de fusée à ramasser (petit moteur brillant).
export function makeRocketPart(kind) {
  const grp = new THREE.Group();
  const red = 0xe0402f, metal = 0xc9ccd6;
  if (kind === 0) { // réacteur
    const c = toon(new THREE.CylinderGeometry(0.55, 0.7, 1.1, 18), metal); grp.add(c);
    const n = toon(new THREE.CylinderGeometry(0.75, 0.45, 0.5, 18), 0x555560); n.position.y = -0.75; grp.add(n);
    const r = toon(new THREE.TorusGeometry(0.6, 0.1, 8, 20), red); r.rotation.x = Math.PI / 2; r.position.y = 0.3; grp.add(r);
  } else if (kind === 1) { // aileron
    const f = toon(new THREE.BoxGeometry(0.2, 1.4, 1.2), red); grp.add(f);
    const b = toon(new THREE.CylinderGeometry(0.15, 0.15, 1.5, 10), metal); b.position.z = -0.6; grp.add(b);
  } else if (kind === 2) { // hublot
    const r = toon(new THREE.TorusGeometry(0.6, 0.18, 10, 24), metal); grp.add(r);
    const g = toon(new THREE.CircleGeometry(0.6, 24), 0x6fd3ff, { outline: 0, emissive: 0x2288aa }); grp.add(g);
  } else if (kind === 3) { // antenne
    const s = toon(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8), metal); grp.add(s);
    const b = toon(new THREE.SphereGeometry(0.25, 12, 8), red, { emissive: 0x661111 }); b.position.y = 0.85; grp.add(b);
    const d = toon(new THREE.SphereGeometry(0.55, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), metal); d.rotation.x = Math.PI; d.position.y = -0.6; grp.add(d);
  } else { // cône du nez
    const c = toon(new THREE.ConeGeometry(0.75, 1.5, 20), red); grp.add(c);
    const r = toon(new THREE.CylinderGeometry(0.78, 0.78, 0.25, 20), metal); r.position.y = -0.85; grp.add(r);
  }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 14, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 6;
  const holder = new THREE.Group();
  holder.add(grp, beam);
  holder.userData.spin = grp;
  return holder;
}

// Un vaisseau spatial en jouet (celui de Lucas, ou celui de la Flotte qui apporte des renforts)
export function makeShip({ hull = 0x8fa3b8, wing = 0x6b7c90, accent = 0x5a6878, stripe = 0xffd23f, broken = false } = {}) {
  const g = new THREE.Group();
  const add = (geo, col, x, y, z, o = {}) => { const m = toon(geo, col, o); m.position.set(x, y, z); g.add(m); return m; };
  add(new THREE.BoxGeometry(5.2, 1.5, 2.4), hull, 0, 0, 0);
  const nose = add(new THREE.ConeGeometry(1.25, 2.2, 4), hull, 3.6, 0, 0);
  nose.rotation.set(Math.PI / 4, 0, -Math.PI / 2);
  add(new THREE.SphereGeometry(0.75, 16, 10), 0x6fd3ff, 2.4, 0.75, 0, { emissive: 0x226688 }).scale.set(1.4, 0.7, 1);
  const wings = add(new THREE.BoxGeometry(2.2, 0.3, 7.2), wing, -0.4, 0.1, 0);
  if (broken) { wings.rotation.x = 0.25; wings.rotation.y = 0.12; }
  add(new THREE.BoxGeometry(5.3, 0.25, 2.5), stripe, 0, -0.35, 0, { outline: 0.03 });
  add(new THREE.BoxGeometry(1.4, 1.6, 0.25), accent, -2.4, 1.2, 0);
  for (const z of [-3, 3]) {
    add(new THREE.CylinderGeometry(0.55, 0.65, 1.6, 14), accent, -0.4, -0.3, z);
    add(new THREE.CylinderGeometry(0.45, 0.45, 0.2, 14), broken ? 0x3a3a3a : 0xff9a3a, -0.4, -1.15, z, { outline: 0, emissive: broken ? 0 : 0xff6a00 });
  }
  if (!broken) for (const [x, z] of [[1.6, 1], [1.6, -1], [-1.6, 1], [-1.6, -1]]) add(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6), 0x4a4a52, x, -1.3, z, { outline: 0.02 });
  const engine = new THREE.Object3D(); engine.position.set(-2.8, 0.2, 0); g.add(engine);
  g.userData.engine = engine;
  return g;
}

// Le vaisseau de la Flotte dessiné (en vol / posé, rampe ouverte), avec son ombre au sol.
// Son « y » est l'altitude : à 2.4 il est posé.
export function makeDropshipSprite(tex) {
  const holder = new THREE.Group();
  const fly = tex.vais_3, land = tex.vais_4;
  const mat = new THREE.SpriteMaterial({ map: fly, alphaTest: 0.5 });
  const spr = new THREE.Sprite(mat);
  const w = 8.5;
  spr.center.set(0.5, 0.06);
  spr.position.y = -2.4;
  holder.add(spr);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(3, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
  shadow.renderOrder = 1;
  holder.add(shadow);
  spr.onBeforeRender = () => {
    const alt = holder.position.y;
    const landed = alt < 2.7;
    const t = landed ? land : fly;
    if (mat.map !== t) mat.map = t;
    spr.scale.set(w, w * t.image.height / t.image.width, 1);
    shadow.position.y = -alt + 0.05;
    const k = Math.max(0.3, 1 - (alt - 2.4) / 30);
    shadow.scale.set(k, 1, k);
    shadow.material.opacity = 0.35 * k;
  };
  return holder;
}

export function makeCrown() {
  const grp = new THREE.Group();
  const gold = 0xffc61a;
  const band = toon(new THREE.CylinderGeometry(1, 1, 0.55, 20, 1, true), gold, { outline: 0.06 });
  band.children[0].material = band.children[0].material.clone();
  band.children[0].material.side = THREE.DoubleSide;
  grp.add(band);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const sp = toon(new THREE.ConeGeometry(0.22, 0.6, 8), gold, { outline: 0.05 });
    sp.position.set(Math.cos(a) * 0.92, 0.55, Math.sin(a) * 0.92);
    grp.add(sp);
    const gem = toon(new THREE.SphereGeometry(0.11, 8, 6), i % 2 ? 0xff3b6b : 0x38d6ff, { outline: 0.03, emissive: 0x220011 });
    gem.position.set(Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0);
    grp.add(gem);
  }
  return grp;
}

export { INK };

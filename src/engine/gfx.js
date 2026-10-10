// Outils graphiques : chargement des dessins, textures dessinées dans le code, style cartoon 3D.
import * as THREE from 'three';

export const MONSTER_IDS = ['08', '38', '12', '23', '13', '16', '22', '45', '74', '62', '63', '44', '37',
  '118', '29', '84', '114', '113', '39', '111', '64', '33', '90', '70', '01',
  '34', '26', '137', '109', '117', '129', '28', '127', '57', '60', '67'];

export const INK = 0x3a2312;

export async function loadTextures(onProgress) {
  const loader = new THREE.TextureLoader();
  const list = [];
  for (const id of MONSTER_IDS) list.push(['m' + id, `assets/monsters/m${id}.webp`]);
  for (const n of ['game_lucas_soldier', 'game_lucas_jump', 'item_dog_walk_1', 'item_dog_walk_2', 'item_dog_walk_3',
    'item_dog_walk_4', 'item_spray', 'gas_boom']) list.push([n, `assets/sprites/${n}.webp`]);
  // dessins des planches Gemini
  for (let i = 1; i <= 10; i++) list.push(['lucas_' + i, `assets/lucas/lucas_${i}.webp`]);
  for (let i = 1; i <= 5; i++) list.push(['petaros_' + i, `assets/boss/petaros_${i}.webp`]);
  for (let i = 1; i <= 11; i++) list.push(['dos_' + i, `assets/lucas_dos/dos_${i}.webp`]);
  for (let i = 1; i <= 8; i++) list.push(['marche_' + i, `assets/lucas_marche/marche_${i}.webp`]);
  for (let i = 1; i <= 8; i++) list.push(['bat_' + i, `assets/base/bat_${i}.webp`], ['veh_' + i, `assets/base/veh_${i}.webp`]);
  for (let i = 1; i <= 6; i++) list.push(['vais_' + i, `assets/vaisseaux/vais_${i}.webp`]);
  for (let i = 1; i <= 12; i++) list.push(['mon_' + i, `assets/monstres3/mon_${i}.webp`]);
  for (let i = 1; i <= 8; i++) list.push(['dec_' + i, `assets/decor/dec_${i}.webp`], ['fx_' + i, `assets/effets/fx_${i}.webp`]);
  list.push(['sol', 'assets/sol.webp'], ['sol_marais', 'assets/sol_marais.webp'], ['sol_volcan', 'assets/sol_volcan.webp'], ['sol_palais', 'assets/sol_palais.webp']);
  for (let i = 1; i <= 8; i++) list.push(['exp_' + i, `assets/explosion/exp_${i}.webp`], ['tank_' + i, `assets/char8/tank_${i}.webp`], ['niv_' + Math.min(6, i), `assets/niveaux/niv_${Math.min(6, i)}.webp`]);
  for (let i = 1; i <= 12; i++) list.push(['pr_' + i, `assets/proute/pr_${i}.webp`]);
  for (let i = 1; i <= 8; i++) list.push(['dec2_' + i, `assets/decor2/dec2_${i}.webp`], ['pal_' + i, `assets/palais/pal_${i}.webp`]);
  for (let i = 1; i <= 8; i++) list.push(['bug_' + i, `assets/insectes/bug_${i}.webp`], ['gar_' + i, `assets/gardiens/gar_${i}.webp`], ['bat2_' + i, `assets/base2/bat2_${i}.webp`]);
  for (let i = 1; i <= 12; i++) list.push(['obj_' + i, `assets/objets/obj_${i}.webp`]);
  for (let i = 1; i <= 12; i++) list.push(['vo_' + i, `assets/vomi/vo_${i}.webp`], ['cr_' + i, `assets/crotte/cr_${i}.webp`], ['pt_' + i, `assets/petaros2/pt_${i}.webp`]);
  for (const [d, p] of [['ogre', 'og'], ['fourmi', 'an'], ['mouche', 'mo'], ['scarabee', 'sc'], ['crapaud', 'cp']]) for (let i = 1; i <= 12; i++) list.push([p + '_' + i, `assets/${d}/${p}_${i}.webp`]);
  for (let i = 1; i <= 6; i++) list.push(['qg_' + i, `assets/qg/qg_${i}.webp`]);
  for (let i = 1; i <= 8; i++) list.push(['nv_' + i, `assets/niveaux2/nv_${i}.webp`], ['ti_' + i, `assets/tirs/ti_${i}.webp`]);
  for (let i = 1; i <= 8; i++) list.push(['rec_' + i, `assets/recolteur/rec_${i}.webp`], ['dog_' + i, `assets/chien8/dog_${i}.webp`], ['nid_' + i, `assets/nid/nid_${i}.webp`]);
  const out = {};
  const metas = await Promise.all(['assets/lucas/lucas.json', 'assets/boss/petaros.json', 'assets/lucas_dos/dos.json', 'assets/lucas_marche/marche.json', 'assets/monstres3/mon.json', 'assets/insectes/bug.json', 'assets/gardiens/gar.json', 'assets/proute/pr.json', 'assets/vomi/vo.json', 'assets/crotte/cr.json', 'assets/petaros2/pt.json', 'assets/nid/nid.json', 'assets/chien8/dog.json', 'assets/recolteur/rec.json', 'assets/ogre/og.json', 'assets/fourmi/an.json', 'assets/mouche/mo.json', 'assets/scarabee/sc.json', 'assets/crapaud/cp.json'].map((u) => fetch(u).then((r) => r.json())));
  out.meta = Object.assign({}, ...metas);
  let done = 0;
  await Promise.all(list.map(([k, url]) => new Promise((res) => {
    loader.load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      out[k] = t;
      done++; onProgress && onProgress(done / list.length);
      res();
    }, undefined, () => { console.warn('image manquante', url); done++; res(); });
  })));
  return out;
}

export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 8;
  return t;
}

// Petit générateur pseudo-aléatoire répétable (pour que la carte soit toujours la même).
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function groundTexture() {
  const R = rng(7);
  return canvasTex(1024, 1024, (g, W) => {
    g.fillStyle = '#7b5a86';
    g.fillRect(0, 0, W, W);
    const wrapDraw = (x, y, r, fn) => {
      for (const dx of [-W, 0, W]) for (const dy of [-W, 0, W]) {
        if (x + dx + r < 0 || x + dx - r > W || y + dy + r < 0 || y + dy - r > W) continue;
        fn(x + dx, y + dy);
      }
    };
    const blob = (x, y, r, col, a) => wrapDraw(x, y, r, (X, Y) => {
      const gr = g.createRadialGradient(X, Y, 0, X, Y, r);
      gr.addColorStop(0, `rgba(${col},${a})`);
      gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(X, Y, r, 0, Math.PI * 2); g.fill();
    });
    for (let i = 0; i < 260; i++) blob(R() * W, R() * W, 40 + R() * 130, R() < 0.5 ? '104,140,70' : '96,64,120', 0.35);
    for (let i = 0; i < 200; i++) blob(R() * W, R() * W, 20 + R() * 50, R() < 0.5 ? '150,190,80' : '140,100,150', 0.3);
    // cratères
    for (let i = 0; i < 9; i++) {
      const x = R() * W, y = R() * W, r = 16 + R() * 30;
      wrapDraw(x, y, r * 1.4, (X, Y) => {
        g.fillStyle = 'rgba(60,35,70,.4)'; g.beginPath(); g.ellipse(X, Y, r, r * 0.8, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(200,170,210,.35)'; g.lineWidth = 4; g.beginPath(); g.ellipse(X, Y + 2, r * 1.08, r * 0.86, 0, 0.2, Math.PI - 0.2); g.stroke();
        g.strokeStyle = 'rgba(40,20,40,.5)'; g.lineWidth = 3; g.beginPath(); g.ellipse(X, Y, r, r * 0.8, 0, Math.PI + 0.3, -0.3); g.stroke();
      });
    }
    // cailloux et points
    for (let i = 0; i < 5000; i++) {
      const x = R() * W, y = R() * W, r = 0.8 + R() * 2.2;
      g.fillStyle = R() < 0.5 ? 'rgba(40,25,50,.35)' : 'rgba(210,190,220,.25)';
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 22; i++) {
      const x = R() * W, y = R() * W, r = 3 + R() * 5;
      wrapDraw(x, y, r + 3, (X, Y) => {
        g.fillStyle = '#5a3e60'; g.beginPath(); g.ellipse(X, Y + 2, r, r * 0.7, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#a58aad'; g.beginPath(); g.ellipse(X, Y, r, r * 0.7, 0, 0, Math.PI * 2); g.fill();
      });
    }
  }, true);
}

export function puffTexture() {
  return canvasTex(128, 128, (g) => {
    const lumps = [[64, 70, 40], [44, 60, 28], [84, 58, 30], [64, 46, 30], [50, 82, 24], [80, 82, 24]];
    for (const [x, y, r] of lumps) {
      const gr = g.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.7, 'rgba(225,225,225,.95)');
      gr.addColorStop(1, 'rgba(200,200,200,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  });
}

export function blobTexture() {
  return canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,.5)');
    gr.addColorStop(0.6, 'rgba(0,0,0,.32)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
}

export function ringTexture() {
  return canvasTex(128, 128, (g) => {
    g.strokeStyle = '#ff3b30'; g.lineWidth = 9;
    g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 6;
    g.beginPath(); g.moveTo(64, 20); g.lineTo(64, 108); g.moveTo(20, 64); g.lineTo(108, 64); g.stroke();
    g.fillStyle = 'rgba(255,59,48,.25)'; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.fill();
  });
}

export function emojiTexture(emoji, size = 128) {
  return canvasTex(size, size, (g) => {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${size * 0.8}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
    g.fillText(emoji, size / 2, size / 2 + size * 0.06);
  });
}

export function wordTexture(word, color) {
  return canvasTex(256, 96, (g) => {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '64px "Luckiest Guy", sans-serif';
    g.lineJoin = 'round';
    g.lineWidth = 14; g.strokeStyle = '#3a2312'; g.strokeText(word, 128, 52);
    g.fillStyle = color; g.fillText(word, 128, 52);
  });
}

// ---------- style cartoon (ombrage en aplats + contour marron) ----------
export const gradMap = (() => {
  const t = new THREE.DataTexture(new Uint8Array([95, 175, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const matCache = new Map();
export function toonMat(color, emissive = 0) {
  const k = color + ':' + emissive;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshToonMaterial({ color, gradientMap: gradMap, emissive, emissiveIntensity: emissive ? 0.35 : 0 }));
  return matCache.get(k);
}
export const outlineMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });

export function outlineGeo(geo, thick) {
  const g = geo.clone();
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i, p.getX(i) + n.getX(i) * thick, p.getY(i) + n.getY(i) * thick, p.getZ(i) + n.getZ(i) * thick);
  }
  return g;
}

// Un objet 3D avec son contour foncé, comme dans les dessins de Pokepetro.
export function toon(geo, color, { outline = 0.06, shadow = true, emissive = 0 } = {}) {
  const grp = new THREE.Group();
  const m = new THREE.Mesh(geo, toonMat(color, emissive));
  m.castShadow = shadow; m.receiveShadow = true;
  grp.add(m);
  if (outline) grp.add(new THREE.Mesh(outlineGeo(geo, outline), outlineMat));
  return grp;
}

// ---------- beaucoup d'objets identiques en un seul dessin (rapide sur téléphone) ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export class InstPool {
  constructor(scene, geo, mat, cap, castShadow = false) {
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = castShadow;
    this.mesh.count = 0;
    this.cap = cap;
    this.n = 0;
    scene.add(this.mesh);
  }
  begin() { this.n = 0; }
  push(x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) {
    if (this.n >= this.cap) return;
    _e.set(rx, ry, rz); _q.setFromEuler(_e);
    _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
    this.mesh.setMatrixAt(this.n++, _m);
  }
  end() { this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; }
}

// ---------- nuages de gaz (particules) ----------
const _c = new THREE.Color();
export class Particles {
  constructor(scene, tex, cap = 700) {
    this.cap = cap;
    this.list = [];
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage);
    this.aRot = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iPos', this.aPos);
    geo.setAttribute('iSize', this.aSize);
    geo.setAttribute('iRot', this.aRot);
    geo.setAttribute('iCol', this.aCol);
    geo.instanceCount = 0;
    this.geo = geo;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex } },
      vertexShader: `
        attribute vec3 iPos; attribute float iSize; attribute float iRot; attribute vec4 iCol;
        varying vec2 vUv; varying vec4 vCol;
        void main() {
          vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
          float c = cos(iRot), s = sin(iRot);
          mv.xy += vec2(c * position.x - s * position.y, s * position.x + c * position.y) * iSize;
          gl_Position = projectionMatrix * mv;
          vUv = uv; vCol = iCol;
        }`,
      fragmentShader: `
        uniform sampler2D map; varying vec2 vUv; varying vec4 vCol;
        void main() {
          vec4 t = texture2D(map, vUv);
          float a = t.a * vCol.a;
          if (a < 0.02) discard;
          gl_FragColor = vec4(vCol.rgb * mix(0.78, 1.0, t.r), a);
        }`,
      transparent: true, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    scene.add(this.mesh);
  }

  // couleur en hexadécimal, vitesse, durée de vie, taille de départ -> taille de fin
  emit(x, y, z, color, { vx = 0, vy = 0, vz = 0, life = 0.8, s0 = 0.5, s1 = 1.4, alpha = 0.9, grav = 0, drag = 1.5 } = {}) {
    if (this.list.length >= this.cap) this.list.shift();
    const c = _c.setHex(color, THREE.LinearSRGBColorSpace);
    this.list.push({ x, y, z, vx, vy, vz, life, max: life, s0, s1, a: alpha, r: c.r, g: c.g, b: c.b, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 2, grav, drag });
  }

  burst(x, y, z, color, n, speed, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6);
      this.emit(x, y, z, color, { vx: Math.cos(a) * s, vy: (opts.up ?? 1) * (0.5 + Math.random()) * speed * 0.5, vz: Math.sin(a) * s, ...opts });
    }
  }

  update(dt) {
    const L = this.list;
    let j = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vz *= k; p.vy = p.vy * k - p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.rot += p.vr * dt;
      L[j++] = p;
    }
    L.length = j;
    for (let i = 0; i < j; i++) {
      const p = L[i], t = 1 - p.life / p.max;
      this.aPos.setXYZ(i, p.x, p.y, p.z);
      this.aSize.setX(i, p.s0 + (p.s1 - p.s0) * t);
      this.aRot.setX(i, p.rot);
      this.aCol.setXYZW(i, p.r, p.g, p.b, p.a * (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85));
    }
    this.geo.instanceCount = j;
    this.aPos.needsUpdate = this.aSize.needsUpdate = this.aRot.needsUpdate = this.aCol.needsUpdate = true;
  }

  clear() { this.list.length = 0; }
}

// 8 directions à l'écran (vue isométrique) pour un déplacement au sol (dx, dz) :
// 0 bas, 1 bas-droite, 2 droite, 3 haut-droite, 4 haut, 5 haut-gauche, 6 gauche, 7 bas-gauche
export function dir8(dx, dz) {
  const sx = (dx - dz) * Math.SQRT1_2, sy = -(dx + dz) * Math.SQRT1_2;
  const oct = ((Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) % 8) + 8) % 8; // 0 = droite, 2 = haut
  return [2, 3, 4, 5, 6, 7, 0, 1][oct];
}
// quel dessin (et retourné ou pas) pour chaque direction ; les planches Gemini ne suivent pas toujours l'ordre demandé
export const DOG8 = [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 1], [7, 0], [8, 0]];
export const REC8 = [[1, 0], [2, 1], [3, 1], [4, 0], [5, 0], [4, 1], [3, 0], [2, 0]];

// Matériaux de « sprite » (dessin plat toujours tourné vers la caméra), à l'endroit et retourné.
export function spriteMats(tex, meta) {
  const flip = tex.clone();
  flip.repeat.x = -1; flip.offset.x = 1;
  flip.needsUpdate = true;
  const mk = (map, bright) => {
    const m = new THREE.SpriteMaterial({ map, alphaTest: 0.5, transparent: false });
    if (bright) m.color.setRGB(3.5, 3.5, 3.5);
    return m;
  };
  return { L: mk(tex), R: mk(flip), fL: mk(tex, true), fR: mk(flip, true), aspect: tex.image.width / tex.image.height,
    w: meta ? meta.w : tex.image.width, h: meta ? meta.h : tex.image.height, ax: meta ? meta.ax : 0.5 };
}

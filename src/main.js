// Démarrage : la 3D, le mode « téléphone Android », les commandes, les menus.
import * as THREE from 'three';
import { loadTextures } from './engine/gfx.js';
import { loadTrooper } from './entities/hero3d.js';
import { Game, MISSIONS, DIFFS } from './game/game.js';
import { UI } from './ui/ui.js';
import { Sfx } from './engine/audio.js';
import { Trophies } from './game/trophies.js';
import { autoUpdate } from './engine/update.js';

const $ = (id) => document.getElementById(id);

const STORY = [
  { img: 'assets/bd/bd_1.webp', text: 'Lucas a toujours rêvé d’être <b>soldat de l’espace</b>.' },
  { img: 'assets/bd/bd_2.webp', text: 'Le grand jour arrive : il part en mission à bord de son petit vaisseau spatial !' },
  { img: 'assets/bd/bd_3.webp', text: 'Mais le GPS confond « Planète <b>Mars</b> » et « Planète <b>Prout</b> »… Lucas se <b>trompe de route</b> !' },
  { img: 'assets/bd/bd_4.webp', text: 'Atterrissage en catastrophe sur la planète Prout ! Partout, du <b>gaz</b> sort du sol…' },
  { img: 'assets/bd/bd_7.webp', alt: 'assets/portraits/por_1.webp', text: 'Lucas a une idée géniale : ce gaz, c’est un <b>trésor</b> ! De l’énergie pour toute la Fédération ! Il envoie un <b>SOS</b> à son équipe : « Venez m’aider à construire une base ! »' },
  { img: 'assets/bd/bd_5.webp', text: 'Mais les <b>monstres Prout</b> ne veulent pas partager leur gaz ! Tiens bon jusqu’à l’arrivée de ton équipe… et méfie-toi de l’<b>Empereur Pétaros</b> !', last: 'À L’ATTAQUE !' },
];
const ENDING = [
  { img: 'assets/portraits/por_7.webp', text: 'L’Empereur Pétaros s’envole en couinant, tout dégonflé. La planète est libre !' },
  { img: 'assets/bd/bd_8.webp', alt: 'assets/menu.webp', text: 'La base est terminée : les <b>pompes à gaz</b> envoient l’énergie de la planète Prout à toute la Fédération !' },
  { img: 'assets/qg/qg_6.webp', text: 'Le vaisseau de Lucas est réparé : les 5 pièces sont en place, il brille comme un neuf !' },
  { img: 'assets/bd/bd_6.webp', text: 'Lucas rentre à la maison en héros. Son équipe garde la base… (et lui sent encore un peu le prout).' },
  { img: 'assets/portraits/por_4.webp', text: '<b>FIN</b><br>Bravo, Soldat Lucas ! Tu es un vrai héros de la Fédération.', last: '🏆 MENU' },
];

// ---------------- sauvegarde dans le téléphone ----------------
const save = { parts: 0, storySeen: false, diff: 'facile' };
try { Object.assign(save, JSON.parse(localStorage.getItem('ls_save') || '{}')); } catch (e) { /* rien */ }
const persist = () => { try { localStorage.setItem('ls_save', JSON.stringify(save)); } catch (e) { /* rien */ } };

// ---------------- 3D ----------------
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // le décor ne bouge pas : on calcule les ombres une seule fois
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1838);
const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 1, 300);

scene.add(new THREE.HemisphereLight(0xeadcff, 0x5a4030, 1.7));
const sun = new THREE.DirectionalLight(0xfff0d0, 2.3);
sun.position.set(-30, 60, -16);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -64, right: 64, top: 64, bottom: -64, near: 1, far: 200 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

// ---------------- mode navigateur / téléphone ----------------
const body = document.body, gameEl = $('game'), device = $('device'), stage = $('stage');
const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())
  || (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820);
if (native) body.classList.add('native');
const view = { mode: 'browser', landscape: false };
try { Object.assign(view, JSON.parse(localStorage.getItem('ls_view') || '{}')); } catch (e) { /* rien */ }

let game = null;
function resize() {
  const w = gameEl.offsetWidth, h = gameEl.offsetHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  gameEl.classList.toggle('narrow', w < 560);
  if (game) game.resize(w, h);
}
function applyView() {
  const phone = view.mode === 'phone' && !native;
  body.classList.toggle('phone', phone);
  body.classList.toggle('landscape', phone && view.landscape);
  document.querySelectorAll('#devbar [data-mode]').forEach((b) => b.classList.toggle('active', b.dataset.mode === view.mode));
  $('rotateBtn').style.display = phone ? '' : 'none';
  if (phone) {
    // taille d'écran d'un téléphone Android courant (412 × 915)
    const W = view.landscape ? 915 : 412, H = view.landscape ? 412 : 915;
    gameEl.style.width = W + 'px'; gameEl.style.height = H + 'px';
    const s = Math.min(1, (stage.clientWidth - 30) / (W + 24), (stage.clientHeight - 30) / (H + 24));
    device.style.transform = `scale(${s})`;
  } else {
    gameEl.style.width = ''; gameEl.style.height = ''; device.style.transform = '';
  }
  resize();
  try { localStorage.setItem('ls_view', JSON.stringify(view)); } catch (e) { /* rien */ }
}
document.querySelectorAll('#devbar [data-mode]').forEach((b) => b.addEventListener('click', () => { view.mode = b.dataset.mode; applyView(); }));
$('rotateBtn').addEventListener('click', () => { view.landscape = !view.landscape; applyView(); });
window.addEventListener('resize', applyView);

// ---------------- commandes ----------------
const keys = new Set();
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'Escape' || e.code === 'KeyP') app.pause();
  if ((e.code === 'Space' || e.code === 'KeyE') && game && game.mode === 'hero') game.useSkill();
  if (e.code === 'KeyR' && game && game.rts && game.rts.place) game.rts.rotateWall();
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

const joy = { on: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
const JR = 55;
function local(e) {
  const r = gameEl.getBoundingClientRect();
  const s = r.width / gameEl.offsetWidth || 1;
  return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
}
// ---- mode base (comme les jeux de stratégie sur téléphone) ----
// glisser = déplacer la carte (avec de l'élan), toucher = choisir / donner un ordre,
// appui long puis glisser (ou Maj + glisser) = cadre pour choisir plusieurs soldats, pincer / molette = zoom
const touches = new Map();
let pan = null, pinch = null;
const camVel = { x: 0, y: 0 }; // élan de la carte (pixels par seconde)
const LONG_PRESS = 380;
const GROUND_UP = { x: -Math.SQRT1_2, z: -Math.SQRT1_2 }, GROUND_RIGHT = { x: Math.SQRT1_2, z: -Math.SQRT1_2 };
function clampCam() {
  const c = game.camTarget, d = Math.hypot(c.x, c.z);
  if (d > 50) { c.x *= 50 / d; c.z *= 50 / d; }
}
function panBy(dxPx, dyPx) {
  const wpp = (camera.right - camera.left) / gameEl.offsetWidth;
  const sinE = 1.3 / Math.hypot(1, 1.3, 1);
  const c = game.camTarget;
  c.x -= GROUND_RIGHT.x * dxPx * wpp - GROUND_UP.x * dyPx * wpp / sinE;
  c.z -= GROUND_RIGHT.z * dxPx * wpp - GROUND_UP.z * dyPx * wpp / sinE;
  clampCam();
}
const rtsOn = () => game && game.mode === 'base' && game.state === 'play';
const GW = () => gameEl.offsetWidth, GH = () => gameEl.offsetHeight;
let mouseAt = null; // pour faire défiler la vue quand la souris touche le bord
const selBox = $('selbox');
function showBox(a, b) {
  selBox.style.left = Math.min(a.x, b.x) + 'px'; selBox.style.top = Math.min(a.y, b.y) + 'px';
  selBox.style.width = Math.abs(a.x - b.x) + 'px'; selBox.style.height = Math.abs(a.y - b.y) + 'px';
  selBox.classList.remove('hidden');
}
gameEl.addEventListener('contextmenu', (e) => { if (rtsOn()) e.preventDefault(); });
gameEl.addEventListener('pointerleave', () => { mouseAt = null; });
gameEl.addEventListener('pointerdown', (e) => {
  if (!rtsOn() || e.target.closest('button, .card, .screen, #rtsPanel, #minimap, #powers')) return;
  const p = local(e);
  touches.set(e.pointerId, p);
  camVel.x = camVel.y = 0;
  try { gameEl.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
  if (e.pointerType === 'mouse' && e.button !== 0) {
    // souris : clic droit = ordre (glisser = déplacer la vue), clic molette = déplacer la vue
    pan = { x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, mode: e.button === 2 ? 'right' : 'pan' };
    return;
  }
  if (touches.size === 1) {
    pan = { x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, mode: e.shiftKey ? 'box' : 'drag', vx: 0, vy: 0, t: performance.now() };
    if (game.rts.power) pan.mode = 'power';
    else if (game.rts.place) { pan.mode = 'paint'; game.rts.placeDown(p.x, p.y, GW(), GH()); }
    else if (pan.mode === 'drag') {
      // appui long sans bouger : on passe en cadre de sélection
      const P = pan;
      P.lp = setTimeout(() => {
        if (pan !== P || P.moved || touches.size !== 1) return;
        P.mode = 'box';
        try { navigator.vibrate && navigator.vibrate(18); } catch (err) { /* rien */ }
        showBox({ x: P.sx - 3, y: P.sy - 3 }, { x: P.sx + 3, y: P.sy + 3 });
      }, LONG_PRESS);
    }
  }
  if (touches.size === 2) {
    // deux doigts : on déplace la vue et on zoome
    if (pan && pan.lp) clearTimeout(pan.lp);
    if (game.rts.place) game.rts.place.down = false;
    selBox.classList.add('hidden');
    const [a, b] = [...touches.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: game.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    pan = null;
  }
});
gameEl.addEventListener('pointermove', (e) => {
  if (!rtsOn()) return;
  const p = local(e);
  if (e.pointerType === 'mouse') mouseAt = p;
  if (!touches.has(e.pointerId)) { if (e.pointerType === 'mouse') game.rts.hover(p.x, p.y, GW(), GH()); return; }
  touches.set(e.pointerId, p);
  if (pinch && touches.size >= 2) {
    const [a, b] = [...touches.values()];
    game.setZoom(pinch.z * pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)));
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    panBy(mx - pinch.mx, my - pinch.my);
    pinch.mx = mx; pinch.my = my;
    return;
  }
  if (!pan) return;
  if (pan.mode === 'paint') { game.rts.placeMove(p.x, p.y, GW(), GH()); return; }
  if (pan.mode === 'power') { game.rts.hover(p.x, p.y, GW(), GH()); return; }
  if (!pan.moved && Math.hypot(p.x - pan.sx, p.y - pan.sy) > 9) { pan.moved = true; clearTimeout(pan.lp); }
  if (!pan.moved) return;
  if (pan.mode === 'right' || pan.mode === 'pan' || pan.mode === 'drag') {
    const now = performance.now(), dts = Math.max(0.001, (now - pan.t) / 1000);
    const dx = p.x - pan.x, dy = p.y - pan.y;
    panBy(dx, dy);
    // vitesse du doigt (lissée) pour l'élan quand on lâche
    pan.vx = pan.vx * 0.6 + (dx / dts) * 0.4; pan.vy = pan.vy * 0.6 + (dy / dts) * 0.4;
    pan.x = p.x; pan.y = p.y; pan.t = now;
    return;
  }
  if (pan.mode === 'box') showBox({ x: pan.sx, y: pan.sy }, p);
});
const rtsUp = (e) => {
  if (!touches.has(e.pointerId)) return;
  const p = touches.get(e.pointerId);
  touches.delete(e.pointerId);
  selBox.classList.add('hidden');
  if (pan) clearTimeout(pan.lp);
  if (pan && rtsOn() && touches.size === 0) {
    if (pan.mode === 'paint') { if (game.rts.place) game.rts.placeUp(); }
    else if (pan.mode === 'box' && pan.moved) game.rts.boxSelect(pan.sx, pan.sy, p.x, p.y, GW(), GH());
    else if (pan.mode === 'right' && !pan.moved) game.rts.order(pan.sx, pan.sy, GW(), GH());
    else if (pan.mode === 'drag' && pan.moved && performance.now() - pan.t < 90) {
      // on a « lancé » la carte : elle continue un peu toute seule
      const v = Math.hypot(pan.vx, pan.vy), max = 2000, k = (v > max ? max / v : 1) * 0.8;
      if (v > 120) { camVel.x = pan.vx * k; camVel.y = pan.vy * k; }
    }
    else if (pan.mode === 'power') game.rts.onTap(p.x, p.y, GW(), GH());
    else if (!pan.moved && (pan.mode === 'box' || pan.mode === 'drag')) game.rts.onTap(pan.sx, pan.sy, GW(), GH());
  }
  if (touches.size < 2) pinch = null;
  if (touches.size === 0) pan = null;
};
gameEl.addEventListener('pointerup', rtsUp);
gameEl.addEventListener('pointercancel', (e) => { touches.delete(e.pointerId); pan = null; pinch = null; selBox.classList.add('hidden'); });
gameEl.addEventListener('wheel', (e) => {
  if (!rtsOn()) return;
  e.preventDefault();
  game.setZoom(game.zoom * (1 + Math.sign(e.deltaY) * 0.1));
}, { passive: false });
// l'élan de la carte après un glissé rapide
function glide(dt) {
  if (!rtsOn()) { camVel.x = camVel.y = 0; return; }
  if (Math.abs(camVel.x) + Math.abs(camVel.y) < 8) return;
  panBy(camVel.x * dt, camVel.y * dt);
  const k = Math.exp(-6 * dt);
  camVel.x *= k; camVel.y *= k;
}
// la souris au bord de l'écran fait défiler la vue (comme dans Command & Conquer)
function edgeScroll(dt) {
  if (!rtsOn() || !mouseAt || touches.size) return;
  const m = 14, W = GW(), H = GH();
  let dx = 0, dy = 0;
  if (mouseAt.x < m) dx = 1; else if (mouseAt.x > W - m) dx = -1;
  if (mouseAt.y < m) dy = 1; else if (mouseAt.y > H - m) dy = -1;
  if (dx || dy) panBy(dx * dt * 700, dy * dt * 700);
}

gameEl.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  if (!game || game.state !== 'play' || game.mode === 'base') return;
  if (e.target.closest('button, .card, .screen')) return;
  const p = local(e);
  Object.assign(joy, { on: true, id: e.pointerId, ox: p.x, oy: p.y, x: 0, y: 0 });
  const j = $('joy');
  j.style.left = p.x + 'px'; j.style.top = p.y + 'px';
  $('joyKnob').style.transform = '';
  j.classList.remove('hidden');
  try { gameEl.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
});
gameEl.addEventListener('pointermove', (e) => {
  if (!joy.on || e.pointerId !== joy.id) return;
  const p = local(e);
  let dx = p.x - joy.ox, dy = p.y - joy.oy;
  const len = Math.hypot(dx, dy);
  if (len > JR * 1.5) { // le joystick suit le doigt s'il va trop loin
    joy.ox += dx / len * (len - JR * 1.5); joy.oy += dy / len * (len - JR * 1.5);
    $('joy').style.left = joy.ox + 'px'; $('joy').style.top = joy.oy + 'px';
    dx = p.x - joy.ox; dy = p.y - joy.oy;
  }
  const l2 = Math.hypot(dx, dy), k = l2 > JR ? JR / l2 : 1;
  joy.x = dx * k / JR; joy.y = dy * k / JR;
  $('joyKnob').style.transform = `translate(${dx * k}px, ${dy * k}px)`;
});
const joyEnd = (e) => {
  if (e.pointerId !== joy.id) return;
  joy.on = false; joy.x = joy.y = 0;
  $('joy').classList.add('hidden');
};
gameEl.addEventListener('pointerup', joyEnd);
gameEl.addEventListener('pointercancel', joyEnd);

function readInput() {
  const k = (...c) => c.some((x) => keys.has(x)) ? 1 : 0;
  let x = k('ArrowRight', 'KeyD') - k('ArrowLeft', 'KeyA');
  let y = k('ArrowDown', 'KeyS') - k('ArrowUp', 'KeyW');
  if (joy.on) { x += joy.x; y += joy.y; }
  game.input.x = Math.max(-1, Math.min(1, x));
  game.input.y = Math.max(-1, Math.min(1, y));
  if (rtsOn() && (x || y)) panBy(-x * 12, -y * 12); // flèches / ZQSD : on déplace la vue
  if (game.state !== 'play' && joy.on) { joy.on = false; $('joy').classList.add('hidden'); }
}

// ---------------- les écrans ----------------
const sfx = new Sfx();
let slides = null, slideIdx = 0, slidesDone = null;
function startStory(list, done) { slides = list; slideIdx = 0; slidesDone = done; ui.story(slides, 0); }
function toMenu() { game.resetEntities(); game.state = 'menu'; ui.title(save); }
function briefing() { ui.briefing(Math.min(save.parts, MISSIONS.length - 1)); }

const trophy = new Trophies(sfx);
const app = {
  sfx,
  trophy,
  action(act) {
    switch (act) {
      case 'play':
        if (save.parts >= MISSIONS.length) { save.parts = 0; persist(); }
        if (!save.storySeen) startStory(STORY, () => { save.storySeen = true; persist(); briefing(); });
        else briefing();
        break;
      case 'story': startStory(STORY, () => { save.storySeen = true; persist(); ui.title(save); }); break;
      case 'storyNext':
        slideIdx++;
        if (slideIdx >= slides.length) slidesDone(); else ui.story(slides, slideIdx);
        break;
      case 'storySkip': slidesDone(); break;
      case 'diff': {
        // Facile → Normal → Difficile → Facile
        const order = Object.keys(DIFFS);
        save.diff = order[(order.indexOf(save.diff) + 1) % order.length]; persist();
        game.diff = DIFFS[save.diff];
        ui.title(save);
        break;
      }
      case 'sound':
        sfx.setOn(!sfx.on);
        if (game.state === 'pause') ui.pauseMenu(); else ui.title(save);
        break;
      case 'go':
        ui.clear();
        game.practice = false;
        game.parts = save.parts;
        game.startMission(Math.min(save.parts, MISSIONS.length - 1));
        sfx.startMusic();
        break;
      case 'resume': ui.clear(); game.state = 'play'; break;
      case 'quit': case 'menu': toMenu(); break;
      case 'retry': ui.clear(); game.parts = save.parts; game.startMission(game.mission); break;
      case 'next': briefing(); break;
      case 'base': {
        // fin de la mission 1 : on reste sur place, les renforts sont là, on construit !
        const lucasPos = { x: game.p.pos.x, z: game.p.pos.z };
        trophy.unlock('ship');
        game.practice = false;
        ui.clear();
        game.parts = save.parts;
        game.startMission(Math.min(save.parts, MISSIONS.length - 1), { fromShip: true, lucasPos });
        break;
      }
      case 'learn':
        // entraînement : le tuto de la base, sans toucher à la progression
        try { localStorage.removeItem('ls_tuto_base'); } catch (e) { /* rien */ }
        ui.clear(); game.practice = true; game.parts = save.parts;
        game.startMission(1, { fromShip: true });
        sfx.startMusic();
        break;
      case 'ending': trophy.unlock('home'); startStory(ENDING, toMenu); break;
      case 'trophies': ui.trophies(trophy); break;
    }
  },
  pause() {
    if (!game) return;
    if (game.rts && (game.rts.place || game.rts.power) && game.state === 'play') { game.rts.cancelPlace(); game.rts.cancelPower(); return; }
    if (game.state === 'play') { game.state = 'pause'; ui.pauseMenu(); }
    else if (game.state === 'pause') { ui.clear(); game.state = 'play'; }
  },
  moveCam(x, z) {
    // la mini-carte est tournée comme la vue : on remet dans le bon sens
    game.camTarget.x = (x + z) * Math.SQRT1_2; game.camTarget.z = (z - x) * Math.SQRT1_2;
    clampCam();
  },
  skill() { if (game) game.useSkill(); },
  missionWon(i) { if (game.practice) return save.parts; save.parts = Math.max(save.parts, i + 1); persist(); return save.parts; },
};
const ui = new UI(app);
document.addEventListener('visibilitychange', () => { if (document.hidden && game && game.state === 'play') app.pause(); });

// ---------------- c'est parti ----------------
async function boot() {
  applyView();
  try { await Promise.all([document.fonts.load('64px "Luckiest Guy"'), document.fonts.load('20px "Black Ops One"')]); } catch (e) { /* rien */ }
  const tex = await loadTextures((k) => { $('loadtext').textContent = `Chargement de la planète Prout… ${Math.round(k * 100)} %`; $('loadfill').style.width = Math.round(k * 90) + '%'; });
  $('loadtext').textContent = 'Chargement de Lucas en 3D…';
  try { tex.trooper = await loadTrooper(); } catch (e) { console.warn('modèle 3D absent', e); }
  game = new Game({ scene, camera, renderer, tex, sfx, ui, trophy });
  game.diff = DIFFS[save.diff] || DIFFS.facile;
  window.__game = game; // pour les tests
  renderer.shadowMap.needsUpdate = true;
  resize();
  ui.title(save);
  $('loading').classList.add('hidden');
  autoUpdate((v, now) => ui.radio(now ? `Mise à jour ${v} : le jeu redémarre…` : `Nouvelle version ${v} téléchargée ! Elle sera là au prochain lancement du jeu.`, 'sg4'),
    () => game.state === 'menu');
  fetch('version.json', { cache: 'no-store' }).then((r) => r.json()).then((v) => { window.GAME_VERSION = v.version; if (game.state === 'menu' && document.querySelector('.menubg')) ui.title(save); }).catch(() => {});
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    readInput();
    edgeScroll(dt);
    glide(dt);
    game.update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
boot().then(() => { $('loadfill').style.width = '100%'; }).catch((e) => { console.error(e); $('loadtext').textContent = 'Oups, erreur : ' + e.message; });

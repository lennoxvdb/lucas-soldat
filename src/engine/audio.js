// Les sons du jeu : de vrais enregistrements (pas de sons électroniques).
// - Prouts : « Gastric Distress » de LFA (OpenGameArt, CC0), faits avec la bouche et les mains.
// - Coups, cloches, pièces, portes, clics : packs Kenney « Impact Sounds », « RPG Audio », « Interface Sounds » (CC0).
// - Musiques (vrais instruments) : Kevin MacLeod (incompetech.com), licence CC BY 4.0 :
//   « Fluffing a Duck » (menu), « Five Armies » (missions héros, action), « The Builder » (base),
//   « Heroic Age » (attaques de monstres sur la base).
// Les fichiers sont dans assets/sons (préparés avec ffmpeg depuis les originaux).

const S = 'assets/sons/';
const FILES = {
  prout: [1, 2, 3, 4, 6, 7, 8, 9, 10, 12].map((i) => `prout_${i}`),
  petitProut: ['prout_4', 'prout_9', 'prout_6', 'prout_10'],
  tir: ['tir_5', 'tir_11', 'tir_9'],
  boom: ['boom'],
  coup: ['impactPunch_medium_000', 'impactPunch_medium_002', 'impactSoft_heavy_001'],
  cloche: ['impactBell_heavy_000', 'impactBell_heavy_002'],
  metal: ['impactMetal_medium_001', 'impactPlate_heavy_000'],
  bois: ['impactWood_heavy_002', 'chop'],
  pieces: ['handleCoins', 'handleCoins2'],
  porte: ['doorOpen_1', 'metalLatch'],
  radio: ['metalClick', 'switch_003'],
  clic: ['click_002', 'toggle_002'],
  pluck: ['pluck_001', 'pluck_002'],
  tissu: ['cloth2', 'drop_002'],
};
const MUSIC = { menu: 'musique_menu.ogg', hero: 'musique_action.ogg', base: 'musique_base.ogg', attaque: 'musique_attaque.ogg' };

export class Sfx {
  constructor() {
    this.ctx = null;
    this.on = localStorage.getItem('ls_sound') !== '0';
    this.last = {};
    this.buf = {};
    this.musicOn = false;
    this.track = null;      // la musique qui joue (élément <audio>, plus léger qu'un son décodé)
    this.trackName = null;
    this.wantMusic = 'menu';
    // appli en arrière-plan : on coupe la musique
    document.addEventListener('visibilitychange', () => {
      if (!this.track) return;
      if (document.hidden) this.track.pause(); else if (this.on) this.track.play().catch(() => {});
    });
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.on ? 0.8 : 0;
      this.master.connect(this.ctx.destination);
      this.load();
      this.music(this.wantMusic);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  // charge tous les petits sons une fois (ils sont très légers)
  load() {
    const names = new Set(Object.values(FILES).flat());
    for (const n of names) {
      fetch(S + n + '.ogg').then((r) => r.arrayBuffer())
        .then((a) => new Promise((ok, ko) => this.ctx.decodeAudioData(a, ok, ko)))
        .then((b) => { this.buf[n] = b; })
        .catch(() => { /* son manquant : tant pis */ });
    }
  }

  setOn(v) {
    this.on = v;
    try { localStorage.setItem('ls_sound', v ? '1' : '0'); } catch (e) { /* rien */ }
    if (this.master) this.master.gain.value = v ? 0.8 : 0;
    if (this.track) { if (v) this.track.play().catch(() => {}); else this.track.pause(); }
  }

  ok(name, ms) {
    if (!this.ctx || !this.on) return false;
    const t = performance.now();
    if (this.last[name] && t - this.last[name] < ms) return false;
    this.last[name] = t;
    return true;
  }

  // joue un son d'une famille (au hasard), avec une hauteur et un volume
  play(group, { rate = 1, vol = 0.6, delay = 0, vary = 0.08 } = {}) {
    if (!this.ctx || !this.on) return;
    const list = FILES[group] || [group];
    const b = this.buf[list[Math.floor(Math.random() * list.length)]];
    if (!b) return;
    const src = this.ctx.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * vary);
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g); g.connect(this.master);
    src.start(this.ctx.currentTime + delay);
  }

  // un vrai prout ! (pitch > 1 = plus aigu et plus court, dur > 0.5 = un gros)
  fart(pitch = 1, dur = 0.3, vol = 0.4) {
    if (!this.ctx || !this.on) return;
    this.play(dur > 0.5 ? 'prout' : 'petitProut', { rate: Math.min(2.2, Math.max(0.5, pitch)), vol: Math.min(1, vol * 1.8) });
  }

  shoot() { if (this.ok('shoot', 90)) this.play('tir', { rate: 1.1, vol: 0.28, vary: 0.15 }); }
  bean() { if (this.ok('bean', 120)) this.play('pieces', { rate: 1.4, vol: 0.25 }); }
  deflate() { if (this.ok('deflate', 70)) this.play('petitProut', { rate: 1.5 + Math.random() * 0.5, vol: 0.35 }); }
  squeak() { if (this.ok('squeak', 120)) this.play('pluck', { rate: 1.3, vol: 0.4 }); }
  hurt() { if (this.ok('hurt', 220)) { this.play('coup', { vol: 0.7 }); this.play('petitProut', { rate: 0.9, vol: 0.35, delay: 0.05 }); } }
  boom() { if (this.ok('boom', 110)) this.play('boom', { vol: 0.75, vary: 0.12 }); }
  strikeWarn() { if (this.ok('warn', 300)) { this.play('cloche', { rate: 1.6, vol: 0.45 }); this.play('cloche', { rate: 1.6, vol: 0.35, delay: 0.25 }); } }
  pickup() { if (this.ok('pickup', 100)) this.play('pieces', { vol: 0.55 }); }
  levelUp() { if (this.ok('lvl', 300)) { this.play('cloche', { rate: 1.2, vol: 0.55 }); this.play('pieces', { vol: 0.5, delay: 0.12 }); } }
  radio() { if (this.ok('radio', 400)) this.play('radio', { vol: 0.5 }); }
  alarm() {
    if (!this.ok('alarm', 1500)) return;
    for (let i = 0; i < 3; i++) this.play('cloche', { rate: 1.05, vol: 0.5, delay: i * 0.38, vary: 0 });
  }
  victory() {
    if (!this.ctx || !this.on) return;
    this.play('cloche', { rate: 1, vol: 0.6, vary: 0 });
    this.play('cloche', { rate: 1.26, vol: 0.55, delay: 0.25, vary: 0 });
    this.play('cloche', { rate: 1.5, vol: 0.6, delay: 0.5, vary: 0 });
    this.play('pieces', { vol: 0.6, delay: 0.7 });
  }
  sad() {
    if (!this.ctx || !this.on) return;
    this.play('prout', { rate: 0.7, vol: 0.8, vary: 0 });
    this.play('tissu', { vol: 0.5, delay: 0.6 });
  }
  click() { if (this.ok('click', 60)) this.play('clic', { vol: 0.5 }); }
  build() { if (this.ok('build', 120)) this.play('bois', { vol: 0.55 }); }
  gate() { if (this.ok('gate', 600)) this.play('porte', { vol: 0.45 }); }

  // --- musique : vrais instruments, une par moment du jeu, qui se fondent l'une dans l'autre ---
  music(name) {
    this.wantMusic = name;
    if (!this.ctx || this.trackName === name) return;
    const old = this.track;
    const a = new Audio(S + MUSIC[name]);
    a.loop = true; a.volume = 0;
    this.track = a; this.trackName = name;
    if (this.on) a.play().catch(() => {});
    const target = name === 'menu' ? 0.45 : (name === 'base' ? 0.32 : 0.38);
    let k = 0;
    clearInterval(this.fadeT);
    this.fadeT = setInterval(() => {
      k = Math.min(1, k + 0.05);
      a.volume = target * k;
      if (old) old.volume = Math.max(0, old.volume * (1 - k));
      if (k >= 1) { clearInterval(this.fadeT); if (old) old.pause(); }
    }, 60);
  }
  startMusic() { this.musicOn = true; }
  stopMusic() { this.musicOn = false; }
}

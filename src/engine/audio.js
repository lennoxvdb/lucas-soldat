// Tous les sons sont fabriqués dans le code (pas de fichiers) : prouts, couinements, musique de marche.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.on = localStorage.getItem('ls_sound') !== '0';
    this.last = {};
    this.musicOn = false;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.on ? 0.55 : 0;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.22;
      this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setOn(v) {
    this.on = v;
    try { localStorage.setItem('ls_sound', v ? '1' : '0'); } catch (e) { /* rien */ }
    if (this.master) this.master.gain.value = v ? 0.55 : 0;
  }

  ok(name, ms) {
    if (!this.ctx || !this.on) return false;
    const t = performance.now();
    if (this.last[name] && t - this.last[name] < ms) return false;
    this.last[name] = t;
    return true;
  }

  noise(t0, dur, type, freq, q, vol, dest) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(dest || this.master);
    src.start(t0, Math.random()); src.stop(t0 + dur + 0.05);
    return f;
  }

  tone(t0, dur, type, f0, f1, vol, dest) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
    return { o, g };
  }

  // Un vrai prout de synthèse : grave, qui « flotte » grâce à une modulation rapide.
  fart(pitch = 1, dur = 0.3, vol = 0.4) {
    if (!this.ctx || !this.on) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    const base = 75 * pitch * (0.85 + Math.random() * 0.3);
    o.frequency.setValueAtTime(base * 1.3, t);
    o.frequency.exponentialRampToValueAtTime(base * 0.7, t + dur);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 520 * pitch; lp.Q.value = 6;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lfo = c.createOscillator();
    lfo.type = 'square'; lfo.frequency.value = 22 + Math.random() * 14;
    const lg = c.createGain(); lg.gain.value = vol * 0.6;
    lfo.connect(lg); lg.connect(g.gain);
    o.connect(lp); lp.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05); lfo.start(t); lfo.stop(t + dur + 0.05);
    this.noise(t, dur * 0.8, 'bandpass', 380 * pitch, 1.2, vol * 0.35);
  }

  shoot() { if (this.ok('shoot', 70)) this.fart(2.2 + Math.random() * 0.6, 0.08, 0.13); }
  bean() { if (this.ok('bean', 90)) { const t = this.ctx.currentTime; this.tone(t, 0.07, 'sine', 900, 1500, 0.08); } }
  deflate() {
    if (!this.ok('deflate', 55)) return;
    const t = this.ctx.currentTime;
    const f0 = 700 + Math.random() * 500;
    this.tone(t, 0.28, 'sine', f0, f0 * 0.35, 0.12);
    this.noise(t, 0.22, 'highpass', 2500, 0.7, 0.05);
  }
  squeak() { if (this.ok('squeak', 120)) { const t = this.ctx.currentTime; this.tone(t, 0.16, 'square', 500, 1400, 0.05); } }
  hurt() { if (this.ok('hurt', 200)) { const t = this.ctx.currentTime; this.tone(t, 0.18, 'square', 260, 110, 0.12); this.fart(0.9, 0.2, 0.2); } }
  boom() {
    if (!this.ok('boom', 90)) return;
    const t = this.ctx.currentTime;
    const f = this.noise(t, 0.55, 'lowpass', 900, 1, 0.45);
    f.frequency.exponentialRampToValueAtTime(90, t + 0.5);
    this.fart(0.6, 0.35, 0.3);
  }
  strikeWarn() { if (this.ok('warn', 300)) { const t = this.ctx.currentTime; this.tone(t, 0.7, 'sine', 2200, 500, 0.08); } }
  pickup() { if (this.ok('pickup', 100)) { const t = this.ctx.currentTime; [660, 990, 1320].forEach((f, i) => this.tone(t + i * 0.06, 0.12, 'triangle', f, f, 0.12)); } }
  levelUp() {
    if (!this.ok('lvl', 300)) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(t + i * 0.08, 0.22, 'triangle', f, f, 0.14));
  }
  radio() { if (this.ok('radio', 400)) { const t = this.ctx.currentTime; this.noise(t, 0.12, 'bandpass', 1800, 3, 0.1); this.tone(t + 0.1, 0.06, 'square', 1200, 1200, 0.04); } }
  alarm() {
    if (!this.ok('alarm', 1500)) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) this.tone(t + i * 0.36, 0.3, 'square', 440, 660, 0.07);
  }
  victory() {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    [392, 392, 392, 523, 659, 784].forEach((f, i) => this.tone(t + i * 0.14, i === 5 ? 0.6 : 0.16, 'triangle', f, f, 0.15));
  }
  sad() {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    [392, 370, 349, 330].forEach((f, i) => this.tone(t + i * 0.3, 0.32, 'triangle', f, f * 0.98, 0.13));
    this.fart(0.5, 0.9, 0.3);
  }
  click() { if (this.ok('click', 60)) { const t = this.ctx.currentTime; this.tone(t, 0.05, 'square', 700, 900, 0.05); } }

  // --- petite musique de marche militaire (tambour + tuba) ---
  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this.step = 0;
    this.nextT = this.ctx.currentTime + 0.1;
    const bass = [98, 0, 147, 0, 98, 0, 147, 0, 110, 0, 165, 0, 98, 0, 147, 131];
    const sched = () => {
      if (!this.musicOn) return;
      const spb = 60 / 118 / 2;
      while (this.nextT < this.ctx.currentTime + 0.25) {
        const s = this.step % 16, t = this.nextT;
        if (this.on) {
          if (s % 4 === 0) this.tone(t, 0.12, 'sine', 120, 45, 0.5, this.musicBus);
          if (s === 4 || s === 12) this.noise(t, 0.16, 'highpass', 1400, 0.8, 0.35, this.musicBus);
          if (s === 14 || s === 15) this.noise(t, 0.06, 'highpass', 1600, 0.8, 0.18, this.musicBus);
          if (bass[s]) {
            const b = this.tone(t, spb * 1.6, 'sawtooth', bass[s], bass[s], 0.12, this.musicBus);
            b.o.detune.value = -8;
          }
        }
        this.step++;
        this.nextT += spb;
      }
      this.musicTimer = setTimeout(sched, 60);
    };
    sched();
  }
  stopMusic() { this.musicOn = false; clearTimeout(this.musicTimer); }
}

// Les écrans (titre, histoire, mission, niveau, fin) et l'affichage par-dessus le jeu.
import { MISSIONS, UPGRADES, missionTime, DIFFS } from '../game/game.js';
import { BUILDINGS, UNITS, POWERS, UPGRADE_COST } from '../game/rts.js';
import { TROPHIES, trophyImg } from '../game/trophies.js';

// les gestes du tutoriel (planche Gemini)
const gest = (list) => '<div class="gestes">' + list.map(([i, t]) => `<div class="geste"><img src="assets/tuto/tuto_${i}.webp" alt=""><span>${t}</span></div>`).join('') + '</div>';

const $ = (id) => document.getElementById(id);
export const ico = (o) => o.img ? `<img class="icimg" src="${o.img}" alt="">` : o.icon;

export class UI {
  constructor(app) {
    this.app = app;
    this.screens = $('screens');
    this.cache = {};
    this.isMobile = matchMedia('(pointer: coarse)').matches;
    this.radioTimer = 0;
    this.bannerTimer = 0;
    $('pauseBtn').addEventListener('pointerdown', (e) => { e.stopPropagation(); this.app.pause(); });
    $('skillBtn').addEventListener('pointerdown', (e) => { e.stopPropagation(); this.app.skill(); });
    // panneau du mode base : un seul écouteur pour tous les boutons
    $('rtsPanel').addEventListener('pointerdown', (e) => e.stopPropagation());
    $('rtsPanel').addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (!b || !this.rts) return;
      e.stopPropagation();
      this.app.sfx.unlock();
      const r = this.rts, [act, arg] = b.dataset.r.split(':');
      if (act === 'tab') { r.tab = arg; r.uiDirty = true; }
      if (act === 'build') { if (r.place && r.place.type === arg) r.cancelPlace(); else r.startPlace(arg); }
      if (act === 'train') r.train(arg);
      if (act === 'ok') r.confirmPlace();
      if (act === 'cancel') r.cancelPlace();
      if (act === 'army') r.selectArmy();
      if (act === 'attack') r.attackNest();
      if (act === 'defend') r.defend();
      if (act === 'unsel') { r.sel.clear(); r.selB = null; r.uiDirty = true; }
      if (act === 'sell') r.sell();
      if (act === 'upgrade') r.upgrade();
      if (act === 'cancelpower') r.cancelPower();
      if (act === 'rot') r.rotateWall();
      this.rtsKey = '';
    });
    $('powers').addEventListener('pointerdown', (e) => e.stopPropagation());
    $('powers').addEventListener('click', (e) => {
      const b = e.target.closest('[data-p]');
      if (!b || !this.rts) return;
      e.stopPropagation();
      this.app.sfx.unlock();
      if (this.rts.power === b.dataset.p) this.rts.cancelPower(); else this.rts.startPower(b.dataset.p);
      this.rtsKey = '';
    });
    $('minimap').addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (!this.rts || !this.rts.active) return;
      const rc = e.currentTarget.getBoundingClientRect();
      const mx = (e.clientX - rc.left) / rc.width, my = (e.clientY - rc.top) / rc.height;
      this.app.moveCam((mx - 0.5) * 120, (my - 0.5) * 120);
    });
  }

  clear() { this.screens.innerHTML = ''; }

  show(html, cls = 'dim') {
    this.clear();
    $('banner').classList.add('hidden');
    const d = document.createElement('div');
    d.className = 'screen ' + cls;
    d.innerHTML = html;
    this.screens.appendChild(d);
    d.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      this.app.sfx.unlock();
      this.app.sfx.click();
      this.app.action(b.dataset.act, b.dataset.arg);
    }));
    return d;
  }

  partsRow(n, fresh = -1) {
    // les médailles gagnées (une par pièce du vaisseau)
    return '<div class="parts">' + MISSIONS.map((m, i) =>
      `<div class="p ${i < n ? 'got' : ''} ${i === fresh ? 'new' : ''}" title="${m.part}"><img class="icimg" src="assets/victoire/vic_${4 + i}.webp" alt=""></div>`).join('') + '</div>';
  }

  title(save) {
    this.hud(false);
    const done = save.parts >= MISSIONS.length;
    const label = done ? '🏆 REJOUER' : (save.parts ? `▶ JOUER — MISSION ${save.parts + 1}` : '▶ JOUER');
    this.show(`
      <div class="propaganda">LA FÉDÉRATION DES BONBONS PRÉSENTE</div>
      <img class="logo" src="assets/logo/starshiprout.webp" alt="Starshiprout" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="textlogo" style="display:none"><b>STARSHIPROUT</b><span>Lucas, le héros du gaz</span></div>
      ${this.partsRow(save.parts)}
      <button class="btn green" data-act="play">${label}</button>
      <div>
        <button class="btn small ghost" data-act="story">📖 L'histoire</button>
        <button class="btn small ghost" data-act="trophies">🏆 Trophées ${this.app.trophy ? this.app.trophy.count() : 0}/${TROPHIES.length}</button>
        <button class="btn small ghost" data-act="sound">${this.app.sfx.on ? '🔊 Son' : '🔇 Son'}</button>
      </div>
      <button class="btn small ghost" data-act="learn">🎓 Apprendre à construire</button>
      <button class="btn small ghost diffbtn" data-act="diff">${(DIFFS[save.diff] || DIFFS.facile).icon} Difficulté : <b>${(DIFFS[save.diff] || DIFFS.facile).name}</b></button>
      <div class="know" data-act="story">« Voulez-vous en savoir plus ? »</div>
      <div class="version"><a data-act="credits">Crédits</a>${window.GAME_VERSION ? ` · version ${window.GAME_VERSION}` : ''}</div>
    `, 'transparentbg menubg');
  }

  trophies(tr) {
    this.hud(false);
    this.show(`
      <div class="h1 outline">TROPHÉES</div>
      <div class="h2 outline">${tr.count()} / ${TROPHIES.length} gagnés</div>
      <div class="trophies">${TROPHIES.map((t, i) => `<div class="tro ${tr.has(t.id) ? 'got' : ''}">
        <img src="${trophyImg(i)}" alt=""><b>${t.name}</b><span>${t.desc}</span></div>`).join('')}</div>
      <button class="btn green" data-act="menu">◀ RETOUR</button>
    `, 'dark');
  }

  credits() {
    this.show(`
      <div class="h1 outline">CRÉDITS</div>
      <div class="card-brief credits">
        <b>Starshiprout : Lucas, le héros du gaz</b><br><br>
        <b>Musiques</b> (vrais instruments) : Kevin MacLeod (incompetech.com)<br>
        « Fluffing a Duck », « Five Armies », « The Builder », « Heroic Age »<br>
        Licence Creative Commons : By Attribution 4.0<br><br>
        <b>Bruitages</b> : Kenney (kenney.nl) « Impact Sounds », « RPG Audio », « Interface Sounds » (CC0)<br>
        Prouts : « Gastric Distress » par LFA (opengameart.org, CC0)<br><br>
        <b>Soldat 3D</b> : KayKit par Kay Lousberg (CC0) · <b>Moteur</b> : Three.js
      </div>
      <button class="btn green" data-act="menu">◀ RETOUR</button>
    `, 'dark');
  }

  story(slides, i, onDone) {
    this.hud(false);
    const s = slides[i];
    const d = this.show(`
      <div class="story-dots">${slides.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('')}</div>
      ${s.img ? `<img class="story-img" src="${s.img}" alt=""${s.alt ? ` onerror="this.onerror=null;this.src='${s.alt}'"` : ''}>` : `<div class="story-emoji">${s.emoji}</div>`}
      <div class="story-text outline">${s.text}</div>
      <div>
        <button class="btn green" data-act="storyNext">${i === slides.length - 1 ? s.last || 'EN AVANT !' : 'SUITE ➜'}</button>
        ${i < slides.length - 1 ? '<button class="btn small ghost" data-act="storySkip">Passer</button>' : ''}
      </div>
    `, 'dark');
    return d;
  }

  briefing(mission) {
    this.hud(false);
    const M = MISSIONS[mission];
    const T = missionTime(M), min = Math.floor(T / 60), sec = T % 60;
    const dur = !min ? `${sec} secondes` : (sec ? `${min}:${String(sec).padStart(2, '0')}` : `${min} minutes`);
    if (M.type === 'base') return this.briefingBase(mission, M);
    const ctrl = this.isMobile
      ? gest([[2, 'Glisse le doigt : Lucas court. Il tire tout seul !'], [8, 'Gros bouton : MÉGA-PROUT !']])
      : gest([[2, 'ZQSD, WASD ou flèches pour courir. Lucas tire tout seul !'], [8, 'Espace ou bouton : MÉGA-PROUT !']]);
    this.show(`
      <div class="h1 outline">MISSION ${mission + 1} / ${MISSIONS.length}</div>
      <img class="mis-img" src="assets/missions/mis_${mission + 1}.webp" alt="">
      <div class="card-brief">
        <div class="stamp">ORDRE DE MISSION</div><br>
        Tiens bon pendant <b>${dur}</b> contre les monstres Prout.<br>
        ${M.ship ? 'Ton équipe a reçu ton <b>SOS</b> : un vaisseau de la Flotte<br>arrive avec des <b>soldats</b> pour construire la base !'
    : `Ensuite, dégonfle le gardien <b>${M.boss.name}</b><br>pour récupérer <b>${M.icon} ${M.part}</b> du vaisseau.`}
      </div>
      <div class="hint">${ctrl}</div>
      <button class="btn green" data-act="go">C'EST PARTI !</button>
    `, 'dark');
  }

  briefingBase(mission, M) {
    const ctrl = this.isMobile
      ? gest([[2, 'Glisse un doigt : bouger la carte'], [1, 'Touche un soldat, puis un endroit : il y va'], [5, 'Appui long puis glisse : plusieurs soldats'],
        [6, 'Touche 2 fois : toute l’armée'], [3, 'Pince : zoomer'], [7, 'Mur : glisse pour le tracer, puis ✔'], [8, 'Pouvoirs de la Flotte : bouton puis carte']])
      : gest([[2, 'Glisse (ou flèches, ou bords) : bouger la carte'], [1, 'Clic sur un soldat, clic droit : il y va'], [5, 'Maj + glisser : plusieurs soldats'],
        [6, 'Double clic : toute l’armée'], [3, 'Molette : zoomer'], [7, 'Mur : glisse pour le tracer, puis ✔'], [8, 'Pouvoirs de la Flotte : bouton puis carte']]);
    this.show(`
      <div class="h1 outline">MISSION ${mission + 1} / ${MISSIONS.length}</div>
      <img class="mis-img" src="assets/missions/mis_${mission + 1}.webp" alt="">
      <div class="card-brief">
        <div class="stamp">OPÉRATION BASE</div><br>
        Ton équipe est là ! Construis la <b>base</b> autour de ton vaisseau.<br>
        Pose des <b>pompes à gaz</b> sur les geysers verts : c’est le trésor de la planète !<br>
        Récolte des <b>haricots</b> pour construire des défenses et fabriquer une <b>armée</b>.<br>
        Puis détruis les <b>${M.nests} nids</b> de monstres pour trouver <b>${M.part}</b> !
      </div>
      <div class="hint">${ctrl}</div>
      <button class="btn green" data-act="go">C'EST PARTI !</button>
    `, 'dark');
  }

  levelUp(lvl, cards, onPick) {
    const d = this.show(`
      <div class="h1 outline">NIVEAU ${lvl} !</div>
      <div class="h2 outline">Choisis une amélioration</div>
      <div class="cards">${cards.map((c, i) => `
        <div class="card" data-i="${i}" style="animation-delay:${i * 0.08}s">
          <div class="ic">${ico(c)}</div>
          <div class="nm">${c.name}</div>
          <div><span class="lv ${c.lvl === 1 ? 'new' : ''}">${c.id === 'heal' ? 'SOIN' : (c.lvl === 1 ? 'NOUVEAU !' : 'NIV ' + c.lvl)}</span></div>
          <div class="ds">${c.desc}</div>
        </div>`).join('')}
      </div>
    `);
    let picked = false;
    const t0 = performance.now();
    d.querySelectorAll('.card').forEach((el) => el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (picked || performance.now() - t0 < 350) return; // évite un choix par erreur en jouant
      picked = true;
      this.app.sfx.click();
      this.clear();
      onPick(cards[+el.dataset.i].id);
    }));
  }

  pauseMenu() {
    this.show(`
      <div class="h1 outline">PAUSE</div>
      <button class="btn green" data-act="resume">▶ CONTINUER</button>
      <button class="btn ghost" data-act="sound">${this.app.sfx.on ? '🔊 Son : oui' : '🔇 Son : non'}</button>
      <button class="btn ghost" data-act="quit">🏳️ Abandonner</button>
    `);
  }

  stats(s) {
    const m = Math.floor(s.time / 60), sec = String(Math.floor(s.time % 60)).padStart(2, '0');
    return `<div class="stats outline">⏱️ Temps : <b>${m}:${sec}</b><br>💨 Monstres dégonflés : <b>${s.kills}</b><br>⭐ Niveau : <b>${s.lvl}</b></div>`;
  }

  gameOver(s) {
    this.hud(false);
    this.show(`
      <img class="end-img" src="assets/victoire/vic_3.webp" alt="">
      <div class="h1 outline">OUPS !</div>
      <div class="h2 outline">${s.mode === 'base' ? 'Les monstres ont cassé le vaisseau…' : 'Lucas a respiré trop de gaz…'}</div>
      ${this.stats(s)}
      <button class="btn green" data-act="retry">🔁 RÉESSAYER</button>
      <button class="btn small ghost" data-act="menu">Menu</button>
    `, 'dark');
  }

  victory(s) {
    this.hud(false);
    const parts = this.app.missionWon(s.mission);
    const M = MISSIONS[s.mission];
    if (M.ship) { this.app.action('base'); return; } // mission 1 : on enchaîne tout de suite sur la construction
    const last = parts >= MISSIONS.length;
    this.show(`
      <div class="h1 outline">MISSION RÉUSSIE !</div>
      <div class="end-row"><img class="end-img" src="assets/victoire/vic_1.webp" alt=""><img class="medal" src="assets/victoire/vic_${4 + s.mission}.webp" alt=""></div>
      <div class="h2 outline">Médaille gagnée !</div>
      <div class="h2 outline">${M.part} est récupéré${s.mission === 1 || s.mission === 3 ? 'e' : ''} !</div>
      ${this.partsRow(parts, s.mission)}
      ${this.stats(s)}
      <button class="btn green" data-act="${last ? 'ending' : 'next'}">${last ? '🚀 RENTRER À LA MAISON' : '▶ MISSION SUIVANTE'}</button>
      <button class="btn small ghost" data-act="menu">Menu</button>
    `, 'dark');
  }

  // ---------- HUD ----------
  hud(on, mode = 'hero') {
    $('hud').classList.toggle('hidden', !on);
    $('hud').classList.toggle('rts', mode === 'base');
    this.rtsKey = '';
    if (!on) { $('radio').classList.add('hidden'); $('banner').classList.add('hidden'); this.pointer(null); }
  }

  hudValues(hp, xp, lvl, timer, kills, skillCd = 0, lives = 0) {
    const c = this.cache;
    if (c.lives !== lives) { c.lives = lives; const el = $('lives'); if (el) el.textContent = lives > 0 ? '×' + (lives + 1) : ''; }
    const sk = Math.ceil(skillCd);
    if (c.sk !== sk) {
      c.sk = sk;
      const b = $('skillBtn');
      b.classList.toggle('wait', sk > 0);
      b.querySelector('i').textContent = sk > 0 ? sk : '';
    }
    const hpw = Math.round(hp * 100), xpw = Math.round(xp * 100);
    if (c.hp !== hpw) { $('hpfill').style.width = hpw + '%'; c.hp = hpw; }
    if (c.xp !== xpw) { $('xpfill').style.width = xpw + '%'; c.xp = xpw; }
    if (c.lvl !== lvl) { $('lvl').textContent = 'NIV ' + lvl; c.lvl = lvl; }
    if (c.timer !== timer) { $('timer').textContent = timer; c.timer = timer; }
    if (c.kills !== kills) { $('kills').textContent = '💨 ' + kills; c.kills = kills; }
  }

  rtsHud(r) {
    this.rts = r;
    const money = Math.floor(r.money);
    if (this.cache.money !== money) { $('money').textContent = money; this.cache.money = money; }
    const alive = r.nests.filter((n) => n.hp > 0).length;
    const wt = Math.max(0, Math.ceil(r.waveT));
    const wtxt = r.waveT > 1e5 ? '😴 Les nids dorment' : `⚠️ Attaque dans ${Math.floor(wt / 60)}:${String(wt % 60).padStart(2, '0')}`;
    if (this.cache.wave !== wtxt) { $('wave').textContent = wtxt; this.cache.wave = wtxt; }
    if (this.cache.nests !== alive) { $('nestsLeft').textContent = '🕳️ ' + alive; this.cache.nests = alive; }
    const now = performance.now();
    if (now - (this.mmT || 0) > 200) { this.mmT = now; this.minimap(r); this.powersHud(r); }
    // on refait le panneau seulement si quelque chose a changé
    const sel = r.selB;
    const key = [sel && sel.lvl, r.power, r.tab, r.place && r.place.type, r.place && !!r.place.pending, r.pendingCost(), r.sel.size, sel && sel.id, sel && Math.round(sel.hp / sel.maxHp * 20), sel && sel.queue.length,
      Object.values(BUILDINGS).map((B) => r.money >= B.cost ? 1 : 0).join(''), Object.values(UNITS).map((U) => r.money >= U.cost ? 1 : 0).join(''),
      r.buildings.filter((b) => b.built >= 1).length, r.buildings.map((b) => b.queue.length).join('')].join('|');
    if (key === this.rtsKey && !r.uiDirty) return;
    this.rtsKey = key; r.uiDirty = false;
    let top = '';
    if (r.power) {
      const P = POWERS[r.power];
      top = `<div class="rsel"><span>${P.icon} ${P.name} — ${P.hint}</span><button class="rb" data-r="cancelpower">✖</button></div>`;
    } else if (r.place) {
      const B = BUILDINGS[r.place.type];
      const pending = !!r.place.pending, cost = r.pendingCost();
      const txt = pending ? 'Le fantôme est prêt : appuie sur ✔ pour construire'
        : (r.place.type === 'wall' ? 'Touche le sol ou glisse pour tracer ta barrière' : 'Touche le sol pour placer le fantôme');
      top = `<div class="rsel"><span>${ico(B)} ${B.name} — ${txt}</span>
        ${pending ? `<button class="rb ok big" data-r="ok">✔ Construire${cost ? ' (' + cost + ')' : ''}</button>` : ''}<button class="rb" data-r="cancel">✖</button></div>`;
    } else if (r.sel.size) {
      const n = r.sel.size;
      const first = [...r.sel][0], por = [...r.sel].some((u) => u.type === 'lucas') ? 1 : (first.type === 'dog' ? 6 : 5);
      top = `<div class="rsel"><img class="selpor" src="assets/portraits/por_${por}.webp" alt=""><span>${n} soldat${n > 1 ? 's' : ''} — touche le sol pour les envoyer, ou un nid pour l’attaquer</span><button class="rb" data-r="unsel">✖</button></div>`;
    } else if (sel) {
      const name = sel.type === 'hq' ? 'Le vaisseau de Lucas (QG)' : (sel.B ? sel.B.name : '');
      const q = sel.queue.length ? ` — fabrique ${sel.queue.length} ${UNITS[sel.queue[0]].name.toLowerCase()}…` : '';
      top = `<div class="rsel"><span>${name} ❤️ ${Math.round(sel.hp / sel.maxHp * 100)}%${q}</span>
        ${UPGRADE_COST[sel.type] && (sel.lvl || 1) < 3 && sel.built >= 1 ? `<button class="rb ok" data-r="upgrade">⬆ Niveau ${(sel.lvl || 1) + 1} (${UPGRADE_COST[sel.type][(sel.lvl || 1) - 1]})</button>` : ''}
        ${sel.type !== 'hq' ? `<button class="rb" data-r="sell">${sel.type === 'wall' || sel.type === 'gate' ? '💥 Démolir' : '💰 Vendre'}</button>` : ''}<button class="rb" data-r="unsel">✖</button></div>`;
    }
    const tabs = `<div class="rtabs"><button class="rt ${r.tab === 'build' ? 'on' : ''}" data-r="tab:build">🏗️ Construire</button>
      <button class="rt ${r.tab === 'army' ? 'on' : ''}" data-r="tab:army">🪖 Armée</button>
      <button class="rt atk" data-r="attack"><img class="ti" src="assets/icones/ico_6.webp" alt="">À l’attaque !</button>
      <button class="rt def" data-r="defend"><img class="ti" src="assets/icones/ico_7.webp" alt="">Défendre</button></div>`;
    let list = '';
    if (r.tab === 'build') {
      for (const [id, B] of Object.entries(BUILDINGS)) {
        if (!r.unlocked(B)) continue;
        const ok = r.money >= B.cost;
        list += `<button class="ri ${ok ? '' : 'no'} ${r.place && r.place.type === id ? 'on' : ''}" data-r="build:${id}">
          <span class="ic">${ico(B)}</span><span class="nm">${B.name}</span><span class="co">${B.cost}</span></button>`;
      }
    } else {
      for (const [id, U] of Object.entries(UNITS)) {
        if (U.hero || !r.unlocked(U)) continue;
        const has = U.from === 'hq' || r.has(U.from);
        const ok = r.money >= U.cost && has;
        const q = r.buildings.reduce((a, b) => a + b.queue.filter((t) => t === id).length, 0);
        list += `<button class="ri ${ok ? '' : 'no'}" data-r="train:${id}">
          <span class="ic">${ico(U)}</span><span class="nm">${U.name}</span><span class="co">${U.cost}</span>${q ? `<i class="q">${q}</i>` : ''}
          ${has ? '' : `<span class="lock">🔒 ${BUILDINGS[U.from].name}</span>`}</button>`;
      }
    }
    $('rtsPanel').innerHTML = top + tabs + `<div class="rlist">${list}</div>`;
  }

  // la carte du tutoriel (en haut) : le Sergent, l'objectif, l'étape
  tuto(S, i, n) {
    let d = $('tuto');
    if (!S) { if (d) d.remove(); $('hud').classList.remove('tuto-on'); this.tutoSel = undefined; return; }
    if (!d) {
      d = document.createElement('div'); d.id = 'tuto'; d.className = 'rtsOnly';
      d.addEventListener('pointerdown', (e) => e.stopPropagation());
      d.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.closest('[data-tuto=skip]') && this.rts && this.rts.tuto) this.rts.tuto.skip();
      });
      $('hud').appendChild(d);
    }
    $('hud').classList.add('tuto-on');
    d.innerHTML = `<img src="assets/sergent2/${S.face.replace('sg', 'sg_')}.webp" alt="">
      <div class="tt"><small>${S.last ? 'TUTO TERMINÉ !' : `ÉTAPE ${i + 1} / ${n}`}${S.reward ? ` · 🎁 +${S.reward}` : ''}</small><p>${S.text}</p></div>
      ${S.last ? '' : '<button class="tskip" data-tuto="skip">Passer</button>'}`;
    d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop');
  }

  // fait clignoter le bouton à toucher
  tutoTarget(sel) {
    if (sel === this.tutoSel && (!sel || document.querySelector('.tuto-hl'))) return;
    this.tutoSel = sel;
    document.querySelectorAll('.tuto-hl').forEach((e) => e.classList.remove('tuto-hl'));
    if (!sel) return;
    const el = document.querySelector(`#rtsPanel [data-r="${sel}"]`);
    if (el) { el.classList.add('tuto-hl'); try { el.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { /* rien */ } }
  }

  powersHud(r) {
    const el = $('powers');
    const html = Object.entries(POWERS).map(([id, P]) => {
      const cd = Math.ceil(r.pcd[id] || 0), poor = P.cost && r.money < P.cost;
      const pct = cd ? Math.round(100 - (r.pcd[id] / P.cd) * 100) : 100;
      // quand un pouvoir redevient prêt : il brille et le pilote prévient
      if (this.pwWasWaiting && this.pwWasWaiting[id] && !cd && r.active) { this.pwReady = this.pwReady || {}; this.pwReady[id] = performance.now(); if (id === 'strike') this.radio(`${P.name} : la Flotte est prête !`, 'pilote'); }
      (this.pwWasWaiting = this.pwWasWaiting || {})[id] = !!cd;
      const fresh = this.pwReady && performance.now() - (this.pwReady[id] || 0) < 2500;
      return `<button class="pw ${cd || poor ? 'wait' : ''} ${r.power === id ? 'on' : ''} ${fresh ? 'ready' : ''}" data-p="${id}" title="${P.name}" style="--p:${pct}%">
        <span class="pi">${P.img ? `<img src="${P.img}" alt="">` : P.icon}</span>${cd ? `<i>${cd}</i>` : (P.cost ? `<b>${P.cost}</b>` : '')}</button>`;
    }).join('');
    if (html !== this.pwHtml) { el.innerHTML = html; this.pwHtml = html; }
  }

  minimap(r) {
    const c = $('minimap'), g = c.getContext('2d'), S = c.width, k = S / 120;
    const X = (x) => (x + 60) * k, Z = (z) => (z + 60) * k;
    g.clearRect(0, 0, S, S);
    g.save();
    // même orientation que la vue isométrique (le haut de l'écran = le haut de la carte)
    g.translate(S / 2, S / 2); g.rotate(Math.PI / 4); g.translate(-S / 2, -S / 2);
    g.fillStyle = 'rgba(60,35,80,.85)'; g.beginPath(); g.arc(S / 2, S / 2, 56 * k, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(120,200,60,.8)';
    for (const f of r.fields) if (f.amount > 0) { g.beginPath(); g.arc(X(f.x), Z(f.z), 2.5 * k, 0, 6.28); g.fill(); }
    g.fillStyle = '#4fa8ff';
    for (const b of r.buildings) { const s = (b.type === 'hq' ? 5 : b.r * 1.6) * k; g.fillRect(X(b.x) - s / 2, Z(b.z) - s / 2, s, s); }
    g.fillStyle = '#7dff4a';
    for (const u of r.units) g.fillRect(X(u.x) - 2, Z(u.z) - 2, 4, 4);
    g.fillStyle = '#ff4a4a';
    for (const m of r.g.monsters) if (m.alive && r.visibleAt(m.pos.x, m.pos.z)) g.fillRect(X(m.pos.x) - 1.5, Z(m.pos.z) - 1.5, 3, 3);
    // brouillard : ce qu'on n'a jamais vu est noir
    g.fillStyle = 'rgba(8,4,14,.88)';
    for (let iz = 0; iz < 60; iz++) for (let ix = 0; ix < 60; ix++) if (!r.seen[iz * 60 + ix]) g.fillRect(ix * 2 * k, iz * 2 * k, 2 * k + 0.5, 2 * k + 0.5);
    for (const n of r.nests) if (n.hp > 0 && r.seenAt(n.x, n.z)) { g.fillStyle = '#d070ff'; g.beginPath(); g.arc(X(n.x), Z(n.z), 4 * k, 0, 6.28); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 2; g.stroke(); }
    const t = r.g.camTarget;
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.arc(X(t.x), Z(t.z), 8 * k, 0, 6.28); g.stroke();
    g.restore();
  }

  setWeapons(p) {
    const items = [];
    for (const [id, w] of Object.entries(p.weapons)) items.push(`<div class="w">${ico(UPGRADES[id])}<i>${w.lvl}</i></div>`);
    for (const [id, l] of Object.entries(p.passives)) items.push(`<div class="w">${ico(UPGRADES[id])}<i>${l}</i></div>`);
    $('weapons').innerHTML = items.join('');
  }

  bossBar(name, frac, onlyUpdate) {
    if (onlyUpdate) { $('bossfill').style.width = Math.max(0, frac * 100) + '%'; return; }
    if (!name) { $('bossbar').classList.add('hidden'); return; }
    $('bossname').textContent = name;
    $('bossfill').style.width = '100%';
    $('bossbar').classList.remove('hidden');
  }

  radio(text, face = 2) {
    const r = $('radio');
    const POR = { lucas: 1, lucasCri: 2, lucasSur: 3, lucasRit: 4, soldat: 5, chien: 6, petaros: 7, pilote: 8 };
    const sg = typeof face === 'string' && /^sg\d$/.test(face);
    $('radioimg').src = sg ? `assets/sergent2/sg_${face[2]}.webp` : typeof face === 'string' ? `assets/portraits/por_${POR[face] || 1}.webp` : `assets/sergent/sergent_${face}.webp`;
    $('radio').querySelector('b').textContent = typeof face === 'string' && !sg
      ? ({ pilote: 'PILOTE DE LA FLOTTE', petaros: 'EMPEREUR PÉTAROS', chien: 'CHIEN RENIFLEUR', soldat: 'SOLDAT' }[face] || 'LUCAS') : 'SERGENT POUET';
    $('radiotext').textContent = text;
    r.classList.remove('hidden');
    r.style.animation = 'none'; void r.offsetWidth; r.style.animation = '';
    clearTimeout(this.radioTimer);
    this.radioTimer = setTimeout(() => r.classList.add('hidden'), 4200);
  }

  banner(title, sub) {
    const b = $('banner');
    b.innerHTML = `${title}${sub ? `<small>${sub}</small>` : ''}`;
    b.classList.remove('hidden');
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.add('hidden'), 2300);
  }

  hitFlash() {
    const f = $('flash');
    f.style.transition = 'none'; f.style.opacity = '0.35';
    void f.offsetWidth;
    f.style.transition = 'opacity .35s'; f.style.opacity = '0';
  }

  pointer(nx, ny) {
    const el = $('pointer');
    if (nx === null || nx === undefined) { if (!el.classList.contains('hidden')) el.classList.add('hidden'); return; }
    const g = $('game');
    const W = g.offsetWidth, H = g.offsetHeight;
    const cx = Math.max(-0.86, Math.min(0.86, nx)), cy = Math.max(-0.8, Math.min(0.8, ny));
    const x = (cx + 1) / 2 * W, y = (1 - cy) / 2 * H;
    const ang = Math.atan2(-ny, nx) * 180 / Math.PI;
    el.style.transform = `translate(${x}px, ${y}px) rotate(${ang}deg)`;
    el.classList.remove('hidden');
  }
}

// Les trophées (succès à débloquer), gardés dans le navigateur / le téléphone.
export const TROPHIES = [
  { id: 'first', name: 'Premier dégonflé', desc: 'Dégonfle ton premier monstre' },
  { id: 'hundred', name: 'Cent monstres', desc: 'Dégonfle 100 monstres en tout' },
  { id: 'walls', name: 'Maçon', desc: 'Construis 10 murs' },
  { id: 'turret', name: 'Défenseur', desc: 'Construis une tourelle à prout' },
  { id: 'squad', name: 'Chef d’escouade', desc: 'Entraîne une escouade de soldats' },
  { id: 'ship', name: 'Les renforts', desc: 'Accueille le vaisseau de la Flotte' },
  { id: 'strike', name: 'Rayon du ciel', desc: 'Appelle la frappe de la Flotte' },
  { id: 'mega', name: 'Méga-Prout', desc: 'Lance le Méga-Prout de Lucas' },
  { id: 'nest', name: 'Bouche-trou', desc: 'Détruis un nid de monstres' },
  { id: 'emperor', name: 'Plus d’empereur', desc: 'Dégonfle l’Empereur Pétaros' },
  { id: 'beans', name: 'Grand récolteur', desc: 'Récolte 2000 haricots' },
  { id: 'home', name: 'Retour à la maison', desc: 'Répare le vaisseau et rentre chez toi' },
];
export const trophyImg = (i) => `assets/trophees/tr_${i + 1}.webp`;

const KEY = 'ls_trophees';

export class Trophies {
  constructor(sfx) {
    this.sfx = sfx;
    this.data = { got: {}, kills: 0, walls: 0, beans: 0 };
    try { Object.assign(this.data, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* pas de sauvegarde */ }
    this.queue = [];
  }

  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* tant pis */ } }
  has(id) { return !!this.data.got[id]; }
  count() { return Object.keys(this.data.got).length; }

  unlock(id) {
    if (this.has(id)) return;
    const i = TROPHIES.findIndex((t) => t.id === id);
    if (i < 0) return;
    this.data.got[id] = true;
    this.save();
    this.queue.push(i);
    if (this.queue.length === 1) this.toast();
  }

  // compteurs : monstres, murs, haricots
  add(stat, n = 1) {
    this.data[stat] = (this.data[stat] || 0) + n;
    const v = this.data[stat];
    if (stat === 'kills') { if (v >= 1) this.unlock('first'); if (v >= 100) this.unlock('hundred'); }
    if (stat === 'walls' && v >= 10) this.unlock('walls');
    if (stat === 'beans' && v >= 2000) this.unlock('beans');
    if (Math.random() < 0.1 || stat !== 'kills') this.save();
  }

  // petite bannière en haut de l'écran
  toast() {
    const i = this.queue[0], T = TROPHIES[i];
    let d = document.getElementById('toast');
    if (!d) { d = document.createElement('div'); d.id = 'toast'; document.getElementById('game').appendChild(d); }
    d.innerHTML = `<img src="${trophyImg(i)}" alt=""><div><small>TROPHÉE GAGNÉ !</small><b>${T.name}</b><span>${T.desc}</span></div>`;
    d.classList.remove('show'); void d.offsetWidth; d.classList.add('show');
    if (this.sfx) this.sfx.levelUp();
    setTimeout(() => {
      d.classList.remove('show');
      this.queue.shift();
      if (this.queue.length) setTimeout(() => this.toast(), 400);
    }, 3200);
  }
}

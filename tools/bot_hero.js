// Robot de test (mode héros) : à coller dans la console du jeu (window.__game).
// Il joue comme un enfant moyen : fuit les monstres, ramasse les haricots, lance le Méga-Prout quand il est encerclé.
// Retourne le résultat de la mission (gagnée ou non, vie la plus basse, durée).
window.botHero = async function (mission, opts = {}) {
  const g = window.__game, S2 = Math.SQRT1_2;
  const skill = opts.skill ?? 0.7;               // 1 = très bon joueur, 0.4 = petit enfant
  g.ui.clear(); g.parts = mission; g.startMission(mission); g.state = 'play';
  g.openLevelUp = function () {
    while (this.pendingLevels > 0) { const o = this.offers(); if (o.length) this.applyUpgrade(o[Math.floor(Math.random() * o.length)].id); this.pendingLevels--; }
    this.state = 'play';
  };
  let minHp = 100, t = 0, reaction = 0, want = { x: 0, z: 0 };
  const dt = 1 / 30;
  while (t < 600) {
    for (let k = 0; k < 300; k++) {
      t += dt;
      const p = g.p, P = p.pos;
      reaction -= dt;
      if (reaction <= 0) {
        reaction = 0.15 + (1 - skill) * 0.5;       // temps de réaction
        let wx = 0, wz = 0, crowd = 0;
        for (const m of g.monsters) {
          if (!m.alive || m.spawn > 0) continue;
          const dx = P.x - m.pos.x, dz = P.z - m.pos.z, d2 = dx * dx + dz * dz;
          if (d2 < 100) { const w = (m.boss ? 4 : 1) / Math.max(1, d2); wx += dx * w; wz += dz * w; }
          if (d2 < 16) crowd++;
        }
        for (const s of g.spits) { const dx = P.x - s.x, dz = P.z - s.z, d2 = dx * dx + dz * dz; if (d2 < 9) { wx += dx / d2 * 2; wz += dz / d2 * 2; } }
        let best = null, bd = 1e9;
        for (const b of g.beans || []) { const d = (b.x - P.x) ** 2 + (b.z - P.z) ** 2; if (d < bd && d < 64) { bd = d; best = b; } }
        for (const it of g.items) { const d = (it.x - P.x) ** 2 + (it.z - P.z) ** 2; if (it.kind === 'part' || (it.kind === 'food' && p.hp < 70)) { best = it; bd = d; break; } }
        if (best) { const d = Math.sqrt(bd) || 1; const w = best.kind === 'part' ? 3 : 0.25; wx += (best.x - P.x) / d * w; wz += (best.z - P.z) / d * w; }
        const dc = Math.hypot(P.x, P.z); if (dc > 14) { wx -= P.x / dc * 0.3; wz -= P.z / dc * 0.3; }
        // un peu de hasard (les enfants ne jouent pas parfaitement)
        wx += (Math.random() - 0.5) * (1 - skill) * 0.6; wz += (Math.random() - 0.5) * (1 - skill) * 0.6;
        want = { x: wx, z: wz };
        if (crowd >= 6 && Math.random() < skill) g.useSkill();
      }
      const L = Math.hypot(want.x, want.z);
      if (L > 0.02) { g.input.x = (want.x - want.z) * S2 / L; g.input.y = (want.x + want.z) * S2 / L; } else { g.input.x = g.input.y = 0; }
      if (g.state === 'levelup') g.openLevelUp();
      g.update(dt);
      if (g.state === 'play') minHp = Math.min(minHp, p.hp / p.maxHp * 100);
      if (g.state === 'won' || g.state === 'over' || g.state === 'dead' || g.state === 'ending') break;
    }
    if (g.state !== 'play' && g.state !== 'levelup') break;
    await new Promise((r) => setTimeout(r, 0));
  }
  g.input.x = g.input.y = 0;
  return { mission: mission + 1, skill, result: g.state, minHp: Math.round(minHp), time: Math.round(t), kills: g.kills, lvl: g.p.lvl, bossHp: g.boss ? Math.round(g.boss.hp) : null };
};

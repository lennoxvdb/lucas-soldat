// Mises à jour automatiques de l'appli Android.
// À chaque lancement, l'appli regarde sur GitHub Pages s'il y a une nouvelle version du jeu ;
// si oui, elle la télécharge et l'installe (tout de suite sur l'écran titre, sinon au prochain lancement).
export const SITE = 'https://lennoxvdb.github.io/lucas-soldat/';

const newer = (a, b) => {
  const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
};

// l'extension de mise à jour (dans l'appli Android seulement)
function updater() {
  const C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null;
  // lib/capacitor-updater.js (chargé dans index.html) fournit l'outil ; sans lui, rien ne se passait
  if (window.capacitorCapacitorUpdater) return window.capacitorCapacitorUpdater.CapacitorUpdater;
  return (C.Plugins && C.Plugins.CapacitorUpdater) || (C.registerPlugin ? C.registerPlugin('CapacitorUpdater') : null);
}

// À APPELER TOUT DE SUITE au démarrage : dit à l'appli « cette version démarre bien ».
// Sans ça dans les 10 secondes, l'appli croit la mise à jour cassée et revient à l'ancienne
// (c'était le problème : on le disait seulement après le chargement des dessins).
export function appReady() {
  const U = updater();
  if (U) U.notifyAppReady().catch(() => {});
}

// où en est la mise à jour (affiché en petit sur l'écran titre, pour comprendre si ça bloque)
export let updateStatus = '';
const status = (txt) => { updateStatus = txt; const el = document.getElementById('updstatus'); if (el) el.textContent = txt; };

export async function autoUpdate(onReady, canApplyNow) {
  const C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return; // dans le navigateur : rien à faire
  const U = updater();
  if (!U) { status('mise à jour : outil absent'); return; }
  let step = 'version';
  try {
    status('mise à jour : vérification…');
    const mine = await fetch('version.json', { cache: 'no-store' }).then((r) => r.json());
    step = 'internet';
    const latest = await fetch(SITE + 'version.json?' + Date.now(), { cache: 'no-store' }).then((r) => r.json());
    if (!newer(latest.version, mine.version)) { status('à jour ✔'); return; }
    step = 'téléchargement';
    status(`téléchargement de la ${latest.version}…`);
    try { U.addListener('download', (e) => status(`téléchargement de la ${latest.version} : ${Math.round(e.percent || 0)} %`)); } catch (e) { /* rien */ }
    const bundle = await U.download({ url: SITE + 'update.zip', version: latest.version });
    step = 'installation';
    status(`installation de la ${latest.version}…`);
    // sur l'écran titre : on installe tout de suite (l'appli redémarre) ; en pleine partie : au prochain lancement
    if (canApplyNow && canApplyNow()) { if (onReady) onReady(latest.version, true); await U.set({ id: bundle.id }); return; }
    await U.next({ id: bundle.id });
    if (onReady) onReady(latest.version, false);
  } catch (e) {
    console.warn('mise à jour impossible pour le moment', e);
    status(`mise à jour : erreur (${step}) ${(e && (e.message || e.code)) || e}`.slice(0, 120));
  }
}

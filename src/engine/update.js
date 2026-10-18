// Mises à jour automatiques de l'appli Android.
// À chaque lancement, l'appli regarde sur GitHub Pages s'il y a une nouvelle version du jeu ;
// si oui, elle la télécharge en silence et l'installe au prochain lancement (pas besoin de réinstaller l'APK).
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

export async function autoUpdate(onReady, canApplyNow) {
  const U = updater();
  if (!U) return;
  try {
    const mine = await fetch('version.json', { cache: 'no-store' }).then((r) => r.json());
    const latest = await fetch(SITE + 'version.json?' + Date.now(), { cache: 'no-store' }).then((r) => r.json());
    if (!newer(latest.version, mine.version)) return;
    const bundle = await U.download({ url: SITE + 'update.zip', version: latest.version });
    // sur l'écran titre : on installe tout de suite (l'appli redémarre) ; en pleine partie : au prochain lancement
    if (canApplyNow && canApplyNow()) { if (onReady) onReady(latest.version, true); await U.set({ id: bundle.id }); return; }
    await U.next({ id: bundle.id });
    if (onReady) onReady(latest.version, false);
  } catch (e) {
    console.warn('mise à jour impossible pour le moment', e);
  }
}

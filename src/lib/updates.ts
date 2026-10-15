import { create } from 'zustand';

/**
 * Actualizaciones de la app instalada: busca versiones nuevas sola (al abrirla, al volver a ella y cada
 * 15 minutos). Si encuentra una, la aplica enseguida cuando no la estás usando (recién abierta o en
 * segundo plano); si la estás usando, aparece un aviso con "Actualizar".
 */
export const useUpdate = create<{ apply: (() => void) | null }>()(() => ({ apply: null }));

const CHECK_EVERY = 15 * 60 * 1000;
/** Si la versión nueva aparece apenas abrís la app, se aplica sin preguntar. */
const FRESH_START = 20 * 1000;

let requested = false;

function activate(worker: ServiceWorker) {
  requested = true;
  worker.postMessage({ type: 'SKIP_WAITING' });
}

export function setupUpdates() {
  if (!__WITH_SW__ || !('serviceWorker' in navigator)) return;
  const startedAt = Date.now();

  // Cuando el service worker nuevo toma el control, se recarga para mostrar la versión nueva.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!requested) return;
    requested = false;
    window.location.reload();
  });

  const onReady = (worker: ServiceWorker) => {
    const apply = () => activate(worker);
    if (document.visibilityState === 'hidden' || Date.now() - startedAt < FRESH_START) return apply();
    useUpdate.setState({ apply });
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        document.removeEventListener('visibilitychange', onHide);
        apply();
      }
    };
    document.addEventListener('visibilitychange', onHide);
  };

  const register = async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      if (reg.waiting && navigator.serviceWorker.controller) onReady(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) onReady(w);
        });
      });
      const check = () => void reg.update().catch(() => {});
      window.setInterval(check, CHECK_EVERY);
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
      window.addEventListener('online', check);
    } catch (e) {
      console.error(e);
    }
  };
  if (document.readyState === 'complete') void register();
  else window.addEventListener('load', () => void register());
}

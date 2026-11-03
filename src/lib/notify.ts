/**
 * Avisos del sistema ("Te mandaron un pez"): aparecen aunque la app esté minimizada o en otra ventana.
 * En el celu, si la app está cerrada del todo, no llegan (para eso haría falta un servidor de avisos).
 */

export type NotifyState = 'unsupported' | 'default' | 'granted' | 'denied';

export function notifyState(): NotifyState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotifyState;
}

export async function askNotify(): Promise<NotifyState> {
  if (notifyState() === 'unsupported') return 'unsupported';
  try {
    return (await Notification.requestPermission()) as NotifyState;
  } catch {
    return notifyState();
  }
}

/** ¿Hay alguien mirando la app ahora? (si sí, ya ve el pez llegar nadando: no hace falta el aviso). */
const looking = () => document.visibilityState === 'visible' && document.hasFocus();

export async function notify(title: string, body: string, tag: string) {
  if (notifyState() !== 'granted' || looking()) return;
  const opts: NotificationOptions = { body, tag, icon: './icon-192.png', badge: './icon-192.png' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return await reg.showNotification(title, opts);
  } catch {
    /* sigo con el aviso simple */
  }
  try {
    const n = new Notification(title, opts);
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* el navegador no deja (por ejemplo, Android sin service worker) */
  }
}

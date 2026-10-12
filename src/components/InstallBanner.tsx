import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useUI } from '../store/ui';
import { IconDownload, IconX } from './Icons';

const DISMISS_KEY = 'mis-tareas:install-dismissed';

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function browserHint(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'En Edge: menú ⋯ (arriba a la derecha) → Aplicaciones → Instalar Mis tareas.';
  if (/Chrome\//.test(ua) && !/OPR\//.test(ua))
    return 'En Chrome: el ícono de instalar a la derecha de la barra de direcciones, o menú ⋮ → Instalar Mis tareas.';
  return 'Para instalarla, abrí este link en Microsoft Edge o Google Chrome.';
}

/**
 * Cuando la app se abre en una pestaña del navegador (por ejemplo, desde el link que te pasaron),
 * invita a instalarla: queda con su ícono, en su propia ventana, en el escritorio y la barra de tareas.
 */
export function InstallBanner() {
  const install = useInstallPrompt();
  const toast = useUI((s) => s.toast);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const forced = new URLSearchParams(location.search).has('instalar');
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      /* sin almacenamiento */
    }
    if (forced || !dismissed) setShow(true);
    const onInstalled = () => {
      setShow(false);
      toast('🐟 ¡Listo! Mis tareas quedó instalada: la encontrás en el menú Inicio y en el escritorio');
    };
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, [toast]);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* sin almacenamiento */
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.aside
          className="install-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
          aria-label="Instalar la app"
        >
          <img src="./icon-192.png" alt="" width={56} height={56} className="install-icon" />
          <div className="install-text">
            <strong>Instalá Mis tareas como app</strong>
            <span>
              Queda con su ícono en el escritorio y la barra de tareas, y se abre en su propia ventana.
              {!install.canInstall && <> {browserHint()}</>}
            </span>
          </div>
          {install.canInstall && (
            <button type="button" className="btn btn-primary" onClick={() => void install.prompt()}>
              <IconDownload size={16} /> Instalar
            </button>
          )}
          <button type="button" className="icon-btn install-close" onClick={dismiss} aria-label="Ahora no" title="Ahora no">
            <IconX size={16} />
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

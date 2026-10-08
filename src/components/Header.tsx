import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTasks } from '../store/tasks';
import { useUI } from '../store/ui';
import { dayKey, formatMinutes, startOfDay, todayLong } from '../lib/time';
import { downloadFile, makeBackup, parseBackup } from '../lib/backup';
import { Fish, MiniFish } from './Fish';
import { Modal } from './Modal';
import { IconBook, IconDots, IconDownload, IconUpload, IconUsers } from './Icons';
import { useIncoming, useShared } from '../store/shared';
import { SpeciesFish } from './Fishes';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export function Header() {
  const log = useTasks((s) => s.log);
  const setLogOpen = useUI((s) => s.setLogOpen);
  const today = startOfDay();
  const todays = log.filter((e) => e.completedAt >= today);
  const minutes = todays.reduce((a, e) => a + (e.minutes ?? 0), 0);

  return (
    <header className="topbar">
      <div className="brand">
        <Fish width={78} className="brand-fish" />
        <div>
          <h1>Mis tareas</h1>
          <p className="brand-date">{todayLong()}</p>
        </div>
      </div>

      <div className="topbar-actions">
        <button type="button" className="today-pill" onClick={() => setLogOpen(true)} title="Lo que terminaste hoy">
          <span className="muted">Hoy</span>
          <strong>{todays.length}</strong>
          <MiniFish size={26} />
          {minutes > 0 && <span className="today-time">{formatMinutes(minutes)}</span>}
        </button>
        <button type="button" className="top-btn" onClick={() => setLogOpen(true)}>
          <IconBook size={17} /> <span className="hide-sm">Bitácora</span>
        </button>
        <ShareButton />
        <MoreMenu />
      </div>
    </header>
  );
}

/** "Compartir" (sin cuenta) o "Pecera" con los peces que me esperan. */
function ShareButton() {
  const status = useShared((s) => s.status);
  const waiting = useIncoming().length;
  if (status === 'off' || status === 'loading') return null;
  if (status === 'signedOut')
    return (
      <button type="button" className="top-btn" onClick={() => useShared.setState({ authOpen: true })} title="Compartir tareas con otras personas">
        <IconUsers size={18} /> <span className="hide-sm">Compartir</span>
      </button>
    );
  return (
    <button
      type="button"
      className={`top-btn pecera-btn ${waiting ? 'has-fish' : ''}`}
      onClick={() => useShared.setState({ peceraOpen: true })}
      title={waiting ? `${waiting} ${waiting === 1 ? 'pez esperando' : 'peces esperando'}` : 'Pecera: tareas compartidas'}
    >
      <SpeciesFish kind="payaso" width={34} swim={waiting > 0} />
      <span className="hide-sm">Pecera</span>
      {waiting > 0 && <span className="top-badge">{waiting}</span>}
    </button>
  );
}

function MoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useUI((s) => s.toast);
  const [pending, setPending] = useState<ReturnType<typeof parseBackup> | null>(null);
  const install = useInstallPrompt();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const exportBackup = () => {
    const { tasks, log } = useTasks.getState();
    downloadFile(
      `mis-tareas-backup-${dayKey(Date.now())}.json`,
      JSON.stringify(makeBackup(tasks, log), null, 2),
      'application/json',
    );
    setOpen(false);
    toast('Copia de seguridad descargada');
  };

  const importBackup = async (file: File) => {
    try {
      setPending(parseBackup(await file.text()));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No pude leer el archivo');
    } finally {
      setOpen(false);
    }
  };

  const confirmImport = () => {
    if (!pending) return;
    useTasks.getState().replaceAll(pending);
    setPending(null);
    toast('Copia de seguridad restaurada');
  };

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="top-btn top-btn--icon"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Más opciones"
      >
        <IconDots size={18} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="menu-pop"
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
          >
            <p className="menu-note">Tus tareas se guardan en este navegador. Hacé una copia de vez en cuando.</p>
            <button type="button" role="menuitem" onClick={exportBackup}>
              <IconDownload size={16} /> Descargar copia de seguridad
            </button>
            <button type="button" role="menuitem" onClick={() => fileRef.current?.click()}>
              <IconUpload size={16} /> Restaurar una copia…
            </button>
            {install.canInstall && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  void install.prompt();
                }}
              >
                <IconDownload size={16} /> Instalar en esta computadora
              </button>
            )}
            <p className="menu-version">Mis tareas · versión {__APP_VERSION__}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void importBackup(f);
        }}
      />
      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title="Restaurar copia de seguridad"
        footer={
          <>
            <span className="spacer" />
            <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={confirmImport}>
              Reemplazar
            </button>
          </>
        }
      >
        {pending && (
          <p>
            La copia tiene <strong>{pending.tasks.length}</strong> tareas y <strong>{pending.log.length}</strong> en la
            bitácora. Va a reemplazar todo lo que tenés ahora.
          </p>
        )}
      </Modal>
    </div>
  );
}

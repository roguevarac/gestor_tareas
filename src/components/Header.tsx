import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTasks } from '../store/tasks';
import { useUI } from '../store/ui';
import { startOfDay, todayLong } from '../lib/time';
import { Fish, MiniFish } from './Fish';
import { IconBoard, IconBook, IconDots, IconDownload, IconHelp, IconSend, IconUsers } from './Icons';
import { useSupervision } from '../store/supervision';
import { useIncoming, useShared } from '../store/shared';
import { SpeciesFish } from './Fishes';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export function Header() {
  const log = useTasks((s) => s.log);
  const setLogOpen = useUI((s) => s.setLogOpen);
  const today = startOfDay();
  const todays = log.filter((e) => e.completedAt >= today);

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
        </button>
        <button type="button" className="top-btn" onClick={() => setLogOpen(true)}>
          <IconBook size={17} /> <span className="hide-sm">Bitácora</span>
        </button>
        <BoardButton />
        <SentButton />
        <ShareButton />
        <button
          type="button"
          className="top-btn"
          onClick={() => useUI.setState({ manualOpen: true })}
          title="Cómo se usa cada cosa"
        >
          <IconHelp size={17} /> <span className="hide-sm">Manual</span>
        </button>
        <MoreMenu />
      </div>
    </header>
  );
}

/** Para todos: las tareas que mandé. */
function SentButton() {
  const ready = useShared((s) => s.status === 'ready');
  if (!ready) return null;
  return (
    <button
      type="button"
      className="top-btn"
      onClick={() => useShared.setState({ sentOpen: true })}
      title="Tareas que mandaste, con fecha de envío"
    >
      <IconSend size={16} /> <span className="hide-sm">Enviadas</span>
    </button>
  );
}

/** Para todos: las tareas de cada persona del equipo (solo para mirar). */
function BoardButton() {
  const ready = useShared((s) => s.status === 'ready' && !!s.me && !s.me.private);
  if (!ready) return null;
  return (
    <button
      type="button"
      className="top-btn"
      onClick={() => useSupervision.setState({ boardOpen: true })}
      title="Ver las tareas de cada persona del equipo (solo para mirar)"
    >
      <IconBoard size={17} /> <span className="hide-sm">Tareas del equipo</span>
    </button>
  );
}

/** "Compartir" (sin cuenta) o "Pecera" con los peces que me esperan. */
function ShareButton() {
  const status = useShared((s) => s.status);
  const waiting = useIncoming().length;
  if (status === 'off' || status === 'loading') return null;
  if (status === 'setup' || status === 'choose')
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
      <SpeciesFish kind="koi" width={34} swim={waiting > 0} />
      <span className="hide-sm">Pecera</span>
      {waiting > 0 && <span className="top-badge">{waiting}</span>}
    </button>
  );
}

function MoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
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
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                useUI.setState({ manualOpen: true });
              }}
            >
              <IconHelp size={16} /> Manual de uso
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
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useShared } from '../store/shared';
import { castLine, clearPing, QUESTION, useMyCasts, useSupervision } from '../store/supervision';
import { useUI } from '../store/ui';
import { firstName } from '../sharing/logic';
import { Avatar } from './Avatar';
import { IconBoard, IconX } from './Icons';
import { ago } from '../lib/time';

/** Cañita chica (para botones). */
export function RodIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 21 L18 3" stroke="#8a5a2b" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M3 21 L7 16.2" stroke="#3b2a1a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="6.6" cy="18" r="1.6" fill="#555" />
      <path d="M18 3 C20 8 20.5 12 20.5 15" stroke="currentColor" strokeWidth="0.9" />
      <path d="M20.5 15 v2.4 a1.5 1.5 0 0 1 -3 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * La caña de pescar al costado de la pantalla (solo supervisión): se elige a quién y le baja
 * la pregunta "¿En qué andás?" como carnada.
 */
export function FishingRod() {
  const supervisor = useShared((s) => s.status === 'ready' && !!s.me?.supervisor);
  const open = useSupervision((s) => s.rodOpen);
  const users = useShared((s) => s.users);
  const me = useShared((s) => s.memberId);
  const casts = useMyCasts();
  const toast = useUI((s) => s.toast);
  const [casting, setCasting] = useState<string | null>(null);
  const [splash, setSplash] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const others = useMemo(
    () => users.filter((u) => u.uid !== me).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [users, me],
  );
  const waiting = casts.filter((c) => !c.answeredAt && Date.now() - c.createdAt < 10 * 3600 * 1000).length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) useSupervision.setState({ rodOpen: false });
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && useSupervision.setState({ rodOpen: false });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!supervisor) return null;

  const cast = async (uid: string, name: string) => {
    setCasting(uid);
    const ok = await castLine(uid);
    setCasting(null);
    if (ok) {
      setSplash((n) => n + 1);
      toast(`🎣 Le tiraste la caña a ${firstName(name)}`);
    }
  };

  return (
    <div className="rod-dock" ref={ref}>
      <button
        type="button"
        className={`rod-btn ${open ? 'is-open' : ''}`}
        onClick={() => useSupervision.setState({ rodOpen: !open })}
        aria-expanded={open}
        aria-label="Caña: preguntar en qué anda alguien"
        title="¿En qué andás? — tirale la caña a alguien del equipo"
      >
        <svg className="rod-art" viewBox="0 0 70 150" aria-hidden="true">
          <path d="M60 140 L16 12" stroke="#7a4f24" strokeWidth="4" strokeLinecap="round" />
          <path d="M60 140 L52 116" stroke="#2e2116" strokeWidth="7" strokeLinecap="round" />
          <circle cx="51" cy="124" r="6" fill="#5b636a" stroke="#2d3236" strokeWidth="1.5" />
          <path d="M51 124 l5 -3" stroke="#2d3236" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 12 C10 40 9 62 10 82" className="rod-line" stroke="#33586a" strokeWidth="1" fill="none" />
          <g className="rod-bobber">
            <ellipse cx="10" cy="88" rx="5.5" ry="7" fill="#fff" stroke="#2d3236" strokeWidth="1" />
            <path d="M4.6 86 A5.5 7 0 0 1 15.4 86 Z" fill="#e63946" />
            <path d="M10 95 v8 a3 3 0 0 1 -6 0" stroke="#2d3236" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </g>
        </svg>
        {waiting > 0 && <span className="top-badge rod-badge">{waiting}</span>}
        <AnimatePresence>
          {splash > 0 && (
            <motion.span
              key={splash}
              className="rod-splash"
              initial={{ scale: 0.2, opacity: 0.9 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            />
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="rod-pop"
            initial={{ opacity: 0, x: 16, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 16, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            role="dialog"
            aria-label="¿En qué andás?"
          >
            <header className="rod-pop-head">
              <strong>{QUESTION}</strong>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => useSupervision.setState({ rodOpen: false, boardOpen: true })}
              >
                <IconBoard size={15} /> Tablero
              </button>
            </header>
            <p className="rod-pop-hint">Elegí a quién tirarle la caña. Le baja la pregunta y te contesta al toque.</p>
            {others.length === 0 ? (
              <p className="muted small">No hay nadie más en el equipo.</p>
            ) : (
              <ul className="rod-people">
                {others.map((u) => {
                  const last = casts.find((c) => c.to === u.uid);
                  return (
                    <li key={u.uid}>
                      <button
                        type="button"
                        className="rod-person"
                        disabled={casting === u.uid}
                        onClick={() => void cast(u.uid, u.name)}
                      >
                        <Avatar uid={u.uid} name={u.name} size={30} />
                        <span className="rod-person-main">
                          <strong>{u.name}</strong>
                          {last ? (
                            last.answeredAt ? (
                              <small>
                                «{last.answer}» · {ago(last.answeredAt)}
                              </small>
                            ) : (
                              <small className="is-waiting">Esperando respuesta… · {ago(last.createdAt)}</small>
                            )
                          ) : (
                            <small>Tirarle la caña</small>
                          )}
                        </span>
                        <span className="rod-person-cast" aria-hidden="true">
                          <RodIcon size={20} />
                        </span>
                      </button>
                      {last && (
                        <button
                          type="button"
                          className="icon-btn rod-clear"
                          aria-label={`Borrar la última pregunta a ${u.name}`}
                          title="Borrar"
                          onClick={() => void clearPing(last.id)}
                        >
                          <IconX size={13} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Ping } from '../sharing/types';
import { answerPing, usePendingBait } from '../store/supervision';
import { useAllTasks } from '../store/allTasks';
import { useUI } from '../store/ui';
import { firstName } from '../sharing/logic';
import { Avatar } from './Avatar';

/** Cuando te tiran la caña: baja la carnada con "¿En qué andás?" y contestás al toque. */
export function Bait() {
  const pending = usePendingBait();
  const [later, setLater] = useState<Record<string, true>>({});
  const current = pending.find((p) => !later[p.id]);
  const [reeling, setReeling] = useState(false);

  return (
    <AnimatePresence onExitComplete={() => setReeling(false)}>
      {current && (
        <motion.div
          key={current.id}
          className="bait-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { delay: 0.45, duration: 0.2 } }}
        >
          <div className="bait-backdrop" />
          <BaitCard
            ping={current}
            reeling={reeling}
            onAnswered={() => setReeling(true)}
            onLater={() => setLater((l) => ({ ...l, [current.id]: true }))}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const QUICK = ['En una reunión', 'Almorzando', 'Libre, ¿necesitás algo?'];

function BaitCard({
  ping,
  reeling,
  onAnswered,
  onLater,
}: {
  ping: Ping;
  reeling: boolean;
  onAnswered(): void;
  onLater(): void;
}) {
  const tasks = useAllTasks();
  const toast = useUI((s) => s.toast);
  const [text, setText] = useState('');
  const chips = useMemo(
    () => [...tasks.slice(0, 4).map((t) => `Con ${t.title.length > 48 ? `${t.title.slice(0, 46)}…` : t.title}`), ...QUICK],
    [tasks],
  );

  const send = (answer: string) => {
    if (!answer.trim()) return;
    onAnswered();
    // Primero se recoge la línea; después se guarda (si no, la tarjeta desaparece de golpe).
    window.setTimeout(() => void answerPing(ping.id, answer), 450);
    toast(`🎣 Le contestaste a ${firstName(ping.fromName)}`);
  };

  return (
    <motion.div
      className="bait"
      initial={{ y: '-110vh' }}
      animate={reeling ? { y: '-120vh', transition: { duration: 0.5, ease: 'easeIn' } } : { y: 0 }}
      transition={{ type: 'spring', stiffness: 90, damping: 12, mass: 0.9 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${ping.fromName} pregunta: ${ping.question}`}
    >
      <div className="bait-line" aria-hidden="true" />
      <motion.div
        className="bait-swing"
        // Se hamaca un poco al llegar y se queda quieta (así es fácil tocar las respuestas).
        animate={{ rotate: [0, -5, 4, -2.5, 1.2, 0] }}
        transition={{ duration: 2.2, ease: 'easeOut', delay: 0.3 }}
      >
        <svg className="bait-hook" viewBox="0 0 40 56" aria-hidden="true">
          <path d="M20 0 V30 a10 10 0 1 1 -14 -9" stroke="#5c6870" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M6 21 l-3 -5 l6 1" fill="#5c6870" />
          <path
            className="bait-worm"
            d="M14 30 C10 36 22 38 18 44 C14 50 26 52 22 56"
            stroke="#d9777f"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
        <div className="bait-card">
          <p className="bait-kicker">
            <Avatar uid={ping.from} name={ping.fromName} size={26} />
            <span>
              <strong>{firstName(ping.fromName)}</strong> te tiró la caña
            </span>
          </p>
          <h2 className="bait-question">{ping.question}</h2>
          <div className="bait-chips">
            {chips.map((c) => (
              <button key={c} type="button" className="chip bait-chip" onClick={() => send(c)} disabled={reeling}>
                {c}
              </button>
            ))}
          </div>
          <form
            className="bait-form"
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
          >
            <input
              className="input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="O escribí algo corto…"
              aria-label="Tu respuesta"
              maxLength={280}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={!text.trim() || reeling}>
              Responder
            </button>
          </form>
          <button type="button" className="link-btn bait-later" onClick={onLater} disabled={reeling}>
            Ahora no
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

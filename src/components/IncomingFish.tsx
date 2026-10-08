import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { SharedDoc } from '../sharing/types';
import { acceptFish, declineFish, snoozeFish, useIncoming, useShared } from '../store/shared';
import { useUI } from '../store/ui';
import { firstName } from '../sharing/logic';
import { SPECIES, SpeciesFish, speciesWithArticle } from './Fishes';
import { Avatar } from './Avatar';

/** Cuando te mandan un pez: llega nadando con la tarea y elegís si la aceptás. */
export function IncomingFish() {
  const incoming = useIncoming();
  const snoozed = useShared((s) => s.snoozed);
  const busyModal = useShared((s) => !!s.sendDialog || s.authOpen || s.peceraOpen);
  const current = incoming.find((d) => !snoozed[d.id]);
  const [leaving, setLeaving] = useState<'accept' | 'decline' | null>(null);

  const show = !!current && !busyModal;
  return (
    <AnimatePresence onExitComplete={() => setLeaving(null)}>
      {show && current && (
        <motion.div
          key={current.id}
          className="incoming-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, delay: 0.25 } }}
        >
          <div className="incoming-backdrop" />
          <IncomingCard doc={current} leaving={leaving} onLeave={setLeaving} more={incoming.length - 1} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function IncomingCard({
  doc,
  leaving,
  onLeave,
  more,
}: {
  doc: SharedDoc;
  leaving: 'accept' | 'decline' | null;
  onLeave(v: 'accept' | 'decline'): void;
  more: number;
}) {
  const me = useShared((s) => s.me?.uid ?? '');
  const toast = useUI((s) => s.toast);
  const from = doc.names[doc.from] ?? 'Alguien';
  const says = SPECIES.find((s) => s.kind === doc.fish)?.says;
  const joint = doc.mode === 'joint';
  const others = doc.participants.filter((u) => u !== me && u !== doc.from);
  const mine = doc.subtasks.filter((s) => s.assignee === me).length;

  const accept = () => {
    onLeave('accept');
    window.setTimeout(() => void acceptFish(doc.id), 620);
    toast(joint ? `🐟 Te sumaste a «${doc.title}»` : `🐟 «${doc.title}» está en tu lista`);
  };
  const decline = () => {
    onLeave('decline');
    window.setTimeout(() => void declineFish(doc.id), 620);
    toast(`Le avisamos a ${firstName(from)} que no la tomás`);
  };

  return (
    <div className="incoming-stage" role="dialog" aria-modal="true" aria-label={`${from} te mandó una tarea`}>
      <motion.div
        className="incoming-fish"
        initial={{ x: '-70vw', y: 30, rotate: 6 }}
        animate={
          leaving === 'accept'
            ? { x: '10vw', y: '60vh', rotate: 60, scale: 0.5, transition: { duration: 0.6, ease: 'easeIn' } }
            : leaving === 'decline'
              ? { x: '-90vw', y: -40, rotate: -10, scaleX: -1, transition: { duration: 0.6, ease: 'easeIn' } }
              : { x: 0, y: [0, -6, 0], rotate: [0, -3, 0], transition: { x: { type: 'spring', stiffness: 60, damping: 13 }, y: { repeat: Infinity, duration: 2.4, ease: 'easeInOut' }, rotate: { repeat: Infinity, duration: 2.4, ease: 'easeInOut' } } }
        }
      >
        <SpeciesFish kind={doc.fish} width={170} />
        <motion.span className="incoming-bubble b1" animate={{ y: [-4, -40], opacity: [0.9, 0] }} transition={{ repeat: Infinity, duration: 1.8 }} />
        <motion.span className="incoming-bubble b2" animate={{ y: [-4, -54], opacity: [0.9, 0] }} transition={{ repeat: Infinity, duration: 2.3, delay: 0.6 }} />
      </motion.div>

      <motion.div
        className="incoming-card"
        initial={{ opacity: 0, y: 30, scale: 0.94 }}
        animate={leaving ? { opacity: 0, y: 20, scale: 0.96 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: leaving ? 0 : 0.35, type: 'spring', stiffness: 260, damping: 24 }}
      >
        <p className="incoming-kicker">
          <Avatar uid={doc.from} name={from} size={24} />
          <span>
            <strong>{firstName(from)}</strong> te mandó {speciesWithArticle(doc.fish)}
          </span>
          {says && <span className="tag">{says}</span>}
        </p>
        <h2 className="incoming-title">{doc.title}</h2>
        <p className="incoming-mode">
          {joint
            ? others.length
              ? `Proyecto conjunto con ${firstName(from)} y ${others.map((u) => firstName(doc.names[u] ?? '')).join(', ')}`
              : `Proyecto conjunto con ${firstName(from)}`
            : doc.kind === 'project'
              ? 'Proyecto para vos'
              : 'Tarea para vos'}
          {joint && mine > 0 && ` · ${mine} ${mine === 1 ? 'subtarea es tuya' : 'subtareas son tuyas'}`}
        </p>
        {doc.message && <blockquote className="incoming-message">“{doc.message}”</blockquote>}
        {doc.subtasks.length > 0 && (
          <ul className="incoming-subs">
            {doc.subtasks.slice(0, 6).map((s) => (
              <li key={s.id} className={s.assignee === me ? 'is-mine' : ''}>
                <span className="incoming-sub-dot" />
                <span>{s.title}</span>
                {joint && s.assignee && (
                  <small>{s.assignee === me ? 'vos' : firstName(doc.names[s.assignee] ?? '')}</small>
                )}
              </li>
            ))}
            {doc.subtasks.length > 6 && <li className="muted">y {doc.subtasks.length - 6} más…</li>}
          </ul>
        )}
        {doc.notes && <p className="incoming-notes">{doc.notes}</p>}
        <div className="incoming-actions">
          <button type="button" className="btn btn-ghost" disabled={!!leaving} onClick={decline}>
            No la tomo
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!!leaving}
            onClick={() => {
              snoozeFish(doc.id);
              toast('Queda esperando en la pecera');
            }}
          >
            Después
          </button>
          <span className="spacer" />
          <button type="button" className="btn btn-primary" disabled={!!leaving} onClick={accept} autoFocus>
            Aceptar
          </button>
        </div>
        {more > 0 && <p className="incoming-more">Hay {more} {more === 1 ? 'pez más' : 'peces más'} esperando</p>}
      </motion.div>
    </div>
  );
}

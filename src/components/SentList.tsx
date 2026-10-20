import { useMemo, useState } from 'react';
import type { SharedDoc } from '../sharing/types';
import { deleteShared, recoverSent, useSent, useShared } from '../store/shared';
import { firstName } from '../sharing/logic';
import { dateTimeLabel } from '../lib/time';
import { Modal } from './Modal';
import { SpeciesFish } from './Fishes';
import { Avatar } from './Avatar';
import { IconCheck, IconEdit, IconSearch, IconSend } from './Icons';
import { useUI } from '../store/ui';
import { PriorityChip } from './PriorityChip';

type Filter = 'open' | 'done' | 'all';

/** "Enviadas": todo lo que mandé, con fecha de envío, a quién y cómo va. */
export function SentPanel() {
  const open = useShared((s) => s.sentOpen && s.status === 'ready');
  const sent = useSent();
  const [filter, setFilter] = useState<Filter>('open');
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sent.filter(
      (d) =>
        (filter === 'all' || (filter === 'done' ? d.state === 'done' : d.state !== 'done')) &&
        (!q ||
          d.title.toLowerCase().includes(q) ||
          Object.values(d.names).some((n) => n.toLowerCase().includes(q))),
    );
  }, [sent, filter, query]);
  const openCount = sent.filter((d) => d.state !== 'done').length;

  return (
    <Modal
      open={open}
      onClose={() => useShared.setState({ sentOpen: false })}
      placement="side"
      className="sent-panel"
      title={
        <>
          <span className="log-title">Enviadas</span>
          <span className="log-subtitle">Tareas que mandaste</span>
        </>
      }
    >
      <div className="segmented sent-filter" role="radiogroup" aria-label="Mostrar">
        {(
          [
            ['open', `En curso (${openCount})`],
            ['done', `Terminadas (${sent.length - openCount})`],
            ['all', 'Todas'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={filter === k} className={filter === k ? 'is-on' : ''} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>
      {sent.length > 4 && (
        <label className="search">
          <IconSearch size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tarea o persona…" aria-label="Buscar" />
        </label>
      )}
      {list.length === 0 ? (
        <div className="empty empty--log">
          <SpeciesFish kind="mojarrita" width={70} swim={false} />
          <p>{sent.length === 0 ? 'Todavía no mandaste ninguna tarea.' : 'No hay nada acá.'}</p>
          {sent.length === 0 && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => useShared.setState({ sentOpen: false, sendDialog: {} })}>
              <IconSend size={15} /> Mandar un pez
            </button>
          )}
        </div>
      ) : (
        <ul className="pecera-list">
          {list.map((d) => (
            <SentItem key={d.id} doc={d} />
          ))}
        </ul>
      )}
    </Modal>
  );
}

const STATE_LABEL: Record<string, string> = {
  pending: 'esperando',
  accepted: 'aceptó',
  declined: 'no la tomó',
  left: 'salió',
};

export function SentItem({ doc }: { doc: SharedDoc }) {
  const me = useShared((s) => s.memberId);
  const [confirm, setConfirm] = useState(false);
  const [showSubs, setShowSubs] = useState(false);
  const recipients = doc.participants.filter((u) => u !== me);
  const total = doc.subtasks.length;
  const done = doc.subtasks.filter((s) => s.done).length;
  const allDeclined = recipients.every((u) => ['declined', 'left'].includes(doc.invites[u]));
  const nobodyAnswered = recipients.every((u) => doc.invites[u] === 'pending');
  const finished = doc.state === 'done';

  return (
    <li className={`pecera-item ${finished ? 'is-done' : ''}`}>
      <SpeciesFish kind={doc.fish} width={58} swim={false} />
      <div className="pecera-main">
        <p className="pecera-title">
          {doc.title} <PriorityChip priority={doc.priority} onCard={false} />
        </p>
        <p className="sent-date">Enviada: {dateTimeLabel(doc.createdAt)}</p>
        <p className="pecera-meta">
          {doc.mode === 'joint' ? 'Conjunta' : 'Para que la haga'}
          {total > 0 && ` · ${done}/${total} subtareas`}
          {finished && doc.doneBy && ` · terminada por ${doc.doneBy === me ? 'vos' : firstName(doc.names[doc.doneBy] ?? '')}`}
        </p>
        <div className="pecera-people">
          {recipients.map((u) => (
            <span key={u} className={`person-state is-${doc.invites[u]}`}>
              <Avatar uid={u} name={doc.names[u] ?? '?'} size={20} />
              {firstName(doc.names[u] ?? '')}
              <small>{finished && doc.invites[u] === 'accepted' ? 'terminada' : STATE_LABEL[doc.invites[u]] ?? ''}</small>
            </span>
          ))}
        </div>
        {total > 0 && (
          <>
            <button type="button" className="link-btn sent-subs-toggle" onClick={() => setShowSubs((v) => !v)} aria-expanded={showSubs}>
              {showSubs ? 'Ocultar subtareas' : `Ver subtareas (${done}/${total})`}
            </button>
            {showSubs && (
              <ul className="sent-subs">
                {doc.subtasks.map((st) => (
                  <li key={st.id} className={st.done ? 'is-done' : ''}>
                    <span className={`sent-check ${st.done ? 'is-on' : ''}`} aria-hidden="true">
                      {st.done && <IconCheck size={11} />}
                    </span>
                    <span>{st.title}</span>
                    {st.assignee && <small>{firstName(doc.names[st.assignee] ?? '')}</small>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {finished && doc.doneAt && <p className="sent-date">Terminada: {dateTimeLabel(doc.doneAt)}</p>}
        <div className="pecera-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              useShared.setState({ sentOpen: false });
              useUI.getState().openTask(doc.id, { fromSent: true });
            }}
          >
            <IconEdit size={14} /> Editar
          </button>
          {doc.mode === 'assigned' && (allDeclined || nobodyAnswered) && !finished && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void recoverSent(doc.id)}>
              Recuperarla
            </button>
          )}
          {confirm ? (
            <>
              <span className="small">¿Borrarla para todos?</span>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => void deleteShared(doc.id)}>
                Sí
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>
                No
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm btn-danger-text" onClick={() => setConfirm(true)}>
              {finished ? 'Quitar' : nobodyAnswered ? 'Cancelar' : 'Borrar'}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}


import { useState } from 'react';
import type { SharedDoc } from '../sharing/types';
import {
  acceptFish,
  declineFish,
  deleteShared,
  recoverSent,
  team,
  useIncoming,
  useSent,
  useShared,
} from '../store/shared';
import { useUI } from '../store/ui';
import { firstName } from '../sharing/logic';
import { todayLong } from '../lib/time';
import { Modal } from './Modal';
import { SpeciesFish } from './Fishes';
import { Avatar } from './Avatar';
import { EditableText } from './EditableText';
import { IconCopy, IconEye, IconLogout, IconPlus, IconSend, IconX } from './Icons';
import { copyText } from './MailLinks';
import { APP_URL } from './SendFishDialog';

/** La pecera: peces que me mandaron, peces que mandé y mi cuenta. */
export function Pecera() {
  const open = useShared((s) => s.peceraOpen && s.status === 'ready');
  const me = useShared((s) => s.me);
  const backendKind = useShared((s) => s.backendKind);
  const isAdmin = useShared((s) => s.isAdmin);
  const users = useShared((s) => s.users);
  const watchers = users.filter((u) => u.supervisor && u.uid !== me?.uid);
  const incoming = useIncoming();
  const sent = useSent();
  const toast = useUI((s) => s.toast);
  const close = () => useShared.setState({ peceraOpen: false });

  return (
    <Modal
      open={open}
      onClose={close}
      placement="side"
      className="pecera"
      title={
        <>
          <span className="log-title">Pecera</span>
          <span className="log-subtitle">Tareas compartidas</span>
        </>
      }
      footer={
        me && (
          <div className="pecera-account">
            <Avatar uid={me.uid} name={me.name} size={34} />
            <div className="pecera-me">
              <span className="pecera-name">{me.name}</span>
              <small>
                {me.email}
                {backendKind === 'demo' ? ' · modo prueba' : ''}
              </small>
              {watchers.length > 0 && (
                <small className="pecera-watchers">
                  Tus tareas abiertas y lo que terminás en el día las ve{watchers.length > 1 ? 'n' : ''}:{' '}
                  {watchers.map((w) => firstName(w.name)).join(', ')}
                </small>
              )}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                close();
                void team.leave().catch((e: Error) => toast(e.message));
              }}
              title="Si esta compu la usa otra persona"
            >
              <IconLogout size={15} /> No soy {firstName(me.name)}
            </button>
          </div>
        )
      }
    >
      <button
        type="button"
        className="btn btn-primary pecera-send"
        onClick={() => useShared.setState({ peceraOpen: false, sendDialog: {} })}
      >
        <IconSend size={17} /> Mandar un pez
      </button>

      <section className="pecera-section">
        <h3>
          Te mandaron <span className="pond-count">{incoming.length}</span>
        </h3>
        {incoming.length === 0 ? (
          <p className="muted small">No hay peces esperando.</p>
        ) : (
          <ul className="pecera-list">
            {incoming.map((d) => (
              <li key={d.id} className="pecera-item">
                <SpeciesFish kind={d.fish} width={58} swim={false} />
                <div className="pecera-main">
                  <p className="pecera-title">{d.title}</p>
                  <p className="pecera-meta">
                    De {firstName(d.names[d.from] ?? '')} · {d.mode === 'joint' ? 'conjunta' : 'para vos'} ·{' '}
                    {todayLong(d.createdAt).toLowerCase()}
                  </p>
                  <div className="pecera-actions">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => void acceptFish(d.id)}>
                      Aceptar
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void declineFish(d.id)}>
                      No la tomo
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pecera-section">
        <h3>
          Mandaste <span className="pond-count">{sent.length}</span>
        </h3>
        {sent.length === 0 ? (
          <p className="muted small">Todavía no mandaste ningún pez.</p>
        ) : (
          <ul className="pecera-list">
            {sent.map((d) => (
              <SentItem key={d.id} doc={d} />
            ))}
          </ul>
        )}
      </section>

      {isAdmin ? (
        <TeamSection />
      ) : (
        <section className="pecera-section pecera-invite">
          <h3>Sumar gente</h3>
          <p className="muted small">Para sumar a alguien al equipo, pedíselo a quien lo administra.</p>
        </section>
      )}

      <section className="pecera-section pecera-invite">
        <p className="muted small">Link para pasarle a la gente del equipo (abre la app y les ofrece instalarla):</p>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={async () => toast((await copyText(APP_URL)) ? 'Link copiado' : APP_URL)}
        >
          <IconCopy size={15} /> Copiar el link de la app
        </button>
      </section>
    </Modal>
  );
}

const STATE_LABEL: Record<string, string> = {
  pending: 'esperando',
  accepted: 'aceptó',
  declined: 'no la tomó',
  left: 'salió',
};

function SentItem({ doc }: { doc: SharedDoc }) {
  const me = useShared((s) => s.memberId);
  const [confirm, setConfirm] = useState(false);
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
        <p className="pecera-title">{doc.title}</p>
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
        <div className="pecera-actions">
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

/** Solo para quien administra: la lista del equipo. */
function TeamSection() {
  const members = useShared((s) => s.users);
  const memberId = useShared((s) => s.memberId);
  const toast = useUI((s) => s.toast);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await team.add(name, email);
      toast(`${firstName(name)} ya está en el equipo`);
      setName('');
      setEmail('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No pude sumarlo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pecera-section">
      <h3>
        Equipo <span className="pond-count">{members.length}</span>
      </h3>
      <ul className="team-list">
        {sorted.map((m) => (
          <li key={m.uid} className="team-row">
            <Avatar uid={m.uid} name={m.name} size={28} />
            <div className="team-main">
              <EditableText
                value={m.name}
                onSave={(v) => v.trim() && void team.update(m.uid, v, m.email, m.supervisor)}
                className="team-name"
                ariaLabel={`Nombre de ${m.name}`}
              />
              <EditableText
                value={m.email || 'agregar mail'}
                onSave={(v) => void team.update(m.uid, m.name, v === 'agregar mail' ? '' : v, m.supervisor)}
                className={`team-email ${m.email ? '' : 'is-empty'}`}
                ariaLabel={`Mail de ${m.name}`}
              />
            </div>
            <button
              type="button"
              className={`sup-toggle ${m.supervisor ? 'is-on' : ''}`}
              aria-pressed={!!m.supervisor}
              onClick={() => void team.update(m.uid, m.name, m.email, !m.supervisor)}
              title={
                m.supervisor
                  ? 'Ve el tablero del equipo y usa la caña. Tocá para sacárselo.'
                  : 'Darle el tablero del equipo y la caña ("¿En qué andás?")'
              }
            >
              <IconEye size={15} /> {m.supervisor ? 'Ve el tablero' : 'Tablero'}
            </button>
            {m.uid === memberId ? (
              <span className="tag">vos</span>
            ) : confirm === m.uid ? (
              <span className="team-confirm">
                <button type="button" className="btn btn-danger btn-sm" onClick={() => void team.remove(m.uid)}>
                  Sacar
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="icon-btn"
                onClick={() => setConfirm(m.uid)}
                aria-label={`Sacar a ${m.name} del equipo`}
                title="Sacar del equipo"
              >
                <IconX size={15} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="team-add"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" aria-label="Nombre" />
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Mail (opcional)"
          aria-label="Mail"
        />
        <button type="submit" className="btn btn-secondary" disabled={busy || !name.trim()}>
          <IconPlus size={16} /> Sumar
        </button>
      </form>
      <p className="hint muted">
        Cada persona abre la app, toca Compartir y elige su nombre. Con <strong>Tablero</strong> le das a alguien la
        vista de las tareas de todos y la caña para preguntar “¿En qué andás?”.
      </p>
    </section>
  );
}

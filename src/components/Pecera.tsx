import { useState } from 'react';
import type { SharedDoc } from '../sharing/types';
import {
  acceptFish,
  declineFish,
  deleteShared,
  recoverSent,
  sharingAuth,
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
import { IconCopy, IconLogout, IconSend } from './Icons';
import { copyText } from './MailLinks';
import { APP_URL } from './SendFishDialog';

/** La pecera: peces que me mandaron, peces que mandé y mi cuenta. */
export function Pecera() {
  const open = useShared((s) => s.peceraOpen && s.status === 'ready');
  const me = useShared((s) => s.me);
  const backendKind = useShared((s) => s.backendKind);
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
              <EditableText value={me.name} onSave={(v) => void sharingAuth.rename(v)} className="pecera-name" ariaLabel="Tu nombre" />
              <small>{me.email}{backendKind === 'demo' ? ' · modo prueba' : ''}</small>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                close();
                void sharingAuth.signOut();
              }}
            >
              <IconLogout size={15} /> Salir
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

      <section className="pecera-section pecera-invite">
        <h3>Sumar gente</h3>
        <p className="muted small">
          Pasales el link. Cuando entren con su cuenta, ya les podés mandar peces.
        </p>
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
  const me = useShared((s) => s.me?.uid);
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

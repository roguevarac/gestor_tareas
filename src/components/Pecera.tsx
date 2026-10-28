import { useState } from 'react';
import {
  acceptFish,
  declineFish,
  MIN_PASSWORD,
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
import { IconCopy, IconKey, IconLock, IconLogout, IconPlus, IconSend, IconX } from './Icons';
import { COUNTRIES, Flag } from './Flags';
import type { Country, Profile } from '../sharing/types';
import { copyText } from './MailLinks';
import { APP_URL } from './SendFishDialog';

/** La pecera: peces que me mandaron, peces que mandé y mi cuenta. */
export function Pecera() {
  const open = useShared((s) => s.peceraOpen && s.status === 'ready');
  const me = useShared((s) => s.me);
  const backendKind = useShared((s) => s.backendKind);
  const isAdmin = useShared((s) => s.isAdmin);
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
                {backendKind === 'demo' ? `${me.email ? ' · ' : ''}modo prueba` : ''}
              </small>
              {me.private && (
                <small className="pecera-private">
                  <IconLock size={12} /> Acceso privado: nadie ve tus tareas; solo lo que vos mandes o te manden.
                </small>
              )}
              <MyPassword memberId={me.uid} />
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
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => useShared.setState({ peceraOpen: false, sentOpen: true })}
          >
            <IconSend size={15} /> Ver tareas enviadas
          </button>
        )}
      </section>

      {isAdmin ? (
        <>
          <TeamSection />
          <PrivateSection />
        </>
      ) : me?.private ? null : (
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

/** Solo para quien administra: la lista del equipo. */
function TeamSection() {
  const members = useShared((s) => s.users);
  const memberId = useShared((s) => s.memberId);
  const toast = useUI((s) => s.toast);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState<Country | ''>('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [pwFor, setPwFor] = useState<string | null>(null);
  const [privFor, setPrivFor] = useState<string | null>(null);
  const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await team.add(name, email, password, country || null);
      toast(`${firstName(name)} ya está en el equipo. Pasale su contraseña.`);
      setName('');
      setEmail('');
      setPassword('');
      setCountry('');
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
          <li key={m.uid} className="team-item">
            <div className="team-row">
            <Avatar uid={m.uid} name={m.name} size={28} />
            <div className="team-main">
              <EditableText
                value={m.name}
                onSave={(v) => v.trim() && void team.update(m.uid, v, m.email, m.country ?? null)}
                className="team-name"
                ariaLabel={`Nombre de ${m.name}`}
              />
              <EditableText
                value={m.email || 'agregar mail'}
                onSave={(v) => void team.update(m.uid, m.name, v === 'agregar mail' ? '' : v, m.country ?? null)}
                className={`team-email ${m.email ? '' : 'is-empty'}`}
                ariaLabel={`Mail de ${m.name}`}
              />
              {!m.hasPassword && <small className="team-nopw">Sin contraseña: no puede entrar</small>}
            </div>
            <button
              type="button"
              className={`icon-btn team-key ${m.hasPassword ? '' : 'is-missing'}`}
              onClick={() => setPwFor(pwFor === m.uid ? null : m.uid)}
              aria-expanded={pwFor === m.uid}
              aria-label={`Contraseña de ${m.name}`}
              title={m.hasPassword ? 'Cambiar su contraseña' : 'Ponerle contraseña'}
            >
              <IconKey size={16} />
            </button>
            {m.uid !== memberId && (
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPrivFor(privFor === m.uid ? null : m.uid)}
                aria-expanded={privFor === m.uid}
                aria-label={`Pasar a ${m.name} a acceso privado`}
                title="Pasar a acceso privado"
              >
                <IconLock size={15} />
              </button>
            )}
            <label className={`country-pick ${m.country ? '' : 'is-empty'}`} title="Oficina">
              {m.country ? <Flag country={m.country} width={20} /> : <span className="country-none">🌎</span>}
              <select
                value={m.country ?? ''}
                aria-label={`Oficina de ${m.name}`}
                onChange={(e) => void team.update(m.uid, m.name, m.email, (e.target.value || null) as Country | null)}
              >
                <option value="">Sin oficina</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
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
            </div>
            {pwFor === m.uid && (
              <PasswordForm
                label={m.hasPassword ? `Nueva contraseña de ${firstName(m.name)}` : `Contraseña para ${firstName(m.name)}`}
                onSave={async (pw) => {
                  await team.setPassword(m.uid, pw);
                  setPwFor(null);
                  toast(`Contraseña de ${firstName(m.name)} guardada. Pasásela.`);
                }}
                onCancel={() => setPwFor(null)}
              />
            )}
            {privFor === m.uid && <MakePrivate member={m} onDone={() => setPrivFor(null)} />}
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
        <input
          className="input"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          aria-label="Contraseña"
          autoComplete="off"
        />
        <select
          className="input"
          value={country}
          onChange={(e) => setCountry(e.target.value as Country | '')}
          aria-label="Oficina"
        >
          <option value="">Oficina…</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="btn btn-secondary"
          disabled={busy || !name.trim() || password.trim().length < MIN_PASSWORD}
          title={password.trim().length < MIN_PASSWORD ? `Contraseña de al menos ${MIN_PASSWORD} caracteres` : undefined}
        >
          <IconPlus size={16} /> Sumar
        </button>
      </form>
      <p className="hint muted">
        Cada persona abre la app, toca Compartir, elige su nombre y pone la contraseña que le diste; la primera vez
        elige una suya. Con la banderita elegís la oficina y con el candado le das acceso privado.
      </p>
    </section>
  );
}

/** Pasar a alguien del equipo a acceso privado, con una contraseña temporal. */
function MakePrivate({ member, onDone }: { member: Profile; onDone(): void }) {
  const toast = useUI((s) => s.toast);
  if (!member.email.trim())
    return (
      <p className="hint hint--warn team-private-note">
        Primero cargale el mail (tocá «agregar mail»): con acceso privado se entra con el mail.
      </p>
    );
  return (
    <div className="team-private-note">
      <p className="hint">
        <b>Acceso privado</b>: {firstName(member.name)} deja de figurar en el equipo, nadie (ni quien administra) ve
        sus tareas, no le pueden tirar la caña y no ve las del equipo. Sí se pueden mandar peces (de ida y de vuelta).
        Entra con su mail y esta contraseña
        temporal, y la primera vez elige la suya.
      </p>
      <PasswordForm
        label="Contraseña temporal"
        onSave={async (pw) => {
          await team.makePrivate(member, pw);
          onDone();
          toast(`${firstName(member.name)} ya tiene acceso privado. Pasale su contraseña temporal.`);
        }}
        onCancel={onDone}
      />
    </div>
  );
}

/** Solo para quien administra: personas con acceso privado (no figuran en el equipo). */
function PrivateSection() {
  const people = useShared((s) => s.privateUsers);
  const toast = useUI((s) => s.toast);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [pwFor, setPwFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const add = async () => {
    setBusy(true);
    try {
      await team.addPrivate(name, email, password);
      toast(`${firstName(name)} tiene acceso privado. Pasale el link, su mail y la contraseña.`);
      setName('');
      setEmail('');
      setPassword('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No pude sumarla');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pecera-section">
      <h3>
        <IconLock size={15} /> Acceso privado <span className="pond-count">{people.length}</span>
      </h3>
      <p className="hint muted">
        No aparecen en la lista del equipo ni en Tareas del equipo, nadie ve sus tareas y no les llega la caña. Sí se
        les pueden mandar peces y ellas también mandan. Entran con su mail.
      </p>
      {sorted.length > 0 && (
        <ul className="team-list">
          {sorted.map((m) => (
            <li key={m.uid} className="team-item">
              <div className="team-row">
                <Avatar uid={m.uid} name={m.name} size={28} />
                <div className="team-main">
                  <span className="team-name">{m.name}</span>
                  <span className="team-email">{m.email}</span>
                  {m.mustChangePassword && <small className="muted">Todavía no eligió su contraseña</small>}
                </div>
                <button
                  type="button"
                  className="icon-btn team-key"
                  onClick={() => setPwFor(pwFor === m.uid ? null : m.uid)}
                  aria-expanded={pwFor === m.uid}
                  aria-label={`Contraseña de ${m.name}`}
                  title="Darle una contraseña nueva (si se la olvidó)"
                >
                  <IconKey size={16} />
                </button>
                {confirm === m.uid ? (
                  <span className="team-confirm">
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => void team.removePrivate(m.uid)}>
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
                    aria-label={`Sacarle el acceso a ${m.name}`}
                    title="Sacarle el acceso"
                  >
                    <IconX size={15} />
                  </button>
                )}
              </div>
              {pwFor === m.uid && (
                <PasswordForm
                  label={`Contraseña temporal para ${firstName(m.name)}`}
                  onSave={async (pw) => {
                    await team.setPassword(m.uid, pw, { isPrivate: true });
                    setPwFor(null);
                    toast(`Listo. Al entrar, ${firstName(m.name)} va a elegir una nueva.`);
                  }}
                  onCancel={() => setPwFor(null)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="team-add"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" aria-label="Nombre (acceso privado)" />
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Mail"
          aria-label="Mail (acceso privado)"
        />
        <input
          className="input"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña temporal"
          aria-label="Contraseña temporal (acceso privado)"
          autoComplete="off"
        />
        <button
          type="submit"
          className="btn btn-secondary"
          disabled={busy || !name.trim() || !email.trim() || password.trim().length < MIN_PASSWORD}
        >
          <IconPlus size={16} /> Sumar
        </button>
      </form>
    </section>
  );
}

function PasswordForm({
  label,
  onSave,
  onCancel,
}: {
  label: string;
  onSave(pw: string): Promise<void>;
  onCancel(): void;
}) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="pw-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await onSave(pw);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'No pude guardarla');
        } finally {
          setBusy(false);
        }
      }}
    >
      <input
        className="input"
        type="text"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder={label}
        aria-label={label}
        autoComplete="new-password"
        autoFocus
      />
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy || pw.trim().length < MIN_PASSWORD}>
        Guardar
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
        Cancelar
      </button>
      {error && <p className="hint hint--warn">{error}</p>}
    </form>
  );
}

/** Cada uno puede cambiar su propia contraseña. */
function MyPassword({ memberId }: { memberId: string }) {
  const [open, setOpen] = useState(false);
  const toast = useUI((s) => s.toast);
  if (!open)
    return (
      <button type="button" className="link-btn pecera-pw" onClick={() => setOpen(true)}>
        Cambiar mi contraseña
      </button>
    );
  return (
    <PasswordForm
      label="Tu nueva contraseña"
      onSave={async (pw) => {
        await team.setPassword(memberId, pw);
        setOpen(false);
        toast('Contraseña cambiada');
      }}
      onCancel={() => setOpen(false)}
    />
  );
}

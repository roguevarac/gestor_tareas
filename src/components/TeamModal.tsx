import { useMemo, useState } from 'react';
import { team, useShared } from '../store/shared';
import { Modal } from './Modal';
import { SpeciesFish } from './Fishes';
import { Avatar } from './Avatar';
import { IconSearch } from './Icons';

/** Entrar a compartir: la primera vez se arma el equipo; después cada uno elige quién es. */
export function TeamModal() {
  const status = useShared((s) => s.status);
  const open = useShared((s) => s.authOpen && (s.status === 'setup' || s.status === 'choose'));
  const close = () => useShared.setState({ authOpen: false });
  return (
    <Modal open={open} onClose={close} title={status === 'setup' ? 'Armar el equipo' : '¿Quién sos?'}>
      <div className="auth">
        <div className="auth-hero" aria-hidden="true">
          <SpeciesFish kind="dorado" width={84} />
          <SpeciesFish kind="koi" width={70} />
          <SpeciesFish kind="mojarrita" width={80} />
        </div>
        {status === 'setup' ? <SetupForm /> : <ChooseForm />}
      </div>
    </Modal>
  );
}

function SetupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError('Poné tu nombre.');
    if (code.trim().length < 6) return setError('La contraseña tiene que tener al menos 6 caracteres.');
    setBusy(true);
    try {
      await team.setup(name, email, code);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude armar el equipo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="auth-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="auth-lead">
        Es la primera vez que alguien entra. Vos vas a administrar el equipo: sumás a la gente (con su contraseña)
        desde la <strong>Pecera → Equipo</strong> y cada persona, en su compu, elige su nombre y pone su contraseña.
      </p>
      <label className="field">
        <span>Tu nombre</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus />
      </label>
      <label className="field">
        <span>Tu mail (opcional)</span>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <label className="field">
        <span>Tu contraseña</span>
        <input
          className="input"
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="new-password"
          placeholder="Al menos 6 caracteres"
        />
      </label>
      <p className="hint">Con esta entrás vos y también administrás el equipo desde otra compu. Anotala.</p>
      {error && (
        <p className="hint hint--warn" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        Armar el equipo
      </button>
    </form>
  );
}

function ChooseForm() {
  const members = useShared((s) => s.users);
  const loaded = useShared((s) => s.membersLoaded);
  const isAdmin = useShared((s) => s.isAdmin);
  const [picked, setPicked] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...members]
      .filter((m) => m.name && (!q || `${m.name} ${m.email}`.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [members, query]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal');
    } finally {
      setBusy(false);
    }
  };

  if (emailMode) {
    return (
      <form
        className="auth-form"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => team.claimByEmail(email, password));
        }}
      >
        <p className="auth-lead">Entrá con tu mail y tu contraseña.</p>
        <label className="field">
          <span>Mail</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p className="hint hint--warn" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy || !email.trim() || !password.trim()}>
          Entrar
        </button>
        <button type="button" className="link-btn" onClick={() => setEmailMode(false)}>
          Volver a la lista
        </button>
      </form>
    );
  }

  if (adminMode) {
    return (
      <form
        className="auth-form"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await team.becomeAdmin(code);
            setAdminMode(false);
            setCode('');
          });
        }}
      >
        <p className="auth-lead">Poné la contraseña que elegiste al armar el equipo.</p>
        <label className="field">
          <span>Contraseña de administración</span>
          <input className="input" type="password" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
        </label>
        {error && (
          <p className="hint hint--warn" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy || !code.trim()}>
          Confirmar
        </button>
        <button type="button" className="link-btn" onClick={() => setAdminMode(false)}>
          Volver
        </button>
      </form>
    );
  }

  return (
    <form
      className="auth-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (picked && (password.trim() || isAdmin)) void run(() => team.claim(picked, password));
      }}
    >
      <p className="auth-lead">Elegí tu nombre y poné tu contraseña. Esta compu te va a recordar.</p>
      {!loaded ? (
        <p className="muted center">Cargando el equipo…</p>
      ) : members.length === 0 ? (
        <p className="send-empty">Todavía no hay nadie en el equipo. Pedile a quien lo administra que te sume.</p>
      ) : (
        <>
          {members.length > 8 && (
            <label className="search">
              <IconSearch size={16} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar…" aria-label="Buscar nombre" />
            </label>
          )}
          <div className="who-list" role="radiogroup" aria-label="¿Quién sos?">
            {sorted.map((m) => (
              <button
                key={m.uid}
                type="button"
                role="radio"
                aria-checked={picked === m.uid}
                className={`who ${picked === m.uid ? 'is-on' : ''}`}
                onClick={() => {
                  setPicked(m.uid);
                  setError(null);
                  window.setTimeout(() => document.getElementById('who-password')?.focus(), 0);
                }}
              >
                <Avatar uid={m.uid} name={m.name} size={30} />
                <span className="who-name">{m.name}</span>
                {m.email && <small>{m.email}</small>}
              </button>
            ))}
          </div>
        </>
      )}
      {picked && (
        <label className="field">
          <span>Contraseña{isAdmin ? ' (opcional: esta compu administra el equipo)' : ''}</span>
          <input
            id="who-password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
      )}
      {error && (
        <p className="hint hint--warn" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={busy || !picked || (!password.trim() && !isAdmin)}>
        Entrar
      </button>
      {picked && !isAdmin && (
        <p className="hint center muted">
          {members.find((m) => m.uid === picked)?.hasPassword === false
            ? 'Todavía no tenés contraseña: pedile a quien administra el equipo que te ponga una.'
            : '¿No la sabés? Pedísela a quien administra el equipo.'}
        </p>
      )}
      <button
        type="button"
        className="link-btn"
        onClick={() => {
          setEmailMode(true);
          setError(null);
          setPassword('');
        }}
      >
        ¿No estás en la lista? Entrá con tu mail
      </button>
      {isAdmin ? (
        <p className="hint center">Esta compu administra el equipo: podés entrar sin contraseña.</p>
      ) : (
        <button type="button" className="link-btn" onClick={() => setAdminMode(true)}>
          Administro el equipo
        </button>
      )}
    </form>
  );
}

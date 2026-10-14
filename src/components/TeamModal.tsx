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
    if (code.trim().length < 6) return setError('La clave tiene que tener al menos 6 caracteres.');
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
        Es la primera vez que alguien entra. Vos vas a administrar el equipo: sumás a la gente desde la
        <strong> Pecera → Equipo</strong> y cada persona, en su compu, elige su nombre y listo.
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
        <span>Clave para administrar</span>
        <input
          className="input"
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="new-password"
          placeholder="Al menos 6 caracteres"
        />
      </label>
      <p className="hint">Solo la vas a necesitar si querés administrar el equipo desde otra compu. Anotala.</p>
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
  const [code, setCode] = useState('');

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
        <p className="auth-lead">Poné la clave para administrar que elegiste al armar el equipo.</p>
        <label className="field">
          <span>Clave para administrar</span>
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
        if (picked) void run(() => team.claim(picked));
      }}
    >
      <p className="auth-lead">Elegí tu nombre. Esta compu te va a recordar.</p>
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
                onClick={() => setPicked(m.uid)}
                onDoubleClick={() => void run(() => team.claim(m.uid))}
              >
                <Avatar uid={m.uid} name={m.name} size={30} />
                <span className="who-name">{m.name}</span>
                {m.email && <small>{m.email}</small>}
              </button>
            ))}
          </div>
        </>
      )}
      {error && (
        <p className="hint hint--warn" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={busy || !picked}>
        Entrar
      </button>
      {isAdmin ? (
        <p className="hint center">Esta compu ya puede administrar el equipo.</p>
      ) : (
        <button type="button" className="link-btn" onClick={() => setAdminMode(true)}>
          Administro el equipo
        </button>
      )}
    </form>
  );
}

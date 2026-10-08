import { useState } from 'react';
import { sharingAuth, useShared } from '../store/shared';
import { Modal } from './Modal';
import { SpeciesFish } from './Fishes';
import { IconGoogle } from './Icons';

/** Entrar (o crear la cuenta) para compartir tareas. */
export function AuthModal() {
  const open = useShared((s) => s.authOpen && s.status === 'signedOut');
  const google = useShared((s) => s.google);
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const close = () => useShared.setState({ authOpen: false });

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal');
    } finally {
      setBusy(false);
    }
  };

  const submit = () =>
    run(async () => {
      if (mode === 'up') {
        if (!name.trim()) throw new Error('Poné tu nombre, así saben quién les manda peces.');
        await sharingAuth.signUp(name, email, password);
      } else {
        await sharingAuth.email(email, password);
      }
    });

  return (
    <Modal open={open} onClose={close} title="Compartir tareas">
      <div className="auth">
        <div className="auth-hero" aria-hidden="true">
          <SpeciesFish kind="dorado" width={84} />
          <SpeciesFish kind="payaso" width={70} />
          <SpeciesFish kind="mojarrita" width={80} />
        </div>
        <p className="auth-lead">
          Entrá para mandarle tareas a otras personas (cada una viaja en un pez) y armar proyectos conjuntos.
          <br />
          <span className="muted">Tus tareas personales siguen guardadas solo en esta compu.</span>
        </p>

        {google && (
          <>
            <button type="button" className="btn btn-google" disabled={busy} onClick={() => run(sharingAuth.google)}>
              <IconGoogle size={20} /> Entrar con Google
            </button>
            <div className="auth-or">
              <span>o con tu mail</span>
            </div>
          </>
        )}

        <div className="segmented auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'in'} className={mode === 'in' ? 'is-on' : ''} onClick={() => setMode('in')}>
            Ya tengo cuenta
          </button>
          <button type="button" role="tab" aria-selected={mode === 'up'} className={mode === 'up' ? 'is-on' : ''} onClick={() => setMode('up')}>
            Crear cuenta
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {mode === 'up' && (
            <label className="field">
              <span>Tu nombre</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Como te conocen en el equipo" />
            </label>
          )}
          <label className="field">
            <span>Mail</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              minLength={6}
              required
              placeholder={mode === 'up' ? 'Al menos 6 caracteres' : ''}
            />
          </label>
          {error && <p className="hint hint--warn" role="alert">{error}</p>}
          {info && <p className="hint">{info}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {mode === 'up' ? 'Crear cuenta y entrar' : 'Entrar'}
          </button>
          {mode === 'in' && (
            <button
              type="button"
              className="link-btn"
              onClick={() =>
                email.trim()
                  ? run(async () => {
                      await sharingAuth.reset(email);
                      setInfo('Te mandamos un mail para elegir una contraseña nueva.');
                    })
                  : setError('Escribí tu mail y tocá de nuevo “Me olvidé la contraseña”.')
              }
            >
              Me olvidé la contraseña
            </button>
          )}
        </form>
      </div>
    </Modal>
  );
}

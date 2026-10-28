import { useState } from 'react';
import { team, useShared } from '../store/shared';
import { firstName } from '../sharing/logic';
import { Modal } from './Modal';
import { IconKey } from './Icons';

const MIN = 6;

/**
 * Primera vez que alguien entra con la contraseña que le dio quien administra:
 * elige la suya (y desde ahí solo la sabe esa persona).
 */
export function PasswordGate() {
  const me = useShared((s) => (s.status === 'ready' ? s.me : null));
  const open = !!me?.mustChangePassword;
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (pw.trim().length < MIN) return setError(`Tiene que tener al menos ${MIN} caracteres.`);
    if (pw !== pw2) return setError('Las dos contraseñas no coinciden.');
    setBusy(true);
    try {
      await team.setPassword(me!.uid, pw);
      setPw('');
      setPw2('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude guardarla');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={() => {}} required title="Elegí tu contraseña">
      {me && (
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <p className="auth-lead">
            <IconKey size={18} /> Hola, {firstName(me.name)}. Entraste con una contraseña que te dieron: elegí una
            tuya. Desde ahora solo la vas a saber vos.
          </p>
          <label className="field">
            <span>Contraseña nueva</span>
            <input
              className="input"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="new-password"
              autoFocus
              placeholder={`Al menos ${MIN} caracteres`}
            />
          </label>
          <label className="field">
            <span>Repetila</span>
            <input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          </label>
          {error && (
            <p className="hint hint--warn" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy || !pw || !pw2}>
            Guardar mi contraseña
          </button>
        </form>
      )}
    </Modal>
  );
}

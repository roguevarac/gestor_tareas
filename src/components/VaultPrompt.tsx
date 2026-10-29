import { useState } from 'react';
import { team, useShared } from '../store/shared';
import { restartVault, useVault } from '../store/vault';
import { deriveVaultKey, saveVaultKey } from '../lib/vault';
import { firstName } from '../sharing/logic';
import { Modal } from './Modal';
import { IconLock } from './Icons';

/**
 * Finance: si en esta compu todavía no está la llave de su copia cifrada (entró antes de que existiera,
 * o se borró el navegador), pide la contraseña una vez.
 */
export function VaultPrompt() {
  const needs = useVault((s) => s.state === 'needs-key');
  const me = useShared((s) => s.me);
  const later = useVault((s) => s.promptLater);
  const setLater = (promptLater: boolean) => useVault.setState({ promptLater });
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!me) return null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      // Se comprueba la contraseña contra el servidor (si no es la correcta, no deja).
      await team.claim(me.uid, pw);
      saveVaultKey(me.uid, await deriveVaultKey(me.uid, pw));
      setPw('');
      restartVault();
    } catch {
      setError('Esa no es tu contraseña.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={needs && !later} onClose={() => setLater(true)} title="Guardar tus tareas">
      <form
        className="auth-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <p className="auth-lead">
          <IconLock size={16} /> {firstName(me.name)}, para que tus tareas no se pierdan si cambiás de compu o se borra
          el navegador, se guardan en el servidor <b>cifradas con tu contraseña</b>: nadie más las puede leer, ni
          quien administra. Confirmala una sola vez.
        </p>
        <label className="field">
          <span>Tu contraseña</span>
          <input
            className="input"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="current-password"
            autoFocus
          />
        </label>
        {error && (
          <p className="hint hint--warn" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy || !pw.trim()}>
          Guardar mis tareas
        </button>
        <button type="button" className="link-btn" onClick={() => setLater(true)}>
          Ahora no
        </button>
      </form>
    </Modal>
  );
}

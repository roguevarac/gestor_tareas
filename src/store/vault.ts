import { create } from 'zustand';
import type { LogEntry, Task } from '../types';
import { useTasks } from './tasks';
import { getBackend, useShared } from './shared';
import { useUI } from './ui';
import { loadVaultKey, seal, unseal } from '../lib/vault';

/**
 * Finance: copia cifrada de las tareas en el servidor. Si el navegador se borra o entra desde otra compu,
 * al entrar con su contraseña recupera todo. Solo ella la puede leer.
 */
type VaultState = 'off' | 'needs-key' | 'loading' | 'ok' | 'error';

export const useVault = create<{ state: VaultState; savedAt: number | null; promptLater: boolean }>(() => ({
  state: 'off',
  savedAt: null,
  promptLater: false,
}));

interface Payload {
  tasks: Task[];
  log: LogEntry[];
}

const MAX = 900_000;
let current: string | null = null;
let unsubTasks: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

function stop() {
  unsubTasks?.();
  unsubTasks = null;
  if (timer) clearTimeout(timer);
  timer = null;
}

function evaluate() {
  const s = useShared.getState();
  const id = s.status === 'ready' && s.me?.private && !s.me.mustChangePassword ? s.me.uid : null;
  if (id === current) return;
  stop();
  current = id;
  if (id) void begin(id);
  else useVault.setState({ state: 'off', savedAt: null });
}

/** Volver a empezar (por ejemplo, después de confirmar la contraseña). */
export function restartVault() {
  stop();
  current = null;
  evaluate();
}

async function begin(id: string) {
  const backend = getBackend();
  const key = loadVaultKey(id);
  if (!backend) return;
  if (!key) {
    useVault.setState({ state: 'needs-key' });
    return;
  }
  useVault.setState({ state: 'loading' });
  try {
    const remote = await backend.getVault(id);
    if (current !== id) return;
    const local = useTasks.getState();
    const localEmpty = local.tasks.length === 0 && local.log.length === 0;
    let canOverwrite = true;
    if (remote) {
      const data = await unseal<Payload>(remote, key);
      if (current !== id) return;
      if (data && localEmpty && (data.tasks.length || data.log.length)) {
        useTasks.getState().replaceAll({ tasks: data.tasks ?? [], log: data.log ?? [] });
        useUI.getState().toast('Recuperé tus tareas guardadas');
      }
      // Si no se puede leer (otra contraseña) y acá no hay nada, no piso lo guardado con una lista vacía.
      if (!data && localEmpty) canOverwrite = false;
    }
    useVault.setState({ state: 'ok', savedAt: remote?.updatedAt ?? null });
    unsubTasks = useTasks.subscribe((st, prev) => {
      if (st.tasks !== prev.tasks || st.log !== prev.log) schedule(2000);
    });
    if (canOverwrite) schedule(0);
  } catch (e) {
    console.error(e);
    if (current !== id) return;
    useVault.setState({ state: 'error' });
    // Reintento en un rato (sin conexión, por ejemplo).
    setTimeout(() => current === id && !unsubTasks && restartVault(), 30_000);
  }
}

function schedule(ms: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void push();
  }, ms);
}

async function push() {
  const id = current;
  const backend = getBackend();
  const key = id && loadVaultKey(id);
  if (!id || !backend || !key) return;
  const { tasks, log } = useTasks.getState();
  try {
    // Si la bitácora es enorme, se guardan las más recientes (el límite del servidor es ~1 MB).
    let keep = log;
    let box = await seal({ tasks, log: keep }, key);
    while (box.data.length > MAX && keep.length > 0) {
      keep = [...keep].sort((a, b) => b.completedAt - a.completedAt).slice(0, Math.floor(keep.length * 0.7));
      box = await seal({ tasks, log: keep }, key);
    }
    const updatedAt = Date.now();
    await backend.putVault(id, { ...box, updatedAt });
    if (current === id) useVault.setState({ state: 'ok', savedAt: updatedAt });
  } catch (e) {
    console.error(e);
    if (current !== id) return;
    useVault.setState({ state: 'error' });
    schedule(30_000);
  }
}

/** Guardar ya (por ejemplo, después de cambiar la contraseña: se vuelve a cifrar con la nueva). */
export function pushVaultNow() {
  if (current) schedule(0);
  else evaluate();
}

export function startVault() {
  if (started) return;
  started = true;
  useShared.subscribe(evaluate);
  evaluate();
  // Al cerrar la ventana, si había algo pendiente, se guarda.
  window.addEventListener('pagehide', () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      void push();
    }
  });
}

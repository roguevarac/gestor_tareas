import { create } from 'zustand';
import type { LogEntry, Task } from '../types';
import { useTasks } from './tasks';
import { getBackend, useShared } from './shared';
import { useUI } from './ui';
import { loadVaultKey, seal, unseal } from '../lib/vault';
import { mergeVault, mergedCount, type Tombstones } from '../lib/vaultMerge';

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

/** Lo borrado o terminado acá desde el último guardado (para que al juntar no reviva). */
const TOMB = 'mis-tareas:vault-tomb';
function readTomb(): Tombstones {
  try {
    const t = JSON.parse(localStorage.getItem(TOMB) ?? 'null') as Tombstones | null;
    return t && Array.isArray(t.tasks) && Array.isArray(t.log) ? t : { tasks: [], log: [] };
  } catch {
    return { tasks: [], log: [] };
  }
}
function writeTomb(t: Tombstones) {
  try {
    if (!t.tasks.length && !t.log.length) localStorage.removeItem(TOMB);
    else localStorage.setItem(TOMB, JSON.stringify({ tasks: t.tasks.slice(-2000), log: t.log.slice(-2000) }));
  } catch {
    /* sin almacenamiento */
  }
}
let warned = false;
function hasAnyVaultKey() {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith('mis-tareas:vault-key:'));
  } catch {
    return false;
  }
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
    if (remote) {
      const data = await unseal<Payload>(remote, key);
      if (current !== id) return;
      if (!data) {
        // Cifrada con otra contraseña (la cambió en otra compu): no la piso; le pido la contraseña de ahora.
        useVault.setState({ state: 'needs-key', promptLater: false });
        return;
      }
      // Juntar lo de acá con lo guardado: nunca se pisa una cosa con la otra.
      const { tasks, log } = useTasks.getState();
      const local = { tasks, log };
      const merged = mergeVault(local, { tasks: data.tasks ?? [], log: data.log ?? [] }, readTomb());
      const added = mergedCount(local, merged);
      if (added > 0) {
        useTasks.getState().replaceAll(merged);
        useUI.getState().toast(
          tasks.length || log.length ? 'Sumé las tareas que tenías guardadas' : 'Recuperé tus tareas guardadas',
        );
      }
    }
    useVault.setState({ state: 'ok', savedAt: remote?.updatedAt ?? null });
    unsubTasks = useTasks.subscribe((st, prev) => {
      if (st.tasks !== prev.tasks || st.log !== prev.log) schedule(2000);
    });
    schedule(0);
  } catch (e) {
    console.error(e);
    if (current !== id) return;
    useVault.setState({ state: 'error' });
    warnOnce();
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
    const sentTomb = readTomb();
    await backend.putVault(id, { ...box, updatedAt });
    // Lo que se borró hasta acá ya no está en el servidor: no hace falta recordarlo más.
    const now = readTomb();
    writeTomb({
      tasks: now.tasks.filter((x) => !sentTomb.tasks.includes(x)),
      log: now.log.filter((x) => !sentTomb.log.includes(x)),
    });
    if (current === id) useVault.setState({ state: 'ok', savedAt: updatedAt });
  } catch (e) {
    console.error(e);
    if (current !== id) return;
    useVault.setState({ state: 'error' });
    warnOnce();
    schedule(30_000);
  }
}

/** Guardar ya (por ejemplo, después de cambiar la contraseña: se vuelve a cifrar con la nueva). */
export function pushVaultNow() {
  if (current) schedule(0);
  else evaluate();
}

function warnOnce() {
  if (warned) return;
  warned = true;
  useUI.getState().toast('No pude guardar tus tareas en el servidor. Lo sigo intentando.');
}

export function startVault() {
  if (started) return;
  started = true;
  // Anotar lo que se borra o se termina (aunque todavía no haya entrado), para que al juntar no reviva.
  useTasks.subscribe((st, prev) => {
    if (st.tasks === prev.tasks && st.log === prev.log) return;
    if (!hasAnyVaultKey()) return;
    const ids = new Set(st.tasks.map((t) => t.id));
    const logIds = new Set(st.log.map((e) => e.id));
    const goneTasks = prev.tasks.filter((t) => !ids.has(t.id)).map((t) => t.id);
    const goneLog = prev.log.filter((e) => !logIds.has(e.id)).map((e) => e.id);
    if (!goneTasks.length && !goneLog.length) return;
    const tomb = readTomb();
    writeTomb({ tasks: [...tomb.tasks, ...goneTasks], log: [...tomb.log, ...goneLog] });
  });
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

import { create } from 'zustand';
import { useTasks } from './tasks';
import { getBackend, useShared } from './shared';
import { useUI } from './ui';
import { isKeyConfirmed, loadVaultKey, localNS, seal, unseal } from '../lib/vault';
import { arrivedCount, emptyTomb, mergeVault, sameVault, type Tombstones, type VaultPayload } from '../lib/vaultMerge';

/**
 * Las tareas propias de cada persona, iguales en la compu y en el celu: una copia en el servidor,
 * cifrada con su contraseña (nadie más la puede leer), que se actualiza en vivo en todos sus dispositivos.
 */
type VaultState = 'off' | 'needs-key' | 'loading' | 'ok' | 'error';

export const useVault = create<{ state: VaultState; savedAt: number | null; promptLater: boolean }>(() => ({
  state: 'off',
  savedAt: null,
  promptLater: false,
}));

type Sealed = { iv: string; data: string; updatedAt: number };
const MAX = 900_000;

// ---------- Lo que queda en esta compu ----------

/** Borrados y terminadas de acá (con fecha), para que no revivan al juntar. */
const TOMB = `mis-tareas:vault-tomb${localNS}`;
/** De quién son las tareas guardadas en este navegador. */
const OWNER = `mis-tareas:vault-owner${localNS}`;
/** Tareas de otra persona que usó este navegador (se le devuelven cuando vuelve a entrar acá). */
const stashKey = (id: string) => `mis-tareas:vault-stash${localNS}:${id}`;

const readJSON = <T,>(key: string): T | null => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
};
const writeJSON = (key: string, v: unknown) => {
  try {
    if (v === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* sin almacenamiento */
  }
};

function readTomb(): Tombstones {
  const t = readJSON<Tombstones>(TOMB);
  return t && typeof t.tasks === 'object' && !Array.isArray(t.tasks) && typeof t.log === 'object' && !Array.isArray(t.log)
    ? t
    : emptyTomb();
}
const writeTomb = (t: Tombstones) => writeJSON(TOMB, Object.keys(t.tasks).length || Object.keys(t.log).length ? t : null);

function localPayload(): VaultPayload {
  const { tasks, log } = useTasks.getState();
  return { tasks, log, deleted: readTomb() };
}

let applying = false;
function apply(p: VaultPayload) {
  applying = true;
  try {
    useTasks.getState().replaceAll({ tasks: p.tasks, log: p.log });
    writeTomb(p.deleted ?? emptyTomb());
  } finally {
    applying = false;
  }
}

// ---------- Sincronización ----------

let current: string | null = null;
let unsubTasks: (() => void) | null = null;
let unsubRemote: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastSentAt = 0;
let started = false;
let warned = false;

function stop() {
  unsubTasks?.();
  unsubTasks = null;
  unsubRemote?.();
  unsubRemote = null;
  if (timer) clearTimeout(timer);
  timer = null;
}

function evaluate() {
  const s = useShared.getState();
  const id = s.status === 'ready' && s.me && !s.me.mustChangePassword ? s.me.uid : null;
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

async function open(box: Sealed | null, key: string): Promise<VaultPayload | null | 'unreadable'> {
  if (!box) return null;
  const p = await unseal<VaultPayload>(box, key);
  if (!p) return 'unreadable';
  return { tasks: p.tasks ?? [], log: p.log ?? [], deleted: p.deleted ?? emptyTomb() };
}

async function begin(id: string) {
  const backend = getBackend();
  if (!backend) return;
  const key = loadVaultKey(id);
  if (!key) {
    useVault.setState({ state: 'needs-key' });
    return;
  }
  useVault.setState({ state: 'loading' });
  try {
    const box = await backend.getVault(id);
    if (current !== id) return;
    let remote = await open(box, key);
    if (current !== id) return;
    if (remote === 'unreadable') {
      if (!isKeyConfirmed(id)) {
        // Cifrada con otra contraseña (la cambió en otro dispositivo): pedir la de ahora, sin pisar nada.
        useVault.setState({ state: 'needs-key', promptLater: false });
        return;
      }
      // La contraseña de ahora está comprobada y aun así no se puede leer: era de una contraseña olvidada.
      remote = null;
    }

    // ¿De quién es lo que hay en este navegador?
    const owner = readJSON<string>(OWNER);
    let base: VaultPayload;
    if (owner && owner !== id) {
      // Es de otra persona: se lo guardo aparte (no se mezcla con lo de esta) y arranco con lo de esta.
      writeJSON(stashKey(owner), localPayload());
      base = { tasks: [], log: [], deleted: emptyTomb() };
    } else base = localPayload();
    const stash = readJSON<VaultPayload>(stashKey(id));
    if (stash) base = mergeVault(base, stash);

    const merged = mergeVault(base, remote ?? { tasks: [], log: [] });
    const local = localPayload();
    if (!sameVault(merged, local)) apply(merged);
    writeJSON(OWNER, id);
    if (stash) writeJSON(stashKey(id), null);
    const arrived = arrivedCount(base, merged);
    if (arrived > 0) useUI.getState().toast(base.tasks.length || base.log.length ? 'Tus tareas se juntaron con las del otro dispositivo' : 'Tus tareas ya están acá');

    useVault.setState({ state: 'ok', savedAt: box?.updatedAt ?? null });
    unsubTasks = useTasks.subscribe((st, prev) => {
      if (applying) return;
      if (st.tasks !== prev.tasks || st.log !== prev.log) schedule(1200);
    });
    unsubRemote = backend.watchVault(id, (b) => void onRemote(id, key, b), () => {});
    if (!remote || !sameVault(merged, remote)) schedule(0);
  } catch (e) {
    console.error(e);
    if (current !== id) return;
    useVault.setState({ state: 'error' });
    warnOnce();
    setTimeout(() => current === id && !unsubTasks && restartVault(), 30_000);
  }
}

/** Llegó un cambio del otro dispositivo. */
async function onRemote(id: string, key: string, box: Sealed | null) {
  if (current !== id || !box || box.updatedAt === lastSentAt) return;
  const remote = await open(box, loadVaultKey(id) ?? key);
  if (current !== id || !remote) return;
  if (remote === 'unreadable') {
    stop();
    useVault.setState({ state: 'needs-key', promptLater: false });
    return;
  }
  const local = localPayload();
  const merged = mergeVault(local, remote);
  if (!sameVault(merged, local)) apply(merged);
  useVault.setState({ state: 'ok', savedAt: box.updatedAt });
  // Si acá había algo que allá no estaba, que les llegue.
  if (!sameVault(merged, remote)) schedule(1200);
}

function schedule(ms: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void push();
  }, ms);
}

async function push(): Promise<boolean> {
  const id = current;
  const backend = getBackend();
  const key = id && loadVaultKey(id);
  if (!id || !backend || !key) return false;
  const p = localPayload();
  try {
    // Si la bitácora es enorme, se guardan las más recientes (el límite del servidor es ~1 MB).
    let keep = p.log;
    let box = await seal({ ...p, log: keep }, key);
    while (box.data.length > MAX && keep.length > 0) {
      keep = [...keep].sort((a, b) => b.completedAt - a.completedAt).slice(0, Math.floor(keep.length * 0.7));
      box = await seal({ ...p, log: keep }, key);
    }
    const updatedAt = Date.now();
    lastSentAt = updatedAt;
    await backend.putVault(id, { ...box, updatedAt });
    if (current === id) useVault.setState({ state: 'ok', savedAt: updatedAt });
    return true;
  } catch (e) {
    console.error(e);
    if (current !== id) return false;
    useVault.setState({ state: 'error' });
    warnOnce();
    schedule(30_000);
    return false;
  }
}

/** Guardar ya (por ejemplo, después de cambiar la contraseña: se vuelve a cifrar con la nueva). */
export function pushVaultNow() {
  if (current) schedule(0);
  else evaluate();
}

/**
 * "No soy …": antes de salir, se guarda todo en el servidor y este navegador queda limpio para la otra
 * persona. Si no se pudo guardar, no sale (para no perder nada).
 */
export async function beforeLeave(): Promise<void> {
  const id = current;
  if (!id || useVault.getState().state !== 'ok') return;
  if (timer) clearTimeout(timer);
  timer = null;
  if (!(await push())) throw new Error('No pude guardar tus tareas en el servidor. Probá de nuevo con conexión.');
  stop();
  current = null;
  apply({ tasks: [], log: [], deleted: emptyTomb() });
  writeJSON(OWNER, null);
}

function warnOnce() {
  if (warned) return;
  warned = true;
  useUI.getState().toast('No pude guardar tus tareas en el servidor. Lo sigo intentando.');
}

export function startVault() {
  if (started) return;
  started = true;
  // Anotar lo que se borra o se termina, para que no reviva al juntar con otro dispositivo.
  useTasks.subscribe((st, prev) => {
    if (applying || (st.tasks === prev.tasks && st.log === prev.log)) return;
    const ids = new Set(st.tasks.map((t) => t.id));
    const logIds = new Set(st.log.map((e) => e.id));
    const goneTasks = prev.tasks.filter((t) => !ids.has(t.id));
    const goneLog = prev.log.filter((e) => !logIds.has(e.id));
    if (!goneTasks.length && !goneLog.length) return;
    const now = Date.now();
    const tomb = readTomb();
    for (const t of goneTasks) tomb.tasks[t.id] = now;
    for (const e of goneLog) tomb.log[e.id] = now;
    writeTomb(tomb);
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

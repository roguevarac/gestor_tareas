import { useMemo } from 'react';
import { create } from 'zustand';
import type { MailLink, Task } from '../types';
import type { Backend, DocPatch, Profile, SharedDoc } from '../sharing/types';
import { firebaseConfig } from '../sharing/config';
import { demoHandle } from '../sharing/mode';
import { errorText } from '../sharing/errors';
import {
  addSubtaskPatch,
  applyPatch,
  buildDocs,
  deleteSubtaskPatch,
  editSubtaskPatch,
  eventsFor,
  firstName,
  isIncomingFor,
  isVisibleTo,
  needsLogEntry,
  toTask,
  toggleSubtaskPatch,
  type SendInput,
} from '../sharing/logic';
import { uid as newId } from '../lib/id';
import { useTasks } from './tasks';
import { useUI } from './ui';

export type SharingStatus = 'off' | 'loading' | 'signedOut' | 'ready';

interface SharedState {
  status: SharingStatus;
  backendKind: Backend['kind'] | null;
  google: boolean;
  me: Profile | null;
  users: Profile[];
  docs: SharedDoc[];
  /** Tareas que acabo de tirar al balde (se esconden ya, sin esperar al servidor). */
  hidden: Record<string, true>;
  /** Proyectos compartidos plegados en este navegador. */
  collapsed: Record<string, boolean>;

  authOpen: boolean;
  peceraOpen: boolean;
  /** Diálogo de mandar un pez: null cerrado, {} pez nuevo, {task} una tarea mía. */
  sendDialog: { task?: Task } | null;
  /** Peces recibidos que dejé "para después" en esta sesión (no se vuelven a mostrar solos). */
  snoozed: Record<string, true>;
}

export const useShared = create<SharedState>()(() => ({
  status: 'off',
  backendKind: null,
  google: false,
  me: null,
  users: [],
  docs: [],
  hidden: {},
  collapsed: readJSON('mis-tareas:shared-collapsed', {}),
  authOpen: false,
  peceraOpen: false,
  sendDialog: null,
  snoozed: {},
}));

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento */
  }
}

let backend: Backend | null = null;
let unwatch: (() => void)[] = [];
let pendingName: string | null = null;
let started = false;

const set = useShared.setState;
const get = useShared.getState;
const toast = (text: string, action?: { label: string; run: () => void }) => useUI.getState().toast(text, action);

function fail(e: unknown) {
  console.error(e);
  const t = errorText(e);
  if (t) toast(t);
}

/** Arranca la parte compartida (si hay Firebase configurado o estamos en modo demo). */
export async function startSharing(): Promise<void> {
  if (started) return;
  started = true;
  const demo = demoHandle();
  if (demo) {
    const { createDemoBackend } = await import('../sharing/demo');
    backend = createDemoBackend(demo);
  } else if (firebaseConfig) {
    try {
      const { createFirebaseBackend } = await import('../sharing/firebase');
      backend = createFirebaseBackend(firebaseConfig);
    } catch (e) {
      console.error(e);
      return;
    }
  } else {
    return;
  }
  set({ status: 'loading', backendKind: backend.kind, google: backend.google });
  backend.onAuth((p) => {
    unwatch.forEach((u) => u());
    unwatch = [];
    if (!p) {
      set({ status: 'signedOut', me: null, users: [], docs: [] });
      updateBadge(0);
      return;
    }
    const profile = pendingName ? { ...p, name: pendingName } : p;
    pendingName = null;
    set({ status: 'ready', me: profile, authOpen: false });
    backend!.saveProfile(profile).catch(fail);
    unwatch.push(
      backend!.watchUsers(
        (users) => {
          const mine = users.find((u) => u.uid === profile.uid);
          set((s) => ({ users, me: s.me && mine?.name ? { ...s.me, name: mine.name } : s.me }));
        },
        fail,
      ),
      backend!.watchShared(profile.uid, (docs) => onDocs(profile.uid, docs), fail),
    );
  });
}

// ---------------- Lo que llega del servidor ----------------

function onDocs(me: string, docs: SharedDoc[]) {
  set((s) => {
    const hidden = { ...s.hidden };
    for (const id of Object.keys(hidden)) {
      const d = docs.find((x) => x.id === id);
      if (!d || d.state === 'done') delete hidden[id];
    }
    return { docs, hidden };
  });

  // Proyectos conjuntos que terminó otra persona: también a mi bitácora.
  const tasks = useTasks.getState();
  for (const d of docs) {
    if (needsLogEntry(d, me, tasks.log)) {
      useTasks.getState().logShared(toTask(d, me), {
        completedAt: d.doneAt ?? Date.now(),
        comment: `Lo terminó ${d.names[d.doneBy!] ?? 'otra persona'}`,
      });
    }
  }

  // Avisos (cada uno una sola vez).
  const seenKey = `mis-tareas:seen:${me}`;
  const stored = readJSON<string[] | null>(seenKey, null);
  const events = eventsFor(docs, me);
  if (stored === null) {
    writeJSON(seenKey, events.map((e) => e.key));
  } else {
    const seen = new Set(stored);
    const fresh = events.filter((e) => !seen.has(e.key));
    for (const e of fresh) {
      seen.add(e.key);
      const who = firstName(e.doc.names[e.who] ?? 'Alguien');
      const title = `«${e.doc.title}»`;
      if (e.type === 'accepted') toast(`🐟 ${who} aceptó ${title}`);
      if (e.type === 'done') toast(`🎣 ${who} terminó ${title}`);
      if (e.type === 'declined') {
        if (e.doc.mode === 'assigned' && e.doc.from === me)
          toast(`${who} no aceptó ${title}`, { label: 'Recuperarla', run: () => void recoverSent(e.doc.id) });
        else toast(`${who} no aceptó ${title}`);
      }
    }
    if (fresh.length) writeJSON(seenKey, [...seen].slice(-500));
  }

  updateBadge(docs.filter((d) => isIncomingFor(d, me)).length);
}

function updateBadge(n: number) {
  const nav = navigator as Navigator & { setAppBadge?(n: number): Promise<void>; clearAppBadge?(): Promise<void> };
  try {
    if (n > 0) void nav.setAppBadge?.(n).catch(() => {});
    else void nav.clearAppBadge?.().catch(() => {});
  } catch {
    /* no soportado */
  }
}

// ---------------- Lecturas para los componentes ----------------

export function useSharedTasks(): Task[] {
  const docs = useShared((s) => s.docs);
  const me = useShared((s) => s.me?.uid);
  const hidden = useShared((s) => s.hidden);
  const collapsed = useShared((s) => s.collapsed);
  return useMemo(() => {
    if (!me) return [];
    return docs
      .filter((d) => isVisibleTo(d, me) && !hidden[d.id])
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((d) => toTask(d, me, !!collapsed[d.id]));
  }, [docs, me, hidden, collapsed]);
}

export function useIncoming(): SharedDoc[] {
  const docs = useShared((s) => s.docs);
  const me = useShared((s) => s.me?.uid);
  return useMemo(
    () => (me ? docs.filter((d) => isIncomingFor(d, me)).sort((a, b) => a.createdAt - b.createdAt) : []),
    [docs, me],
  );
}

export function useSent(): SharedDoc[] {
  const docs = useShared((s) => s.docs);
  const me = useShared((s) => s.me?.uid);
  return useMemo(
    () => (me ? docs.filter((d) => d.from === me).sort((a, b) => b.createdAt - a.createdAt) : []),
    [docs, me],
  );
}

/** Otras personas que usan la app. */
export function useOthers(): Profile[] {
  const users = useShared((s) => s.users);
  const me = useShared((s) => s.me?.uid);
  return useMemo(
    () => users.filter((u) => u.uid !== me && u.name).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [users, me],
  );
}

const docById = (id: string) => get().docs.find((d) => d.id === id);

// ---------------- Cuenta ----------------

export const sharingAuth = {
  async google() {
    try {
      await backend?.signInWithGoogle();
    } catch (e) {
      const t = errorText(e);
      if (t) throw new Error(t);
    }
  },
  async email(email: string, password: string) {
    try {
      await backend?.signInWithEmail(email, password);
    } catch (e) {
      throw new Error(errorText(e) ?? 'No pude entrar');
    }
  },
  async signUp(name: string, email: string, password: string) {
    pendingName = name.trim();
    try {
      const p = await backend?.signUpWithEmail(name, email, password);
      if (p) {
        set((s) => (s.me?.uid === p.uid ? { me: { ...s.me, name: p.name } } : {}));
        await backend?.saveProfile(p);
      }
    } catch (e) {
      pendingName = null;
      throw new Error(errorText(e) ?? 'No pude crear la cuenta');
    }
  },
  async reset(email: string) {
    try {
      await backend?.resetPassword(email);
    } catch (e) {
      throw new Error(errorText(e) ?? 'No pude mandar el mail');
    }
  },
  async rename(name: string) {
    const me = get().me;
    if (!me || !name.trim()) return;
    set({ me: { ...me, name: name.trim() } });
    await backend?.saveProfile({ ...me, name: name.trim() }).catch(fail);
  },
  async signOut() {
    await backend?.signOut().catch(fail);
  },
};

// ---------------- Mandar y recibir peces ----------------

/** Manda el pez. Si venía de una tarea mía, esa tarea pasa a ser compartida (sale de mi lista). */
export async function sendFish(input: SendInput, toUids: string[], localTaskId?: string): Promise<boolean> {
  const { me, users } = get();
  if (!backend || !me || !toUids.length) return false;
  const to = toUids.map((u) => ({ uid: u, name: users.find((x) => x.uid === u)?.name ?? 'Alguien' }));
  const docs = buildDocs(input, { uid: me.uid, name: me.name }, to);
  try {
    await Promise.all(docs.map((d) => backend!.create(d)));
  } catch (e) {
    fail(e);
    return false;
  }
  if (localTaskId) useTasks.getState().deleteTask(localTaskId);
  return true;
}

function setInvite(id: string, state: 'accepted' | 'declined' | 'left') {
  const me = get().me?.uid;
  if (!backend || !me) return Promise.resolve();
  const patch: DocPatch = { [`invites.${me}`]: state, updatedAt: Date.now() };
  localApply(id, patch);
  return backend.patch(id, patch).catch(fail);
}

export const acceptFish = (id: string) => setInvite(id, 'accepted');
export const declineFish = (id: string) => setInvite(id, 'declined');

export function snoozeFish(id: string) {
  set((s) => ({ snoozed: { ...s.snoozed, [id]: true } }));
}

/** Pez que mandé y no aceptaron (o que todavía no vieron): vuelve a mi lista como tarea mía. */
export async function recoverSent(id: string) {
  const d = docById(id);
  const me = get().me?.uid;
  if (!backend || !d || d.from !== me) return;
  const tasks = useTasks.getState();
  const newId_ = tasks.addTask(d.kind, d.title);
  tasks.updateTask(newId_, {
    notes: d.notes,
    tone: d.tone,
    mails: d.mails ?? [],
    subtasks: (d.subtasks ?? []).map((s) => ({ id: newId(), title: s.title, done: s.done, doneAt: s.doneAt ?? undefined })),
  });
  try {
    await backend.remove(id);
    toast(`«${d.title}» volvió a tu lista`);
  } catch (e) {
    tasks.deleteTask(newId_);
    fail(e);
  }
}

/** Cancelar un pez que mandé (se borra para todos). */
export async function deleteShared(id: string) {
  if (!backend) return;
  set((s) => ({ docs: s.docs.filter((d) => d.id !== id) }));
  await backend.remove(id).catch(fail);
}

// ---------------- Cambios a tareas compartidas ----------------

function localApply(id: string, patch: DocPatch) {
  set((s) => ({ docs: s.docs.map((d) => (d.id === id ? applyPatch(d, patch) : d)) }));
}

function patchDoc(id: string, patch: DocPatch) {
  if (!backend) return;
  const full = { ...patch, updatedAt: Date.now() };
  localApply(id, full);
  void backend.patch(id, full).catch(fail);
}

function mutateDoc(id: string, fn: (d: SharedDoc) => DocPatch | null) {
  const d = docById(id);
  if (!backend || !d) return;
  const optimistic = fn(d);
  if (!optimistic) return;
  localApply(id, optimistic);
  void backend.mutate(id, fn).catch(fail);
}

const me = () => get().me?.uid ?? '';

export const sharedOps = {
  update(id: string, patch: Partial<Task>) {
    const { collapsed, ...rest } = patch;
    if (collapsed !== undefined) {
      const next = { ...get().collapsed, [id]: collapsed };
      set({ collapsed: next });
      writeJSON('mis-tareas:shared-collapsed', next);
    }
    const allowed: DocPatch = {};
    if (rest.title !== undefined) allowed.title = rest.title;
    if (rest.notes !== undefined) allowed.notes = rest.notes;
    if (rest.tone !== undefined) allowed.tone = rest.tone;
    if (rest.kind !== undefined && docById(id)?.mode === 'assigned') allowed.kind = rest.kind;
    if (Object.keys(allowed).length) patchDoc(id, allowed);
  },
  addSubtask: (id: string, title: string, assignee: string | null = null) =>
    mutateDoc(id, (d) => addSubtaskPatch(d, title, assignee)),
  toggleSubtask: (id: string, subId: string) => mutateDoc(id, (d) => toggleSubtaskPatch(d, subId, me())),
  renameSubtask: (id: string, subId: string, title: string) =>
    title.trim() && mutateDoc(id, (d) => editSubtaskPatch(d, subId, { title: title.trim() })),
  assignSubtask: (id: string, subId: string, assignee: string | null) =>
    mutateDoc(id, (d) => editSubtaskPatch(d, subId, { assignee })),
  deleteSubtask: (id: string, subId: string) => mutateDoc(id, (d) => deleteSubtaskPatch(d, subId)),
  addMail(id: string, mail: { url?: string; subject: string }) {
    const link: MailLink = { id: newId(), url: mail.url, subject: mail.subject.trim(), addedAt: Date.now() };
    if (!link.url && !link.subject) return;
    mutateDoc(id, (d) => ({ mails: [...(d.mails ?? []), JSON.parse(JSON.stringify(link))] }));
  },
  removeMail: (id: string, mailId: string) =>
    mutateDoc(id, (d) => ({ mails: (d.mails ?? []).filter((m) => m.id !== mailId) })),

  /** Tirarla al balde: queda terminada para todos y entra a mi bitácora. */
  complete(task: Task): string | null {
    const d = docById(task.id);
    if (!backend || !d) return null;
    const now = Date.now();
    set((s) => ({ hidden: { ...s.hidden, [task.id]: true } }));
    const entryId = useTasks.getState().logShared(task, { completedAt: now });
    const patch = { state: 'done', doneBy: me(), doneAt: now, updatedAt: now };
    localApply(task.id, patch);
    backend.patch(task.id, patch).catch((e) => {
      fail(e);
      set((s) => {
        const hidden = { ...s.hidden };
        delete hidden[task.id];
        return { hidden };
      });
      useTasks.getState().deleteLog(entryId);
    });
    return entryId;
  },

  /** "Devolver al agua" desde la bitácora. */
  reopen(entryId: string) {
    const entry = useTasks.getState().log.find((e) => e.id === entryId);
    if (!entry || !backend) return;
    const id = entry.task.id;
    if (!docById(id)) {
      toast('Esa tarea compartida ya no existe');
      return;
    }
    useTasks.getState().deleteLog(entryId);
    patchDoc(id, { state: 'open', doneBy: null, doneAt: null });
  },

  /** Borrar: si la armé yo se borra para todos; si no, me salgo. */
  remove(task: Task) {
    if (task.shared?.isOwner) void deleteShared(task.id);
    else void setInvite(task.id, 'left');
  },
};

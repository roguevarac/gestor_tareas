import { useMemo } from 'react';
import { deriveVaultKey, forgetVaultKey, loadVaultKey, saveVaultKey } from '../lib/vault';
import { create } from 'zustand';
import type { MailLink, Task } from '../types';
import type { Backend, Country, DocPatch, Profile, SharedDoc } from '../sharing/types';
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

export type SharingStatus = 'off' | 'loading' | 'setup' | 'choose' | 'ready';

interface SharedState {
  /**
   * off: no hay servidor configurado · loading · setup: falta armar el equipo ·
   * choose: este navegador todavía no eligió quién es · ready
   */
  status: SharingStatus;
  backendKind: Backend['kind'] | null;
  /** Id de este navegador (login anónimo). */
  deviceId: string | null;
  /** Este navegador puede administrar el equipo. */
  isAdmin: boolean;
  /** Persona del equipo que eligió este navegador. */
  memberId: string | null;
  me: Profile | null;
  /** Todo el equipo (sin las personas con acceso privado). */
  users: Profile[];
  /** Personas con acceso privado (solo las carga quien administra). */
  privateUsers: Profile[];
  /** Personas con acceso privado a las que se les puede mandar un pez (solo el nombre). */
  contacts: Profile[];
  /** false = el servidor tiene reglas viejas (quien administra tiene que publicarlas). */
  rulesOk: boolean | null;
  /** Mi perfil, si tengo acceso privado. */
  privateMe: Profile | null;
  membersLoaded: boolean;
  docs: SharedDoc[];
  /** Tareas que acabo de tirar al balde (se esconden ya, sin esperar al servidor). */
  hidden: Record<string, true>;
  /** Proyectos compartidos plegados en este navegador. */
  collapsed: Record<string, boolean>;

  /** Diálogo de entrar (elegir quién sos / armar el equipo). */
  authOpen: boolean;
  peceraOpen: boolean;
  /** Panel de tareas que mandé. */
  sentOpen: boolean;
  /** Diálogo de mandar un pez: null cerrado, {} pez nuevo, {task} una tarea mía. */
  sendDialog: { task?: Task } | null;
  /** Peces recibidos que dejé "para después" en esta sesión (no se vuelven a mostrar solos). */
  snoozed: Record<string, true>;
}

export const useShared = create<SharedState>()(() => ({
  status: 'off',
  backendKind: null,
  deviceId: null,
  isAdmin: false,
  memberId: null,
  me: null,
  users: [],
  privateUsers: [],
  contacts: [],
  rulesOk: null,
  privateMe: null,
  membersLoaded: false,
  docs: [],
  hidden: {},
  collapsed: readJSON('mis-tareas:shared-collapsed', {}),
  authOpen: false,
  peceraOpen: false,
  sentOpen: false,
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
/** El servidor en uso (null si no hay). */
export const getBackend = () => backend;
let unwatchShared: (() => void) | null = null;
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
  set({ status: 'loading', backendKind: backend.kind });
  void import('./supervision').then((m) => m.startSupervision());
  let watchingMembers = false;
  backend.start(
    (deviceId) => {
      if (!deviceId) return;
      set({ deviceId });
      if (!watchingMembers) {
        watchingMembers = true;
        backend!.watchMembers((users) => {
          set({ users, membersLoaded: true });
          syncMe();
        }, fail);
      }
      void refreshTeam();
    },
    (e) => {
      console.error(e);
      set({ status: 'off' });
      const t = errorText(e);
      if (t) toast(t);
    },
  );
}

let unwatchPrivate: (() => void) | null = null;
const contactsDone = new Set<string>();
let unwatchContacts: (() => void) | null = null;
function watchPrivateIfAdmin() {
  if (!backend || !get().isAdmin || unwatchPrivate) return;
  void backend.rulesOk().then((rulesOk) => set({ rulesOk }));
  unwatchPrivate = backend.watchPrivateMembers((privateUsers) => {
    set({ privateUsers });
    // Que se les pueda mandar un pez (también a quienes se pasaron a privado antes de que existiera esto).
    for (const p of privateUsers) {
      if (contactsDone.has(p.uid)) continue;
      contactsDone.add(p.uid);
      void backend?.ensureContact(p.uid, p.name).catch(() => contactsDone.delete(p.uid));
    }
  }, () => {});
}

async function refreshTeam() {
  const deviceId = get().deviceId;
  if (!backend || !deviceId) return;
  try {
    const team = await backend.readTeam(deviceId);
    set({ isAdmin: team.admin });
    watchPrivateIfAdmin();
    if (!team.setup) setMember(null, 'setup');
    else setMember(team.memberId, team.memberId ? 'ready' : 'choose');
  } catch (e) {
    fail(e);
  }
}

function setMember(memberId: string | null, status: SharingStatus) {
  if (get().memberId !== memberId) {
    unwatchShared?.();
    unwatchShared = null;
    unwatchContacts?.();
    unwatchContacts = null;
    set({ contacts: [] });
    set({ docs: [], hidden: {} });
    if (memberId && backend) {
      unwatchShared = backend.watchShared(memberId, (docs) => onDocs(memberId, docs), fail);
      unwatchContacts = backend.watchContacts((contacts) => set({ contacts }), () => {});
    }
  }
  set({ memberId, status, ...(status === 'ready' ? { authOpen: false } : {}) });
  syncMe();
  if (!memberId) updateBadge(0);
}

/**
 * Mi perfil sale de la lista del equipo, o de las personas con acceso privado
 * (si me sacaron del equipo, vuelvo a elegir).
 */
let loadingPrivate: string | null = null;
function syncMe() {
  const { memberId, users, membersLoaded, status, privateMe } = get();
  if (!memberId) {
    if (get().me || privateMe) set({ me: null, privateMe: null });
    return;
  }
  const mine = users.find((u) => u.uid === memberId);
  if (mine) {
    set({ me: mine, privateMe: null });
    return;
  }
  if (privateMe?.uid === memberId) {
    if (get().me !== privateMe) set({ me: privateMe });
    return;
  }
  if (!membersLoaded || status !== 'ready' || !backend || loadingPrivate === memberId) return;
  loadingPrivate = memberId;
  void backend.getPrivateMember(memberId).then((p) => {
    loadingPrivate = null;
    if (get().memberId !== memberId) return;
    if (p) {
      set({ privateMe: p, me: p });
      // Por las dudas: si alguna vez publicó sus tareas para el equipo, se borran.
      void backend?.deleteBoard(memberId).catch(() => {});
    } else {
      set({ me: null });
      setMember(null, 'choose');
    }
  }, () => {
    // Sin conexión (o un error pasajero): no la saco; pruebo de nuevo en un rato.
    loadingPrivate = null;
    setTimeout(syncMe, 5000);
  });
}

/** Id de una persona con acceso privado: sale de su mail (así entra sin figurar en ninguna lista). */
export async function privateIdFor(email: string): Promise<string> {
  const data = new TextEncoder().encode(`mis-tareas-privado:${email.trim().toLowerCase()}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 28);
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
  const me = useShared((s) => s.memberId);
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
  const me = useShared((s) => s.memberId);
  return useMemo(
    () => (me ? docs.filter((d) => isIncomingFor(d, me)).sort((a, b) => a.createdAt - b.createdAt) : []),
    [docs, me],
  );
}

export function useSent(): SharedDoc[] {
  const docs = useShared((s) => s.docs);
  const me = useShared((s) => s.memberId);
  return useMemo(
    () => (me ? docs.filter((d) => d.from === me).sort((a, b) => b.createdAt - a.createdAt) : []),
    [docs, me],
  );
}

/** A quiénes les puedo mandar un pez: el equipo y las personas con acceso privado. */
export function useOthers(): Profile[] {
  const users = useShared((s) => s.users);
  const contacts = useShared((s) => s.contacts);
  const me = useShared((s) => s.memberId);
  return useMemo(
    () =>
      [...users, ...contacts.filter((c) => !users.some((u) => u.uid === c.uid))]
        .filter((u) => u.uid !== me && u.name)
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [users, contacts, me],
  );
}

const docById = (id: string) => get().docs.find((d) => d.id === id);

// ---------------- Equipo ----------------

const needDevice = () => {
  const d = get().deviceId;
  if (!backend || !d) throw new Error('Todavía no hay conexión con el servidor. Probá de nuevo en un momento.');
  return d;
};

const wrap = async <T,>(fn: () => Promise<T>, fallback: string): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    throw new Error(errorText(e) ?? fallback);
  }
};

export const MIN_PASSWORD = 4;

/** Hash de la contraseña de una persona (el servidor nunca guarda la contraseña en sí). */
export async function passwordHash(memberId: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`mis-tareas:${memberId}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const team = {
  /** Primera vez: quien administra arma el equipo y queda adentro. Su contraseña sirve también para administrar. */
  async setup(name: string, email: string, password: string) {
    const d = needDevice();
    const pw = password.trim();
    const id = await wrap(
      () =>
        backend!.setupTeam(d, { name: name.trim(), email: email.trim() }, pw, (memberId) => passwordHash(memberId, pw)),
      'No pude armar el equipo',
    );
    set({ isAdmin: true });
    watchPrivateIfAdmin();
    setMember(id, 'ready');
  },
  /** "¿Quién sos?": este navegador queda como esa persona (con su contraseña). */
  async claim(memberId: string, password: string) {
    const d = needDevice();
    // Una compu que administra el equipo puede entrar sin contraseña.
    const hash = password.trim() ? await passwordHash(memberId, password.trim()) : '';
    try {
      await backend!.claim(d, memberId, hash);
    } catch (e) {
      console.error(e);
      if ((e as { code?: string }).code === 'permission-denied') throw new Error('Contraseña incorrecta.');
      throw new Error(errorText(e) ?? 'No pude entrar');
    }
    setMember(memberId, 'ready');
  },
  /** Entrar con mail y contraseña (personas con acceso privado: no figuran en la lista). */
  async claimByEmail(email: string, password: string) {
    if (!email.trim() || !password.trim()) throw new Error('Poné tu mail y tu contraseña.');
    const id = await privateIdFor(email);
    // La llave de su copia cifrada sale de la contraseña y queda solo en esta compu
    // (se guarda antes de entrar, para que al entrar ya pueda recuperar sus tareas).
    const hadKey = loadVaultKey(id);
    saveVaultKey(id, await deriveVaultKey(id, password));
    try {
      await team.claim(id, password);
    } catch {
      if (hadKey) saveVaultKey(id, hadKey);
      else forgetVaultKey(id);
      throw new Error('Mail o contraseña incorrectos.');
    }
  },
  /**
   * Quien administra pone o cambia la contraseña de alguien (y esa persona la tendrá que cambiar
   * al entrar); o cada uno cambia la suya.
   */
  async setPassword(memberId: string, password: string, opts?: { isPrivate?: boolean }) {
    if (!backend) return;
    const pw = password.trim();
    if (pw.length < MIN_PASSWORD) throw new Error(`La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`);
    const mine = memberId === get().memberId;
    const byAdmin = get().isAdmin && !mine;
    const isPrivate = opts?.isPrivate ?? (mine ? !!get().me?.private : false);
    await wrap(
      async () => backend!.setPassword(memberId, await passwordHash(memberId, pw), byAdmin, isPrivate),
      'No pude cambiar la contraseña',
    );
    if (mine && isPrivate) {
      // Su copia en el servidor se vuelve a cifrar con la contraseña nueva.
      saveVaultKey(memberId, await deriveVaultKey(memberId, pw));
      void import('./vault').then((v) => v.pushVaultNow());
    }
    if (mine && get().me?.mustChangePassword) {
      await backend.clearMustChange(memberId, isPrivate).catch(() => {});
      set((s) => {
        const me = s.me ? { ...s.me, mustChangePassword: false } : s.me;
        return { me, privateMe: s.privateMe ? me : null };
      });
    }
  },
  /** Sumar a alguien con acceso privado (no figura en el equipo y nadie ve sus tareas). */
  async addPrivate(name: string, email: string, password: string) {
    if (!backend || !name.trim()) return;
    if (!email.trim()) throw new Error('Con acceso privado se entra con el mail: ponelo.');
    const pw = password.trim();
    if (pw.length < MIN_PASSWORD) throw new Error(`La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`);
    const id = await privateIdFor(email);
    await wrap(
      async () => backend!.addPrivateMember(id, { name: name.trim(), email: email.trim() }, await passwordHash(id, pw)),
      'No pude sumarla',
    );
  },
  /** Pasar a alguien del equipo a acceso privado (con una contraseña nueva). */
  async makePrivate(member: Profile, password: string) {
    if (!backend) return;
    if (!member.email.trim()) throw new Error('Primero cargale el mail: con acceso privado se entra con el mail.');
    const pw = password.trim();
    if (pw.length < MIN_PASSWORD) throw new Error(`La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`);
    const id = await privateIdFor(member.email);
    await wrap(
      async () =>
        backend!.makePrivate(member.uid, id, { name: member.name, email: member.email.trim() }, await passwordHash(id, pw)),
      'No pude pasarla a acceso privado',
    );
  },
  async removePrivate(id: string) {
    if (!backend) return;
    await backend.removePrivateMember(id).catch(fail);
  },
  /** Cambiar de persona en esta compu. */
  async leave() {
    const d = needDevice();
    const was = get().memberId;
    await wrap(() => backend!.unclaim(d), 'No pude salir');
    if (was) forgetVaultKey(was);
    setMember(null, 'choose');
  },
  async becomeAdmin(code: string) {
    const d = needDevice();
    try {
      await backend!.becomeAdmin(d, code.trim());
    } catch (e) {
      console.error(e);
      if ((e as { code?: string }).code === 'permission-denied') throw new Error('Esa no es la clave.');
      throw new Error(errorText(e) ?? 'No pude comprobar la clave');
    }
    set({ isAdmin: true });
    watchPrivateIfAdmin();
  },
  async add(name: string, email: string, password: string, country: Country | null = null) {
    if (!backend || !name.trim()) return;
    const pw = password.trim();
    if (pw.length < MIN_PASSWORD) throw new Error(`La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`);
    await wrap(
      () => backend!.addMember({ name: name.trim(), email: email.trim(), country }, (id) => passwordHash(id, pw)),
      'No pude sumarlo',
    );
  },
  async update(id: string, name: string, email: string, country: Country | null = null) {
    if (!backend || !name.trim()) return;
    await backend.updateMember(id, { name: name.trim(), email: email.trim(), country }).catch(fail);
  },
  async remove(id: string) {
    if (!backend) return;
    await backend.removeMember(id).catch(fail);
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
  const me = get().memberId;
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
  const me = get().memberId;
  if (!backend || !d || d.from !== me) return;
  const tasks = useTasks.getState();
  const newId_ = tasks.addTask(d.kind, d.title, d.priority ?? null);
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

const me = () => get().memberId ?? '';

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
    if (rest.priority !== undefined) allowed.priority = rest.priority;
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

import type { FishKind, LogEntry, Task, TaskKind } from '../types';
import type { DocPatch, InviteState, NewSharedDoc, SharedDoc, SharedMode, SharedSubtask } from './types';
import { uid as newId } from '../lib/id';

export const inviteOf = (d: SharedDoc, uid: string): InviteState | undefined => d.invites?.[uid];

/** Quienes están adentro: quien la armó (en las conjuntas) y los que aceptaron. */
export function membersOf(d: SharedDoc): string[] {
  return d.participants.filter((u) => {
    const s = d.invites[u];
    return s === 'accepted' || (s === 'owner' && d.mode === 'joint');
  });
}

/** ¿La veo en mis listas? */
export function isVisibleTo(d: SharedDoc, uid: string): boolean {
  if (d.state !== 'open') return false;
  const s = inviteOf(d, uid);
  return s === 'accepted' || (s === 'owner' && d.mode === 'joint');
}

/** Peces que me mandaron y todavía no acepté ni rechacé. */
export function isIncomingFor(d: SharedDoc, uid: string): boolean {
  return d.state === 'open' && inviteOf(d, uid) === 'pending';
}

export const nameOf = (d: SharedDoc, uid: string | null | undefined) => (uid ? (d.names[uid] ?? 'Alguien') : '');

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** Documento compartido → la tarea que dibujan las tarjetas. */
export function toTask(d: SharedDoc, me: string, collapsed = false): Task {
  return {
    id: d.id,
    kind: d.mode === 'joint' ? 'project' : d.kind,
    title: d.title,
    notes: d.notes ?? '',
    tone: d.tone ?? 0,
    createdAt: d.createdAt,
    mails: d.mails ?? [],
    subtasks: (d.subtasks ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      done: s.done,
      doneAt: s.doneAt ?? undefined,
      assignee: s.assignee ?? null,
      doneBy: s.doneBy ?? null,
    })),
    collapsed,
    shared: {
      mode: d.mode,
      fish: d.fish,
      from: d.from,
      fromName: nameOf(d, d.from),
      members: membersOf(d).map((u) => ({ uid: u, name: nameOf(d, u) })),
      people: d.participants
        .filter((u) => ['owner', 'accepted', 'pending'].includes(d.invites[u]))
        .filter((u) => d.mode === 'joint' || u !== d.from)
        .map((u) => ({ uid: u, name: nameOf(d, u), pending: d.invites[u] === 'pending' })),
      me,
      isOwner: d.from === me,
    },
  };
}

export interface SendInput {
  mode: SharedMode;
  kind: TaskKind;
  title: string;
  notes?: string;
  tone: number;
  fish: FishKind;
  message?: string;
  subtasks?: { title: string; assignee?: string | null; done?: boolean }[];
  mails?: Task['mails'];
}

/**
 * Arma los documentos a crear. "Para que la haga" con varias personas = un pez para cada una
 * (cada una tiene su propia tarea). "Conjunta" = un solo proyecto para todos.
 */
export function buildDocs(
  input: SendInput,
  me: { uid: string; name: string },
  to: { uid: string; name: string }[],
  now = Date.now(),
): NewSharedDoc[] {
  const base = (people: { uid: string; name: string }[]): NewSharedDoc => {
    const invites: Record<string, InviteState> = { [me.uid]: 'owner' };
    const names: Record<string, string> = { [me.uid]: me.name };
    for (const p of people) {
      invites[p.uid] = 'pending';
      names[p.uid] = p.name;
    }
    const allowed = new Set([me.uid, ...people.map((p) => p.uid)]);
    return {
      mode: input.mode,
      kind: input.mode === 'joint' ? 'project' : input.kind,
      title: input.title.trim() || 'Tarea sin nombre',
      notes: input.notes ?? '',
      tone: input.tone,
      fish: input.fish,
      message: (input.message ?? '').trim(),
      from: me.uid,
      participants: [me.uid, ...people.map((p) => p.uid)],
      names,
      invites,
      subtasks: (input.subtasks ?? [])
        .filter((s) => s.title.trim())
        .map(
          (s): SharedSubtask => ({
            id: newId(),
            title: s.title.trim(),
            done: !!s.done,
            doneAt: s.done ? now : null,
            assignee:
              input.mode === 'joint' && s.assignee && allowed.has(s.assignee) ? s.assignee : null,
            doneBy: null,
          }),
        ),
      mails: input.mails ?? [],
      state: 'open',
      doneBy: null,
      doneAt: null,
      createdAt: now,
      updatedAt: now,
    };
  };
  if (input.mode === 'joint') return [base(to)];
  return to.map((p) => base([p]));
}

// ---- Cambios a subtareas (se aplican dentro de una transacción) ----

export function addSubtaskPatch(d: SharedDoc, title: string, assignee: string | null = null): DocPatch | null {
  const clean = title.trim();
  if (!clean) return null;
  const st: SharedSubtask = { id: newId(), title: clean, done: false, doneAt: null, assignee, doneBy: null };
  return { subtasks: [...(d.subtasks ?? []), st], updatedAt: Date.now() };
}

export function toggleSubtaskPatch(d: SharedDoc, subId: string, me: string): DocPatch | null {
  if (!d.subtasks?.some((s) => s.id === subId)) return null;
  const now = Date.now();
  return {
    subtasks: d.subtasks.map((s) =>
      s.id === subId
        ? { ...s, done: !s.done, doneAt: s.done ? null : now, doneBy: s.done ? null : me }
        : s,
    ),
    updatedAt: now,
  };
}

export function editSubtaskPatch(
  d: SharedDoc,
  subId: string,
  change: Partial<Pick<SharedSubtask, 'title' | 'assignee'>>,
): DocPatch | null {
  if (!d.subtasks?.some((s) => s.id === subId)) return null;
  return {
    subtasks: d.subtasks.map((s) => (s.id === subId ? { ...s, ...change } : s)),
    updatedAt: Date.now(),
  };
}

export function deleteSubtaskPatch(d: SharedDoc, subId: string): DocPatch | null {
  if (!d.subtasks?.some((s) => s.id === subId)) return null;
  return { subtasks: d.subtasks.filter((s) => s.id !== subId), updatedAt: Date.now() };
}

/** Novedades para avisar (una sola vez cada una). */
export interface SharedEvent {
  key: string;
  doc: SharedDoc;
  type: 'accepted' | 'declined' | 'done' | 'reopened';
  who: string;
}

export function eventsFor(docs: SharedDoc[], me: string): SharedEvent[] {
  const out: SharedEvent[] = [];
  for (const d of docs) {
    if (d.from === me) {
      for (const u of d.participants) {
        if (u === me) continue;
        const s = d.invites[u];
        if (s === 'accepted') out.push({ key: `${d.id}:accepted:${u}`, doc: d, type: 'accepted', who: u });
        if (s === 'declined') out.push({ key: `${d.id}:declined:${u}`, doc: d, type: 'declined', who: u });
      }
    }
    const involved = d.from === me || isVisibleTo({ ...d, state: 'open' }, me);
    if (involved && d.state === 'done' && d.doneBy && d.doneBy !== me) {
      out.push({ key: `${d.id}:done:${d.doneAt ?? 0}`, doc: d, type: 'done', who: d.doneBy });
    }
  }
  return out;
}

/** Proyecto conjunto que terminó otra persona: entra también a mi bitácora. */
export function needsLogEntry(d: SharedDoc, me: string, log: LogEntry[]): boolean {
  if (d.state !== 'done' || d.mode !== 'joint' || !d.doneBy || d.doneBy === me) return false;
  if (!isVisibleTo({ ...d, state: 'open' }, me)) return false;
  return !log.some((e) => e.task.id === d.id && e.completedAt === d.doneAt);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase();
}

/** Color estable para el circulito de cada persona. */
export function personHue(uid: string): number {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) % 360;
  return h;
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts.slice(0, -1)) {
    cur[p] = { ...((cur[p] as Record<string, unknown>) ?? {}) };
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

/** Aplica un cambio (con rutas tipo `invites.uid`) a una copia del documento. */
export function applyPatch<T extends object>(d: T, patch: DocPatch): T {
  const copy = JSON.parse(JSON.stringify(d)) as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) setPath(copy, k, v);
  return copy as T;
}

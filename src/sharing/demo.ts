import type { Backend, Board, Ping, Profile, SharedDoc } from './types';
import { applyPatch as apply } from './logic';
import { uid as newId } from '../lib/id';

/**
 * Servidor de mentira para probar sin Firebase: todo en el localStorage de este navegador.
 * Abrí dos pestañas con `?demo=ana` y `?demo=juan` y se comportan como dos compus distintas.
 */
const KEY = 'mis-tareas:demo-db';

interface DB {
  setup: boolean;
  adminCode: string | null;
  admins: Record<string, true>;
  claims: Record<string, string>;
  secrets: Record<string, string>;
  members: Record<string, Omit<Profile, 'uid'>>;
  shared: Record<string, Omit<SharedDoc, 'id'>>;
  boards: Record<string, Board>;
  pings: Record<string, Omit<Ping, 'id'>>;
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw)
      return {
        admins: {},
        claims: {},
        secrets: {},
        members: {},
        shared: {},
        boards: {},
        pings: {},
        setup: false,
        adminCode: null,
        ...JSON.parse(raw),
      };
  } catch {
    /* vacío */
  }
  return {
    setup: false,
    adminCode: null,
    admins: {},
    claims: {},
    secrets: {},
    members: {},
    shared: {},
    boards: {},
    pings: {},
  };
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function save(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db));
  queueMicrotask(notify);
}

const denied = () => Object.assign(new Error('permission-denied'), { code: 'permission-denied' });
const notFound = () => Object.assign(new Error('not-found'), { code: 'not-found' });

export function createDemoBackend(handle: string): Backend {
  const device = `dev-${handle}`;
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === KEY) notify();
    });
  }
  const subscribe = (fn: () => void) => {
    listeners.add(fn);
    queueMicrotask(fn);
    return () => void listeners.delete(fn);
  };
  const delay = () => new Promise((r) => setTimeout(r, 60));
  const isAdmin = (db: DB) => !!db.admins[device];

  return {
    kind: 'demo',
    start(cb) {
      queueMicrotask(() => cb(device));
    },
    async readTeam(d) {
      const db = load();
      const memberId = db.claims[d] ?? null;
      return { setup: db.setup, memberId: memberId && db.members[memberId] ? memberId : null, admin: !!db.admins[d] };
    },
    async setupTeam(d, me, password, hashFor) {
      await delay();
      const db = load();
      if (db.setup) throw denied();
      const id = newId();
      db.setup = true;
      db.adminCode = password;
      db.admins[d] = true;
      db.members[id] = { name: me.name, email: me.email, hasPassword: true };
      db.secrets[id] = await hashFor(id);
      db.claims[d] = id;
      save(db);
      return id;
    },
    async claim(d, memberId, hash) {
      await delay();
      const db = load();
      if (!db.members[memberId] || !db.secrets[memberId] || db.secrets[memberId] !== hash) throw denied();
      db.claims[d] = memberId;
      save(db);
    },
    async unclaim(d) {
      const db = load();
      delete db.claims[d];
      save(db);
    },
    async becomeAdmin(d, code) {
      await delay();
      const db = load();
      if (code !== db.adminCode) throw denied();
      db.admins[d] = true;
      save(db);
    },
    watchMembers(cb) {
      return subscribe(() => cb(Object.entries(load().members).map(([uid, m]) => ({ uid, ...m }))));
    },
    async addMember(m, hashFor) {
      const db = load();
      if (!isAdmin(db)) throw denied();
      const id = newId();
      db.members[id] = { name: m.name, email: m.email, supervisor: !!m.supervisor, hasPassword: true };
      db.secrets[id] = await hashFor(id);
      save(db);
      return id;
    },
    async updateMember(id, m) {
      const db = load();
      if (!isAdmin(db)) throw denied();
      db.members[id] = { ...db.members[id], name: m.name, email: m.email, supervisor: !!m.supervisor };
      save(db);
    },
    async setPassword(memberId, hash, byAdmin) {
      const db = load();
      if (byAdmin ? !isAdmin(db) : db.claims[device] !== memberId) throw denied();
      db.secrets[memberId] = hash;
      if (byAdmin && db.members[memberId]) db.members[memberId].hasPassword = true;
      save(db);
    },
    async saveBoard(b) {
      const db = load();
      db.boards[b.memberId] = JSON.parse(JSON.stringify(b));
      save(db);
    },
    watchBoards(cb) {
      return subscribe(() => {
        const db = load();
        const mine = db.claims[device];
        if (!mine || !db.members[mine]?.supervisor) return cb([]);
        cb(Object.values(db.boards));
      });
    },
    async sendPing(p) {
      await delay();
      const db = load();
      const mine = db.claims[device];
      if (!mine || !db.members[mine]?.supervisor) throw denied();
      const id = newId();
      db.pings[id] = { ...p };
      save(db);
      return id;
    },
    async answerPing(id, answer) {
      await delay();
      const db = load();
      if (!db.pings[id]) throw notFound();
      db.pings[id] = { ...db.pings[id], answer, answeredAt: Date.now() };
      save(db);
    },
    async removePing(id) {
      const db = load();
      delete db.pings[id];
      save(db);
    },
    watchPings(field, memberId, cb) {
      return subscribe(() =>
        cb(
          Object.entries(load().pings)
            .filter(([, p]) => p[field] === memberId)
            .map(([id, p]) => ({ ...p, id })),
        ),
      );
    },
    async removeMember(id) {
      const db = load();
      if (!isAdmin(db)) throw denied();
      delete db.members[id];
      delete db.secrets[id];
      save(db);
    },
    watchShared(memberId, cb) {
      return subscribe(() =>
        cb(
          Object.entries(load().shared)
            .filter(([, d]) => d.participants.includes(memberId))
            .map(([id, d]) => ({ ...d, id })),
        ),
      );
    },
    async create(data) {
      await delay();
      const db = load();
      const id = newId();
      db.shared[id] = JSON.parse(JSON.stringify(data));
      save(db);
      return id;
    },
    async patch(id, patch) {
      await delay();
      const db = load();
      if (!db.shared[id]) throw notFound();
      db.shared[id] = apply(db.shared[id], patch);
      save(db);
    },
    async mutate(id, fn) {
      await delay();
      const db = load();
      const d = db.shared[id];
      if (!d) throw notFound();
      const patch = fn({ ...d, id });
      if (!patch) return;
      db.shared[id] = apply(d, patch);
      save(db);
    },
    async remove(id) {
      await delay();
      const db = load();
      delete db.shared[id];
      save(db);
    },
  };
}

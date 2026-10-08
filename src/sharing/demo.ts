import type { Backend, Profile, SharedDoc } from './types';
import { applyPatch as apply } from './logic';
import { uid as newId } from '../lib/id';

/**
 * Servidor de mentira para probar sin Firebase: todo en el localStorage de este navegador.
 * Abrí dos pestañas con `?demo=ana` y `?demo=juan` y se mandan peces entre ellas.
 */
const KEY = 'mis-tareas:demo-db';

interface DB {
  users: Record<string, Omit<Profile, 'uid'>>;
  shared: Record<string, Omit<SharedDoc, 'id'>>;
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch {
    /* vacío */
  }
  return { users: {}, shared: {} };
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function save(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db));
  queueMicrotask(notify);
}


const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function createDemoBackend(handle: string): Backend {
  const slug = handle.toLowerCase().replace(/[^a-z0-9]/g, '') || 'yo';
  const me: Profile = { uid: `demo-${slug}`, name: capital(slug), email: `${slug}@demo` };
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

  return {
    kind: 'demo',
    google: false,
    onAuth(cb) {
      queueMicrotask(() => cb(me));
      return () => {};
    },
    async signInWithGoogle() {},
    async signInWithEmail() {},
    async signUpWithEmail() {
      return me;
    },
    async resetPassword() {},
    async signOut() {},
    async saveProfile(p) {
      const db = load();
      db.users[p.uid] = { name: p.name, email: p.email, photoURL: p.photoURL ?? null };
      save(db);
    },
    watchUsers(cb) {
      return subscribe(() => cb(Object.entries(load().users).map(([uid, u]) => ({ uid, ...u }))));
    },
    watchShared(uid, cb) {
      return subscribe(() =>
        cb(
          Object.entries(load().shared)
            .filter(([, d]) => d.participants.includes(uid))
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
      if (!db.shared[id]) throw Object.assign(new Error('not-found'), { code: 'not-found' });
      db.shared[id] = apply(db.shared[id], patch);
      save(db);
    },
    async mutate(id, fn) {
      await delay();
      const db = load();
      const d = db.shared[id];
      if (!d) throw Object.assign(new Error('not-found'), { code: 'not-found' });
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

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { Backend, Board, Ping, Profile, SharedDoc } from './types';

/** Lee un documento; si las reglas no dejan (no es mío / no existe), cuenta como que no está. */
async function exists(get: () => Promise<{ exists(): boolean }>): Promise<boolean> {
  try {
    return (await get()).exists();
  } catch (e) {
    if ((e as { code?: string }).code === 'permission-denied') return false;
    throw e;
  }
}

export function createFirebaseBackend(config: Record<string, string>): Backend {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  const shared = collection(db, 'shared');
  const members = collection(db, 'members');

  return {
    kind: 'firebase',
    start(cb, onError) {
      onAuthStateChanged(auth, (u) => {
        if (u) cb(u.uid);
        else signInAnonymously(auth).catch((e) => {
          onError(e);
          cb(null);
        });
      });
    },
    async readTeam(deviceId) {
      const [setup, claim, admin] = await Promise.all([
        exists(() => getDoc(doc(db, 'config', 'public'))),
        getDoc(doc(db, 'claims', deviceId)).catch(() => null),
        exists(() => getDoc(doc(db, 'admins', deviceId))),
      ]);
      const memberId = claim?.exists() ? ((claim.data().memberId as string) ?? null) : null;
      return { setup, memberId, admin };
    },
    async setupTeam(deviceId, me, password, hashFor) {
      const batch = writeBatch(db);
      const memberRef = doc(members);
      const hash = await hashFor(memberRef.id);
      batch.set(doc(db, 'config', 'secrets'), { adminCode: password });
      batch.set(doc(db, 'admins', deviceId), { code: password });
      batch.set(memberRef, {
        name: me.name,
        email: me.email,
        supervisor: false,
        hasPassword: true,
        createdAt: Date.now(),
      });
      batch.set(doc(db, 'memberSecrets', memberRef.id), { hash });
      batch.set(doc(db, 'claims', deviceId), { memberId: memberRef.id, hash, at: Date.now() });
      batch.set(doc(db, 'config', 'public'), { createdAt: Date.now() });
      await batch.commit();
      return memberRef.id;
    },
    claim: (deviceId, memberId, hash) => setDoc(doc(db, 'claims', deviceId), { memberId, hash, at: Date.now() }),
    unclaim: (deviceId) => deleteDoc(doc(db, 'claims', deviceId)),
    becomeAdmin: (deviceId, code) => setDoc(doc(db, 'admins', deviceId), { code }),
    watchMembers(cb, onError) {
      return onSnapshot(
        members,
        (snap) =>
          cb(
            snap.docs.map((d): Profile => {
              const v = d.data();
              return {
                uid: d.id,
                name: v.name ?? '',
                email: v.email ?? '',
                supervisor: v.supervisor === true,
                hasPassword: v.hasPassword === true,
                mustChangePassword: v.mustChangePassword === true,
                country: ['AR', 'CL', 'UY'].includes(v.country) ? v.country : null,
              };
            }),
          ),
        onError,
      );
    },
    async addMember(m, hashFor) {
      const ref = doc(members);
      const batch = writeBatch(db);
      batch.set(ref, {
        name: m.name,
        email: m.email,
        country: m.country ?? null,
        hasPassword: true,
        mustChangePassword: true,
        createdAt: Date.now(),
      });
      batch.set(doc(db, 'memberSecrets', ref.id), { hash: await hashFor(ref.id) });
      await batch.commit();
      return ref.id;
    },
    async setPassword(memberId, hash, byAdmin, isPrivate = false) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'memberSecrets', memberId), { hash });
      if (byAdmin)
        batch.update(doc(db, isPrivate ? 'privateMembers' : 'members', memberId), {
          hasPassword: true,
          mustChangePassword: true,
        });
      await batch.commit();
    },
    clearMustChange: (memberId, isPrivate) =>
      updateDoc(doc(db, isPrivate ? 'privateMembers' : 'members', memberId), { mustChangePassword: false }),
    async getPrivateMember(id) {
      try {
        const snap = await getDoc(doc(db, 'privateMembers', id));
        if (!snap.exists()) return null;
        const v = snap.data();
        return {
          uid: id,
          name: v.name ?? '',
          email: v.email ?? '',
          hasPassword: v.hasPassword === true,
          mustChangePassword: v.mustChangePassword === true,
          private: true,
        };
      } catch {
        return null;
      }
    },
    watchPrivateMembers(cb, onError) {
      return onSnapshot(
        collection(db, 'privateMembers'),
        (snap) =>
          cb(
            snap.docs.map((d): Profile => {
              const v = d.data();
              return {
                uid: d.id,
                name: v.name ?? '',
                email: v.email ?? '',
                hasPassword: v.hasPassword === true,
                mustChangePassword: v.mustChangePassword === true,
                private: true,
              };
            }),
          ),
        onError,
      );
    },
    async addPrivateMember(id, m, hash) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'privateMembers', id), {
        name: m.name,
        email: m.email,
        hasPassword: true,
        mustChangePassword: true,
        createdAt: Date.now(),
      });
      batch.set(doc(db, 'memberSecrets', id), { hash });
      batch.set(doc(db, 'privateContacts', id), { name: m.name });
      await batch.commit();
    },
    async makePrivate(oldId, newId, m, hash) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'privateMembers', newId), {
        name: m.name,
        email: m.email,
        hasPassword: true,
        mustChangePassword: true,
        createdAt: Date.now(),
      });
      batch.set(doc(db, 'memberSecrets', newId), { hash });
      batch.set(doc(db, 'privateContacts', newId), { name: m.name });
      batch.delete(doc(db, 'members', oldId));
      batch.delete(doc(db, 'memberSecrets', oldId));
      batch.delete(doc(db, 'boards', oldId));
      await batch.commit();
    },
    async removePrivateMember(id) {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'privateMembers', id));
      batch.delete(doc(db, 'privateContacts', id));
      batch.delete(doc(db, 'memberSecrets', id));
      await batch.commit();
    },
    watchContacts(cb, onError) {
      return onSnapshot(
        collection(db, 'privateContacts'),
        (snap) =>
          cb(snap.docs.map((d): Profile => ({ uid: d.id, name: d.data().name ?? '', email: '', private: true }))),
        onError,
      );
    },
    ensureContact: (id, name) => setDoc(doc(db, 'privateContacts', id), { name }),
    deleteBoard: (memberId) => deleteDoc(doc(db, 'boards', memberId)),
    updateMember: (id, m) =>
      updateDoc(doc(db, 'members', id), { name: m.name, email: m.email, country: m.country ?? null }),
    saveBoard: (b) => setDoc(doc(db, 'boards', b.memberId), b),
    watchBoards(cb, onError) {
      return onSnapshot(
        collection(db, 'boards'),
        (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as Board), memberId: d.id }))),
        onError,
      );
    },
    async sendPing(p) {
      const ref = await addDoc(collection(db, 'pings'), p);
      return ref.id;
    },
    answerPing: (id, answer) => updateDoc(doc(db, 'pings', id), { answer, answeredAt: Date.now() }),
    removePing: (id) => deleteDoc(doc(db, 'pings', id)),
    watchPings(field, memberId, cb, onError) {
      return onSnapshot(
        query(collection(db, 'pings'), where(field, '==', memberId)),
        (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as Omit<Ping, 'id'>), id: d.id }))),
        onError,
      );
    },
    async removeMember(id) {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'members', id));
      batch.delete(doc(db, 'memberSecrets', id));
      await batch.commit();
    },
    watchShared(memberId, cb, onError) {
      return onSnapshot(
        query(shared, where('participants', 'array-contains', memberId)),
        (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as Omit<SharedDoc, 'id'>), id: d.id }))),
        onError,
      );
    },
    async create(data) {
      const ref = await addDoc(shared, data);
      return ref.id;
    },
    async patch(id, patch) {
      await updateDoc(doc(db, 'shared', id), patch);
    },
    async mutate(id, fn) {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, 'shared', id);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw Object.assign(new Error('not-found'), { code: 'not-found' });
        const patch = fn({ ...(snap.data() as Omit<SharedDoc, 'id'>), id });
        if (patch) tx.update(ref, patch);
      });
    },
    remove: (id) => deleteDoc(doc(db, 'shared', id)),
  };
}

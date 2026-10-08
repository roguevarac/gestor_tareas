import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { Backend, Profile, SharedDoc } from './types';

const toProfile = (u: User): Profile => ({
  uid: u.uid,
  name: u.displayName || (u.email ?? '').split('@')[0] || 'Sin nombre',
  email: u.email ?? '',
  photoURL: u.photoURL,
});

export function createFirebaseBackend(config: Record<string, string>): Backend {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  const shared = collection(db, 'shared');

  return {
    kind: 'firebase',
    google: true,
    onAuth: (cb) => onAuthStateChanged(auth, (u) => cb(u ? toProfile(u) : null)),
    async signInWithGoogle() {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    },
    async signInWithEmail(email, password) {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    async signUpWithEmail(name, email, password) {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      return { ...toProfile(cred.user), name: name.trim() };
    },
    resetPassword: (email) => sendPasswordResetEmail(auth, email.trim()),
    signOut: () => signOut(auth),
    async saveProfile(p) {
      await setDoc(
        doc(db, 'users', p.uid),
        { name: p.name, email: p.email, photoURL: p.photoURL ?? null, updatedAt: Date.now() },
        { merge: true },
      );
    },
    watchUsers(cb, onError) {
      return onSnapshot(
        collection(db, 'users'),
        (snap) =>
          cb(
            snap.docs.map((d) => {
              const v = d.data();
              return { uid: d.id, name: v.name ?? '', email: v.email ?? '', photoURL: v.photoURL ?? null };
            }),
          ),
        onError,
      );
    },
    watchShared(uid, cb, onError) {
      return onSnapshot(
        query(shared, where('participants', 'array-contains', uid)),
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
        if (!snap.exists()) throw new Error('not-found');
        const patch = fn({ ...(snap.data() as Omit<SharedDoc, 'id'>), id });
        if (patch) tx.update(ref, patch);
      });
    },
    remove: (id) => deleteDoc(doc(db, 'shared', id)),
  };
}

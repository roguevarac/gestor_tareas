import type { FishKind, MailLink, TaskKind } from '../types';

export type InviteState = 'owner' | 'pending' | 'accepted' | 'declined' | 'left';
export type SharedMode = 'assigned' | 'joint';

export interface Profile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string | null;
}

export interface SharedSubtask {
  id: string;
  title: string;
  done: boolean;
  doneAt?: number | null;
  assignee?: string | null;
  doneBy?: string | null;
}

/** Documento `shared/{id}` en el servidor. */
export interface SharedDoc {
  id: string;
  mode: SharedMode;
  kind: TaskKind;
  title: string;
  notes: string;
  tone: number;
  fish: FishKind;
  /** Mensaje que acompaña al pez. */
  message: string;
  from: string;
  /** Todos los que pueden verla (quien la manda + destinatarios). */
  participants: string[];
  names: Record<string, string>;
  invites: Record<string, InviteState>;
  subtasks: SharedSubtask[];
  mails: MailLink[];
  state: 'open' | 'done';
  doneBy?: string | null;
  doneAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

export type NewSharedDoc = Omit<SharedDoc, 'id'>;

/** Cambios a un documento. Las claves pueden ser rutas con punto (`invites.uid`). */
export type DocPatch = Record<string, unknown>;

export interface Backend {
  kind: 'firebase' | 'demo';
  /** Puede entrar con Google. */
  google: boolean;
  onAuth(cb: (p: Profile | null) => void): () => void;
  signInWithGoogle(): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(name: string, email: string, password: string): Promise<Profile>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
  saveProfile(p: Profile): Promise<void>;
  watchUsers(cb: (users: Profile[]) => void, onError: (e: unknown) => void): () => void;
  watchShared(uid: string, cb: (docs: SharedDoc[]) => void, onError: (e: unknown) => void): () => void;
  create(doc: NewSharedDoc): Promise<string>;
  patch(id: string, patch: DocPatch): Promise<void>;
  /** Lee, cambia y guarda de una (para que dos personas tildando a la vez no se pisen). */
  mutate(id: string, fn: (d: SharedDoc) => DocPatch | null): Promise<void>;
  remove(id: string): Promise<void>;
}

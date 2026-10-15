import type { FishKind, MailLink, TaskKind } from '../types';

export type InviteState = 'owner' | 'pending' | 'accepted' | 'declined' | 'left';
export type SharedMode = 'assigned' | 'joint';

export interface Profile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string | null;
  /** Puede ver el tablero del equipo y usar la caña ("¿En qué andás?"). */
  supervisor?: boolean;
  /** Ya tiene contraseña para entrar. */
  hasPassword?: boolean;
}

/** Lo que cada persona tiene en el agua, para el tablero del equipo (sin notas ni mails). */
export interface BoardTask {
  id: string;
  title: string;
  kind: TaskKind;
  createdAt: number;
  /** Color de la tarjeta (como la ve la persona). */
  tone?: number;
  /** Compartida: conjunta o mandada por alguien. */
  shared?: 'joint' | 'assigned' | null;
  from?: string | null;
  subtasks: { title: string; done: boolean; assignee?: string | null }[];
}

export interface Board {
  memberId: string;
  tasks: BoardTask[];
  doneToday: { title: string; completedAt: number; minutes: number | null }[];
  updatedAt: number;
}

/** "¿En qué andás?": la pregunta que baja como carnada y su respuesta. */
export interface Ping {
  id: string;
  from: string;
  to: string;
  fromName: string;
  toName: string;
  question: string;
  createdAt: number;
  answer: string | null;
  answeredAt: number | null;
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

/** Cómo está este navegador respecto del equipo. */
export interface TeamState {
  /** ¿Ya se armó el equipo (hay alguien que lo administra)? */
  setup: boolean;
  /** Persona del equipo que eligió este navegador. */
  memberId: string | null;
  /** ¿Este navegador puede administrar el equipo? */
  admin: boolean;
}

export interface Backend {
  kind: 'firebase' | 'demo';
  /** Entra sin cuenta (anónimo) y avisa el id de este navegador. */
  start(cb: (deviceId: string | null) => void, onError: (e: unknown) => void): void;
  readTeam(deviceId: string): Promise<TeamState>;
  /** Primera vez: arma el equipo con quien lo administra. Devuelve su id de persona. */
  /** `password` es también la clave para administrar; `hashFor` arma el hash de la contraseña de la persona. */
  setupTeam(
    deviceId: string,
    me: { name: string; email: string },
    password: string,
    hashFor: (memberId: string) => Promise<string>,
  ): Promise<string>;
  /** Entrar como esa persona: `hash` = hash de su contraseña. */
  claim(deviceId: string, memberId: string, hash: string): Promise<void>;
  unclaim(deviceId: string): Promise<void>;
  becomeAdmin(deviceId: string, code: string): Promise<void>;
  watchMembers(cb: (members: Profile[]) => void, onError: (e: unknown) => void): () => void;
  addMember(
    m: { name: string; email: string; supervisor?: boolean },
    hashFor: (memberId: string) => Promise<string>,
  ): Promise<string>;
  /** Cambiar la contraseña (quien administra, o la persona misma). */
  setPassword(memberId: string, hash: string, byAdmin: boolean): Promise<void>;
  updateMember(id: string, m: { name: string; email: string; supervisor?: boolean }): Promise<void>;
  saveBoard(board: Board): Promise<void>;
  watchBoards(cb: (boards: Board[]) => void, onError: (e: unknown) => void): () => void;
  sendPing(p: Omit<Ping, 'id'>): Promise<string>;
  answerPing(id: string, answer: string): Promise<void>;
  removePing(id: string): Promise<void>;
  watchPings(field: 'to' | 'from', memberId: string, cb: (pings: Ping[]) => void, onError: (e: unknown) => void): () => void;
  removeMember(id: string): Promise<void>;
  watchShared(memberId: string, cb: (docs: SharedDoc[]) => void, onError: (e: unknown) => void): () => void;
  create(doc: NewSharedDoc): Promise<string>;
  patch(id: string, patch: DocPatch): Promise<void>;
  /** Lee, cambia y guarda de una (para que dos personas tildando a la vez no se pisen). */
  mutate(id: string, fn: (d: SharedDoc) => DocPatch | null): Promise<void>;
  remove(id: string): Promise<void>;
}

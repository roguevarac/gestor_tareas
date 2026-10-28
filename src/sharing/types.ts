import type { FishKind, MailLink, Priority, TaskKind } from '../types';

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
  /** La contraseña se la puso quien administra: la tiene que cambiar al entrar. */
  mustChangePassword?: boolean;
  /** Acceso privado: no figura en el equipo y nadie ve sus tareas. */
  private?: boolean;
  /** Oficina (país) en la que trabaja. */
  country?: Country | null;
}

export type Country = 'AR' | 'CL' | 'UY';

/** Lo que cada persona tiene en el agua, para el tablero del equipo (sin notas ni mails). */
export interface BoardTask {
  id: string;
  title: string;
  kind: TaskKind;
  createdAt: number;
  /** Color de la tarjeta (como la ve la persona). */
  tone?: number;
  priority?: Priority | null;
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
  /** Categoría de la tarea (la elige quien la manda con el pez; después se puede cambiar). */
  priority?: Priority | null;
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
    m: { name: string; email: string; country?: Country | null },
    hashFor: (memberId: string) => Promise<string>,
  ): Promise<string>;
  /** Cambiar la contraseña (quien administra, o la persona misma). */
  setPassword(memberId: string, hash: string, byAdmin: boolean, isPrivate?: boolean): Promise<void>;
  /** La persona ya eligió su contraseña. */
  clearMustChange(memberId: string, isPrivate: boolean): Promise<void>;
  /** Personas con acceso privado (solo quien administra; o la persona misma con su id). */
  getPrivateMember(id: string): Promise<Profile | null>;
  watchPrivateMembers(cb: (members: Profile[]) => void, onError: (e: unknown) => void): () => void;
  addPrivateMember(id: string, m: { name: string; email: string }, hash: string): Promise<void>;
  /** Pasa a alguien del equipo a acceso privado (con id nuevo y contraseña nueva). */
  makePrivate(oldId: string, newId: string, m: { name: string; email: string }, hash: string): Promise<void>;
  removePrivateMember(id: string): Promise<void>;
  /** A quién le pueden mandar peces las personas con acceso privado (solo el nombre; lo ve el equipo). */
  watchContacts(cb: (contacts: Profile[]) => void, onError: (e: unknown) => void): () => void;
  ensureContact(id: string, name: string): Promise<void>;
  /** ¿Las reglas publicadas en el servidor son las de esta versión? */
  rulesOk(): Promise<boolean>;
  deleteBoard(memberId: string): Promise<void>;
  updateMember(id: string, m: { name: string; email: string; country?: Country | null }): Promise<void>;
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

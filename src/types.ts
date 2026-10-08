export type TaskKind = 'quick' | 'project';

/** Un mail vinculado a una tarea: un link (Outlook web, etc.) y/o el asunto para buscarlo. */
export interface MailLink {
  id: string;
  url?: string;
  subject: string;
  addedAt: number;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  doneAt?: number;
  /** Tareas conjuntas: quién es responsable (uid). */
  assignee?: string | null;
  /** Tareas conjuntas: quién la tildó (uid). */
  doneBy?: string | null;
}

/** Especies de pez que se pueden mandar. */
export type FishKind = 'mojarrita' | 'dorado' | 'surubi' | 'payaso' | 'globo';

/**
 * Datos de una tarea compartida (vive en el servidor, no en este navegador).
 * - assigned: la mandé para que la haga otra persona (es solo suya).
 * - joint: proyecto conjunto, cada subtarea con su responsable.
 */
export interface SharedInfo {
  mode: 'assigned' | 'joint';
  fish: FishKind;
  from: string;
  fromName: string;
  /** Quienes participan y aceptaron (incluye a quien la mandó en las conjuntas). */
  members: { uid: string; name: string }[];
  /** Todos los invitados que siguen adentro o todavía no respondieron (para elegir responsables). */
  people: { uid: string; name: string; pending: boolean }[];
  /** Yo (uid), para resaltar lo que me toca. */
  me: string;
  isOwner: boolean;
}

export interface Task {
  id: string;
  kind: TaskKind;
  title: string;
  notes: string;
  /** Índice en la paleta de tonos de las tarjetas (ver lib/tones). */
  tone: number;
  createdAt: number;
  mails: MailLink[];
  subtasks: Subtask[];
  /** Tiempo medido con el cronómetro de la 1.0 (minutos): se propone al soltarla en el balde. */
  pendingMinutes?: number;
  /** Proyectos: subtareas plegadas. */
  collapsed?: boolean;
  /** Solo en tareas compartidas con otras personas. */
  shared?: SharedInfo;
}

/** Una tarea terminada, guardada en la bitácora. */
export interface LogEntry {
  id: string;
  task: Task;
  completedAt: number;
  /** Cuánto tardé (minutos). null = sin cargar. */
  minutes: number | null;
  comment: string;
}

import type { LogEntry, Task } from '../types';

export interface VaultPayload {
  tasks: Task[];
  log: LogEntry[];
}

/** Lo que se borró (o se terminó) en esta compu desde la última vez que se guardó en el servidor. */
export interface Tombstones {
  tasks: string[];
  log: string[];
}

/**
 * Junta lo que hay en esta compu con la copia del servidor, sin perder nada:
 * lo local queda como está, y se suma lo del servidor que acá no está (salvo que acá se haya borrado o terminado).
 */
export function mergeVault(local: VaultPayload, remote: VaultPayload, tomb: Tombstones): VaultPayload {
  const taskIds = new Set(local.tasks.map((t) => t.id));
  const doneTaskIds = new Set(local.log.map((e) => e.task.id));
  const goneTasks = new Set(tomb.tasks);
  const logIds = new Set(local.log.map((e) => e.id));
  const goneLog = new Set(tomb.log);

  const extraTasks = (remote.tasks ?? []).filter(
    (t) => t && !taskIds.has(t.id) && !doneTaskIds.has(t.id) && !goneTasks.has(t.id),
  );
  const extraLog = (remote.log ?? []).filter((e) => e && !logIds.has(e.id) && !goneLog.has(e.id));
  // Si una tarea terminada en el servidor está todavía abierta acá, gana la de acá (no se duplica).
  const log = [...local.log, ...extraLog.filter((e) => !taskIds.has(e.task.id) || doneTaskIds.has(e.task.id))].sort(
    (a, b) => b.completedAt - a.completedAt,
  );
  return { tasks: [...local.tasks, ...extraTasks], log };
}

/** Cuántas cosas trajo del servidor. */
export const mergedCount = (local: VaultPayload, merged: VaultPayload) =>
  merged.tasks.length - local.tasks.length + (merged.log.length - local.log.length);

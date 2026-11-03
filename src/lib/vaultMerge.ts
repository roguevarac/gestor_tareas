import type { LogEntry, Task } from '../types';

/** Lo borrado o terminado, con cuándo (id → fecha). Viaja con la copia para que no reviva en otro lado. */
export interface Tombstones {
  tasks: Record<string, number>;
  log: Record<string, number>;
}

export interface VaultPayload {
  tasks: Task[];
  log: LogEntry[];
  deleted?: Tombstones;
}

/** Los borrados se recuerdan 120 días (suficiente para que todos los dispositivos se enteren). */
const KEEP = 120 * 24 * 3600 * 1000;

export const emptyTomb = (): Tombstones => ({ tasks: {}, log: {} });

const stamp = (t: Task) => t.updatedAt ?? t.createdAt ?? 0;
const stampLog = (e: LogEntry) => e.updatedAt ?? e.completedAt ?? 0;

function joinTomb(a: Record<string, number> = {}, b: Record<string, number> = {}, now: number) {
  const out: Record<string, number> = {};
  for (const src of [a, b])
    for (const [id, at] of Object.entries(src)) {
      if (typeof at !== 'number' || now - at > KEEP) continue;
      out[id] = Math.max(out[id] ?? 0, at);
    }
  return out;
}

/**
 * Junta dos versiones de las tareas de una persona (por ejemplo, la de la compu y la del celu).
 * - Si una tarea está en las dos, gana la que se cambió último (empate: la de acá).
 * - Si se borró o terminó en un lado después de su último cambio, no vuelve.
 * - El orden es el de acá; lo nuevo que llega del otro lado se suma arriba.
 */
export function mergeVault(local: VaultPayload, remote: VaultPayload, now = Date.now()): Required<VaultPayload> {
  const deleted: Tombstones = {
    tasks: joinTomb(local.deleted?.tasks, remote.deleted?.tasks, now),
    log: joinTomb(local.deleted?.log, remote.deleted?.log, now),
  };

  const remoteTasks = new Map((remote.tasks ?? []).filter(Boolean).map((t) => [t.id, t]));
  const localIds = new Set(local.tasks.map((t) => t.id));
  const alive = (t: Task) => !(deleted.tasks[t.id] !== undefined && deleted.tasks[t.id] >= stamp(t));

  const fresh = (remote.tasks ?? []).filter((t) => t && !localIds.has(t.id) && alive(t));
  const kept = local.tasks
    .map((t) => {
      const r = remoteTasks.get(t.id);
      return r && stamp(r) > stamp(t) ? r : t;
    })
    .filter(alive);

  const remoteLog = new Map((remote.log ?? []).filter(Boolean).map((e) => [e.id, e]));
  const localLogIds = new Set(local.log.map((e) => e.id));
  const aliveLog = (e: LogEntry) => !(deleted.log[e.id] !== undefined && deleted.log[e.id] >= stampLog(e));
  const log = [
    ...local.log.map((e) => {
      const r = remoteLog.get(e.id);
      return r && stampLog(r) > stampLog(e) ? r : e;
    }),
    ...(remote.log ?? []).filter((e) => e && !localLogIds.has(e.id)),
  ]
    .filter(aliveLog)
    .sort((a, b) => b.completedAt - a.completedAt);

  return { tasks: [...fresh, ...kept], log, deleted };
}

/** ¿Son lo mismo? (para no guardar ni avisar de más). */
export function sameVault(a: VaultPayload, b: VaultPayload) {
  return (
    JSON.stringify([a.tasks, a.log, a.deleted ?? emptyTomb()]) === JSON.stringify([b.tasks, b.log, b.deleted ?? emptyTomb()])
  );
}

/** Cuántas tareas y entradas de la bitácora llegaron del otro lado. */
export function arrivedCount(local: VaultPayload, merged: VaultPayload) {
  const t = new Set(local.tasks.map((x) => x.id));
  const l = new Set(local.log.map((x) => x.id));
  return merged.tasks.filter((x) => !t.has(x.id)).length + merged.log.filter((x) => !l.has(x.id)).length;
}

import { useMemo } from 'react';
import type { Task } from '../types';
import { useTasks } from './tasks';
import { useShared, useSharedTasks } from './shared';
import { toTask } from '../sharing/logic';

/** Mis tareas + las compartidas que acepté (las compartidas arriba). */
export function useAllTasks(): Task[] {
  const local = useTasks((s) => s.tasks);
  const shared = useSharedTasks();
  return useMemo(() => [...shared, ...local], [shared, local]);
}

/**
 * Una tarea por id: mías, compartidas que acepté, o las que mandé yo (aunque no estén en mis listas,
 * así quien la mandó la puede editar desde "Enviadas").
 */
export function useTaskById(id: string | null): Task | undefined {
  const all = useAllTasks();
  const docs = useShared((s) => s.docs);
  const me = useShared((s) => s.memberId);
  return useMemo(() => {
    if (!id) return undefined;
    const t = all.find((x) => x.id === id);
    if (t) return t;
    const d = docs.find((x) => x.id === id && x.from === me);
    return d && me ? toTask(d, me) : undefined;
  }, [all, docs, me, id]);
}

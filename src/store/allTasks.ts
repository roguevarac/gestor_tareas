import { useMemo } from 'react';
import type { Task } from '../types';
import { useTasks } from './tasks';
import { useSharedTasks } from './shared';

/** Mis tareas + las compartidas que acepté (las compartidas arriba). */
export function useAllTasks(): Task[] {
  const local = useTasks((s) => s.tasks);
  const shared = useSharedTasks();
  return useMemo(() => [...shared, ...local], [shared, local]);
}

export function useTaskById(id: string | null): Task | undefined {
  const all = useAllTasks();
  return useMemo(() => (id ? all.find((t) => t.id === id) : undefined), [all, id]);
}

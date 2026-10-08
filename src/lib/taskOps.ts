import type { Task } from '../types';
import { useTasks } from '../store/tasks';
import { sharedOps } from '../store/shared';

/**
 * Acciones sobre una tarea, sea mía (se guarda en este navegador)
 * o compartida (se guarda en el servidor). Los componentes usan esto y no se preocupan.
 */
export const taskOps = {
  update(task: Task, patch: Partial<Omit<Task, 'id' | 'shared'>>) {
    if (task.shared) sharedOps.update(task.id, patch);
    else useTasks.getState().updateTask(task.id, patch);
  },
  remove(task: Task) {
    if (task.shared) sharedOps.remove(task);
    else useTasks.getState().deleteTask(task.id);
  },
  addSubtask(task: Task, title: string, assignee: string | null = null) {
    if (task.shared) sharedOps.addSubtask(task.id, title, assignee);
    else useTasks.getState().addSubtask(task.id, title);
  },
  toggleSubtask(task: Task, subId: string) {
    if (task.shared) sharedOps.toggleSubtask(task.id, subId);
    else useTasks.getState().toggleSubtask(task.id, subId);
  },
  renameSubtask(task: Task, subId: string, title: string) {
    if (task.shared) sharedOps.renameSubtask(task.id, subId, title);
    else useTasks.getState().renameSubtask(task.id, subId, title);
  },
  deleteSubtask(task: Task, subId: string) {
    if (task.shared) sharedOps.deleteSubtask(task.id, subId);
    else useTasks.getState().deleteSubtask(task.id, subId);
  },
  assignSubtask(task: Task, subId: string, assignee: string | null) {
    if (task.shared) sharedOps.assignSubtask(task.id, subId, assignee);
  },
  addMail(task: Task, mail: { url?: string; subject: string }) {
    if (task.shared) sharedOps.addMail(task.id, mail);
    else useTasks.getState().addMail(task.id, mail);
  },
  removeMail(task: Task, mailId: string) {
    if (task.shared) sharedOps.removeMail(task.id, mailId);
    else useTasks.getState().removeMail(task.id, mailId);
  },
  /** Al balde. Devuelve el id de la entrada en la bitácora. */
  complete(task: Task): string | null {
    if (task.shared) return sharedOps.complete(task);
    return useTasks.getState().completeTask(task.id);
  },
  /** "Devolver al agua" una entrada de la bitácora. */
  restore(entryId: string) {
    const entry = useTasks.getState().log.find((e) => e.id === entryId);
    if (entry?.task.shared) sharedOps.reopen(entryId);
    else useTasks.getState().restoreFromLog(entryId);
  },
};

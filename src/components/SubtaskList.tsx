import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Subtask, Task } from '../types';
import { useUI } from '../store/ui';
import { taskOps } from '../lib/taskOps';
import { firstName } from '../sharing/logic';
import { EditableText } from './EditableText';
import { Avatar } from './Avatar';
import { IconCheck, IconPlus, IconX } from './Icons';

/** Subtareas de un proyecto: se tildan, se renombran con un clic y se agregan con Enter. */
export function SubtaskList({ task, variant = 'card' }: { task: Task; variant?: 'card' | 'detail' }) {
  const focusOf = useUI((s) => s.focusSubtasksOf);
  const setFocusOf = useUI((s) => s.setFocusSubtasksOf);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const joint = task.shared?.mode === 'joint';

  useEffect(() => {
    if (focusOf === task.id && variant === 'card') {
      inputRef.current?.focus();
      setFocusOf(null);
    }
  }, [focusOf, task.id, variant, setFocusOf]);

  const submit = () => {
    if (!draft.trim()) return;
    taskOps.addSubtask(task, draft);
    setDraft('');
  };

  return (
    <div className={`subtasks subtasks--${variant}`} data-nodrag onClick={(e) => e.stopPropagation()}>
      <ul>
        <AnimatePresence initial={false}>
          {task.subtasks.map((st) => (
            <motion.li
              key={st.id}
              layout="position"
              className={`subtask ${st.done ? 'is-done' : ''} ${joint && st.assignee === task.shared?.me ? 'is-mine' : ''}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
            >
              <button
                type="button"
                className={`check ${st.done ? 'is-on' : ''}`}
                onClick={() => taskOps.toggleSubtask(task, st.id)}
                role="checkbox"
                aria-checked={st.done}
                aria-label={st.title}
                title={doneTitle(task, st)}
              >
                <motion.span
                  initial={false}
                  animate={{ scale: st.done ? 1 : 0, opacity: st.done ? 1 : 0 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                >
                  <IconCheck size={13} />
                </motion.span>
              </button>
              <EditableText
                value={st.title}
                onSave={(v) => (v ? taskOps.renameSubtask(task, st.id, v) : taskOps.deleteSubtask(task, st.id))}
                className="subtask-title"
                ariaLabel={st.title}
              />
              {joint && <AssigneePicker task={task} sub={st} />}
              <button
                type="button"
                className="subtask-x"
                onClick={() => taskOps.deleteSubtask(task, st.id)}
                aria-label={`Borrar subtarea ${st.title}`}
                title="Borrar subtarea"
              >
                <IconX size={13} />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <form
        className="subtask-add"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <IconPlus size={14} />
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Agregar subtarea…"
          aria-label="Agregar subtarea"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setDraft('');
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </form>
    </div>
  );
}

function doneTitle(task: Task, st: Subtask): string | undefined {
  if (!st.done || !st.doneBy || !task.shared) return undefined;
  const who = task.shared.people.find((p) => p.uid === st.doneBy)?.name;
  if (st.doneBy === task.shared.me) return 'La tildaste vos';
  return who ? `La tildó ${firstName(who)}` : undefined;
}

/** Responsable de la subtarea: el circulito con iniciales; tocándolo se elige otro. */
function AssigneePicker({ task, sub }: { task: Task; sub: Subtask }) {
  const people = task.shared?.people ?? [];
  const me = task.shared?.me;
  const current = people.find((p) => p.uid === sub.assignee);
  const label = current ? `Responsable: ${current.name}` : 'Sin responsable';
  return (
    <label className={`assignee ${current ? '' : 'is-empty'}`} title={`${label} (cambiar)`}>
      {current ? (
        <Avatar uid={current.uid} name={current.name} size={22} className={current.uid === me ? 'is-me' : ''} />
      ) : (
        <span className="assignee-empty" aria-hidden="true">
          +
        </span>
      )}
      <select
        value={sub.assignee ?? ''}
        aria-label={`Responsable de ${sub.title}`}
        onChange={(e) => taskOps.assignSubtask(task, sub.id, e.target.value || null)}
      >
        <option value="">Sin responsable</option>
        {people.map((p) => (
          <option key={p.uid} value={p.uid}>
            {p.uid === me ? `${p.name} (yo)` : p.name}
            {p.pending ? ' · todavía no aceptó' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}

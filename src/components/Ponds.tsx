import { useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import type { TaskKind } from '../types';
import { useTasks } from '../store/tasks';
import { useAllTasks } from '../store/allTasks';
import { useUI } from '../store/ui';
import { ProjectCard, QuickCard } from './TaskCards';
import { MiniFish } from './Fish';
import { IconPlus } from './Icons';

const COPY: Record<TaskKind, { title: string; placeholder: string; empty: string; inputId: string }> = {
  quick: {
    title: 'Tareas rápidas',
    placeholder: 'Nueva tarea…',
    empty: 'Nada pendiente.',
    inputId: 'add-quick',
  },
  project: {
    title: 'Proyectos',
    placeholder: 'Nuevo proyecto…',
    empty: 'Sin proyectos en curso.',
    inputId: 'add-project',
  },
};

export function Pond({ kind }: { kind: TaskKind }) {
  const copy = COPY[kind];
  const allTasks = useAllTasks();
  const tasks = allTasks.filter((t) => t.kind === kind);
  const addTask = useTasks((s) => s.addTask);
  const setFocusSubtasksOf = useUI((s) => s.setFocusSubtasksOf);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    const id = addTask(kind, title);
    setDraft('');
    if (kind === 'project') setFocusSubtasksOf(id);
    else inputRef.current?.focus();
  };

  return (
    <section className={`pond pond--${kind}`} aria-labelledby={`${copy.inputId}-title`}>
      <header className="pond-head">
        <h2 id={`${copy.inputId}-title`}>{copy.title}</h2>
        <span className="pond-count">{tasks.length}</span>
      </header>

      <form
        className="add-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          ref={inputRef}
          id={copy.inputId}
          className="add-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={copy.placeholder}
          aria-label={copy.placeholder}
          autoComplete="off"
        />
        <button type="submit" className="add-btn" aria-label="Agregar" disabled={!draft.trim()}>
          <IconPlus size={20} />
        </button>
      </form>

      <div className="cards">
        <AnimatePresence initial={false}>
          {tasks.map((t) =>
            kind === 'quick' ? <QuickCard key={t.id} task={t} /> : <ProjectCard key={t.id} task={t} />,
          )}
        </AnimatePresence>
        {tasks.length === 0 && (
          <div className="empty">
            <MiniFish size={46} className="empty-fish" />
            <p>{copy.empty}</p>
          </div>
        )}
      </div>
    </section>
  );
}

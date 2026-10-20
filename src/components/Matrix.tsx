import { useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import type { Priority, Task } from '../types';
import { useTasks } from '../store/tasks';
import { useAllTasks } from '../store/allTasks';
import { usePond } from '../store/pond';
import { PRIORITIES } from '../lib/priority';
import { ProjectCard, QuickCard } from './TaskCards';
import { SpeciesFish } from './Fishes';
import { IconPlus } from './Icons';

const card = (t: Task) => (t.kind === 'quick' ? <QuickCard key={t.id} task={t} /> : <ProjectCard key={t.id} task={t} />);

/**
 * Vista Matriz: las tareas en sus cuatro categorías. Para cambiar una de categoría,
 * se arrastra (el pez) hasta otro cuadrante; al balde, como siempre, para terminarla.
 */
export function Matrix() {
  const tasks = useAllTasks();
  const loose = tasks.filter((t) => !t.priority);
  const hot = usePond((s) => s.hotQuadrant);
  const dragging = usePond((s) => s.phase === 'dragging');

  return (
    <div className={`matrix-wrap ${dragging ? 'is-dragging' : ''}`}>
      <section className={`loose ${hot === 'none' ? 'is-hot' : ''}`} data-quadrant="none" aria-label="Sin categoría">
        <header className="pond-head">
          <h2>Sin categoría</h2>
          <span className="pond-count">{loose.length}</span>
          <span className="loose-hint">Arrastralas a su cuadrante, o elegí la categoría en su detalle.</span>
        </header>
        {loose.length > 0 && (
          <div className="loose-cards">
            <AnimatePresence initial={false}>{loose.map(card)}</AnimatePresence>
          </div>
        )}
      </section>
      <div className="matrix">
        {PRIORITIES.map((p) => (
          <Quadrant key={p.key} prio={p.key} tasks={tasks.filter((t) => t.priority === p.key)} hot={hot === p.key} />
        ))}
      </div>

    </div>
  );
}

function Quadrant({ prio, tasks, hot }: { prio: Priority; tasks: Task[]; hot: boolean }) {
  const info = PRIORITIES.find((p) => p.key === prio)!;
  const addTask = useTasks((s) => s.addTask);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!draft.trim()) return;
    addTask('quick', draft, prio);
    setDraft('');
    inputRef.current?.focus();
  };

  return (
    <section
      className={`quadrant ${hot ? 'is-hot' : ''}`}
      data-quadrant={prio}
      style={{ '--prio': info.color, '--prio-soft': info.soft } as React.CSSProperties}
      aria-label={info.name}
    >
      <header className="quadrant-head">
        <SpeciesFish kind={info.fish} width={46} swim={hot} />
        <div className="quadrant-title">
          <h2>{info.name}</h2>
          <p>{info.hint}</p>
        </div>
        <span className="pond-count">{tasks.length}</span>
      </header>
      <form
        className="add-form quadrant-add"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          ref={inputRef}
          className="add-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nueva tarea…"
          aria-label={`Nueva tarea: ${info.name}`}
          autoComplete="off"
        />
        <button type="submit" className="add-btn" aria-label="Agregar" disabled={!draft.trim()}>
          <IconPlus size={18} />
        </button>
      </form>
      <div className="cards">
        <AnimatePresence initial={false}>{tasks.map(card)}</AnimatePresence>
        {tasks.length === 0 && <p className="quadrant-empty">Nada acá.</p>}
      </div>
    </section>
  );
}

/** Listas (rápidas / proyectos) o Matriz (por categoría). Se recuerda en esta compu. */
const VIEW_KEY = 'mis-tareas:view';
export type View = 'lists' | 'matrix';

export function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'matrix' ? 'matrix' : 'lists';
  } catch {
    return 'lists';
  }
}

export function ViewSwitch({ view, onChange }: { view: View; onChange(v: View): void }) {
  const set = (v: View) => {
    onChange(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* sin almacenamiento */
    }
  };
  return (
    <div className="segmented view-switch" role="radiogroup" aria-label="Vista">
      <button type="button" role="radio" aria-checked={view === 'lists'} className={view === 'lists' ? 'is-on' : ''} onClick={() => set('lists')}>
        Rápidas y proyectos
      </button>
      <button type="button" role="radio" aria-checked={view === 'matrix'} className={view === 'matrix' ? 'is-on' : ''} onClick={() => set('matrix')}>
        Por categoría
      </button>
    </div>
  );
}

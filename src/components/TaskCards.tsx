import { motion } from 'motion/react';
import type { Task } from '../types';
import { useFishDrag } from '../hooks/useFishDrag';
import { usePond } from '../store/pond';
import { useUI } from '../store/ui';
import { toneStyle } from '../lib/tones';
import { mailTitle } from '../lib/mail';
import { SubtaskList } from './SubtaskList';
import { IconChevron, IconMail, IconNote } from './Icons';
import { taskOps } from '../lib/taskOps';
import { firstName } from '../sharing/logic';
import { SpeciesFish, speciesName } from './Fishes';
import { Avatar } from './Avatar';

const cardMotion = (swimming: boolean) => ({
  layout: true,
  initial: { opacity: 0, y: -10, scale: 0.97 },
  // Mientras la tarea nada como mojarrita, la tarjeta queda como un hueco translúcido.
  animate: { opacity: swimming ? 0.32 : 1, y: 0, scale: swimming ? 0.97 : 1 },
  exit: { opacity: 0, scale: 0.85, transition: { duration: 0.2 } },
  transition: { type: 'spring' as const, stiffness: 420, damping: 34 },
});

function MailBadge({ task }: { task: Task }) {
  const openTask = useUI((s) => s.openTask);
  if (!task.mails.length) return null;
  const first = task.mails[0];
  const title = task.mails.length === 1 ? `Mail: ${mailTitle(first)}` : `${task.mails.length} mails vinculados`;
  if (task.mails.length === 1 && first.url) {
    return (
      <a
        className="card-badge"
        href={first.url}
        target="_blank"
        rel="noopener noreferrer"
        title={`${title} (abrir)`}
        onClick={(e) => e.stopPropagation()}
      >
        <IconMail size={15} />
      </a>
    );
  }
  return (
    <button
      type="button"
      className="card-badge"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        openTask(task.id);
      }}
    >
      <IconMail size={15} />
      {task.mails.length > 1 && <span>{task.mails.length}</span>}
    </button>
  );
}

/** Mail y notas, solo si la tarea los tiene. */
function CardBadges({ task }: { task: Task }) {
  if (!task.mails.length && !task.notes) return null;
  return (
    <div className="card-badges">
      <MailBadge task={task} />
      {task.notes && (
        <span className="card-badge card-badge--static" title={task.notes}>
          <IconNote size={15} />
        </span>
      )}
    </div>
  );
}

/** Tarjeta compartida: con qué pez llegó y con quién se comparte. */
function SharedStrip({ task }: { task: Task }) {
  const sh = task.shared;
  if (!sh) return null;
  const others = sh.members.filter((m) => m.uid !== sh.me);
  return (
    <div className="card-shared">
      <span className="card-shared-fish" title={speciesName(sh.fish)}>
        <SpeciesFish kind={sh.fish} width={34} swim={false} />
      </span>
      {sh.mode === 'joint' ? (
        <>
          <span className="card-shared-label">Conjunto</span>
          <span className="avatar-stack">
            {others.slice(0, 4).map((m) => (
              <Avatar key={m.uid} uid={m.uid} name={m.name} size={20} />
            ))}
            {others.length > 4 && <span className="avatar-more">+{others.length - 4}</span>}
          </span>
        </>
      ) : (
        <span className="card-shared-label">De {firstName(sh.fromName)}</span>
      )}
    </div>
  );
}

function useCardProps(task: Task) {
  const drag = useFishDrag<HTMLElement>(task);
  const swimming = usePond((s) => s.draggingId === task.id);
  const openTask = useUI((s) => s.openTask);
  return {
    swimming,
    props: {
      ref: drag.ref,
      'data-task-id': task.id,
      style: toneStyle(task.tone),
      onPointerDown: drag.onPointerDown,
      onClickCapture: drag.onClickCapture,
      onContextMenu: drag.onContextMenu,
      onClick: () => openTask(task.id),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) openTask(task.id);
      },
      tabIndex: 0,
    },
  };
}

export function QuickCard({ task }: { task: Task }) {
  const { swimming, props } = useCardProps(task);
  return (
    <motion.article
      {...cardMotion(swimming)}
      {...props}
      className={`card card--quick ${swimming ? 'is-swimming' : ''} ${task.shared ? 'is-shared' : ''}`}
      aria-label={`Tarea: ${task.title}`}
    >
      <div className="card-head">
        <h3 className="card-title">{task.title}</h3>
        <CardBadges task={task} />
      </div>
      <SharedStrip task={task} />
    </motion.article>
  );
}

export function ProjectCard({ task }: { task: Task }) {
  const { swimming, props } = useCardProps(task);
  const total = task.subtasks.length;
  const done = task.subtasks.filter((s) => s.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;

  return (
    <motion.article
      {...cardMotion(swimming)}
      {...props}
      className={`card card--project ${swimming ? 'is-swimming' : ''} ${allDone ? 'is-complete' : ''} ${task.shared ? 'is-shared' : ''}`}
      aria-label={`Proyecto: ${task.title}`}
    >
      <div className="card-head">
        <h3 className="card-title">{task.title}</h3>
        <CardBadges task={task} />
        <span className="progress-count">
          {done}/{total}
        </span>
        <button
          type="button"
          className={`collapse-btn ${task.collapsed ? 'is-collapsed' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            taskOps.update(task, { collapsed: !task.collapsed });
          }}
          aria-expanded={!task.collapsed}
          aria-label={task.collapsed ? 'Mostrar subtareas' : 'Ocultar subtareas'}
          title={task.collapsed ? 'Mostrar subtareas' : 'Ocultar subtareas'}
        >
          <IconChevron size={16} />
        </button>
      </div>
      <SharedStrip task={task} />
      <div className="progress" aria-hidden="true">
        <motion.div className="progress-fill" initial={false} animate={{ width: `${pct}%` }} />
      </div>

      {!task.collapsed && <SubtaskList task={task} />}
    </motion.article>
  );
}

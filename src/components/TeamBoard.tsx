import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Board, BoardTask, Ping, Profile } from '../sharing/types';
import { useShared } from '../store/shared';
import { castLine, useMyCasts, useSupervision } from '../store/supervision';
import { useUI } from '../store/ui';
import { firstName } from '../sharing/logic';
import { toneStyle } from '../lib/tones';
import { ago, formatMinutes, formatTime, startOfDay } from '../lib/time';
import { Avatar } from './Avatar';
import { MiniFish } from './Fish';
import { IconCheck, IconSearch, IconUsers } from './Icons';
import { RodIcon } from './FishingRod';

/**
 * Portal "Tareas del equipo" (para todos): una pantalla aparte para mirar qué tiene cada uno.
 * Es solo para ver: desde acá no se puede cambiar nada.
 */
export function TeamBoard() {
  const open = useSupervision((s) => s.boardOpen);
  const ready = useShared((s) => s.status === 'ready');
  const show = open && ready;

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.modal-root')) useSupervision.setState({ boardOpen: false });
    };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('portal-open');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('portal-open');
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="portal"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-label="Tareas del equipo"
        >
          <Portal />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Portal() {
  const boards = useSupervision((s) => s.boards);
  const users = useShared((s) => s.users);
  const [selected, setSelected] = useState<string | 'all'>('all');
  const [query, setQuery] = useState('');
  const today = startOfDay();

  const people = useMemo(
    () =>
      [...users]
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
        .map((u) => ({ user: u, board: boards.find((b) => b.memberId === u.uid) })),
    [users, boards],
  );
  const total = boards.reduce((a, b) => a + b.tasks.length, 0);
  const doneToday = boards.reduce((a, b) => a + b.doneToday.filter((d) => d.completedAt >= today).length, 0);
  const current = people.find((p) => p.user.uid === selected);

  return (
    <div className="portal-inner">
      <header className="portal-top">
        <button type="button" className="top-btn" onClick={() => useSupervision.setState({ boardOpen: false })}>
          ← <span className="hide-sm">Mis tareas</span>
        </button>
        <div className="portal-title">
          <h1>Tareas del equipo</h1>
          <p>
            {total} en el agua · {doneToday} terminadas hoy · solo para ver
          </p>
        </div>
        <label className="search portal-search">
          <IconSearch size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tarea…" aria-label="Buscar tarea" />
        </label>
      </header>

      <div className="portal-body">
        <nav className="portal-people" aria-label="Personas">
          <button
            type="button"
            className={`portal-person ${selected === 'all' ? 'is-on' : ''}`}
            onClick={() => setSelected('all')}
            aria-current={selected === 'all'}
          >
            <span className="portal-all-icon">
              <IconUsers size={16} />
            </span>
            <span className="portal-person-main">
              <strong>Todo el equipo</strong>
              <small>{users.length} personas</small>
            </span>
          </button>
          {people.map(({ user, board }) => (
            <button
              key={user.uid}
              type="button"
              className={`portal-person ${selected === user.uid ? 'is-on' : ''}`}
              onClick={() => setSelected(user.uid)}
              aria-current={selected === user.uid}
            >
              <Avatar uid={user.uid} name={user.name} size={30} />
              <span className="portal-person-main">
                <strong>{user.name}</strong>
                <small>{board ? `${board.tasks.length} en el agua · ${ago(board.updatedAt)}` : 'Todavía no abrió la app'}</small>
              </span>
            </button>
          ))}
        </nav>

        <main className="portal-main">
          {current ? (
            <PersonView user={current.user} board={current.board} query={query} />
          ) : (
            <div className="board-cols">
              {people
                .filter(
                  ({ user, board }) =>
                    !query.trim() ||
                    user.name.toLowerCase().includes(query.trim().toLowerCase()) ||
                    board?.tasks.some((t) => matches(t, query)),
                )
                .map(({ user, board }) => (
                  <Column key={user.uid} user={user} board={board} query={query} onOpen={() => setSelected(user.uid)} />
                ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function matches(t: BoardTask, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return t.title.toLowerCase().includes(s) || t.subtasks.some((x) => x.title.toLowerCase().includes(s));
}

function CastButton({ user }: { user: Profile }) {
  const me = useShared((s) => s.memberId);
  const supervisor = useShared((s) => !!s.me?.supervisor);
  const toast = useUI((s) => s.toast);
  if (user.uid === me || !supervisor) return null;
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm portal-cast"
      title={`Preguntarle a ${firstName(user.name)} en qué anda`}
      onClick={async () => {
        if (await castLine(user.uid)) toast(`🎣 Le tiraste la caña a ${firstName(user.name)}`);
      }}
    >
      <RodIcon size={17} /> <span className="hide-sm">¿En qué andás?</span>
    </button>
  );
}

/** Las tareas de una persona, como las ve ella, pero sin poder tocarlas. */
function PersonView({ user, board, query }: { user: Profile; board?: Board; query: string }) {
  const casts = useMyCasts();
  const last = casts.find((c) => c.to === user.uid);
  const today = startOfDay();
  const tasks = (board?.tasks ?? []).filter((t) => matches(t, query));
  const quick = tasks.filter((t) => t.kind === 'quick');
  const projects = tasks.filter((t) => t.kind === 'project');
  const done = board?.doneToday.filter((d) => d.completedAt >= today) ?? [];
  const minutes = done.reduce((a, d) => a + (d.minutes ?? 0), 0);

  return (
    <div className="person-view">
      <header className="person-head">
        <Avatar uid={user.uid} name={user.name} size={44} />
        <div>
          <h2>{user.name}</h2>
          <p>{board ? `Actualizado ${ago(board.updatedAt)}` : 'Todavía no abrió la versión nueva de la app.'}</p>
        </div>
        <span className="spacer" />
        <CastButton user={user} />
      </header>
      {last && <LastAnswer ping={last} />}

      {board && (
        <div className="ponds person-ponds">
          <section className="pond pond--quick">
            <header className="pond-head">
              <h2>Tareas rápidas</h2>
              <span className="pond-count">{quick.length}</span>
            </header>
            <div className="cards">
              {quick.map((t) => (
                <ReadOnlyCard key={t.id} task={t} />
              ))}
              {quick.length === 0 && <p className="empty">Nada pendiente.</p>}
            </div>
          </section>
          <section className="pond pond--project">
            <header className="pond-head">
              <h2>Proyectos</h2>
              <span className="pond-count">{projects.length}</span>
            </header>
            <div className="cards">
              {projects.map((t) => (
                <ReadOnlyCard key={t.id} task={t} />
              ))}
              {projects.length === 0 && <p className="empty">Sin proyectos en curso.</p>}
            </div>
          </section>
        </div>
      )}

      {board && (
        <section className="person-done">
          <h3>
            <MiniFish size={26} /> Terminadas hoy: {done.length}
            {minutes > 0 && <span className="muted"> · {formatMinutes(minutes)}</span>}
          </h3>
          {done.length > 0 && (
            <ul>
              {done.map((d, i) => (
                <li key={i}>
                  <span>{d.title}</span>
                  <small>
                    {formatTime(d.completedAt)} h{d.minutes ? ` · ${formatMinutes(d.minutes)}` : ''}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/** Tarjeta igual a las de la app, pero solo para mirar. */
function ReadOnlyCard({ task }: { task: BoardTask }) {
  const total = task.subtasks.length;
  const done = task.subtasks.filter((s) => s.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <article className={`card card--${task.kind} card--readonly`} style={toneStyle(task.tone ?? 0)} aria-label={task.title}>
      <div className="card-head">
        <h3 className="card-title">{task.title}</h3>
        {total > 0 && (
          <span className="progress-count">
            {done}/{total}
          </span>
        )}
      </div>
      <p className="card-readonly-meta">
        {task.shared === 'joint' ? 'Conjunta' : task.from ? `De ${firstName(task.from)}` : ''}
        {task.shared || task.from ? ' · ' : ''}
        creada {ago(task.createdAt)}
      </p>
      {total > 0 && (
        <>
          <div className="progress" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <ul className="readonly-subs">
            {task.subtasks.map((s, i) => (
              <li key={i} className={s.done ? 'is-done' : ''}>
                <span className={`check ${s.done ? 'is-on' : ''}`} aria-hidden="true">
                  {s.done && <IconCheck size={13} />}
                </span>
                <span className="readonly-sub-title">{s.title}</span>
                {s.assignee && <small>{firstName(s.assignee)}</small>}
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

function Column({
  user,
  board,
  query,
  onOpen,
}: {
  user: Profile;
  board?: Board;
  query: string;
  onOpen(): void;
}) {
  const me = useShared((s) => s.memberId);
  const casts = useMyCasts();
  const last = casts.find((c) => c.to === user.uid);
  const today = startOfDay();
  const done = board?.doneToday.filter((d) => d.completedAt >= today) ?? [];
  const tasks = (board?.tasks ?? []).filter((t) => matches(t, query));

  return (
    <section className="board-col">
      <header className="board-col-head">
        <button type="button" className="board-col-open" onClick={onOpen} title={`Ver las tareas de ${user.name}`}>
          <Avatar uid={user.uid} name={user.name} size={34} />
          <span className="board-col-name">
            <strong>
              {user.name}
              {user.uid === me && <span className="muted"> (vos)</span>}
            </strong>
            <small>{board ? `Actualizado ${ago(board.updatedAt)}` : 'Todavía no abrió la app'}</small>
          </span>
        </button>
      </header>
      {last && <LastAnswer ping={last} />}
      {board && (
        <>
          <ul className="board-tasks">
            {tasks.length === 0 && <li className="board-empty">Nada en el agua.</li>}
            {tasks.map((t) => (
              <BoardItem key={t.id} task={t} />
            ))}
          </ul>
          <p className="board-done-line">
            <MiniFish size={22} /> {done.length} terminada{done.length === 1 ? '' : 's'} hoy
          </p>
        </>
      )}
      <button type="button" className="link-btn board-col-more" onClick={onOpen}>
        Ver como lo ve {firstName(user.name)} →
      </button>
    </section>
  );
}

function LastAnswer({ ping }: { ping: Ping }) {
  return (
    <div className={`board-answer ${ping.answeredAt ? '' : 'is-waiting'}`}>
      <RodIcon size={15} />
      {ping.answeredAt ? (
        <span>
          «{ping.answer}» <small>{ago(ping.answeredAt)}</small>
        </span>
      ) : (
        <span>
          Esperando respuesta… <small>{ago(ping.createdAt)}</small>
        </span>
      )}
    </div>
  );
}

function BoardItem({ task }: { task: BoardTask }) {
  const total = task.subtasks.length;
  const done = task.subtasks.filter((s) => s.done).length;
  return (
    <li className="board-task">
      <div className="board-task-head">
        <span className="board-task-title">{task.title}</span>
        {total > 0 && (
          <span className="board-progress" title={`${done} de ${total} subtareas`}>
            <span style={{ width: `${(done / total) * 100}%` }} />
          </span>
        )}
      </div>
      <span className="board-task-meta">
        {task.shared === 'joint' ? 'Conjunta' : task.from ? `De ${firstName(task.from)}` : task.kind === 'project' ? 'Proyecto' : 'Rápida'}
        {total > 0 && ` · ${done}/${total}`}
      </span>
    </li>
  );
}

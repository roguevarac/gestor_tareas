import { useMemo, useState } from 'react';
import type { Board, BoardTask, Ping } from '../sharing/types';
import { useShared } from '../store/shared';
import { castLine, useMyCasts, useSupervision } from '../store/supervision';
import { useUI } from '../store/ui';
import { firstName } from '../sharing/logic';
import { ago, formatMinutes, formatTime } from '../lib/time';
import { Modal } from './Modal';
import { Avatar } from './Avatar';
import { MiniFish } from './Fish';
import { IconSearch } from './Icons';
import { RodIcon } from './FishingRod';

/** Solo para supervisión: qué tiene en el agua cada persona del equipo. */
export function TeamBoard() {
  const open = useSupervision((s) => s.boardOpen);
  const boards = useSupervision((s) => s.boards);
  const users = useShared((s) => s.users);
  const supervisor = useShared((s) => !!s.me?.supervisor);
  const [query, setQuery] = useState('');

  const people = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...users]
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      .map((u) => ({ user: u, board: boards.find((b) => b.memberId === u.uid) }))
      .filter(
        ({ user, board }) =>
          !q ||
          user.name.toLowerCase().includes(q) ||
          board?.tasks.some((t) => t.title.toLowerCase().includes(q)),
      );
  }, [users, boards, query]);

  const total = boards.reduce((a, b) => a + b.tasks.length, 0);
  const doneToday = boards.reduce((a, b) => a + b.doneToday.filter((d) => d.completedAt >= startToday()).length, 0);

  return (
    <Modal
      open={open && supervisor}
      onClose={() => useSupervision.setState({ boardOpen: false })}
      size="lg"
      className="board-modal"
      title={
        <>
          <span className="log-title">Tablero del equipo</span>
          <span className="log-subtitle">
            {total} en el agua · {doneToday} terminadas hoy
          </span>
        </>
      }
    >
      <label className="search board-search">
        <IconSearch size={16} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar persona o tarea…" aria-label="Buscar" />
      </label>
      <div className="board-cols">
        {people.map(({ user, board }) => (
          <Column key={user.uid} uid={user.uid} name={user.name} board={board} />
        ))}
      </div>
    </Modal>
  );
}

function startToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function Column({ uid, name, board }: { uid: string; name: string; board?: Board }) {
  const me = useShared((s) => s.memberId);
  const casts = useMyCasts();
  const toast = useUI((s) => s.toast);
  const [showDone, setShowDone] = useState(false);
  const last = casts.find((c) => c.to === uid);
  const today = startToday();
  const done = board?.doneToday.filter((d) => d.completedAt >= today) ?? [];
  const minutes = done.reduce((a, d) => a + (d.minutes ?? 0), 0);

  return (
    <section className="board-col">
      <header className="board-col-head">
        <Avatar uid={uid} name={name} size={34} />
        <div className="board-col-name">
          <strong>
            {name}
            {uid === me && <span className="muted"> (vos)</span>}
          </strong>
          <small>{board ? `Actualizado ${ago(board.updatedAt)}` : 'Todavía no abrió la app'}</small>
        </div>
        {uid !== me && (
          <button
            type="button"
            className="icon-btn board-cast"
            title={`Preguntarle a ${firstName(name)} en qué anda`}
            aria-label={`Preguntarle a ${firstName(name)} en qué anda`}
            onClick={async () => {
              if (await castLine(uid)) toast(`🎣 Le tiraste la caña a ${firstName(name)}`);
            }}
          >
            <RodIcon size={20} />
          </button>
        )}
      </header>

      {last && <LastAnswer ping={last} />}

      {board && (
        <>
          <ul className="board-tasks">
            {board.tasks.length === 0 && <li className="board-empty">Nada en el agua.</li>}
            {board.tasks.map((t) => (
              <BoardItem key={t.id} task={t} />
            ))}
          </ul>
          <button type="button" className="board-done-toggle" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
            <MiniFish size={22} /> {done.length} terminada{done.length === 1 ? '' : 's'} hoy
            {minutes > 0 && ` · ${formatMinutes(minutes)}`}
          </button>
          {showDone && (
            <ul className="board-done">
              {done.map((d, i) => (
                <li key={i}>
                  <span>{d.title}</span>
                  <small>
                    {formatTime(d.completedAt)}
                    {d.minutes ? ` · ${formatMinutes(d.minutes)}` : ''}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
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
  const [open, setOpen] = useState(false);
  return (
    <li className="board-task">
      <button type="button" className="board-task-head" onClick={() => total && setOpen((v) => !v)} aria-expanded={total ? open : undefined}>
        <span className="board-task-title">{task.title}</span>
        {total > 0 && (
          <span className="board-progress" title={`${done} de ${total} subtareas`}>
            <span style={{ width: `${(done / total) * 100}%` }} />
          </span>
        )}
      </button>
      <span className="board-task-meta">
        {task.shared === 'joint' ? 'Conjunta' : task.from ? `De ${firstName(task.from)}` : task.kind === 'project' ? 'Proyecto' : 'Rápida'}
        {total > 0 && ` · ${done}/${total}`} · {ago(task.createdAt).replace('hace ', '')}
      </span>
      {open && (
        <ul className="board-subs">
          {task.subtasks.map((s, i) => (
            <li key={i} className={s.done ? 'is-done' : ''}>
              {s.title}
              {s.assignee && <small> · {firstName(s.assignee)}</small>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

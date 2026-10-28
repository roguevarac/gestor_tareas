import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Board, BoardTask, Country, Ping, Profile } from '../sharing/types';
import { useShared } from '../store/shared';
import { castLine, useMyCasts, useSupervision } from '../store/supervision';
import { useUI } from '../store/ui';
import { firstName } from '../sharing/logic';
import { toneStyle } from '../lib/tones';
import { ago, formatTime, startOfDay } from '../lib/time';
import { Avatar } from './Avatar';
import { MiniFish } from './Fish';
import { IconCheck, IconLock, IconSearch, IconSend } from './Icons';
import { RodIcon } from './FishingRod';
import { COUNTRIES, Flag } from './Flags';
import { PriorityChip } from './PriorityChip';

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

type Office = Country | 'none';

type Area = 'admin' | 'finance';

function Portal() {
  const boards = useSupervision((s) => s.boards);
  const users = useShared((s) => s.users);
  const contacts = useShared((s) => s.contacts);
  const [area, setArea] = useState<Area>('admin');
  const finance = useMemo(
    () =>
      contacts
        .filter((c) => c.name && !users.some((u) => u.uid === c.uid))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [contacts, users],
  );
  const myCountry = useShared((s) => s.me?.country ?? null);
  const [query, setQuery] = useState('');
  const today = startOfDay();

  const people = useMemo(
    () =>
      [...users]
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
        .map((u) => ({ user: u, board: boards.find((b) => b.memberId === u.uid) })),
    [users, boards],
  );

  // Oficinas: Argentina, Chile y Uruguay; "Sin oficina" solo si hay alguien sin asignar.
  const offices: { key: Office; name: string; count: number }[] = [
    ...COUNTRIES.map((c) => ({
      key: c.code as Office,
      name: c.name,
      count: people.filter((p) => p.user.country === c.code).length,
    })),
    { key: 'none' as Office, name: 'Sin oficina', count: people.filter((p) => !p.user.country).length },
  ].filter((o) => o.key !== 'none' || o.count > 0);

  const firstWithPeople = offices.find((o) => o.count > 0)?.key ?? 'AR';
  const [office, setOffice] = useState<Office>(() => myCountry ?? firstWithPeople);
  const inOffice = people.filter((p) => (office === 'none' ? !p.user.country : p.user.country === office));
  const [selected, setSelected] = useState<string | null>(null);
  const current = inOffice.find((p) => p.user.uid === selected) ?? inOffice[0];

  const officeBoards = inOffice.map((p) => p.board).filter(Boolean) as Board[];
  const total = officeBoards.reduce((a, b) => a + b.tasks.length, 0);
  const doneToday = officeBoards.reduce((a, b) => a + b.doneToday.filter((d) => d.completedAt >= today).length, 0);

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
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tarea…"
            aria-label="Buscar tarea"
          />
        </label>
      </header>

      <div className="area-tabs" role="tablist" aria-label="Equipo">
        {(
          [
            ['admin', 'Admin', people.length],
            ['finance', 'Finance', finance.length],
          ] as const
        ).map(([key, name, count]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={area === key}
            className={`area-tab ${area === key ? 'is-on' : ''}`}
            onClick={() => {
              setArea(key);
              setSelected(null);
            }}
          >
            {key === 'finance' && <IconLock size={15} />}
            <span>{name}</span>
            <span className="pond-count">{count}</span>
          </button>
        ))}
      </div>

      {area === 'finance' ? (
        <FinanceArea people={finance} selected={selected} onSelect={setSelected} />
      ) : (
        <>
          <div className="office-tabs" role="tablist" aria-label="Oficina">
            {offices.map((o) => (
              <button
                key={o.key}
                type="button"
                role="tab"
                aria-selected={office === o.key}
                className={`office-tab ${office === o.key ? 'is-on' : ''}`}
                onClick={() => {
                  setOffice(o.key);
                  setSelected(null);
                }}
              >
                {o.key !== 'none' ? <Flag country={o.key} width={26} /> : <span className="country-none">🌎</span>}
                <span>{o.name}</span>
                <span className="pond-count">{o.count}</span>
              </button>
            ))}
          </div>

          <div className="portal-body">
            <nav className="portal-people" aria-label="Personas">
              {inOffice.length === 0 && (
                <p className="portal-empty">
                  Nadie en esta oficina todavía. Quien administra el equipo asigna la oficina de cada uno en Pecera →
                  Equipo.
                </p>
              )}
              {inOffice.map(({ user, board }) => (
                <button
                  key={user.uid}
                  type="button"
                  className={`portal-person ${current?.user.uid === user.uid ? 'is-on' : ''}`}
                  onClick={() => setSelected(user.uid)}
                  aria-current={current?.user.uid === user.uid}
                >
                  <Avatar uid={user.uid} name={user.name} size={30} />
                  <span className="portal-person-main">
                    <strong>{user.name}</strong>
                    <small>
                      {board ? `${board.tasks.length} en el agua · ${ago(board.updatedAt)}` : 'Todavía no abrió la app'}
                    </small>
                  </span>
                </button>
              ))}
            </nav>

            <main className="portal-main">
              {current && <PersonView user={current.user} board={current.board} query={query} />}
            </main>
          </div>
        </>
      )}
    </div>
  );
}

/** Finance: se ve quién está, pero sus tareas son privadas (no se publican). */
function FinanceArea({
  people,
  selected,
  onSelect,
}: {
  people: Profile[];
  selected: string | null;
  onSelect(id: string): void;
}) {
  const current = people.find((p) => p.uid === selected) ?? people[0];
  return (
    <div className="portal-body">
      <nav className="portal-people" aria-label="Personas de Finance">
        {people.length === 0 && (
          <p className="portal-empty">
            Nadie en Finance todavía. Quien administra pasa a alguien con el selector Admin/Finance en Pecera → Admin.
          </p>
        )}
        {people.map((u) => (
          <button
            key={u.uid}
            type="button"
            className={`portal-person ${current?.uid === u.uid ? 'is-on' : ''}`}
            onClick={() => onSelect(u.uid)}
            aria-current={current?.uid === u.uid}
          >
            <Avatar uid={u.uid} name={u.name} size={30} />
            <span className="portal-person-main">
              <strong>{u.name}</strong>
              <small>Tareas privadas</small>
            </span>
          </button>
        ))}
      </nav>
      <main className="portal-main">
        {current && (
          <div className="person-view">
            <header className="person-head">
              <Avatar uid={current.uid} name={current.name} size={44} />
              <div>
                <h2>{current.name}</h2>
                <p>Finance</p>
              </div>
            </header>
            <div className="finance-private">
              <IconLock size={22} />
              <p>
                Sus tareas son privadas: no se ven acá. Si necesitás algo de {firstName(current.name)}, mandale un pez.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  useSupervision.setState({ boardOpen: false });
                  useShared.setState({ sendDialog: {} });
                }}
              >
                <IconSend size={15} /> Mandar un pez
              </button>
            </div>
          </div>
        )}
      </main>
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
  const toast = useUI((s) => s.toast);
  if (user.uid === me) return null;
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
          </h3>
          {done.length > 0 && (
            <ul>
              {done.map((d, i) => (
                <li key={i}>
                  <span>{d.title}</span>
                  <small>{formatTime(d.completedAt)} h</small>
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
    <article
      className={`card card--${task.kind} card--readonly`}
      style={toneStyle(task.tone ?? 0)}
      aria-label={task.title}
    >
      <div className="card-head">
        <h3 className="card-title">{task.title}</h3>
        <PriorityChip priority={task.priority} />
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

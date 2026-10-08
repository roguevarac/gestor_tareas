import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Task } from '../types';
import { useUI } from '../store/ui';
import { useTaskById } from '../store/allTasks';
import { useShared } from '../store/shared';
import { taskOps } from '../lib/taskOps';
import { firstName } from '../sharing/logic';
import { SpeciesFish, speciesWithArticle } from './Fishes';
import { Avatar } from './Avatar';
import { TONES } from '../lib/tones';
import { formatTime, todayLong } from '../lib/time';
import { Modal } from './Modal';
import { SubtaskList } from './SubtaskList';
import { MailAddForm, MailChips } from './MailLinks';
import { IconSend, IconTrash } from './Icons';

/** Detalle de una tarea: nombre, tipo, color, notas, mails y subtareas. Todo se guarda solo. */
export function TaskDetail() {
  const openTaskId = useUI((s) => s.openTaskId);
  const openTask = useUI((s) => s.openTask);
  const toast = useUI((s) => s.toast);
  const current = useTaskById(openTaskId);
  const sharingStatus = useShared((s) => s.status);
  // Mientras el diálogo se cierra seguimos mostrando la última tarea (si no, se vacía de golpe).
  const lastTask = useRef(current);
  if (current) lastTask.current = current;
  const task = current ?? lastTask.current;
  const updateTask = (id: string, patch: Partial<Task>) => task && task.id === id && taskOps.update(task, patch);
  const shared = task?.shared;
  const leaving = !!shared && !shared.isOwner;
  const [title, setTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (task) setTitle(task.title);
    setConfirmDelete(false);
    // Solo al abrir otra tarea.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  const close = () => openTask(null);
  const open = !!current;

  const commitTitle = () => {
    if (task && title.trim() && title.trim() !== task.title) updateTask(task.id, { title: title.trim() });
    else if (task) setTitle(task.title);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        commitTitle();
        close();
      }}
      size="lg"
      title={
        shared?.mode === 'joint' ? 'Proyecto conjunto' : task?.kind === 'project' ? 'Proyecto' : 'Tarea rápida'
      }
      footer={
        task && (
          <>
            {confirmDelete ? (
              <div className="confirm">
                <span>
                  {leaving
                    ? '¿Salir? Deja de estar en tu lista.'
                    : shared
                      ? '¿Borrarla para todos?'
                      : '¿Borrar sin pasar por el balde?'}
                </span>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    taskOps.remove(task);
                    close();
                    toast(leaving ? 'Saliste de la tarea' : 'Tarea borrada');
                  }}
                >
                  {leaving ? 'Sí, salir' : 'Sí, borrar'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                  No
                </button>
              </div>
            ) : (
              <button type="button" className="btn btn-ghost btn-danger-text" onClick={() => setConfirmDelete(true)}>
                <IconTrash size={16} /> {leaving ? 'Salir' : 'Borrar'}
              </button>
            )}
            <span className="spacer" />
            {!shared && sharingStatus !== 'off' && !confirmDelete && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  commitTitle();
                  close();
                  if (sharingStatus === 'ready') useShared.setState({ sendDialog: { task } });
                  else useShared.setState({ authOpen: true });
                }}
              >
                <IconSend size={16} /> <span className="hide-sm">Mandar a alguien</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                commitTitle();
                close();
              }}
            >
              Listo
            </button>
          </>
        )
      }
    >
      {task && (
        <div className="detail">
          <AutoTitle value={title} onChange={setTitle} onCommit={commitTitle} />
          <p className="detail-meta">
            Creada el {todayLong(task.createdAt).toLowerCase()}, {formatTime(task.createdAt)} h
          </p>

          {shared && <SharedInfoBox task={task} />}

          <div className="detail-row">
            {shared?.mode !== 'joint' && (
            <div className="segmented" role="radiogroup" aria-label="Tipo">
              <button
                type="button"
                role="radio"
                aria-checked={task.kind === 'quick'}
                className={task.kind === 'quick' ? 'is-on' : ''}
                onClick={() => updateTask(task.id, { kind: 'quick' })}
              >
                Rápida
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={task.kind === 'project'}
                className={task.kind === 'project' ? 'is-on' : ''}
                onClick={() => updateTask(task.id, { kind: 'project' })}
              >
                Proyecto
              </button>
            </div>
            )}
            <div className="swatches" role="radiogroup" aria-label="Color">
              {TONES.map((t, i) => (
                <button
                  key={t.name}
                  type="button"
                  role="radio"
                  aria-checked={task.tone % TONES.length === i}
                  aria-label={t.name}
                  title={t.name}
                  className={`swatch ${task.tone % TONES.length === i ? 'is-on' : ''}`}
                  style={{ background: `linear-gradient(140deg, ${t.from}, ${t.to})` }}
                  onClick={() => updateTask(task.id, { tone: i })}
                />
              ))}
            </div>
          </div>

          {task.kind === 'project' && (
            <section className="detail-section">
              <h3>Subtareas</h3>
              <SubtaskList task={task} variant="detail" />
            </section>
          )}

          <section className="detail-section">
            <h3>Mails vinculados</h3>
            <MailChips mails={task.mails} onRemove={(id) => taskOps.removeMail(task, id)} />
            <MailAddForm onAdd={(m) => taskOps.addMail(task, m)} />
          </section>

          <section className="detail-section">
            <h3>Notas</h3>
            <NotesField key={task.id} task={task} />
          </section>
        </div>
      )}
    </Modal>
  );
}

/** Nombre de la tarea: una sola "línea" lógica (Enter guarda) que crece para mostrar nombres largos completos. */
function AutoTitle({ value, onChange, onCommit }: { value: string; onChange(v: string): void; onCommit(): void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      className="detail-title"
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      aria-label="Nombre de la tarea"
    />
  );
}

/** Notas: se guardan solas (en las compartidas, al dejar de escribir un momento). */
function NotesField({ task }: { task: Task }) {
  const [value, setValue] = useState(task.notes);
  const focused = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(task);
  latest.current = task;

  useEffect(() => {
    if (!focused.current) setValue(task.notes);
  }, [task.notes]);

  const save = (v: string) => {
    window.clearTimeout(timer.current);
    if (v !== latest.current.notes) taskOps.update(latest.current, { notes: v });
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <textarea
      className="input textarea"
      value={value}
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        save(value);
      }}
      onChange={(e) => {
        const v = e.target.value;
        setValue(v);
        window.clearTimeout(timer.current);
        if (task.shared) timer.current = window.setTimeout(() => save(v), 700);
        else save(v);
      }}
      placeholder="Detalles del pedido, parámetros, a quién avisar…"
      rows={4}
    />
  );
}

function SharedInfoBox({ task }: { task: Task }) {
  const sh = task.shared!;
  const others = sh.people.filter((p) => p.uid !== sh.me);
  return (
    <div className="shared-box">
      <SpeciesFish kind={sh.fish} width={74} />
      <div>
        {sh.mode === 'joint' ? (
          <>
            <p className="shared-box-title">
              {sh.isOwner ? 'Proyecto conjunto que armaste' : `Proyecto conjunto de ${firstName(sh.fromName)}`}
            </p>
            <div className="shared-people">
              {others.map((p) => (
                <span key={p.uid} className={`person ${p.pending ? 'is-pending' : ''}`}>
                  <Avatar uid={p.uid} name={p.name} size={22} />
                  {firstName(p.name)}
                  {p.pending && <small> · no respondió</small>}
                </span>
              ))}
            </div>
            <p className="shared-box-hint">Tocá el circulito de cada subtarea para elegir quién se encarga.</p>
          </>
        ) : (
          <p className="shared-box-title">
            {firstName(sh.fromName)} te la mandó con {speciesWithArticle(sh.fish)}. Cuando la termines, tirala al
            balde y le avisa.
          </p>
        )}
      </div>
    </div>
  );
}

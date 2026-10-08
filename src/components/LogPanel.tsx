import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { LogEntry } from '../types';
import { useTasks } from '../store/tasks';
import { useUI } from '../store/ui';
import { taskOps } from '../lib/taskOps';
import { dayKey, dayLabel, formatMinutes, formatTime, parseDuration, startOfDay, startOfWeek } from '../lib/time';
import { downloadFile, logToCsv } from '../lib/backup';
import { tone } from '../lib/tones';
import { Modal } from './Modal';
import { MiniFish } from './Fish';
import { SpeciesFish } from './Fishes';
import { MailChips } from './MailLinks';
import { EditableText } from './EditableText';
import { IconClock, IconDownload, IconSearch, IconTrash, IconUndo } from './Icons';

const sumMinutes = (entries: LogEntry[]) => entries.reduce((acc, e) => acc + (e.minutes ?? 0), 0);

/** La bitácora: todo lo que cayó al balde, por día, con cuánto tardaste. */
export function LogPanel() {
  const open = useUI((s) => s.logOpen);
  const setOpen = useUI((s) => s.setLogOpen);
  const log = useTasks((s) => s.log);
  const [query, setQuery] = useState('');

  const sorted = useMemo(() => [...log].sort((a, b) => b.completedAt - a.completedAt), [log]);
  const today = startOfDay();
  const week = startOfWeek();
  const todayEntries = sorted.filter((e) => e.completedAt >= today);
  const weekEntries = sorted.filter((e) => e.completedAt >= week);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((e) =>
      [
        e.task.title,
        e.comment,
        e.task.notes,
        ...e.task.mails.map((m) => m.subject),
        ...e.task.subtasks.map((s) => s.title),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [sorted, query]);

  const groups = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    for (const e of filtered) {
      const k = dayKey(e.completedAt);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.values()];
  }, [filtered]);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      placement="side"
      className="log-panel"
      title={
        <>
          <span className="log-title">Bitácora</span>
          <span className="log-subtitle">Tareas terminadas</span>
        </>
      }
      footer={
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!log.length}
          onClick={() =>
            downloadFile(`bitacora-mis-tareas-${dayKey(Date.now())}.csv`, logToCsv(sorted), 'text/csv;charset=utf-8')
          }
        >
          <IconDownload size={16} /> Exportar a Excel (CSV)
        </button>
      }
    >
      <div className="log-stats">
        <Stat label="Hoy" count={todayEntries.length} minutes={sumMinutes(todayEntries)} />
        <Stat label="Esta semana" count={weekEntries.length} minutes={sumMinutes(weekEntries)} />
        <Stat label="Total" count={sorted.length} minutes={sumMinutes(sorted)} />
      </div>

      {log.length > 0 && (
        <label className="search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en la bitácora…"
            aria-label="Buscar en la bitácora"
          />
        </label>
      )}

      {log.length === 0 && (
        <div className="empty empty--log">
          <MiniFish size={56} className="empty-fish" />
          <p>Todavía no hay tareas terminadas.</p>
        </div>
      )}
      {log.length > 0 && filtered.length === 0 && <p className="muted center">No hay nada con “{query}”.</p>}

      {groups.map((entries) => (
        <section key={dayKey(entries[0].completedAt)} className="log-day">
          <h3 className="log-day-head">
            <span>{dayLabel(entries[0].completedAt)}</span>
            <span className="muted">
              {entries.length} {entries.length === 1 ? 'tarea' : 'tareas'}
              {sumMinutes(entries) > 0 && ` · ${formatMinutes(sumMinutes(entries))}`}
            </span>
          </h3>
          <ul className="log-list">
            <AnimatePresence initial={false}>
              {entries.map((e) => (
                <LogRow key={e.id} entry={e} />
              ))}
            </AnimatePresence>
          </ul>
        </section>
      ))}
    </Modal>
  );
}

function Stat({ label, count, minutes }: { label: string; count: number; minutes: number }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {count} <MiniFish size={22} />
      </span>
      <span className="stat-time">{minutes ? formatMinutes(minutes) : '—'}</span>
    </div>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const updateLog = useTasks((s) => s.updateLog);
  const remove = useTasks((s) => s.deleteLog);
  const toast = useUI((s) => s.toast);
  const [confirm, setConfirm] = useState(false);
  const [badDuration, setBadDuration] = useState(false);
  const t = entry.task;
  const subsDone = t.subtasks.filter((s) => s.done).length;

  return (
    <motion.li
      layout
      className="log-entry"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
    >
      <span
        className="log-fish"
        style={{ background: `linear-gradient(140deg, ${tone(t.tone).from}, ${tone(t.tone).to})` }}
      >
        {t.shared ? <SpeciesFish kind={t.shared.fish} width={34} swim={false} /> : <MiniFish size={30} />}
      </span>
      <div className="log-main">
        <p className="log-entry-title">{t.title}</p>
        <p className="log-meta">
          {t.shared?.mode === 'joint'
            ? 'Proyecto conjunto'
            : t.shared
              ? `De ${t.shared.fromName}`
              : t.kind === 'project'
                ? 'Proyecto'
                : 'Rápida'}{' '}
          · {formatTime(entry.completedAt)}
          {t.subtasks.length > 0 && ` · ${subsDone}/${t.subtasks.length} subtareas`}
        </p>

        <div className="log-fields">
          <span
            className={`log-duration ${entry.minutes == null ? 'is-empty' : ''} ${badDuration ? 'is-invalid' : ''}`}
          >
            <IconClock size={14} />
            <EditableText
              value={entry.minutes != null ? formatMinutes(entry.minutes) : ''}
              emptyLabel="¿Cuánto tardaste?"
              placeholder="ej: 1h 30 o de 9 a 10:30"
              ariaLabel="Tiempo que llevó"
              onSave={(v) => {
                if (!v) {
                  updateLog(entry.id, { minutes: null });
                  setBadDuration(false);
                  return;
                }
                const m = parseDuration(v);
                setBadDuration(m == null);
                if (m != null) updateLog(entry.id, { minutes: m });
              }}
            />
          </span>
        </div>
        <EditableText
          value={entry.comment}
          emptyLabel="+ comentario"
          placeholder="¿Cómo te fue? ¿Algo para recordar?"
          className="log-comment"
          multiline
          ariaLabel="Comentario"
          onSave={(v) => updateLog(entry.id, { comment: v })}
        />
        {t.notes && <p className="log-notes">{t.notes}</p>}
        <MailChips mails={t.mails} />

        <div className="log-actions">
          {confirm ? (
            <>
              <span className="muted">¿Borrar de la bitácora?</span>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(entry.id)}>
                Borrar
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirm(false)}>
                No
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  taskOps.restore(entry.id);
                  toast('La tarea volvió al agua');
                }}
                title="Volver a poner la tarea en la lista"
              >
                <IconUndo size={14} /> Devolver al agua
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost btn-danger-text"
                onClick={() => setConfirm(true)}
                aria-label="Borrar de la bitácora"
              >
                <IconTrash size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.li>
  );
}

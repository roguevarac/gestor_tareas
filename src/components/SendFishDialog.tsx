import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { FishKind, TaskKind } from '../types';
import { sendFish, useOthers, useShared } from '../store/shared';
import { useTasks } from '../store/tasks';
import { useUI } from '../store/ui';
import { firstName } from '../sharing/logic';
import { TONES } from '../lib/tones';
import { Modal } from './Modal';
import { SPECIES, SpeciesFish, speciesWithArticle } from './Fishes';
import { Avatar } from './Avatar';
import { IconCopy, IconPlus, IconSearch, IconSend, IconX } from './Icons';
import { copyText } from './MailLinks';

interface DraftSub {
  key: string;
  title: string;
  assignee: string | null;
  done: boolean;
}

let keySeq = 0;
const nextKey = () => `s${++keySeq}`;

export const APP_URL = 'https://roguevarac.github.io/gestor_tareas/';

/** Elegir qué mandar, a quién, cómo (para que la haga / conjunta) y en qué pez. */
export function SendFishDialog() {
  const dialog = useShared((s) => s.sendDialog);
  const status = useShared((s) => s.status);
  const open = !!dialog && status === 'ready';
  return (
    <Modal
      open={open}
      onClose={() => useShared.setState({ sendDialog: null })}
      size="lg"
      className="send-modal"
      title="Mandar un pez"
    >
      {dialog && <SendForm key={dialog.task?.id ?? 'new'} />}
    </Modal>
  );
}

function SendForm() {
  const source = useShared((s) => s.sendDialog?.task);
  const me = useShared((s) => s.me)!;
  const others = useOthers();
  const toast = useUI((s) => s.toast);

  const [title, setTitle] = useState(source?.title ?? '');
  const [kind, setKind] = useState<TaskKind>(source?.kind ?? 'quick');
  const [mode, setMode] = useState<'assigned' | 'joint'>('assigned');
  const [to, setTo] = useState<string[]>([]);
  const [fish, setFish] = useState<FishKind>('mojarrita');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [subs, setSubs] = useState<DraftSub[]>(() =>
    (source?.subtasks ?? []).map((s) => ({ key: nextKey(), title: s.title, assignee: null, done: s.done })),
  );
  const [subDraft, setSubDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const effectiveKind: TaskKind = mode === 'joint' ? 'project' : kind;
  const showSubs = effectiveKind === 'project';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? others.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q)) : others;
  }, [others, query]);

  const people = useMemo(
    () => [
      { uid: me.uid, name: me.name },
      ...to.map((u) => ({ uid: u, name: others.find((o) => o.uid === u)?.name ?? 'Alguien' })),
    ],
    [me, to, others],
  );

  // Si saco a alguien, sus subtareas quedan sin responsable.
  useEffect(() => {
    setSubs((ss) => ss.map((s) => (s.assignee && !people.some((p) => p.uid === s.assignee) ? { ...s, assignee: null } : s)));
  }, [people]);

  const toggle = (uid: string) => setTo((t) => (t.includes(uid) ? t.filter((x) => x !== uid) : [...t, uid]));
  const addSub = () => {
    if (!subDraft.trim()) return;
    setSubs((s) => [...s, { key: nextKey(), title: subDraft.trim(), assignee: null, done: false }]);
    setSubDraft('');
  };

  const canSend = title.trim() && to.length > 0 && !busy;

  const send = async () => {
    if (!canSend) return;
    setBusy(true);
    const ok = await sendFish(
      {
        mode,
        kind: effectiveKind,
        title,
        notes: source?.notes ?? '',
        tone: source?.tone ?? useTasks.getState().toneCursor % TONES.length,
        fish,
        message,
        subtasks: showSubs ? subs.map((s) => ({ title: s.title, assignee: s.assignee, done: s.done })) : [],
        mails: source?.mails ?? [],
      },
      to,
      source?.id,
    );
    setBusy(false);
    if (!ok) return;
    useShared.setState({ sendDialog: null });
    launchFish(fish);
    const names = to.map((u) => firstName(others.find((o) => o.uid === u)?.name ?? '')).join(', ');
    toast(
      mode === 'joint'
        ? `🐟 Proyecto conjunto mandado a ${names}. Aparece cuando acepten.`
        : `🐟 Le mandaste ${speciesWithArticle(fish)} a ${names}`,
    );
  };

  const shareLink = async () => {
    const ok = await copyText(APP_URL);
    toast(ok ? 'Link copiado: pasáselo a quien quieras' : APP_URL);
  };

  return (
    <div className="send">
      {/* Qué */}
      <section className="send-section">
        <h3>Qué hay que hacer</h3>
        <input
          className="input send-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej.: Revisar el informe de ventas"
          aria-label="Nombre de la tarea"
          autoFocus={!source}
        />
      </section>

      {/* A quién */}
      <section className="send-section">
        <h3>A quién</h3>
        {others.length === 0 ? (
          <div className="send-empty">
            <p>
              Todavía no entró nadie más. Pasales el link de la app; cuando entren con su cuenta van a aparecer acá.
            </p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={shareLink}>
              <IconCopy size={15} /> Copiar el link
            </button>
          </div>
        ) : (
          <>
            {others.length > 6 && (
              <label className="search send-search">
                <IconSearch size={16} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar persona…" aria-label="Buscar persona" />
              </label>
            )}
            <div className="people-pick" role="group" aria-label="Destinatarios">
              {filtered.map((u) => {
                const on = to.includes(u.uid);
                return (
                  <button
                    key={u.uid}
                    type="button"
                    className={`person-chip ${on ? 'is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggle(u.uid)}
                    title={u.email}
                  >
                    <Avatar uid={u.uid} name={u.name} size={26} />
                    <span>{u.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Cómo */}
      <section className="send-section">
        <h3>Cómo</h3>
        <div className="mode-cards" role="radiogroup" aria-label="Cómo">
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'assigned'}
            className={`mode-card ${mode === 'assigned' ? 'is-on' : ''}`}
            onClick={() => setMode('assigned')}
          >
            <strong>Que la haga</strong>
            <span>Pasa a ser {to.length > 1 ? 'de cada una (le llega una a cada persona)' : 'solo suya'}. Te avisa cuando la termina.</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'joint'}
            className={`mode-card ${mode === 'joint' ? 'is-on' : ''}`}
            onClick={() => setMode('joint')}
          >
            <strong>La hacemos juntos</strong>
            <span>Proyecto conjunto: lo ven todos y cada subtarea tiene su responsable.</span>
          </button>
        </div>

        {mode === 'assigned' && (
          <div className="segmented send-kind" role="radiogroup" aria-label="Tipo">
            <button type="button" role="radio" aria-checked={kind === 'quick'} className={kind === 'quick' ? 'is-on' : ''} onClick={() => setKind('quick')}>
              Rápida
            </button>
            <button type="button" role="radio" aria-checked={kind === 'project'} className={kind === 'project' ? 'is-on' : ''} onClick={() => setKind('project')}>
              Proyecto con subtareas
            </button>
          </div>
        )}

        {showSubs && (
          <div className="send-subs">
            <ul>
              <AnimatePresence initial={false}>
                {subs.map((s) => (
                  <motion.li key={s.key} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <span className="send-sub-title">{s.title}</span>
                    {mode === 'joint' && (
                      <select
                        className="send-sub-who"
                        value={s.assignee ?? ''}
                        aria-label={`Responsable de ${s.title}`}
                        onChange={(e) =>
                          setSubs((ss) => ss.map((x) => (x.key === s.key ? { ...x, assignee: e.target.value || null } : x)))
                        }
                      >
                        <option value="">Sin responsable</option>
                        {people.map((p) => (
                          <option key={p.uid} value={p.uid}>
                            {p.uid === me.uid ? `${p.name} (yo)` : p.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Sacar ${s.title}`}
                      onClick={() => setSubs((ss) => ss.filter((x) => x.key !== s.key))}
                    >
                      <IconX size={14} />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <form
              className="send-sub-add"
              onSubmit={(e) => {
                e.preventDefault();
                addSub();
              }}
            >
              <IconPlus size={15} />
              <input value={subDraft} onChange={(e) => setSubDraft(e.target.value)} placeholder="Agregar subtarea…" aria-label="Agregar subtarea" />
            </form>
            {mode === 'joint' && to.length === 0 && subs.length > 0 && (
              <p className="hint">Elegí a quién se la mandás para poder asignarle subtareas.</p>
            )}
          </div>
        )}
      </section>

      {/* Pez */}
      <section className="send-section">
        <h3>En qué pez</h3>
        <div className="species-grid" role="radiogroup" aria-label="Pez">
          {SPECIES.map((s) => (
            <button
              key={s.kind}
              type="button"
              role="radio"
              aria-checked={fish === s.kind}
              className={`species-card ${fish === s.kind ? 'is-on' : ''}`}
              onClick={() => setFish(s.kind)}
            >
              <SpeciesFish kind={s.kind} width={92} swim={fish === s.kind} />
              <strong>{s.name}</strong>
              <span>{s.says}</span>
            </button>
          ))}
        </div>
        <input
          className="input send-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Unas palabras (opcional)"
          aria-label="Mensaje"
          maxLength={280}
        />
      </section>

      <footer className="send-foot">
        <button type="button" className="btn btn-ghost" onClick={() => useShared.setState({ sendDialog: null })}>
          Cancelar
        </button>
        <span className="spacer" />
        {source && <span className="send-note">Sale de tu lista y pasa a ser compartida.</span>}
        <button type="button" className="btn btn-primary" disabled={!canSend} onClick={() => void send()}>
          <IconSend size={16} /> Mandar {speciesWithArticle(fish).replace(/^una? /, '')}
        </button>
      </footer>
    </div>
  );
}

// ---------- El pez que sale nadando al mandar ----------

let launchSeq = 0;
const launchListeners = new Set<(l: { key: number; fish: FishKind }) => void>();

export function launchFish(fish: FishKind) {
  const l = { key: ++launchSeq, fish };
  launchListeners.forEach((fn) => fn(l));
}

export function LaunchedFish() {
  const [runs, setRuns] = useState<{ key: number; fish: FishKind }[]>([]);
  useEffect(() => {
    const fn = (l: { key: number; fish: FishKind }) => setRuns((r) => [...r, l]);
    launchListeners.add(fn);
    return () => void launchListeners.delete(fn);
  }, []);
  return (
    <div className="launch-layer" aria-hidden="true">
      {runs.map((r) => (
        <motion.div
          key={r.key}
          className="launch-fish"
          initial={{ x: '38vw', y: '46vh', scale: 0.6, opacity: 0, rotate: 0 }}
          animate={{
            x: ['38vw', '52vw', '78vw', '112vw'],
            y: ['46vh', '40vh', '30vh', '18vh'],
            scale: [0.6, 1.1, 1, 0.9],
            opacity: [0, 1, 1, 1],
            rotate: [0, -8, -12, -16],
          }}
          transition={{ duration: 1.5, ease: 'easeIn' }}
          onAnimationComplete={() => setRuns((rs) => rs.filter((x) => x.key !== r.key))}
        >
          <SpeciesFish kind={r.fish} width={130} />
        </motion.div>
      ))}
    </div>
  );
}

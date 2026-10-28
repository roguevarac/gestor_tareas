import { useMemo } from 'react';
import { create } from 'zustand';
import type { Board, BoardTask, Ping } from '../sharing/types';
import { firstName, isVisibleTo, toTask } from '../sharing/logic';
import { errorText } from '../sharing/errors';
import { startOfDay } from '../lib/time';
import { getBackend, useShared } from './shared';
import { useTasks } from './tasks';
import { useUI } from './ui';

/**
 * Tareas del equipo (qué tiene cada uno en el agua) y la caña de pescar ("¿En qué andás?").
 */
interface SupervisionState {
  boards: Board[];
  /** Preguntas que me hicieron. */
  pingsIn: Ping[];
  /** Preguntas que hice yo (con la caña). */
  pingsOut: Ping[];
  boardOpen: boolean;
  rodOpen: boolean;
}

export const useSupervision = create<SupervisionState>()(() => ({
  boards: [],
  pingsIn: [],
  pingsOut: [],
  boardOpen: false,
  rodOpen: false,
}));

const set = useSupervision.setState;
const toast = (t: string) => useUI.getState().toast(t);

function fail(e: unknown) {
  console.error(e);
  const t = errorText(e);
  if (t) toast(t);
}

export const QUESTION = '¿En qué andás?';
/** Una pregunta sin responder vale por unas horas; después se descarta sola. */
const PING_TTL = 10 * 60 * 60 * 1000;

let started = false;
let watchedFor = '';
let unwatch: (() => void)[] = [];
let answersSeeded = false;
const seenAnswers = new Set<string>();

export function startSupervision() {
  if (started) return;
  started = true;
  const sync = () => {
    const { memberId, status, me } = useShared.getState();
    // Quien tiene acceso privado no ve ni publica tareas del equipo, ni usa la caña.
    const key = status === 'ready' && memberId && me && !me.private ? memberId : '';
    if (key === watchedFor) return;
    watchedFor = key;
    unwatch.forEach((u) => u());
    unwatch = [];
    set({ boards: [], pingsIn: [], pingsOut: [] });
    const backend = getBackend();
    if (!key || !backend || !memberId) {
      set({ rodOpen: false, boardOpen: false });
      return;
    }
    answersSeeded = false;
    unwatch.push(
      backend.watchPings('to', memberId, (pingsIn) => set({ pingsIn }), fail),
      backend.watchPings('from', memberId, onPingsOut, fail),
      backend.watchBoards((boards) => set({ boards }), fail),
    );
  };
  useShared.subscribe(sync);
  sync();
  startBoardPublisher();
}

function onPingsOut(pingsOut: Ping[]) {
  set({ pingsOut });
  for (const p of pingsOut) {
    if (!p.answeredAt) continue;
    const k = `${p.id}:${p.answeredAt}`;
    if (seenAnswers.has(k)) continue;
    seenAnswers.add(k);
    if (answersSeeded) toast(`🎣 ${firstName(p.toName)}: «${p.answer}»`);
  }
  answersSeeded = true;
}

// ---------------- Publicar mi tablero ----------------

function buildBoard(memberId: string): Board {
  const { tasks, log } = useTasks.getState();
  const { docs } = useShared.getState();
  const local: BoardTask[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    kind: t.kind,
    createdAt: t.createdAt,
    tone: t.tone,
    priority: t.priority ?? null,
    shared: null,
    from: null,
    subtasks: t.subtasks.slice(0, 40).map((s) => ({ title: s.title, done: s.done })),
  }));
  const shared: BoardTask[] = docs
    .filter((d) => isVisibleTo(d, memberId))
    .map((d) => {
      const t = toTask(d, memberId);
      const nameOf = (u?: string | null) => (u ? (d.names[u] ?? null) : null);
      return {
        id: d.id,
        title: t.title,
        kind: t.kind,
        createdAt: t.createdAt,
        tone: t.tone,
        priority: t.priority ?? null,
        shared: d.mode,
        from: d.from === memberId ? null : nameOf(d.from),
        subtasks: t.subtasks.slice(0, 40).map((s) => ({ title: s.title, done: s.done, assignee: nameOf(s.assignee) })),
      };
    });
  const today = startOfDay();
  return {
    memberId,
    tasks: [...shared, ...local],
    doneToday: log
      .filter((e) => e.completedAt >= today)
      .slice(0, 30)
      .map((e) => ({ title: e.task.title, completedAt: e.completedAt, minutes: e.minutes })),
    updatedAt: Date.now(),
  };
}

function startBoardPublisher() {
  let timer: number | undefined;
  let pendingSince = 0;
  let last = '';
  // Espera a que se calmen los cambios (2,5 s), pero nunca más de 6 s desde el primero.
  const schedule = () => {
    const now = Date.now();
    if (!pendingSince) pendingSince = now;
    window.clearTimeout(timer);
    timer = window.setTimeout(publish, Math.max(0, Math.min(2500, pendingSince + 6000 - now)));
  };
  const publish = () => {
    pendingSince = 0;
    const { memberId, status, me } = useShared.getState();
    const backend = getBackend();
    if (status !== 'ready' || !memberId || !backend || !me || me.private) return;
    const board = buildBoard(memberId);
    const sig = JSON.stringify({ ...board, updatedAt: 0 });
    if (sig === last) return;
    last = sig;
    backend.saveBoard(board).catch((e) => {
      last = '';
      console.error(e);
    });
  };
  useTasks.subscribe(schedule);
  let lastDocs = useShared.getState().docs;
  let lastMember = useShared.getState().memberId;
  let lastMe = useShared.getState().me;
  useShared.subscribe((s) => {
    if (s.docs !== lastDocs || s.memberId !== lastMember || s.me !== lastMe) {
      lastDocs = s.docs;
      lastMember = s.memberId;
      lastMe = s.me;
      last = '';
      schedule();
    }
  });
  // Al volver a la app (otro día) se actualiza "lo que terminó hoy".
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && schedule());
  schedule();
}

// ---------------- La caña ----------------

export async function castLine(toMemberId: string) {
  const backend = getBackend();
  const { me, users } = useShared.getState();
  const to = users.find((u) => u.uid === toMemberId);
  if (!backend || !me || !to) return false;
  try {
    await backend.sendPing({
      from: me.uid,
      to: to.uid,
      fromName: me.name,
      toName: to.name,
      question: QUESTION,
      createdAt: Date.now(),
      answer: null,
      answeredAt: null,
    });
    return true;
  } catch (e) {
    fail(e);
    return false;
  }
}

export async function answerPing(id: string, answer: string) {
  const backend = getBackend();
  if (!backend || !answer.trim()) return;
  set((s) => ({ pingsIn: s.pingsIn.map((p) => (p.id === id ? { ...p, answer: answer.trim(), answeredAt: Date.now() } : p)) }));
  await backend.answerPing(id, answer.trim().slice(0, 280)).catch(fail);
}

export async function clearPing(id: string) {
  const backend = getBackend();
  set((s) => ({ pingsOut: s.pingsOut.filter((p) => p.id !== id) }));
  await backend?.removePing(id).catch(fail);
}

/** Preguntas que me hicieron y todavía no contesté. */
export function usePendingBait(): Ping[] {
  const pings = useSupervision((s) => s.pingsIn);
  return useMemo(
    () =>
      pings
        .filter((p) => !p.answeredAt && Date.now() - p.createdAt < PING_TTL)
        .sort((a, b) => a.createdAt - b.createdAt),
    [pings],
  );
}

/** Las últimas preguntas que hice, la más nueva primero. */
export function useMyCasts(): Ping[] {
  const pings = useSupervision((s) => s.pingsOut);
  return useMemo(() => [...pings].sort((a, b) => b.createdAt - a.createdAt).slice(0, 30), [pings]);
}

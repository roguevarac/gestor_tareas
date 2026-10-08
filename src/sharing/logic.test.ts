import { describe, expect, it } from 'vitest';
import {
  applyPatch,
  buildDocs,
  eventsFor,
  isIncomingFor,
  isVisibleTo,
  membersOf,
  needsLogEntry,
  toTask,
  toggleSubtaskPatch,
} from './logic';
import type { SharedDoc } from './types';

const ana = { uid: 'ana', name: 'Ana Pérez' };
const juan = { uid: 'juan', name: 'Juan' };
const sofi = { uid: 'sofi', name: 'Sofi' };

const asDoc = (d: Omit<SharedDoc, 'id'>, id = 'd1'): SharedDoc => ({ ...d, id });

describe('buildDocs', () => {
  it('"que la haga" a varias personas: un pez para cada una', () => {
    const docs = buildDocs(
      { mode: 'assigned', kind: 'quick', title: ' Informe ', tone: 2, fish: 'dorado' },
      ana,
      [juan, sofi],
      100,
    );
    expect(docs).toHaveLength(2);
    expect(docs[0].participants).toEqual(['ana', 'juan']);
    expect(docs[1].participants).toEqual(['ana', 'sofi']);
    expect(docs[0].invites).toEqual({ ana: 'owner', juan: 'pending' });
    expect(docs[0].title).toBe('Informe');
    expect(docs[0].state).toBe('open');
  });

  it('conjunta: un solo proyecto, responsables solo entre participantes', () => {
    const [d] = buildDocs(
      {
        mode: 'joint',
        kind: 'quick',
        title: 'Web',
        tone: 0,
        fish: 'globo',
        subtasks: [
          { title: 'Textos', assignee: 'ana' },
          { title: 'Fotos', assignee: 'juan' },
          { title: 'Intrusa', assignee: 'pedro' },
          { title: '   ' },
        ],
      },
      ana,
      [juan, sofi],
    );
    expect(d.kind).toBe('project');
    expect(d.participants).toEqual(['ana', 'juan', 'sofi']);
    expect(d.subtasks.map((s) => s.assignee)).toEqual(['ana', 'juan', null]);
  });
});

describe('visibilidad', () => {
  const [joint] = buildDocs({ mode: 'joint', kind: 'project', title: 'P', tone: 0, fish: 'surubi' }, ana, [juan]);
  const [assigned] = buildDocs({ mode: 'assigned', kind: 'quick', title: 'Q', tone: 0, fish: 'payaso' }, ana, [juan]);

  it('la conjunta la ve quien la armó; el invitado recién al aceptar', () => {
    const d = asDoc(joint);
    expect(isVisibleTo(d, 'ana')).toBe(true);
    expect(isVisibleTo(d, 'juan')).toBe(false);
    expect(isIncomingFor(d, 'juan')).toBe(true);
    const accepted = applyPatch(d, { 'invites.juan': 'accepted' });
    expect(isVisibleTo(accepted, 'juan')).toBe(true);
    expect(isIncomingFor(accepted, 'juan')).toBe(false);
    expect(membersOf(accepted)).toEqual(['ana', 'juan']);
  });

  it('la que mandé para que la haga otro no está en mis listas', () => {
    const d = applyPatch(asDoc(assigned), { 'invites.juan': 'accepted' });
    expect(isVisibleTo(d, 'ana')).toBe(false);
    expect(isVisibleTo(d, 'juan')).toBe(true);
    const t = toTask(d, 'juan');
    expect(t.shared?.fromName).toBe('Ana Pérez');
    expect(t.shared?.isOwner).toBe(false);
  });

  it('terminada no aparece en ninguna lista', () => {
    const d = applyPatch(asDoc(joint), { state: 'done' });
    expect(isVisibleTo(d, 'ana')).toBe(false);
  });
});

describe('subtareas y avisos', () => {
  const base = asDoc(
    buildDocs(
      { mode: 'joint', kind: 'project', title: 'P', tone: 0, fish: 'surubi', subtasks: [{ title: 'a' }] },
      ana,
      [juan],
    )[0],
  );

  it('tildar guarda quién la tildó; destildar lo borra', () => {
    const id = base.subtasks[0].id;
    const on = applyPatch(base, toggleSubtaskPatch(base, id, 'juan')!);
    expect(on.subtasks[0]).toMatchObject({ done: true, doneBy: 'juan' });
    const off = applyPatch(on, toggleSubtaskPatch(on, id, 'ana')!);
    expect(off.subtasks[0]).toMatchObject({ done: false, doneBy: null });
  });

  it('avisa a quien la mandó cuando aceptan y cuando la terminan', () => {
    const d = applyPatch(base, { 'invites.juan': 'accepted', state: 'done', doneBy: 'juan', doneAt: 5 });
    const types = eventsFor([d], 'ana').map((e) => e.type);
    expect(types).toEqual(['accepted', 'done']);
    expect(eventsFor([d], 'juan')).toEqual([]);
  });

  it('proyecto conjunto que terminó otro entra a mi bitácora una sola vez', () => {
    const d = applyPatch(base, { 'invites.juan': 'accepted', state: 'done', doneBy: 'juan', doneAt: 5 });
    expect(needsLogEntry(d, 'ana', [])).toBe(true);
    const entry = { id: 'e', task: toTask(d, 'ana'), completedAt: 5, minutes: null, comment: '' };
    expect(needsLogEntry(d, 'ana', [entry])).toBe(false);
    expect(needsLogEntry(d, 'juan', [])).toBe(false);
  });
});

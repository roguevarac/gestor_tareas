import { describe, expect, it } from 'vitest';
import type { LogEntry, Task } from '../types';
import { mergeVault, sameVault } from './vaultMerge';

const NOW = 1_000_000_000_000;
const t = (id: string, at = 1, title = id): Task => ({
  id, kind: 'quick', title, notes: '', tone: 0, createdAt: 1, updatedAt: NOW - 1000 + at, mails: [], subtasks: [],
});
const e = (id: string, task: Task, at = 1): LogEntry => ({ id, task, completedAt: NOW - 1000 + at, minutes: null, comment: '' });
const ids = (x: { id: string }[]) => x.map((y) => y.id);

describe('mergeVault', () => {
  it('navegador vacío: trae todo', () => {
    const r = mergeVault({ tasks: [], log: [] }, { tasks: [t('a'), t('b')], log: [e('x', t('c'))] }, NOW);
    expect(ids(r.tasks)).toEqual(['a', 'b']);
    expect(ids(r.log)).toEqual(['x']);
  });
  it('lo anotado en los dos lados se suma', () => {
    const r = mergeVault({ tasks: [t('compu')], log: [] }, { tasks: [t('celu')], log: [] }, NOW);
    expect(ids(r.tasks).sort()).toEqual(['celu', 'compu']);
  });
  it('si se cambió en los dos, gana lo último', () => {
    const r = mergeVault({ tasks: [t('a', 5, 'compu')], log: [] }, { tasks: [t('a', 9, 'celu')], log: [] }, NOW);
    expect(r.tasks[0].title).toBe('celu');
    const r2 = mergeVault({ tasks: [t('a', 9, 'compu')], log: [] }, { tasks: [t('a', 5, 'celu')], log: [] }, NOW);
    expect(r2.tasks[0].title).toBe('compu');
  });
  it('lo borrado o terminado en un lado no vuelve', () => {
    const r = mergeVault(
      { tasks: [t('b')], log: [e('x', t('a'), 20)], deleted: { tasks: { a: NOW - 980 }, log: {} } },
      { tasks: [t('a'), t('b')], log: [], deleted: { tasks: {}, log: {} } },
      NOW,
    );
    expect(ids(r.tasks)).toEqual(['b']);
    expect(ids(r.log)).toEqual(['x']);
    // y el otro lado también lo borra al recibirlo
    const back = mergeVault({ tasks: [t('a'), t('b')], log: [] }, r, NOW);
    expect(ids(back.tasks)).toEqual(['b']);
  });
  it('devolver al agua después de terminarla: vuelve', () => {
    const restored = t('a', 50);
    const r = mergeVault({ tasks: [restored], log: [], deleted: { tasks: {}, log: { x: NOW - 960 } } }, { tasks: [], log: [e('x', t('a'))], deleted: { tasks: { a: NOW - 990 }, log: {} } }, NOW);
    expect(ids(r.tasks)).toEqual(['a']);
    expect(r.log).toEqual([]);
  });
  it('los borrados viejos se olvidan', () => {
    const r = mergeVault({ tasks: [], log: [], deleted: { tasks: { viejo: NOW - 200 * 86400000, nuevo: NOW - 5 }, log: {} } }, { tasks: [], log: [] }, NOW);
    expect(Object.keys(r.deleted.tasks)).toEqual(['nuevo']);
  });
  it('sameVault', () => {
    const a = { tasks: [t('a')], log: [] };
    expect(sameVault(a, mergeVault(a, a, NOW))).toBe(true);
  });
});

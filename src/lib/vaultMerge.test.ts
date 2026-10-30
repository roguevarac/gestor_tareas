import { describe, expect, it } from 'vitest';
import type { LogEntry, Task } from '../types';
import { mergeVault } from './vaultMerge';

const t = (id: string): Task => ({ id, kind: 'quick', title: id, notes: '', tone: 0, createdAt: 1, mails: [], subtasks: [] });
const e = (id: string, task: Task, at = 1): LogEntry => ({ id, task, completedAt: at, minutes: null, comment: '' });
const none = { tasks: [], log: [] };

describe('mergeVault', () => {
  it('navegador vacío: trae todo', () => {
    const r = mergeVault({ tasks: [], log: [] }, { tasks: [t('a'), t('b')], log: [e('x', t('c'))] }, none);
    expect(r.tasks.map((x) => x.id)).toEqual(['a', 'b']);
    expect(r.log.map((x) => x.id)).toEqual(['x']);
  });
  it('anotó algo antes de entrar: no pisa lo guardado, suma las dos cosas', () => {
    const r = mergeVault({ tasks: [t('nueva')], log: [] }, { tasks: [t('a'), t('b')], log: [] }, none);
    expect(r.tasks.map((x) => x.id)).toEqual(['nueva', 'a', 'b']);
  });
  it('no revive lo que se borró o terminó acá', () => {
    const r = mergeVault(
      { tasks: [t('a')], log: [e('x', t('b'))] },
      { tasks: [t('a'), t('b'), t('c')], log: [e('y', t('d'))] },
      { tasks: ['c'], log: ['y'] },
    );
    expect(r.tasks.map((x) => x.id)).toEqual(['a']);
    expect(r.log.map((x) => x.id)).toEqual(['x']);
  });
  it('lo de acá gana si está en los dos lados', () => {
    const local = { ...t('a'), title: 'editada' };
    const r = mergeVault({ tasks: [local], log: [] }, { tasks: [t('a')], log: [] }, none);
    expect(r.tasks).toEqual([local]);
  });
  it('la bitácora queda ordenada, de la más nueva a la más vieja', () => {
    const r = mergeVault({ tasks: [], log: [e('x', t('a'), 5)] }, { tasks: [], log: [e('y', t('b'), 9), e('z', t('c'), 1)] }, none);
    expect(r.log.map((x) => x.id)).toEqual(['y', 'x', 'z']);
  });
});

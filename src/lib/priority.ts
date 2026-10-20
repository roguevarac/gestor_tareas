import type { FishKind, Priority } from '../types';

/**
 * Categorías de las tareas (inspiradas en la matriz de Eisenhower) y el pez de cada una.
 * Al mandar una tarea, el pez que elegís es su categoría para quien la recibe.
 */
export const PRIORITIES: {
  key: Priority;
  name: string;
  short: string;
  hint: string;
  fish: FishKind;
  color: string;
  soft: string;
}[] = [
  {
    key: 'iu',
    name: 'Importante y urgente',
    short: 'Imp. y urgente',
    hint: 'Con plazos o consecuencias: van primero.',
    fish: 'dorado',
    color: '#2f8a5f',
    soft: 'rgba(63, 160, 112, 0.16)',
  },
  {
    key: 'inu',
    name: 'Importante, no urgente',
    short: 'Importante',
    hint: 'Suman a largo plazo: hacete un rato para estas.',
    fish: 'koi',
    color: '#d0643f',
    soft: 'rgba(232, 128, 92, 0.16)',
  },
  {
    key: 'uni',
    name: 'Urgente, no importante',
    short: 'Urgente',
    hint: 'Hay que sacarlas rápido, sin darles muchas vueltas.',
    fish: 'mojarrita',
    color: '#4b55c9',
    soft: 'rgba(92, 102, 214, 0.15)',
  },
  {
    key: 'fav',
    name: 'Favorcito',
    short: 'Favorcito',
    hint: 'Una mano que te pidieron (o que pedís).',
    fish: 'tararira',
    color: '#c43d5c',
    soft: 'rgba(222, 78, 110, 0.14)',
  },
];

export const priorityInfo = (p: Priority | null | undefined) => PRIORITIES.find((x) => x.key === p) ?? null;

/** La categoría que lleva un pez (o null si es un pez de antes, sin categoría). */
export const priorityOfFish = (f: FishKind | undefined) => PRIORITIES.find((x) => x.fish === f)?.key ?? null;

export const fishOfPriority = (p: Priority | null | undefined): FishKind | null => priorityInfo(p)?.fish ?? null;

import { create } from 'zustand';
import type { Task } from '../types';

/**
 * Estado del "estanque": qué tarea está nadando (convertida en mojarrita)
 * y si está encima del balde. Lo lee el balde y las tarjetas.
 */
export type PondPhase = 'idle' | 'dragging' | 'catching' | 'returning';

export const usePond = create<{
  draggingId: string | null;
  phase: PondPhase;
  bucketHot: boolean;
  /** Cuadrante (de la vista Matriz) que está debajo del pez: 'none' = "Sin categoría". */
  hotQuadrant: string | null;
  splashKey: number;
}>()(() => ({ draggingId: null, phase: 'idle', bucketHot: false, hotQuadrant: null, splashKey: 0 }));

/** El cuadrante de la Matriz que está en ese punto de la pantalla (o null). */
export function quadrantAt(x: number, y: number): string | null {
  // Por geometría: mientras se arrastra, la app no recibe el puntero (pointer-events: none).
  for (const el of document.querySelectorAll<HTMLElement>('[data-quadrant]')) {
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return el.dataset.quadrant ?? null;
  }
  return null;
}

let bucketEl: HTMLElement | null = null;

export function registerBucket(el: HTMLElement | null) {
  bucketEl = el;
}

/** Boca del balde (donde cae el pez), en coordenadas de pantalla. */
export function bucketMouth(): { x: number; y: number } | null {
  if (!bucketEl) return null;
  const r = bucketEl.getBoundingClientRect();
  if (!r.width) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height * 0.35 };
}

export function bucketRect(): DOMRect | null {
  return bucketEl?.getBoundingClientRect() ?? null;
}

export function isOverBucket(x: number, y: number): boolean {
  if (!bucketEl) return false;
  const r = bucketEl.getBoundingClientRect();
  const pad = 30;
  return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
}

interface PondController {
  startDrag(task: Task, el: HTMLElement, x: number, y: number): void;
}

let controller: PondController | null = null;

export function registerPondController(c: PondController | null) {
  controller = c;
}

export function startFishDrag(task: Task, el: HTMLElement, x: number, y: number) {
  controller?.startDrag(task, el, x, y);
}

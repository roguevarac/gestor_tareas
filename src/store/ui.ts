import { create } from 'zustand';
import type { IncomingMail } from '../lib/mail';

export interface Toast {
  id: number;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface UIState {
  openTaskId: string | null;
  /** Al cerrar el detalle, volver al panel "Enviadas" (se abrió desde ahí). */
  returnToSent: boolean;
  logOpen: boolean;
  /** Manual de uso. */
  manualOpen: boolean;
  helpOpen: boolean;
  incoming: IncomingMail | null;
  /** Proyecto recién creado: enfocar su campo "agregar subtarea". */
  focusSubtasksOf: string | null;
  toasts: Toast[];

  openTask(id: string | null, opts?: { fromSent?: boolean }): void;
  setLogOpen(open: boolean): void;
  setHelpOpen(open: boolean): void;
  setIncoming(mail: IncomingMail | null): void;
  setFocusSubtasksOf(id: string | null): void;
  toast(text: string, action?: { label: string; run: () => void }): void;
  dismissToast(id: number): void;
}

let toastSeq = 0;

export const useUI = create<UIState>()((set, get) => ({
  openTaskId: null,
  returnToSent: false,
  logOpen: false,
  manualOpen: false,
  helpOpen: false,
  incoming: null,
  focusSubtasksOf: null,
  toasts: [],

  openTask: (id, opts) => set({ openTaskId: id, ...(id ? { returnToSent: !!opts?.fromSent } : {}) }),
  setLogOpen: (logOpen) => set({ logOpen }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setIncoming: (incoming) => set({ incoming }),
  setFocusSubtasksOf: (focusSubtasksOf) => set({ focusSubtasksOf }),
  toast(text, action) {
    const id = ++toastSeq;
    set((s) => ({
      toasts: [...s.toasts.slice(-2), { id, text, actionLabel: action?.label, onAction: action?.run }],
    }));
    window.setTimeout(() => get().dismissToast(id), action ? 6500 : 3800);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

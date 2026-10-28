import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { IconX } from './Icons';

interface ModalProps {
  open: boolean;
  onClose(): void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg';
  /** 'center' (diálogo) o 'side' (panel que entra desde la derecha). */
  placement?: 'center' | 'side';
  className?: string;
  /** Sin la ✕ ni cerrar con Escape o tocando afuera (pasos obligatorios). */
  required?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  placement = 'center',
  className = '',
  required = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const requiredRef = useRef(required);
  requiredRef.current = required;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !requiredRef.current) onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => {
      const panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) panel.focus();
    }, 30);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
      prev?.focus?.();
    };
  }, [open]);

  const side = placement === 'side';
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={`modal-root modal-root--${placement}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="modal-backdrop" onClick={required ? undefined : onClose} />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            className={`modal modal--${size} modal--${placement} ${className}`}
            initial={side ? { x: '100%' } : { opacity: 0, y: 24, scale: 0.97 }}
            animate={side ? { x: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={side ? { x: '100%' } : { opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: side ? 38 : 30 }}
          >
            <header className="modal-head">
              <div className="modal-title">{title}</div>
              {!required && (
                <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
                  <IconX />
                </button>
              )}
            </header>
            <div className="modal-body">{children}</div>
            {footer && <footer className="modal-foot">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

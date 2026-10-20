import type { Priority } from '../types';
import { PRIORITIES, priorityInfo } from '../lib/priority';

/** Etiqueta chiquita con la categoría de la tarea. */
export function PriorityChip({ priority, onCard = true }: { priority?: Priority | null; onCard?: boolean }) {
  const p = priorityInfo(priority);
  if (!p) return null;
  return (
    <span
      className={`prio-chip ${onCard ? 'prio-chip--card' : ''}`}
      style={{ '--prio': p.color } as React.CSSProperties}
      title={p.name}
    >
      <span className="prio-dot" aria-hidden="true" />
      {p.short}
    </span>
  );
}

/** Elegir la categoría (en el detalle de la tarea). */
export function PriorityPicker({
  value,
  onChange,
}: {
  value?: Priority | null;
  onChange(p: Priority | null): void;
}) {
  return (
    <div className="prio-picker" role="radiogroup" aria-label="Categoría">
      {PRIORITIES.map((p) => (
        <button
          key={p.key}
          type="button"
          role="radio"
          aria-checked={value === p.key}
          className={`prio-option ${value === p.key ? 'is-on' : ''}`}
          style={{ '--prio': p.color, '--prio-soft': p.soft } as React.CSSProperties}
          onClick={() => onChange(value === p.key ? null : p.key)}
          title={p.hint}
        >
          <span className="prio-dot" aria-hidden="true" />
          {p.name}
        </button>
      ))}
    </div>
  );
}

import { initials, personHue } from '../sharing/logic';

/** Circulito con las iniciales de una persona (siempre del mismo color para cada una). */
export function Avatar({
  uid,
  name,
  size = 26,
  className = '',
  title,
}: {
  uid: string;
  name: string;
  size?: number;
  className?: string;
  title?: string;
}) {
  const h = personHue(uid);
  return (
    <span
      className={`avatar ${className}`}
      title={title ?? name}
      style={
        {
          width: size,
          height: size,
          fontSize: Math.max(9, size * 0.4),
          '--av-bg': `hsl(${h} 55% 88%)`,
          '--av-ink': `hsl(${h} 60% 24%)`,
        } as React.CSSProperties
      }
    >
      {initials(name)}
    </span>
  );
}

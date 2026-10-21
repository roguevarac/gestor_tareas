import { useId } from 'react';
import type { Country } from '../sharing/types';

export const COUNTRIES: { code: Country; name: string }[] = [
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'UY', name: 'Uruguay' },
];

export const countryName = (c?: Country | null) => COUNTRIES.find((x) => x.code === c)?.name ?? 'Sin oficina';

/** Banderita (3:2) de la oficina. */
export function Flag({ country, width = 24, className = '' }: { country?: Country | null; width?: number; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (!country) return null;
  return (
    <svg
      className={`flag ${className}`}
      width={width}
      height={(width * 2) / 3}
      viewBox="0 0 30 20"
      role="img"
      aria-label={`Bandera de ${countryName(country)}`}
    >
      <defs>
        <clipPath id={`${id}-c`}>
          <rect width="30" height="20" rx="2.2" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-c)`}>
        {country === 'AR' && (
          <>
            <rect width="30" height="20" fill="#74acdf" />
            <rect y="6.67" width="30" height="6.67" fill="#fff" />
            <circle cx="15" cy="10" r="2.3" fill="#f6b40e" stroke="#85340a" strokeWidth="0.35" />
          </>
        )}
        {country === 'CL' && (
          <>
            <rect width="30" height="20" fill="#fff" />
            <rect y="10" width="30" height="10" fill="#d52b1e" />
            <rect width="10" height="10" fill="#0039a6" />
            <path d="M5 2.2l1.06 3.26h3.43l-2.77 2.02 1.06 3.26L5 8.72l-2.78 2.02 1.06-3.26L.51 5.46h3.43z" fill="#fff" transform="translate(0 -0.4) scale(1 0.92)" />
          </>
        )}
        {country === 'UY' && (
          <>
            <rect width="30" height="20" fill="#fff" />
            {[1, 3, 5, 7].map((i) => (
              <rect key={i} y={(i * 20) / 9} width="30" height={20 / 9} fill="#0038a8" />
            ))}
            <rect width="11" height={(20 / 9) * 5} fill="#fff" />
            <circle cx="5.5" cy="5.55" r="2.6" fill="#fcd116" stroke="#7b3f00" strokeWidth="0.35" />
          </>
        )}
      </g>
      <rect width="30" height="20" rx="2.2" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.6" />
    </svg>
  );
}

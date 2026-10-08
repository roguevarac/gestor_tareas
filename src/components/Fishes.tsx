import { useId } from 'react';
import type { FishKind } from '../types';
import { Fish, FISH_RATIO } from './Fish';

/** Los peces que se pueden mandar, con lo que "dicen". */
export const SPECIES: { kind: FishKind; name: string; says: string }[] = [
  { kind: 'mojarrita', name: 'Mojarrita', says: 'Algo rápido' },
  { kind: 'dorado', name: 'Dorado', says: 'Importante' },
  { kind: 'surubi', name: 'Surubí', says: 'Algo grande' },
  { kind: 'payaso', name: 'Pez payaso', says: 'Un favorcito' },
  { kind: 'globo', name: 'Pez globo', says: '¡Urgente!' },
];

export const speciesName = (k: FishKind | undefined) => SPECIES.find((s) => s.kind === k)?.name ?? 'Mojarrita';

/** Artículo + nombre: "un dorado", "una mojarrita". */
export const speciesWithArticle = (k: FishKind | undefined) =>
  (k ?? 'mojarrita') === 'mojarrita' ? 'una mojarrita' : `un ${speciesName(k).toLowerCase()}`;

interface Props {
  kind?: FishKind;
  width?: number;
  swim?: boolean;
  className?: string;
}

/** Cualquiera de los peces, mirando a la derecha, en la misma caja que la mojarrita (132 × 44). */
export function SpeciesFish({ kind = 'mojarrita', width = 96, swim = true, className = '' }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (kind === 'mojarrita') return <Fish width={width} swim={swim} className={className} />;
  const Art = ART[kind];
  return (
    <svg
      className={`fish fish--${kind} ${swim ? 'fish--swim' : ''} ${className}`}
      width={width}
      height={width / FISH_RATIO}
      viewBox="0 0 132 44"
      aria-hidden="true"
    >
      <Art id={id} />
    </svg>
  );
}

const ART: Record<Exclude<FishKind, 'mojarrita'>, (p: { id: string }) => React.ReactElement> = {
  /** Dorado: dorado intenso, robusto, cabeza grande, hileras de puntitos y cola roja con raya negra. */
  dorado: ({ id }) => (
    <>
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8740a" />
          <stop offset="0.35" stopColor="#e9b52f" />
          <stop offset="0.7" stopColor="#f8d877" />
          <stop offset="1" stopColor="#fff3c9" />
        </linearGradient>
        <linearGradient id={`${id}-t`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#f08a24" />
          <stop offset="1" stopColor="#d9480f" />
        </linearGradient>
      </defs>
      <g className="fish-tail">
        <path
          d="M33 17 C25 12 16 7 5 2.5 C9 10 13 17 17 22 C13 27 9 34 5 41.5 C16 37 25 32 33 27 Z"
          fill={`url(#${id}-t)`}
          stroke="#8a3208"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        <path d="M32 22 L12 22" stroke="#1f1a12" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <g fill="#f1b24a" stroke="#7a5306" strokeWidth="0.7" strokeLinejoin="round">
        <path className="fish-dorsal" d="M84 8 C82 3.5 78 0.6 74 0 C74 3 73 6 70.5 9.4 Z" />
        <path d="M70 36.6 C67.5 40 64 42.4 60 43 C57 40.6 54 37.6 51.5 34.6 Z" />
        <path d="M44 13.4 C42.6 11 40 10.4 38.8 12.2 C40 13.4 42 14 44 14 Z" strokeWidth="0.5" />
      </g>
      <path
        d="M128.5 23.4 C127 16 119 9.4 106 7.2 C92 5 72 6.6 56 10.6 C46 13 38 15.6 32 17.4 L32 26.8 C38 28.6 47 31.6 58 34.6 C74 38.6 96 39.2 112 35.4 C121 33 127 28.6 128.5 23.4 Z"
        fill={`url(#${id}-b)`}
        stroke="#7a5306"
        strokeWidth="1"
      />
      <g fill="#6b4a06" opacity="0.55">
        {[46, 54, 62, 70, 78, 86, 94].map((x, i) => (
          <g key={x}>
            <rect x={x} y={14.5 - i * 0.55} width="3.2" height="0.9" rx="0.45" />
            <rect x={x + 3} y={19.4 - i * 0.2} width="3.2" height="0.9" rx="0.45" />
            <rect x={x} y={24.4} width="3.2" height="0.9" rx="0.45" />
            <rect x={x + 3} y={29 + i * 0.25} width="3.2" height="0.9" rx="0.45" />
          </g>
        ))}
      </g>
      <path d="M106 9.4 C100.6 16 100.6 28 107 34.6" stroke="#8c6408" strokeWidth="1" fill="none" />
      <path
        className="fish-pec"
        d="M104.6 27.6 C99.6 29.6 95 32 91.6 32.6 C94.6 30.2 98.6 28.2 103 26.6 Z"
        fill="#f6c45c"
        stroke="#7a5306"
        strokeWidth="0.5"
      />
      <path d="M128.4 24.2 C124 25.8 119 26.4 115 25.6" stroke="#5c3d04" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <circle cx="117" cy="16.6" r="4.6" fill="#ffd34d" stroke="#7a5306" strokeWidth="0.7" />
      <circle cx="117.5" cy="16.8" r="2.6" fill="#1a1408" />
      <circle cx="118.4" cy="15.8" r="0.85" fill="#fff" />
    </>
  ),

  /** Surubí: largo, cabeza chata, gris con manchas y barras oscuras, panza clara y bigotes largos. */
  surubi: ({ id }) => (
    <>
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4c5a62" />
          <stop offset="0.45" stopColor="#8e9ca3" />
          <stop offset="0.68" stopColor="#dfe5e7" />
          <stop offset="1" stopColor="#f7f8f8" />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          <path d="M131 25 C130 20 124 15.6 112 14 C98 12.6 72 12.4 52 14.6 C44 15.6 37 17.2 31 19 L31 27 C38 28.6 46 30.4 54 31.4 C74 33.6 98 33.4 114 31.6 C124 30.4 130 28 131 25 Z" />
        </clipPath>
      </defs>
      <g className="fish-tail">
        <path
          d="M32 19.4 C24 15 15 10 4 5 C8 11.6 12 17.4 16 22 C12 26.6 8 32.4 4 39 C15 34 24 29.4 32 26.6 Z"
          fill="#7d8b92"
          stroke="#3c474d"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <g fill="#2f3a40" opacity="0.7">
          <circle cx="14" cy="13" r="1.3" />
          <circle cx="21" cy="18" r="1.2" />
          <circle cx="13" cy="31" r="1.3" />
          <circle cx="21" cy="26.6" r="1.1" />
          <circle cx="9" cy="8.6" r="1" />
          <circle cx="9" cy="35.4" r="1" />
        </g>
      </g>
      <g fill="#8a979d" stroke="#3c474d" strokeWidth="0.6" strokeLinejoin="round">
        <path className="fish-dorsal" d="M88 12.8 C86 8 82.6 4.8 79 4 C78.6 7 78 10 76 13.4 Z" />
        <path d="M66 13.4 C60 10.8 50 11 42 15.6 L50 15.4 Z" />
        <path d="M66 32.4 C64 36.4 60.6 38.6 56.6 39.2 C55 37 53.6 34.6 52.6 31.6 Z" />
      </g>
      <path
        d="M131 25 C130 20 124 15.6 112 14 C98 12.6 72 12.4 52 14.6 C44 15.6 37 17.2 31 19 L31 27 C38 28.6 46 30.4 54 31.4 C74 33.6 98 33.4 114 31.6 C124 30.4 130 28 131 25 Z"
        fill={`url(#${id}-b)`}
        stroke="#38444a"
        strokeWidth="0.9"
      />
      <g clipPath={`url(#${id}-c)`} fill="#28333a" opacity="0.62">
        {[44, 56, 68, 80, 92].map((x) => (
          <path key={x} d={`M${x} 12 C${x - 1.4} 17 ${x - 1.6} 22 ${x - 0.6} 26.4 L${x + 2} 26.4 C${x + 1} 22 ${x + 1.2} 17 ${x + 2.6} 12 Z`} />
        ))}
        {[
          [50, 17],
          [62, 18.4],
          [74, 16.4],
          [86, 18],
          [98, 17],
          [106, 19.6],
          [112, 16.8],
          [118, 18.6],
          [40, 20.4],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" />
        ))}
      </g>
      <path
        className="fish-pec"
        d="M106 27.6 C100 30 95 32.6 90.6 33.4 C94 30.6 98.6 28.4 104 26.6 Z"
        fill="#9aa7ad"
        stroke="#3c474d"
        strokeWidth="0.5"
      />
      <g stroke="#38444a" strokeWidth="0.75" fill="none" strokeLinecap="round">
        <path d="M128.6 22.6 C122 18 112 15.6 100 16.6" />
        <path d="M129.4 27.4 C124 33 114 37.4 104 38.6" />
        <path d="M127 28.6 C122 32.6 118 35.6 113 37" />
      </g>
      <path d="M131 25.4 C127 26.6 122 26.8 118.4 26.2" stroke="#2c363b" strokeWidth="0.9" fill="none" />
      <circle cx="119.4" cy="18.8" r="2.4" fill="#e7ecee" stroke="#38444a" strokeWidth="0.5" />
      <circle cx="119.7" cy="18.9" r="1.45" fill="#11191d" />
      <circle cx="120.2" cy="18.3" r="0.45" fill="#fff" />
    </>
  ),

  /** Pez payaso: naranja, tres bandas blancas con borde negro y aletas redondeadas. */
  payaso: ({ id }) => (
    <>
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8590c" />
          <stop offset="0.5" stopColor="#fb8500" />
          <stop offset="1" stopColor="#ffa94d" />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          <path d="M126 23 C125 13 115 6 98 5.4 C80 5 62 8 50 14 C44 17 40 19.4 37 21 L37 23.4 C40 25 44 27.6 50 30.4 C62 36 80 39.4 98 38.8 C115 38 125 32 126 23 Z" />
        </clipPath>
      </defs>
      <g className="fish-tail" style={{ transformOrigin: '38px 22px' }}>
        <path
          d="M39 20 C33 13 24 9 17 9.6 C15 14 14.6 18 15 22 C14.6 26 15 30 17 34.4 C24 35 33 31 39 24.4 Z"
          fill="#fb8500"
          stroke="#161616"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M21 10.6 C18 15 17.6 29 21 33.4" stroke="#fff" strokeWidth="1.8" fill="none" opacity="0.9" />
      </g>
      <g fill="#fb8500" stroke="#161616" strokeWidth="1.3" strokeLinejoin="round">
        <path className="fish-dorsal" d="M96 6 C92 1 82 -0.4 74 1.4 C66 3.4 58 7 52 12 L70 8.4 Z" />
        <path d="M86 37.6 C84 42 78 43.6 72 43 C66 42 60 39 56 34.4 Z" />
      </g>
      <path
        d="M126 23 C125 13 115 6 98 5.4 C80 5 62 8 50 14 C44 17 40 19.4 37 21 L37 23.4 C40 25 44 27.6 50 30.4 C62 36 80 39.4 98 38.8 C115 38 125 32 126 23 Z"
        fill={`url(#${id}-b)`}
        stroke="#161616"
        strokeWidth="1.3"
      />
      <g clipPath={`url(#${id}-c)`} fill="#ffffff" stroke="#161616" strokeWidth="1.3">
        <path d="M110 2 C105 12 105 32 110 42 L116 42 C111 32 111 12 116 2 Z" />
        <path d="M80 2 C76 12 76 32 80 42 L89 42 C85 32 85 12 89 2 Z" />
        <path d="M50 2 C47 12 47 32 50 42 L56 42 C53 32 53 12 56 2 Z" />
      </g>
      <path
        className="fish-pec"
        d="M104 26 C99 27 95 30 94 34 C98 34.4 103 32 105.6 28.6 Z"
        fill="#fb8500"
        stroke="#161616"
        strokeWidth="1"
      />
      <circle cx="117.4" cy="17.4" r="4.2" fill="#fff" stroke="#161616" strokeWidth="0.9" />
      <circle cx="118" cy="17.6" r="2.6" fill="#141414" />
      <circle cx="118.9" cy="16.6" r="0.9" fill="#fff" />
      <path d="M125.6 25 C124 26.4 122.4 26.8 121 26.4" stroke="#161616" strokeWidth="1" fill="none" strokeLinecap="round" />
    </>
  ),

  /** Pez globo inflado: redondo, con espinitas, panza blanca y boquita en trompa. */
  globo: ({ id }) => {
    const spikes = Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2;
      const r1 = 19.4;
      const r2 = 23.4;
      const cx = 86;
      const cy = 22;
      const w = 0.09;
      return `M${cx + Math.cos(a - w) * r1} ${cy + Math.sin(a - w) * r1} L${cx + Math.cos(a) * r2} ${cy + Math.sin(a) * r2} L${cx + Math.cos(a + w) * r1} ${cy + Math.sin(a + w) * r1} Z`;
    }).join(' ');
    return (
      <>
        <defs>
          <radialGradient id={`${id}-b`} cx="0.45" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#fff6c7" />
            <stop offset="0.45" stopColor="#f6d365" />
            <stop offset="1" stopColor="#c99a2e" />
          </radialGradient>
        </defs>
        <g className="fish-tail" style={{ transformOrigin: '67px 22px' }}>
          <path
            d="M67.6 19 C62 14 56 11.6 51 12 C52.6 16 53 19 52.6 22 C53 25 52.6 28 51 32 C56 32.4 62 30 67.6 25 Z"
            fill="#f2c94c"
            fillOpacity="0.85"
            stroke="#7a5a14"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        </g>
        <path d={spikes} fill="#e2b33f" stroke="#7a5a14" strokeWidth="0.5" strokeLinejoin="round" />
        <circle cx="86" cy="22" r="19.6" fill={`url(#${id}-b)`} stroke="#7a5a14" strokeWidth="1" />
        <path d="M70 28 C76 39 96 41.6 104 31 C96 36 78 36 70 28 Z" fill="#fffdf2" opacity="0.9" />
        <g fill="#8a6a1f" opacity="0.5">
          <circle cx="78" cy="12" r="1.2" />
          <circle cx="86" cy="9" r="1.3" />
          <circle cx="73" cy="18" r="1.1" />
          <circle cx="82" cy="16" r="1" />
          <circle cx="92" cy="12.6" r="1" />
        </g>
        <path
          className="fish-pec"
          d="M90 26 C86 25 82 26.6 80.6 29.6 C84 30.6 88 29.6 90.6 27.4 Z"
          fill="#f2c94c"
          stroke="#7a5a14"
          strokeWidth="0.6"
        />
        <ellipse cx="106.4" cy="23.4" rx="2.4" ry="2" fill="#e8846b" stroke="#7a3d2c" strokeWidth="0.7" />
        <circle cx="97" cy="16" r="5.2" fill="#fff" stroke="#7a5a14" strokeWidth="0.8" />
        <circle cx="98.4" cy="16.4" r="3" fill="#141414" />
        <circle cx="99.4" cy="15.2" r="1.05" fill="#fff" />
      </>
    );
  },
};

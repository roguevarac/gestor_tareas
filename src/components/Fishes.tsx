import { useId } from 'react';
import type { FishKind } from '../types';
import { Fish, FISH_RATIO } from './Fish';

/** Los peces que se pueden mandar, con lo que "dicen". */
export const SPECIES: { kind: FishKind; name: string; says: string }[] = [
  { kind: 'mojarrita', name: 'Mojarrita', says: 'Algo rápido' },
  { kind: 'dorado', name: 'Dorado', says: 'Importante' },
  { kind: 'surubi', name: 'Surubí', says: 'Algo grande' },
  { kind: 'koi', name: 'Koi', says: 'Un favorcito' },
  { kind: 'tararira', name: 'Tararira', says: '¡Urgente!' },
];

export const speciesName = (k: FishKind | undefined) => SPECIES.find((s) => s.kind === k)?.name ?? 'Mojarrita';
const FEMININE: FishKind[] = ['mojarrita', 'tararira'];

/** Artículo + nombre: "un dorado", "una mojarrita". */
export const speciesWithArticle = (k: FishKind | undefined) =>
  `${FEMININE.includes(SPECIES.some((s) => s.kind === k) ? k! : 'mojarrita') ? 'una' : 'un'} ${speciesName(k).toLowerCase()}`;

interface Props {
  kind?: FishKind;
  width?: number;
  swim?: boolean;
  className?: string;
}

/** Cualquiera de los peces, mirando a la derecha, en la misma caja que la mojarrita (132 × 44). */
export function SpeciesFish({ kind = 'mojarrita', width = 96, swim = true, className = '' }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  // Los peces que ya no están (pez payaso, pez globo) se ven como mojarrita.
  const Art = kind === 'mojarrita' ? undefined : ART[kind as keyof typeof ART];
  if (!Art) return <Fish width={width} swim={swim} className={className} />;
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

const ART: Record<'dorado' | 'surubi' | 'koi' | 'tararira', (p: { id: string }) => React.ReactElement> = {
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

  /** Koi: blanco nacarado con manchas rojo-anaranjadas y alguna negra, aletas largas y cola amplia. */
  koi: ({ id }) => (
    <>
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4efe6" />
          <stop offset="0.6" stopColor="#fffdf8" />
          <stop offset="1" stopColor="#efe7da" />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          <path d="M128 23 C126.5 15.5 119 10 106 8.4 C92 6.8 72 8.6 56 12.6 C46 15 38 17.4 33 19 L33 25.6 C38 27.4 46 30 56 32.6 C72 36.4 92 38 106 36.2 C119 34.4 126.5 29.6 128 23 Z" />
        </clipPath>
      </defs>
      <g className="fish-tail">
        <path
          d="M35 19.2 C27 13.6 18 9.6 6 6.6 C9 11.6 11 16.6 12.4 22 C11 27.4 9 32.6 6 37.6 C18 34.6 27 30.6 35 25 Z"
          fill="#fff6ec"
          fillOpacity="0.92"
          stroke="#b98a6a"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <path d="M30 20 C24 17 17 14 9 11.6 M30 24 C24 27 17 30 9 32.6 M30 22 L12 22" stroke="#e5743a" strokeWidth="0.6" opacity="0.5" fill="none" />
        <path d="M14 9 C18 11 22 13.6 26 16.4 L22 21 C19 16.6 16 12.6 14 9 Z" fill="#e8562a" opacity="0.75" />
      </g>
      <g fill="#fff4ea" fillOpacity="0.9" stroke="#b98a6a" strokeWidth="0.6" strokeLinejoin="round">
        <path className="fish-dorsal" d="M92 8 C86 2.6 74 1 62 3.6 C56 5 52 8 49 12.4 L60 11 Z" />
        <path d="M70 34.4 C68 38.6 64 41.6 59.6 42.6 C57 40 55.4 36.6 55 33 Z" />
      </g>
      <path
        d="M128 23 C126.5 15.5 119 10 106 8.4 C92 6.8 72 8.6 56 12.6 C46 15 38 17.4 33 19 L33 25.6 C38 27.4 46 30 56 32.6 C72 36.4 92 38 106 36.2 C119 34.4 126.5 29.6 128 23 Z"
        fill={`url(#${id}-b)`}
        stroke="#9c7a62"
        strokeWidth="0.9"
      />
      <g clipPath={`url(#${id}-c)`}>
        <path d="M104 6 C112 10 116 16 114 22 C108 22 100 18 96 12 C97 8 100 6 104 6 Z" fill="#e8562a" />
        <path d="M86 6 C92 12 92 22 86 28 C78 30 70 24 68 16 C70 10 78 6 86 6 Z" fill="#e8562a" />
        <path d="M60 14 C64 18 64 26 58 30 C52 30 48 26 48 20 C50 16 55 13 60 14 Z" fill="#e8562a" />
        <ellipse cx="78" cy="30.6" rx="4" ry="2.4" fill="#1d1d1d" opacity="0.85" />
        <ellipse cx="96" cy="26.6" rx="2.4" ry="1.6" fill="#1d1d1d" opacity="0.85" />
        <ellipse cx="44" cy="23" rx="2.6" ry="1.8" fill="#1d1d1d" opacity="0.8" />
      </g>
      <g stroke="#b98a6a" strokeWidth="0.4" fill="none" opacity="0.45">
        <path d="M96 14 q2 2 4 0 M88 13 q2 2 4 0 M80 13.4 q2 2 4 0 M72 14.4 q2 2 4 0 M64 15.6 q2 2 4 0 M56 17 q2 2 4 0" />
      </g>
      <path
        className="fish-pec"
        d="M106 28.6 C100 31 95 35 92 39 C97 38.6 103 35.6 107 31 Z"
        fill="#fff4ea"
        fillOpacity="0.92"
        stroke="#b98a6a"
        strokeWidth="0.6"
      />
      <path d="M127.6 24.6 C125 26.6 122 27.4 119.4 27 M126 26.4 C125 30 123 32.6 120 34" stroke="#9c7a62" strokeWidth="0.75" fill="none" strokeLinecap="round" />
      <circle cx="117.6" cy="17.6" r="3.2" fill="#fff" stroke="#6d5444" strokeWidth="0.7" />
      <circle cx="118" cy="17.8" r="2" fill="#16100c" />
      <circle cx="118.7" cy="17.1" r="0.7" fill="#fff" />
    </>
  ),

  /** Tararira: cilíndrica, verde oliva con manchones oscuros, cabezota con dientes y cola redondeada. */
  tararira: ({ id }) => (
    <>
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f4a2a" />
          <stop offset="0.4" stopColor="#6d7a43" />
          <stop offset="0.72" stopColor="#b5b580" />
          <stop offset="1" stopColor="#e6e2c0" />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          <path d="M129 22 C128 15 121 10.6 110 9.6 C96 8.6 76 10 60 12.6 C50 14.2 42 16.4 34 18.6 L34 26.6 C42 28.6 50 30.6 60 32 C76 34.4 96 35.4 110 34.2 C121 33.2 128.4 28.6 129 22 Z" />
        </clipPath>
      </defs>
      <g className="fish-tail">
        <path
          d="M36 18.4 C29 15 21 13.4 13 13.6 C8.6 16 7 19.4 7 22.6 C7 25.8 8.6 29 13 31.4 C21 31.6 29 30 36 26.6 Z"
          fill="#6b7340"
          stroke="#2c331a"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        <g fill="#2c331a" opacity="0.55">
          <circle cx="16" cy="18" r="1.4" />
          <circle cx="22" cy="23" r="1.6" />
          <circle cx="15" cy="27" r="1.3" />
          <circle cx="27" cy="19" r="1.1" />
        </g>
      </g>
      <g fill="#7b8549" stroke="#2c331a" strokeWidth="0.7" strokeLinejoin="round">
        <path className="fish-dorsal" d="M86 10.4 C84 5 78 2.6 70 3 C67 6 65.6 9 66 12 Z" />
        <path d="M58 31.6 C56.6 35.6 53.4 38.6 49.6 39.6 C48 37.4 47.4 34.4 47.6 31 Z" />
        <path d="M80 33.8 C79 37 77 39 74 40 C73 38 72.6 35.6 73 33.6 Z" />
      </g>
      <path
        d="M129 22 C128 15 121 10.6 110 9.6 C96 8.6 76 10 60 12.6 C50 14.2 42 16.4 34 18.6 L34 26.6 C42 28.6 50 30.6 60 32 C76 34.4 96 35.4 110 34.2 C121 33.2 128.4 28.6 129 22 Z"
        fill={`url(#${id}-b)`}
        stroke="#2c331a"
        strokeWidth="1"
      />
      <g clipPath={`url(#${id}-c)`} fill="#262c16" opacity="0.6">
        <path d="M40 15 C44 18 44 24 40 28 C37 25 37 19 40 15 Z" />
        <path d="M52 13 C57 17 57 25 52 30 C49 26 49 18 52 13 Z" />
        <path d="M66 11 C71 15 71 24 66 30 C63 25 63 17 66 11 Z" />
        <path d="M80 10 C85 14 85 23 80 29 C77 24 77 16 80 10 Z" />
        <path d="M94 10 C98 14 98 21 94 26 C91 22 91 15 94 10 Z" />
      </g>
      <path d="M110 10.4 C104.6 16 104.6 27 111 33.6" stroke="#2c331a" strokeWidth="1" fill="none" />
      <path
        className="fish-pec"
        d="M106 27.6 C101 29.6 96.6 32 93.4 32.6 C96.4 30.4 100.4 28.4 104.6 26.8 Z"
        fill="#8a9354"
        stroke="#2c331a"
        strokeWidth="0.5"
      />
      <path d="M129 23.2 C124 25.6 118 26.6 112 26" stroke="#1d2210" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M127 24 L126.2 25.6 M124.4 25 L123.6 26.6 M121.8 25.6 L121.2 27.2 M119 26 L118.6 27.4" stroke="#fff" strokeWidth="0.7" strokeLinecap="round" />
      <circle cx="120" cy="17.2" r="3" fill="#e9d36a" stroke="#2c331a" strokeWidth="0.7" />
      <circle cx="120.3" cy="17.4" r="1.8" fill="#141708" />
      <circle cx="120.9" cy="16.7" r="0.6" fill="#fff" />
    </>
  ),
};

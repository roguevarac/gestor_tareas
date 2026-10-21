import { useShared } from '../store/shared';
import { countryName } from './Flags';
import type { Country } from '../sharing/types';

/**
 * Cofre de tesoro abandonado (vacío) en el fondo, del lado opuesto al balde,
 * con la banderita de la oficina de quien usa la app.
 */
export function Chest() {
  const country = useShared((s) => (s.status === 'ready' ? (s.me?.country ?? null) : null));
  return (
    <div className="chest-dock" title={country ? `Oficina: ${countryName(country)}` : undefined}>
      <ChestSvg country={country} />
      {country && <span className="chest-label">{countryName(country)}</span>}
    </div>
  );
}

function FlagShapes({ country }: { country: Country }) {
  if (country === 'AR')
    return (
      <>
        <rect width="30" height="20" fill="#74acdf" />
        <rect y="6.67" width="30" height="6.67" fill="#fff" />
        <circle cx="15" cy="10" r="2.3" fill="#f6b40e" stroke="#85340a" strokeWidth="0.35" />
      </>
    );
  if (country === 'CL')
    return (
      <>
        <rect width="30" height="20" fill="#fff" />
        <rect y="10" width="30" height="10" fill="#d52b1e" />
        <rect width="10" height="10" fill="#0039a6" />
        <path
          d="M5 2.2l1.06 3.26h3.43l-2.77 2.02 1.06 3.26L5 8.72l-2.78 2.02 1.06-3.26L.51 5.46h3.43z"
          fill="#fff"
          transform="translate(0 -0.4) scale(1 0.92)"
        />
      </>
    );
  return (
    <>
      <rect width="30" height="20" fill="#fff" />
      {[1, 3, 5, 7].map((i) => (
        <rect key={i} y={(i * 20) / 9} width="30" height={20 / 9} fill="#0038a8" />
      ))}
      <rect width="11" height={(20 / 9) * 5} fill="#fff" />
      <circle cx="5.5" cy="5.55" r="2.6" fill="#fcd116" stroke="#7b3f00" strokeWidth="0.35" />
    </>
  );
}

function ChestSvg({ country }: { country: Country | null }) {
  return (
    <svg className="chest-svg" viewBox="0 0 180 150" aria-hidden="true">
      <defs>
        <linearGradient id="ch-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a6d4a" />
          <stop offset="1" stopColor="#5e4630" />
        </linearGradient>
        <linearGradient id="ch-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a4330" />
          <stop offset="1" stopColor="#3f2f21" />
        </linearGradient>
        <linearGradient id="ch-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4b3826" />
          <stop offset="1" stopColor="#6b5139" />
        </linearGradient>
        <linearGradient id="ch-sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ecdfae" />
          <stop offset="1" stopColor="#cdb882" />
        </linearGradient>
        <linearGradient id="ch-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6f8285" />
          <stop offset="0.5" stopColor="#93a6a8" />
          <stop offset="1" stopColor="#5b6c6f" />
        </linearGradient>
        <radialGradient id="ch-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* luz que baja del agua */}
      <ellipse cx="92" cy="70" rx="70" ry="56" fill="url(#ch-glow)" />

      {/* algas de atrás */}
      <g className="chest-weed chest-weed--back" fill="none" strokeLinecap="round">
        <path d="M150 132 C142 112 156 98 146 80 C140 70 146 60 142 50" stroke="#5f8f7b" strokeWidth="5" />
        <path d="M30 134 C38 114 24 102 32 86" stroke="#6f9b88" strokeWidth="4.5" />
      </g>

      {/* arena de atrás */}
      <path d="M8 136 C24 112 66 110 92 112 C124 110 160 114 174 136 Z" fill="url(#ch-sand)" />

      <g transform="rotate(-5 90 104)">
        {/* tapa abierta, caída hacia atrás */}
        <path d="M52 66 L134 66 L142 30 C120 18 80 18 60 30 Z" fill="url(#ch-lid)" stroke="#2f2318" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M60 30 C80 18 120 18 142 30" fill="none" stroke="#2f2318" strokeWidth="1.2" />
        <path d="M57 48 L138 48" stroke="#3a2b1d" strokeWidth="1" opacity="0.6" />
        <rect x="70" y="24" width="6" height="42" fill="url(#ch-metal)" opacity="0.85" transform="skewX(-8)" />
        <rect x="116" y="24" width="6" height="42" fill="url(#ch-metal)" opacity="0.85" transform="skewX(-8)" />

        {/* boca del cofre: vacío */}
        <path d="M40 76 L52 66 L134 66 L124 76 Z" fill="#241a12" />
        <path d="M44 75 L54 68 L130 68 L122 75 Z" fill="#33261a" />

        {/* costado */}
        <path d="M124 76 L134 66 L134 112 L124 124 Z" fill="url(#ch-side)" stroke="#2f2318" strokeWidth="1.4" strokeLinejoin="round" />

        {/* frente de madera */}
        <rect x="40" y="76" width="84" height="48" rx="2" fill="url(#ch-wood)" stroke="#2f2318" strokeWidth="1.6" />
        <path d="M40 92 H124 M40 108 H124" stroke="#3e2e20" strokeWidth="1.1" opacity="0.7" />
        <path d="M46 84 q8 1 16 -1 M90 100 q10 2 20 -1 M54 116 q8 1 14 -1" stroke="#a1835c" strokeWidth="0.8" fill="none" opacity="0.6" />

        {/* zunchos de metal oxidados */}
        <rect x="47" y="76" width="7" height="48" fill="url(#ch-metal)" stroke="#3d4a4c" strokeWidth="0.8" />
        <rect x="110" y="76" width="7" height="48" fill="url(#ch-metal)" stroke="#3d4a4c" strokeWidth="0.8" />
        <g fill="#2f3a3c">
          <circle cx="50.5" cy="81" r="1" />
          <circle cx="50.5" cy="119" r="1" />
          <circle cx="113.5" cy="81" r="1" />
          <circle cx="113.5" cy="119" r="1" />
        </g>
        <path d="M49 98 q3 4 1 9 M114 90 q-2 5 1 8" stroke="#a0613a" strokeWidth="1.4" fill="none" opacity="0.6" />

        {/* plaquita con la bandera (o la cerradura vacía) */}
        <rect x="68" y="87" width="28" height="20" rx="2.5" fill="#7b8b8d" stroke="#3d4a4c" strokeWidth="1" />
        {country ? (
          <svg x="70" y="89" width="24" height="16" viewBox="0 0 30 20">
            <FlagShapes country={country} />
          </svg>
        ) : (
          <path d="M82 92 a3 3 0 1 1 0.01 0 M81 95 h2 v6 h-2z" fill="#2a3436" />
        )}

        {/* musgo */}
        <g fill="#6f9466" opacity="0.85">
          <ellipse cx="60" cy="122" rx="9" ry="3" />
          <ellipse cx="100" cy="123" rx="7" ry="2.4" />
          <ellipse cx="128" cy="113" rx="3" ry="6" />
        </g>
      </g>

      {/* arena de adelante: el cofre está medio enterrado */}
      <path
        d="M2 150 L2 136 C18 124 44 122 66 126 C84 129 102 128 122 124 C146 120 166 124 178 134 L178 150 Z"
        fill="url(#ch-sand)"
      />
      <g fill="#c3ad75" opacity="0.7">
        <ellipse cx="34" cy="138" rx="5" ry="1.6" />
        <ellipse cx="142" cy="136" rx="6" ry="1.8" />
        <ellipse cx="96" cy="142" rx="4" ry="1.2" />
      </g>
      <g fill="#ddd2b0" stroke="#b9a777" strokeWidth="0.6">
        <path d="M150 140 q4 -6 8 0 z" />
        <circle cx="20" cy="142" r="2.2" />
      </g>

      {/* algas de adelante */}
      <g className="chest-weed" fill="none" strokeLinecap="round">
        <path d="M18 150 C26 130 12 118 22 100 C28 90 22 80 26 70" stroke="#5f9f74" strokeWidth="5" />
        <path d="M28 150 C32 136 26 126 32 114" stroke="#7bb48b" strokeWidth="4" />
        <path d="M164 150 C158 134 170 122 162 106" stroke="#5f9f74" strokeWidth="4.5" />
      </g>

      {/* burbujitas que salen del cofre */}
      <g className="chest-bubbles" fill="rgba(255,255,255,0.35)" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8">
        <circle cx="86" cy="62" r="2.4" />
        <circle cx="94" cy="54" r="1.8" />
        <circle cx="88" cy="44" r="1.4" />
      </g>
    </svg>
  );
}

import { memo, useId } from 'react';

/**
 * Original "pebble" characters: a softly lit ball with a simple face, seeded per player.
 * Echoes the reference's 3D avatars without using any of its artwork.
 */

const BODIES = [
  ['#FFD2B0', '#F29A6B', '#B8603A'], // peach
  ['#FFE9A3', '#F2C64B', '#B88A1C'], // butter
  ['#C8F2D6', '#6FD49A', '#2F8A58'], // mint
  ['#CFE7FF', '#7FB9F0', '#3A74B0'], // sky
  ['#FFD0DA', '#F28BA2', '#B04A63'], // rose
  ['#F1DFC9', '#CDA57E', '#86603B'], // sand
  ['#E3F0C2', '#A9CC67', '#62842A'], // lime
  ['#FFE0C7', '#F5B07A', '#B66C35'], // apricot
];

function rand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

interface AvatarProps {
  seed: number;
  size?: number;
  className?: string;
  /** Decorative by default; seats/rows carry the accessible name. */
  title?: string;
}

export const Avatar = memo(function Avatar({ seed, size = 48, className, title }: AvatarProps) {
  const uid = useId().replace(/:/g, '');
  const r = rand(seed * 2654435761);
  const [light, base, dark] = BODIES[Math.floor(r() * BODIES.length)];
  const eyes = Math.floor(r() * 4);
  const mouth = Math.floor(r() * 4);
  const extra = Math.floor(r() * 5);
  const blush = r() > 0.45;
  const tilt = (r() - 0.5) * 10;
  const ink = '#2A1A14';

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <radialGradient id={`b${uid}`} cx="36%" cy="30%" r="75%">
          <stop offset="0%" stopColor={light} />
          <stop offset="55%" stopColor={base} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
        <radialGradient id={`h${uid}`} cx="34%" cy="24%" r="30%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ears / tuft drawn behind the body */}
      {extra === 1 && (
        <g fill={base}>
          <circle cx="15" cy="15" r="8" />
          <circle cx="49" cy="15" r="8" />
        </g>
      )}
      {extra === 2 && (
        <path d="M26 9c2-6 6-7 6-7s1 4 0 7c3-5 8-5 8-5s-1 5-5 8" fill="none" stroke={dark} strokeWidth="3" strokeLinecap="round" />
      )}

      <g transform={`rotate(${tilt} 32 34)`}>
        <circle cx="32" cy="34" r="27" fill={`url(#b${uid})`} />
        <circle cx="32" cy="34" r="27" fill={`url(#h${uid})`} />

        {/* eyes */}
        {eyes === 0 && (
          <g fill={ink}>
            <circle cx="23" cy="31" r="3.4" />
            <circle cx="41" cy="31" r="3.4" />
            <circle cx="24.2" cy="29.8" r="1.1" fill="#fff" />
            <circle cx="42.2" cy="29.8" r="1.1" fill="#fff" />
          </g>
        )}
        {eyes === 1 && (
          <g fill="none" stroke={ink} strokeWidth="2.8" strokeLinecap="round">
            <path d="M19 32q4-5 8 0" />
            <path d="M37 32q4-5 8 0" />
          </g>
        )}
        {eyes === 2 && (
          <g>
            <ellipse cx="23" cy="30" rx="5" ry="5.6" fill="#fff" />
            <ellipse cx="41" cy="30" rx="5" ry="5.6" fill="#fff" />
            <circle cx="24" cy="31" r="2.6" fill={ink} />
            <circle cx="40" cy="31" r="2.6" fill={ink} />
          </g>
        )}
        {eyes === 3 && (
          <g stroke={ink} strokeWidth="2.8" strokeLinecap="round">
            <path d="M19 31h8" />
            <path d="M37 31h8" />
          </g>
        )}

        {blush && (
          <g fill="#FF7A8A" opacity="0.45">
            <ellipse cx="17" cy="39" rx="4.2" ry="2.6" />
            <ellipse cx="47" cy="39" rx="4.2" ry="2.6" />
          </g>
        )}

        {/* mouth */}
        {mouth === 0 && (
          <path d="M25 41q7 6 14 0" fill="none" stroke={ink} strokeWidth="2.8" strokeLinecap="round" />
        )}
        {mouth === 1 && <path d="M24 40h16q-1 9-8 9t-8-9z" fill={ink} />}
        {mouth === 2 && <ellipse cx="32" cy="43" rx="3.2" ry="3.8" fill={ink} />}
        {mouth === 3 && (
          <g>
            <path d="M24 40h16q-1 8-8 8t-8-8z" fill={ink} />
            <path d="M26 40.2h12v2.4h-12z" fill="#fff" />
          </g>
        )}

        {extra === 3 && (
          <g fill={dark} opacity="0.5">
            <circle cx="20" cy="44" r="1" />
            <circle cx="23" cy="46" r="1" />
            <circle cx="44" cy="44" r="1" />
            <circle cx="41" cy="46" r="1" />
          </g>
        )}
      </g>
      {extra === 4 && (
        <g>
          <path d="M32 7v-4" stroke={dark} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="3.5" r="3" fill="#F7D046" />
        </g>
      )}
    </svg>
  );
});

/** Stable numeric seed for a name (Mode 1 and the tutorial have no server-issued seed). */
export function seedFromName(name: string) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return h >>> 0;
}

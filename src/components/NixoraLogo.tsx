import React from 'react';

interface NixoraLogoProps {
  size?: number;
  className?: string;
}

export const NixoraLogo: React.FC<NixoraLogoProps> = ({ size = 40, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logotipo NixoraAI Helper: amatista con estrella Gemini"
    >
      <defs>
        <linearGradient id="nixora-amethyst-main" x1="32" y1="18" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="45%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
        <linearGradient id="nixora-amethyst-left" x1="12" y1="26" x2="26" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#3B0764" />
        </linearGradient>
        <linearGradient id="nixora-amethyst-right" x1="52" y1="28" x2="38" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9333EA" />
          <stop offset="100%" stopColor="#2E1065" />
        </linearGradient>
        <linearGradient id="nixora-gemini-star" x1="22" y1="3" x2="42" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#C4B5FD" />
        </linearGradient>
      </defs>

      {/* Left secondary crystal */}
      <polygon
        points="11,31 20,25 25,52 15,55"
        fill="url(#nixora-amethyst-left)"
        stroke="#2E1065"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <polygon points="11,31 20,25 18,39" fill="#D8B4FE" fillOpacity="0.35" />

      {/* Right secondary crystal */}
      <polygon
        points="53,33 44,27 39,52 49,55"
        fill="url(#nixora-amethyst-right)"
        stroke="#2E1065"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <polygon points="44,27 53,33 46,41" fill="#C084FC" fillOpacity="0.28" />

      {/* Central main amethyst crystal */}
      <polygon
        points="32,17 43,27 40,56 24,56 21,27"
        fill="url(#nixora-amethyst-main)"
        stroke="#1E1B4B"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Facet highlights on central amethyst */}
      <polygon points="32,17 21,27 32,33" fill="#E9D5FF" fillOpacity="0.48" />
      <polygon points="32,17 43,27 32,33" fill="#A855F7" fillOpacity="0.35" />
      <polygon points="32,33 21,27 24,56 32,56" fill="#7E22CE" fillOpacity="0.45" />
      <polygon points="32,33 43,27 40,56 32,56" fill="#3B0764" fillOpacity="0.55" />

      {/* Base cluster stones */}
      <polygon
        points="18,52 26,47 32,58 21,58"
        fill="#6D28D9"
        stroke="#1E1B4B"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <polygon
        points="46,52 38,47 32,58 43,58"
        fill="#5B21B6"
        stroke="#1E1B4B"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Gemini 4-pointed star resting directly on the head of the amethyst (vertex at y=18) */}
      <path
        d="M32 3 C33.3 9.2 35.8 11.7 42 13 C35.8 14.3 33.3 16.8 32 23 C30.7 16.8 28.2 14.3 22 13 C28.2 11.7 30.7 9.2 32 3 Z"
        fill="url(#nixora-gemini-star)"
        stroke="#78350F"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="13" r="1.8" fill="#FFFFFF" fillOpacity="0.85" />
    </svg>
  );
};

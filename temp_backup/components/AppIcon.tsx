
import React from 'react';

interface AppIconProps {
  className?: string;
  size?: number;
  withBg?: boolean;
}

export const AppIcon: React.FC<AppIconProps> = ({ className = "", size = 40, withBg = true }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="brandGradient" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#86efac" /> {/* Light Green */}
          <stop offset="100%" stopColor="#15803d" /> {/* Dark Green */}
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {withBg && (
        <rect width="100" height="100" rx="24" fill="url(#brandGradient)" />
      )}

      {/* Stylized Tag / Price Label */}
      <path 
        d="M68 28H46C43.5 28 41.1 29 39.3 30.7L24.7 45.3C21.1 48.9 21.1 54.7 24.7 58.3L41.7 75.3C45.3 78.9 51.1 78.9 54.7 75.3L69.3 60.7C71 58.9 72 56.5 72 54V32C72 29.8 70.2 28 68 28Z" 
        fill={withBg ? "white" : "url(#brandGradient)"}
        className="drop-shadow-sm"
      />

      {/* The AI Eye / Lens */}
      <circle 
        cx="58" 
        cy="44" 
        r="7" 
        fill={withBg ? "#15803d" : "white"} 
        fillOpacity={withBg ? "1" : "0.9"} 
      />
      
      {/* Circuit Nodes representing AI */}
      <circle cx="28" cy="72" r="4" fill={withBg ? "white" : "#86efac"} fillOpacity="0.8" />
      <path d="M31 69L38 62" stroke={withBg ? "white" : "#86efac"} strokeWidth="3" strokeLinecap="round" strokeOpacity="0.8" />
      
      <circle cx="75" cy="25" r="4" fill={withBg ? "white" : "#86efac"} fillOpacity="0.8" />
      <path d="M72 28L65 35" stroke={withBg ? "white" : "#86efac"} strokeWidth="3" strokeLinecap="round" strokeOpacity="0.8" />
    </svg>
  );
};

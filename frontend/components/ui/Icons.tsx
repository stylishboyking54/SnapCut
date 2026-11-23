import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

export function ScissorsIcon({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

export function ClockIcon({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function MapPinIcon({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function SearchIcon({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function BellIcon({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function UserIcon({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function CalendarIcon({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function CoffeeIcon({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  );
}

export function AlertTriangleIcon({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function StoreIcon({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function CompassIcon({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

export function SparklesIcon({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

/** Official-style multicolor Google "G" mark */
export function GoogleIcon({ size = 18, style }: Omit<IconProps, 'color'>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={style}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// ==== Social Media Icons ====
export function GithubIcon({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.565 21.796 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function TwitterIcon({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53A4.48 4.48 0 0 0 22.43 1c-.88.52-1.86.9-2.91 1.12a4.5 4.5 0 0 0-7.78 4.09C9.2 6.2 4.42 3.39 1.45 0a4.5 4.5 0 0 0-.61 2.27c0 1.57.8 2.97 2.03 3.78a4.5 4.5 0 0 1-2-.55v.05c0 2.2 1.56 4.02 3.63 4.44-.38.1-.78.16-1.19.16-.29 0-.57-.03-.84-.08a4.5 4.5 0 0 0 4.2 3.14A9 9 0 0 1 1 19.54a12.7 12.7 0 0 0 6.86 2" />
    </svg>
  );
}

export function InstagramIcon({ size = 20, color = 'currentColor', style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 20, style }: Omit<IconProps, 'color'>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        fill="#25D366"
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2Z"
      />
      <path
        fill="#FFFFFF"
        d="M17.5 14.4C17.2 14.25 15.7 13.51 15.42 13.41C15.14 13.31 14.94 13.26 14.74 13.56C14.54 13.86 13.97 14.55 13.8 14.75C13.63 14.95 13.46 14.97 13.16 14.82C12.86 14.67 11.9 14.36 10.77 13.35C9.89 12.56 9.3 11.59 9.13 11.29C8.96 10.99 9.11 10.83 9.26 10.68C9.4 10.54 9.57 10.32 9.72 10.15C9.87 9.98 9.92 9.85 10.02 9.65C10.12 9.45 10.07 9.28 10 9.13C9.93 8.98 9.33 7.5 9.08 6.9C8.84 6.32 8.59 6.4 8.41 6.39L7.84 6.38C7.64 6.38 7.32 6.45 7.05 6.75C6.78 7.05 6.02 7.76 6.02 9.21C6.02 10.66 7.08 12.06 7.23 12.26C7.38 12.46 9.32 15.46 12.29 16.74C13 17.05 13.55 17.23 13.98 17.37C14.7 17.6 15.36 17.57 15.87 17.49C16.44 17.4 17.64 16.76 17.89 16.05C18.14 15.34 18.14 14.74 18.06 14.62C17.98 14.5 17.8 14.45 17.5 14.3"
      />
    </svg>
  );
}

export function InstagramColorIcon({ size = 20, style }: Omit<IconProps, 'color'>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <radialGradient id="igGrad" r="150%" cx="30%" cy="107%">
          <stop stopColor="#fdf497" offset="0%" />
          <stop stopColor="#fdf497" offset="5%" />
          <stop stopColor="#fd5949" offset="45%" />
          <stop stopColor="#d6249f" offset="60%" />
          <stop stopColor="#285AEB" offset="90%" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#igGrad)" />
      <rect x="5.5" y="5.5" width="13" height="13" rx="4" stroke="#ffffff" strokeWidth="1.8" fill="none" />
      <circle cx="12" cy="12" r="3.2" stroke="#ffffff" strokeWidth="1.8" fill="none" />
      <circle cx="15.8" cy="8.2" r="0.9" fill="#ffffff" />
    </svg>
  );
}

export function TikTokColorIcon({ size = 20, style }: Omit<IconProps, 'color'>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <rect width="24" height="24" rx="6" fill="#000000" />
      <path
        d="M16.6 8.2c-1.1-.3-1.9-1.2-2.1-2.2H12v10.5c0 1.4-1.1 2.5-2.5 2.5S7 17.9 7 16.5s1.1-2.5 2.5-2.5c.3 0 .5 0 .8.1V11.5c-.3 0-.5-.1-.8-.1-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5V9.8c1.3.9 2.8 1.4 4.4 1.4V8.7c-.5 0-1-.2-1.5-.5z"
        fill="#25F4EE"
      />
      <path
        d="M17.4 8.7c-.5-.2-1-.7-1.3-1.2-.3-.5-.4-1.1-.4-1.7h-1.8v10.7c0 1.7-1.4 3-3 3-1.7 0-3-1.4-3-3s1.4-3 3-3c.4 0 .7.1 1.1.2V11.1c-.4-.1-.7-.1-1.1-.1-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5V10.3c1.3.9 2.8 1.4 4.4 1.4V9.2c-.7 0-1.4-.2-2-.5z"
        fill="#FE2C55"
      />
      <path
        d="M16.9 8.2c-.8-.3-1.5-.9-1.8-1.7H13v10.5c0 1.4-1.1 2.5-2.5 2.5S8 18.4 8 17s1.1-2.5 2.5-2.5c.3 0 .6.1.8.2V12.1c-.3-.1-.5-.1-.8-.1-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5V9.8c1.3.9 2.8 1.4 4.4 1.4V8.7c-.7 0-1.4-.2-2.2-.5z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function YouTubeColorIcon({ size = 20, style }: Omit<IconProps, 'color'>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        fill="#FF0000"
        d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.7 3.6 12 3.6 12 3.6s-7.7 0-9.5.5c-1 .3-1.7 1.1-2 2.1C0 8 0 12 0 12s0 4 .5 5.8c.3 1 1 1.8 2 2.1 1.8.5 9.5.5 9.5.5s7.7 0 9.5-.5c1-.3 1.7-1.1 2-2.1.5-1.8.5-5.8.5-5.8s0-4-.5-5.8z"
      />
      <polygon points="9.6 15.6 15.8 12 9.6 8.4 9.6 15.6" fill="#FFFFFF" />
    </svg>
  );
}

export function FacebookColorIcon({ size = 20, style }: Omit<IconProps, 'color'>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <circle cx="12" cy="12" r="11" fill="#1877F2" />
      <path
        d="M15.1 12.5h-2.1v6.9h-2.9v-6.9H8.7v-2.5h1.4V8.4c0-1.2.6-3 3-3h2.2v2.5h-1.4c-.3 0-.6.1-.6.6v1.5h2.1l-.3 2.5z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function XColorIcon({ size = 20, style }: Omit<IconProps, 'color'>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <rect width="24" height="24" rx="6" fill="#000000" />
      <path
        d="M17.4 5h2.1l-4.6 5.3 5.4 7.2h-4.3l-3.3-4.4-3.8 4.4H6.8l4.9-5.6L6.5 5h4.4l3 4 3.5-4zm-.7 11.2h1.2L9.8 6.2H8.5l8.2 10z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

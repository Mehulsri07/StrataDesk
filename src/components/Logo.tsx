import { useId } from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = '', size = 32 }: LogoProps) {
  const uid = useId();
  const blueId = `logo-blue-${uid}`;
  const goldId = `logo-gold-${uid}`;

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} fill="none">
      <defs>
        <linearGradient id={blueId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0077B6" />
          <stop offset="100%" stopColor="#00B4D8" />
        </linearGradient>
        <linearGradient id={goldId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
      </defs>
      {/* Strata layers — geological cross-section icon */}
      <rect x="2" y="3"  width="28" height="5"  rx="2" fill={`url(#${goldId})`}  opacity="0.95" />
      <rect x="4" y="10" width="24" height="4.5" rx="2" fill={`url(#${blueId})`} opacity="0.85" />
      <rect x="3" y="17" width="26" height="4.5" rx="2" fill={`url(#${goldId})`} opacity="0.65" />
      <rect x="5" y="24" width="22" height="4"   rx="2" fill={`url(#${blueId})`} opacity="0.5"  />
    </svg>
  );
}

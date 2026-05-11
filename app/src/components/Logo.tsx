interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = '', size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c9933a" />
          <stop offset="100%" stopColor="#d4a853" />
        </linearGradient>
      </defs>
      <rect x="2" y="4" width="28" height="5" rx="1.5" fill="url(#logoGrad)" opacity="0.9" />
      <rect x="4" y="11" width="24" height="5" rx="1.5" fill="#e0bc72" opacity="0.7" />
      <rect x="3" y="18" width="26" height="5" rx="1.5" fill="url(#logoGrad)" opacity="0.6" />
      <rect x="5" y="25" width="22" height="4" rx="1.5" fill="#a09880" opacity="0.5" />
    </svg>
  );
}

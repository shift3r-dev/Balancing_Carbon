import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  hideText?: boolean;
  variant?: 'light' | 'dark';
}

export default function AsymmetricInfinityLogo({
  className = '',
  size = 'md',
  hideText = false,
  variant = 'light'
}: LogoProps) {
  // Proportional height classes for the logo mark.
  const heightClasses = {
    sm: 'h-8 sm:h-9',
    md: 'h-11 sm:h-12',
    lg: 'h-14 sm:h-16'
  };

  // Proportional text sizing mapped by logo size
  const textSizes = {
    sm: {
      main: 'text-[15px] sm:text-[16px] font-bold tracking-wide',
      sub: 'text-[9px] tracking-[0.22em] mt-0.5'
    },
    md: {
      main: 'text-[21px] sm:text-[23px] font-extrabold tracking-wider',
      sub: 'text-[11px] tracking-[0.27em] mt-0.5'
    },
    lg: {
      main: 'text-[28px] sm:text-[32px] font-black tracking-widest',
      sub: 'text-[15px] tracking-[0.32em] mt-1'
    }
  };

  const isDark = variant === 'dark';
  const textColor = isDark ? 'text-white' : 'text-brand-charcoal';
  const subtextColor = isDark ? 'text-brand-sage' : 'text-brand-green-sec';

  const { main: mainFontClass, sub: subFontClass } = textSizes[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Logo Mark Container with Fallback */}
      <div className="flex items-center shrink-0">
        <img
          src="/Balancing.png"
          alt="Balancing Carbon Logo Mark"
          className={`${heightClasses[size]} w-auto object-contain`}
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallbackEl = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallbackEl) fallbackEl.style.display = 'block';
          }}
        />
        
        {/* Vector SVG Fallback (hidden unless Balancing.png fails to load) */}
        <div className="hidden">
          <svg
            width={size === 'sm' ? 58 : size === 'md' ? 82 : 106}
            height={size === 'sm' ? 32 : size === 'md' ? 46 : 58}
            viewBox="0 0 108 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
          >
            <path
              d="M30 45C38.2843 45 45 38.2843 45 30C45 21.7157 38.2843 15 30 15C21.7157 15 15 21.7157 15 30C15 38.2843 21.7157 45 30 45Z"
              fill={isDark ? '#3F7D58' : '#252A27'}
            />
            <path
              d="M24 35H36V32H33V28L30 30V28L27 30V26L24 28V35Z"
              fill="#F7F8F4"
              fillOpacity="0.85"
            />
            <path
              d="M72 50C83.0457 50 92 41.0457 92 30C92 18.9543 83.0457 10 72 10C60.9543 10 52 18.9543 52 30C52 41.0457 60.9543 50 72 50Z"
              fill="#1F5A3D"
            />
            <path
              d="M72 18C70 21 66 24 66 28C66 31 68 33 71 33.8V38H73V33.8C76 33 78 31 78 28C78 24 74 21 72 18ZM72 23C73 25.5 75 27 75 28.5C75 29.5 74 30.5 72 30.5C70 30.5 69 29.5 69 28.5C69 27 71 25.5 72 23Z"
              fill="#DDE8DF"
            />
            <path
              d="M30 15C42 15 48 45 72 45C86 45 86 15 72 15C48 15 42 45 30 45C16 45 16 15 30 15Z"
              stroke="#3F7D58"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-70"
            />
          </svg>
        </div>
      </div>

      {/* Typography text rendered next to the logo mark */}
      {!hideText && (
        <div className="flex flex-col text-left justify-center">
          <span className={`font-sans font-extrabold uppercase leading-none ${textColor} ${mainFontClass}`}>
            Balancing
          </span>
          <span className={`font-mono font-semibold uppercase leading-none ${subtextColor} ${subFontClass}`}>
            Carbon
          </span>
        </div>
      )}
    </div>
  );
}

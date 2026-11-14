import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const duration = 1850;
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (elapsed < duration) {
        rafId = requestAnimationFrame(tick);
      } else {
        setFading(true);
        window.setTimeout(onComplete, 260);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onComplete]);

  return (
    <div
      onClick={() => {
        setFading(true);
        window.setTimeout(onComplete, 180);
      }}
      className={`fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-between p-6 sm:p-10 transition-opacity duration-300 cursor-pointer ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Top quiet indicator */}
      <div className="text-[11px] tracking-widest uppercase text-slate-500 font-semibold">
        Offline Physics Edition
      </div>

      {/* Center Emblem & Title */}
      <div className="flex flex-col items-center text-center max-w-md w-full">
        <svg
          viewBox="0 0 220 110"
          className="w-44 sm:w-52 h-auto mb-3 drop-shadow-[0_10px_28px_rgba(245,158,11,0.28)]"
          role="img"
          aria-label="Apex Climb Emblem"
        >
          <defs>
            <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="55%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
          </defs>
          {/* Mountain peaks */}
          <path
            d="M20 88 L74 22 L106 60 L140 14 L198 88 Z"
            fill="none"
            stroke="url(#splashGrad)"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          {/* Rolling road curve */}
          <path
            d="M12 94 Q75 74 115 90 T208 82"
            fill="none"
            stroke="#F8FAFC"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Stylized 4x4 silhouette riding peak */}
          <g transform="translate(88, 52) rotate(-14)">
            <rect x="-18" y="-10" width="36" height="14" rx="4" fill="#EF4444" />
            <circle cx="-11" cy="7" r="6" fill="#0F172A" stroke="#CBD5E1" strokeWidth="2.5" />
            <circle cx="11" cy="7" r="6" fill="#0F172A" stroke="#CBD5E1" strokeWidth="2.5" />
          </g>
        </svg>

        <h1 className="font-display font-extrabold italic text-5xl sm:text-6xl tracking-wide text-white leading-none">
          APEX <span className="text-amber-400">CLIMB</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 mb-7">
          10 Vehicles · 10 Worlds · 100% Offline Physics Racing
        </p>

        {/* Loading Bar */}
        <div className="w-64 sm:w-72">
          <div className="h-2 w-full bg-slate-900 border border-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-mono-num">
            <span>Loading Tracks &amp; Garage...</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Subtle Developer Credit */}
      <div className="text-center">
        <div className="text-xs text-slate-400 tracking-wide">
          Developer <span className="text-slate-200 font-semibold">Aayan Likhar</span>
        </div>
      </div>
    </div>
  );
};

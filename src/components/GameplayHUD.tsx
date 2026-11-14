import React, { useState } from 'react';
import { Coins, Flag, Flame, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { LiveHudState } from '../types/game';
import { InputControlsRef } from './GameCanvas';

interface GameplayHUDProps {
  hud: LiveHudState;
  totalBankCoins: number;
  soundEnabled: boolean;
  controlLayout: 'right' | 'split';
  inputRef: React.MutableRefObject<InputControlsRef>;
  onPause: () => void;
  onRestart: () => void;
  onToggleSound: () => void;
}

const ADVENTURE_STAGES = [200, 500, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000];

function getAdventureProgress(distance: number): { prev: number; next: number; pct: number; stageIdx: number } {
  let prev = 0;
  for (let i = 0; i < ADVENTURE_STAGES.length; i++) {
    const target = ADVENTURE_STAGES[i];
    if (distance < target) {
      const span = target - prev;
      const pct = Math.max(0, Math.min(100, ((distance - prev) / span) * 100));
      return { prev, next: target, pct, stageIdx: i + 1 };
    }
    prev = target;
  }
  const extraStep = 2500;
  const base = Math.floor((distance - 10000) / extraStep) * extraStep + 10000;
  const next = base + extraStep;
  return {
    prev: base,
    next,
    pct: Math.max(0, Math.min(100, ((distance - base) / extraStep) * 100)),
    stageIdx: ADVENTURE_STAGES.length + 1 + Math.floor((distance - 10000) / extraStep),
  };
}

export const GameplayHUD: React.FC<GameplayHUDProps> = ({
  hud,
  soundEnabled,
  inputRef,
  onPause,
  onRestart,
  onToggleSound,
}) => {
  const [gasHeld, setGasHeld] = useState(false);
  const [brakeHeld, setBrakeHeld] = useState(false);

  const setGas = (down: boolean) => {
    inputRef.current.gas = down;
    setGasHeld(down);
  };

  const setBrake = (down: boolean) => {
    inputRef.current.brake = down;
    setBrakeHeld(down);
  };

  const fuelColor =
    hud.fuelPct < 24 ? 'bg-red-500' : hud.fuelPct < 50 ? 'bg-amber-400' : 'bg-emerald-500';
  const adv = getAdventureProgress(hud.distance);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4">
      {/* Compact Top Perimeter Status Clusters */}
      <div className="flex items-start justify-between gap-2.5">
        {/* Top-Left: Fuel + Adventure Distance Bar + Compact Run Coin */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`bg-slate-900/90 border px-2.5 py-1.5 rounded-lg min-w-[122px] sm:min-w-[144px] ${
              hud.lowFuel ? 'border-red-500' : 'border-white/15'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
              <span className={`flex items-center gap-1 ${hud.lowFuel ? 'text-red-400' : 'text-slate-200'}`}>
                <Flame className="w-3 h-3 text-red-400" />
                {hud.lowFuel ? 'LOW FUEL' : 'FUEL'}
              </span>
              <span className="font-mono-num text-slate-300">{Math.ceil(hud.fuelPct)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-sm overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${fuelColor}`}
                style={{ width: `${Math.max(0, Math.min(100, hud.fuelPct))}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-white/15 px-3 py-1.5 rounded-lg min-w-[168px] sm:min-w-[204px]">
            <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
              <span className="flex items-center gap-1 font-bold text-white font-mono-num">
                <Flag className="w-3 h-3 text-emerald-400" />
                {hud.distance}m
              </span>
              <span className="text-[10px] text-slate-400 font-mono-num">
                Stage {adv.stageIdx} · {adv.next}m
              </span>
            </div>
            <div className="relative w-full h-2 bg-slate-800 rounded-sm overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-sky-400 to-amber-400 transition-all duration-100"
                style={{ width: `${adv.pct}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-white/15 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-mono-num font-bold text-sm text-amber-300 leading-none">
              +{hud.runCoins}
            </span>
          </div>
        </div>

        {/* Top-Right: Mute, Restart, Pause */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={onToggleSound}
            aria-label="Toggle sound"
            className="h-10 w-10 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
          <button
            type="button"
            onClick={onRestart}
            aria-label="Restart race"
            className="h-10 w-10 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onPause}
            aria-label="Pause race"
            className="h-10 px-3 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Pause className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pause</span>
          </button>
        </div>
      </div>

      {/* Live Stunt Banner */}
      {hud.bonusBanner && (
        <div className="self-center mt-1 bg-slate-950/90 border border-amber-400/70 px-3.5 py-1 rounded-lg text-amber-300 font-display font-extrabold text-lg tracking-wide shadow-lg">
          {hud.bonusBanner}
        </div>
      )}

      {/* Split Bottom Controls: Brake (Left) · Speed/RPM Cluster (Center) · Gas (Right) */}
      <div className="flex items-end justify-between gap-4">
        {/* Left Split Pedal: BRAKE */}
        <div className="pointer-events-auto">
          <button
            type="button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setBrake(true);
            }}
            onPointerUp={() => setBrake(false)}
            onPointerCancel={() => setBrake(false)}
            onLostPointerCapture={() => setBrake(false)}
            onContextMenu={(e) => e.preventDefault()}
            style={{ touchAction: 'none' }}
            className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 flex flex-col items-center justify-between py-3 px-2 transition-transform select-none cursor-pointer overflow-hidden ${
              brakeHeld
                ? 'bg-gradient-to-b from-red-700 to-red-900 border-red-300 text-white scale-95 translate-y-1 shadow-inner'
                : 'bg-gradient-to-b from-slate-800/95 to-slate-950/95 border-red-500/80 text-red-100 hover:from-slate-800 shadow-[0_8px_20px_rgba(0,0,0,0.55)]'
            }`}
          >
            {/* Ribbed pedal grip lines */}
            <div className="w-full flex flex-col gap-1.5 px-3 opacity-35">
              <div className="h-1 w-full bg-white rounded-full" />
              <div className="h-1 w-full bg-white rounded-full" />
              <div className="h-1 w-full bg-white rounded-full" />
            </div>
            <div className="text-center">
              <div className="font-display font-extrabold text-xl sm:text-2xl tracking-wider leading-none">
                BRAKE
              </div>
              <div className="text-[10px] font-semibold opacity-75 mt-0.5">REV / TILT</div>
            </div>
          </button>
        </div>

        {/* Center Compact Speed, RPM & Record Strip */}
        <div className="bg-slate-900/90 border border-white/15 px-3.5 py-2 rounded-xl flex flex-col items-center gap-1 min-w-[138px]">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <span className="font-mono-num font-bold text-white text-sm">{hud.speedKmh} km/h</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="font-mono-num text-amber-300">Best {hud.bestDistance}m</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 transition-all duration-75"
              style={{ width: `${Math.min(100, Math.max(8, hud.rpmPct * 100))}%` }}
            />
          </div>
        </div>

        {/* Right Split Pedal: GAS */}
        <div className="pointer-events-auto">
          <button
            type="button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setGas(true);
            }}
            onPointerUp={() => setGas(false)}
            onPointerCancel={() => setGas(false)}
            onLostPointerCapture={() => setGas(false)}
            onContextMenu={(e) => e.preventDefault()}
            style={{ touchAction: 'none' }}
            className={`relative w-24 h-28 sm:w-28 sm:h-32 rounded-2xl border-2 flex flex-col items-center justify-between py-3 px-2 transition-transform select-none cursor-pointer overflow-hidden ${
              gasHeld
                ? 'bg-gradient-to-b from-emerald-600 to-emerald-800 border-emerald-200 text-white scale-95 translate-y-1 shadow-inner'
                : 'bg-gradient-to-b from-slate-800/95 to-slate-950/95 border-emerald-500/85 text-emerald-100 hover:from-slate-800 shadow-[0_8px_20px_rgba(0,0,0,0.55)]'
            }`}
          >
            {/* Ribbed pedal grip lines */}
            <div className="w-full flex flex-col gap-1.5 px-3 opacity-35">
              <div className="h-1 w-full bg-white rounded-full" />
              <div className="h-1 w-full bg-white rounded-full" />
              <div className="h-1 w-full bg-white rounded-full" />
              <div className="h-1 w-full bg-white rounded-full" />
            </div>
            <div className="text-center">
              <div className="font-display font-extrabold text-2xl sm:text-3xl tracking-wider leading-none">
                GAS
              </div>
              <div className="text-[10px] font-semibold opacity-75 mt-0.5">DRIVE / FLIP</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Home, Play, RotateCcw, Wrench } from 'lucide-react';

interface PauseModalProps {
  mapName: string;
  vehicleName: string;
  distance: number;
  onResume: () => void;
  onRestart: () => void;
  onGarage: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  mapName,
  vehicleName,
  distance,
  onResume,
  onRestart,
  onGarage,
  onMainMenu,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-2xl p-6 shadow-2xl">
        <h2 className="font-display font-extrabold text-3xl text-white tracking-wide">RACE PAUSED</h2>
        <p className="text-sm text-slate-300 mt-1 mb-6">
          {vehicleName} <span className="text-slate-500">·</span> {mapName} <span className="text-slate-500">·</span>{' '}
          <span className="font-mono-num text-amber-300">{distance}m</span>
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="h-12 w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            Resume Race
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="h-12 w-full rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Restart Track
          </button>

          <button
            type="button"
            onClick={onGarage}
            className="h-12 w-full rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            Open Garage
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="h-12 w-full rounded-xl bg-slate-950 hover:bg-slate-800 border border-white/10 text-slate-300 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Coins, Home, RotateCcw, Trophy, Wrench } from 'lucide-react';
import { getMapById } from '../data/maps';
import { getVehicleById } from '../data/vehicles';
import { RunSummary } from '../types/game';

interface GameOverModalProps {
  summary: RunSummary;
  onRetry: () => void;
  onGarage: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  summary,
  onRetry,
  onGarage,
  onMainMenu,
}) => {
  const vehicle = getVehicleById(summary.vehicleId);
  const map = getMapById(summary.mapId);
  const reasonLabel =
    summary.reason === 'out_of_fuel' ? 'OUT OF FUEL' : 'DRIVER CRASHED';

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-white/15 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="text-xs font-bold tracking-wider text-rose-400 mb-1">
              {reasonLabel}
            </div>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-wide">
              RUN COMPLETE
            </h2>
            <p className="text-sm text-slate-300 mt-0.5">
              {vehicle.name} <span className="text-slate-500">·</span> {map.name}
            </p>
          </div>

          {summary.isNewRecord && (
            <div className="flex items-center gap-1.5 bg-amber-500 text-slate-950 px-3 py-1.5 rounded-lg font-display font-extrabold text-base tracking-wide shrink-0">
              <Trophy className="w-4 h-4" />
              NEW RECORD
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3">
            <div className="text-xs text-slate-400">Distance</div>
            <div className="font-mono-num font-bold text-2xl text-white mt-0.5">
              {summary.distance}m
            </div>
          </div>
          <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3">
            <div className="text-xs text-slate-400">Best Distance</div>
            <div className="font-mono-num font-bold text-2xl text-amber-300 mt-0.5">
              {Math.max(summary.bestDistanceBefore, summary.distance)}m
            </div>
          </div>
          <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3">
            <div className="text-xs text-slate-400">Flips</div>
            <div className="font-mono-num font-bold text-2xl text-sky-300 mt-0.5">
              {summary.flips}
            </div>
          </div>
          <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3">
            <div className="text-xs text-slate-400">Max Airtime</div>
            <div className="font-mono-num font-bold text-2xl text-emerald-300 mt-0.5">
              {summary.maxAirTime.toFixed(1)}s
            </div>
          </div>
        </div>

        {/* Reward Breakdown */}
        <div className="bg-slate-950/70 border border-white/10 rounded-xl p-4 mb-6 space-y-2 text-sm">
          <div className="flex items-center justify-between text-slate-300">
            <span>Track & Stunt Coins</span>
            <span className="font-mono-num font-semibold text-white">+{summary.coinsCollected.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Distance Bonus ({summary.distance}m)</span>
            <span className="font-mono-num font-semibold text-white">+{summary.distanceBonusCoins.toLocaleString()}</span>
          </div>
          <div className="h-px bg-white/10 my-1" />
          <div className="flex items-center justify-between text-base font-bold">
            <span className="text-white">Total Earned</span>
            <span className="font-mono-num text-amber-400 flex items-center gap-1.5">
              <Coins className="w-4 h-4" />
              +{summary.totalCoinsEarned.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
          <button
            type="button"
            onClick={onGarage}
            className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            Garage
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="h-12 rounded-xl bg-slate-950 hover:bg-slate-800 border border-white/10 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

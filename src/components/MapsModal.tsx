import React from 'react';
import { Check, Coins, Lock, Map as MapIcon, Play, X } from 'lucide-react';
import { MAPS } from '../data/maps';
import { MapId, SaveData } from '../types/game';
import { MapPreviewCanvas } from './MapPreviewCanvas';

interface MapsModalProps {
  save: SaveData;
  onClose: () => void;
  onSelectMap: (id: MapId) => void;
  onUnlockMap: (id: MapId) => void;
  onRaceNow: () => void;
}

export const MapsModal: React.FC<MapsModalProps> = ({
  save,
  onClose,
  onSelectMap,
  onUnlockMap,
  onRaceNow,
}) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/90 p-2 sm:p-4">
      <div className="w-full max-w-6xl h-full max-h-[92vh] bg-slate-900 border border-white/15 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <MapIcon className="w-5 h-5 text-emerald-400" />
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-wide">
              ENVIRONMENTS ({save.unlockedMaps.length}/10)
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 border border-white/10 px-3.5 py-1.5 rounded-lg">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="font-mono-num font-bold text-amber-300 text-base">
                {save.coins.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close maps"
              className="h-10 w-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Map Cards Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scroll p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MAPS.map((m) => {
              const unlocked = save.unlockedMaps.includes(m.id);
              const selected = save.selectedMap === m.id;
              const best = save.bestDistanceByMap[m.id] || 0;
              const canAfford = save.coins >= m.unlockCost;

              return (
                <div
                  key={m.id}
                  className={`rounded-xl border overflow-hidden flex flex-col justify-between transition-colors ${
                    selected
                      ? 'bg-slate-800/90 border-amber-400'
                      : 'bg-slate-950/75 border-white/10'
                  }`}
                >
                  <div>
                    <div className="h-28 w-full relative overflow-hidden border-b border-white/10">
                      <MapPreviewCanvas map={m} />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display font-extrabold text-xl text-white tracking-wide">
                          {m.name}
                        </h3>
                        <span className="font-mono-num text-xs text-amber-300 font-semibold">
                          Best {best}m
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{m.subtitle}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-2.5">
                        <span>Gravity {(m.gravity / 9.8).toFixed(2)}g</span>
                        <span aria-hidden="true">·</span>
                        <span>Grip {Math.round(m.surfaceFriction * 100)}%</span>
                        <span aria-hidden="true">·</span>
                        <span>Coins {Math.round(m.coinDensity * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    {!unlocked ? (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onUnlockMap(m.id)}
                        className={`h-10 w-full rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors ${
                          canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Unlock · {m.unlockCost.toLocaleString()} Coins
                      </button>
                    ) : selected ? (
                      <button
                        type="button"
                        onClick={onRaceNow}
                        className="h-10 w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-slate-950" />
                        Selected · Start Race
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectMap(m.id)}
                        className="h-10 w-full rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Select Track
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

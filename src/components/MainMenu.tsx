import React, { useEffect } from 'react';
import {
  Award,
  Calendar,
  Coins,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Play,
  Settings,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { MapDef, MenuModal, SaveData, VehicleDef } from '../types/game';

interface MainMenuProps {
  save: SaveData;
  selectedVehicle: VehicleDef;
  selectedMap: MapDef;
  claimableMissions: number;
  dailyAvailable: boolean;
  isFullscreen: boolean;
  onStartRace: () => void;
  onOpenModal: (modal: MenuModal) => void;
  onToggleSound: () => void;
  onToggleFullscreen: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  save,
  selectedVehicle,
  selectedMap,
  claimableMissions,
  dailyAvailable,
  isFullscreen,
  onStartRace,
  onOpenModal,
  onToggleSound,
  onToggleFullscreen,
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartRace();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStartRace]);

  const bestOnMap = save.bestDistanceByMap[selectedMap.id] || 0;

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6 md:p-8 pointer-events-none">
      {/* Soft top & left atmospheric scrim so text always meets high contrast over any sky */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/45 to-slate-950/20 pointer-events-none" />

      {/* Top Row: Coins, Progress Summary & Quick Audio/Fullscreen Controls */}
      <div className="relative z-10 flex items-center justify-between gap-4 pointer-events-auto">
        <div className="flex items-center gap-4 text-sm text-slate-200">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-white/10 px-3.5 py-2 rounded-lg">
            <Coins className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-mono-num font-bold text-amber-300 text-base">
              {save.coins.toLocaleString()}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2.5 text-xs md:text-sm text-slate-300 bg-slate-900/80 border border-white/10 px-3.5 py-2 rounded-lg">
            <span className="font-semibold text-white">{save.unlockedVehicles.length}/10 Vehicles</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="font-semibold text-white">{save.unlockedMaps.length}/10 Maps</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="font-mono-num text-slate-300">Total {save.stats.totalDistance.toLocaleString()}m</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={save.settings.soundEnabled ? 'Mute sound' : 'Enable sound'}
            className="h-11 w-11 flex items-center justify-center rounded-lg bg-slate-900/90 border border-white/10 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {save.settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
          </button>
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="h-11 w-11 flex items-center justify-center rounded-lg bg-slate-900/90 border border-white/10 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={() => onOpenModal('SETTINGS')}
            aria-label="Open settings"
            className="h-11 w-11 flex items-center justify-center rounded-lg bg-slate-900/90 border border-white/10 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Middle-Left Hero Lockup & Primary Start CTA */}
      <div className="relative z-10 max-w-xl my-auto pointer-events-auto">
        {/* Bespoke inline SVG Title Lockup */}
        <div className="mb-3">
          <svg
            viewBox="0 0 460 112"
            className="w-64 sm:w-80 md:w-96 h-auto drop-shadow-[0_6px_20px_rgba(0,0,0,0.65)]"
            role="img"
            aria-label="Apex Climb"
          >
            <defs>
              <linearGradient id="apexTitleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="55%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#EA580C" />
              </linearGradient>
            </defs>
            {/* Mountain crest emblem */}
            <path
              d="M12 78 L46 24 L68 54 L90 16 L124 78 Z"
              fill="none"
              stroke="url(#apexTitleGrad)"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path d="M40 78 L90 78" stroke="#F8FAFC" strokeWidth="4" strokeLinecap="round" />
            <text
              x="140"
              y="62"
              fill="#FFFFFF"
              fontFamily="'Barlow Condensed', sans-serif"
              fontWeight="800"
              fontStyle="italic"
              fontSize="58"
              letterSpacing="1"
            >
              APEX
            </text>
            <text
              x="142"
              y="100"
              fill="url(#apexTitleGrad)"
              fontFamily="'Barlow Condensed', sans-serif"
              fontWeight="800"
              fontStyle="italic"
              fontSize="42"
              letterSpacing="3"
            >
              CLIMB
            </text>
          </svg>
        </div>

        {/* Clean Unboxed Active Loadout Line */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200 mb-5">
          <span className="font-semibold text-white">{selectedVehicle.name}</span>
          <span aria-hidden="true" className="text-slate-400">·</span>
          <span className="font-semibold text-amber-300">{selectedMap.name}</span>
          <span aria-hidden="true" className="text-slate-400">·</span>
          <span className="font-mono-num text-slate-300">Record {bestOnMap}m</span>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            type="button"
            onClick={onStartRace}
            className="h-14 px-8 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-display font-extrabold text-2xl tracking-wide flex items-center gap-3 shadow-lg shadow-amber-500/25 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Play className="w-6 h-6 fill-slate-950" />
            START RACE
          </button>
        </div>

        {/* Single flat control-hint line */}
        <p className="text-xs sm:text-sm text-slate-300 tracking-wide">
          A / D or Arrow Keys · Hold Touch Pedals to Drive · Esc Pause
        </p>
      </div>

      {/* Bottom Action Bar: Garage, Maps, Missions, Daily Rewards */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onOpenModal('GARAGE')}
            className="h-12 px-4 sm:px-5 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-white/15 text-white font-semibold text-sm flex items-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Garage</span>
            <span className="text-slate-400 font-normal hidden sm:inline">· {selectedVehicle.name}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('MAPS')}
            className="h-12 px-4 sm:px-5 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-white/15 text-white font-semibold text-sm flex items-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <MapIcon className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Maps</span>
            <span className="text-slate-400 font-normal hidden sm:inline">· {selectedMap.name}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('MISSIONS')}
            className="relative h-12 px-4 sm:px-5 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-white/15 text-white font-semibold text-sm flex items-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Award className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Missions</span>
            {claimableMissions > 0 && (
              <span className="font-mono-num text-xs font-bold bg-sky-500 text-slate-950 px-1.5 py-0.5 rounded">
                {claimableMissions}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('DAILY')}
            className="relative h-12 px-4 sm:px-5 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-white/15 text-white font-semibold text-sm flex items-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Daily Reward</span>
            {dailyAvailable && (
              <span className="text-xs font-bold bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded">
                CLAIM
              </span>
            )}
          </button>
        </div>

        <div className="text-[11px] text-slate-300/80 bg-slate-950/60 border border-white/10 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0">
          Developer · <span className="text-white font-semibold">Aayan Likhar</span>
        </div>
      </div>
    </div>
  );
};

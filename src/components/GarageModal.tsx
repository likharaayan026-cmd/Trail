import React, { useState } from 'react';
import { Check, Coins, Lock, Play, Wrench, X } from 'lucide-react';
import {
  computeEffectiveStats,
  getUpgradeCost,
  UPGRADE_META,
  VEHICLES,
} from '../data/vehicles';
import { SaveData, UpgradeKey, VehicleId } from '../types/game';
import { VehiclePreviewCanvas } from './VehiclePreviewCanvas';

interface GarageModalProps {
  save: SaveData;
  onClose: () => void;
  onSelectVehicle: (id: VehicleId) => void;
  onUnlockVehicle: (id: VehicleId) => void;
  onUpgradeVehicle: (id: VehicleId, key: UpgradeKey) => void;
  onRaceNow: () => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  save,
  onClose,
  onSelectVehicle,
  onUnlockVehicle,
  onUpgradeVehicle,
  onRaceNow,
}) => {
  const [viewedId, setViewedId] = useState<VehicleId>(save.selectedVehicle);

  const vehicle = VEHICLES.find((v) => v.id === viewedId) || VEHICLES[0];
  const isUnlocked = save.unlockedVehicles.includes(vehicle.id);
  const isSelected = save.selectedVehicle === vehicle.id;
  const upgrades = save.vehicleUpgrades[vehicle.id];
  const stats = computeEffectiveStats(vehicle, upgrades);
  const canAffordVehicle = save.coins >= vehicle.unlockCost;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/90 p-2 sm:p-4">
      <div className="w-full max-w-6xl h-full max-h-[94vh] bg-slate-900 border border-white/15 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <Wrench className="w-5 h-5 text-amber-400" />
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-wide">
              VEHICLE GARAGE
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
              aria-label="Close garage"
              className="h-10 w-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Split Layout (fits landscape nicely) */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: 10-Vehicle Roster */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto custom-scroll p-3 space-y-2 max-h-44 lg:max-h-none">
            {VEHICLES.map((v) => {
              const unlocked = save.unlockedVehicles.includes(v.id);
              const selected = save.selectedVehicle === v.id;
              const viewing = viewedId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setViewedId(v.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                    viewing
                      ? 'bg-slate-800 border-amber-400/80 text-white'
                      : 'bg-slate-950/60 border-white/5 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-white truncate">{v.name}</div>
                    <div className="text-xs text-slate-400 truncate">
                      {v.category} <span aria-hidden="true">·</span>{' '}
                      {unlocked ? (selected ? 'Equipped' : 'Unlocked') : `${v.unlockCost.toLocaleString()} coins`}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {!unlocked ? (
                      <Lock className="w-4 h-4 text-slate-500" />
                    ) : selected ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Live Vehicle Preview + 8 Upgrades */}
          <div className="lg:col-span-8 flex flex-col min-h-0 overflow-y-auto custom-scroll p-4 sm:p-5 gap-4">
            {/* Showcase Card */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-950/80 border border-white/10 rounded-xl p-4">
              <div className="md:col-span-5 h-36 sm:h-44 rounded-lg bg-slate-900 border border-white/5 overflow-hidden">
                <VehiclePreviewCanvas
                  vehicle={vehicle}
                  wheelRadius={stats.wheelRadius}
                  wheelBase={stats.wheelBase}
                />
              </div>

              <div className="md:col-span-7 flex flex-col justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-amber-400">{vehicle.category}</div>
                  <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-wide">
                    {vehicle.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">{vehicle.description}</p>
                </div>

                {/* Live Performance Readouts */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <StatBar label="Top Speed" pct={Math.min(100, (stats.maxSpeed / 820) * 100)} value={`${Math.round(stats.maxSpeed / 7.5)} km/h`} />
                  <StatBar label="Torque" pct={Math.min(100, (stats.enginePower / 2100) * 100)} value={`${Math.round(stats.enginePower)} Nm`} />
                  <StatBar label="AWD / Grip" pct={Math.min(100, ((stats.awdRatio + stats.gripFactor * 0.5) / 1.7) * 100)} value={`${Math.round(stats.awdRatio * 100)}% AWD`} />
                  <StatBar label="Fuel Endurance" pct={Math.min(100, (stats.fuelCapacity / 75) * 100)} value={`${Math.round(stats.fuelCapacity)}s`} />
                </div>

                {/* Unlock / Equip / Race Actions */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {!isUnlocked ? (
                    <button
                      type="button"
                      disabled={!canAffordVehicle}
                      onClick={() => onUnlockVehicle(vehicle.id)}
                      className={`h-11 px-5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                        canAffordVehicle
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      Unlock for {vehicle.unlockCost.toLocaleString()} Coins
                    </button>
                  ) : (
                    <>
                      {!isSelected && (
                        <button
                          type="button"
                          onClick={() => onSelectVehicle(vehicle.id)}
                          className="h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Check className="w-4 h-4" />
                          Select Vehicle
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (!isSelected) onSelectVehicle(vehicle.id);
                          onRaceNow();
                        }}
                        className="h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Play className="w-4 h-4 fill-slate-950" />
                        {isSelected ? 'Race with Vehicle' : 'Equip & Race'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 8 Functional Upgrade Categories */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="font-display font-bold text-lg text-white tracking-wide">
                  PERFORMANCE UPGRADES
                </h4>
                <span className="text-xs text-slate-400">
                  {isUnlocked ? 'Upgrades directly tune vehicle physics' : 'Unlock vehicle to install upgrades'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                {UPGRADE_META.map((u) => {
                  const level = upgrades[u.key];
                  const isMax = level >= vehicle.maxUpgradeLevel;
                  const cost = isMax ? 0 : getUpgradeCost(vehicle, u.key, level);
                  const canUpgrade = isUnlocked && !isMax && save.coins >= cost;

                  return (
                    <div
                      key={u.key}
                      className="bg-slate-950/70 border border-white/10 rounded-xl p-3 flex flex-col justify-between gap-2.5"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-white">{u.label}</span>
                          <span className="font-mono-num text-xs font-bold text-amber-300">
                            Lv {level}/{vehicle.maxUpgradeLevel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{u.shortDesc}</p>

                        {/* Level segment bars */}
                        <div className="grid grid-cols-8 gap-1 mt-2">
                          {Array.from({ length: vehicle.maxUpgradeLevel }).map((_, idx) => (
                            <div
                              key={idx}
                              className={`h-1.5 rounded-sm ${
                                idx < level ? 'bg-amber-400' : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canUpgrade}
                        onClick={() => onUpgradeVehicle(vehicle.id, u.key)}
                        className={`h-9 w-full rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                          isMax
                            ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 cursor-default'
                            : canUpgrade
                            ? 'bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white border border-white/10 cursor-pointer'
                            : 'bg-slate-900 text-slate-500 border border-white/5 cursor-not-allowed'
                        }`}
                      >
                        {isMax ? (
                          'MAXED'
                        ) : (
                          <>
                            <Coins className="w-3.5 h-3.5 text-amber-400" />
                            <span>{cost.toLocaleString()}</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatBar: React.FC<{ label: string; pct: number; value: string }> = ({ label, pct, value }) => (
  <div>
    <div className="flex items-center justify-between text-[11px] mb-1">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono-num text-slate-200 font-semibold">{value}</span>
    </div>
    <div className="h-1.5 w-full bg-slate-800 rounded-sm overflow-hidden">
      <div className="h-full bg-sky-400 rounded-sm" style={{ width: `${Math.max(8, Math.min(100, pct))}%` }} />
    </div>
  </div>
);

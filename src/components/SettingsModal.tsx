import React, { useState } from 'react';
import { Maximize2, Music, Settings, Sparkles, Trash2, Volume2, X } from 'lucide-react';
import { GameSettings } from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  isFullscreen: boolean;
  onUpdateSettings: (next: Partial<GameSettings>) => void;
  onToggleFullscreen: () => void;
  onResetSave: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isFullscreen,
  onUpdateSettings,
  onToggleFullscreen,
  onResetSave,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/90 p-3 sm:p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-slate-300" />
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-wide">
              SETTINGS
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="h-10 w-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Sound Effects */}
          <ToggleRow
            icon={<Volume2 className="w-4 h-4 text-amber-400" />}
            label="Sound Effects"
            description="Engine roar, coins, fuel, suspension & crash FX"
            enabled={settings.soundEnabled}
            onToggle={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
          />

          {/* Background Music */}
          <ToggleRow
            icon={<Music className="w-4 h-4 text-sky-400" />}
            label="Background Music"
            description="Synthesized driving soundtrack"
            enabled={settings.musicEnabled}
            onToggle={() => onUpdateSettings({ musicEnabled: !settings.musicEnabled })}
          />

          {/* Particles */}
          <ToggleRow
            icon={<Sparkles className="w-4 h-4 text-emerald-400" />}
            label="Particle Effects"
            description="Tire dust, exhaust smoke, sparks & weather"
            enabled={settings.particlesEnabled}
            onToggle={() => onUpdateSettings({ particlesEnabled: !settings.particlesEnabled })}
          />

          {/* Fullscreen */}
          <ToggleRow
            icon={<Maximize2 className="w-4 h-4 text-slate-300" />}
            label="Immersive Fullscreen"
            description="Hide browser chrome for maximum playfield"
            enabled={isFullscreen}
            onToggle={onToggleFullscreen}
          />

          {/* App & Package Info */}
          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-3.5 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-white">Apex Climb</div>
              <div className="text-xs text-slate-400">
                Package <span className="font-mono-num text-slate-300">com.apex.climbing</span> · Split Pedals Active
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-400 shrink-0">Offline Ready</span>
          </div>

          {/* Local Save Reset */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-white">Local Save Storage</div>
              <div className="text-xs text-slate-400">Progress is stored offline on this device</div>
            </div>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="h-10 px-4 rounded-lg bg-red-950/70 hover:bg-red-900 border border-red-500/30 text-red-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Save
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="h-9 px-3 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetSave();
                    setConfirmReset(false);
                  }}
                  className="h-9 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                >
                  Confirm Wipe
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ToggleRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}> = ({ icon, label, description, enabled, onToggle }) => (
  <div className="bg-slate-950/70 border border-white/10 rounded-xl p-3.5 flex items-center justify-between gap-4">
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-slate-400">{description}</div>
      </div>
    </div>
    <button
      type="button"
      onClick={onToggle}
      className={`h-9 px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
        enabled
          ? 'bg-emerald-500 text-slate-950'
          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
    >
      {enabled ? 'ON' : 'OFF'}
    </button>
  </div>
);

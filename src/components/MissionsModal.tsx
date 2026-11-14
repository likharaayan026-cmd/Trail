import React, { useState } from 'react';
import { Award, CheckCircle2, Coins, X } from 'lucide-react';
import { ACHIEVEMENTS, MISSIONS } from '../data/missions';
import { getAchievementProgress, getMissionProgress } from '../storage/saveSystem';
import { SaveData } from '../types/game';

interface MissionsModalProps {
  save: SaveData;
  onClose: () => void;
  onClaimMission: (id: string, reward: number) => void;
  onClaimAchievement: (id: string, reward: number) => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  save,
  onClose,
  onClaimMission,
  onClaimAchievement,
}) => {
  const [tab, setTab] = useState<'missions' | 'achievements'>('missions');

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/90 p-3 sm:p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-white/15 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <Award className="w-5 h-5 text-sky-400" />
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-wide">
              MISSIONS & ACHIEVEMENTS
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close missions"
            className="h-10 w-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="px-5 pt-4 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setTab('missions')}
            className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              tab === 'missions'
                ? 'bg-sky-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Missions ({save.claimedMissions.length}/{MISSIONS.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('achievements')}
            className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              tab === 'achievements'
                ? 'bg-sky-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Achievements ({save.claimedAchievements.length}/{ACHIEVEMENTS.length})
          </button>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scroll p-5 space-y-3">
          {tab === 'missions'
            ? MISSIONS.map((m) => {
                const progress = getMissionProgress(save, m.id);
                const claimed = save.claimedMissions.includes(m.id);
                const ready = !claimed && progress >= m.target;
                const pct = Math.min(100, (progress / m.target) * 100);
                const displayProg = m.type === 'airtime_single' ? progress.toFixed(1) : Math.floor(progress);

                return (
                  <div
                    key={m.id}
                    className="bg-slate-950/75 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-base text-white">{m.title}</h3>
                        <span className="font-mono-num text-xs text-slate-300">
                          {displayProg} / {m.target}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
                      <div className="h-2 w-full bg-slate-800 rounded-sm overflow-hidden mt-2.5">
                        <div
                          className={`h-full ${claimed || ready ? 'bg-emerald-400' : 'bg-sky-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="shrink-0">
                      {claimed ? (
                        <div className="h-10 px-4 rounded-lg bg-slate-900 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Claimed
                        </div>
                      ) : ready ? (
                        <button
                          type="button"
                          onClick={() => onClaimMission(m.id, m.rewardCoins)}
                          className="h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Coins className="w-4 h-4" />
                          Claim +{m.rewardCoins}
                        </button>
                      ) : (
                        <div className="h-10 px-4 rounded-lg bg-slate-900 border border-white/10 text-slate-400 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap">
                          <Coins className="w-3.5 h-3.5 text-amber-400" />
                          +{m.rewardCoins}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            : ACHIEVEMENTS.map((a) => {
                const progress = getAchievementProgress(save, a.id);
                const claimed = save.claimedAchievements.includes(a.id);
                const ready = !claimed && progress >= a.target;
                const pct = Math.min(100, (progress / a.target) * 100);

                return (
                  <div
                    key={a.id}
                    className="bg-slate-950/75 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-base text-white">{a.title}</h3>
                        <span className="font-mono-num text-xs text-slate-300">
                          {Math.floor(progress)} / {a.target}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{a.description}</p>
                      <div className="h-2 w-full bg-slate-800 rounded-sm overflow-hidden mt-2.5">
                        <div
                          className={`h-full ${claimed || ready ? 'bg-emerald-400' : 'bg-amber-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="shrink-0">
                      {claimed ? (
                        <div className="h-10 px-4 rounded-lg bg-slate-900 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Unlocked
                        </div>
                      ) : ready ? (
                        <button
                          type="button"
                          onClick={() => onClaimAchievement(a.id, a.rewardCoins)}
                          className="h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Coins className="w-4 h-4" />
                          Claim +{a.rewardCoins}
                        </button>
                      ) : (
                        <div className="h-10 px-4 rounded-lg bg-slate-900 border border-white/10 text-slate-400 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap">
                          <Coins className="w-3.5 h-3.5 text-amber-400" />
                          +{a.rewardCoins}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Calendar, Check, Coins, X } from 'lucide-react';
import { DAILY_REWARDS } from '../data/missions';
import { canClaimDailyReward } from '../storage/saveSystem';
import { SaveData } from '../types/game';

interface DailyRewardsModalProps {
  save: SaveData;
  onClose: () => void;
  onClaimDaily: () => void;
}

export const DailyRewardsModal: React.FC<DailyRewardsModalProps> = ({
  save,
  onClose,
  onClaimDaily,
}) => {
  const claimable = canClaimDailyReward(save);
  const currentDayIdx = save.dailyRewards.streakDay % DAILY_REWARDS.length;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/90 p-3 sm:p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-rose-400" />
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-wide">
              7-DAY OFFLINE REWARDS
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close daily rewards"
            className="h-10 w-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-slate-300 mb-5">
            Managed using your device clock — no internet connection required. Come back each day to climb toward the 2,000-coin jackpot.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-6">
            {DAILY_REWARDS.map((item, idx) => {
              const isPast = idx < currentDayIdx;
              const isToday = idx === currentDayIdx;

              return (
                <div
                  key={item.day}
                  className={`rounded-xl border p-3 flex flex-col items-center justify-between text-center gap-2 ${
                    isToday && claimable
                      ? 'bg-amber-500/15 border-amber-400 text-white'
                      : isPast
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-950/70 border-white/10 text-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold tracking-wider text-slate-400">
                    DAY {item.day}
                  </div>
                  <Coins className={`w-6 h-6 ${isPast ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <div className="font-mono-num font-bold text-base text-white">
                    {item.coins.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-semibold">
                    {isPast ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Check className="w-3.5 h-3.5" /> Claimed
                      </span>
                    ) : isToday ? (
                      <span className={claimable ? 'text-amber-300' : 'text-emerald-400'}>
                        {claimable ? 'Ready!' : 'Claimed Today'}
                      </span>
                    ) : (
                      <span className="text-slate-500">Locked</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3">
            {claimable ? (
              <button
                type="button"
                onClick={onClaimDaily}
                className="h-12 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Coins className="w-4 h-4" />
                Claim Day {DAILY_REWARDS[currentDayIdx].day} (+{DAILY_REWARDS[currentDayIdx].coins.toLocaleString()} Coins)
              </button>
            ) : (
              <div className="text-sm text-emerald-400 font-semibold">
                Today&apos;s reward has been claimed. Return tomorrow for Day {((currentDayIdx) % 7) + 1}!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

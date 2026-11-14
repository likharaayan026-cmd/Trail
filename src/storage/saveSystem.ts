import { MAPS } from '../data/maps';
import { ACHIEVEMENTS, DAILY_REWARDS, MISSIONS } from '../data/missions';
import { createDefaultUpgrades, VEHICLES } from '../data/vehicles';
import { MapId, SaveData, UpgradeLevels, VehicleId } from '../types/game';

const SAVE_KEY = 'apex_climb_offline_save_v1';

export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createInitialSave(): SaveData {
  const vehicleUpgrades = {} as Record<VehicleId, UpgradeLevels>;
  for (const v of VEHICLES) {
    vehicleUpgrades[v.id] = createDefaultUpgrades();
  }

  const bestDistanceByMap = {} as Record<MapId, number>;
  for (const m of MAPS) {
    bestDistanceByMap[m.id] = 0;
  }

  return {
    version: 1,
    coins: 250,
    selectedVehicle: 'jeep',
    unlockedVehicles: ['jeep'],
    vehicleUpgrades,
    selectedMap: 'countryside',
    unlockedMaps: ['countryside'],
    bestDistanceByMap,
    stats: {
      totalDistance: 0,
      totalCoinsEarned: 250,
      totalFlips: 0,
      totalFuelCollected: 0,
      totalRuns: 0,
      totalUpgradesBought: 0,
      bestAirTime: 0,
    },
    claimedMissions: [],
    claimedAchievements: [],
    dailyRewards: {
      lastClaimDate: null,
      streakDay: 0,
    },
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      particlesEnabled: true,
      controlLayout: 'split',
    },
  };
}

export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const base = createInitialSave();

    const mergedUpgrades = { ...base.vehicleUpgrades };
    if (parsed.vehicleUpgrades) {
      for (const v of VEHICLES) {
        if (parsed.vehicleUpgrades[v.id]) {
          mergedUpgrades[v.id] = {
            ...createDefaultUpgrades(),
            ...parsed.vehicleUpgrades[v.id],
          };
        }
      }
    }

    const mergedBest = { ...base.bestDistanceByMap, ...(parsed.bestDistanceByMap || {}) };

    return {
      ...base,
      ...parsed,
      vehicleUpgrades: mergedUpgrades,
      bestDistanceByMap: mergedBest,
      stats: { ...base.stats, ...(parsed.stats || {}) },
      dailyRewards: { ...base.dailyRewards, ...(parsed.dailyRewards || {}) },
      settings: { ...base.settings, ...(parsed.settings || {}), controlLayout: 'split' },
      unlockedVehicles: Array.isArray(parsed.unlockedVehicles) && parsed.unlockedVehicles.length > 0
        ? parsed.unlockedVehicles
        : ['jeep'],
      unlockedMaps: Array.isArray(parsed.unlockedMaps) && parsed.unlockedMaps.length > 0
        ? parsed.unlockedMaps
        : ['countryside'],
      claimedMissions: Array.isArray(parsed.claimedMissions) ? parsed.claimedMissions : [],
      claimedAchievements: Array.isArray(parsed.claimedAchievements) ? parsed.claimedAchievements : [],
    };
  } catch {
    return createInitialSave();
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function resetSaveData(): SaveData {
  const fresh = createInitialSave();
  persistSaveData(fresh);
  return fresh;
}

export function canClaimDailyReward(save: SaveData): boolean {
  const today = getLocalDateString();
  return save.dailyRewards.lastClaimDate !== today;
}

export function getMissionProgress(save: SaveData, missionId: string): number {
  const m = MISSIONS.find((x) => x.id === missionId);
  if (!m) return 0;
  const maxBest = Math.max(0, ...Object.values(save.bestDistanceByMap));
  switch (m.type) {
    case 'distance_single':
      return maxBest;
    case 'distance_total':
      return save.stats.totalDistance;
    case 'coins_total':
      return save.stats.totalCoinsEarned;
    case 'flips_total':
      return save.stats.totalFlips;
    case 'fuel_total':
      return save.stats.totalFuelCollected;
    case 'airtime_single':
      return save.stats.bestAirTime;
  }
}

export function getAchievementProgress(save: SaveData, achId: string): number {
  const a = ACHIEVEMENTS.find((x) => x.id === achId);
  if (!a) return 0;
  const maxBest = Math.max(0, ...Object.values(save.bestDistanceByMap));
  switch (a.metric) {
    case 'best_distance':
      return maxBest;
    case 'total_coins':
      return save.stats.totalCoinsEarned;
    case 'total_flips':
      return save.stats.totalFlips;
    case 'vehicles_unlocked':
      return save.unlockedVehicles.length;
    case 'maps_unlocked':
      return save.unlockedMaps.length;
    case 'upgrades_bought':
      return save.stats.totalUpgradesBought;
  }
}

export function countClaimableRewards(save: SaveData): { missions: number; daily: number } {
  let missions = 0;
  for (const m of MISSIONS) {
    if (!save.claimedMissions.includes(m.id) && getMissionProgress(save, m.id) >= m.target) {
      missions++;
    }
  }
  for (const a of ACHIEVEMENTS) {
    if (!save.claimedAchievements.includes(a.id) && getAchievementProgress(save, a.id) >= a.target) {
      missions++;
    }
  }
  const daily = canClaimDailyReward(save) ? 1 : 0;
  return { missions, daily };
}

export function claimDailyRewardInSave(save: SaveData): { nextSave: SaveData; rewardCoins: number } {
  const today = getLocalDateString();
  if (save.dailyRewards.lastClaimDate === today) {
    return { nextSave: save, rewardCoins: 0 };
  }
  const dayIdx = save.dailyRewards.streakDay % DAILY_REWARDS.length;
  const reward = DAILY_REWARDS[dayIdx].coins;
  const nextStreak = (dayIdx + 1) % DAILY_REWARDS.length;

  const nextSave: SaveData = {
    ...save,
    coins: save.coins + reward,
    stats: {
      ...save.stats,
      totalCoinsEarned: save.stats.totalCoinsEarned + reward,
    },
    dailyRewards: {
      lastClaimDate: today,
      streakDay: nextStreak,
    },
  };
  persistSaveData(nextSave);
  return { nextSave, rewardCoins: reward };
}

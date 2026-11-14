export type GameScreen = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type MenuModal = 'NONE' | 'GARAGE' | 'MAPS' | 'MISSIONS' | 'DAILY' | 'SETTINGS';

export type VehicleId =
  | 'jeep'
  | 'dirt_bike'
  | 'monster_truck'
  | 'sports_car'
  | 'pickup_truck'
  | 'racing_buggy'
  | 'heavy_truck'
  | 'super_offroad'
  | 'snow_vehicle'
  | 'futuristic_rover';

export type MapId =
  | 'countryside'
  | 'desert'
  | 'arctic'
  | 'forest'
  | 'mountain'
  | 'volcano'
  | 'moon'
  | 'city'
  | 'jungle'
  | 'industrial';

export type UpgradeKey =
  | 'engine'
  | 'tires'
  | 'suspension'
  | 'awd'
  | 'fuel'
  | 'grip'
  | 'brakes'
  | 'aero';

export type UpgradeLevels = Record<UpgradeKey, number>;

export interface VehicleStats {
  enginePower: number;
  maxSpeed: number;
  mass: number;
  wheelRadius: number;
  wheelBase: number;
  suspensionStiffness: number;
  suspensionDamping: number;
  suspensionTravel: number;
  awdRatio: number; // 0 = pure rear-wheel drive, 1 = equal 50/50 AWD
  fuelCapacity: number; // seconds of full-throttle endurance equivalent
  gripFactor: number;
  brakeForce: number;
  airControl: number;
  aeroDrag: number;
  rollCageProtection: number; // 0..1 (reduces crash sensitivity on mild rollovers)
}

export interface VehicleDef {
  id: VehicleId;
  name: string;
  category: string;
  description: string;
  unlockCost: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  chassisLength: number;
  chassisHeight: number;
  driverOffsetX: number;
  driverOffsetY: number;
  baseStats: VehicleStats;
  maxUpgradeLevel: number;
  baseUpgradeCost: number;
}

export interface MapDef {
  id: MapId;
  name: string;
  subtitle: string;
  unlockCost: number;
  gravity: number; // m/s^2 equivalent in game units (Earth ~ 9.8 scale)
  surfaceFriction: number;
  roughness: number; // terrain amplitude & steepness multiplier
  fuelSpacing: number; // meters between fuel cans
  coinDensity: number;
  skyTop: string;
  skyBottom: string;
  sunColor: string;
  farHillColor: string;
  midHillColor: string;
  surfaceColor: string;
  subSoilColor: string;
  accentPropColor: string;
  ambientParticle: 'none' | 'dust' | 'snow' | 'leaves' | 'embers' | 'stars' | 'rain' | 'sparks';
  hasWaterOrLava?: 'water' | 'lava' | 'mud' | 'ice';
}

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  type: 'distance_total' | 'distance_single' | 'coins_total' | 'flips_total' | 'fuel_total' | 'airtime_single';
  target: number;
  rewardCoins: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  metric: 'best_distance' | 'total_coins' | 'total_flips' | 'vehicles_unlocked' | 'maps_unlocked' | 'upgrades_bought';
  target: number;
  rewardCoins: number;
}

export interface DailyRewardDay {
  day: number;
  coins: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  particlesEnabled: boolean;
  controlLayout: 'right' | 'split';
}

export interface SaveData {
  version: number;
  coins: number;
  selectedVehicle: VehicleId;
  unlockedVehicles: VehicleId[];
  vehicleUpgrades: Record<VehicleId, UpgradeLevels>;
  selectedMap: MapId;
  unlockedMaps: MapId[];
  bestDistanceByMap: Record<MapId, number>;
  stats: {
    totalDistance: number;
    totalCoinsEarned: number;
    totalFlips: number;
    totalFuelCollected: number;
    totalRuns: number;
    totalUpgradesBought: number;
    bestAirTime: number;
  };
  claimedMissions: string[];
  claimedAchievements: string[];
  dailyRewards: {
    lastClaimDate: string | null; // YYYY-MM-DD local device date
    streakDay: number; // 0..6 (next day index to claim, cycles 0..6)
  };
  settings: GameSettings;
}

export interface LiveHudState {
  distance: number;
  bestDistance: number;
  runCoins: number;
  fuelPct: number;
  speedKmh: number;
  flips: number;
  airTime: number;
  rpmPct: number;
  lowFuel: boolean;
  bonusBanner: string | null;
}

export interface RunSummary {
  reason: 'crashed' | 'out_of_fuel' | 'retired';
  mapId: MapId;
  vehicleId: VehicleId;
  distance: number;
  bestDistanceBefore: number;
  isNewRecord: boolean;
  coinsCollected: number;
  distanceBonusCoins: number;
  flipBonusCoins: number;
  totalCoinsEarned: number;
  flips: number;
  maxAirTime: number;
  fuelCollected: number;
}

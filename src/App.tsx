import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { DailyRewardsModal } from './components/DailyRewardsModal';
import { GameCanvas, InputControlsRef } from './components/GameCanvas';
import { GameOverModal } from './components/GameOverModal';
import { GameplayHUD } from './components/GameplayHUD';
import { GarageModal } from './components/GarageModal';
import { MainMenu } from './components/MainMenu';
import { MapsModal } from './components/MapsModal';
import { MissionsModal } from './components/MissionsModal';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';
import { SplashScreen } from './components/SplashScreen';
import { getMapById } from './data/maps';
import { computeEffectiveStats, getUpgradeCost, getVehicleById } from './data/vehicles';
import {
  claimDailyRewardInSave,
  countClaimableRewards,
  loadSaveData,
  persistSaveData,
  resetSaveData,
} from './storage/saveSystem';
import {
  GameScreen,
  GameSettings,
  LiveHudState,
  MapId,
  MenuModal,
  RunSummary,
  SaveData,
  UpgradeKey,
  VehicleId,
} from './types/game';

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const [screen, setScreen] = useState<GameScreen>('MENU');
  const [modal, setModal] = useState<MenuModal>('NONE');
  const [runKey, setRunKey] = useState<number>(1);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [dismissPortraitHint, setDismissPortraitHint] = useState<boolean>(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);

  const inputRef = useRef<InputControlsRef>({ gas: false, brake: false });

  const [hud, setHud] = useState<LiveHudState>({
    distance: 0,
    bestDistance: 0,
    runCoins: 0,
    fuelPct: 100,
    speedKmh: 0,
    flips: 0,
    airTime: 0,
    rpmPct: 0.15,
    lowFuel: false,
    bonusBanner: null,
  });

  const selectedVehicle = useMemo(() => getVehicleById(save.selectedVehicle), [save.selectedVehicle]);
  const selectedMap = useMemo(() => getMapById(save.selectedMap), [save.selectedMap]);
  const effectiveStats = useMemo(
    () => computeEffectiveStats(selectedVehicle, save.vehicleUpgrades[selectedVehicle.id]),
    [selectedVehicle, save.vehicleUpgrades]
  );

  const { missions: claimableMissions, daily: dailyBadge } = useMemo(
    () => countClaimableRewards(save),
    [save]
  );

  // Sync sound engine settings
  useEffect(() => {
    soundEngine.setSettings(save.settings.soundEnabled, save.settings.musicEnabled);
    if (screen === 'PLAYING' && save.settings.musicEnabled) {
      soundEngine.startMusic();
    } else {
      soundEngine.stopMusic();
    }
  }, [save.settings.soundEnabled, save.settings.musicEnabled, screen]);

  // Track orientation & fullscreen state
  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth && window.innerWidth < 768);
    };
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, []);

  const updateSave = useCallback((updater: (prev: SaveData) => SaveData) => {
    setSave((prev) => {
      const next = updater(prev);
      persistSaveData(next);
      return next;
    });
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const startRace = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick();
    inputRef.current.gas = false;
    inputRef.current.brake = false;
    setModal('NONE');
    setRunSummary(null);
    setRunKey((k) => k + 1);
    setScreen('PLAYING');
    if (save.settings.soundEnabled) {
      soundEngine.startEngine();
    }
    if (save.settings.musicEnabled) {
      soundEngine.startMusic();
    }
  }, [save.settings.soundEnabled, save.settings.musicEnabled]);

  const handleRestart = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick();
    inputRef.current.gas = false;
    inputRef.current.brake = false;
    setRunSummary(null);
    setRunKey((k) => k + 1);
    setScreen('PLAYING');
  }, []);

  const handleTogglePause = useCallback(() => {
    soundEngine.playClick();
    inputRef.current.gas = false;
    inputRef.current.brake = false;
    setScreen((prev) => (prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev));
  }, []);

  const handleRunEnd = useCallback(
    (summary: RunSummary) => {
      inputRef.current.gas = false;
      inputRef.current.brake = false;
      setRunSummary(summary);
      setScreen('GAME_OVER');

      updateSave((prev) => {
        const prevBest = prev.bestDistanceByMap[summary.mapId] || 0;
        const nextBest = Math.max(prevBest, summary.distance);
        return {
          ...prev,
          coins: prev.coins + summary.totalCoinsEarned,
          bestDistanceByMap: {
            ...prev.bestDistanceByMap,
            [summary.mapId]: nextBest,
          },
          stats: {
            ...prev.stats,
            totalDistance: prev.stats.totalDistance + summary.distance,
            totalCoinsEarned: prev.stats.totalCoinsEarned + summary.totalCoinsEarned,
            totalFlips: prev.stats.totalFlips + summary.flips,
            totalFuelCollected: prev.stats.totalFuelCollected + summary.fuelCollected,
            totalRuns: prev.stats.totalRuns + 1,
            bestAirTime: Math.max(prev.stats.bestAirTime, summary.maxAirTime),
          },
        };
      });
    },
    [updateSave]
  );

  const handleSelectVehicle = useCallback(
    (id: VehicleId) => {
      soundEngine.unlock();
      soundEngine.playClick();
      updateSave((prev) => ({ ...prev, selectedVehicle: id }));
    },
    [updateSave]
  );

  const handleUnlockVehicle = useCallback(
    (id: VehicleId) => {
      soundEngine.unlock();
      const v = getVehicleById(id);
      updateSave((prev) => {
        if (prev.unlockedVehicles.includes(id) || prev.coins < v.unlockCost) return prev;
        soundEngine.playUpgrade();
        return {
          ...prev,
          coins: prev.coins - v.unlockCost,
          unlockedVehicles: [...prev.unlockedVehicles, id],
          selectedVehicle: id,
        };
      });
    },
    [updateSave]
  );

  const handleUpgradeVehicle = useCallback(
    (id: VehicleId, key: UpgradeKey) => {
      soundEngine.unlock();
      const v = getVehicleById(id);
      updateSave((prev) => {
        if (!prev.unlockedVehicles.includes(id)) return prev;
        const curLevel = prev.vehicleUpgrades[id][key];
        if (curLevel >= v.maxUpgradeLevel) return prev;
        const cost = getUpgradeCost(v, key, curLevel);
        if (prev.coins < cost) return prev;

        soundEngine.playUpgrade();
        return {
          ...prev,
          coins: prev.coins - cost,
          vehicleUpgrades: {
            ...prev.vehicleUpgrades,
            [id]: {
              ...prev.vehicleUpgrades[id],
              [key]: curLevel + 1,
            },
          },
          stats: {
            ...prev.stats,
            totalUpgradesBought: prev.stats.totalUpgradesBought + 1,
          },
        };
      });
    },
    [updateSave]
  );

  const handleSelectMap = useCallback(
    (id: MapId) => {
      soundEngine.unlock();
      soundEngine.playClick();
      updateSave((prev) => ({ ...prev, selectedMap: id }));
    },
    [updateSave]
  );

  const handleUnlockMap = useCallback(
    (id: MapId) => {
      soundEngine.unlock();
      const m = getMapById(id);
      updateSave((prev) => {
        if (prev.unlockedMaps.includes(id) || prev.coins < m.unlockCost) return prev;
        soundEngine.playUpgrade();
        return {
          ...prev,
          coins: prev.coins - m.unlockCost,
          unlockedMaps: [...prev.unlockedMaps, id],
          selectedMap: id,
        };
      });
    },
    [updateSave]
  );

  const handleClaimMission = useCallback(
    (id: string, reward: number) => {
      soundEngine.unlock();
      soundEngine.playCoin(100);
      updateSave((prev) => {
        if (prev.claimedMissions.includes(id)) return prev;
        return {
          ...prev,
          coins: prev.coins + reward,
          claimedMissions: [...prev.claimedMissions, id],
          stats: {
            ...prev.stats,
            totalCoinsEarned: prev.stats.totalCoinsEarned + reward,
          },
        };
      });
    },
    [updateSave]
  );

  const handleClaimAchievement = useCallback(
    (id: string, reward: number) => {
      soundEngine.unlock();
      soundEngine.playFlip();
      updateSave((prev) => {
        if (prev.claimedAchievements.includes(id)) return prev;
        return {
          ...prev,
          coins: prev.coins + reward,
          claimedAchievements: [...prev.claimedAchievements, id],
          stats: {
            ...prev.stats,
            totalCoinsEarned: prev.stats.totalCoinsEarned + reward,
          },
        };
      });
    },
    [updateSave]
  );

  const handleClaimDaily = useCallback(() => {
    soundEngine.unlock();
    setSave((prev) => {
      const { nextSave, rewardCoins } = claimDailyRewardInSave(prev);
      if (rewardCoins > 0) {
        soundEngine.playFlip();
      }
      return nextSave;
    });
  }, []);

  const handleUpdateSettings = useCallback(
    (patch: Partial<GameSettings>) => {
      soundEngine.unlock();
      soundEngine.playClick();
      updateSave((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
      }));
    },
    [updateSave]
  );

  const handleResetSave = useCallback(() => {
    soundEngine.playClick();
    const fresh = resetSaveData();
    setSave(fresh);
    setModal('NONE');
    setScreen('MENU');
    setRunKey((k) => k + 1);
  }, []);

  const handleOpenModal = useCallback((nextModal: MenuModal) => {
    soundEngine.unlock();
    soundEngine.playClick();
    setModal(nextModal);
  }, []);

  const bestForSelectedMap = save.bestDistanceByMap[selectedMap.id] || 0;

  return (
    <main className="relative w-screen h-[100dvh] overflow-hidden bg-slate-950">
      {/* Isolated 60fps Canvas World */}
      <GameCanvas
        screen={screen}
        runKey={runKey}
        vehicle={selectedVehicle}
        stats={effectiveStats}
        map={selectedMap}
        bestDistance={bestForSelectedMap}
        particlesEnabled={save.settings.particlesEnabled}
        inputRef={inputRef}
        onHudUpdate={setHud}
        onRunEnd={handleRunEnd}
        onTogglePause={handleTogglePause}
        onRestart={handleRestart}
      />

      {/* Main Menu Overlay */}
      {screen === 'MENU' && modal === 'NONE' && (
        <MainMenu
          save={save}
          selectedVehicle={selectedVehicle}
          selectedMap={selectedMap}
          claimableMissions={claimableMissions}
          dailyAvailable={dailyBadge > 0}
          isFullscreen={isFullscreen}
          onStartRace={startRace}
          onOpenModal={handleOpenModal}
          onToggleSound={() => handleUpdateSettings({ soundEnabled: !save.settings.soundEnabled })}
          onToggleFullscreen={handleToggleFullscreen}
        />
      )}

      {/* Active Gameplay HUD */}
      {screen === 'PLAYING' && modal === 'NONE' && (
        <GameplayHUD
          hud={hud}
          totalBankCoins={save.coins}
          soundEnabled={save.settings.soundEnabled}
          controlLayout={save.settings.controlLayout}
          inputRef={inputRef}
          onPause={handleTogglePause}
          onRestart={handleRestart}
          onToggleSound={() => handleUpdateSettings({ soundEnabled: !save.settings.soundEnabled })}
        />
      )}

      {/* Pause Modal */}
      {screen === 'PAUSED' && modal === 'NONE' && (
        <PauseModal
          mapName={selectedMap.name}
          vehicleName={selectedVehicle.name}
          distance={hud.distance}
          onResume={handleTogglePause}
          onRestart={handleRestart}
          onGarage={() => {
            soundEngine.playClick();
            setScreen('MENU');
            setModal('GARAGE');
          }}
          onMainMenu={() => {
            soundEngine.playClick();
            soundEngine.stopEngine();
            setScreen('MENU');
            setRunKey((k) => k + 1);
          }}
        />
      )}

      {/* Game Over Modal */}
      {screen === 'GAME_OVER' && runSummary && modal === 'NONE' && (
        <GameOverModal
          summary={runSummary}
          onRetry={handleRestart}
          onGarage={() => {
            soundEngine.playClick();
            setScreen('MENU');
            setModal('GARAGE');
          }}
          onMainMenu={() => {
            soundEngine.playClick();
            setScreen('MENU');
            setRunKey((k) => k + 1);
          }}
        />
      )}

      {/* Management Modals */}
      {modal === 'GARAGE' && (
        <GarageModal
          save={save}
          onClose={() => {
            soundEngine.playClick();
            setModal('NONE');
          }}
          onSelectVehicle={handleSelectVehicle}
          onUnlockVehicle={handleUnlockVehicle}
          onUpgradeVehicle={handleUpgradeVehicle}
          onRaceNow={startRace}
        />
      )}

      {modal === 'MAPS' && (
        <MapsModal
          save={save}
          onClose={() => {
            soundEngine.playClick();
            setModal('NONE');
          }}
          onSelectMap={handleSelectMap}
          onUnlockMap={handleUnlockMap}
          onRaceNow={startRace}
        />
      )}

      {modal === 'MISSIONS' && (
        <MissionsModal
          save={save}
          onClose={() => {
            soundEngine.playClick();
            setModal('NONE');
          }}
          onClaimMission={handleClaimMission}
          onClaimAchievement={handleClaimAchievement}
        />
      )}

      {modal === 'DAILY' && (
        <DailyRewardsModal
          save={save}
          onClose={() => {
            soundEngine.playClick();
            setModal('NONE');
          }}
          onClaimDaily={handleClaimDaily}
        />
      )}

      {modal === 'SETTINGS' && (
        <SettingsModal
          settings={save.settings}
          isFullscreen={isFullscreen}
          onUpdateSettings={handleUpdateSettings}
          onToggleFullscreen={handleToggleFullscreen}
          onResetSave={handleResetSave}
          onClose={() => {
            soundEngine.playClick();
            setModal('NONE');
          }}
        />
      )}

      {/* Landscape orientation tip on narrow portrait mobile screens */}
      {isPortrait && !dismissPortraitHint && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center">
          <RotateCw className="w-12 h-12 text-amber-400 mb-4" />
          <h2 className="font-display font-extrabold text-3xl text-white tracking-wide mb-2">
            ROTATE FOR LANDSCAPE RACING
          </h2>
          <p className="text-sm text-slate-300 max-w-xs mb-6">
            Apex Climb is tuned for wide landscape viewing so you can spot upcoming hills, ramps, and fuel cans.
          </p>
          <button
            type="button"
            onClick={() => setDismissPortraitHint(true)}
            className="h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
          >
            Continue Anyway
          </button>
        </div>
      )}
      {/* Initial Splash Screen */}
      {showSplash && (
        <SplashScreen
          onComplete={() => {
            soundEngine.unlock();
            setShowSplash(false);
          }}
        />
      )}
    </main>
  );
}

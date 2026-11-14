import React, { useEffect, useRef } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { createVehicleSim, stepVehiclePhysics, VehicleSim } from '../engine/physics';
import { CameraState, renderGameWorld } from '../engine/renderer';
import { createTerrain, extendTerrain, recycleTerrainBehind, TerrainState } from '../engine/terrain';
import { GameScreen, LiveHudState, MapDef, RunSummary, VehicleDef, VehicleStats } from '../types/game';

export interface InputControlsRef {
  gas: boolean;
  brake: boolean;
}

interface GameCanvasProps {
  screen: GameScreen;
  runKey: number;
  vehicle: VehicleDef;
  stats: VehicleStats;
  map: MapDef;
  bestDistance: number;
  particlesEnabled: boolean;
  inputRef: React.MutableRefObject<InputControlsRef>;
  onHudUpdate: (hud: LiveHudState) => void;
  onRunEnd: (summary: RunSummary) => void;
  onTogglePause: () => void;
  onRestart: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  screen,
  runKey,
  vehicle,
  stats,
  map,
  bestDistance,
  particlesEnabled,
  inputRef,
  onHudUpdate,
  onRunEnd,
  onTogglePause,
  onRestart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenRef = useRef<GameScreen>(screen);
  screenRef.current = screen;

  const particlesRef = useRef(particlesEnabled);
  particlesRef.current = particlesEnabled;

  const bestRef = useRef(bestDistance);
  bestRef.current = bestDistance;

  const callbacksRef = useRef({ onHudUpdate, onRunEnd, onTogglePause, onRestart });
  callbacksRef.current = { onHudUpdate, onRunEnd, onTogglePause, onRestart };

  const simRef = useRef<VehicleSim | null>(null);
  const terrainRef = useRef<TerrainState | null>(null);
  const camRef = useRef<CameraState>({ x: 120, y: -40, zoom: 1.0 });
  const runEndedRef = useRef(false);
  const lowFuelBeepCooldownRef = useRef(0);

  // Initialize / reset world whenever runKey, vehicle, or map changes
  useEffect(() => {
    const seedOffset = screenRef.current === 'MENU' ? 3 : runKey * 17;
    const terrain = createTerrain(map, seedOffset);
    const sim = createVehicleSim(vehicle, stats, map);
    terrainRef.current = terrain;
    simRef.current = sim;
    camRef.current = { x: sim.x + 80, y: sim.y - 25, zoom: 1.0 };
    runEndedRef.current = false;
    lowFuelBeepCooldownRef.current = 0;

    callbacksRef.current.onHudUpdate({
      distance: 0,
      bestDistance: bestRef.current,
      runCoins: 0,
      fuelPct: 100,
      speedKmh: 0,
      flips: 0,
      airTime: 0,
      rpmPct: 0.15,
      lowFuel: false,
      bonusBanner: null,
    });
  }, [runKey, vehicle, stats, map]);

  // Keyboard bindings & window blur cleanup
  useEffect(() => {
    const keysHeld = {
      right: false,
      left: false,
    };

    const syncInput = () => {
      inputRef.current.gas = keysHeld.right;
      inputRef.current.brake = keysHeld.left;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        keysHeld.right = true;
        syncInput();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'ArrowDown') {
        keysHeld.left = true;
        syncInput();
      } else if (!e.repeat && (e.code === 'Escape' || e.code === 'KeyP')) {
        if (screenRef.current === 'PLAYING' || screenRef.current === 'PAUSED') {
          callbacksRef.current.onTogglePause();
        }
      } else if (!e.repeat && e.code === 'KeyR') {
        if (screenRef.current === 'PLAYING' || screenRef.current === 'PAUSED' || screenRef.current === 'GAME_OVER') {
          callbacksRef.current.onRestart();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        keysHeld.right = false;
        syncInput();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'ArrowDown') {
        keysHeld.left = false;
        syncInput();
      }
    };

    const clearAll = () => {
      keysHeld.right = false;
      keysHeld.left = false;
      inputRef.current.gas = false;
      inputRef.current.brake = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearAll);
    document.addEventListener('visibilitychange', clearAll);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearAll);
      document.removeEventListener('visibilitychange', clearAll);
    };
  }, [inputRef]);

  // Main 60fps Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId = 0;
    let lastTime = performance.now();
    let hudTimer = 0;
    let crashDelayTimer = 0;

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const sim = simRef.current;
      const terrain = terrainRef.current;

      if (sim && terrain) {
        const currentScreen = screenRef.current;
        const isDemo = currentScreen === 'MENU';
        const isPlaying = currentScreen === 'PLAYING';

        if (isDemo || isPlaying) {
          // Extend terrain ahead & recycle far behind
          extendTerrain(terrain, sim.x + 2600);
          recycleTerrainBehind(terrain, sim.x - 1600);

          const gasPressed = isDemo ? true : inputRef.current.gas;
          const brakePressed = isDemo ? false : inputRef.current.brake;

          const events = stepVehiclePhysics(
            sim,
            terrain,
            gasPressed,
            brakePressed,
            dt,
            particlesRef.current,
            isDemo
          );

          // Audio feedback only in active gameplay
          if (isPlaying) {
            soundEngine.updateEngine(sim.rpmPct, gasPressed && sim.fuel > 0, brakePressed && sim.fuel > 0, !sim.crashed);

            if (events.coinsCollected > 0) soundEngine.playCoin(events.coinsCollected);
            if (events.fuelCollected > 0) soundEngine.playFuel();
            if (events.flipsCompleted > 0) soundEngine.playFlip();
            if (events.jumped) soundEngine.playJump();
            if (events.heavyLandingImpact > 0.25) soundEngine.playLanding(events.heavyLandingImpact);
            if (events.brakingSkid && Math.random() < 0.25) soundEngine.playBrakeScreech();

            if (events.crashed) {
              soundEngine.playCrash();
              soundEngine.updateEngine(0, false, false, false);
            }

            const fuelPct = (sim.fuel / sim.maxFuel) * 100;
            if (fuelPct > 0 && fuelPct < 24) {
              lowFuelBeepCooldownRef.current -= dt;
              if (lowFuelBeepCooldownRef.current <= 0) {
                soundEngine.playLowFuelBeep();
                lowFuelBeepCooldownRef.current = 0.85;
              }
            }

            if ((sim.crashed || events.outOfFuel) && !runEndedRef.current) {
              if (sim.crashed) {
                crashDelayTimer += dt;
                if (crashDelayTimer >= 0.72) {
                  runEndedRef.current = true;
                  const distBonus = Math.floor(sim.distanceMeters * 0.25);
                  const flipBonus = sim.flips * 60;
                  callbacksRef.current.onRunEnd({
                    reason: 'crashed',
                    mapId: terrain.map.id,
                    vehicleId: sim.vehicle.id,
                    distance: sim.distanceMeters,
                    bestDistanceBefore: bestRef.current,
                    isNewRecord: sim.distanceMeters > bestRef.current,
                    coinsCollected: sim.runCoins,
                    distanceBonusCoins: distBonus,
                    flipBonusCoins: flipBonus,
                    totalCoinsEarned: sim.runCoins + distBonus,
                    flips: sim.flips,
                    maxAirTime: sim.maxAirTime,
                    fuelCollected: sim.fuelCollectedCount,
                  });
                }
              } else if (events.outOfFuel) {
                runEndedRef.current = true;
                soundEngine.updateEngine(0, false, false, false);
                const distBonus = Math.floor(sim.distanceMeters * 0.25);
                const flipBonus = sim.flips * 60;
                callbacksRef.current.onRunEnd({
                  reason: 'out_of_fuel',
                  mapId: terrain.map.id,
                  vehicleId: sim.vehicle.id,
                  distance: sim.distanceMeters,
                  bestDistanceBefore: bestRef.current,
                  isNewRecord: sim.distanceMeters > bestRef.current,
                  coinsCollected: sim.runCoins,
                  distanceBonusCoins: distBonus,
                  flipBonusCoins: flipBonus,
                  totalCoinsEarned: sim.runCoins + distBonus,
                  flips: sim.flips,
                  maxAirTime: sim.maxAirTime,
                  fuelCollected: sim.fuelCollectedCount,
                });
              }
            }
          } else {
            soundEngine.updateEngine(0, false, false, false);
          }

          // Smooth camera tracking with speed look-ahead & subtle zoom out at high speed
          const speed = Math.hypot(sim.vx, sim.vy);
          const targetCamX = sim.x + Math.min(180, sim.vx * 0.25);
          const targetCamY = sim.y - 25 + Math.min(45, sim.vy * 0.08);
          const targetZoom = Math.max(0.76, 1.0 - Math.min(0.2, speed / 2600));

          camRef.current.x += (targetCamX - camRef.current.x) * Math.min(1, dt * 7);
          camRef.current.y += (targetCamY - camRef.current.y) * Math.min(1, dt * 6);
          camRef.current.zoom += (targetZoom - camRef.current.zoom) * Math.min(1, dt * 3);

          // Throttled HUD updates (~15Hz) so React UI stays crisp with zero loop overhead
          if (isPlaying) {
            hudTimer += dt;
            if (hudTimer >= 0.065) {
              hudTimer = 0;
              const fuelPct = Math.max(0, Math.min(100, (sim.fuel / sim.maxFuel) * 100));
              callbacksRef.current.onHudUpdate({
                distance: sim.distanceMeters,
                bestDistance: Math.max(bestRef.current, sim.distanceMeters),
                runCoins: sim.runCoins,
                fuelPct,
                speedKmh: Math.round((Math.abs(sim.vx) / 28) * 3.6),
                flips: sim.flips,
                airTime: sim.airTime,
                rpmPct: sim.rpmPct,
                lowFuel: fuelPct > 0 && fuelPct < 24,
                bonusBanner: sim.bonusBanner,
              });
            }
          }
        } else {
          soundEngine.updateEngine(0, false, false, false);
        }

        // Render frame
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const w = Math.floor(rect.width * dpr);
          const h = Math.floor(rect.height * dpr);
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.save();
            ctx.scale(dpr, dpr);
            renderGameWorld(
              ctx,
              rect.width,
              rect.height,
              sim,
              terrain,
              camRef.current,
              bestRef.current,
              now / 1000
            );
            ctx.restore();
          }
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      soundEngine.updateEngine(0, false, false, false);
    };
  }, [inputRef]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-slate-950">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

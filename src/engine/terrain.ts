import { MapDef } from '../types/game';

export const PIXELS_PER_METER = 28;
export const NODE_STEP = 28; // finer spline resolution for crisp ramps, moguls & obstacles

export interface CollectibleCoin {
  id: number;
  x: number;
  y: number;
  value: number;
  collected: boolean;
  bobPhase: number;
}

export interface FuelCan {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}

export interface TerrainBridge {
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  style: 'wood' | 'steel' | 'log';
}

export interface RoadBump {
  x: number;
  y: number;
  radius: number;
  kind: 'log' | 'rock' | 'speedbump' | 'iceblock';
}

export interface TerrainDecor {
  x: number;
  y: number;
  kind:
    | 'tree'
    | 'pine'
    | 'cactus'
    | 'rock'
    | 'sign'
    | 'windmill'
    | 'lamp'
    | 'ruin'
    | 'crater'
    | 'stack'
    | 'crystal'
    | 'barrel'
    | 'bush'
    | 'fence';
  scale: number;
  flip: boolean;
}

export interface SurfaceZone {
  xStart: number;
  xEnd: number;
  type: 'ice' | 'mud' | 'sand';
}

export interface StrataPebble {
  x: number;
  depth: number;
  r: number;
  shade: number;
}

export interface TerrainState {
  map: MapDef;
  seed: number;
  nodes: { x: number; y: number }[];
  firstX: number;
  lastGeneratedX: number;
  nextFuelX: number;
  nextCoinX: number;
  nextFeatureX: number;
  nextId: number;
  coins: CollectibleCoin[];
  fuels: FuelCan[];
  bridges: TerrainBridge[];
  bumps: RoadBump[];
  decors: TerrainDecor[];
  zones: SurfaceZone[];
  pebbles: StrataPebble[];
  activeRamp: { x0: number; x1: number; peakLift: number; type: 'kicker' | 'moguls' | 'climb' } | null;
}

function hash1D(n: number, seed: number): number {
  const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function smoothNoise(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash1D(i, seed);
  const b = hash1D(i + 1, seed);
  return (a * (1 - u) + b * u) * 2 - 1;
}

export function createTerrain(map: MapDef, seedOffset = 0): TerrainState {
  const mapHash = map.id.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7);
  const state: TerrainState = {
    map,
    seed: mapHash + seedOffset,
    nodes: [],
    firstX: -640,
    lastGeneratedX: -640,
    nextFuelX: map.fuelSpacing * PIXELS_PER_METER * 0.78,
    nextCoinX: 460,
    nextFeatureX: 680,
    nextId: 1,
    coins: [],
    fuels: [],
    bridges: [],
    bumps: [],
    decors: [],
    zones: [],
    pebbles: [],
    activeRamp: null,
  };

  extendTerrain(state, 3600);
  return state;
}

function computeBaseTerrainY(x: number, map: MapDef, seed: number): number {
  if (x <= 260) {
    if (x < -180) {
      return -Math.min(280, (-180 - x) * 0.7);
    }
    return 0;
  }

  const dx = x - 260;
  const meters = dx / PIXELS_PER_METER;
  const rampIn = Math.min(1, dx / 280);
  // Balanced progressive challenge: noticeably tougher hills as distance grows, without becoming impossible
  const difficulty = Math.min(2.25, 1.08 + meters / 1150);
  const r = map.roughness * difficulty;

  const n1 = smoothNoise(dx * 0.002, seed) * 128 * r;
  const n2 = smoothNoise(dx * 0.0052, seed + 19) * 58 * r;
  const n3 = smoothNoise(dx * 0.013, seed + 47) * 20 * Math.min(1.5, r);
  const macro = Math.sin(dx * 0.00062 + seed) * 90 * Math.min(1.6, difficulty);

  return rampIn * (n1 + n2 + n3 + macro);
}

export function extendTerrain(state: TerrainState, targetMaxX: number): void {
  const { map, seed } = state;

  while (state.lastGeneratedX < targetMaxX) {
    const x = state.nodes.length === 0 ? state.firstX : state.lastGeneratedX + NODE_STEP;
    let y = computeBaseTerrainY(x, map, seed);

    // Inject balanced adventure features (Bridges, Launch Ramps, Mogul Whoops, Steep Climbs, Hazard Zones)
    if (x >= state.nextFeatureX) {
      const roll = hash1D(Math.floor(x / 80), seed + 99);
      const featureLen = 300 + Math.floor(hash1D(x, seed + 13) * 160);

      if (roll < 0.28 && state.bridges.every((b) => Math.abs(b.xStart - x) > 420)) {
        const yStart = computeBaseTerrainY(x, map, seed);
        const yEnd = computeBaseTerrainY(x + featureLen, map, seed);
        const bridgeStyle: TerrainBridge['style'] =
          map.id === 'city' || map.id === 'industrial'
            ? 'steel'
            : map.id === 'forest' || map.id === 'jungle'
            ? 'log'
            : 'wood';
        state.bridges.push({
          xStart: x,
          xEnd: x + featureLen,
          yStart,
          yEnd,
          style: bridgeStyle,
        });

        // Modest coin reward on bridge (2-3 coins)
        for (let i = 1; i <= 3; i++) {
          const t = i / 4;
          const cx = x + featureLen * t;
          const by = yStart + (yEnd - yStart) * t;
          state.coins.push({
            id: state.nextId++,
            x: cx,
            y: by - 40,
            value: i === 2 ? 25 : 5,
            collected: false,
            bobPhase: cx * 0.02,
          });
        }
        state.nextFeatureX = x + featureLen + 380 + hash1D(x, seed + 5) * 320;
      } else if (roll < 0.54) {
        // Launch Kicker Ramp (gives crisp airtime jump!)
        state.activeRamp = {
          x0: x,
          x1: x + 220,
          peakLift: 68 + hash1D(x, seed + 29) * 36,
          type: 'kicker',
        };
        // Risk-reward aerial coin arc above kicker
        const baseY = computeBaseTerrainY(x + 220, map, seed);
        state.coins.push({
          id: state.nextId++,
          x: x + 265,
          y: baseY - 125,
          value: 25,
          collected: false,
          bobPhase: x * 0.02,
        });
        state.coins.push({
          id: state.nextId++,
          x: x + 315,
          y: baseY - 140,
          value: 100,
          collected: false,
          bobPhase: x * 0.03,
        });
        state.nextFeatureX = x + 460 + hash1D(x, seed + 17) * 300;
      } else if (roll < 0.76) {
        // Rhythm Mogul Whoops (tests suspension & throttle control!)
        state.activeRamp = {
          x0: x,
          x1: x + 280,
          peakLift: 24 + hash1D(x, seed + 31) * 12,
          type: 'moguls',
        };
        state.nextFeatureX = x + 450 + hash1D(x, seed + 19) * 280;
      } else {
        // Surface Hazard Zone (Ice on arctic/mountain, Mud on jungle/forest/countryside, Sand on desert/volcano)
        const zoneType: SurfaceZone['type'] =
          map.hasWaterOrLava === 'ice' || map.id === 'mountain'
            ? 'ice'
            : map.hasWaterOrLava === 'mud' || map.id === 'forest'
            ? 'mud'
            : 'sand';
        state.zones.push({
          xStart: x,
          xEnd: x + 240,
          type: zoneType,
        });
        state.nextFeatureX = x + 460 + hash1D(x, seed + 7) * 320;
      }
    }

    // Apply active ramp/mogul contour smoothly
    if (state.activeRamp) {
      const r = state.activeRamp;
      if (x >= r.x0 && x <= r.x1) {
        const t = (x - r.x0) / (r.x1 - r.x0);
        if (r.type === 'kicker') {
          // Smooth upward ramp curve with sharp drop-off lip at t = 0.85..1.0
          if (t < 0.84) {
            const rampT = t / 0.84;
            y -= Math.pow(rampT, 1.55) * r.peakLift;
          } else {
            const dropT = (t - 0.84) / 0.16;
            y -= (1 - dropT) * r.peakLift;
          }
        } else if (r.type === 'moguls') {
          const envelope = Math.sin(t * Math.PI);
          y -= Math.abs(Math.sin(t * Math.PI * 3.5)) * r.peakLift * envelope;
        }
      } else if (x > r.x1) {
        state.activeRamp = null;
      }
    }

    // Physical smooth road bumps (logs, rocks, speed bumps) to make suspension work
    if (
      x > 480 &&
      !state.activeRamp &&
      state.bridges.every((b) => x < b.xStart - 60 || x > b.xEnd + 60) &&
      hash1D(x * 0.23, seed + 919) > 0.91
    ) {
      const bumpKind: RoadBump['kind'] =
        map.id === 'city' || map.id === 'industrial'
          ? 'speedbump'
          : map.id === 'forest' || map.id === 'jungle'
          ? 'log'
          : map.id === 'arctic'
          ? 'iceblock'
          : 'rock';
      state.bumps.push({
        x,
        y,
        radius: 13 + hash1D(x, seed + 929) * 6,
        kind: bumpKind,
      });
    }

    // Apply slight smooth bump lift to spline near physical bumps so wheels bounce cleanly
    for (let b = state.bumps.length - 1; b >= 0; b--) {
      const bmp = state.bumps[b];
      const dist = Math.abs(x - bmp.x);
      if (dist < bmp.radius * 1.6) {
        const bt = 1 - dist / (bmp.radius * 1.6);
        y -= Math.cos((1 - bt) * Math.PI * 0.5) * (bmp.radius * 0.85);
      }
      if (bmp.x < x - 200) break;
    }

    // Valley depression under bridges
    for (const br of state.bridges) {
      if (x > br.xStart + 18 && x < br.xEnd - 18) {
        const midT = (x - br.xStart) / (br.xEnd - br.xStart);
        y += Math.sin(midT * Math.PI) * 155;
      }
    }

    state.nodes.push({ x, y });
    state.lastGeneratedX = x;

    // Underground earth pebbles
    if (hash1D(x * 0.37, seed + 111) > 0.35) {
      state.pebbles.push({
        x: x + (hash1D(x, seed + 121) - 0.5) * 24,
        depth: 18 + hash1D(x, seed + 131) * 110,
        r: 3 + hash1D(x, seed + 141) * 8,
        shade: hash1D(x, seed + 151),
      });
    }

    // Environmental roadside props
    if (x > 160 && hash1D(x * 0.13, seed + 303) > 0.72) {
      const decorKind = pickDecorKind(map.id, hash1D(x * 0.21, seed + 404));
      state.decors.push({
        x,
        y,
        kind: decorKind,
        scale: 0.85 + hash1D(x, seed + 505) * 0.55,
        flip: hash1D(x, seed + 606) > 0.5,
      });
    }

    // Scarcer, more rewarding road coins ("coin thode Kam mile")
    if (x >= state.nextCoinX) {
      const patternRoll = hash1D(x * 0.17, seed + 707);
      const count = patternRoll < 0.35 ? 2 : 3;
      const isHighCoin = patternRoll > 0.82;
      const meters = x / PIXELS_PER_METER;

      for (let c = 0; c < count; c++) {
        const cx = x + c * 46;
        const groundY = computeBaseTerrainY(cx, map, seed);
        const lift = isHighCoin ? 62 + Math.sin((c / Math.max(1, count - 1)) * Math.PI) * 28 : 26;

        let value = 5;
        if (isHighCoin && c === 1) {
          value = meters > 650 && patternRoll > 0.94 ? 500 : 25;
        } else if (c === count - 1 && patternRoll > 0.65) {
          value = 25;
        }

        const nearBridge = state.bridges.some((b) => cx >= b.xStart && cx <= b.xEnd);
        if (!nearBridge) {
          state.coins.push({
            id: state.nextId++,
            x: cx,
            y: groundY - lift,
            value,
            collected: false,
            bobPhase: cx * 0.025,
          });
        }
      }

      const gap = (460 + hash1D(x, seed + 808) * 320) / Math.max(0.85, map.coinDensity * 0.75);
      state.nextCoinX = x + count * 46 + gap;
    }

    // Reliable Fuel Cans (balanced so player must manage throttle & reach next fuel)
    if (x >= state.nextFuelX) {
      const fy = getSurfaceHeight(state, x);
      state.fuels.push({
        id: state.nextId++,
        x,
        y: fy - 28,
        collected: false,
      });
      const meters = x / PIXELS_PER_METER;
      const spacingScale = Math.min(1.32, 1 + meters / 3800);
      state.nextFuelX = x + map.fuelSpacing * PIXELS_PER_METER * spacingScale;
    }
  }
}

function pickDecorKind(mapId: MapDef['id'], r: number): TerrainDecor['kind'] {
  switch (mapId) {
    case 'countryside':
      return r < 0.35 ? 'tree' : r < 0.58 ? 'bush' : r < 0.78 ? 'fence' : r < 0.9 ? 'windmill' : 'sign';
    case 'desert':
      return r < 0.55 ? 'cactus' : r < 0.85 ? 'rock' : 'sign';
    case 'arctic':
      return r < 0.55 ? 'pine' : 'crystal';
    case 'forest':
      return r < 0.6 ? 'pine' : r < 0.85 ? 'bush' : 'rock';
    case 'mountain':
      return r < 0.5 ? 'rock' : 'pine';
    case 'volcano':
      return r < 0.65 ? 'rock' : 'crystal';
    case 'moon':
      return r < 0.65 ? 'crater' : 'rock';
    case 'city':
      return r < 0.7 ? 'lamp' : 'sign';
    case 'jungle':
      return r < 0.5 ? 'tree' : r < 0.75 ? 'bush' : 'ruin';
    case 'industrial':
      return r < 0.45 ? 'stack' : r < 0.8 ? 'barrel' : 'sign';
  }
}

export function recycleTerrainBehind(state: TerrainState, minKeepX: number): void {
  let trimCount = 0;
  while (trimCount < state.nodes.length - 20 && state.nodes[trimCount].x < minKeepX) {
    trimCount++;
  }
  if (trimCount > 24) {
    state.nodes.splice(0, trimCount);
    state.firstX = state.nodes[0].x;
  }

  state.coins = state.coins.filter((c) => !c.collected && c.x >= minKeepX);
  state.fuels = state.fuels.filter((f) => !f.collected && f.x >= minKeepX);
  state.bridges = state.bridges.filter((b) => b.xEnd >= minKeepX);
  state.bumps = state.bumps.filter((b) => b.x >= minKeepX);
  state.decors = state.decors.filter((d) => d.x >= minKeepX);
  state.zones = state.zones.filter((z) => z.xEnd >= minKeepX);
  state.pebbles = state.pebbles.filter((p) => p.x >= minKeepX);
}

export function getGroundOnlyHeight(state: TerrainState, x: number): number {
  if (state.nodes.length === 0) return 0;
  const rel = (x - state.firstX) / NODE_STEP;
  const idx = Math.floor(rel);
  if (idx < 0) return state.nodes[0].y;
  if (idx >= state.nodes.length - 1) return state.nodes[state.nodes.length - 1].y;
  const t = rel - idx;
  const y0 = state.nodes[idx].y;
  const y1 = state.nodes[idx + 1].y;
  return y0 + (y1 - y0) * t;
}

export function getSurfaceHeight(state: TerrainState, x: number): number {
  let y = getGroundOnlyHeight(state, x);
  for (const br of state.bridges) {
    if (x >= br.xStart && x <= br.xEnd) {
      const t = (x - br.xStart) / (br.xEnd - br.xStart);
      const bridgeY = br.yStart + (br.yEnd - br.yStart) * t;
      if (bridgeY < y) {
        y = bridgeY;
      }
    }
  }
  return y;
}

export function getSurfaceNormal(state: TerrainState, x: number): { nx: number; ny: number; tx: number; ty: number } {
  const eps = 6;
  const yL = getSurfaceHeight(state, x - eps);
  const yR = getSurfaceHeight(state, x + eps);
  const dx = eps * 2;
  const dy = yR - yL;
  const len = Math.hypot(dx, dy) || 1;
  const tx = dx / len;
  const ty = dy / len;
  const nx = ty;
  const ny = -tx;
  return { nx, ny, tx, ty };
}

export function getSurfaceZoneAt(state: TerrainState, x: number): SurfaceZone['type'] | null {
  for (const z of state.zones) {
    if (x >= z.xStart && x <= z.xEnd) return z.type;
  }
  return null;
}

import { MapDef, VehicleDef, VehicleStats } from '../types/game';
import {
  getSurfaceHeight,
  getSurfaceNormal,
  getSurfaceZoneAt,
  PIXELS_PER_METER,
  TerrainState,
} from './terrain';

export interface WheelSimState {
  offsetX: number;
  restY: number;
  compression: number;
  worldX: number;
  worldY: number;
  rotation: number;
  angularVel: number;
  grounded: boolean;
  wasGrounded: boolean;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

export interface FloatingText {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface PhysicsEvents {
  coinsCollected: number;
  fuelCollected: number;
  flipsCompleted: number;
  heavyLandingImpact: number;
  jumped: boolean;
  crashed: boolean;
  outOfFuel: boolean;
  brakingSkid: boolean;
}

export interface VehicleSim {
  vehicle: VehicleDef;
  stats: VehicleStats;
  map: MapDef;

  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVel: number;

  rearWheel: WheelSimState;
  frontWheel: WheelSimState;

  fuel: number;
  maxFuel: number;
  distanceMeters: number;
  runCoins: number;
  flips: number;
  fuelCollectedCount: number;
  airTime: number;
  maxAirTime: number;
  currentAirRotation: number;
  wasAirborne: boolean;
  wheelieTime: number;
  rpmPct: number;
  crashed: boolean;
  outOfFuel: boolean;
  outOfFuelCoastTimer: number;
  hitstopTimer: number;
  cameraShake: number;
  driverHeadBob: number;
  scarfPhase: number;

  particles: Particle[];
  floatingTexts: FloatingText[];
  bonusBanner: string | null;
  bonusBannerTimer: number;
}

const PARTICLE_POOL_SIZE = 160;
const TEXT_POOL_SIZE = 24;

export function createVehicleSim(vehicle: VehicleDef, stats: VehicleStats, map: TerrainState['map']): VehicleSim {
  const halfBase = stats.wheelBase * 0.5;
  const restOffset = vehicle.chassisHeight * 0.42;

  const particles: Particle[] = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 1,
    size: 4,
    color: '#fff',
    gravity: 200,
  }));

  const floatingTexts: FloatingText[] = Array.from({ length: TEXT_POOL_SIZE }, () => ({
    active: false,
    x: 0,
    y: 0,
    vy: -40,
    text: '',
    color: '#FACC15',
    life: 0,
    maxLife: 1,
  }));

  return {
    vehicle,
    stats,
    map,
    x: 100,
    y: -restOffset - stats.wheelRadius - 8,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVel: 0,
    rearWheel: {
      offsetX: -halfBase,
      restY: restOffset,
      compression: 0,
      worldX: 100 - halfBase,
      worldY: -stats.wheelRadius,
      rotation: 0,
      angularVel: 0,
      grounded: false,
      wasGrounded: false,
    },
    frontWheel: {
      offsetX: halfBase,
      restY: restOffset,
      compression: 0,
      worldX: 100 + halfBase,
      worldY: -stats.wheelRadius,
      rotation: 0,
      angularVel: 0,
      grounded: false,
      wasGrounded: false,
    },
    fuel: stats.fuelCapacity,
    maxFuel: stats.fuelCapacity,
    distanceMeters: 0,
    runCoins: 0,
    flips: 0,
    fuelCollectedCount: 0,
    airTime: 0,
    maxAirTime: 0,
    currentAirRotation: 0,
    wasAirborne: false,
    wheelieTime: 0,
    rpmPct: 0.15,
    crashed: false,
    outOfFuel: false,
    outOfFuelCoastTimer: 0,
    hitstopTimer: 0,
    cameraShake: 0,
    driverHeadBob: 0,
    scarfPhase: 0,
    particles,
    floatingTexts,
    bonusBanner: null,
    bonusBannerTimer: 0,
  };
}

export function spawnParticle(
  sim: VehicleSim,
  x: number,
  y: number,
  vx: number,
  vy: number,
  size: number,
  color: string,
  maxLife: number,
  gravity = 260
): void {
  for (let i = 0; i < sim.particles.length; i++) {
    const p = sim.particles[i];
    if (!p.active) {
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.size = size;
      p.color = color;
      p.life = maxLife;
      p.maxLife = maxLife;
      p.gravity = gravity;
      return;
    }
  }
}

export function spawnFloatingText(sim: VehicleSim, x: number, y: number, text: string, color: string): void {
  for (let i = 0; i < sim.floatingTexts.length; i++) {
    const ft = sim.floatingTexts[i];
    if (!ft.active) {
      ft.active = true;
      ft.x = x;
      ft.y = y;
      ft.vy = -58;
      ft.text = text;
      ft.color = color;
      ft.life = 1.05;
      ft.maxLife = 1.05;
      return;
    }
  }
}

function normalizeAngle(a: number): number {
  let res = a % (Math.PI * 2);
  if (res > Math.PI) res -= Math.PI * 2;
  if (res < -Math.PI) res += Math.PI * 2;
  return res;
}

export function stepVehiclePhysics(
  sim: VehicleSim,
  terrain: TerrainState,
  gas: boolean,
  brake: boolean,
  dt: number,
  particlesEnabled: boolean,
  demoMode = false
): PhysicsEvents {
  const events: PhysicsEvents = {
    coinsCollected: 0,
    fuelCollected: 0,
    flipsCompleted: 0,
    heavyLandingImpact: 0,
    jumped: false,
    crashed: false,
    outOfFuel: false,
    brakingSkid: false,
  };

  if (sim.hitstopTimer > 0) {
    sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
    updateParticlesAndTexts(sim, dt);
    return events;
  }

  sim.cameraShake = Math.max(0, sim.cameraShake - dt * 28);
  if (sim.bonusBannerTimer > 0) {
    sim.bonusBannerTimer -= dt;
    if (sim.bonusBannerTimer <= 0) sim.bonusBanner = null;
  }

  if (sim.crashed) {
    updateParticlesAndTexts(sim, dt);
    return events;
  }

  const hasFuel = demoMode || sim.fuel > 0;
  const activeGas = gas && hasFuel;
  const activeBrake = brake && hasFuel;

  if (!demoMode && sim.fuel > 0) {
    const burnRate = activeGas ? 1.08 : activeBrake ? 0.45 : 0.24;
    sim.fuel = Math.max(0, sim.fuel - burnRate * dt);
    if (sim.fuel <= 0) {
      sim.outOfFuel = true;
      sim.outOfFuelCoastTimer = 2.2;
    }
  }

  if (sim.outOfFuel) {
    sim.outOfFuelCoastTimer -= dt;
    if (sim.outOfFuelCoastTimer <= 0 || (Math.abs(sim.vx) < 12 && (sim.rearWheel.grounded || sim.frontWheel.grounded))) {
      events.outOfFuel = true;
    }
  }

  const substeps = 2;
  const subDt = dt / substeps;
  // Slightly lighter gravity scale so jumps over crests and ramps feel airy, bouncy, and never glued to the road!
  const gravityPx = sim.map.gravity * 57;
  const invMass = 1 / sim.stats.mass;
  const momentOfInertia = sim.stats.mass * 1480;

  for (let s = 0; s < substeps; s++) {
    const cosA = Math.cos(sim.angle);
    const sinA = Math.sin(sim.angle);

    let fx = 0;
    let fy = sim.stats.mass * gravityPx;
    let torque = 0;

    const wheels: [WheelSimState, number][] = [
      [sim.rearWheel, 1 - sim.stats.awdRatio * 0.5],
      [sim.frontWheel, sim.stats.awdRatio * 0.5],
    ];

    for (let wIdx = 0; wIdx < wheels.length; wIdx++) {
      const [wheel, driveShare] = wheels[wIdx];
      wheel.wasGrounded = wheel.grounded;

      const mountWorldX = sim.x + wheel.offsetX * cosA - wheel.restY * sinA;
      const mountWorldY = sim.y + wheel.offsetX * sinA + wheel.restY * cosA;

      const groundY = getSurfaceHeight(terrain, mountWorldX);
      const { nx, ny, tx, ty } = getSurfaceNormal(terrain, mountWorldX);
      const zone = getSurfaceZoneAt(terrain, mountWorldX);

      const maxReachY = mountWorldY + sim.stats.suspensionTravel + sim.stats.wheelRadius;
      const penetration = maxReachY - groundY;

      if (penetration > 0) {
        wheel.grounded = true;
        const comp = Math.min(sim.stats.suspensionTravel, penetration);
        wheel.compression = comp;

        // Soft bottoming guard (allows natural spring bounce instead of sticking flat!)
        const hardPen = penetration - sim.stats.suspensionTravel;
        if (hardPen > 0) {
          sim.y -= hardPen * 0.45;
          if (sim.vy > 40) {
            // Rebound impulse on bottoming out
            sim.vy = -sim.vy * 0.22;
          }
        }

        const rx = mountWorldX - sim.x;
        const ry = mountWorldY - sim.y;
        const vxPoint = sim.vx - sim.angularVel * ry;
        const vyPoint = sim.vy + sim.angularVel * rx;

        // Normal velocity (negative = compressing into ground)
        const vNormal = vxPoint * nx + vyPoint * ny;
        // Lively spring-damper tuning so suspension actively rebounds off hills and bumps
        const springForce = Math.max(
          0,
          comp * sim.stats.suspensionStiffness * 24 - vNormal * sim.stats.suspensionDamping * 3.1
        );

        const fnx = nx * springForce;
        const fny = ny * springForce;
        fx += fnx;
        fy += fny;
        torque += (rx * fny - ry * fnx) * 0.26;

        // Landing impact feedback
        if (!wheel.wasGrounded && vNormal < -115) {
          const impact = Math.min(1, Math.abs(vNormal) / 480);
          events.heavyLandingImpact = Math.max(events.heavyLandingImpact, impact);
          if (impact > 0.35) {
            sim.cameraShake = Math.max(sim.cameraShake, impact * 8.5);
          }
          if (particlesEnabled) {
            for (let p = 0; p < 6; p++) {
              spawnParticle(
                sim,
                mountWorldX,
                groundY - 2,
                (Math.random() - 0.5) * 160,
                -35 - Math.random() * 105,
                3 + Math.random() * 4,
                sim.map.surfaceColor,
                0.38 + Math.random() * 0.25,
                260
              );
            }
          }
        }

        // Surface friction & hazard zones
        const zoneFriction = zone === 'ice' ? 0.52 : zone === 'mud' ? 0.62 : zone === 'sand' ? 0.78 : 1.0;
        const zoneDrag = zone === 'mud' ? 0.98 : zone === 'sand' ? 0.992 : 1.0;
        const totalGrip = sim.map.surfaceFriction * sim.stats.gripFactor * zoneFriction;
        const vTan = vxPoint * tx + vyPoint * ty;

        let driveForce = 0;
        if (activeGas) {
          const speedRatio = Math.max(0, vTan / sim.stats.maxSpeed);
          const torqueCurve = Math.max(0.18, 1 - speedRatio * 0.84);
          driveForce = sim.stats.enginePower * driveShare * torqueCurve * Math.min(1.42, totalGrip);
        } else if (activeBrake) {
          if (vTan > 25) {
            driveForce = -sim.stats.brakeForce * 0.95 * Math.min(1.3, totalGrip);
            if (Math.abs(vTan) > 150 && s === 0) {
              events.brakingSkid = true;
            }
          } else {
            const revRatio = Math.max(0, -vTan / (sim.stats.maxSpeed * 0.42));
            driveForce = -sim.stats.enginePower * 0.55 * driveShare * Math.max(0.1, 1 - revRatio);
          }
        } else {
          driveForce = -vTan * 0.95;
        }

        fx += tx * driveForce;
        fy += ty * driveForce;

        // Authentic wheelie / pitch reaction so throttle lifts nose on climbs & bumps!
        if (activeGas && wIdx === 0) {
          torque -= driveForce * 0.068;
        } else if (activeBrake && vTan > 35 && wIdx === 1) {
          torque += Math.abs(driveForce) * 0.042;
        }

        const wheelTravelY = sim.stats.suspensionTravel - comp;
        wheel.worldX = sim.x + wheel.offsetX * cosA - (wheel.restY + wheelTravelY) * sinA;
        wheel.worldY = groundY - sim.stats.wheelRadius;
        wheel.angularVel = vTan / sim.stats.wheelRadius;
        wheel.rotation += wheel.angularVel * subDt;
        sim.vx *= zoneDrag;

        if (particlesEnabled && s === 0 && (activeGas || events.brakingSkid) && Math.abs(vTan) > 60 && Math.random() < 0.45) {
          spawnParticle(
            sim,
            wheel.worldX - tx * 10,
            groundY - 3,
            -tx * (40 + Math.random() * 65),
            -20 - Math.random() * 50,
            3 + Math.random() * 4,
            zone === 'ice' ? '#E0F2FE' : zone === 'mud' ? '#451A03' : sim.map.subSoilColor,
            0.35 + Math.random() * 0.25,
            210
          );
        }
      } else {
        wheel.grounded = false;
        wheel.compression = Math.max(0, wheel.compression - subDt * 68);
        wheel.worldX = sim.x + wheel.offsetX * cosA - (wheel.restY + sim.stats.suspensionTravel) * sinA;
        wheel.worldY = sim.y + wheel.offsetX * sinA + (wheel.restY + sim.stats.suspensionTravel) * cosA;
        if (activeGas) {
          wheel.angularVel = Math.min(36, wheel.angularVel + 28 * subDt);
        } else if (activeBrake) {
          wheel.angularVel = Math.max(-20, wheel.angularVel - 28 * subDt);
        } else {
          wheel.angularVel *= 0.985;
        }
        wheel.rotation += wheel.angularVel * subDt;
      }
    }

    // Air rotation control (requires balancing nose when catching big air!)
    const bothAir = !sim.rearWheel.grounded && !sim.frontWheel.grounded;
    if (bothAir) {
      if (activeGas) {
        torque -= sim.stats.airControl * 1380;
      } else if (activeBrake) {
        torque += sim.stats.airControl * 1380;
      }
      if (!activeGas && !activeBrake) {
        sim.angularVel *= 1 - Math.min(0.035, sim.stats.aeroDrag * 20);
      }
    }

    // Aerodynamic drag
    const speedSq = sim.vx * sim.vx + sim.vy * sim.vy;
    const speed = Math.sqrt(speedSq);
    if (speed > 1) {
      const dragMag = sim.stats.aeroDrag * speedSq;
      fx -= (sim.vx / speed) * dragMag;
      fy -= (sim.vy / speed) * dragMag;
    }

    sim.vx += fx * invMass * subDt;
    sim.vy += fy * invMass * subDt;
    sim.angularVel += (torque / momentOfInertia) * subDt;

    sim.angularVel = Math.max(-7.8, Math.min(7.8, sim.angularVel));
    if (!bothAir) {
      sim.angularVel *= 0.975; // lets suspension pitch naturally without feeling stiff/glued
    } else {
      sim.angularVel *= 0.996;
    }

    sim.x += sim.vx * subDt;
    sim.y += sim.vy * subDt;
    sim.angle += sim.angularVel * subDt;

    if (sim.x < -160) {
      sim.x = -160;
      if (sim.vx < 0) sim.vx = 0;
    }

    // Driver head / roof collision detection
    if (!demoMode) {
      const headLocalX = sim.vehicle.driverOffsetX;
      const headLocalY = sim.vehicle.driverOffsetY - 12;
      const headWorldX = sim.x + headLocalX * cosA - headLocalY * sinA;
      const headWorldY = sim.y + headLocalX * sinA + headLocalY * cosA;
      const headGroundY = getSurfaceHeight(terrain, headWorldX);
      const normAngle = Math.abs(normalizeAngle(sim.angle));
      const crashThresholdAngle = 1.58 + sim.stats.rollCageProtection * 0.42;

      if (headWorldY > headGroundY - 3 && normAngle > crashThresholdAngle) {
        sim.crashed = true;
        sim.hitstopTimer = 0.06;
        sim.cameraShake = 14;
        events.crashed = true;
        if (particlesEnabled) {
          for (let i = 0; i < 26; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 80 + Math.random() * 240;
            spawnParticle(
              sim,
              headWorldX,
              headGroundY - 8,
              Math.cos(ang) * spd,
              Math.sin(ang) * spd - 90,
              3 + Math.random() * 5,
              i % 2 === 0 ? '#F97316' : '#FACC15',
              0.5 + Math.random() * 0.4,
              320
            );
          }
        }
        break;
      }
    } else {
      const normA = normalizeAngle(sim.angle);
      if (Math.abs(normA) > 0.95) {
        sim.angle -= normA * 0.14;
        sim.angularVel *= 0.5;
      }
    }
  }

  const isAirborne = !sim.rearWheel.grounded && !sim.frontWheel.grounded;
  if (isAirborne) {
    if (!sim.wasAirborne && sim.vy < -85) {
      events.jumped = true;
    }
    sim.airTime += dt;
    if (sim.airTime > sim.maxAirTime) {
      sim.maxAirTime = sim.airTime;
    }
    sim.currentAirRotation += sim.angularVel * dt;

    if (Math.abs(sim.currentAirRotation) >= 5.6) {
      const dir = sim.currentAirRotation < 0 ? 'BACKFLIP' : 'FRONTFLIP';
      sim.currentAirRotation -= Math.sign(sim.currentAirRotation) * Math.PI * 2;
      sim.flips += 1;
      events.flipsCompleted += 1;
      const bonus = 60;
      sim.runCoins += bonus;
      sim.bonusBanner = `${dir}! +${bonus} COINS`;
      sim.bonusBannerTimer = 1.6;
      spawnFloatingText(sim, sim.x, sim.y - 60, `${dir} +${bonus}`, '#FACC15');
    }
  } else {
    if (sim.wasAirborne && sim.airTime >= 1.1) {
      const airBonus = Math.round(sim.airTime * 15);
      sim.runCoins += airBonus;
      sim.bonusBanner = `BIG AIR ${sim.airTime.toFixed(1)}s! +${airBonus}`;
      sim.bonusBannerTimer = 1.4;
      spawnFloatingText(sim, sim.x, sim.y - 50, `BIG AIR +${airBonus}`, '#38BDF8');
    }
    sim.airTime = 0;
    sim.currentAirRotation = 0;
  }
  sim.wasAirborne = isAirborne;

  if (sim.rearWheel.grounded && !sim.frontWheel.grounded && Math.abs(sim.vx) > 90) {
    sim.wheelieTime += dt;
    if (sim.wheelieTime >= 1.4) {
      sim.wheelieTime = 0;
      sim.runCoins += 35;
      spawnFloatingText(sim, sim.x, sim.y - 48, 'WHEELIE +35', '#34D399');
    }
  } else {
    sim.wheelieTime = 0;
  }

  const dist = Math.max(0, Math.floor((sim.x - 100) / PIXELS_PER_METER));
  if (dist > sim.distanceMeters) {
    sim.distanceMeters = dist;
  }

  const speedRatio = Math.min(1, Math.hypot(sim.vx, sim.vy) / sim.stats.maxSpeed);
  const targetRpm = activeGas ? Math.min(1, 0.35 + speedRatio * 0.65) : Math.max(0.12, speedRatio * 0.55);
  sim.rpmPct += (targetRpm - sim.rpmPct) * Math.min(1, dt * 8);

  sim.driverHeadBob += (-sim.vy * 0.015 - sim.driverHeadBob) * Math.min(1, dt * 10);
  sim.scarfPhase += dt * (6 + Math.abs(sim.vx) * 0.03);

  if (particlesEnabled && activeGas && Math.random() < 0.32) {
    const cosA = Math.cos(sim.angle);
    const sinA = Math.sin(sim.angle);
    const exX = sim.x - (sim.vehicle.chassisLength * 0.45) * cosA;
    const exY = sim.y - (sim.vehicle.chassisLength * 0.45) * sinA;
    spawnParticle(
      sim,
      exX,
      exY,
      -cosA * 65 + (Math.random() - 0.5) * 20,
      -sinA * 65 - 15,
      4 + Math.random() * 4,
      sim.vehicle.id === 'futuristic_rover' ? 'rgba(34,211,238,0.65)' : 'rgba(203,213,225,0.45)',
      0.32,
      -30
    );
  }

  if (!demoMode) {
    const pickupRadius = Math.max(46, sim.vehicle.chassisLength * 0.46);
    for (let i = 0; i < terrain.coins.length; i++) {
      const c = terrain.coins[i];
      if (c.collected) continue;
      const dx = c.x - sim.x;
      const dy = c.y - sim.y;
      if (dx * dx + dy * dy < pickupRadius * pickupRadius) {
        c.collected = true;
        sim.runCoins += c.value;
        events.coinsCollected += c.value;
        spawnFloatingText(sim, c.x, c.y - 12, `+${c.value}`, '#FDE047');
        if (particlesEnabled) {
          for (let p = 0; p < 6; p++) {
            const ang = (p / 6) * Math.PI * 2;
            spawnParticle(sim, c.x, c.y, Math.cos(ang) * 90, Math.sin(ang) * 90 - 40, 3.5, '#FACC15', 0.32, 160);
          }
        }
      }
    }

    for (let i = 0; i < terrain.fuels.length; i++) {
      const f = terrain.fuels[i];
      if (f.collected) continue;
      const dx = f.x - sim.x;
      const dy = f.y - sim.y;
      if (dx * dx + dy * dy < (pickupRadius + 10) * (pickupRadius + 10)) {
        f.collected = true;
        sim.fuel = sim.maxFuel;
        sim.outOfFuel = false;
        sim.fuelCollectedCount += 1;
        events.fuelCollected += 1;
        spawnFloatingText(sim, f.x, f.y - 20, 'FUEL 100%', '#4ADE80');
        if (particlesEnabled) {
          for (let p = 0; p < 10; p++) {
            const ang = (p / 10) * Math.PI * 2;
            spawnParticle(sim, f.x, f.y, Math.cos(ang) * 110, Math.sin(ang) * 110 - 50, 4, '#EF4444', 0.42, 180);
          }
        }
      }
    }
  }

  updateParticlesAndTexts(sim, dt);
  return events;
}

function updateParticlesAndTexts(sim: VehicleSim, dt: number): void {
  for (let i = 0; i < sim.particles.length; i++) {
    const p = sim.particles[i];
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      continue;
    }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  for (let i = 0; i < sim.floatingTexts.length; i++) {
    const ft = sim.floatingTexts[i];
    if (!ft.active) continue;
    ft.life -= dt;
    if (ft.life <= 0) {
      ft.active = false;
      continue;
    }
    ft.y += ft.vy * dt;
  }
}

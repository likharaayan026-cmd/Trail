import { MapDef, VehicleDef } from '../types/game';
import { VehicleSim } from './physics';
import { PIXELS_PER_METER, TerrainDecor, TerrainState } from './terrain';

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export function renderGameWorld(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sim: VehicleSim,
  terrain: TerrainState,
  cam: CameraState,
  bestDistance: number,
  timeSec: number
): void {
  const map = terrain.map;

  // 1. Rich Multi-Stop Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  skyGrad.addColorStop(0, map.skyTop);
  skyGrad.addColorStop(0.65, map.skyBottom);
  skyGrad.addColorStop(1, map.farHillColor);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Celestial Body, Aurora / Sun Rays, Stars & Soft Clouds
  drawSkyBackdrop(ctx, width, height, map, cam, timeSec);

  // 3. Three-Layer Atmospheric Parallax Mountains, Foothills & Scenery
  drawMountainRange(ctx, width, height, cam.x * 0.06, height * 0.5, 105, map.farHillColor, map.id);
  drawParallaxLayer(ctx, width, height, cam.x * 0.16, height * 0.6, 68, 0.0028, map.farHillColor, map.id === 'city', 0.85);
  drawParallaxLayer(ctx, width, height, cam.x * 0.34, height * 0.72, 46, 0.0046, map.midHillColor, map.id === 'city', 1.0);

  // 4. World-Space Camera Transform
  ctx.save();
  const shakeX = sim.cameraShake > 0 ? (Math.random() - 0.5) * sim.cameraShake : 0;
  const shakeY = sim.cameraShake > 0 ? (Math.random() - 0.5) * sim.cameraShake : 0;

  ctx.translate(width * 0.32 + shakeX, height * 0.62 + shakeY);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  const viewLeft = cam.x - (width * 0.42) / cam.zoom - 140;
  const viewRight = cam.x + (width * 0.82) / cam.zoom + 140;
  const viewBottom = cam.y + (height * 0.68) / cam.zoom + 480;

  // 5. Bridges
  drawBridges(ctx, terrain, viewLeft, viewRight);

  // 6. Lava/Water Under Bridges
  if (map.hasWaterOrLava === 'lava') {
    for (const br of terrain.bridges) {
      if (br.xEnd < viewLeft || br.xStart > viewRight) continue;
      const lavaY = Math.max(br.yStart, br.yEnd) + 65;
      ctx.fillStyle = '#EA580C';
      ctx.fillRect(br.xStart, lavaY, br.xEnd - br.xStart, 180);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(br.xStart, lavaY, br.xEnd - br.xStart, 6);
    }
  }

  // 7. Environmental Props Behind Road Edge
  for (let i = 0; i < terrain.decors.length; i++) {
    const d = terrain.decors[i];
    if (d.x < viewLeft - 90 || d.x > viewRight + 90) continue;
    drawDecor(ctx, d, map, timeSec);
  }

  // 8. Rich Hill-Climb-Style Layered Road & Earth Strata
  drawTerrainMesh(ctx, terrain, viewLeft, viewRight, viewBottom);

  // 8b. Physical Road Bumps (Logs, Rocks, Speedbumps, Ice Blocks)
  drawRoadBumps(ctx, terrain, viewLeft, viewRight);

  // 9. Surface Hazard Zones (Ice / Mud / Sand)
  drawSurfaceZones(ctx, terrain, viewLeft, viewRight);

  // 10. Start Line Banner & Best Distance Record Flag
  if (100 >= viewLeft - 80 && 100 <= viewRight + 80) {
    drawStartBanner(ctx, terrain, 100);
  }
  if (bestDistance >= 40) {
    const flagX = 100 + bestDistance * PIXELS_PER_METER;
    if (flagX >= viewLeft && flagX <= viewRight) {
      drawRecordFlag(ctx, terrain, flagX, bestDistance);
    }
  }

  // 11. Glossy Road Coins
  for (let i = 0; i < terrain.coins.length; i++) {
    const c = terrain.coins[i];
    if (c.collected || c.x < viewLeft || c.x > viewRight) continue;
    drawCoin(ctx, c.x, c.y + Math.sin(timeSec * 4.5 + c.bobPhase) * 3.5, c.value, timeSec);
  }

  // 12. Fuel Cans
  for (let i = 0; i < terrain.fuels.length; i++) {
    const f = terrain.fuels[i];
    if (f.collected || f.x < viewLeft || f.x > viewRight) continue;
    drawFuelCan(ctx, f.x, f.y + Math.sin(timeSec * 3.5 + f.x * 0.01) * 3, timeSec);
  }

  // 13. Vehicle + Driver + Suspension + Wheels
  drawVehicleFromSim(ctx, sim);

  // 14. Pooled Particles & Floating Stunt/Coin Popups
  for (let i = 0; i < sim.particles.length; i++) {
    const p = sim.particles[i];
    if (!p.active) continue;
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.font = '800 18px "Barlow Condensed", sans-serif';
  for (let i = 0; i < sim.floatingTexts.length; i++) {
    const ft = sim.floatingTexts[i];
    if (!ft.active) continue;
    const alpha = Math.max(0, ft.life / ft.maxLife);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // 15. Ambient Weather Overlay
  if (map.ambientParticle !== 'none') {
    drawAmbientWeather(ctx, width, height, map, timeSec);
  }
}

function drawSkyBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  map: MapDef,
  cam: CameraState,
  timeSec: number
): void {
  if (map.id === 'moon' || map.id === 'arctic') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 48; i++) {
      const sx = ((i * 197 + 53 - cam.x * 0.018) % width + width) % width;
      const sy = ((i * 89 + 31) % (height * 0.52));
      const tw = 1 + Math.sin(timeSec * 2.5 + i) * 0.65;
      ctx.beginPath();
      ctx.arc(sx, sy, tw, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Aurora ribbon on Arctic
  if (map.id === 'arctic') {
    ctx.save();
    const aurGrad = ctx.createLinearGradient(0, height * 0.08, width, height * 0.35);
    aurGrad.addColorStop(0, 'rgba(34, 211, 238, 0.05)');
    aurGrad.addColorStop(0.5, 'rgba(52, 211, 153, 0.22)');
    aurGrad.addColorStop(1, 'rgba(56, 189, 248, 0.06)');
    ctx.strokeStyle = aurGrad;
    ctx.lineWidth = 26;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 30) {
      const y = height * 0.2 + Math.sin(x * 0.006 + timeSec * 0.6) * 24;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Sun / Earth
  const sunX = width * 0.78;
  const sunY = height * 0.2;
  ctx.save();
  if (map.id === 'moon') {
    ctx.fillStyle = '#0284C7';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.arc(sunX - 10, sunY - 6, 13, 0, Math.PI * 2);
    ctx.arc(sunX + 12, sunY + 8, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 39, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 92);
    glow.addColorStop(0, map.sunColor);
    glow.addColorStop(0.35, map.sunColor + '88');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 92, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = map.sunColor;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Layered fluffy clouds
  if (map.id === 'countryside' || map.id === 'desert' || map.id === 'forest' || map.id === 'mountain' || map.id === 'city') {
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 310 - cam.x * 0.035 + timeSec * 6) % (width + 260) + (width + 260)) % (width + 260) - 130;
      const cy = 54 + (i % 3) * 42;
      ctx.fillStyle = map.id === 'city' ? 'rgba(254, 215, 170, 0.25)' : 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.arc(cx + 22, cy - 9, 28, 0, Math.PI * 2);
      ctx.arc(cx + 48, cy - 2, 22, 0, Math.PI * 2);
      ctx.arc(cx + 66, cy + 4, 15, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawMountainRange(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  offsetX: number,
  baseY: number,
  amp: number,
  color: string,
  mapId: MapDef['id']
): void {
  if (mapId === 'city') return;
  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, height);
  const step = 76;
  const startIdx = Math.floor(offsetX / step) - 1;
  const count = Math.ceil(width / step) + 3;
  for (let i = 0; i <= count; i++) {
    const idx = startIdx + i;
    const sx = idx * step - offsetX;
    const peak = Math.abs(Math.sin(idx * 1.7 + 0.5)) * amp + Math.abs(Math.cos(idx * 0.8)) * (amp * 0.45);
    ctx.lineTo(sx, baseY - peak);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  // Snow caps on Mountain / Countryside / Arctic
  if (mapId === 'mountain' || mapId === 'countryside' || mapId === 'arctic') {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#F8FAFC';
    for (let i = 0; i < count; i++) {
      const idx = startIdx + i;
      const sx = idx * step - offsetX;
      const peak = Math.abs(Math.sin(idx * 1.7 + 0.5)) * amp + Math.abs(Math.cos(idx * 0.8)) * (amp * 0.45);
      if (peak > amp * 0.78) {
        ctx.beginPath();
        ctx.moveTo(sx, baseY - peak);
        ctx.lineTo(sx - 18, baseY - peak + 22);
        ctx.lineTo(sx + 18, baseY - peak + 22);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawParallaxLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  offsetX: number,
  baseY: number,
  amp: number,
  freq: number,
  color: string,
  skyline: boolean,
  alpha: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, height);
  if (skyline) {
    const bWidth = 54;
    const startIdx = Math.floor(offsetX / bWidth) - 1;
    const count = Math.ceil(width / bWidth) + 3;
    for (let i = 0; i < count; i++) {
      const idx = startIdx + i;
      const bx = idx * bWidth - offsetX;
      const bh = 42 + (Math.abs(Math.sin(idx * 12.9898)) * amp * 2.2);
      ctx.lineTo(bx, baseY - bh);
      ctx.lineTo(bx + bWidth - 5, baseY - bh);
      ctx.lineTo(bx + bWidth - 5, baseY);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Lit building windows on city dusk skyline
    ctx.fillStyle = 'rgba(253, 224, 71, 0.45)';
    for (let i = 0; i < count; i++) {
      const idx = startIdx + i;
      const bx = idx * bWidth - offsetX;
      const bh = 42 + (Math.abs(Math.sin(idx * 12.9898)) * amp * 2.2);
      for (let wy = baseY - bh + 10; wy < baseY - 12; wy += 16) {
        if ((idx + wy) % 3 !== 0) {
          ctx.fillRect(bx + 8, wy, 7, 7);
          ctx.fillRect(bx + 24, wy, 7, 7);
        }
      }
    }
  } else {
    for (let sx = 0; sx <= width + 24; sx += 24) {
      const wx = sx + offsetX;
      const hy = baseY - Math.sin(wx * freq) * amp - Math.cos(wx * freq * 0.45) * (amp * 0.55);
      ctx.lineTo(sx, hy);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawTerrainMesh(
  ctx: CanvasRenderingContext2D,
  terrain: TerrainState,
  viewLeft: number,
  viewRight: number,
  viewBottom: number
): void {
  const nodes = terrain.nodes;
  if (nodes.length < 2) return;

  const visibleNodes: { x: number; y: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.x >= viewLeft - 60 && n.x <= viewRight + 60) {
      visibleNodes.push(n);
    }
  }
  if (visibleNodes.length < 2) return;

  // 1. Deep soil strata gradient (Hill Climb Racing signature earthy cross-section!)
  const minY = Math.min(...visibleNodes.map((n) => n.y));
  const soilGrad = ctx.createLinearGradient(0, minY, 0, minY + 340);
  soilGrad.addColorStop(0, terrain.map.subSoilColor);
  soilGrad.addColorStop(0.55, shadeHex(terrain.map.subSoilColor, -22));
  soilGrad.addColorStop(1, shadeHex(terrain.map.subSoilColor, -48));

  ctx.fillStyle = soilGrad;
  ctx.beginPath();
  ctx.moveTo(visibleNodes[0].x, viewBottom);
  for (let i = 0; i < visibleNodes.length; i++) {
    ctx.lineTo(visibleNodes[i].x, visibleNodes[i].y);
  }
  ctx.lineTo(visibleNodes[visibleNodes.length - 1].x, viewBottom);
  ctx.closePath();
  ctx.fill();

  // 2. Sub-surface strata rock pocket & pebble texture
  for (let i = 0; i < terrain.pebbles.length; i++) {
    const pb = terrain.pebbles[i];
    if (pb.x < viewLeft || pb.x > viewRight) continue;
    // Find nearest node Y
    const idx = Math.floor((pb.x - terrain.firstX) / 28);
    if (idx < 0 || idx >= nodes.length) continue;
    const py = nodes[idx].y + pb.depth;
    ctx.fillStyle = pb.shade > 0.5 ? 'rgba(0, 0, 0, 0.22)' : 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.ellipse(pb.x, py, pb.r * 1.35, pb.r * 0.85, pb.shade * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Roadbed band directly beneath surface crust (gives distinct driving track thickness)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.lineWidth = 22;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(visibleNodes[0].x, visibleNodes[0].y + 13);
  for (let i = 1; i < visibleNodes.length; i++) {
    ctx.lineTo(visibleNodes[i].x, visibleNodes[i].y + 13);
  }
  ctx.stroke();

  // 4. Primary Top Surface Crust (Grass / Sand / Snow / Asphalt / Basalt)
  ctx.strokeStyle = terrain.map.surfaceColor;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(visibleNodes[0].x, visibleNodes[0].y + 5);
  for (let i = 1; i < visibleNodes.length; i++) {
    ctx.lineTo(visibleNodes[i].x, visibleNodes[i].y + 5);
  }
  ctx.stroke();

  // 5. Road center stripe on City / Industrial, or grass blades on Countryside / Forest / Jungle
  if (terrain.map.id === 'city' || terrain.map.id === 'industrial') {
    ctx.save();
    ctx.setLineDash([22, 18]);
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(visibleNodes[0].x, visibleNodes[0].y + 6);
    for (let i = 1; i < visibleNodes.length; i++) {
      ctx.lineTo(visibleNodes[i].x, visibleNodes[i].y + 6);
    }
    ctx.stroke();
    ctx.restore();
  } else if (terrain.map.id === 'countryside' || terrain.map.id === 'forest' || terrain.map.id === 'jungle') {
    ctx.strokeStyle = shadeHex(terrain.map.surfaceColor, 18);
    ctx.lineWidth = 2.5;
    for (let i = 1; i < visibleNodes.length - 1; i += 2) {
      const n = visibleNodes[i];
      ctx.beginPath();
      ctx.moveTo(n.x, n.y);
      ctx.lineTo(n.x - 3, n.y - 6);
      ctx.moveTo(n.x + 4, n.y);
      ctx.lineTo(n.x + 7, n.y - 5);
      ctx.stroke();
    }
  }

  // 6. Crisp Top Edge Highlight & Bottom Crust Outline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(visibleNodes[0].x, visibleNodes[0].y - 1);
  for (let i = 1; i < visibleNodes.length; i++) {
    ctx.lineTo(visibleNodes[i].x, visibleNodes[i].y - 1);
  }
  ctx.stroke();
}

function shadeHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (num & 255) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function drawStartBanner(ctx: CanvasRenderingContext2D, terrain: TerrainState, x: number): void {
  let y = 0;
  for (const n of terrain.nodes) {
    if (n.x >= x) {
      y = n.y;
      break;
    }
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(-3, -72, 5, 72);
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(2, -72, 42, 20);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 12px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('START', 23, -58);
  ctx.restore();
}

function drawBridges(ctx: CanvasRenderingContext2D, terrain: TerrainState, viewLeft: number, viewRight: number): void {
  for (const br of terrain.bridges) {
    if (br.xEnd < viewLeft || br.xStart > viewRight) continue;
    const plankColor = br.style === 'steel' ? '#64748B' : br.style === 'log' ? '#78350F' : '#B45309';
    const railColor = br.style === 'steel' ? '#CBD5E1' : '#92400E';

    ctx.strokeStyle = railColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(br.xStart + 6, br.yStart);
    ctx.lineTo(br.xStart + 6, br.yStart + 145);
    ctx.moveTo(br.xEnd - 6, br.yEnd);
    ctx.lineTo(br.xEnd - 6, br.yEnd + 145);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(br.xStart, br.yStart - 30);
    ctx.quadraticCurveTo((br.xStart + br.xEnd) * 0.5, (br.yStart + br.yEnd) * 0.5 + 4, br.xEnd, br.yEnd - 30);
    ctx.stroke();

    ctx.strokeStyle = plankColor;
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(br.xStart, br.yStart + 3);
    ctx.lineTo(br.xEnd, br.yEnd + 3);
    ctx.stroke();
  }
}

function drawRoadBumps(ctx: CanvasRenderingContext2D, terrain: TerrainState, viewLeft: number, viewRight: number): void {
  for (let i = 0; i < terrain.bumps.length; i++) {
    const b = terrain.bumps[i];
    if (b.x < viewLeft - 40 || b.x > viewRight + 40) continue;
    ctx.save();
    ctx.translate(b.x, b.y - b.radius * 0.35);
    if (b.kind === 'log') {
      ctx.fillStyle = '#78350F';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#D97706';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * 0.42, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.kind === 'speedbump') {
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(0, b.radius * 0.2, b.radius * 0.85, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-b.radius * 0.35, -b.radius * 0.35, b.radius * 0.7, 4);
    } else if (b.kind === 'iceblock') {
      ctx.fillStyle = '#BAE6FD';
      ctx.beginPath();
      ctx.moveTo(-b.radius, 4);
      ctx.lineTo(-b.radius * 0.4, -b.radius * 0.75);
      ctx.lineTo(b.radius * 0.5, -b.radius * 0.65);
      ctx.lineTo(b.radius, 4);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#64748B';
      ctx.beginPath();
      ctx.arc(0, 2, b.radius * 0.78, Math.PI, 0);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawSurfaceZones(ctx: CanvasRenderingContext2D, terrain: TerrainState, viewLeft: number, viewRight: number): void {
  for (const z of terrain.zones) {
    if (z.xEnd < viewLeft || z.xStart > viewRight) continue;
    ctx.strokeStyle = z.type === 'ice' ? '#BAE6FD' : z.type === 'sand' ? '#FDE68A' : '#451A03';
    ctx.lineWidth = 9;
    ctx.beginPath();
    let started = false;
    for (const n of terrain.nodes) {
      if (n.x >= z.xStart && n.x <= z.xEnd) {
        if (!started) {
          ctx.moveTo(n.x, n.y + 1);
          started = true;
        } else {
          ctx.lineTo(n.x, n.y + 1);
        }
      }
    }
    ctx.stroke();
  }
}

function drawDecor(ctx: CanvasRenderingContext2D, d: TerrainDecor, map: MapDef, timeSec: number): void {
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.scale(d.flip ? -d.scale : d.scale, d.scale);

  switch (d.kind) {
    case 'tree':
      ctx.fillStyle = '#78350F';
      ctx.fillRect(-5, -40, 10, 40);
      ctx.fillStyle = map.surfaceColor;
      ctx.beginPath();
      ctx.arc(0, -52, 23, 0, Math.PI * 2);
      ctx.arc(-15, -39, 16, 0, Math.PI * 2);
      ctx.arc(15, -39, 16, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'bush':
      ctx.fillStyle = shadeHex(map.surfaceColor, -12);
      ctx.beginPath();
      ctx.arc(-10, -8, 11, 0, Math.PI * 2);
      ctx.arc(2, -12, 14, 0, Math.PI * 2);
      ctx.arc(14, -8, 10, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'fence':
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(-18, -18, 4, 18);
      ctx.fillRect(-2, -18, 4, 18);
      ctx.fillRect(14, -18, 4, 18);
      ctx.fillRect(-20, -13, 40, 3);
      break;
    case 'pine':
      ctx.fillStyle = '#5C3A21';
      ctx.fillRect(-4, -24, 8, 24);
      ctx.fillStyle = map.id === 'arctic' ? '#E2E8F0' : '#065F46';
      for (let tier = 0; tier < 3; tier++) {
        ctx.beginPath();
        ctx.moveTo(0, -72 + tier * 16);
        ctx.lineTo(-21 + tier * 3, -39 + tier * 16);
        ctx.lineTo(21 - tier * 3, -39 + tier * 16);
        ctx.closePath();
        ctx.fill();
      }
      break;
    case 'cactus':
      ctx.fillStyle = '#15803D';
      ctx.beginPath();
      ctx.roundRect(-6, -48, 12, 48, 6);
      ctx.roundRect(-18, -36, 14, 8, 4);
      ctx.roundRect(-18, -46, 8, 16, 4);
      ctx.roundRect(4, -28, 14, 8, 4);
      ctx.roundRect(10, -40, 8, 18, 4);
      ctx.fill();
      break;
    case 'windmill':
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(-6, -64);
      ctx.lineTo(6, -64);
      ctx.lineTo(12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.arc(0, -64, 9, Math.PI, 0);
      ctx.fill();
      ctx.save();
      ctx.translate(0, -62);
      ctx.rotate(timeSec * 1.2);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-24, 0);
      ctx.lineTo(24, 0);
      ctx.moveTo(0, -24);
      ctx.lineTo(0, 24);
      ctx.stroke();
      ctx.restore();
      break;
    case 'lamp':
      ctx.fillStyle = '#475569';
      ctx.fillRect(-2, -64, 4, 64);
      ctx.fillRect(-2, -64, 16, 4);
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.arc(12, -59, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'crystal':
      ctx.fillStyle = map.accentPropColor;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-4, -36);
      ctx.lineTo(6, -24);
      ctx.lineTo(12, 0);
      ctx.closePath();
      ctx.fill();
      break;
    case 'stack':
      ctx.fillStyle = '#334155';
      ctx.fillRect(-10, -72, 20, 72);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-11, -62, 22, 7);
      break;
    case 'barrel':
      ctx.fillStyle = '#EA580C';
      ctx.fillRect(-10, -24, 20, 24);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-10, -18, 20, 4);
      ctx.fillRect(-10, -8, 20, 4);
      break;
    case 'ruin':
      ctx.fillStyle = '#57534E';
      ctx.fillRect(-14, -44, 10, 44);
      ctx.fillRect(4, -34, 10, 34);
      ctx.fillRect(-16, -48, 32, 8);
      break;
    case 'crater':
      ctx.fillStyle = '#64748B';
      ctx.beginPath();
      ctx.ellipse(0, 2, 24, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'sign':
      ctx.fillStyle = '#92400E';
      ctx.fillRect(-2, -34, 4, 34);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(-14, -46, 28, 16);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-8, -40, 16, 4);
      break;
    default:
      ctx.fillStyle = '#64748B';
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-10, -18);
      ctx.lineTo(4, -22);
      ctx.lineTo(18, 0);
      ctx.closePath();
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawRecordFlag(ctx: CanvasRenderingContext2D, terrain: TerrainState, x: number, bestMeters: number): void {
  let y = 0;
  for (const n of terrain.nodes) {
    if (n.x >= x) {
      y = n.y;
      break;
    }
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(-2, -78, 4, 78);
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.moveTo(2, -78);
  ctx.lineTo(46, -66);
  ctx.lineTo(2, -54);
  ctx.closePath();
  ctx.fill();
  ctx.font = '700 12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#FEF3C7';
  ctx.textAlign = 'left';
  ctx.fillText(`BEST ${bestMeters}m`, 8, -84);
  ctx.restore();
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, value: number, timeSec: number): void {
  const spin = Math.max(0.32, Math.abs(Math.cos(timeSec * 3.8 + x * 0.02)));
  const r = value >= 500 ? 18 : value >= 100 ? 15 : value >= 25 ? 13.5 : 12;
  const fill = value >= 500 ? '#F43F5E' : value >= 100 ? '#F97316' : value >= 25 ? '#FACC15' : '#FBBF24';
  const rim = value >= 500 ? '#FDA4AF' : '#FEF08A';

  ctx.save();
  ctx.translate(x, y);

  // Warm ambient coin glow
  ctx.fillStyle = value >= 500 ? 'rgba(244, 63, 94, 0.25)' : 'rgba(250, 204, 21, 0.22)';
  ctx.beginPath();
  ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(spin, 1);

  // Outer coin rim
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = rim;
  ctx.stroke();

  // Inner embossed ring
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();

  // Specular glint
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.arc(-r * 0.28, -r * 0.28, r * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = value >= 500 ? '#FFFFFF' : '#78350F';
  ctx.font = `800 ${Math.round(r * 0.92)}px "Barlow Condensed", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(value), 0, 1);
  ctx.restore();
}

function drawFuelCan(ctx: CanvasRenderingContext2D, x: number, y: number, timeSec: number): void {
  const pulse = 1 + Math.sin(timeSec * 5) * 0.05;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);

  ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#DC2626';
  ctx.beginPath();
  ctx.roundRect(-13, -15, 26, 30, 5);
  ctx.fill();
  ctx.strokeStyle = '#FCA5A5';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FACC15';
  ctx.fillRect(-10, -21, 7, 6);
  ctx.fillStyle = '#7F1D1D';
  ctx.fillRect(2, -11, 7, 5);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 13px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FUEL', 0, 4);

  ctx.restore();
}

export function drawVehicleFromSim(ctx: CanvasRenderingContext2D, sim: VehicleSim): void {
  const { vehicle, stats } = sim;
  const cosA = Math.cos(sim.angle);
  const sinA = Math.sin(sim.angle);

  const rearMountX = sim.x + sim.rearWheel.offsetX * cosA - sim.rearWheel.restY * sinA;
  const rearMountY = sim.y + sim.rearWheel.offsetX * sinA + sim.rearWheel.restY * cosA;
  const frontMountX = sim.x + sim.frontWheel.offsetX * cosA - sim.frontWheel.restY * sinA;
  const frontMountY = sim.y + sim.frontWheel.offsetX * sinA + sim.frontWheel.restY * cosA;

  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(rearMountX, rearMountY);
  ctx.lineTo(sim.rearWheel.worldX, sim.rearWheel.worldY);
  ctx.moveTo(frontMountX, frontMountY);
  ctx.lineTo(sim.frontWheel.worldX, sim.frontWheel.worldY);
  ctx.stroke();

  ctx.save();
  ctx.translate(sim.x, sim.y);
  ctx.rotate(sim.angle);

  // Subtle headlight beam on dusk/dark maps
  if (
    sim.map.id === 'moon' ||
    sim.map.id === 'arctic' ||
    sim.map.id === 'volcano' ||
    sim.map.id === 'city' ||
    sim.map.id === 'industrial'
  ) {
    const beamX = vehicle.chassisLength * 0.45;
    const beamGrad = ctx.createLinearGradient(beamX, 0, beamX + 210, 0);
    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
    beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(beamX, -6);
    ctx.lineTo(beamX + 210, -48);
    ctx.lineTo(beamX + 210, 42);
    ctx.closePath();
    ctx.fill();
  }

  drawDriver(ctx, vehicle.driverOffsetX, vehicle.driverOffsetY + sim.driverHeadBob, vehicle.accentColor, sim.scarfPhase);
  drawVehicleBody(ctx, vehicle);
  ctx.restore();

  if (vehicle.id === 'snow_vehicle') {
    drawWheel(ctx, sim.rearWheel.worldX, sim.rearWheel.worldY, stats.wheelRadius, sim.rearWheel.rotation, vehicle);
    drawSnowSki(ctx, sim.frontWheel.worldX, sim.frontWheel.worldY + stats.wheelRadius * 0.55, sim.angle, vehicle.accentColor);
  } else {
    drawWheel(ctx, sim.rearWheel.worldX, sim.rearWheel.worldY, stats.wheelRadius, sim.rearWheel.rotation, vehicle);
    drawWheel(ctx, sim.frontWheel.worldX, sim.frontWheel.worldY, stats.wheelRadius, sim.frontWheel.rotation, vehicle);
  }
}

export function renderVehicleStandalone(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  vehicle: VehicleDef,
  wheelRadius: number,
  wheelBase: number,
  timeSec: number
): void {
  ctx.clearRect(0, 0, width, height);

  const cx = width * 0.5;
  const cy = height * 0.62;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + wheelRadius + 14, vehicle.chassisLength * 0.65, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const bounce = Math.sin(timeSec * 4.2) * 1.8;
  const halfBase = wheelBase * 0.5;
  const wheelY = cy + vehicle.chassisHeight * 0.36;

  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - halfBase, cy + bounce);
  ctx.lineTo(cx - halfBase, wheelY);
  ctx.moveTo(cx + halfBase, cy + bounce);
  ctx.lineTo(cx + halfBase, wheelY);
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, cy + bounce);
  drawDriver(ctx, vehicle.driverOffsetX, vehicle.driverOffsetY, vehicle.accentColor, timeSec * 5);
  drawVehicleBody(ctx, vehicle);
  ctx.restore();

  const spin = timeSec * 4.5;
  if (vehicle.id === 'snow_vehicle') {
    drawWheel(ctx, cx - halfBase, wheelY, wheelRadius, spin, vehicle);
    drawSnowSki(ctx, cx + halfBase, wheelY + wheelRadius * 0.55, 0, vehicle.accentColor);
  } else {
    drawWheel(ctx, cx - halfBase, wheelY, wheelRadius, spin, vehicle);
    drawWheel(ctx, cx + halfBase, wheelY, wheelRadius, spin, vehicle);
  }
}

function drawDriver(
  ctx: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  accentColor: string,
  scarfPhase: number
): void {
  ctx.save();
  ctx.translate(dx, dy);

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-4, 4);
  ctx.quadraticCurveTo(-16, 2 + Math.sin(scarfPhase) * 4, -26, 5 + Math.cos(scarfPhase * 1.3) * 5);
  ctx.stroke();

  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.roundRect(-8, 2, 16, 18, 5);
  ctx.fill();

  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(0, -6, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = accentColor;
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(1, -10, 10, 7, 3);
  ctx.fill();

  ctx.restore();
}

function drawVehicleBody(ctx: CanvasRenderingContext2D, v: VehicleDef): void {
  const hw = v.chassisLength * 0.5;
  const hh = v.chassisHeight * 0.5;

  switch (v.id) {
    case 'dirt_bike': {
      ctx.fillStyle = v.primaryColor;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.85, 2);
      ctx.lineTo(-hw * 0.2, -hh * 0.85);
      ctx.lineTo(hw * 0.55, -hh * 0.75);
      ctx.lineTo(hw * 0.9, 2);
      ctx.lineTo(hw * 0.25, hh * 0.45);
      ctx.lineTo(-hw * 0.65, hh * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(hw * 0.4, -hh * 0.7);
      ctx.lineTo(hw * 0.58, -hh * 1.35);
      ctx.stroke();
      break;
    }
    case 'sports_car': {
      ctx.fillStyle = v.primaryColor;
      ctx.beginPath();
      ctx.moveTo(-hw, hh * 0.4);
      ctx.lineTo(-hw * 0.92, -hh * 0.55);
      ctx.lineTo(-hw * 0.25, -hh * 1.15);
      ctx.lineTo(hw * 0.35, -hh * 1.0);
      ctx.lineTo(hw * 0.98, -hh * 0.15);
      ctx.lineTo(hw, hh * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = v.secondaryColor;
      ctx.fillRect(-hw * 0.98, -hh * 1.1, 14, 5);
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.moveTo(hw * 0.15, -hh * 0.95);
      ctx.lineTo(hw * 0.55, -hh * 0.35);
      ctx.lineTo(hw * 0.12, -hh * 0.35);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'heavy_truck': {
      ctx.fillStyle = v.secondaryColor;
      ctx.beginPath();
      ctx.roundRect(-hw, -hh * 0.8, hw * 1.15, hh * 1.3, 4);
      ctx.fill();
      ctx.fillStyle = v.primaryColor;
      ctx.beginPath();
      ctx.roundRect(hw * 0.12, -hh * 1.25, hw * 0.85, hh * 1.75, 6);
      ctx.fill();
      ctx.fillStyle = '#93C5FD';
      ctx.fillRect(hw * 0.45, -hh * 1.05, hw * 0.4, hh * 0.65);
      ctx.fillStyle = v.accentColor;
      ctx.fillRect(-hw + 4, 0, hw * 1.9, 5);
      break;
    }
    case 'pickup_truck': {
      ctx.fillStyle = v.primaryColor;
      ctx.beginPath();
      ctx.roundRect(-hw, -hh * 0.35, hw * 2, hh * 0.95, 5);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(-hw * 0.1, -hh * 1.25, hw * 0.72, hh * 1.0, 5);
      ctx.fill();
      ctx.fillStyle = '#BAE6FD';
      ctx.fillRect(hw * 0.15, -hh * 1.05, hw * 0.38, hh * 0.62);
      break;
    }
    case 'racing_buggy':
    case 'super_offroad': {
      ctx.fillStyle = v.primaryColor;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.92, hh * 0.45);
      ctx.lineTo(-hw * 0.72, -hh * 0.55);
      ctx.lineTo(hw * 0.88, -hh * 0.35);
      ctx.lineTo(hw * 0.95, hh * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = v.accentColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.55, -hh * 0.45);
      ctx.lineTo(-hw * 0.25, -hh * 1.35);
      ctx.lineTo(hw * 0.35, -hh * 1.2);
      ctx.lineTo(hw * 0.62, -hh * 0.35);
      ctx.stroke();
      break;
    }
    case 'futuristic_rover': {
      ctx.fillStyle = v.primaryColor;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.95, hh * 0.35);
      ctx.lineTo(-hw * 0.75, -hh * 0.85);
      ctx.lineTo(hw * 0.45, -hh * 0.95);
      ctx.lineTo(hw * 1.02, -hh * 0.1);
      ctx.lineTo(hw * 0.85, hh * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#22D3EE';
      ctx.beginPath();
      ctx.ellipse(hw * 0.15, -hh * 0.55, hw * 0.42, hh * 0.35, 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(-hw * 1.02, -6, 10, 12);
      break;
    }
    default: {
      ctx.fillStyle = v.primaryColor;
      ctx.beginPath();
      ctx.roundRect(-hw, -hh * 0.65, hw * 2, hh * 1.15, 7);
      ctx.fill();
      ctx.strokeStyle = v.secondaryColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.55, -hh * 0.65);
      ctx.lineTo(-hw * 0.42, -hh * 1.35);
      ctx.lineTo(hw * 0.32, -hh * 1.35);
      ctx.lineTo(hw * 0.52, -hh * 0.65);
      ctx.stroke();
      ctx.fillStyle = v.accentColor;
      ctx.fillRect(-hw + 6, -2, hw * 1.85, 5);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(hw - 6, -hh * 0.4, 7, 9);
      break;
    }
  }
}

function drawWheel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rotation: number,
  vehicle: VehicleDef
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.fillStyle = vehicle.id === 'futuristic_rover' ? '#0F172A' : '#111827';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = vehicle.id === 'futuristic_rover' ? '#22D3EE' : '#334155';
  ctx.lineWidth = 3;
  const lugs = 8;
  for (let i = 0; i < lugs; i++) {
    const a = (i / lugs) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (radius - 4), Math.sin(a) * (radius - 4));
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    ctx.stroke();
  }

  ctx.fillStyle = vehicle.id === 'futuristic_rover' ? '#06B6D4' : '#CBD5E1';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.52, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * (radius * 0.48), Math.sin(a) * (radius * 0.48));
    ctx.stroke();
  }

  ctx.fillStyle = vehicle.accentColor;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawSnowSki(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, accent: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(18, 0);
  ctx.quadraticCurveTo(26, -1, 28, -9);
  ctx.stroke();
  ctx.restore();
}

function drawAmbientWeather(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  map: MapDef,
  timeSec: number
): void {
  ctx.save();
  if (map.ambientParticle === 'snow') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    for (let i = 0; i < 36; i++) {
      const sx = ((i * 139 + timeSec * (28 + (i % 4) * 10)) % width + width) % width;
      const sy = ((i * 73 + timeSec * (45 + (i % 5) * 14)) % height + height) % height;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (map.ambientParticle === 'rain') {
    ctx.strokeStyle = 'rgba(167, 243, 208, 0.38)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      const rx = ((i * 113 - timeSec * 120) % width + width) % width;
      const ry = ((i * 83 + timeSec * 420) % height + height) % height;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 5, ry + 14);
      ctx.stroke();
    }
  } else if (map.ambientParticle === 'embers' || map.ambientParticle === 'sparks') {
    ctx.fillStyle = map.ambientParticle === 'embers' ? 'rgba(251, 146, 60, 0.75)' : 'rgba(250, 204, 21, 0.7)';
    for (let i = 0; i < 24; i++) {
      const ex = ((i * 173 + Math.sin(timeSec + i) * 30) % width + width) % width;
      const ey = ((height - ((i * 61 + timeSec * 65) % height)) + height) % height;
      ctx.beginPath();
      ctx.arc(ex, ey, 1.8 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

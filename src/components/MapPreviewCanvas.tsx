import React, { useEffect, useRef } from 'react';
import { MapDef } from '../types/game';

interface MapPreviewCanvasProps {
  map: MapDef;
  className?: string;
}

export const MapPreviewCanvas: React.FC<MapPreviewCanvasProps> = ({ map, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(200, Math.floor(rect.width || 240));
    const h = Math.max(96, Math.floor(rect.height || 110));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, map.skyTop);
    sky.addColorStop(1, map.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Sun / Planet
    ctx.fillStyle = map.sunColor;
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.28, 13, 0, Math.PI * 2);
    ctx.fill();

    // Far hills
    ctx.fillStyle = map.farHillColor;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 12) {
      const y = h * 0.6 - Math.sin(x * 0.03 + map.roughness) * 14;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Foreground terrain profile
    ctx.fillStyle = map.subSoilColor;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      const y = h * 0.74 - Math.sin(x * 0.055) * (9 * map.roughness);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = map.surfaceColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = h * 0.74 - Math.sin(x * 0.055) * (9 * map.roughness);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [map]);

  return <canvas ref={canvasRef} className={`block w-full h-full ${className}`} />;
};

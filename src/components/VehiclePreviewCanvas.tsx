import React, { useEffect, useRef } from 'react';
import { renderVehicleStandalone } from '../engine/renderer';
import { VehicleDef } from '../types/game';

interface VehiclePreviewCanvasProps {
  vehicle: VehicleDef;
  wheelRadius: number;
  wheelBase: number;
  className?: string;
}

export const VehiclePreviewCanvas: React.FC<VehiclePreviewCanvasProps> = ({
  vehicle,
  wheelRadius,
  wheelBase,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let rafId = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const targetW = Math.floor(rect.width * dpr);
        const targetH = Math.floor(rect.height * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          renderVehicleStandalone(ctx, rect.width, rect.height, vehicle, wheelRadius, wheelBase, (now - start) / 1000);
          ctx.restore();
        }
      }
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [vehicle, wheelRadius, wheelBase]);

  return <canvas ref={canvasRef} className={`block w-full h-full ${className}`} />;
};

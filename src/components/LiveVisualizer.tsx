import React, { useEffect, useRef } from 'react';
import { ColorBlindMode } from '../types/sound';
import { Activity, BarChart2 } from 'lucide-react';

interface LiveVisualizerProps {
  frequencyData: Uint8Array | null;
  timeDomainData: Uint8Array | null;
  decibels: number;
  isListening: boolean;
  colorBlindMode: ColorBlindMode;
}

export const LiveVisualizer: React.FC<LiveVisualizerProps> = ({
  frequencyData,
  timeDomainData,
  decibels,
  isListening,
  colorBlindMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (!isListening) {
      // Idle line
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    // Draw Frequency Bars
    if (frequencyData && frequencyData.length > 0) {
      const barCount = 48;
      const barWidth = width / barCount;
      const step = Math.floor(frequencyData.length / barCount);

      for (let i = 0; i < barCount; i++) {
        const val = frequencyData[i * step] || 0;
        const percent = val / 255;
        const barHeight = Math.max(3, percent * (height * 0.75));
        const x = i * barWidth;
        const y = height - barHeight;

        // Choose palette based on colorBlindMode
        let fillStyle = 'rgba(16, 185, 129, 0.7)';
        if (colorBlindMode === 'monochrome') {
          fillStyle = percent > 0.6 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(160, 160, 160, 0.5)';
        } else if (colorBlindMode === 'protanopia') {
          fillStyle = percent > 0.6 ? 'rgba(59, 130, 246, 0.9)' : 'rgba(251, 191, 36, 0.7)';
        } else if (percent > 0.75) {
          fillStyle = 'rgba(239, 68, 68, 0.9)'; // Loud / high frequency
        } else if (percent > 0.45) {
          fillStyle = 'rgba(245, 158, 11, 0.8)'; // Moderate
        }

        ctx.fillStyle = fillStyle;
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
      }
    }

    // Draw Smooth Waveform Oscilloscope overlay
    if (timeDomainData && timeDomainData.length > 0) {
      ctx.lineWidth = 2;
      ctx.strokeStyle =
        colorBlindMode === 'monochrome'
          ? '#ffffff'
          : colorBlindMode === 'protanopia'
          ? '#60a5fa'
          : '#34d399';
      ctx.beginPath();

      const sliceWidth = width / timeDomainData.length;
      let x = 0;

      for (let i = 0; i < timeDomainData.length; i++) {
        const v = timeDomainData[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.stroke();
    }
  }, [frequencyData, timeDomainData, isListening, colorBlindMode]);

  const getDbColor = (db: number) => {
    if (colorBlindMode === 'monochrome') return 'text-white bg-neutral-800';
    if (colorBlindMode === 'protanopia') {
      if (db >= 80) return 'text-blue-400 bg-blue-950/80 border-blue-500';
      if (db >= 65) return 'text-amber-400 bg-amber-950/80 border-amber-500';
      return 'text-neutral-300 bg-neutral-800 border-neutral-700';
    }
    if (db >= 80) return 'text-red-400 bg-red-950/80 border-red-500';
    if (db >= 65) return 'text-amber-400 bg-amber-950/80 border-amber-500';
    return 'text-emerald-400 bg-emerald-950/80 border-emerald-600/50';
  };

  return (
    <div className="flex flex-col bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
            Acoustic Spectrum & Waveform
          </span>
        </div>

        {/* Decibel Meter Pill */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold shadow-sm ${getDbColor(
            decibels
          )}`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>{decibels} dB</span>
          <span className="text-[10px] font-normal opacity-80">
            {decibels > 80 ? 'CRITICAL' : decibels > 65 ? 'ATTENTION' : 'NORMAL'}
          </span>
        </div>
      </div>

      <div className="relative w-full h-24 sm:h-28 rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={600}
          height={140}
          className="w-full h-full object-cover"
        />

        {!isListening && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
              Audio Sensor Suspended
            </span>
          </div>
        )}
      </div>

      {/* dB Gauge Bar */}
      <div className="mt-2.5">
        <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden flex">
          <div
            className={`h-full transition-all duration-100 ${
              decibels > 80 ? 'bg-red-500' : decibels > 65 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, (decibels - 30) * 1.4))}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-neutral-500 mt-1">
          <span>30 dB (Quiet)</span>
          <span>65 dB (Conversation)</span>
          <span>90+ dB (Alarm)</span>
        </div>
      </div>
    </div>
  );
};

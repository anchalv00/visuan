import React from 'react';
import { ColorBlindMode, DirectionCue, SoundAlert } from '../types/sound';
import { getUrgencyTheme } from '../utils/theme';
import { Compass, Volume2 } from 'lucide-react';

interface AudioRadarProps {
  currentAlert: SoundAlert | null;
  estimatedDirection: DirectionCue;
  colorBlindMode: ColorBlindMode;
  isListening: boolean;
  decibels: number;
}

export const AudioRadar: React.FC<AudioRadarProps> = ({
  currentAlert,
  estimatedDirection,
  colorBlindMode,
  isListening,
  decibels,
}) => {
  const activeDirection = currentAlert ? currentAlert.direction_cue : estimatedDirection;

  // Determine angle and coordinates on radar circle
  const getDirectionCoordinates = (dir: DirectionCue) => {
    switch (dir) {
      case 'left':
        return { x: 22, y: 50, label: 'LEFT', angle: -90 };
      case 'right':
        return { x: 78, y: 50, label: 'RIGHT', angle: 90 };
      case 'behind':
        return { x: 50, y: 78, label: 'BEHIND', angle: 180 };
      case 'approaching':
        return { x: 50, y: 34, label: 'APPROACHING', angle: 0 };
      case 'omni':
        return { x: 50, y: 50, label: 'OMNI', angle: 0 };
      case 'center':
      default:
        return { x: 50, y: 22, label: 'FRONT', angle: 0 };
    }
  };

  const coords = getDirectionCoordinates(activeDirection);
  const theme = currentAlert ? getUrgencyTheme(currentAlert.urgency, colorBlindMode) : null;

  return (
    <div className="relative flex flex-col items-center justify-center p-4 bg-neutral-900/80 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header Info */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
            360° Directional Radar
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-mono text-neutral-400">
            <Volume2 className="w-3.5 h-3.5 text-neutral-500" />
            {decibels} dB
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isListening ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'
            }`}
          />
        </div>
      </div>

      {/* Circular Radar HUD */}
      <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-neutral-700/80 bg-neutral-950 flex items-center justify-center shadow-inner overflow-hidden">
        {/* Animated Radar Sweep Line (when listening) */}
        {isListening && (
          <div
            className="absolute inset-0 origin-center pointer-events-none opacity-40 animate-[spin_4s_linear_infinite]"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(16, 185, 129, 0.4) 360deg)',
            }}
          />
        )}

        {/* Concentric Range Rings */}
        <div className="absolute w-44 h-44 sm:w-48 sm:h-48 rounded-full border border-neutral-800/80" />
        <div className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full border border-neutral-800/80" />
        <div className="absolute w-14 h-14 rounded-full border border-neutral-800" />

        {/* Crosshairs */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-neutral-800" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-neutral-800" />

        {/* Cardinal Direction Markers */}
        <span className="absolute top-2 text-[10px] font-black text-neutral-400 tracking-wider">
          FRONT
        </span>
        <span className="absolute bottom-2 text-[10px] font-black text-neutral-500 tracking-wider">
          REAR
        </span>
        <span className="absolute left-2 text-[10px] font-black text-neutral-500 tracking-wider">
          L
        </span>
        <span className="absolute right-2 text-[10px] font-black text-neutral-500 tracking-wider">
          R
        </span>

        {/* Center User Point */}
        <div className="z-10 flex flex-col items-center justify-center">
          <div className="w-5 h-5 rounded-full bg-neutral-800 border-2 border-neutral-500 flex items-center justify-center shadow-sm">
            <div className="w-2 h-2 rounded-full bg-neutral-300" />
          </div>
          <span className="text-[9px] font-mono text-neutral-500 mt-0.5">YOU</span>
        </div>

        {/* Active Sound Blip */}
        {isListening && (
          <div
            className="absolute transition-all duration-300 z-20 flex flex-col items-center"
            style={{
              left: `${coords.x}%`,
              top: `${coords.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Blip Halo Ping */}
            <div
              className={`w-9 h-9 rounded-full animate-ping absolute opacity-60 ${
                theme ? theme.badgeBg : 'bg-emerald-500'
              }`}
            />
            {/* Blip Core */}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${
                theme ? `${theme.badgeBg} text-white` : 'bg-emerald-500 text-black'
              }`}
            >
              <span className="text-[10px] font-black">{theme ? theme.symbol : '●'}</span>
            </div>
            {/* Direction Tag */}
            <span
              className={`mt-1 px-1.5 py-0.5 rounded text-[9px] font-black tracking-widest whitespace-nowrap shadow-md ${
                theme ? `${theme.badgeBg} ${theme.badgeText}` : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              {coords.label}
            </span>
          </div>
        )}
      </div>

      {/* Stereo Balance Footnote */}
      <div className="w-full flex items-center justify-between text-xs text-neutral-400 mt-3 pt-2 border-t border-neutral-800/80">
        <span className="text-[11px] font-mono">
          Stereo Phase: <span className="text-white font-bold">{activeDirection.toUpperCase()}</span>
        </span>
        <span className="text-[11px] font-mono text-neutral-400">
          Target: {currentAlert ? currentAlert.sound_name : 'Monitoring...'}
        </span>
      </div>
    </div>
  );
};

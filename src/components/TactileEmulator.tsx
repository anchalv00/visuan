import React, { useEffect, useState } from 'react';
import { HapticPattern } from '../types/sound';
import { subscribeToHaptics } from '../services/haptics';
import { Vibrate } from 'lucide-react';

export const TactileEmulator: React.FC = () => {
  const [activePattern, setActivePattern] = useState<HapticPattern | null>(null);
  const [pulseIndices, setPulseIndices] = useState<number[]>([]);
  const [isVibrating, setIsVibrating] = useState(false);

  useEffect(() => {
    return subscribeToHaptics((pattern, durations) => {
      setActivePattern(pattern);
      setIsVibrating(true);
      setPulseIndices(durations);

      const totalDuration = durations.reduce((a, b) => a + b, 0);
      const timer = setTimeout(() => {
        setIsVibrating(false);
      }, Math.max(500, totalDuration + 200));

      return () => clearTimeout(timer);
    });
  }, []);

  if (!isVibrating && !activePattern) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border shadow-2xl backdrop-blur-md transition-all duration-300 ${
        isVibrating
          ? 'bg-neutral-900/95 border-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.5)] translate-y-0 scale-100'
          : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 translate-y-2 opacity-0 pointer-events-none'
      }`}
    >
      <div className={`p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 ${isVibrating ? 'animate-bounce' : ''}`}>
        <Vibrate className="w-4 h-4" />
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black tracking-wider uppercase text-emerald-400">
            HAPTIC PULSE
          </span>
          <span className="text-[10px] font-mono text-neutral-300">
            {activePattern?.replace('_', ' ')}
          </span>
        </div>

        {/* Pulse Duration Rhythm Bars */}
        <div className="flex items-center gap-1 mt-1">
          {pulseIndices.slice(0, 6).map((dur, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i % 2 === 0 ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-700'
              }`}
              style={{ width: `${Math.min(32, Math.max(6, dur / 12))}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

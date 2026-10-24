import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { SoundAlert } from '../types/sound';

interface MicrophoneControllerProps {
  isListening: boolean;
  statusMessage?: string;
  currentAlert?: SoundAlert | null;
  onToggleListening: () => void;
  decibels?: number;
}

export const MicrophoneController: React.FC<MicrophoneControllerProps> = ({
  isListening,
  statusMessage,
  currentAlert,
  onToggleListening,
  decibels = 0,
}) => {
  // Calculate subtle dynamic scale based on real-time decibels when listening
  const soundScale = isListening ? Math.min(1.1, 1 + (Math.max(0, decibels - 30) / 100) * 0.15) : 1;

  return (
    <div className="flex flex-col items-center justify-center select-none text-center px-4">
      {/* Central Interactive Listen Button */}
      <div className="relative flex items-center justify-center">
        {/* Animated concentric ripples during active listening */}
        {isListening && (
          <>
            <div
              className="absolute -inset-6 sm:-inset-8 rounded-full border border-emerald-400/30 animate-ping pointer-events-none"
              style={{ animationDuration: '2.5s' }}
            />
            <div
              className="absolute -inset-12 sm:-inset-16 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none transition-all duration-300"
              style={{ transform: `scale(${soundScale})` }}
            />
            <div
              className="absolute -inset-3 sm:-inset-4 rounded-full border border-emerald-500/20 animate-pulse pointer-events-none"
            />
          </>
        )}

        <button
          type="button"
          onClick={onToggleListening}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
          style={{ transform: `scale(${soundScale})` }}
          className={`relative group flex flex-col items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/40 active:scale-95 cursor-pointer ${
            isListening
              ? 'w-48 h-48 sm:w-56 sm:h-56 bg-stone-900 text-white shadow-[0_20px_50px_-12px_rgba(16,185,129,0.25)] border-2 border-stone-800'
              : 'w-48 h-48 sm:w-56 sm:h-56 bg-white text-stone-800 border border-stone-200/90 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.08),0_4px_16px_-2px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_48px_-6px_rgba(0,0,0,0.12),0_6px_20px_-2px_rgba(0,0,0,0.05)] hover:border-stone-300'
          }`}
        >
          {isListening ? (
            <div className="flex flex-col items-center justify-center gap-2">
              <Mic
                className="w-16 h-16 sm:w-20 sm:h-20 text-emerald-400 transition-transform duration-150"
                strokeWidth={1.8}
              />
              <span className="text-xs sm:text-sm font-bold tracking-widest text-emerald-300/90 uppercase">
                STOP
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              <MicOff
                className="w-16 h-16 sm:w-20 sm:h-20 text-stone-400 group-hover:text-stone-700 transition-colors duration-200"
                strokeWidth={1.75}
              />
              <span className="text-xs sm:text-sm font-semibold tracking-widest text-stone-500 group-hover:text-stone-800 uppercase transition-colors">
                LISTEN
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Minimal Status Feedback */}
      <div className="mt-8 flex flex-col items-center gap-2 max-w-sm">
        {isListening ? (
          <div className="flex flex-col items-center gap-1.5 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Listening to ambient sounds</span>
            </div>

            {currentAlert ? (
              <p className="text-xs text-stone-600 font-medium bg-white/80 border border-stone-200 px-3 py-1 rounded-full shadow-sm mt-1 animate-in fade-in slide-in-from-bottom-1">
                Detected: <span className="font-semibold text-stone-900">{currentAlert.sound_name}</span>
              </p>
            ) : (
              <p className="text-xs text-stone-400">
                {statusMessage || 'Tap the button anytime to stop'}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center text-stone-400 text-sm font-medium">
            Tap to listen
          </div>
        )}
      </div>
    </div>
  );
};

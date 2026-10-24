import React from 'react';
import { Mic, Square } from 'lucide-react';

interface ListenButtonProps {
  onStartListening: () => void;
  statusMessage?: string;
}

export const ListenButton: React.FC<ListenButtonProps> = ({
  onStartListening,
  statusMessage,
}) => {
  return (
    <div className="flex flex-col items-center justify-center select-none text-center px-4 animate-in fade-in duration-300">
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          onClick={onStartListening}
          aria-label="Start listening to ambient sounds"
          className="relative group w-48 h-48 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center bg-white text-stone-800 border border-stone-200/90 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.08),0_4px_16px_-2px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_48px_-6px_rgba(0,0,0,0.12),0_6px_20px_-2px_rgba(0,0,0,0.05)] hover:border-stone-300 hover:scale-[1.02] active:scale-95 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/40 cursor-pointer"
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <Mic
              className="w-16 h-16 sm:w-20 sm:h-20 text-stone-700 group-hover:text-emerald-600 transition-colors duration-200"
              strokeWidth={1.75}
            />
            <span className="text-xs sm:text-sm font-bold tracking-widest text-stone-500 group-hover:text-stone-900 uppercase transition-colors">
              LISTEN
            </span>
          </div>
        </button>
      </div>

      <p className="mt-6 text-sm font-medium text-stone-500">
        {statusMessage || 'Tap to start listening'}
      </p>
    </div>
  );
};

interface StopOvalButtonProps {
  onStopListening: () => void;
}

export const StopOvalButton: React.FC<StopOvalButtonProps> = ({
  onStopListening,
}) => {
  return (
    <button
      type="button"
      onClick={onStopListening}
      aria-label="Stop listening"
      className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white shadow-md hover:shadow-lg transition-all border border-red-500 cursor-pointer group focus:outline-none focus-visible:ring-4 focus-visible:ring-red-400"
    >
      <Square className="w-3.5 h-3.5 fill-white text-white group-hover:scale-90 transition-transform" />
      <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
        Stop
      </span>
      <span className="w-2 h-2 rounded-full bg-white/90 animate-pulse ml-0.5" />
    </button>
  );
};

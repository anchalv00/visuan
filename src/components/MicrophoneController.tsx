/**
 * @file MicrophoneController.tsx
 * @description Primary Microphone Action Controls (`ListenButton` and `StopOvalButton`).
 *
 * How this file relates to the app's design & functionality:
 * - `ListenButton` forms the centerpiece of the first intro screen (`!isListening`).
 *   It pairs the bold `visuan` wordmark and simple accessibility mission statement with
 *   an oversized, high-contrast circular button that anyone can immediately understand and tap.
 * - `StopOvalButton` lives in the center of the top header bar on the second screen (`isListening`)
 *   so users can immediately stop audio capture at any time.
 * - Both components adapt their hover, border, and fill colors when `colorBlindMode` is active.
 */

import React from 'react';
import { Mic, Square } from 'lucide-react';

interface ListenButtonProps {
  /** Triggered when the user taps the circular "Listen" button on the home screen */
  onStartListening: () => void;
  /** Switches accent colors from Emerald to Sky Blue for colorblind accessibility */
  colorBlindMode?: boolean;
}

/**
 * Home screen hero component displaying the `visuan` title, simple subtitle,
 * and the primary circular "Listen" button.
 */
export const ListenButton: React.FC<ListenButtonProps> = ({
  onStartListening,
  colorBlindMode = false,
}) => {
  return (
    <div className="w-full max-w-xl flex flex-col items-center justify-center select-none text-center px-6 py-12 animate-in fade-in duration-300">
      {/* App Title: visuan */}
      <h1 className="text-6xl sm:text-7xl font-black tracking-tighter text-stone-900 mb-4">
        visuan
      </h1>

      {/* Simple, welcoming accessibility mission subtitle */}
      <p className="text-base sm:text-lg text-stone-600 max-w-md leading-relaxed mb-12 font-normal">
        The tool to make life more accessible for deaf and hard of hearing individuals.
      </p>

      {/* Main Action: Oversized Circular Listen Button */}
      <div className="relative flex flex-col items-center justify-center">
        <button
          type="button"
          onClick={onStartListening}
          aria-label="Start listening to ambient sounds"
          className={`relative group w-44 h-44 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center bg-white text-stone-900 border-2 shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-95 transition-all duration-200 focus:outline-none cursor-pointer ${
            colorBlindMode
              ? 'border-stone-300 hover:border-sky-600 focus-visible:ring-4 focus-visible:ring-sky-600/30'
              : 'border-stone-200 hover:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/30'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-3">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                colorBlindMode
                  ? 'bg-stone-100 group-hover:bg-sky-50'
                  : 'bg-stone-100 group-hover:bg-emerald-50'
              }`}
            >
              <Mic
                className={`w-8 h-8 transition-colors duration-200 ${
                  colorBlindMode
                    ? 'text-stone-800 group-hover:text-sky-700'
                    : 'text-stone-800 group-hover:text-emerald-600'
                }`}
                strokeWidth={2}
              />
            </div>
            <span className="text-sm font-bold tracking-widest text-stone-800 uppercase">
              Listen
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};

interface StopOvalButtonProps {
  /** Triggered when the user taps "Stop" in the active listening header */
  onStopListening: () => void;
  /** Uses high-contrast Orange instead of Red when Colorblind Mode is enabled */
  colorBlindMode?: boolean;
}

/**
 * Compact pill button displayed in the top navigation bar while listening is active.
 * Stops microphone capture and returns the user to the intro screen.
 */
export const StopOvalButton: React.FC<StopOvalButtonProps> = ({
  onStopListening,
  colorBlindMode = false,
}) => {
  return (
    <button
      type="button"
      onClick={onStopListening}
      aria-label="Stop listening"
      className={`inline-flex items-center gap-2 px-5 py-2 rounded-full active:scale-95 text-white shadow-sm transition-all cursor-pointer focus:outline-none whitespace-nowrap shrink-0 ${
        colorBlindMode
          ? 'bg-orange-600 hover:bg-orange-700 border border-orange-700 focus-visible:ring-4 focus-visible:ring-orange-400'
          : 'bg-red-600 hover:bg-red-700 border border-red-600 focus-visible:ring-4 focus-visible:ring-red-400'
      }`}
    >
      <Square className="w-3.5 h-3.5 fill-white text-white" />
      <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
        Stop
      </span>
    </button>
  );
};

import React from 'react';
import { MicSensitivity } from '../types/sound';
import { Check, Mic, SlidersHorizontal, X, Volume2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sensitivity: MicSensitivity;
  onSelectSensitivity: (sensitivity: MicSensitivity) => void;
  currentDecibels?: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  sensitivity,
  onSelectSensitivity,
  currentDecibels = 0,
}) => {
  if (!isOpen) return null;

  const options: {
    id: MicSensitivity;
    title: string;
    badge?: string;
    description: string;
    idealFor: string;
  }[] = [
    {
      id: 'high',
      title: 'High Sensitivity',
      badge: 'Sensitive',
      description:
        'Detects softer acoustic events like gentle door knocking, distant timers, quiet baby whimpering, and bicycle bells.',
      idealFor: 'Quiet rooms, home offices, and nighttime monitoring.',
    },
    {
      id: 'medium',
      title: 'Medium Sensitivity',
      badge: 'Recommended',
      description:
        'Balanced baseline for typical living spaces. Captures standard door knocks, kitchen timers, crying, alarms, and car honks.',
      idealFor: 'Standard household environments.',
    },
    {
      id: 'low',
      title: 'Low Sensitivity',
      badge: 'Noisy Rooms',
      description:
        'Reduces sensitivity to avoid false alerts in busy areas. Only triggers on loud sirens, smoke alarms, emergency alarms, and heavy honks.',
      idealFor: 'Cafes, busy streets, or noisy apartments.',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 id="settings-title" className="text-base font-bold text-stone-900">
                Microphone Settings
              </h2>
              <p className="text-xs text-stone-500">
                Adjust detection threshold for your environment
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Sensitivity Radio Cards */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
              Microphone Sensitivity Level
            </label>

            {options.map((opt) => {
              const isSelected = sensitivity === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => onSelectSensitivity(opt.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-500/30'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/60'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-stone-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-bold text-stone-900">
                        {opt.title}
                      </span>
                      {opt.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            opt.id === 'medium'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-stone-100 text-stone-600 border border-stone-200'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed mb-1.5">
                      {opt.description}
                    </p>
                    <p className="text-[11px] text-stone-400 font-medium">
                      Best for: {opt.idealFor}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real-time Decibel Meter Preview */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-2">
              <div className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-stone-500" />
                <span>Live Microphone Input</span>
              </div>
              <span className="font-mono text-stone-600 tabular-nums">
                {currentDecibels > 0 ? `${currentDecibels} dB` : 'Idle'}
              </span>
            </div>

            {/* Meter Bar */}
            <div className="w-full h-2 rounded-full bg-stone-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-100"
                style={{
                  width: `${Math.min(100, Math.max(4, (currentDecibels / 100) * 100))}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-2">
              Make a sound (knock on desk or speak) to verify your microphone responsiveness.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 border border-stone-200 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Save and close settings"
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 transition-colors shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

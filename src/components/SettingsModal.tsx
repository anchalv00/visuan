import React from 'react';
import { MicSensitivity } from '../types/sound';
import { Check, Eye, Mic, SlidersHorizontal, X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sensitivity: MicSensitivity;
  onSelectSensitivity: (sensitivity: MicSensitivity) => void;
  colorBlindMode: boolean;
  onToggleColorBlindMode: (enabled: boolean) => void;
  currentDecibels?: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  sensitivity,
  onSelectSensitivity,
  colorBlindMode,
  onToggleColorBlindMode,
  currentDecibels = 0,
}) => {
  if (!isOpen) return null;

  const options: {
    id: MicSensitivity;
    title: string;
    description: string;
  }[] = [
    {
      id: 'high',
      title: 'High',
      description: 'Detects quiet sounds like gentle knocks and distant bells.',
    },
    {
      id: 'medium',
      title: 'Medium',
      description: 'Balanced detection for everyday rooms and homes.',
    },
    {
      id: 'low',
      title: 'Low',
      description: 'Only triggers on loud sounds like sirens and smoke alarms.',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-4 h-4 text-stone-700" />
            <h2 id="settings-title" className="text-base font-bold text-stone-900">
              Settings
            </h2>
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
        <div className="p-6 space-y-6">
          {/* Colorblind Mode Toggle */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
              Visual Accessibility
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={colorBlindMode}
              onClick={() => onToggleColorBlindMode(!colorBlindMode)}
              className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-4 ${
                colorBlindMode
                  ? 'border-sky-600 bg-sky-50/50'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    colorBlindMode
                      ? 'bg-sky-600 text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-stone-900 block">
                    Colorblind Mode
                  </span>
                  <span className="text-xs text-stone-500 block mt-0.5">
                    Uses high-contrast blue and orange colors for notifications and buttons.
                  </span>
                </div>
              </div>

              <div
                className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
                  colorBlindMode ? 'bg-sky-600' : 'bg-stone-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    colorBlindMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>

            {/* Preview Swatches */}
            <div className="flex items-center gap-2 text-xs text-stone-500 pt-1">
              <span>Preview:</span>
              <span
                className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                  colorBlindMode
                    ? 'bg-orange-600 text-white'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                Urgent
              </span>
              <span
                className={`px-2 py-0.5 rounded font-semibold uppercase text-[10px] ${
                  colorBlindMode
                    ? 'bg-sky-100 text-sky-900 border border-sky-300'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                Alert
              </span>
              <span
                className={`px-2 py-0.5 rounded font-semibold uppercase text-[10px] ${
                  colorBlindMode
                    ? 'bg-sky-700 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                Active UI
              </span>
            </div>
          </div>

          {/* Sensitivity Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
              Microphone Sensitivity
            </label>

            <div className="space-y-2">
              {options.map((opt) => {
                const isSelected = sensitivity === opt.id;
                const activeBorder = colorBlindMode
                  ? 'border-sky-600 bg-sky-50/40'
                  : 'border-emerald-600 bg-emerald-50/40';
                const activeCheck = colorBlindMode
                  ? 'border-sky-600 bg-sky-600 text-white'
                  : 'border-emerald-600 bg-emerald-600 text-white';

                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => onSelectSensitivity(opt.id)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? activeBorder
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? activeCheck : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-stone-900">
                        {opt.title}
                      </div>
                      <p className="text-xs text-stone-500">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Microphone Level */}
          <div className="pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between text-xs font-medium text-stone-600 mb-2">
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-stone-400" />
                Microphone Level
              </span>
              <span className="font-mono tabular-nums">
                {currentDecibels > 0 ? `${currentDecibels} dB` : 'Idle'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  colorBlindMode ? 'bg-sky-600' : 'bg-emerald-600'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(4, (currentDecibels / 100) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer ${
              colorBlindMode
                ? 'bg-sky-700 hover:bg-sky-800'
                : 'bg-stone-900 hover:bg-stone-800'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

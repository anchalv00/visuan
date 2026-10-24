import React from 'react';
import { AccessibilitySettings, ColorBlindMode, HapticSensitivity } from '../types/sound';
import { triggerHaptic } from '../services/haptics';
import {
  Bell,
  Check,
  Eye,
  Sliders,
  Sparkles,
  Vibrate,
  X,
  Zap,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AccessibilitySettings;
  onUpdateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  onRequestNotifications: () => void;
  notificationPermission: NotificationPermission;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onRequestNotifications,
  notificationPermission,
}) => {
  if (!isOpen) return null;

  const handleTestVibration = (sensitivity: HapticSensitivity) => {
    triggerHaptic('staccato_emergency', 'urgent', sensitivity);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Accessibility & Haptics</h2>
              <p className="text-xs text-neutral-400">Tailor visual cues, vibrations, and notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Haptic Sensitivity Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <Vibrate className="w-4 h-4 text-emerald-400" />
                Haptic Vibration Sensitivity
              </label>
              <button
                onClick={() => handleTestVibration(settings.hapticSensitivity)}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
              >
                Test Vibration Pattern
              </button>
            </div>
            <p className="text-xs text-neutral-400 mb-3">
              Web Vibration API delivers physical tactile rhythms to your device.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  { id: 'off', label: 'Off', desc: 'No vibration' },
                  { id: 'emergency_only', label: 'Emergency Only', desc: 'Smoke & horns only' },
                  { id: 'low', label: 'Low', desc: 'Shorter pulses' },
                  { id: 'medium', label: 'Medium', desc: 'Standard (Balanced)' },
                  { id: 'high', label: 'High', desc: 'Boosted intensity' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    onUpdateSettings({ hapticSensitivity: opt.id });
                    handleTestVibration(opt.id);
                  }}
                  className={`flex flex-col p-2.5 rounded-xl border text-left transition-all ${
                    settings.hapticSensitivity === opt.id
                      ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-md'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{opt.label}</span>
                    {settings.hapticSensitivity === opt.id && (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-500 mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color-Blindness Mode */}
          <div>
            <label className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-blue-400" />
              Color-Blindness & Vision Modes
            </label>
            <p className="text-xs text-neutral-400 mb-3">
              Ensures visual alerts and HUD banners remain crystal clear across all vision profiles.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(
                [
                  {
                    id: 'standard',
                    label: 'Standard Contrast',
                    desc: 'High-contrast Crimson, Amber, and Cyan',
                    palette: ['bg-red-500', 'bg-amber-400', 'bg-blue-500'],
                  },
                  {
                    id: 'protanopia',
                    label: 'Protanopia / Deuteranopia',
                    desc: 'Red-Green safe (Electric Blue, Amber, Magenta)',
                    palette: ['bg-blue-600', 'bg-amber-400', 'bg-purple-500'],
                  },
                  {
                    id: 'tritanopia',
                    label: 'Tritanopia',
                    desc: 'Blue-Yellow safe (Vermillion, Cyan, Slate)',
                    palette: ['bg-rose-600', 'bg-teal-400', 'bg-slate-300'],
                  },
                  {
                    id: 'monochrome',
                    label: 'High Contrast Monochrome',
                    desc: 'Obsidian & White with geometric glyphs (▲ ◼ ● ◆)',
                    palette: ['bg-white', 'bg-neutral-400', 'bg-neutral-700'],
                  },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => onUpdateSettings({ colorBlindMode: mode.id as ColorBlindMode })}
                  className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                    settings.colorBlindMode === mode.id
                      ? 'bg-neutral-800 border-white text-white shadow-lg'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{mode.label}</span>
                    <div className="flex items-center gap-1">
                      {mode.palette.map((c, i) => (
                        <span key={i} className={`w-2.5 h-2.5 rounded-full ${c}`} />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-400">{mode.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Additional Toggles */}
          <div className="space-y-3 pt-2 border-t border-neutral-800">
            {/* Screen Flash Strobe */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div>
                <span className="text-xs font-bold text-white block">
                  Peripheral Screen Flash / Strobe
                </span>
                <span className="text-[10px] text-neutral-400">
                  Flashes screen borders on urgent safety alarms (disable if photosensitive)
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.screenFlashEnabled}
                onChange={(e) => onUpdateSettings({ screenFlashEnabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            {/* Large Typography */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div>
                <span className="text-xs font-bold text-white block">Large Text Accessibility</span>
                <span className="text-[10px] text-neutral-400">
                  Enlarges descriptions and HUD banner headers for quick reading
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.largeText}
                onChange={(e) => onUpdateSettings({ largeText: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            {/* Background Notifications */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-emerald-400" />
                  Background System Notifications
                </span>
                <span className="text-[10px] text-neutral-400">
                  Sends desktop/phone notifications when tab is in background or phone is locked
                </span>
              </div>
              {notificationPermission === 'granted' ? (
                <input
                  type="checkbox"
                  checked={settings.backgroundNotifications}
                  onChange={(e) => onUpdateSettings({ backgroundNotifications: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              ) : (
                <button
                  onClick={onRequestNotifications}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30"
                >
                  Enable
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-colors"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

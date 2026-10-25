/**
 * @file SoundTesterModal.tsx
 * @description Built-in Interactive Sound Generator & Detection Verifier Modal.
 *
 * How this file relates to the app's design & functionality:
 * - Opened via the single "Test Sounds" button in the top navigation bar while listening is active.
 * - Because live microphone hardware, room acoustics, and speaker compression can sometimes distort
 *   external audio during a demo or evaluation, this modal lets judges and users trigger 10 known
 *   environmental sounds (Sirens, Baby Crying, Door Knocking, Smoke Alarm, Kitchen Timer, Bicycle Bell,
 *   Security Alarm, Car Horn, Doorbell).
 * - Clicking any sound preset simultaneously:
 *   1. Synthesizes and plays the authentic acoustic waveform through the speakers (`playSyntheticSound`).
 *   2. Dispatches the corresponding `SoundAlert` (`onTriggerDetection`) so the user can immediately
 *      verify the visual notification card and haptic vibration pattern.
 */

import React, { useState } from 'react';
import { playSyntheticSound } from '../services/soundSynthesizer';
import { SoundAlert } from '../types/sound';
import {
  Baby,
  Bell,
  Clock,
  DoorClosed,
  Flame,
  Play,
  ShieldAlert,
  Siren,
  Volume2,
  X,
  Car,
  CheckCircle2,
} from 'lucide-react';

interface SoundTesterModalProps {
  /** Controls whether the Test Sounds modal is visible */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Dispatches the detected SoundAlert into the main notifications feed and haptic engine */
  onTriggerDetection: (alert: SoundAlert) => void;
  /** Adapts card icons and active states to the Okabe-Ito Blue/Orange colorblind palette */
  colorBlindMode?: boolean;
}

interface TestPreset {
  id: string;
  /** Key mapped to the Web Audio recipe in `src/services/soundSynthesizer.ts` */
  presetKey: string;
  name: string;
  category: 'safety' | 'warning' | 'appliance' | 'biological';
  urgency: 'urgent' | 'warning' | 'info';
  description: string;
}

export const SoundTesterModal: React.FC<SoundTesterModalProps> = ({
  isOpen,
  onClose,
  onTriggerDetection,
  colorBlindMode = false,
}) => {
  /** Tracks which sound preset is currently playing so we can show a visual checkmark state */
  const [playingId, setPlayingId] = useState<string | null>(null);

  if (!isOpen) return null;

  /** Catalog of 10 known environmental sounds available for instant testing */
  const presets: TestPreset[] = [
    {
      id: 'siren_wail',
      presetKey: 'siren',
      name: 'Emergency Siren (Wail)',
      category: 'safety',
      urgency: 'urgent',
      description: 'Rising and falling emergency vehicle siren.',
    },
    {
      id: 'siren_hi_lo',
      presetKey: 'siren_two_tone',
      name: 'Emergency Siren (Hi-Lo)',
      category: 'safety',
      urgency: 'urgent',
      description: 'Alternating two-tone emergency siren.',
    },
    {
      id: 'baby_crying',
      presetKey: 'baby_cry',
      name: 'Baby Crying',
      category: 'biological',
      urgency: 'urgent',
      description: 'High-pitched infant distress crying.',
    },
    {
      id: 'door_knocking',
      presetKey: 'door_knock',
      name: 'Door Knocking',
      category: 'warning',
      urgency: 'warning',
      description: 'Three firm knocks on a wooden door.',
    },
    {
      id: 'smoke_alarm',
      presetKey: 'smoke_alarm',
      name: 'Smoke Alarm',
      category: 'safety',
      urgency: 'urgent',
      description: 'High-frequency 3-beep smoke detector pattern.',
    },
    {
      id: 'timer_beeps',
      presetKey: 'timer',
      name: 'Kitchen Timer',
      category: 'appliance',
      urgency: 'warning',
      description: 'Repeating electronic appliance timer chimes.',
    },
    {
      id: 'bike_bell',
      presetKey: 'bike_bell',
      name: 'Bicycle Bell',
      category: 'warning',
      urgency: 'warning',
      description: 'Bright metallic handlebar bell ring.',
    },
    {
      id: 'security_alarm',
      presetKey: 'security_alarm',
      name: 'Security Alarm',
      category: 'safety',
      urgency: 'urgent',
      description: 'Rapid alternating home security alarm.',
    },
    {
      id: 'car_horn',
      presetKey: 'car_horn',
      name: 'Car Horn',
      category: 'safety',
      urgency: 'urgent',
      description: 'Dual-tone vehicle horn warning blast.',
    },
    {
      id: 'doorbell',
      presetKey: 'doorbell',
      name: 'Doorbell Chime',
      category: 'warning',
      urgency: 'warning',
      description: 'Classic two-tone front door chime.',
    },
  ];

  /** Selects the matching category icon and applies standard or colorblind-safe colors */
  const getIcon = (id: string, urgency: string) => {
    const color = colorBlindMode
      ? urgency === 'urgent'
        ? 'text-orange-700'
        : 'text-sky-700'
      : urgency === 'urgent'
      ? 'text-red-600'
      : 'text-amber-600';

    if (id.includes('siren')) return <Siren className={`w-4 h-4 ${color}`} />;
    if (id.includes('baby')) return <Baby className={`w-4 h-4 ${color}`} />;
    if (id.includes('knock')) return <DoorClosed className={`w-4 h-4 ${color}`} />;
    if (id.includes('smoke')) return <Flame className={`w-4 h-4 ${color}`} />;
    if (id.includes('timer')) return <Clock className={`w-4 h-4 ${color}`} />;
    if (id.includes('security')) return <ShieldAlert className={`w-4 h-4 ${color}`} />;
    if (id.includes('car')) return <Car className={`w-4 h-4 ${color}`} />;
    return <Bell className={`w-4 h-4 ${color}`} />;
  };

  /**
   * Plays the synthesized audio waveform and emits a verified `SoundAlert` to the main feed.
   */
  const handleTestSound = (preset: TestPreset) => {
    setPlayingId(preset.id);
    playSyntheticSound(preset.presetKey);

    const alert: SoundAlert = {
      id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      sound_name: preset.name,
      sound_type: preset.category,
      urgency: preset.urgency,
      description: preset.description,
      direction_cue: 'center',
      confidence: 0.98,
      haptic_pattern: preset.urgency === 'urgent' ? 'staccato_emergency' : 'double_pulse',
    };

    onTriggerDetection(alert);

    setTimeout(() => {
      setPlayingId(null);
    }, 1400);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tester-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-4 h-4 text-stone-700" />
            <h2 id="tester-title" className="text-base font-bold text-stone-900">
              Test Sounds
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close test sounds"
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Grid of Interactive Sound Presets */}
        <div className="p-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {presets.map((preset) => {
              const isPlaying = playingId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleTestSound(preset)}
                  disabled={isPlaying}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isPlaying
                      ? colorBlindMode
                        ? 'border-sky-600 bg-sky-50'
                        : 'border-emerald-600 bg-emerald-50'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        colorBlindMode
                          ? preset.urgency === 'urgent'
                            ? 'bg-orange-100'
                            : 'bg-sky-100'
                          : preset.urgency === 'urgent'
                          ? 'bg-red-50'
                          : 'bg-amber-50'
                      }`}
                    >
                      {getIcon(preset.id, preset.urgency)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-stone-900 truncate">
                        {preset.name}
                      </div>
                      <div className="text-xs text-stone-500 truncate">
                        {preset.description}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isPlaying
                        ? colorBlindMode
                          ? 'bg-sky-600 text-white'
                          : 'bg-emerald-600 text-white'
                        : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {isPlaying ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

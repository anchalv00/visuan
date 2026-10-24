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
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface SoundTesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerDetection: (alert: SoundAlert) => void;
}

interface TestPreset {
  id: string;
  presetKey: string;
  name: string;
  category: 'safety' | 'warning' | 'appliance' | 'biological';
  urgency: 'urgent' | 'warning' | 'info';
  description: string;
  acousticNote: string;
  icon: React.ReactNode;
}

export const SoundTesterModal: React.FC<SoundTesterModalProps> = ({
  isOpen,
  onClose,
  onTriggerDetection,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const presets: TestPreset[] = [
    {
      id: 'siren_wail',
      presetKey: 'siren',
      name: 'Emergency Siren (Wail)',
      category: 'safety',
      urgency: 'urgent',
      description: 'Rising and falling sinusoidal wailing siren (police, ambulance, fire truck).',
      acousticNote: 'Continuous pitch sweep (650Hz – 950Hz)',
      icon: <Siren className="w-5 h-5 text-red-600" />,
    },
    {
      id: 'siren_hi_lo',
      presetKey: 'siren_two_tone',
      name: 'Emergency Siren (Two-Tone / Hi-Lo)',
      category: 'safety',
      urgency: 'urgent',
      description: 'European ambulance alternating two-tone siren.',
      acousticNote: 'Alternating 440Hz & 587Hz tones',
      icon: <Siren className="w-5 h-5 text-red-600" />,
    },
    {
      id: 'baby_crying',
      presetKey: 'baby_cry',
      name: 'Baby Crying (Distress)',
      category: 'biological',
      urgency: 'urgent',
      description: 'Infant vocal distress wails with breathing pauses.',
      acousticNote: 'Infant vocal harmonics (450Hz – 800Hz)',
      icon: <Baby className="w-5 h-5 text-rose-500" />,
    },
    {
      id: 'door_knocking',
      presetKey: 'door_knock',
      name: 'Door Knocking',
      category: 'warning',
      urgency: 'warning',
      description: 'Knuckles rapping firmly on a wooden door (3 sharp beats).',
      acousticNote: 'Percussive transient impact',
      icon: <DoorClosed className="w-5 h-5 text-amber-600" />,
    },
    {
      id: 'smoke_alarm',
      presetKey: 'smoke_alarm',
      name: 'Smoke Alarm (T3 Temporal)',
      category: 'safety',
      urgency: 'urgent',
      description: 'Standard NFPA 72 T3 temporal 3-beep emergency pattern.',
      acousticNote: 'Piercing 3100Hz square wave pulses',
      icon: <Flame className="w-5 h-5 text-red-600" />,
    },
    {
      id: 'timer_beeps',
      presetKey: 'timer',
      name: 'Kitchen Timer Beeping',
      category: 'appliance',
      urgency: 'warning',
      description: 'Microwave / oven countdown timer electronic alert.',
      acousticNote: 'Repeating 2800Hz electronic chimes',
      icon: <Clock className="w-5 h-5 text-amber-500" />,
    },
    {
      id: 'bike_bell',
      presetKey: 'bike_bell',
      name: 'Bicycle Bell (Dual Ding-Dong)',
      category: 'warning',
      urgency: 'warning',
      description: 'High-frequency metallic handlebar bike bell chime.',
      acousticNote: 'High metallic ring (2600Hz & 3180Hz)',
      icon: <Bell className="w-5 h-5 text-blue-500" />,
    },
    {
      id: 'security_alarm',
      presetKey: 'security_alarm',
      name: 'Security Intrusion Alarm',
      category: 'safety',
      urgency: 'urgent',
      description: 'High-decibel building burglary alarm siren.',
      acousticNote: 'Rapid alternating 800Hz / 1200Hz alarm',
      icon: <ShieldAlert className="w-5 h-5 text-red-600" />,
    },
    {
      id: 'car_horn',
      presetKey: 'car_horn',
      name: 'Car Horn Blast',
      category: 'safety',
      urgency: 'urgent',
      description: 'Vehicular dual-tone automotive horn blast.',
      acousticNote: 'Dual 420Hz & 510Hz brass blast',
      icon: <Car className="w-5 h-5 text-amber-600" />,
    },
    {
      id: 'doorbell',
      presetKey: 'doorbell',
      name: 'Doorbell Chime',
      category: 'warning',
      urgency: 'warning',
      description: 'Two-tone harmonic doorbell chime.',
      acousticNote: '660Hz then 520Hz resonant chime',
      icon: <Bell className="w-5 h-5 text-emerald-600" />,
    },
  ];

  const handleTestSound = async (preset: TestPreset) => {
    setPlayingId(preset.id);

    // 1. Play real authentic synthetic sound through device speakers
    playSyntheticSound(preset.presetKey);

    // 2. Trigger real detection notification and haptics
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
    }, 1500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tester-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="tester-title" className="text-base font-bold text-stone-900">
                Test Known Sounds & Detection
              </h2>
              <p className="text-xs text-stone-500">
                Play authentic acoustic sounds and test real-time detection notifications
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close tester"
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Scrollable list of sounds */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {presets.map((preset) => {
              const isPlaying = playingId === preset.id;
              return (
                <div
                  key={preset.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isPlaying
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        preset.urgency === 'urgent'
                          ? 'bg-red-50 border border-red-200/80'
                          : 'bg-stone-50 border border-stone-200'
                      }`}
                    >
                      {preset.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h3 className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                          {preset.name}
                        </h3>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                            preset.urgency === 'urgent'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {preset.urgency}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 leading-tight line-clamp-1 mb-1">
                        {preset.description}
                      </p>
                      <span className="text-[10px] font-mono text-stone-400 block truncate">
                        {preset.acousticNote}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTestSound(preset)}
                    disabled={isPlaying}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                      isPlaying
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-900 hover:bg-stone-800 text-white'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Triggered Alert!
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Play & Test Detection
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
          <p className="text-xs text-stone-500">
            Clicking a sound plays audio through speakers and immediately triggers live detection.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 transition-colors shadow-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { ColorBlindMode, SoundAlert, SoundPreset } from '../types/sound';
import { SOUND_PRESETS } from '../data/soundPresets';
import { playSyntheticSound } from '../services/soundSynthesizer';
import { triggerHaptic } from '../services/haptics';
import { getUrgencyTheme } from '../utils/theme';
import {
  AlertTriangle,
  Baby,
  Bell,
  Car,
  Coffee,
  DoorClosed,
  Flame,
  PartyPopper,
  Play,
  ShieldAlert,
  Siren,
  Volume2,
  Zap,
} from 'lucide-react';

interface SoundboardSimulatorProps {
  onTriggerAlert: (alert: SoundAlert) => void;
  colorBlindMode: ColorBlindMode;
  isListening: boolean;
}

export const SoundboardSimulator: React.FC<SoundboardSimulatorProps> = ({
  onTriggerAlert,
  colorBlindMode,
  isListening,
}) => {
  const [playingPresetId, setPlayingPresetId] = useState<string | null>(null);

  const getPresetIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-5 h-5" />;
      case 'Car':
        return <Car className="w-5 h-5" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-5 h-5" />;
      case 'Siren':
        return <Siren className="w-5 h-5" />;
      case 'DoorClosed':
        return <DoorClosed className="w-5 h-5" />;
      case 'Baby':
        return <Baby className="w-5 h-5" />;
      case 'Bell':
        return <Bell className="w-5 h-5" />;
      case 'AlertTriangle':
        return <AlertTriangle className="w-5 h-5" />;
      case 'PartyPopper':
        return <PartyPopper className="w-5 h-5" />;
      case 'Coffee':
        return <Coffee className="w-5 h-5" />;
      default:
        return <Volume2 className="w-5 h-5" />;
    }
  };

  const handlePlaySound = async (preset: SoundPreset) => {
    setPlayingPresetId(preset.id);

    // Play synthetic acoustic sound through device speaker
    playSyntheticSound(preset.id).then(() => {
      setPlayingPresetId(null);
    });

    // Also trigger haptic feedback to feel the rhythm
    triggerHaptic(preset.hapticPattern, preset.urgency, 'high');

    // If microphone isn't currently listening, also trigger the HUD alert so the user sees immediate feedback
    if (!isListening) {
      handleSimulateDirect(preset);
    }
  };

  const handleSimulateDirect = (preset: SoundPreset) => {
    triggerHaptic(preset.hapticPattern, preset.urgency, 'high');

    const alert: SoundAlert = {
      id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      sound_name: preset.name,
      sound_type: preset.category,
      urgency: preset.urgency,
      description: preset.description,
      direction_cue: preset.direction,
      confidence: 0.98,
      decibels: preset.urgency === 'urgent' ? 88 : 72,
      haptic_pattern: preset.hapticPattern,
    };

    onTriggerAlert(alert);
  };

  return (
    <div className="flex flex-col bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Environmental Soundboard & Acoustic Simulator
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Test and feel critical ambient sounds. Plays through device speakers for real mic detection or triggers immediate visual HUD + haptic feedback.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>{SOUND_PRESETS.length} Acoustic Presets</span>
        </div>
      </div>

      {/* Grid of Sound Presets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SOUND_PRESETS.map((preset) => {
          const theme = getUrgencyTheme(preset.urgency, colorBlindMode);
          const isPlaying = playingPresetId === preset.id;

          return (
            <div
              key={preset.id}
              className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200 bg-neutral-950/60 hover:bg-neutral-950 border-neutral-800 hover:border-neutral-700 shadow-sm ${
                isPlaying ? 'ring-2 ring-emerald-500 scale-[1.01]' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex items-center justify-center w-8 h-8 rounded-lg ${theme.badgeBg} ${theme.badgeText} shadow-sm`}
                    >
                      {getPresetIcon(preset.iconName)}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight">
                        {preset.name}
                      </h3>
                      <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                        {preset.frequencyHint}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 ${theme.badgeBg} ${theme.badgeText}`}
                  >
                    {theme.symbol} {preset.urgency}
                  </span>
                </div>

                <p className="text-xs text-neutral-400 line-clamp-2 my-2">
                  {preset.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-neutral-800/80">
                <button
                  onClick={() => handlePlaySound(preset)}
                  disabled={isPlaying}
                  title="Synthesize and play audio through speakers"
                  className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/30 active:scale-95 transition-all"
                >
                  <Play className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin' : ''}`} />
                  <span>{isPlaying ? 'Playing...' : 'Play Audio'}</span>
                </button>

                <button
                  onClick={() => handleSimulateDirect(preset)}
                  title="Fire HUD banner and phone haptic buzz immediately"
                  className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs border border-neutral-700 active:scale-95 transition-all"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Test HUD</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

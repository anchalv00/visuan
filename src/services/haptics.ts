import { HapticPattern, HapticSensitivity, SoundUrgency } from '../types/sound';

// Base pulse millisecond arrays
const PATTERN_DURATIONS: Record<HapticPattern, number[]> = {
  staccato_emergency: [300, 100, 300, 100, 500, 150, 400],
  double_pulse: [180, 90, 180],
  gentle_thrum: [90, 60, 90],
  rapid_tap: [45, 45, 45, 45, 45, 45],
  heartbeat: [120, 120, 260],
};

// Event listener for UI tactile emulator (so desktop users see the screen shake / pulse along with vibration)
type HapticListener = (pattern: HapticPattern, durations: number[]) => void;
const listeners: Set<HapticListener> = new Set();

export const subscribeToHaptics = (fn: HapticListener) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

const notifyHapticEvent = (pattern: HapticPattern, durations: number[]) => {
  listeners.forEach((fn) => fn(pattern, durations));
};

export const canVibrate = (): boolean => {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

export const triggerHaptic = (
  pattern: HapticPattern,
  urgency: SoundUrgency = 'info',
  sensitivity: HapticSensitivity = 'medium'
) => {
  if (sensitivity === 'off') {
    return;
  }

  if (sensitivity === 'emergency_only' && urgency !== 'urgent') {
    return;
  }

  if (sensitivity === 'low' && urgency !== 'urgent' && urgency !== 'warning') {
    return;
  }

  let durations = PATTERN_DURATIONS[pattern] || [150];

  // Scale durations based on sensitivity
  if (sensitivity === 'low') {
    durations = durations.map((d) => Math.max(30, Math.round(d * 0.7)));
  } else if (sensitivity === 'high') {
    durations = durations.map((d) => Math.round(d * 1.3));
  }

  // Trigger browser Web Vibration API
  try {
    if (canVibrate()) {
      navigator.vibrate(durations);
    }
  } catch (err) {
    console.warn('Vibration API error:', err);
  }

  // Notify UI listeners for tactile simulation
  notifyHapticEvent(pattern, durations);
};

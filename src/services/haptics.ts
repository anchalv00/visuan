/**
 * @file haptics.ts
 * @description Tactile Vibration Service for Deaf and Hard of Hearing Accessibility.
 *
 * How this file relates to the app's design & functionality:
 * - Visual notifications only work when a user is actively looking at their screen.
 *   By pairing every detected sound with a distinct vibration cadence via the browser's
 *   Web Vibration API (`navigator.vibrate`), `visuan` lets users feel urgent alerts
 *   (like a smoke alarm or siren) when their phone is in their hand or pocket.
 * - Each `HapticPattern` uses an array of alternating `[vibrate_ms, pause_ms, vibrate_ms, ...]`
 *   durations so different categories of sound feel distinct to the touch.
 */

import { HapticPattern, HapticSensitivity, SoundUrgency } from '../types/sound';

/**
 * Base vibration pulse sequences in milliseconds: `[vibrate, pause, vibrate, pause, ...]`.
 * - `staccato_emergency`: Long, insistent bursts for life-safety events (Sirens, Smoke Alarms).
 * - `double_pulse`: Two firm taps mimicking a physical knock or timer alert.
 * - `gentle_thrum`: Soft, brief pulse for low-priority notices.
 * - `rapid_tap`: Quick metallic-feeling flutter for bicycle bells.
 * - `heartbeat`: Lub-dub cadence designed specifically for biological alerts (Baby Crying).
 */
const PATTERN_DURATIONS: Record<HapticPattern, number[]> = {
  staccato_emergency: [300, 100, 300, 100, 500, 150, 400],
  double_pulse: [180, 90, 180],
  gentle_thrum: [90, 60, 90],
  rapid_tap: [45, 45, 45, 45, 45, 45],
  heartbeat: [120, 120, 260],
};

/**
 * Observer callback type so UI components can optionally react to haptic events
 * (useful on desktop browsers that do not have physical vibration motors).
 */
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

/**
 * Checks whether the current device/browser supports the Web Vibration API.
 */
export const canVibrate = (): boolean => {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

/**
 * Triggers a physical vibration on supported mobile devices and notifies UI listeners.
 *
 * @param pattern Which rhythmic cadence to play
 * @param urgency Urgency tier of the detected sound ('urgent' | 'warning' | 'info' | 'subtle')
 * @param sensitivity User haptic preference ('off' | 'emergency_only' | 'low' | 'medium' | 'high')
 */
export const triggerHaptic = (
  pattern: HapticPattern,
  urgency: SoundUrgency = 'info',
  sensitivity: HapticSensitivity = 'medium'
) => {
  // Respect user opt-out or urgency filtering
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

  // Scale pulse durations up or down based on sensitivity preference
  if (sensitivity === 'low') {
    durations = durations.map((d) => Math.max(30, Math.round(d * 0.7)));
  } else if (sensitivity === 'high') {
    durations = durations.map((d) => Math.round(d * 1.3));
  }

  // Invoke the hardware vibration motor on supported Android/mobile browsers
  try {
    if (canVibrate()) {
      navigator.vibrate(durations);
    }
  } catch (err) {
    console.warn('Vibration API error:', err);
  }

  // Notify any subscribed UI components
  notifyHapticEvent(pattern, durations);
};

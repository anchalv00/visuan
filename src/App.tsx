/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file App.tsx
 * @description Root Application Component & State Orchestrator for "visuan".
 *
 * How this file relates to the app's design & functionality:
 * - Implements a clean, distraction-free two-screen workflow designed for Deaf and Hard of Hearing users:
 *   1. **Intro Screen (`!isListening`)**: Displays only the bold `visuan` wordmark, a simple
 *      human-centered mission statement, and a prominent circular "Listen" button.
 *   2. **Active Listening Screen (`isListening`)**: Reveals a sticky top navigation bar containing
 *      the `visuan` brand mark, the central "Stop" button, a single "Test Sounds" button, and
 *      the "Settings" button, above the real-time `SoundNotificationsList` feed.
 * - Subscribes to `audioClassifier` events (`subscribeAlert`, `subscribeMetrics`, `subscribeState`),
 *   triggers physical vibrations via `triggerHaptic`, deduplicates rapid repeated alerts within
 *   a 2-second window, and persists user settings (`sensitivity`, `colorBlindMode`) in `localStorage`.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { MicSensitivity, SoundAlert } from './types/sound';
import { audioClassifier, AudioMetrics } from './services/audioClassifier';
import { triggerHaptic } from './services/haptics';
import { ListenButton, StopOvalButton } from './components/MicrophoneController';
import { SoundNotificationsList } from './components/SoundNotificationsList';
import { SoundTesterModal } from './components/SoundTesterModal';
import { SettingsModal } from './components/SettingsModal';
import { AudioDisclaimerModal } from './components/AudioDisclaimerModal';
import { SlidersHorizontal, Volume2 } from 'lucide-react';

/** Keys used to persist user preferences and session notifications across browser reloads */
const STORAGE_KEY_SENSITIVITY = 'visual_soundboard_sensitivity';
const STORAGE_KEY_NOTIFICATIONS = 'visual_soundboard_notifications';
const STORAGE_KEY_COLORBLIND = 'visual_soundboard_colorblind';

export default function App() {
  /** Tracks whether the microphone is actively capturing and classifying environmental sounds */
  const [isListening, setIsListening] = useState(false);
  /** Controls visibility of the "Test Sounds" synthesizer modal */
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  /** Controls visibility of the pre-listening Live Audio Notice modal */
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

  /** Chronological list of detected environmental sound alerts (newest first, capped at 50) */
  const [notifications, setNotifications] = useState<SoundAlert[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  /** User-selected microphone sensitivity ('high' | 'medium' | 'low') */
  const [sensitivity, setSensitivity] = useState<MicSensitivity>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SENSITIVITY) as MicSensitivity;
      return saved === 'high' || saved === 'medium' || saved === 'low' ? saved : 'medium';
    } catch {
      return 'medium';
    }
  });

  /**
   * Colorblind Accessibility Mode (Okabe-Ito high-contrast Blue & Orange palette).
   * When enabled, replaces standard Red/Amber/Emerald colors with Orange (`urgent`) and
   * Sky Blue (`warning`/active UI) so users with Protanopia, Deuteranopia, or Tritanopia
   * can immediately distinguish alert urgency.
   */
  const [colorBlindMode, setColorBlindMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_COLORBLIND) === 'true';
    } catch {
      return false;
    }
  });

  /** Controls visibility of the Settings modal */
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  /** True while a 2.5-second WAV chunk is actively being analyzed by the backend */
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  /** Live 60fps microphone metrics (used to render the decibel level bar inside Settings) */
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics>({
    db: 0,
    frequencyData: new Uint8Array(0),
    timeDomainData: new Uint8Array(0),
    estimatedDirection: 'center',
  });
  /** Displays user-friendly microphone permission or hardware error messages */
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial sensitivity state with the Web Audio pre-amplifier service
  useEffect(() => {
    audioClassifier.setSensitivity(sensitivity);
  }, [sensitivity]);

  /** Updates microphone sensitivity both in React state, Web Audio GainNode, and localStorage */
  const handleSelectSensitivity = (newSensitivity: MicSensitivity) => {
    setSensitivity(newSensitivity);
    audioClassifier.setSensitivity(newSensitivity);
    try {
      localStorage.setItem(STORAGE_KEY_SENSITIVITY, newSensitivity);
    } catch {
      // Ignore storage quota errors in private browsing
    }
  };

  /** Toggles Colorblind Mode and persists the setting in localStorage */
  const handleToggleColorBlindMode = (enabled: boolean) => {
    setColorBlindMode(enabled);
    try {
      localStorage.setItem(STORAGE_KEY_COLORBLIND, String(enabled));
    } catch {
      // Ignore storage quota errors
    }
  };

  /**
   * Callback invoked whenever a real microphone sound or a synthetic Test Sound is detected.
   * 1. Fires a physical vibration pattern (`triggerHaptic`) matching the sound's urgency.
   * 2. Deduplicates identical sound alerts arriving within 2,000ms of each other.
   * 3. Prepends the new alert to the Notifications feed.
   */
  const handleAlert = useCallback((alert: SoundAlert) => {
    triggerHaptic(alert.haptic_pattern, alert.urgency, 'medium');

    setNotifications((prev) => {
      if (prev.length > 0 && prev[0].sound_name === alert.sound_name && Date.now() - prev[0].timestamp < 2000) {
        return prev;
      }
      const updated = [alert, ...prev.slice(0, 49)];
      try {
        localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  /**
   * Subscribes to the singleton `audioClassifier` service on mount and cleans up
   * listeners on unmount.
   */
  useEffect(() => {
    const unsubAlert = audioClassifier.subscribeAlert(handleAlert);
    const unsubMetrics = audioClassifier.subscribeMetrics((metrics) => {
      setAudioMetrics(metrics);
    });
    const unsubState = audioClassifier.subscribeState((state, msg) => {
      setIsListening(state === 'listening' || state === 'analyzing');
      setIsAnalyzing(state === 'analyzing');
      if (state === 'error') {
        setErrorMessage(msg || 'Microphone error occurred');
      } else {
        setErrorMessage(null);
      }
    });

    return () => {
      unsubAlert();
      unsubMetrics();
      unsubState();
    };
  }, [handleAlert]);

  /**
   * Handles clicks on the main "Listen" or "Stop" button.
   * When starting from the intro screen, opens the `AudioDisclaimerModal` first so the user
   * understands live microphone limitations and knows about the "Test Sounds" feature.
   */
  const handleToggleListening = () => {
    setErrorMessage(null);
    if (isListening) {
      audioClassifier.stopListening();
    } else {
      setIsDisclaimerOpen(true);
    }
  };

  /**
   * Called when the user clicks "Continue" inside the Live Audio Notice modal.
   * Clears previous notifications so every listening session starts with a fresh slate,
   * then starts Web Audio capture.
   */
  const handleConfirmStartListening = async () => {
    setIsDisclaimerOpen(false);
    setErrorMessage(null);

    // Start from a fresh slate every time a new listening session begins
    setNotifications([]);
    try {
      localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
    } catch {
      // Ignore storage errors
    }

    try {
      await audioClassifier.startListening();
    } catch (err: any) {
      console.error('Failed to start listening:', err);
      setErrorMessage(err?.message || 'Could not access microphone');
    }
  };

  /** Clears all current notifications from the feed */
  const handleClearNotifications = () => {
    setNotifications([]);
    try {
      localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <div className="min-h-screen w-full bg-stone-50 text-stone-900 flex flex-col antialiased selection:bg-stone-200">
      {/* Top Header Bar: Rendered ONLY on the second screen while actively listening */}
      {isListening && (
        <header className="w-full border-b border-stone-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
            {/* Brand Wordmark */}
            <span className="font-black text-xl tracking-tight text-stone-900 shrink-0">
              visuan
            </span>

            {/* Center: Stop Button to end the current listening session */}
            <div className="flex items-center justify-center">
              <StopOvalButton
                onStopListening={handleToggleListening}
                colorBlindMode={colorBlindMode}
              />
            </div>

            {/* Right: Consolidated "Test Sounds" Button & "Settings" Button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsTesterOpen(true)}
                aria-label="Open test sounds"
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  colorBlindMode
                    ? 'text-white bg-sky-700 hover:bg-sky-800'
                    : 'text-emerald-900 bg-emerald-100 hover:bg-emerald-200/80'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Test Sounds</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                aria-label="Open settings"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200/80 transition-colors cursor-pointer whitespace-nowrap"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-stone-600" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 flex flex-col items-center justify-center">
        {errorMessage && (
          <div
            className={`mb-6 w-full max-w-md text-center text-xs px-4 py-3 rounded-xl border ${
              colorBlindMode
                ? 'text-orange-900 bg-orange-50 border-orange-300'
                : 'text-red-700 bg-red-50 border-red-200'
            }`}
          >
            {errorMessage}
          </div>
        )}

        {isListening ? (
          /* Screen 2: Active Sound Notifications Feed */
          <div className="w-full flex-1 flex flex-col items-center justify-start py-2">
            <SoundNotificationsList
              notifications={notifications}
              onClear={handleClearNotifications}
              isAnalyzing={isAnalyzing}
              colorBlindMode={colorBlindMode}
            />
          </div>
        ) : (
          /* Screen 1: Clean Intro Page with Title, Simple Subtitle, and Listen Button */
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <ListenButton
              onStartListening={handleToggleListening}
              colorBlindMode={colorBlindMode}
            />
          </div>
        )}
      </main>

      {/* Sound Tester Modal (accessible from the top bar while listening) */}
      <SoundTesterModal
        isOpen={isTesterOpen}
        onClose={() => setIsTesterOpen(false)}
        onTriggerDetection={handleAlert}
        colorBlindMode={colorBlindMode}
      />

      {/* Settings Modal (Sensitivity & Colorblind Mode) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        sensitivity={sensitivity}
        onSelectSensitivity={handleSelectSensitivity}
        colorBlindMode={colorBlindMode}
        onToggleColorBlindMode={handleToggleColorBlindMode}
        currentDecibels={audioMetrics.db}
      />

      {/* Pre-Listening Live Audio Capture Notice Modal */}
      <AudioDisclaimerModal
        isOpen={isDisclaimerOpen}
        onClose={() => setIsDisclaimerOpen(false)}
        onConfirm={handleConfirmStartListening}
        colorBlindMode={colorBlindMode}
      />
    </div>
  );
}

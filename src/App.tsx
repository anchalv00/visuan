/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
import { SlidersHorizontal, Sparkles, Volume2 } from 'lucide-react';

const STORAGE_KEY_SENSITIVITY = 'visual_soundboard_sensitivity';
const STORAGE_KEY_NOTIFICATIONS = 'visual_soundboard_notifications';

export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [notifications, setNotifications] = useState<SoundAlert[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [sensitivity, setSensitivity] = useState<MicSensitivity>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SENSITIVITY) as MicSensitivity;
      return saved === 'high' || saved === 'medium' || saved === 'low' ? saved : 'medium';
    } catch {
      return 'medium';
    }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics>({
    db: 0,
    frequencyData: new Uint8Array(0),
    timeDomainData: new Uint8Array(0),
    estimatedDirection: 'center',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync sensitivity with audioClassifier
  useEffect(() => {
    audioClassifier.setSensitivity(sensitivity);
  }, [sensitivity]);

  const handleSelectSensitivity = (newSensitivity: MicSensitivity) => {
    setSensitivity(newSensitivity);
    audioClassifier.setSensitivity(newSensitivity);
    try {
      localStorage.setItem(STORAGE_KEY_SENSITIVITY, newSensitivity);
    } catch (e) {
      // ignore
    }
  };

  // Handle detected sound alert from ambient classifier
  const handleAlert = useCallback((alert: SoundAlert) => {
    triggerHaptic(alert.haptic_pattern, alert.urgency, 'medium');

    setNotifications((prev) => {
      // Prevent rapid duplicate notifications for same sound within 2 seconds
      if (prev.length > 0 && prev[0].sound_name === alert.sound_name && Date.now() - prev[0].timestamp < 2000) {
        return prev;
      }
      const updated = [alert, ...prev.slice(0, 49)];
      try {
        localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  }, []);

  // Subscribe to audio classifier events
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
        if (msg) setStatusMessage(msg);
      }
    });

    return () => {
      unsubAlert();
      unsubMetrics();
      unsubState();
    };
  }, [handleAlert]);

  // Toggle listening functionality
  const handleToggleListening = () => {
    setErrorMessage(null);
    if (isListening) {
      audioClassifier.stopListening();
    } else {
      // Pop up the disclaimer modal before initiating live audio capture
      setIsDisclaimerOpen(true);
    }
  };

  // Called when user acknowledges the disclaimer and confirms starting listening
  const handleConfirmStartListening = async () => {
    setIsDisclaimerOpen(false);
    setErrorMessage(null);

    // Every time listen is clicked, start from a fresh plate and clear all previous notifications
    setNotifications([]);
    try {
      localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
    } catch (e) {
      // ignore
    }

    try {
      await audioClassifier.startListening();
    } catch (err: any) {
      console.error('Failed to start listening:', err);
      setErrorMessage(err?.message || 'Could not access microphone');
    }
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    try {
      localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="min-h-screen w-full bg-stone-50 text-stone-900 flex flex-col antialiased selection:bg-stone-200">
      {/* Top Header Bar */}
      <header className="w-full border-b border-stone-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Brand Wordmark: visuan */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-stone-900 flex items-center justify-center text-white shadow-xs">
              <Volume2 className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-lg tracking-tight text-stone-900 font-sans">
                visuan
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                tool
              </span>
            </div>
          </div>

          {/* Top Center: Circular Rectangle (Horizontal Oval) Red Stop Button when listening */}
          <div className="flex items-center justify-center flex-1">
            {isListening && (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                <StopOvalButton onStopListening={handleToggleListening} />
              </div>
            )}
          </div>

          {/* Actions (Top Right) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Always accessible Test Sounds button for judges and users */}
            <button
              type="button"
              onClick={() => setIsTesterOpen(true)}
              aria-label="Open sound tester modal"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Test Sounds</span>
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open microphone settings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 shadow-xs transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col items-center justify-center">
        {/* Error Notice */}
        {errorMessage && (
          <div className="mb-6 w-full max-w-md text-center text-xs text-rose-600 bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-xl shadow-sm">
            {errorMessage}
          </div>
        )}

        {isListening ? (
          /* Active State: Notifications Feed List */
          <div className="w-full flex-1 flex flex-col items-center justify-start py-2">
            <SoundNotificationsList
              notifications={notifications}
              onClear={handleClearNotifications}
              onOpenTester={() => setIsTesterOpen(true)}
              isAnalyzing={isAnalyzing}
            />
          </div>
        ) : (
          /* Standby State: Central Listen Icon Button with Fancy visuan Introduction */
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <ListenButton
              onStartListening={handleToggleListening}
              onOpenTester={() => setIsTesterOpen(true)}
              statusMessage={statusMessage}
            />
          </div>
        )}
      </main>

      {/* Sound Tester Modal for Judges & Hackathon Demo */}
      <SoundTesterModal
        isOpen={isTesterOpen}
        onClose={() => setIsTesterOpen(false)}
        onTriggerDetection={handleAlert}
      />

      {/* Microphone Sensitivity Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        sensitivity={sensitivity}
        onSelectSensitivity={handleSelectSensitivity}
        currentDecibels={audioMetrics.db}
      />

      {/* Audio Capture Disclaimer Modal */}
      <AudioDisclaimerModal
        isOpen={isDisclaimerOpen}
        onClose={() => setIsDisclaimerOpen(false)}
        onConfirm={handleConfirmStartListening}
      />
    </div>
  );
}

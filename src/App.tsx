/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { SoundAlert } from './types/sound';
import { audioClassifier, AudioMetrics } from './services/audioClassifier';
import { triggerHaptic } from './services/haptics';
import { MicrophoneController } from './components/MicrophoneController';

export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentAlert, setCurrentAlert] = useState<SoundAlert | null>(null);
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics>({
    db: 0,
    frequencyData: new Uint8Array(0),
    timeDomainData: new Uint8Array(0),
    estimatedDirection: 'center',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle detected sound alert from ambient classifier
  const handleAlert = useCallback((alert: SoundAlert) => {
    setCurrentAlert(alert);
    triggerHaptic(alert.haptic_pattern, alert.urgency, 'medium');

    // Auto-clear active alert indicator after 4 seconds
    const timer = setTimeout(() => {
      setCurrentAlert((curr) => (curr?.id === alert.id ? null : curr));
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  // Subscribe to audio classifier events
  useEffect(() => {
    const unsubAlert = audioClassifier.subscribeAlert(handleAlert);
    const unsubMetrics = audioClassifier.subscribeMetrics((metrics) => {
      setAudioMetrics(metrics);
    });
    const unsubState = audioClassifier.subscribeState((state, msg) => {
      setIsListening(state === 'listening');
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
  const handleToggleListening = async () => {
    setErrorMessage(null);
    if (isListening) {
      audioClassifier.stopListening();
    } else {
      try {
        await audioClassifier.startListening();
      } catch (err: any) {
        console.error('Failed to start listening:', err);
        setErrorMessage(err?.message || 'Could not access microphone');
      }
    }
  };

  return (
    <main className="min-h-screen w-full bg-stone-50 text-stone-900 flex flex-col items-center justify-center p-6 antialiased selection:bg-stone-200">
      <div className="flex flex-col items-center justify-center w-full max-w-md">
        <MicrophoneController
          isListening={isListening}
          statusMessage={statusMessage}
          currentAlert={currentAlert}
          onToggleListening={handleToggleListening}
          decibels={audioMetrics.db}
        />

        {/* Clean Error Message if Microphone Permission is Denied */}
        {errorMessage && (
          <div className="mt-6 text-center text-xs text-rose-600 bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl">
            {errorMessage}
          </div>
        )}
      </div>
    </main>
  );
}

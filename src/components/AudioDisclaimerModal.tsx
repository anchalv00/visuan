/**
 * @file AudioDisclaimerModal.tsx
 * @description Pre-Listening Live Audio Capture Notice Modal.
 *
 * How this file relates to the app's design & functionality:
 * - Displayed immediately after the user clicks the circular "Listen" button on the home screen.
 * - Sets transparent expectations that live microphone capture can be affected by hardware
 *   filters, room echo, distance, or laptop speaker compression, and informs the user/judge
 *   that they can also use the "Test Sounds" button on the next screen to test detection directly.
 * - Upon clicking "Continue", `App.tsx` clears all previous notifications (starting from a
 *   fresh slate) and activates the microphone.
 */

import React, { useEffect } from 'react';
import { Mic, Volume2, X } from 'lucide-react';

interface AudioDisclaimerModalProps {
  /** Whether the disclaimer dialog is currently shown */
  isOpen: boolean;
  /** Callback when the user cancels or dismisses the modal */
  onClose: () => void;
  /** Callback when the user confirms and starts the live listening session */
  onConfirm: () => void;
  /** Adapts the primary "Continue" button to Sky Blue when Colorblind Mode is active */
  colorBlindMode?: boolean;
}

export const AudioDisclaimerModal: React.FC<AudioDisclaimerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  colorBlindMode = false,
}) => {
  // Allow keyboard users to dismiss the modal with the Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden flex flex-col text-stone-900 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-4 h-4 text-stone-700" />
            <h2
              id="disclaimer-modal-title"
              className="text-base font-bold text-stone-900"
            >
              Live Audio Notice
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close notice"
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3 text-sm text-stone-600 leading-relaxed">
          <p className="text-stone-900 font-medium">
            Live audio cannot always be captured with 100% accuracy.
          </p>
          <p>
            Microphone hardware, room echo, distance, and speaker compression when playing videos can affect how sounds are detected. You can also use <strong>Test Sounds</strong> on the next screen to test detection directly.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
              colorBlindMode
                ? 'bg-sky-700 hover:bg-sky-800'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
};

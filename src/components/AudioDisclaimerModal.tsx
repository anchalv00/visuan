import React, { useEffect } from 'react';
import { AlertTriangle, Mic, Sparkles, X, Volume2, CheckCircle2 } from 'lucide-react';

interface AudioDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const AudioDisclaimerModal: React.FC<AudioDisclaimerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  // Handle escape key
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200/90 overflow-hidden flex flex-col text-stone-900 animate-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2
                id="disclaimer-modal-title"
                className="text-base font-bold text-stone-900 tracking-tight"
              >
                Live Audio Capture Notice
              </h2>
              <span className="text-[11px] font-mono text-stone-500">
                Acoustic & Hardware Advisory
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close disclaimer modal"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-5 space-y-4 text-stone-700 text-sm leading-relaxed">
          {/* Main Notice Callout */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs sm:text-sm">
            <p className="font-semibold mb-1 flex items-center gap-1.5 text-amber-950">
              <Volume2 className="w-4 h-4 text-amber-700 shrink-0" />
              Live audio cannot be 100% accurately captured in all environments.
            </p>
            <p className="text-amber-800 text-xs leading-normal">
              Microphone hardware limitations, acoustic echo, room distance, and speaker compression when playing external videos can impede audio clarity.
            </p>
          </div>

          {/* Key Bullet Guidelines */}
          <div className="space-y-2.5 text-xs sm:text-sm text-stone-600">
            <div className="flex items-start gap-2.5">
              <div className="w-4 h-4 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-stone-700">
                1
              </div>
              <p>
                <strong>Fresh Slate Session:</strong> Every time you click Listen, previous notifications are cleared so you start with an unobstructed, real-time alert feed.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-4 h-4 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-stone-700">
                2
              </div>
              <p>
                <strong>Not for Life-Critical Safety:</strong> While Visuan employs advanced acoustic feature extraction and AI classification, do not use it as a substitute for certified smoke detectors or personal safety systems.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-4 h-4 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-stone-700">
                3
              </div>
              <p>
                <strong>Hackathon & Demo Tip:</strong> When playing audio from a video or phone, place the speaker near your microphone or use the top-right <span className="font-semibold text-emerald-800">"Test Sounds"</span> feature to audition precise acoustic triggers.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200/80 flex items-center justify-end gap-2.5">
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm transition-all cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Understand & Start Listening</span>
          </button>
        </div>
      </div>
    </div>
  );
};

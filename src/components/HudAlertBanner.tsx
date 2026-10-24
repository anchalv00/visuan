import React, { useEffect, useState } from 'react';
import { ColorBlindMode, SoundAlert } from '../types/sound';
import { getUrgencyTheme } from '../utils/theme';
import { triggerHaptic } from '../services/haptics';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Compass,
  Repeat,
  Volume2,
  X,
  Zap,
} from 'lucide-react';

interface HudAlertBannerProps {
  alert: SoundAlert | null;
  colorBlindMode: ColorBlindMode;
  screenFlashEnabled: boolean;
  onDismiss: () => void;
  autoDismissSeconds?: number;
}

export const HudAlertBanner: React.FC<HudAlertBannerProps> = ({
  alert,
  colorBlindMode,
  screenFlashEnabled,
  onDismiss,
  autoDismissSeconds = 8,
}) => {
  const [timeLeft, setTimeLeft] = useState(autoDismissSeconds);
  const [isFlashing, setIsFlashing] = useState(true);

  useEffect(() => {
    if (!alert) return;

    setTimeLeft(autoDismissSeconds);
    setIsFlashing(true);
    const flashTimer = setTimeout(() => setIsFlashing(false), 2400);

    if (autoDismissSeconds > 0) {
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onDismiss();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        clearTimeout(flashTimer);
        clearInterval(interval);
      };
    }

    return () => clearTimeout(flashTimer);
  }, [alert?.id, autoDismissSeconds, onDismiss]);

  if (!alert) return null;

  const theme = getUrgencyTheme(alert.urgency, colorBlindMode);

  const getDirectionIcon = (dir: string) => {
    switch (dir) {
      case 'left':
        return <ArrowLeft className="w-5 h-5 text-current animate-pulse" />;
      case 'right':
        return <ArrowRight className="w-5 h-5 text-current animate-pulse" />;
      case 'behind':
        return <ArrowDown className="w-5 h-5 text-current animate-pulse" />;
      case 'approaching':
        return <Zap className="w-5 h-5 text-current animate-bounce" />;
      case 'omni':
        return <Compass className="w-5 h-5 text-current" />;
      default:
        return <ArrowUp className="w-5 h-5 text-current" />;
    }
  };

  const handleReplayHaptic = () => {
    triggerHaptic(alert.haptic_pattern, alert.urgency, 'high');
  };

  return (
    <>
      {/* Optional Screen Flash Edge Strobe for Deaf/Hard-of-Hearing Immediate Peripheral Notice */}
      {screenFlashEnabled && isFlashing && alert.urgency === 'urgent' && (
        <div className="fixed inset-0 pointer-events-none z-50 border-8 border-red-500 animate-ping opacity-75" />
      )}

      <div
        role="alert"
        aria-live="assertive"
        className={`fixed top-4 left-4 right-4 max-w-4xl mx-auto z-40 rounded-2xl p-4 sm:p-5 transition-all duration-300 ${
          theme.bg
        } ${theme.border} ${theme.glow} shadow-2xl backdrop-blur-md`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Urgency Badge & Sound Name */}
          <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${theme.badgeBg} ${theme.badgeText} shadow-md`}
            >
              <span className="text-2xl leading-none">{theme.symbol}</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span
                  className={`px-2.5 py-0.5 text-xs font-black rounded-md tracking-wider uppercase ${theme.badgeBg} ${theme.badgeText}`}
                >
                  {theme.label}
                </span>

                {/* Direction Tag */}
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-black/40 border border-white/20 text-xs font-bold text-white uppercase">
                  {getDirectionIcon(alert.direction_cue)}
                  <span>Direction: {alert.direction_cue}</span>
                </div>

                {alert.decibels ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/30 border border-white/10 text-xs font-mono text-neutral-300">
                    <Volume2 className="w-3 h-3" />
                    {alert.decibels} dB
                  </span>
                ) : null}
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">
                {alert.sound_name}
              </h2>
              <p className="text-sm font-medium text-neutral-200 mt-0.5 line-clamp-2">
                {alert.description}
              </p>
            </div>
          </div>

          {/* Action Buttons: Repeat Haptic & Dismiss */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={handleReplayHaptic}
              title="Feel haptic pulse again"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-xs sm:text-sm font-bold text-white border border-white/20"
            >
              <Repeat className="w-4 h-4" />
              <span>Feel Haptic</span>
            </button>

            <button
              onClick={onDismiss}
              aria-label="Dismiss alert"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 transition-all text-white border border-white/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Auto Dismiss Progress Bar */}
        {autoDismissSeconds > 0 && (
          <div className="w-full bg-black/40 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-linear ${theme.badgeBg}`}
              style={{ width: `${(timeLeft / autoDismissSeconds) * 100}%` }}
            />
          </div>
        )}
      </div>
    </>
  );
};

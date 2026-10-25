/**
 * @file SoundNotificationsList.tsx
 * @description Real-Time Visual Sound Notification Feed.
 *
 * How this file relates to the app's design & functionality:
 * - Renders the core visual output of `visuan` on the second screen (`isListening`).
 * - Whenever a sound is detected (either via live microphone capture or the "Test Sounds"
 *   button in the top header), it appears at the top of this list with:
 *   1. An intuitive category icon (`Siren`, `Baby`, `Flame`, `DoorClosed`, `Bell`, `Clock`, `Car`).
 *   2. A bold urgency badge (`Urgent`, `Alert`, or `Notice`).
 *   3. A relative timestamp (`Just now`, `12s ago`, `3m ago`).
 *   4. A plain-English description of the acoustic pattern.
 * - Supports Colorblind Mode by switching from Red/Amber/Emerald to high-contrast
 *   Okabe-Ito Orange (`urgent`) and Sky Blue (`warning`).
 */

import React from 'react';
import { SoundAlert } from '../types/sound';
import {
  Baby,
  Bell,
  Clock,
  Flame,
  ShieldAlert,
  Siren,
  Volume2,
  Trash2,
  Car,
  DoorClosed,
} from 'lucide-react';

interface SoundNotificationsListProps {
  /** Array of detected sound alerts ordered from newest to oldest */
  notifications: SoundAlert[];
  /** Callback to clear all notifications from state and localStorage */
  onClear: () => void;
  /** Indicates whether a 2.5s audio chunk is currently being classified */
  isAnalyzing?: boolean;
  /** Enables Okabe-Ito Blue & Orange high-contrast palette for colorblind users */
  colorBlindMode?: boolean;
}

export const SoundNotificationsList: React.FC<SoundNotificationsListProps> = ({
  notifications,
  onClear,
  isAnalyzing = false,
  colorBlindMode = false,
}) => {
  /**
   * Maps a sound's name and urgency level to a recognizable Lucide icon and accessible color class.
   * Pairing distinct icons with color badges ensures users never have to rely on color alone.
   */
  const getSoundIcon = (name: string, urgency: string) => {
    const lower = name.toLowerCase();
    const iconColor = colorBlindMode
      ? urgency === 'urgent'
        ? 'text-orange-700'
        : urgency === 'warning'
        ? 'text-sky-700'
        : 'text-stone-700'
      : urgency === 'urgent'
      ? 'text-red-600'
      : urgency === 'warning'
      ? 'text-amber-600'
      : 'text-stone-600';

    if (lower.includes('baby') || lower.includes('cry')) return <Baby className={`w-5 h-5 ${iconColor}`} />;
    if (lower.includes('smoke') || lower.includes('fire')) return <Flame className={`w-5 h-5 ${iconColor}`} />;
    if (lower.includes('security') || lower.includes('burglar')) return <ShieldAlert className={`w-5 h-5 ${iconColor}`} />;
    if (lower.includes('knock') || lower.includes('door')) return <DoorClosed className={`w-5 h-5 ${iconColor}`} />;
    if (lower.includes('timer') || lower.includes('clock') || lower.includes('microwave') || lower.includes('oven')) {
      return <Clock className={`w-5 h-5 ${iconColor}`} />;
    }
    if (lower.includes('siren') || lower.includes('police') || lower.includes('ambulance')) {
      return <Siren className={`w-5 h-5 ${iconColor}`} />;
    }
    if (lower.includes('honk') || lower.includes('car') || lower.includes('horn')) {
      return <Car className={`w-5 h-5 ${iconColor}`} />;
    }
    if (lower.includes('bell') || lower.includes('bike') || lower.includes('bicycle')) {
      return <Bell className={`w-5 h-5 ${iconColor}`} />;
    }
    return <Volume2 className={`w-5 h-5 ${iconColor}`} />;
  };

  /**
   * Renders a high-contrast urgency pill (`Urgent`, `Alert`, `Notice`) so Deaf and Hard of Hearing
   * users can assess how quickly they need to react at a single glance.
   */
  const getUrgencyLabel = (urgency: string) => {
    if (urgency === 'urgent') {
      return (
        <span
          className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
            colorBlindMode
              ? 'text-white bg-orange-600'
              : 'text-red-700 bg-red-100'
          }`}
        >
          Urgent
        </span>
      );
    }
    if (urgency === 'warning') {
      return (
        <span
          className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
            colorBlindMode
              ? 'text-sky-900 bg-sky-100 border border-sky-300'
              : 'text-amber-800 bg-amber-100'
          }`}
        >
          Alert
        </span>
      );
    }
    return (
      <span className="text-xs font-medium uppercase tracking-wider text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-md">
        Notice
      </span>
    );
  };

  /**
   * Formats a Unix millisecond timestamp into a human-friendly relative string.
   */
  const formatTimestamp = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 5) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-4 animate-in fade-in duration-300">
      {/* Section Header with Notification Count, Live Analyzing Indicator, and Clear Button */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-bold text-stone-900 tracking-tight">
            Notifications
          </h2>
          <span className="text-xs font-mono text-stone-500 tabular-nums">
            · {notifications.length}
          </span>
          {isAnalyzing && (
            <span
              className={`text-xs font-medium ${
                colorBlindMode ? 'text-sky-700' : 'text-emerald-700'
              }`}
            >
              · Analyzing...
            </span>
          )}
        </div>

        {notifications.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 px-2.5 py-1 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear all
          </button>
        )}
      </div>

      {/* Empty State vs. Populated Notification Cards */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
              colorBlindMode
                ? 'bg-sky-100 text-sky-700'
                : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            <Volume2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900 mb-1">
            Listening for sounds...
          </h3>
          <p className="text-sm text-stone-500 max-w-sm">
            Detected sounds will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((alert, index) => {
            // Card border and background tint adapt to both urgency and Colorblind Mode
            const cardStyle = colorBlindMode
              ? alert.urgency === 'urgent'
                ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500/30'
                : alert.urgency === 'warning'
                ? 'border-sky-400 bg-sky-50/30'
                : 'border-stone-200 bg-white'
              : alert.urgency === 'urgent'
              ? 'border-red-300 bg-red-50/20'
              : alert.urgency === 'warning'
              ? 'border-amber-300 bg-amber-50/20'
              : 'border-stone-200 bg-white';

            const iconBoxStyle = colorBlindMode
              ? alert.urgency === 'urgent'
                ? 'bg-orange-100 border border-orange-300'
                : alert.urgency === 'warning'
                ? 'bg-sky-100 border border-sky-300'
                : 'bg-stone-100 border border-stone-200'
              : alert.urgency === 'urgent'
              ? 'bg-red-50 border border-red-200'
              : alert.urgency === 'warning'
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-stone-100 border border-stone-200';

            return (
              <div
                key={alert.id || index}
                className={`flex items-start gap-3.5 p-4 rounded-xl border shadow-2xs transition-all ${cardStyle}`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBoxStyle}`}
                >
                  {getSoundIcon(alert.sound_name, alert.urgency)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-sm font-bold text-stone-900 truncate">
                      {alert.sound_name}
                    </h4>
                    <div className="flex items-center gap-2 shrink-0">
                      {getUrgencyLabel(alert.urgency)}
                      <span className="text-xs font-mono text-stone-500 tabular-nums">
                        {formatTimestamp(alert.timestamp)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    {alert.description || 'Sound detected in your environment'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

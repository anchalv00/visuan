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
  Sparkles,
  Car,
  DoorClosed,
} from 'lucide-react';

interface SoundNotificationsListProps {
  notifications: SoundAlert[];
  onClear: () => void;
  onOpenTester?: () => void;
  isAnalyzing?: boolean;
}

export const SoundNotificationsList: React.FC<SoundNotificationsListProps> = ({
  notifications,
  onClear,
  onOpenTester,
  isAnalyzing = false,
}) => {
  // Select contextual icon based on sound name
  const getSoundIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('baby') || lower.includes('cry')) return <Baby className="w-5 h-5 text-rose-500" />;
    if (lower.includes('smoke') || lower.includes('fire')) return <Flame className="w-5 h-5 text-red-600" />;
    if (lower.includes('security') || lower.includes('burglar')) return <ShieldAlert className="w-5 h-5 text-red-600" />;
    if (lower.includes('knock') || lower.includes('door')) return <DoorClosed className="w-5 h-5 text-amber-600" />;
    if (lower.includes('timer') || lower.includes('clock') || lower.includes('microwave') || lower.includes('oven')) {
      return <Clock className="w-5 h-5 text-amber-500" />;
    }
    if (lower.includes('siren') || lower.includes('police') || lower.includes('ambulance')) {
      return <Siren className="w-5 h-5 text-red-500" />;
    }
    if (lower.includes('honk') || lower.includes('car') || lower.includes('horn')) {
      return <Car className="w-5 h-5 text-amber-600" />;
    }
    if (lower.includes('bell') || lower.includes('bike') || lower.includes('bicycle')) {
      return <Bell className="w-5 h-5 text-blue-500" />;
    }
    return <Volume2 className="w-5 h-5 text-stone-600" />;
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 border border-red-200/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            Urgent
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-200/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Warning
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
            Notice
          </span>
        );
    }
  };

  const formatTimestamp = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 5) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4 animate-in fade-in duration-300">
      {/* Header with Title, Analyzing Indicator, Test Button and Clear Action */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
            Live Sound Notifications
          </h2>
          <span className="text-xs font-semibold text-stone-500 bg-stone-200/70 px-2 py-0.5 rounded-full">
            {notifications.length}
          </span>
          {isAnalyzing ? (
            <span className="hidden sm:inline-flex text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Analyzing audio
            </span>
          ) : (
            <span className="hidden sm:inline-flex text-[11px] font-medium text-stone-500 bg-stone-100 border border-stone-200/80 px-2 py-0.5 rounded-full items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active listening
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpenTester && (
            <button
              type="button"
              onClick={onOpenTester}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Test Sounds</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 px-2.5 py-1 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Notifications Feed */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-white rounded-2xl border border-stone-200/80 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center mb-3">
            <Volume2 className="w-6 h-6 text-emerald-600 animate-pulse" />
          </div>
          <h3 className="text-base font-bold text-stone-800 mb-1">
            Listening for Sounds
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 max-w-md mb-5 leading-relaxed">
            The microphone is continuously monitoring ambient audio. When sounds occur, notifications will appear here instantly with tactile vibration.
          </p>

          {/* Recognition Checklist Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-lg mb-6">
            {[
              'Emergency Siren (Wail & Hi-Lo)',
              'Baby Crying',
              'Door Knocking',
              'Smoke Alarm (T3)',
              'Kitchen Timers',
              'Bicycle Bell',
              'Car Horn',
              'Security Alarm',
            ].map((sound) => (
              <span
                key={sound}
                className="text-[11px] font-medium text-stone-600 bg-stone-100 border border-stone-200/60 px-2.5 py-1 rounded-full"
              >
                {sound}
              </span>
            ))}
          </div>

          {/* Single Dedicated Test Button for Judges & Hackathon Demo */}
          {onOpenTester && (
            <button
              type="button"
              onClick={onOpenTester}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-stone-900 hover:bg-stone-800 transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Test Known Sounds & Detection</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {notifications.map((alert, index) => (
            <div
              key={alert.id || index}
              className={`flex items-start gap-3.5 p-4 rounded-xl border bg-white shadow-sm transition-all animate-in slide-in-from-top-2 duration-200 ${
                alert.urgency === 'urgent'
                  ? 'border-red-200 ring-1 ring-red-400/20'
                  : alert.urgency === 'warning'
                  ? 'border-amber-200 ring-1 ring-amber-400/20'
                  : 'border-stone-200'
              }`}
            >
              {/* Sound Icon Box */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  alert.urgency === 'urgent'
                    ? 'bg-red-50 border border-red-200/80'
                    : alert.urgency === 'warning'
                    ? 'bg-amber-50 border border-amber-200/80'
                    : 'bg-stone-50 border border-stone-200'
                }`}
              >
                {getSoundIcon(alert.sound_name)}
              </div>

              {/* Sound Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-sm font-bold text-stone-900 truncate">
                    {alert.sound_name}
                  </h4>
                  <div className="flex items-center gap-2 shrink-0">
                    {getUrgencyBadge(alert.urgency)}
                    <span className="text-[11px] font-mono text-stone-400">
                      {formatTimestamp(alert.timestamp)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                  {alert.description || 'Identified by acoustic analysis model'}
                </p>

                {alert.direction_cue && alert.direction_cue !== 'center' && (
                  <div className="mt-1.5 text-[11px] font-medium text-stone-500 flex items-center gap-1">
                    <span>Source direction:</span>
                    <strong className="capitalize text-stone-700">
                      {alert.direction_cue}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

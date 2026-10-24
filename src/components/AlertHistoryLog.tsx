import React, { useState } from 'react';
import { ColorBlindMode, SoundAlert, SoundUrgency } from '../types/sound';
import { getUrgencyTheme } from '../utils/theme';
import { triggerHaptic } from '../services/haptics';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Clock,
  Compass,
  Filter,
  Repeat,
  Trash2,
  Volume2,
  Zap,
} from 'lucide-react';

interface AlertHistoryLogProps {
  alerts: SoundAlert[];
  colorBlindMode: ColorBlindMode;
  onClearHistory: () => void;
}

export const AlertHistoryLog: React.FC<AlertHistoryLogProps> = ({
  alerts,
  colorBlindMode,
  onClearHistory,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<SoundUrgency | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAlerts = alerts.filter((alert) => {
    const matchesUrgency = selectedFilter === 'all' || alert.urgency === selectedFilter;
    const matchesSearch =
      !searchQuery ||
      alert.sound_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesUrgency && matchesSearch;
  });

  const getDirectionIcon = (dir: string) => {
    switch (dir) {
      case 'left':
        return <ArrowLeft className="w-3.5 h-3.5 text-current" />;
      case 'right':
        return <ArrowRight className="w-3.5 h-3.5 text-current" />;
      case 'behind':
        return <ArrowDown className="w-3.5 h-3.5 text-current" />;
      case 'approaching':
        return <Zap className="w-3.5 h-3.5 text-current" />;
      case 'omni':
        return <Compass className="w-3.5 h-3.5 text-current" />;
      default:
        return <ArrowUp className="w-3.5 h-3.5 text-current" />;
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="flex flex-col bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            Alert Detection Timeline
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Log of classified environmental sounds, directional cues, and acoustic decibels.
          </p>
        </div>

        {alerts.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold self-start sm:self-auto border border-neutral-700 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Log</span>
          </button>
        )}
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
          <Filter className="w-3.5 h-3.5 text-neutral-500 ml-2 mr-1" />
          {(['all', 'urgent', 'warning', 'info', 'subtle'] as const).map((filter) => {
            const isSelected = selectedFilter === filter;
            const theme = filter !== 'all' ? getUrgencyTheme(filter, colorBlindMode) : null;

            return (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs capitalize transition-all ${
                  isSelected
                    ? filter === 'all'
                      ? 'bg-neutral-200 text-neutral-950'
                      : `${theme?.badgeBg} ${theme?.badgeText}`
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {theme ? `${theme.symbol} ${filter}` : 'All'}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter sound..."
          className="flex-1 min-w-[140px] px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
        />
      </div>

      {/* Alerts Timeline List */}
      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-neutral-950/40 border border-dashed border-neutral-800 text-center">
            <Volume2 className="w-8 h-8 text-neutral-600 mb-2" />
            <p className="text-sm font-semibold text-neutral-400">No sounds logged yet</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm">
              Start listening with the microphone or use the soundboard above to test immediate ambient classification.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const theme = getUrgencyTheme(alert.urgency, colorBlindMode);

            return (
              <div
                key={alert.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all ${
                  theme.bg
                } ${theme.border} shadow-sm`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${theme.badgeBg} ${theme.badgeText} shadow`}
                  >
                    <span className="text-base font-black leading-none">{theme.symbol}</span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-white">
                        {alert.sound_name}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${theme.badgeBg} ${theme.badgeText}`}
                      >
                        {alert.urgency}
                      </span>
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/40 text-[10px] font-bold text-neutral-200 border border-white/10 uppercase">
                        {getDirectionIcon(alert.direction_cue)}
                        {alert.direction_cue}
                      </span>
                      {alert.decibels ? (
                        <span className="text-[10px] font-mono text-neutral-300">
                          {alert.decibels} dB
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs text-neutral-300 mt-0.5 line-clamp-1">
                      {alert.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-white/10">
                  <span className="text-[11px] font-mono text-neutral-400">
                    {formatTime(alert.timestamp)}
                  </span>

                  <button
                    onClick={() => triggerHaptic(alert.haptic_pattern, alert.urgency, 'high')}
                    title="Feel vibration pattern"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 active:scale-95 transition-all"
                  >
                    <Repeat className="w-3 h-3" />
                    <span>Haptic</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

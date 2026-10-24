import React from 'react';
import {
  Mic,
  Square,
  Sparkles,
  ShieldAlert,
  Ear,
  Activity,
  Vibrate,
  ArrowRight,
  Flame,
  Baby,
  DoorClosed,
  Siren,
  Bell,
  Clock,
  Car,
} from 'lucide-react';

interface ListenButtonProps {
  onStartListening: () => void;
  onOpenTester?: () => void;
  statusMessage?: string;
}

export const ListenButton: React.FC<ListenButtonProps> = ({
  onStartListening,
  onOpenTester,
  statusMessage,
}) => {
  return (
    <div className="w-full max-w-3xl flex flex-col items-center select-none text-center px-4 py-4 animate-in fade-in duration-300">
      {/* Fancy Tool Header: VISUAN */}
      <div className="flex flex-col items-center mb-8 max-w-2xl">
        {/* Precision Tool Hardware / Technical Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900 text-stone-100 text-[11px] font-mono tracking-widest uppercase mb-4 shadow-sm border border-stone-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Acoustic Sensory Tool • v2.4</span>
        </div>

        {/* Fancy Title: visuan */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-stone-900 font-sans">
            visuan
          </h1>
          <span className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-stone-600 bg-stone-200/80 rounded-md self-center border border-stone-300/60">
            PRO
          </span>
        </div>

        {/* Explanatory description: how this app detects known sounds for deaf people */}
        <p className="text-sm sm:text-base text-stone-600 max-w-xl leading-relaxed mb-5">
          Real-time environmental audio intelligence designed specifically for <strong>Deaf and Hard of Hearing</strong> individuals. Translates critical safety alarms, door knocks, crying, and traffic alerts into instant high-contrast visual notifications and tactile phone haptics.
        </p>

        {/* Known Sounds Pill Bar */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xl text-stone-700">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white border border-stone-200 px-2.5 py-1 rounded-full shadow-2xs">
            <Siren className="w-3 h-3 text-red-600" /> Sirens (Wail & Hi-Lo)
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white border border-stone-200 px-2.5 py-1 rounded-full shadow-2xs">
            <Baby className="w-3 h-3 text-rose-500" /> Baby Crying
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white border border-stone-200 px-2.5 py-1 rounded-full shadow-2xs">
            <DoorClosed className="w-3 h-3 text-amber-600" /> Door Knocking
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white border border-stone-200 px-2.5 py-1 rounded-full shadow-2xs">
            <Flame className="w-3 h-3 text-red-600" /> Smoke Alarms
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white border border-stone-200 px-2.5 py-1 rounded-full shadow-2xs">
            <Clock className="w-3 h-3 text-amber-600" /> Timers
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white border border-stone-200 px-2.5 py-1 rounded-full shadow-2xs">
            <Bell className="w-3 h-3 text-blue-600" /> Bike Bells
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white border border-stone-200 px-2.5 py-1 rounded-full shadow-2xs">
            <Car className="w-3 h-3 text-stone-700" /> Car Horns
          </span>
        </div>
      </div>

      {/* Main Action: Elegant Listen Radar Button */}
      <div className="relative flex flex-col items-center justify-center my-2">
        {/* Subtle acoustic radar halo */}
        <div className="absolute -inset-4 rounded-full bg-emerald-500/10 blur-xl animate-pulse pointer-events-none" />

        <button
          type="button"
          onClick={onStartListening}
          aria-label="Start listening to ambient sounds"
          className="relative group w-44 h-44 sm:w-52 sm:h-52 rounded-full flex flex-col items-center justify-center bg-white text-stone-800 border-2 border-stone-200/90 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.1),0_4px_16px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_24px_52px_-8px_rgba(0,0,0,0.16),0_8px_24px_-2px_rgba(0,0,0,0.08)] hover:border-emerald-500 hover:scale-[1.03] active:scale-95 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/40 cursor-pointer"
        >
          {/* Subtle concentric inner ring */}
          <div className="absolute inset-2.5 rounded-full border border-stone-100 group-hover:border-emerald-100 transition-colors pointer-events-none" />

          <div className="flex flex-col items-center justify-center gap-2 z-10">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-stone-50 group-hover:bg-emerald-50 flex items-center justify-center transition-colors">
              <Mic
                className="w-8 h-8 sm:w-9 sm:h-9 text-stone-700 group-hover:text-emerald-600 transition-colors duration-200"
                strokeWidth={2}
              />
            </div>
            <span className="text-xs sm:text-sm font-black tracking-widest text-stone-700 group-hover:text-stone-900 uppercase transition-colors">
              LISTEN
            </span>
          </div>
        </button>

        <p className="mt-4 text-xs sm:text-sm font-semibold text-stone-600 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {statusMessage || 'Tap to begin real-time ambient monitoring'}
        </p>
      </div>

      {/* Quick Judge & New User Guide (3-Step Intuitive Navigation) */}
      <div className="w-full mt-10 pt-6 border-t border-stone-200/80">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">
            How Visuan Works • Guide for Judges & Users
          </h2>
          {onOpenTester && (
            <button
              type="button"
              onClick={onOpenTester}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Audition Sounds Now</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          {/* Card 1 */}
          <div className="p-3.5 rounded-xl bg-white border border-stone-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 font-bold text-xs">
                1
              </div>
              <h3 className="text-xs font-bold text-stone-900 mb-1">
                Tap Listen
              </h3>
              <p className="text-[11px] text-stone-500 leading-normal">
                Starts local continuous ambient monitoring with zero audio recorded or saved to disk.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-3.5 rounded-xl bg-white border border-stone-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-2 font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-stone-900 mb-1">
                Acoustic AI Detection
              </h3>
              <p className="text-[11px] text-stone-500 leading-normal">
                Multi-band spectral features classify sirens, baby crying, knocks, and alarms in &lt; 2s.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-3.5 rounded-xl bg-white border border-stone-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center mb-2 font-bold text-xs">
                3
              </div>
              <h3 className="text-xs font-bold text-stone-900 mb-1">
                Visual & Tactile Alerts
              </h3>
              <p className="text-[11px] text-stone-500 leading-normal">
                Produces urgent visual cards and distinct phone vibration patterns for the deaf user.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Test Demo Bar for Judges */}
        {onOpenTester && (
          <div className="mt-4 p-3 rounded-xl bg-stone-100/80 border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs text-stone-700">
                <strong>Hackathon Evaluation Demo:</strong> Audition all 10 synthesized sounds and test the real-time detection pipeline immediately.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenTester}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              Open Sound Tester
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface StopOvalButtonProps {
  onStopListening: () => void;
}

export const StopOvalButton: React.FC<StopOvalButtonProps> = ({
  onStopListening,
}) => {
  return (
    <button
      type="button"
      onClick={onStopListening}
      aria-label="Stop listening"
      className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white shadow-md hover:shadow-lg transition-all border border-red-500 cursor-pointer group focus:outline-none focus-visible:ring-4 focus-visible:ring-red-400"
    >
      <Square className="w-3.5 h-3.5 fill-white text-white group-hover:scale-90 transition-transform" />
      <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
        Stop
      </span>
      <span className="w-2 h-2 rounded-full bg-white/90 animate-pulse ml-0.5" />
    </button>
  );
};

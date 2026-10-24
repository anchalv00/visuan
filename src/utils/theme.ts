import { ColorBlindMode, SoundUrgency } from '../types/sound';

export interface UrgencyTheme {
  bg: string;
  border: string;
  text: string;
  glow: string;
  badgeBg: string;
  badgeText: string;
  iconColor: string;
  symbol: string;
  label: string;
}

export const getUrgencyTheme = (
  urgency: SoundUrgency,
  mode: ColorBlindMode = 'standard'
): UrgencyTheme => {
  // High Contrast Monochrome Mode
  if (mode === 'monochrome') {
    switch (urgency) {
      case 'urgent':
        return {
          bg: 'bg-black text-white',
          border: 'border-white border-4',
          text: 'text-white',
          glow: 'shadow-[0_0_30px_rgba(255,255,255,0.8)]',
          badgeBg: 'bg-white',
          badgeText: 'text-black font-black',
          iconColor: 'text-white',
          symbol: '▲',
          label: 'CRITICAL / URGENT',
        };
      case 'warning':
        return {
          bg: 'bg-neutral-900 text-white',
          border: 'border-neutral-300 border-2 border-dashed',
          text: 'text-neutral-100',
          glow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]',
          badgeBg: 'bg-neutral-200',
          badgeText: 'text-neutral-950 font-bold',
          iconColor: 'text-neutral-200',
          symbol: '◼',
          label: 'WARNING',
        };
      case 'info':
        return {
          bg: 'bg-neutral-950 text-neutral-200',
          border: 'border-neutral-500 border-2',
          text: 'text-neutral-200',
          glow: 'shadow-[0_0_15px_rgba(255,255,255,0.2)]',
          badgeBg: 'bg-neutral-700',
          badgeText: 'text-white',
          iconColor: 'text-neutral-300',
          symbol: '●',
          label: 'INFO',
        };
      default:
        return {
          bg: 'bg-neutral-950 text-neutral-400',
          border: 'border-neutral-700 border',
          text: 'text-neutral-400',
          glow: 'shadow-none',
          badgeBg: 'bg-neutral-800',
          badgeText: 'text-neutral-300',
          iconColor: 'text-neutral-400',
          symbol: '◆',
          label: 'AMBIENT',
        };
    }
  }

  // Protanopia & Deuteranopia Mode (Red-Green Safe: Electric Blue, Amber Gold, Magenta)
  if (mode === 'protanopia') {
    switch (urgency) {
      case 'urgent':
        return {
          bg: 'bg-blue-950/90 text-white',
          border: 'border-blue-500 border-2',
          text: 'text-blue-100',
          glow: 'shadow-[0_0_35px_rgba(59,130,246,0.6)]',
          badgeBg: 'bg-blue-500',
          badgeText: 'text-white font-extrabold',
          iconColor: 'text-blue-300',
          symbol: '▲',
          label: 'URGENT',
        };
      case 'warning':
        return {
          bg: 'bg-amber-950/90 text-white',
          border: 'border-amber-400 border-2',
          text: 'text-amber-100',
          glow: 'shadow-[0_0_30px_rgba(251,191,36,0.5)]',
          badgeBg: 'bg-amber-400',
          badgeText: 'text-neutral-950 font-bold',
          iconColor: 'text-amber-300',
          symbol: '◼',
          label: 'WARNING',
        };
      case 'info':
        return {
          bg: 'bg-purple-950/90 text-white',
          border: 'border-purple-400 border',
          text: 'text-purple-100',
          glow: 'shadow-[0_0_20px_rgba(192,132,252,0.4)]',
          badgeBg: 'bg-purple-600',
          badgeText: 'text-white',
          iconColor: 'text-purple-300',
          symbol: '●',
          label: 'SOCIAL / INFO',
        };
      default:
        return {
          bg: 'bg-slate-900 text-slate-300',
          border: 'border-slate-700 border',
          text: 'text-slate-300',
          glow: 'shadow-none',
          badgeBg: 'bg-slate-800',
          badgeText: 'text-slate-300',
          iconColor: 'text-slate-400',
          symbol: '◆',
          label: 'AMBIENT',
        };
    }
  }

  // Tritanopia Mode (Blue-Yellow Safe: Vermillion Red, Cyan, White)
  if (mode === 'tritanopia') {
    switch (urgency) {
      case 'urgent':
        return {
          bg: 'bg-rose-950/90 text-white',
          border: 'border-rose-500 border-2',
          text: 'text-rose-100',
          glow: 'shadow-[0_0_35px_rgba(244,63,94,0.6)]',
          badgeBg: 'bg-rose-600',
          badgeText: 'text-white font-extrabold',
          iconColor: 'text-rose-300',
          symbol: '▲',
          label: 'URGENT',
        };
      case 'warning':
        return {
          bg: 'bg-teal-950/90 text-white',
          border: 'border-teal-400 border-2',
          text: 'text-teal-100',
          glow: 'shadow-[0_0_30px_rgba(45,212,191,0.5)]',
          badgeBg: 'bg-teal-400',
          badgeText: 'text-neutral-950 font-bold',
          iconColor: 'text-teal-300',
          symbol: '◼',
          label: 'WARNING',
        };
      case 'info':
        return {
          bg: 'bg-sky-950/90 text-white',
          border: 'border-sky-400 border',
          text: 'text-sky-100',
          glow: 'shadow-[0_0_20px_rgba(56,189,248,0.4)]',
          badgeBg: 'bg-sky-500',
          badgeText: 'text-white',
          iconColor: 'text-sky-300',
          symbol: '●',
          label: 'INFO',
        };
      default:
        return {
          bg: 'bg-stone-900 text-stone-300',
          border: 'border-stone-700 border',
          text: 'text-stone-300',
          glow: 'shadow-none',
          badgeBg: 'bg-stone-800',
          badgeText: 'text-stone-300',
          iconColor: 'text-stone-400',
          symbol: '◆',
          label: 'AMBIENT',
        };
    }
  }

  // Standard Mode: Ultra-vibrant High-Contrast Neon Alert Design
  switch (urgency) {
    case 'urgent':
      return {
        bg: 'bg-red-950/95 text-white',
        border: 'border-red-500 border-2',
        text: 'text-red-100',
        glow: 'shadow-[0_0_40px_rgba(239,68,68,0.7)] ring-2 ring-red-500/50',
        badgeBg: 'bg-red-600',
        badgeText: 'text-white font-extrabold tracking-wider',
        iconColor: 'text-red-400',
        symbol: '▲',
        label: 'URGENT SAFETY',
      };
    case 'warning':
      return {
        bg: 'bg-amber-950/95 text-white',
        border: 'border-amber-500 border-2',
        text: 'text-amber-100',
        glow: 'shadow-[0_0_30px_rgba(245,158,11,0.6)] ring-1 ring-amber-500/40',
        badgeBg: 'bg-amber-500',
        badgeText: 'text-black font-extrabold tracking-wider',
        iconColor: 'text-amber-400',
        symbol: '◼',
        label: 'WARNING / ALERT',
      };
    case 'info':
      return {
        bg: 'bg-blue-950/90 text-white',
        border: 'border-blue-500 border',
        text: 'text-blue-100',
        glow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]',
        badgeBg: 'bg-blue-600',
        badgeText: 'text-white font-bold',
        iconColor: 'text-blue-400',
        symbol: '●',
        label: 'SOCIAL & HOME',
      };
    default:
      return {
        bg: 'bg-emerald-950/80 text-white',
        border: 'border-emerald-600/50 border',
        text: 'text-emerald-100',
        glow: 'shadow-none',
        badgeBg: 'bg-emerald-800',
        badgeText: 'text-emerald-200',
        iconColor: 'text-emerald-400',
        symbol: '◆',
        label: 'AMBIENT',
      };
  }
};

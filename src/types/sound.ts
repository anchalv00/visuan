export type SoundUrgency = 'urgent' | 'warning' | 'info' | 'subtle';

export type SoundType =
  | 'safety'
  | 'hazard'
  | 'appliance'
  | 'biological'
  | 'animal'
  | 'social'
  | 'ambient'
  | 'warning'
  | 'human_voice';

export type DirectionCue =
  | 'left'
  | 'center'
  | 'right'
  | 'behind'
  | 'omni'
  | 'approaching';

export type HapticPattern =
  | 'staccato_emergency'
  | 'double_pulse'
  | 'gentle_thrum'
  | 'rapid_tap'
  | 'heartbeat';

export type ColorBlindMode =
  | 'standard'
  | 'protanopia' // Red-Green
  | 'tritanopia' // Blue-Yellow
  | 'monochrome'; // High Contrast Black & White

export type HapticSensitivity = 'off' | 'emergency_only' | 'low' | 'medium' | 'high';

export interface SoundAlert {
  id: string;
  timestamp: number;
  sound_name: string;
  sound_type: SoundType;
  urgency: SoundUrgency;
  description: string;
  direction_cue: DirectionCue;
  confidence: number;
  decibels?: number;
  haptic_pattern: HapticPattern;
  visual_color?: string;
}

export interface SoundPreset {
  id: string;
  name: string;
  category: SoundType;
  urgency: SoundUrgency;
  iconName: string;
  description: string;
  direction: DirectionCue;
  hapticPattern: HapticPattern;
  frequencyHint: string;
}

export interface AccessibilitySettings {
  colorBlindMode: ColorBlindMode;
  hapticSensitivity: HapticSensitivity;
  largeText: boolean;
  screenFlashEnabled: boolean;
  backgroundNotifications: boolean;
  showDecibelMeter: boolean;
  autoDismissHudSeconds: number; // 0 for sticky
}

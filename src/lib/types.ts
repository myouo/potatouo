export interface Mode {
  id: string;
  name: string;
  focusTime: number; // in minutes
  restTime: number; // in minutes
}

export interface Session {
  id: string;
  modeId: string;
  focusDuration: number; // focused seconds
  restDuration: number; // rested seconds
  date: number; // timestamp
}

export interface BackgroundImage {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
}

export interface RestMusicTrack {
  name: string;
  blob: Blob;
  mimeType: string;
  size: number;
  createdAt: number;
}

export const BACKGROUND_TRANSITIONS = [
  'fade',
  'zoom-in',
  'zoom-out',
  'slide-left',
  'slide-up',
  'blur',
  'wipe',
] as const;

export type BackgroundTransition = typeof BACKGROUND_TRANSITIONS[number];
export type BackgroundTransitionSetting = BackgroundTransition | 'random';

export interface Settings {
  currentModeId: string;
  volume: number;
  notificationsEnabled: boolean;
  restMusicEnabled: boolean;
  restMusicVolume: number;
  restMusicLoop: boolean;
  backgroundOpacity: number;
  backgroundMode: 'single' | 'carousel';
  backgroundInterval: number;
  backgroundTransition: BackgroundTransitionSetting;
  activeBackgroundId: string | null;
  bgPositionX: number;
  bgPositionY: number;
  bgSize: 'cover' | 'contain';
  theme: 'dark' | 'light' | 'system';
  autoLoop: boolean;
  skipBreak: boolean;
  showLoopCounter: boolean;
}

export const DEFAULT_MODES: Mode[] = [
  { id: '1', name: 'Classic', focusTime: 25, restTime: 5 },
  { id: '2', name: 'Long Focus', focusTime: 50, restTime: 10 },
  { id: '3', name: 'Short Break', focusTime: 15, restTime: 5 },
];

export const DEFAULT_SETTINGS: Settings = {
  currentModeId: '1',
  volume: 0.8,
  notificationsEnabled: false,
  restMusicEnabled: false,
  restMusicVolume: 0.5,
  restMusicLoop: true,
  backgroundOpacity: 0.6,
  backgroundMode: 'single',
  backgroundInterval: 15,
  backgroundTransition: 'fade',
  activeBackgroundId: null,
  bgPositionX: 50,
  bgPositionY: 50,
  bgSize: 'cover',
  theme: 'system',
  autoLoop: false,
  skipBreak: false,
  showLoopCounter: false,
};

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

export interface Settings {
  currentModeId: string;
  volume: number;
  notificationsEnabled: boolean;
  backgroundOpacity: number;
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
  backgroundOpacity: 0.6,
};

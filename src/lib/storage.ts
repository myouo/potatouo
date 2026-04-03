import { get, set, del } from 'idb-keyval';
import type { Mode, Session, Settings } from './types';
import { DEFAULT_MODES, DEFAULT_SETTINGS } from './types';

// ** LocalStorage Wrappers **

export const getSettings = (): Settings => {
  const store = localStorage.getItem('pomodoro_settings');
  if (store) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(store) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: Settings) => {
  localStorage.setItem('pomodoro_settings', JSON.stringify(settings));
};

export const getModes = (): Mode[] => {
  const store = localStorage.getItem('pomodoro_modes');
  if (store) {
    try {
      const parsed = JSON.parse(store);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
  }
  return DEFAULT_MODES;
};

export const saveModes = (modes: Mode[]) => {
  localStorage.setItem('pomodoro_modes', JSON.stringify(modes));
};

// Timer Backup State
export interface TimerStateBackup {
  type: 'focus' | 'rest';
  state: 'playing' | 'paused' | 'stopped';
  targetEndTime: number | null; // absolute unix epoch
  remainingTime: number; // useful if paused
}

export const getTimerBackup = (): TimerStateBackup | null => {
  const data = localStorage.getItem('pomodoro_timer_backup');
  return data ? JSON.parse(data) : null;
};

export const saveTimerBackup = (backup: TimerStateBackup) => {
  localStorage.setItem('pomodoro_timer_backup', JSON.stringify(backup));
};


// ** IndexedDB Wrappers **

export const getBackgroundImage = async (): Promise<string | null> => {
  try {
    const dataUrl = await get('pomodoro_background');
    return dataUrl || null;
  } catch (e) {
    console.error('Failed to get background image', e);
    return null;
  }
};

export const saveBackgroundImage = async (dataUrl: string) => {
  try {
    await set('pomodoro_background', dataUrl);
  } catch (e) {
    console.error('Failed to save background image', e);
  }
};

export const clearBackgroundImage = async () => {
  try {
    await del('pomodoro_background');
  } catch (e) {
    console.error('Failed to clear background image', e);
  }
};

export const getHistory = async (): Promise<Session[]> => {
  try {
    const history = await get('pomodoro_history');
    return history || [];
  } catch (e) {
    console.error('Failed to get history', e);
    return [];
  }
};

export const addHistorySession = async (session: Session) => {
  try {
    const history = await getHistory();
    history.push(session);
    await set('pomodoro_history', history);
  } catch (e) {
    console.error('Failed to add history session', e);
  }
};

import { get, set, del } from 'idb-keyval';
import type { Mode, Session, Settings } from './types';
import { DEFAULT_MODES, DEFAULT_SETTINGS } from './types';

// Used to enforce clean state for the new architecture
const PREFIX = 'potatouo_v4_';

export const getSettings = (): Settings => {
  const store = localStorage.getItem(`${PREFIX}settings`);
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
  localStorage.setItem(`${PREFIX}settings`, JSON.stringify(settings));
};

export const getModes = (): Mode[] => {
  const store = localStorage.getItem(`${PREFIX}modes`);
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
  localStorage.setItem(`${PREFIX}modes`, JSON.stringify(modes));
};

// Unified Timer Engine Backup
export interface TimerEngineState {
  mode: 'pomodoro' | 'stopwatch';
  status: 'idle' | 'running' | 'paused' | 'stopped';
  phase: 'focus' | 'rest';
  startTimestamp: number | null;
  accumulatedTime: number;
}

export const getTimerBackup = (): TimerEngineState | null => {
  const data = localStorage.getItem(`${PREFIX}engine_backup`);
  return data ? JSON.parse(data) : null;
};

export const saveTimerBackup = (backup: TimerEngineState) => {
  localStorage.setItem(`${PREFIX}engine_backup`, JSON.stringify(backup));
};


// ** IndexedDB Wrappers **

export const getBackgroundImage = async (): Promise<string | null> => {
  try {
    const dataUrl = await get(`${PREFIX}background`);
    return dataUrl || null;
  } catch (e) {
    console.error('Failed to get background image', e);
    return null;
  }
};

export const saveBackgroundImage = async (dataUrl: string) => {
  try {
    await set(`${PREFIX}background`, dataUrl);
  } catch (e) {
    console.error('Failed to save background image', e);
  }
};

export const clearBackgroundImage = async () => {
  try {
    await del(`${PREFIX}background`);
  } catch (e) {
    console.error('Failed to clear background image', e);
  }
};

export const getHistory = async (): Promise<Session[]> => {
  try {
    const history = await get(`${PREFIX}history`);
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
    await set(`${PREFIX}history`, history);
  } catch (e) {
    console.error('Failed to add history session', e);
  }
};

import { get, set, del } from 'idb-keyval';
import type { BackgroundImage, Mode, Session, Settings } from './types';
import { DEFAULT_MODES, DEFAULT_SETTINGS } from './types';

const PREFIX = 'potatouo_v4_';
const BACKGROUND_LIBRARY_KEY = `${PREFIX}background_images`;
const LEGACY_BACKGROUND_KEY = `${PREFIX}background`;

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

export interface PomodoroTimerBackup {
  status: 'idle' | 'running' | 'paused' | 'stopped';
  phase: 'focus' | 'rest';
  startTimestamp: number | null;
  accumulatedTime: number;
}

export interface StopwatchTimerBackup {
  status: 'idle' | 'running' | 'paused' | 'stopped';
  startTimestamp: number | null;
  accumulatedTime: number;
}

export interface TimerBackupState {
  activeTimerMode: 'pomodoro' | 'stopwatch';
  pomodoro: PomodoroTimerBackup;
  stopwatch: StopwatchTimerBackup;
}

export interface LegacyTimerEngineState {
  mode: 'pomodoro' | 'stopwatch';
  status: 'idle' | 'running' | 'paused' | 'stopped';
  phase: 'focus' | 'rest';
  startTimestamp: number | null;
  accumulatedTime: number;
}

export const getTimerBackup = (): TimerBackupState | LegacyTimerEngineState | null => {
  const data = localStorage.getItem(`${PREFIX}engine_backup`);
  return data ? JSON.parse(data) : null;
};

export const saveTimerBackup = (backup: TimerBackupState) => {
  localStorage.setItem(`${PREFIX}engine_backup`, JSON.stringify(backup));
};

const isBackgroundImage = (value: unknown): value is BackgroundImage => {
  if (!value || typeof value !== 'object') return false;
  const image = value as Partial<BackgroundImage>;
  return (
    typeof image.id === 'string' &&
    typeof image.name === 'string' &&
    typeof image.dataUrl === 'string' &&
    typeof image.createdAt === 'number'
  );
};

export const getBackgroundImages = async (): Promise<BackgroundImage[]> => {
  try {
    const stored = await get<unknown>(BACKGROUND_LIBRARY_KEY);
    if (Array.isArray(stored)) {
      const validImages = stored.filter(isBackgroundImage);
      if (validImages.length !== stored.length) {
        await set(BACKGROUND_LIBRARY_KEY, validImages);
      }
      return validImages;
    }

    const legacyDataUrl = await get<unknown>(LEGACY_BACKGROUND_KEY);
    if (typeof legacyDataUrl === 'string' && legacyDataUrl) {
      const migratedImage: BackgroundImage = {
        id: 'legacy-background',
        name: 'Imported background',
        dataUrl: legacyDataUrl,
        createdAt: Date.now(),
      };
      await set(BACKGROUND_LIBRARY_KEY, [migratedImage]);
      await del(LEGACY_BACKGROUND_KEY);
      return [migratedImage];
    }

    return [];
  } catch (e) {
    console.error('Failed to get background images', e);
    return [];
  }
};

export const addBackgroundImages = async (
  images: BackgroundImage[],
): Promise<BackgroundImage[]> => {
  const currentImages = await getBackgroundImages();
  const nextImages = [...currentImages, ...images];
  await set(BACKGROUND_LIBRARY_KEY, nextImages);
  return nextImages;
};

export const deleteBackgroundImage = async (id: string): Promise<BackgroundImage[]> => {
  const currentImages = await getBackgroundImages();
  const nextImages = currentImages.filter((image) => image.id !== id);
  await set(BACKGROUND_LIBRARY_KEY, nextImages);
  return nextImages;
};

export const clearBackgroundImages = async () => {
  await Promise.all([
    del(BACKGROUND_LIBRARY_KEY),
    del(LEGACY_BACKGROUND_KEY),
  ]);
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

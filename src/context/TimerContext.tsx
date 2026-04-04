/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSettings } from './SettingsContext';
import { getTimerBackup, saveTimerBackup, addHistorySession } from '../lib/storage';
import type {
  LegacyTimerEngineState,
  PomodoroTimerBackup,
  StopwatchTimerBackup,
  TimerBackupState
} from '../lib/storage';

export type ActiveTimerMode = 'pomodoro' | 'stopwatch';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'stopped';
export type TimerPhase = 'focus' | 'rest';

interface PomodoroEngineState {
  status: TimerStatus;
  phase: TimerPhase;
  startTimestamp: number | null;
  accumulatedTime: number;
}

interface StopwatchEngineState {
  status: TimerStatus;
  startTimestamp: number | null;
  accumulatedTime: number;
}

interface TimerEngineState {
  activeTimerMode: ActiveTimerMode;
  pomodoro: PomodoroEngineState;
  stopwatch: StopwatchEngineState;
}

interface TimerContextType {
  activeTimerMode: ActiveTimerMode;
  setActiveTimerMode: (m: ActiveTimerMode) => void;
  phase: TimerPhase;
  status: TimerStatus;
  remainingTime: number;
  stopwatchElapsed: number;
  stopwatchStatus: TimerStatus;
  startTimer: () => void;
  pauseTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  skipPhase: () => void;
  startStopwatch: () => void;
  pauseStopwatch: () => void;
  stopStopwatch: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

const getTimestamp = () => Date.now();

const createSessionStamp = () => {
  const timestamp = getTimestamp();
  return {
    id: timestamp.toString(),
    date: timestamp
  };
};

const playBeep = (volume: number) => {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      throw new Error('AudioContext not supported');
    }

    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error('AudioContext not supported', e);
  }
};

const notify = (title: string, body: string, enabled: boolean) => {
  if (enabled && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
};

const DEFAULT_POMODORO_STATE: PomodoroEngineState = {
  status: 'stopped',
  phase: 'focus',
  startTimestamp: null,
  accumulatedTime: 0
};

const DEFAULT_STOPWATCH_STATE: StopwatchEngineState = {
  status: 'stopped',
  startTimestamp: null,
  accumulatedTime: 0
};

const createDefaultState = (): TimerEngineState => ({
  activeTimerMode: 'pomodoro',
  pomodoro: { ...DEFAULT_POMODORO_STATE },
  stopwatch: { ...DEFAULT_STOPWATCH_STATE }
});

const sanitizePomodoroState = (state?: Partial<PomodoroTimerBackup>): PomodoroEngineState => {
  const normalized: PomodoroEngineState = {
    ...DEFAULT_POMODORO_STATE,
    ...state
  };

  normalized.phase = normalized.phase === 'rest' ? 'rest' : 'focus';
  normalized.status = normalized.status === 'running' ? 'running' : normalized.status === 'paused' ? 'paused' : 'stopped';

  if (normalized.status === 'running' && normalized.startTimestamp) {
    return normalized;
  }

  normalized.startTimestamp = null;
  if (normalized.status !== 'paused') {
    normalized.status = 'stopped';
  }
  return normalized;
};

const sanitizeStopwatchState = (state?: Partial<StopwatchTimerBackup>): StopwatchEngineState => {
  const normalized: StopwatchEngineState = {
    ...DEFAULT_STOPWATCH_STATE,
    ...state
  };

  normalized.status = normalized.status === 'running' ? 'running' : normalized.status === 'paused' ? 'paused' : 'stopped';

  if (normalized.status === 'running' && normalized.startTimestamp) {
    return normalized;
  }

  normalized.startTimestamp = null;
  if (normalized.status !== 'paused') {
    normalized.status = 'stopped';
  }
  return normalized;
};

const normalizeBackup = (backup: TimerBackupState | LegacyTimerEngineState): TimerEngineState => {
  if ('pomodoro' in backup && 'stopwatch' in backup) {
    return {
      activeTimerMode: backup.activeTimerMode === 'stopwatch' ? 'stopwatch' : 'pomodoro',
      pomodoro: sanitizePomodoroState(backup.pomodoro),
      stopwatch: sanitizeStopwatchState(backup.stopwatch)
    };
  }

  const state = createDefaultState();
  state.activeTimerMode = backup.mode === 'stopwatch' ? 'stopwatch' : 'pomodoro';

  if (backup.mode === 'pomodoro') {
    state.pomodoro = sanitizePomodoroState(backup);
  } else {
    state.stopwatch = sanitizeStopwatchState(backup);
  }

  return state;
};

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentMode, settings } = useSettings();
  const [engineState, setEngineState] = useState<TimerEngineState>(() => {
    const backup = getTimerBackup();
    return backup ? normalizeBackup(backup) : createDefaultState();
  });
  const engineRef = useRef<TimerEngineState>(engineState);
  const [nowMs, setNowMs] = useState(() => getTimestamp());

  const syncUI = useCallback(() => {
    const snapshot = engineRef.current;
    setNowMs(getTimestamp());
    setEngineState({
      activeTimerMode: snapshot.activeTimerMode,
      pomodoro: { ...snapshot.pomodoro },
      stopwatch: { ...snapshot.stopwatch }
    });
  }, []);

  const saveStateToStorage = () => {
    saveTimerBackup(engineRef.current);
  };

  const getElapsed = (
    state: { status: TimerStatus; startTimestamp: number | null; accumulatedTime: number },
    referenceTime = nowMs
  ) => {
    if (state.status === 'running' && state.startTimestamp) {
      return state.accumulatedTime + Math.floor((referenceTime - state.startTimestamp) / 1000);
    }
    return state.accumulatedTime;
  };

  const requestNotificationsIfNeeded = () => {
    if (settings.notificationsEnabled && 'Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  };

  const handlePhaseComplete = useCallback(async () => {
    const pomodoro = engineRef.current.pomodoro;
    if (pomodoro.status !== 'running') {
      return;
    }

    const completedPhase = pomodoro.phase;
    playBeep(settings.volume);

    pomodoro.accumulatedTime = 0;
    pomodoro.startTimestamp = null;

    if (completedPhase === 'focus') {
      notify('Focus Complete!', 'Time for a break.', settings.notificationsEnabled);
      pomodoro.phase = 'rest';
      pomodoro.status = 'running';
      pomodoro.startTimestamp = getTimestamp();
      saveStateToStorage();
      syncUI();

      const sessionStamp = createSessionStamp();
      await addHistorySession({
        id: sessionStamp.id,
        modeId: currentMode.id,
        focusDuration: currentMode.focusTime * 60,
        restDuration: 0,
        date: sessionStamp.date
      });
      return;
    }

    notify('Break Complete!', 'Ready to focus?', settings.notificationsEnabled);
    pomodoro.phase = 'focus';
    pomodoro.status = 'stopped';
    saveStateToStorage();
    syncUI();
  }, [currentMode.focusTime, currentMode.id, settings.notificationsEnabled, settings.volume, syncUI]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const state = engineRef.current;
      let requiresSync = false;

      if (state.pomodoro.status === 'running' && state.pomodoro.startTimestamp) {
        const targetSeconds = state.pomodoro.phase === 'focus' ? currentMode.focusTime * 60 : currentMode.restTime * 60;
        const elapsed = state.pomodoro.accumulatedTime + Math.floor((getTimestamp() - state.pomodoro.startTimestamp) / 1000);

        if (elapsed >= targetSeconds) {
          void handlePhaseComplete();
        } else {
          requiresSync = true;
        }
      }

      if (state.stopwatch.status === 'running') {
        requiresSync = true;
      }

      if (requiresSync) {
        saveStateToStorage();
        syncUI();
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [currentMode.focusTime, currentMode.id, currentMode.restTime, handlePhaseComplete, syncUI]);

  const startPomodoro = () => {
    const state = engineRef.current.pomodoro;
    if (state.status === 'running') return;

    if (state.status === 'stopped') {
      state.accumulatedTime = 0;
      state.phase = 'focus';
    }

    requestNotificationsIfNeeded();
    state.status = 'running';
    state.startTimestamp = getTimestamp();
    saveStateToStorage();
    syncUI();
  };

  const pausePomodoro = () => {
    const state = engineRef.current.pomodoro;
    if (state.status !== 'running') return;

    if (state.startTimestamp) {
      state.accumulatedTime += Math.floor((getTimestamp() - state.startTimestamp) / 1000);
    }

    state.status = 'paused';
    state.startTimestamp = null;
    saveStateToStorage();
    syncUI();
  };

  const stopPomodoro = async () => {
    const state = engineRef.current.pomodoro;
    const elapsed = getElapsed(state, getTimestamp());
    const phaseAtStop = state.phase;

    state.status = 'stopped';
    state.phase = 'focus';
    state.accumulatedTime = 0;
    state.startTimestamp = null;
    saveStateToStorage();
    syncUI();

    if (elapsed > 0 && phaseAtStop === 'focus') {
      const sessionStamp = createSessionStamp();
      await addHistorySession({
        id: sessionStamp.id,
        modeId: currentMode.id,
        focusDuration: elapsed,
        restDuration: 0,
        date: sessionStamp.date
      });
    }
  };

  const startStopwatch = () => {
    const state = engineRef.current.stopwatch;
    if (state.status === 'running') return;

    if (state.status === 'stopped') {
      state.accumulatedTime = 0;
    }

    state.status = 'running';
    state.startTimestamp = getTimestamp();
    saveStateToStorage();
    syncUI();
  };

  const pauseStopwatch = () => {
    const state = engineRef.current.stopwatch;
    if (state.status !== 'running') return;

    if (state.startTimestamp) {
      state.accumulatedTime += Math.floor((getTimestamp() - state.startTimestamp) / 1000);
    }

    state.status = 'paused';
    state.startTimestamp = null;
    saveStateToStorage();
    syncUI();
  };

  const stopStopwatch = async () => {
    const state = engineRef.current.stopwatch;
    const elapsed = getElapsed(state, getTimestamp());

    state.status = 'stopped';
    state.accumulatedTime = 0;
    state.startTimestamp = null;
    saveStateToStorage();
    syncUI();

    if (elapsed > 0) {
      const sessionStamp = createSessionStamp();
      await addHistorySession({
        id: sessionStamp.id,
        modeId: 'stopwatch',
        focusDuration: elapsed,
        restDuration: 0,
        date: sessionStamp.date
      });
    }
  };

  const state = engineState;
  const pomodoroElapsed = getElapsed(state.pomodoro, nowMs);
  const stopwatchElapsed = getElapsed(state.stopwatch, nowMs);
  const targetSeconds = state.pomodoro.phase === 'focus' ? currentMode.focusTime * 60 : currentMode.restTime * 60;
  const remainingTime = Math.max(0, targetSeconds - pomodoroElapsed);

  useEffect(() => {
    if (state.activeTimerMode === 'pomodoro') {
      const min = Math.floor(remainingTime / 60).toString().padStart(2, '0');
      const sec = (remainingTime % 60).toString().padStart(2, '0');
      const phaseLabel = state.pomodoro.phase === 'focus' ? 'Focus' : 'Break';
      document.title = `${min}:${sec} ${phaseLabel}`;
      return;
    }

    const hrs = Math.floor(stopwatchElapsed / 3600);
    const min = Math.floor((stopwatchElapsed % 3600) / 60).toString().padStart(2, '0');
    const sec = (stopwatchElapsed % 60).toString().padStart(2, '0');
    const timeStr = hrs > 0 ? `${hrs}:${min}:${sec}` : `${min}:${sec}`;
    document.title = `${timeStr} Stopwatch`;
  }, [remainingTime, state.activeTimerMode, state.pomodoro.phase, stopwatchElapsed]);

  return (
    <TimerContext.Provider
      value={{
        activeTimerMode: state.activeTimerMode,
        setActiveTimerMode: (mode) => {
          engineRef.current.activeTimerMode = mode;
          saveStateToStorage();
          syncUI();
        },
        phase: state.pomodoro.phase,
        status: state.pomodoro.status,
        remainingTime,
        stopwatchElapsed,
        stopwatchStatus: state.stopwatch.status,
        startTimer: startPomodoro,
        pauseTimer: pausePomodoro,
        stopTimer: stopPomodoro,
        resetTimer: stopPomodoro,
        skipPhase: () => void handlePhaseComplete(),
        startStopwatch,
        pauseStopwatch,
        stopStopwatch
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
};

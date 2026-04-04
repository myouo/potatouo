import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSettings } from './SettingsContext';
import { getTimerBackup, saveTimerBackup, addHistorySession } from '../lib/storage';

export type ActiveTimerMode = 'pomodoro' | 'stopwatch';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'stopped';
export type TimerPhase = 'focus' | 'rest';

export interface TimerEngineState {
  mode: ActiveTimerMode;
  status: TimerStatus;
  phase: TimerPhase;
  startTimestamp: number | null;
  accumulatedTime: number;
}

interface TimerContextType {
  activeTimerMode: ActiveTimerMode;
  setActiveTimerMode: (m: ActiveTimerMode) => void;
  phase: TimerPhase;
  status: TimerStatus;
  
  // Expose derived calculations for UI
  remainingTime: number; 
  stopwatchElapsed: number;
  stopwatchStatus: TimerStatus;

  // Unified Actions (they map logic depending on active mode)
  startTimer: () => void;
  pauseTimer: () => void;
  stopTimer: () => void;  // Unified stop
  resetTimer: () => void; // Reset to focus
  skipPhase: () => void;
  
  // Specific Stopwatch Aliases
  startStopwatch: () => void;
  pauseStopwatch: () => void;
  stopStopwatch: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

const playBeep = (volume: number) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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

const DEFAULT_STATE: TimerEngineState = {
  mode: 'pomodoro',
  status: 'stopped',
  phase: 'focus',
  startTimestamp: null,
  accumulatedTime: 0
};

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentMode, settings } = useSettings();
  
  // The Single Source of Truth
  const engineRef = useRef<TimerEngineState>(DEFAULT_STATE);
  
  // Dummy state to force React re-renders when UI needs updating
  const [tick, setTick] = useState(0);
  const syncUI = () => setTick(t => t + 1);

  // Initialization & Load
  useEffect(() => {
    const backup = getTimerBackup();
    
    if (backup) {
      const state = { ...DEFAULT_STATE, ...backup };
      
      // Strict Initialization Recovery Logic
      if (state.status === 'running' && state.startTimestamp) {
         // Valid running state -> Keep it running
      } else {
         // ANY other state (stopped, paused, or missing timestamp) -> Force non-running
         state.status = (state.status === 'paused') ? 'paused' : 'stopped';
         state.startTimestamp = null;
      }
      engineRef.current = state;
    }
    syncUI();
    
    // The Engine Tick Loop
    const interval = window.setInterval(() => {
      const state = engineRef.current;
      if (state.status !== 'running') return;
      
      let requiresSync = true;

      if (state.mode === 'pomodoro' && state.startTimestamp) {
        const targetSeconds = state.phase === 'focus' ? currentMode.focusTime * 60 : currentMode.restTime * 60;
        const elapsed = state.accumulatedTime + Math.floor((Date.now() - state.startTimestamp) / 1000);
        
        if (elapsed >= targetSeconds) {
          handlePhaseComplete();
          requiresSync = false; // complete handles sync
        }
      }
      
      if (requiresSync) {
         saveStateToStorage();
         syncUI();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [currentMode.focusTime, currentMode.restTime]); // Re-bind if config bounds explicitly change

  const saveStateToStorage = () => {
    const state = engineRef.current;
    if (state.status === 'stopped' || state.status === 'idle') {
       localStorage.removeItem('potatouo_v4_engine_backup');
    } else {
       // Persist clean single-source state
       saveTimerBackup(state); 
    }
  };

  const getElapsed = () => {
    const state = engineRef.current;
    if (state.status === 'running' && state.startTimestamp) {
      return state.accumulatedTime + Math.floor((Date.now() - state.startTimestamp) / 1000);
    }
    return state.accumulatedTime;
  };

  const handlePhaseComplete = async () => {
    playBeep(settings.volume);
    const state = engineRef.current;
    
    if (state.phase === 'focus') {
      notify('Focus Complete!', 'Time for a break.', settings.notificationsEnabled);
      await addHistorySession({
        id: Date.now().toString(),
        modeId: currentMode.id,
        focusDuration: currentMode.focusTime * 60,
        restDuration: 0,
        date: Date.now()
      });
      state.phase = 'rest';
      state.accumulatedTime = 0;
      state.startTimestamp = Date.now(); // Auto-start the rest phase
    } else {
      notify('Break Complete!', 'Ready to focus?', settings.notificationsEnabled);
      state.phase = 'focus';
      state.accumulatedTime = 0;
      state.startTimestamp = null;
      state.status = 'stopped'; // Wait for user to start focus voluntarily
    }
    
    saveStateToStorage();
    syncUI();
  };

  // -------------------------
  // Unified Actions
  // -------------------------

  const internalStart = (mode: ActiveTimerMode) => {
    const state = engineRef.current;
    if (state.status === 'running') return;
    
    if (state.mode !== mode || state.status === 'stopped') {
       // Deep reset context if modes diverge
       state.mode = mode;
       state.accumulatedTime = 0;
       if (mode === 'pomodoro') state.phase = 'focus';
    }

    if (settings.notificationsEnabled && 'Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    state.status = 'running';
    state.startTimestamp = Date.now();
    
    saveStateToStorage();
    syncUI();
  };

  const internalPause = () => {
    const state = engineRef.current;
    if (state.status !== 'running') return;
    
    if (state.startTimestamp) {
      state.accumulatedTime += Math.floor((Date.now() - state.startTimestamp) / 1000);
    }
    state.status = 'paused';
    state.startTimestamp = null;
    
    saveStateToStorage();
    syncUI();
  };

  const internalStop = async () => {
    const state = engineRef.current;
    
    // Capture state for history write before wiping engine
    const elapsed = getElapsed();
    const currentModeSave = state.mode;

    // 1. CLEAR ENGINE COMPLETELY (Synchronously!)
    state.status = 'stopped';
    state.accumulatedTime = 0;
    state.startTimestamp = null;
    
    saveStateToStorage();
    syncUI();

    // 2. Perform DB writing asynchronously
    if (elapsed > 0) {
       if (currentModeSave === 'stopwatch') {
          await addHistorySession({
             id: Date.now().toString(),
             modeId: 'stopwatch',
             focusDuration: elapsed,
             restDuration: 0,
             date: Date.now()
          });
       } else if (currentModeSave === 'pomodoro' && state.phase === 'focus') {
          // If stopped early in Pomodoro, we record what they did
          await addHistorySession({
             id: Date.now().toString(),
             modeId: currentMode.id,
             focusDuration: elapsed,
             restDuration: 0,
             date: Date.now()
          });
       }
    }
  };

  const skipPhase = () => handlePhaseComplete();

  // -------------------------
  // Derivations for UI
  // -------------------------

  const state = engineRef.current;
  const elapsedSeconds = getElapsed();
  
  let remainingTime = 0;
  if (state.mode === 'pomodoro') {
     const target = state.phase === 'focus' ? currentMode.focusTime * 60 : currentMode.restTime * 60;
     remainingTime = Math.max(0, target - elapsedSeconds);
  }
  
  let stopwatchElapsed = 0;
  if (state.mode === 'stopwatch') {
     stopwatchElapsed = elapsedSeconds;
  }

  // Title Sync
  useEffect(() => {
    if (state.mode === 'pomodoro') {
      const min = Math.floor(remainingTime / 60).toString().padStart(2, '0');
      const sec = (remainingTime % 60).toString().padStart(2, '0');
      const phaseIcon = state.phase === 'focus' ? '🍅' : '☕';
      document.title = `${min}:${sec} ${phaseIcon}`;
    } else {
      const hrs = Math.floor(stopwatchElapsed / 3600);
      const min = Math.floor((stopwatchElapsed % 3600) / 60).toString().padStart(2, '0');
      const sec = (stopwatchElapsed % 60).toString().padStart(2, '0');
      const timeStr = hrs > 0 ? `${hrs}:${min}:${sec}` : `${min}:${sec}`;
      document.title = `${timeStr} ⏱️`;
    }
  }, [remainingTime, state.phase, state.mode, stopwatchElapsed]);

  return (
    <TimerContext.Provider value={{
      activeTimerMode: state.mode,
      setActiveTimerMode: (m) => { engineRef.current.mode = m; syncUI(); },
      phase: state.phase,
      status: state.status,
      
      remainingTime,
      stopwatchElapsed, // Unified
      stopwatchStatus: state.mode === 'stopwatch' ? state.status : 'stopped', // Compatibility map
      
      startTimer: () => internalStart('pomodoro'),
      pauseTimer: internalPause,
      stopTimer: internalStop,
      resetTimer: () => { internalStop(); engineRef.current.phase = 'focus'; syncUI(); },
      skipPhase,

      startStopwatch: () => internalStart('stopwatch'),
      pauseStopwatch: internalPause,
      stopStopwatch: internalStop
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
};

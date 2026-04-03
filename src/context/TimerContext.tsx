import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSettings } from './SettingsContext';
import { getTimerBackup, saveTimerBackup, addHistorySession } from '../lib/storage';

export type TimerPhase = 'focus' | 'rest';
export type TimerStatus = 'playing' | 'paused' | 'stopped';

interface TimerContextType {
  phase: TimerPhase;
  status: TimerStatus;
  remainingTime: number; // in seconds
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipPhase: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

// We will use a reliable AudioContext custom beep to guarantee it works without assets instead of base64 mp3.

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

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentMode, settings } = useSettings();
  
  const [phase, setPhase] = useState<TimerPhase>('focus');
  const [status, setStatus] = useState<TimerStatus>('stopped');
  const [remainingTime, setRemainingTime] = useState<number>(currentMode.focusTime * 60);
  
  const targetEndTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Initialize from backup or default
  useEffect(() => {
    const backup = getTimerBackup();
    if (backup) {
      setPhase(backup.type);
      setStatus(backup.state);
      setRemainingTime(backup.remainingTime);
      targetEndTimeRef.current = backup.targetEndTime;
      
      if (backup.state === 'playing' && backup.targetEndTime) {
        const left = Math.round((backup.targetEndTime - Date.now()) / 1000);
        if (left <= 0) {
          handlePhaseComplete(backup.type);
        } else {
          setRemainingTime(left);
        }
      }
    } else {
      setRemainingTime(currentMode.focusTime * 60);
    }
  }, []); // Only on mount

  // Sync title and favicon
  useEffect(() => {
    const min = Math.floor(remainingTime / 60).toString().padStart(2, '0');
    const sec = (remainingTime % 60).toString().padStart(2, '0');
    const phaseIcon = phase === 'focus' ? '🍅' : '☕';
    document.title = `${min}:${sec} ${phaseIcon}`;
  }, [remainingTime, phase]);

  const saveState = () => {
    if (status !== 'stopped') {
       saveTimerBackup({
         type: phase,
         state: status,
         targetEndTime: targetEndTimeRef.current,
         remainingTime
       });
    } else {
       localStorage.removeItem('pomodoro_timer_backup');
    }
  };

  useEffect(() => {
    if (status === 'playing') {
      intervalRef.current = window.setInterval(() => {
        if (!targetEndTimeRef.current) return;
        const left = Math.round((targetEndTimeRef.current - Date.now()) / 1000);
        
        if (left <= 0) {
          handlePhaseComplete(phase);
        } else {
          setRemainingTime(left);
          saveState();
        }
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      saveState();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, phase]);

  const handlePhaseComplete = async (completedPhase: TimerPhase) => {
    playBeep(settings.volume);
    
    if (completedPhase === 'focus') {
      notify('Focus Complete!', 'Time for a break.', settings.notificationsEnabled);
      // Save history
      await addHistorySession({
        id: Date.now().toString(),
        modeId: currentMode.id,
        focusDuration: currentMode.focusTime * 60,
        restDuration: 0,
        date: Date.now()
      });
      setPhase('rest');
      setRemainingTime(currentMode.restTime * 60);
      targetEndTimeRef.current = Date.now() + currentMode.restTime * 60 * 1000;
    } else {
      notify('Break Complete!', 'Ready to focus?', settings.notificationsEnabled);
      // We could update the last session's restDuration but for simplicity we consider rest a separate end
      setPhase('focus');
      setStatus('stopped');
      setRemainingTime(currentMode.focusTime * 60);
      targetEndTimeRef.current = null;
    }
  };

  const startTimer = () => {
    if (status === 'playing') return;
    if (status === 'stopped') {
      // Ask for notification permission if enabled in settings but not granted
      if (settings.notificationsEnabled && 'Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
      }
    }
    targetEndTimeRef.current = Date.now() + remainingTime * 1000;
    setStatus('playing');
  };

  const pauseTimer = () => {
    setStatus('paused');
    targetEndTimeRef.current = null;
  };

  const resetTimer = () => {
    setStatus('stopped');
    setPhase('focus');
    setRemainingTime(currentMode.focusTime * 60);
    targetEndTimeRef.current = null;
    localStorage.removeItem('pomodoro_timer_backup');
  };

  const skipPhase = () => {
    handlePhaseComplete(phase);
  };

  return (
    <TimerContext.Provider value={{ phase, status, remainingTime, startTimer, pauseTimer, resetTimer, skipPhase }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
};

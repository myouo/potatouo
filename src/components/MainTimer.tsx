import React from 'react';
import { useTimer } from '../context/TimerContext';
import { useSettings } from '../context/SettingsContext';
import { Play, Pause, Square, SkipForward } from 'lucide-react';

const MainTimer: React.FC = () => {
  const { 
    activeTimerMode, setActiveTimerMode,
    phase, status, remainingTime, startTimer, pauseTimer, resetTimer, skipPhase,
    stopwatchStatus, stopwatchElapsed, startStopwatch, pauseStopwatch, stopStopwatch
  } = useTimer();
  const { currentMode } = useSettings();

  // Pomodoro Strings
  const pMins = Math.floor(remainingTime / 60).toString().padStart(2, '0');
  const pSecs = (remainingTime % 60).toString().padStart(2, '0');

  // Stopwatch Strings
  const sHrs = Math.floor(stopwatchElapsed / 3600);
  const sMins = Math.floor((stopwatchElapsed % 3600) / 60).toString().padStart(2, '0');
  const sSecs = (stopwatchElapsed % 60).toString().padStart(2, '0');

  const showStopwatchHours = sHrs > 0;

  const handleTogglePlay = () => {
    if (activeTimerMode === 'pomodoro') {
      if (status === 'running') pauseTimer();
      else startTimer();
    } else {
      if (stopwatchStatus === 'running') pauseStopwatch();
      else startStopwatch();
    }
  };

  const handleStop = () => {
    if (activeTimerMode === 'pomodoro') resetTimer();
    else stopStopwatch();
  };

  const isPlaying = activeTimerMode === 'pomodoro' ? status === 'running' : stopwatchStatus === 'running';
  const isStopped = activeTimerMode === 'pomodoro' ? status === 'stopped' : stopwatchStatus === 'stopped';

  return (
    <div className="glass-panel flex-col flex-center animate-fade-in">
      
      {/* Mode Switcher */}
      <div style={{ display: 'flex', gap: '5px', background: 'var(--glass-item-bg)', padding: '5px', borderRadius: '100px', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTimerMode('pomodoro')}
          style={{
            background: activeTimerMode === 'pomodoro' ? 'var(--accent-color)' : 'transparent',
            color: activeTimerMode === 'pomodoro' ? 'white' : 'var(--text-secondary)',
            padding: '6px 16px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 'bold'
          }}
        >
          Pomodoro
        </button>
        <button 
          onClick={() => setActiveTimerMode('stopwatch')}
          style={{
            background: activeTimerMode === 'stopwatch' ? 'var(--accent-color)' : 'transparent',
            color: activeTimerMode === 'stopwatch' ? 'white' : 'var(--text-secondary)',
            padding: '6px 16px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 'bold'
          }}
        >
          Stopwatch
        </button>
      </div>

      <div 
        style={{ 
          background: activeTimerMode === 'pomodoro' ? (phase === 'focus' ? 'var(--accent-color)' : '#4caf50') : '#2196f3', 
          padding: '4px 16px', 
          borderRadius: '100px',
          fontWeight: 'bold',
          marginBottom: '10px',
          fontSize: '0.9rem',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}
      >
        {activeTimerMode === 'pomodoro' ? (phase === 'focus' ? 'Focus Time' : 'Rest Break') : 'Open Timer'}
      </div>
      
      <div className="timer-text">
        {activeTimerMode === 'pomodoro' ? (
          `${pMins}:${pSecs}`
        ) : (
          showStopwatchHours ? `${sHrs}:${sMins}:${sSecs}` : `${sMins}:${sSecs}`
        )}
      </div>

      <div style={{ color: 'var(--text-secondary)', marginBottom: '30px', height: '1.2rem' }}>
        {activeTimerMode === 'pomodoro' ? (
          status === 'paused' ? 'Paused' : `Current Mode: ${currentMode.name}`
        ) : (
          stopwatchStatus === 'paused' ? 'Paused' : 'Recording'
        )}
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        {!isStopped && (
          <button className="btn-icon" onClick={handleStop} title="Stop / Reset">
            <Square size={20} />
          </button>
        )}
        
        <button 
          className="btn-icon" 
          style={{ width: '72px', height: '72px', background: 'var(--accent-color)' }}
          onClick={handleTogglePlay}
        >
          {isPlaying ? <Pause size={36} /> : <Play size={36} style={{ marginLeft: 4 }} />}
        </button>

        {activeTimerMode === 'pomodoro' && phase === 'rest' && status !== 'stopped' && (
          <button className="btn-icon" onClick={skipPhase} title="Skip Break">
            <SkipForward size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default MainTimer;

import React from 'react';
import { useTimer } from '../context/TimerContext';
import { useSettings } from '../context/SettingsContext';
import { Play, Pause, Square, SkipForward } from 'lucide-react';

const MainTimer: React.FC = () => {
  const { phase, status, remainingTime, startTimer, pauseTimer, resetTimer, skipPhase } = useTimer();
  const { currentMode } = useSettings();

  const minutes = Math.floor(remainingTime / 60).toString().padStart(2, '0');
  const seconds = (remainingTime % 60).toString().padStart(2, '0');

  const handleTogglePlay = () => {
    if (status === 'playing') pauseTimer();
    else startTimer();
  };

  return (
    <div className="glass-panel flex-col flex-center animate-fade-in" style={{ width: '400px', minHeight: '350px' }}>
      <div 
        style={{ 
          background: phase === 'focus' ? 'var(--accent-color)' : '#4caf50', 
          padding: '4px 16px', 
          borderRadius: '100px',
          fontWeight: 'bold',
          marginBottom: '20px',
          fontSize: '0.9rem',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}
      >
        {phase === 'focus' ? 'Focus Time' : 'Rest Break'}
      </div>
      
      <div style={{ fontSize: '7rem', fontWeight: 800, letterSpacing: '2px', lineHeight: 1, margin: '20px 0' }}>
        {minutes}:{seconds}
      </div>

      <div style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
        Current Mode: {currentMode.name}
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        {status !== 'stopped' && (
          <button className="btn-icon" onClick={resetTimer} title="Reset">
            <Square size={20} />
          </button>
        )}
        
        <button 
          className="btn-icon" 
          style={{ width: '64px', height: '64px', background: 'var(--accent-color)' }}
          onClick={handleTogglePlay}
        >
          {status === 'playing' ? <Pause size={32} /> : <Play size={32} style={{ marginLeft: 4 }} />}
        </button>

        {phase === 'rest' && status !== 'stopped' && (
          <button className="btn-icon" onClick={skipPhase} title="Skip Break">
            <SkipForward size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default MainTimer;

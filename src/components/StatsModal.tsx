import React, { useEffect, useState } from 'react';
import type { Session } from '../lib/types';
import { getHistory } from '../lib/storage';
import { X } from 'lucide-react';
import { format, isToday, subDays, startOfDay } from 'date-fns';

const StatsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [history, setHistory] = useState<Session[]>([]);

  useEffect(() => {
    getHistory().then(setHistory);
  }, []);

  const todaySessions = history.filter(s => isToday(s.date));
  const todayFocusTotal = todaySessions.reduce((acc, s) => acc + s.focusDuration, 0);
  const todayCount = todaySessions.length;

  const todayMinutes = Math.floor(todayFocusTotal / 60);

  // Calculate last 7 days chart data
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = startOfDay(subDays(new Date(), 6 - i));
    const daySessions = history.filter(s => startOfDay(s.date).getTime() === d.getTime());
    const mins = Math.floor(daySessions.reduce((acc, s) => acc + s.focusDuration, 0) / 60);
    return { date: d, mins, count: daySessions.length };
  });

  const maxMins = Math.max(...last7Days.map(d => d.mins), 1); // min 1 to avoid /0

  const allTimeTotalMins = Math.floor(history.reduce((acc, s) => acc + s.focusDuration, 0) / 60);
  const allTimeCount = history.length;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--modal-backdrop)', zIndex: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} className="animate-fade-in" onClick={onClose}>
      <div 
        onClick={e => e.stopPropagation()}
        className="glass-panel" 
        style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0 }}>Statistics & History</h2>
          <button className="btn-icon" onClick={onClose}><X size={24} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: 'var(--glass-item-bg)', padding: '20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Today's Focus</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{todayMinutes} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>mins</span></div>
          </div>
          <div style={{ background: 'var(--glass-item-bg)', padding: '20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Pomodoros Today</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{todayCount}</div>
          </div>
        </div>

        <h3 style={{ marginBottom: '1rem' }}>Last 7 Days (Focus Minutes)</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '150px', gap: '10px', marginBottom: '30px', background: 'var(--glass-item-bg)', padding: '20px', borderRadius: '12px' }}>
          {last7Days.map((d, i) => {
            const heightPercent = (d.mins / maxMins) * 100;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{d.mins}m</div>
                <div style={{ 
                  width: '100%', 
                  background: 'var(--accent-color)', 
                  height: `${Math.max(heightPercent, 2)}%`, // min height for visibility
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s ease'
                }} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{format(d.date, 'dd')}</div>
              </div>
            );
          })}
        </div>

        <h3 style={{ marginBottom: '1rem' }}>All Time</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ background: 'var(--glass-item-bg)', padding: '20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Focus Time</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{allTimeTotalMins} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>mins</span></div>
          </div>
          <div style={{ background: 'var(--glass-item-bg)', padding: '20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Pomodoros</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{allTimeCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;

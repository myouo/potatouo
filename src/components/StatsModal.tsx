import React, { useEffect, useState } from 'react';
import type { Session } from '../lib/types';
import { getHistory } from '../lib/storage';
import { useSettings } from '../context/SettingsContext';
import { X } from 'lucide-react';
import { format, isToday, subDays, startOfDay } from 'date-fns';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Premium Palette Generation
const SAAS_PALETTE = ['#FF8A65', '#7986CB', '#4DB6AC', '#FFD54F', '#BA68C8', '#4FC3F7', '#F06292', '#AED581'];

type Last7DaysRow = {
  date: string;
  _counts: Record<string, number>;
} & Record<string, string | number | Record<string, number>>;

const StatsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [history, setHistory] = useState<Session[]>([]);
  const { modes } = useSettings();

  useEffect(() => {
    getHistory().then(setHistory);
  }, []);

  const getModeName = (id: string) => id === 'stopwatch' ? 'Stopwatch' : (modes.find(m => m.id === id)?.name || 'Deleted Mode');
  const getModeColor = (name: string, index: number) => {
    if (name === 'Stopwatch') return '#4DB6AC'; // Always Mint for Stopwatch
    return SAAS_PALETTE[index % SAAS_PALETTE.length];
  };

  // Today Stats
  const todaySessions = history.filter(s => isToday(s.date));
  const todayFocusTotal = todaySessions.reduce((acc, s) => acc + s.focusDuration, 0);
  const todayCount = todaySessions.length;
  const todayMinutes = Math.floor(todayFocusTotal / 60);

  // All Time Stats
  const allTimeTotalMins = Math.floor(history.reduce((acc, s) => acc + s.focusDuration, 0) / 60);
  const allTimeCount = history.length;

  // Dynamically extract all mode names present in the last 7 days
  const recentModesSet = new Set<string>();

  const last7Days: Last7DaysRow[] = Array.from({ length: 7 }).map((_, i) => {
    const d = startOfDay(subDays(new Date(), 6 - i));
    const dayName = format(d, 'MM-dd');
    const daySessions = history.filter(s => startOfDay(s.date).getTime() === d.getTime());
    
    // Group durations by Mode Name
    const durationsByMode: Record<string, number> = {};
    const countsByMode: Record<string, number> = {};

    daySessions.forEach(s => {
      const mName = getModeName(s.modeId);
      recentModesSet.add(mName);
      durationsByMode[mName] = (durationsByMode[mName] || 0) + s.focusDuration;
      countsByMode[mName] = (countsByMode[mName] || 0) + 1;
    });

    // Convert seconds to minutes for charts
    const formattedDurations = Object.keys(durationsByMode).reduce((acc, k) => {
      acc[k] = Math.floor(durationsByMode[k] / 60);
      return acc;
    }, {} as Record<string, number>);

    return { 
      date: dayName, 
      ...formattedDurations,
      _counts: countsByMode  // used for the frequency bar chart
    };
  });

  const recentModesArray = Array.from(recentModesSet);

  // Custom Data parsing for counts chart
  const countsChartData = last7Days.map(d => {
    const res: Record<string, string | number> = { date: d.date };
    recentModesArray.forEach(m => {
      res[m] = d._counts[m] || 0;
    });
    return res;
  });

  // Chart 3 Data: Mode Distribution (All Time)
  const modeFreqMap = history.reduce((acc, s) => {
    const key = getModeName(s.modeId);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const modePieData = Object.keys(modeFreqMap).map(k => ({ name: k, value: modeFreqMap[k] }));

  // Shared Premium Tooltip Style
  const tooltipStyle = {
    background: 'var(--glass-drawer-bg)', 
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.2)',
    backdropFilter: 'blur(20px)'
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--modal-backdrop)', zIndex: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(5px)'
    }} className="animate-fade-in" onClick={onClose}>
      <div 
        onClick={e => e.stopPropagation()}
        className="glass-panel" 
        style={{ width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.5px' }}>Analytics & Insights</h2>
          <button className="btn-icon" onClick={onClose}><X size={24} /></button>
        </div>

        {history.length === 0 ? (
          <div className="flex-col flex-center" style={{ padding: '4rem 2rem', opacity: 0.7, textAlign: 'center', background: 'var(--glass-item-bg)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌱</div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', marginBottom: '0.5rem' }}>Your Journey Begins Here</h3>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>No focus data recorded yet. Start a session to see your statistics grow.</p>
          </div>
        ) : (
          <>
            {/* Global Stats Summary */}
            <div className="stats-grid" style={{ marginBottom: '30px' }}>
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today's Focus</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{todayMinutes} <span style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.7 }}>mins</span></div>
              </div>
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today's Sessions</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{todayCount}</div>
              </div>
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lifetime Focus</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{allTimeTotalMins} <span style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.7 }}>mins</span></div>
              </div>
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lifetime Sessions</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{allTimeCount}</div>
              </div>
            </div>

            {recentModesArray.length > 0 && (
              <div className="stats-grid" style={{ marginBottom: '30px' }}>
                {/* Trend Stacked Bar Chart */}
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 700 }}>Focus Volume Breakdown (Last 7 Days)</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={last7Days} margin={{ left: -20, right: 10, top: 10 }}>
                      <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="var(--text-secondary)" fontSize={12} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--glass-item-bg)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '0.85rem', marginTop: '10px' }} />
                      {recentModesArray.map((mode, idx) => (
                        <Bar key={mode} dataKey={mode} stackId="a" fill={getModeColor(mode, idx)} radius={idx === recentModesArray.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Counts Bar Chart */}
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 700 }}>Session Frequency (Last 7 Days)</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={countsChartData} margin={{ left: -20, right: 10, top: 10 }}>
                      <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="var(--text-secondary)" fontSize={12} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--glass-item-bg)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '0.85rem', marginTop: '10px' }} />
                      {recentModesArray.map((mode, idx) => (
                        <Bar key={mode} dataKey={mode} stackId="b" fill={getModeColor(mode, idx)} radius={idx === recentModesArray.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Mode Distribution Pie */}
            {allTimeCount > 0 && (
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 700, textAlign: 'center' }}>Lifetime Mode Distribution</h3>
                <ResponsiveContainer width="100%" height={320}>
                    <PieChart margin={{ top: 10, right: 110, bottom: 10, left: 10 }}>
                      <Pie data={modePieData} dataKey="value" nameKey="name" cx="38%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={3} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                        {modePieData.map((entry, i) => <Cell key={`cell-${i}`} fill={getModeColor(entry.name, i)} stroke="transparent" />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend
                        iconType="circle"
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{ fontSize: '0.85rem', paddingLeft: '12px' }}
                      />
                    </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StatsModal;

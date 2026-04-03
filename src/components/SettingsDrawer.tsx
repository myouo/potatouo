import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { saveBackgroundImage, clearBackgroundImage } from '../lib/storage';
import { X, Upload, Trash2, Plus } from 'lucide-react';

const SettingsDrawer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { settings, updateSettings, modes, addMode, deleteMode } = useSettings();
  
  const [newModeName, setNewModeName] = useState('');
  const [newFocus, setNewFocus] = useState(25);
  const [newRest, setNewRest] = useState(5);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      await saveBackgroundImage(dataUrl);
      window.dispatchEvent(new Event('pomodoro_bg_update'));
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = async () => {
    await clearBackgroundImage();
    window.dispatchEvent(new Event('pomodoro_bg_update'));
  };

  const handleAddMode = () => {
    if (!newModeName.trim()) return;
    addMode({ name: newModeName, focusTime: newFocus, restTime: newRest });
    setNewModeName('');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px',
      background: 'rgba(20, 20, 20, 0.85)',
      backdropFilter: 'blur(20px)',
      borderLeft: '1px solid var(--glass-border)',
      padding: '2rem',
      overflowY: 'auto',
      zIndex: 10,
    }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>Settings</h2>
        <button className="btn-icon" onClick={onClose}><X size={24} /></button>
      </div>

      <div className="settings-section" style={{ marginBottom: '2rem' }}>
        <h3>Background</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
          <label className="btn-secondary flex-center" style={{ flex: 1, cursor: 'pointer', gap: '8px' }}>
            <Upload size={18} /> Upload Image
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </label>
          <button className="btn-secondary" onClick={handleClearImage} title="Clear Image">
            <Trash2 size={18} />
          </button>
        </div>
        <div className="flex-col" style={{ gap: '8px' }}>
          <label>Background Dimness ({Math.round(settings.backgroundOpacity * 100)}%)</label>
          <input 
            type="range" min="0" max="1" step="0.05" 
            value={settings.backgroundOpacity} 
            onChange={(e) => updateSettings({ backgroundOpacity: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div className="settings-section" style={{ marginBottom: '2rem' }}>
        <h3>Alerts & Sound</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <label>Desktop Notifications</label>
          <input 
            type="checkbox" 
            checked={settings.notificationsEnabled}
            onChange={(e) => updateSettings({ notificationsEnabled: e.target.checked })}
          />
        </div>
        <div className="flex-col" style={{ gap: '8px' }}>
          <label>Volume</label>
          <input 
            type="range" min="0" max="1" step="0.1" 
            value={settings.volume} 
            onChange={(e) => updateSettings({ volume: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div className="settings-section">
        <h3>Timer Modes</h3>
        <div className="flex-col" style={{ gap: '10px', marginBottom: '1rem' }}>
          {modes.map(mode => (
            <div key={mode.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px',
              border: settings.currentModeId === mode.id ? '1px solid var(--accent-color)' : '1px solid transparent'
            }}>
              <div 
                style={{ flex: 1, cursor: 'pointer' }}
                onClick={() => updateSettings({ currentModeId: mode.id })}
              >
                <div style={{ fontWeight: 600 }}>{mode.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {mode.focusTime}m focus / {mode.restTime}m rest
                </div>
              </div>
              <button 
                className="btn-icon" style={{ width: '32px', height: '32px' }}
                onClick={() => {
                  if (confirm(`Delete mode ${mode.name}?`)) deleteMode(mode.id);
                }}
              >
                <Trash2 size={16} color="#ff4444" />
              </button>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Add New Mode</div>
          <input 
            type="text" placeholder="Mode Name (e.g. 50/10)"
            value={newModeName} onChange={(e) => setNewModeName(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px', borderRadius: '4px' }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
             <input type="number" placeholder="Focus (m)" value={newFocus} onChange={e=>setNewFocus(Number(e.target.value))} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px', borderRadius: '4px' }}/>
             <input type="number" placeholder="Rest (m)" value={newRest} onChange={e=>setNewRest(Number(e.target.value))} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px', borderRadius: '4px' }}/>
             <button className="btn-primary" style={{ padding: '8px' }} onClick={handleAddMode}><Plus size={20}/></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsDrawer;

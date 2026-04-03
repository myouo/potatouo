import { useEffect, useState } from 'react';
import { useSettings } from './context/SettingsContext';
import { getBackgroundImage } from './lib/storage';
import MainTimer from './components/MainTimer';
import SettingsDrawer from './components/SettingsDrawer';
import StatsModal from './components/StatsModal';
import { Settings, BarChart2 } from 'lucide-react';

function App() {
  const { settings } = useSettings();
  const [bgImage, setBgImage] = useState<string | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    getBackgroundImage().then(setBgImage);
    
    // Listen for custom event to update background without refresh
    const handleBgUpdate = () => {
      getBackgroundImage().then(setBgImage);
    };
    window.addEventListener('pomodoro_bg_update', handleBgUpdate);
    return () => window.removeEventListener('pomodoro_bg_update', handleBgUpdate);
  }, []);

  return (
    <>
      <div 
        className="app-background"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: bgImage ? `url(${bgImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: -2,
        }}
      />
      <div 
        className="app-overlay"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,1)',
          opacity: settings.backgroundOpacity,
          zIndex: -1,
        }}
      />
      
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: '10px' }}>
        <button className="btn-icon glass" onClick={() => setShowStats(true)}>
          <BarChart2 size={24} />
        </button>
        <button className="btn-icon glass" onClick={() => setShowSettings(true)}>
          <Settings size={24} />
        </button>
      </div>

      <MainTimer />

      {showSettings && <SettingsDrawer onClose={() => setShowSettings(false)} />}
      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
    </>
  );
}

export default App;

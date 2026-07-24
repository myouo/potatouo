import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useSettings } from './context/SettingsContext';
import { getBackgroundImages } from './lib/storage';
import {
  BACKGROUND_TRANSITIONS,
  type BackgroundImage,
  type BackgroundTransition,
  type BackgroundTransitionSetting,
} from './lib/types';
import MainTimer from './components/MainTimer';
import RestMusicPlayer from './components/RestMusicPlayer';
import { Settings, BarChart2, Sun, Moon } from 'lucide-react';

const SettingsDrawer = lazy(() => import('./components/SettingsDrawer'));
const StatsModal = lazy(() => import('./components/StatsModal'));

interface BackgroundLayerProps {
  image: BackgroundImage | null;
  transition: BackgroundTransitionSetting;
  size: 'cover' | 'contain';
  positionX: number;
  positionY: number;
}

const pickBackgroundTransition = (
  setting: BackgroundTransitionSetting,
): BackgroundTransition => {
  if (setting !== 'random') return setting;
  return BACKGROUND_TRANSITIONS[
    Math.floor(Math.random() * BACKGROUND_TRANSITIONS.length)
  ];
};

const BackgroundLayer = ({
  image,
  transition,
  size,
  positionX,
  positionY,
}: BackgroundLayerProps) => {
  const [resolvedTransition] = useState<BackgroundTransition>(
    () => pickBackgroundTransition(transition),
  );

  return (
    <div
      className={`app-background background-transition-${resolvedTransition}`}
      data-background-transition={resolvedTransition}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: image ? `url(${image.dataUrl})` : 'none',
        backgroundSize: size,
        backgroundPosition: `${positionX}% ${positionY}%`,
        backgroundRepeat: 'no-repeat',
        zIndex: -2,
      }}
    />
  );
};

function App() {
  const { settings, updateSettings } = useSettings();
  const [backgroundImages, setBackgroundImages] = useState<BackgroundImage[]>([]);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const loadBackgroundImages = useCallback(() => {
    getBackgroundImages().then(setBackgroundImages);
  }, []);

  useEffect(() => {
    loadBackgroundImages();
    
    // Listen for custom event to update background without refresh
    const handleBgUpdate = () => loadBackgroundImages();
    window.addEventListener('pomodoro_bg_update', handleBgUpdate);
    return () => window.removeEventListener('pomodoro_bg_update', handleBgUpdate);
  }, [loadBackgroundImages]);

  const activeBackgroundIndex = backgroundImages.findIndex(
    (image) => image.id === settings.activeBackgroundId,
  );
  const activeBackground = activeBackgroundIndex >= 0
    ? backgroundImages[activeBackgroundIndex]
    : backgroundImages[0] ?? null;

  useEffect(() => {
    if (backgroundImages.length === 0) {
      if (settings.activeBackgroundId !== null) {
        updateSettings({ activeBackgroundId: null });
      }
      return;
    }

    if (activeBackgroundIndex < 0) {
      updateSettings({ activeBackgroundId: backgroundImages[0].id });
    }
  }, [
    activeBackgroundIndex,
    backgroundImages,
    settings.activeBackgroundId,
    updateSettings,
  ]);

  useEffect(() => {
    if (settings.backgroundMode !== 'carousel' || backgroundImages.length < 2) return;

    const intervalSeconds = Math.max(5, settings.backgroundInterval || 15);
    const timer = window.setTimeout(() => {
      const currentIndex = activeBackgroundIndex >= 0 ? activeBackgroundIndex : 0;
      const nextImage = backgroundImages[(currentIndex + 1) % backgroundImages.length];
      updateSettings({ activeBackgroundId: nextImage.id });
    }, intervalSeconds * 1000);

    return () => window.clearTimeout(timer);
  }, [
    activeBackgroundIndex,
    backgroundImages,
    settings.backgroundInterval,
    settings.backgroundMode,
    updateSettings,
  ]);

  // Compute Theme Logic
  const [systemDark, setSystemDark] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const computedTheme = settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', computedTheme);
  }, [computedTheme]);

  const toggleTheme = () => {
    updateSettings({ theme: computedTheme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <>
      <BackgroundLayer
        key={`${activeBackground?.id ?? 'no-background'}:${settings.backgroundTransition}`}
        image={activeBackground}
        transition={settings.backgroundTransition}
        size={settings.bgSize ?? 'cover'}
        positionX={settings.bgPositionX ?? 50}
        positionY={settings.bgPositionY ?? 50}
      />
      <div 
        className="app-overlay"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: computedTheme === 'light' ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)',
          opacity: settings.backgroundOpacity,
          zIndex: -1,
        }}
      />
      
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: '10px' }}>
        <button className="btn-icon glass" onClick={toggleTheme} aria-label="Toggle theme">
          {computedTheme === 'dark' ? <Moon size={24} /> : <Sun size={24} />}
        </button>
        <button className="btn-icon glass" onClick={() => setShowStats(true)} aria-label="Open statistics">
          <BarChart2 size={24} />
        </button>
        <button className="btn-icon glass" onClick={() => setShowSettings(true)} aria-label="Open settings">
          <Settings size={24} />
        </button>
      </div>

      <main className="app-main">
        <MainTimer />
      </main>

      <RestMusicPlayer />

      <Suspense fallback={null}>
        {showSettings && <SettingsDrawer onClose={() => setShowSettings(false)} />}
        {showStats && <StatsModal onClose={() => setShowStats(false)} />}
      </Suspense>
    </>
  );
}

export default App;

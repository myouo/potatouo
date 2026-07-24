import React, { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import {
  addBackgroundImages,
  clearBackgroundImages,
  clearRestMusic,
  deleteBackgroundImage,
  getBackgroundImages,
  getRestMusic,
  saveRestMusic,
} from '../lib/storage';
import type {
  BackgroundImage,
  BackgroundTransitionSetting,
  RestMusicTrack,
} from '../lib/types';
import { ChevronLeft, ChevronRight, Music2, Plus, Trash2, Upload, X } from 'lucide-react';

const SettingsDrawer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { settings, updateSettings, modes, addMode, deleteMode } = useSettings();
  
  const [newModeName, setNewModeName] = useState('');
  const [newFocus, setNewFocus] = useState(25);
  const [newRest, setNewRest] = useState(5);
  const [backgroundImages, setBackgroundImages] = useState<BackgroundImage[]>([]);
  const [isImportingImages, setIsImportingImages] = useState(false);
  const [imageImportError, setImageImportError] = useState<string | null>(null);
  const [restMusic, setRestMusic] = useState<RestMusicTrack | null>(null);
  const [restMusicPreviewUrl, setRestMusicPreviewUrl] = useState<string | null>(null);
  const [isImportingMusic, setIsImportingMusic] = useState(false);
  const [restMusicError, setRestMusicError] = useState<string | null>(null);

  useEffect(() => {
    getBackgroundImages().then(setBackgroundImages);
    getRestMusic().then(setRestMusic);
  }, []);

  useEffect(() => {
    if (!restMusic) {
      setRestMusicPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(restMusic.blob);
    setRestMusicPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [restMusic]);

  useEffect(() => {
    const handlePlaybackError = (event: Event) => {
      setRestMusicError((event as CustomEvent<string>).detail);
    };

    window.addEventListener('pomodoro_rest_music_error', handlePlaybackError);
    return () => window.removeEventListener('pomodoro_rest_music_error', handlePlaybackError);
  }, []);

  const notifyBackgroundUpdate = () => {
    window.dispatchEvent(new Event('pomodoro_bg_update'));
  };

  const notifyRestMusicUpdate = () => {
    window.dispatchEvent(new Event('pomodoro_rest_music_update'));
  };

  const readImageFile = (file: File): Promise<BackgroundImage> => (
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error(`Could not read ${file.name}`));
          return;
        }

        resolve({
          id: crypto.randomUUID(),
          name: file.name,
          dataUrl: reader.result,
          createdAt: Date.now(),
        });
      };
      reader.onerror = () => reject(reader.error ?? new Error(`Could not read ${file.name}`));
      reader.readAsDataURL(file);
    })
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;

    setIsImportingImages(true);
    setImageImportError(null);

    try {
      const importedImages = await Promise.all(files.map(readImageFile));
      const nextImages = await addBackgroundImages(importedImages);
      setBackgroundImages(nextImages);
      if (!settings.activeBackgroundId && nextImages[0]) {
        updateSettings({ activeBackgroundId: nextImages[0].id });
      }
      notifyBackgroundUpdate();
    } catch (error) {
      console.error('Failed to import background images', error);
      setImageImportError('Could not import the selected images. Try smaller files.');
    } finally {
      setIsImportingImages(false);
    }
  };

  const handleClearImages = async () => {
    await clearBackgroundImages();
    setBackgroundImages([]);
    updateSettings({ activeBackgroundId: null, backgroundMode: 'single' });
    notifyBackgroundUpdate();
  };

  const handleDeleteImage = async (id: string) => {
    const deletedIndex = backgroundImages.findIndex((image) => image.id === id);
    const nextImages = await deleteBackgroundImage(id);
    setBackgroundImages(nextImages);

    if (settings.activeBackgroundId === id) {
      const fallbackIndex = Math.min(Math.max(deletedIndex, 0), nextImages.length - 1);
      updateSettings({ activeBackgroundId: nextImages[fallbackIndex]?.id ?? null });
    }

    notifyBackgroundUpdate();
  };

  const stepBackground = (direction: -1 | 1) => {
    if (backgroundImages.length === 0) return;
    const currentIndex = backgroundImages.findIndex(
      (image) => image.id === settings.activeBackgroundId,
    );
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (
      safeIndex + direction + backgroundImages.length
    ) % backgroundImages.length;
    updateSettings({ activeBackgroundId: backgroundImages[nextIndex].id });
  };

  const handleRestMusicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    setIsImportingMusic(true);
    setRestMusicError(null);

    try {
      const track: RestMusicTrack = {
        name: file.name,
        blob: file,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        createdAt: Date.now(),
      };
      await saveRestMusic(track);
      setRestMusic(track);
      updateSettings({ restMusicEnabled: true });
      notifyRestMusicUpdate();

      if (file.type && !document.createElement('audio').canPlayType(file.type)) {
        setRestMusicError(
          'Saved successfully, but this browser may not be able to decode this audio format.',
        );
      }
    } catch (error) {
      console.error('Failed to save rest music', error);
      setRestMusicError('Could not save this audio file. It may exceed browser storage limits.');
    } finally {
      setIsImportingMusic(false);
    }
  };

  const handleClearRestMusic = async () => {
    await clearRestMusic();
    setRestMusic(null);
    setRestMusicError(null);
    updateSettings({ restMusicEnabled: false });
    notifyRestMusicUpdate();
  };

  const handleAddMode = () => {
    if (!newModeName.trim()) return;
    addMode({ name: newModeName, focusTime: newFocus, restTime: newRest });
    setNewModeName('');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(400px, 100vw)',
      background: 'var(--glass-drawer-bg)',
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
        <h3>Appearance</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button className={`btn-secondary ${settings.theme === 'dark' ? 'active' : ''}`}
                    style={{ flex: 1, backgroundColor: settings.theme === 'dark' ? 'var(--accent-color)' : '', color: settings.theme === 'dark' ? '#fff' : '' }}
                    onClick={() => updateSettings({ theme: 'dark' })}>Dark</button>
            <button className={`btn-secondary ${settings.theme === 'light' ? 'active' : ''}`}
                    style={{ flex: 1, backgroundColor: settings.theme === 'light' ? 'var(--accent-color)' : '', color: settings.theme === 'light' ? '#fff' : '' }}
                    onClick={() => updateSettings({ theme: 'light' })}>Light</button>
            <button className={`btn-secondary ${settings.theme === 'system' ? 'active' : ''}`}
                    style={{ flex: 1, backgroundColor: settings.theme === 'system' ? 'var(--accent-color)' : '', color: settings.theme === 'system' ? '#fff' : '' }}
                    onClick={() => updateSettings({ theme: 'system' })}>System</button>
        </div>
      </div>

      <div className="settings-section" style={{ marginBottom: '2rem' }}>
        <h3>Background</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
          <label className="btn-secondary flex-center" style={{ flex: 1, cursor: 'pointer', gap: '8px' }}>
            <Upload size={18} /> {isImportingImages ? 'Importing…' : 'Add Images'}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={isImportingImages}
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
          </label>
          <button
            className="btn-secondary"
            onClick={handleClearImages}
            title="Clear all images"
            aria-label="Clear all background images"
            disabled={backgroundImages.length === 0}
          >
            <Trash2 size={18} />
          </button>
        </div>
        <div className="background-library-summary">
          {backgroundImages.length === 0
            ? 'No background images'
            : `${backgroundImages.length} image${backgroundImages.length === 1 ? '' : 's'} in library`}
        </div>
        {imageImportError && <div className="background-library-error">{imageImportError}</div>}

        {backgroundImages.length > 0 && (
          <div className="background-library-grid">
            {backgroundImages.map((image, index) => {
              const isActive = image.id === settings.activeBackgroundId
                || (!settings.activeBackgroundId && index === 0);
              return (
                <div
                  key={image.id}
                  className={`background-thumbnail ${isActive ? 'active' : ''}`}
                >
                  <button
                    className="background-thumbnail-select"
                    onClick={() => updateSettings({ activeBackgroundId: image.id })}
                    title={image.name}
                    aria-label={`Use ${image.name} as background`}
                  >
                    <img src={image.dataUrl} alt="" />
                    <span>{index + 1}</span>
                  </button>
                  <button
                    className="background-thumbnail-delete"
                    onClick={() => handleDeleteImage(image.id)}
                    title={`Delete ${image.name}`}
                    aria-label={`Delete ${image.name}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="background-mode-grid">
          <button
            className={`btn-secondary ${settings.backgroundMode === 'single' ? 'active' : ''}`}
            onClick={() => updateSettings({ backgroundMode: 'single' })}
          >
            Single
          </button>
          <button
            className={`btn-secondary ${settings.backgroundMode === 'carousel' ? 'active' : ''}`}
            onClick={() => updateSettings({ backgroundMode: 'carousel' })}
            disabled={backgroundImages.length < 2}
            title={backgroundImages.length < 2 ? 'Add at least two images' : 'Rotate backgrounds automatically'}
          >
            Carousel
          </button>
        </div>

        {backgroundImages.length > 1 && (
          <div className="background-stepper">
            <button
              className="btn-icon"
              onClick={() => stepBackground(-1)}
              aria-label="Previous background"
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              {Math.max(
                backgroundImages.findIndex((image) => image.id === settings.activeBackgroundId) + 1,
                1,
              )}
              {' / '}
              {backgroundImages.length}
            </span>
            <button
              className="btn-icon"
              onClick={() => stepBackground(1)}
              aria-label="Next background"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        <div className="flex-col" style={{ gap: '15px' }}>
          {settings.backgroundMode === 'carousel' && backgroundImages.length > 1 && (
            <div className="flex-col" style={{ gap: '8px' }}>
              <label>Change Every ({settings.backgroundInterval || 15}s)</label>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={settings.backgroundInterval || 15}
                onChange={(e) => updateSettings({ backgroundInterval: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {backgroundImages.length > 1 && (
            <div className="flex-col" style={{ gap: '8px' }}>
              <label htmlFor="background-transition">Transition Animation</label>
              <select
                id="background-transition"
                className="modern-input"
                value={settings.backgroundTransition}
                onChange={(e) => updateSettings({
                  backgroundTransition: e.target.value as BackgroundTransitionSetting,
                })}
              >
                <option value="fade">Fade</option>
                <option value="zoom-in">Zoom In</option>
                <option value="zoom-out">Zoom Out</option>
                <option value="slide-left">Slide Left</option>
                <option value="slide-up">Slide Up</option>
                <option value="blur">Soft Blur</option>
                <option value="wipe">Wipe</option>
                <option value="random">Random Every Time</option>
              </select>
            </div>
          )}

          <div className="flex-col" style={{ gap: '8px' }}>
            <label>Background Dimness ({Math.round(settings.backgroundOpacity * 100)}%)</label>
            <input 
              type="range" min="0" max="1" step="0.05" 
              value={settings.backgroundOpacity} 
              onChange={(e) => updateSettings({ backgroundOpacity: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className={`btn-secondary ${settings.bgSize === 'cover' ? 'active' : ''}`}
              style={{ flex: 1, backgroundColor: settings.bgSize === 'cover' ? 'var(--accent-color)' : '', color: settings.bgSize === 'cover' ? '#fff' : '' }}
              onClick={() => updateSettings({ bgSize: 'cover' })}
            >Cover</button>
            <button 
              className={`btn-secondary ${settings.bgSize === 'contain' ? 'active' : ''}`}
              style={{ flex: 1, backgroundColor: settings.bgSize === 'contain' ? 'var(--accent-color)' : '', color: settings.bgSize === 'contain' ? '#fff' : '' }}
              onClick={() => updateSettings({ bgSize: 'contain' })}
            >Contain</button>
          </div>

          <div className="flex-col" style={{ gap: '8px' }}>
            <label>Horizontal Position ({settings.bgPositionX ?? 50}%)</label>
            <input 
              type="range" min="0" max="100" step="1" 
              value={settings.bgPositionX ?? 50} 
              onChange={(e) => updateSettings({ bgPositionX: parseInt(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          <div className="flex-col" style={{ gap: '8px' }}>
            <label>Vertical Position ({settings.bgPositionY ?? 50}%)</label>
            <input 
              type="range" min="0" max="100" step="1" 
              value={settings.bgPositionY ?? 50} 
              onChange={(e) => updateSettings({ bgPositionY: parseInt(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
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

        <div className="rest-music-card">
          <div className="rest-music-heading">
            <div>
              <div className="rest-music-title">
                <Music2 size={18} />
                Rest Music
              </div>
              <div className="rest-music-hint">
                Stored only in this browser. Supports audio formats your browser can decode.
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Enable rest music"
              checked={settings.restMusicEnabled}
              disabled={!restMusic}
              onChange={(event) => updateSettings({ restMusicEnabled: event.target.checked })}
            />
          </div>

          <div className="rest-music-actions">
            <label className="btn-secondary flex-center">
              <Upload size={17} />
              {isImportingMusic ? 'Saving…' : restMusic ? 'Replace Audio' : 'Upload Audio'}
              <input
                type="file"
                accept="audio/*"
                disabled={isImportingMusic}
                style={{ display: 'none' }}
                onChange={handleRestMusicUpload}
              />
            </label>
            <button
              className="btn-secondary"
              aria-label="Clear rest music"
              title="Clear rest music"
              disabled={!restMusic}
              onClick={handleClearRestMusic}
            >
              <Trash2 size={17} />
            </button>
          </div>

          {restMusic && (
            <>
              <div className="rest-music-file">
                <span title={restMusic.name}>{restMusic.name}</span>
                <small>{(restMusic.size / 1024 / 1024).toFixed(1)} MB</small>
              </div>
              {restMusicPreviewUrl && (
                <audio
                  className="rest-music-preview"
                  src={restMusicPreviewUrl}
                  controls
                  preload="metadata"
                  onError={() => setRestMusicError(
                    'This browser could not play the selected audio format.',
                  )}
                />
              )}
              <div className="flex-col" style={{ gap: '8px' }}>
                <label>
                  Rest Music Volume ({Math.round(settings.restMusicVolume * 100)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.restMusicVolume}
                  onChange={(event) => updateSettings({
                    restMusicVolume: Number(event.target.value),
                  })}
                  style={{ width: '100%' }}
                />
              </div>
              <label className="rest-music-loop">
                <input
                  type="checkbox"
                  checked={settings.restMusicLoop}
                  onChange={(event) => updateSettings({ restMusicLoop: event.target.checked })}
                />
                Loop during the break
              </label>
            </>
          )}

          {restMusicError && (
            <div className="background-library-error">{restMusicError}</div>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h3>Timer Modes</h3>
        <div className="flex-col" style={{ gap: '10px', marginBottom: '1rem' }}>
          {modes.map(mode => (
            <div key={mode.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px', background: 'var(--glass-item-bg)', borderRadius: '8px',
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

        {/* ADD NEW MODE FORM */}
        <div className="glass-card" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>Create Custom Timer</h3>
          
          <div>
            <label className="modern-label">Mode Identifier</label>
            <input 
              className="modern-input"
              type="text" 
              placeholder="e.g. Deep Work (90m)"
              value={newModeName} 
              onChange={(e) => setNewModeName(e.target.value)}
            />
          </div>

          <div className="form-grid" style={{ marginBottom: '10px' }}>
            <div>
               <label className="modern-label">Focus (Minutes)</label>
               <input className="modern-input" type="number" placeholder="25" value={newFocus} onChange={e=>setNewFocus(Number(e.target.value))} />
            </div>
            <div>
               <label className="modern-label">Rest (Minutes)</label>
               <input className="modern-input" type="number" placeholder="5" value={newRest} onChange={e=>setNewRest(Number(e.target.value))} />
            </div>
          </div>

          <button className="modern-button" onClick={handleAddMode}>
            <span>Add New Mode</span>
            <Plus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsDrawer;

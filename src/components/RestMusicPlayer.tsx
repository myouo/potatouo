import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTimer } from '../context/TimerContext';
import { getRestMusic } from '../lib/storage';

const RestMusicPlayer = () => {
  const { settings } = useSettings();
  const { activeTimerMode, phase, status } = useTimer();
  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadTrack = async () => {
      const track = await getRestMusic();
      if (!isActive) return;

      if (sourceUrlRef.current) {
        URL.revokeObjectURL(sourceUrlRef.current);
      }

      const nextSourceUrl = track ? URL.createObjectURL(track.blob) : null;
      sourceUrlRef.current = nextSourceUrl;
      setSourceUrl(nextSourceUrl);
    };

    void loadTrack();
    window.addEventListener('pomodoro_rest_music_update', loadTrack);
    return () => {
      isActive = false;
      window.removeEventListener('pomodoro_rest_music_update', loadTrack);
      if (sourceUrlRef.current) {
        URL.revokeObjectURL(sourceUrlRef.current);
        sourceUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.min(1, Math.max(0, settings.restMusicVolume));
  }, [settings.restMusicVolume, sourceUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !sourceUrl) return;

    const shouldPlay = (
      settings.restMusicEnabled &&
      activeTimerMode === 'pomodoro' &&
      phase === 'rest' &&
      status === 'running'
    );

    if (shouldPlay) {
      void audio.play().catch(() => {
        window.dispatchEvent(new CustomEvent('pomodoro_rest_music_error', {
          detail: 'Music playback was blocked or this audio format is not supported by the browser.',
        }));
      });
      return;
    }

    audio.pause();
    if (
      !settings.restMusicEnabled ||
      activeTimerMode !== 'pomodoro' ||
      phase !== 'rest' ||
      status === 'stopped'
    ) {
      audio.currentTime = 0;
    }
  }, [
    activeTimerMode,
    phase,
    settings.restMusicEnabled,
    settings.restMusicLoop,
    sourceUrl,
    status,
  ]);

  if (!sourceUrl) return null;

  return (
    <audio
      ref={audioRef}
      src={sourceUrl}
      loop={settings.restMusicLoop}
      preload="metadata"
      data-rest-music-player
    />
  );
};

export default RestMusicPlayer;

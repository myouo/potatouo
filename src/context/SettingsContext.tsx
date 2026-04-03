import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Settings, Mode } from '../lib/types';
import { DEFAULT_SETTINGS, DEFAULT_MODES } from '../lib/types';
import { getSettings, saveSettings, getModes, saveModes } from '../lib/storage';

interface SettingsContextType {
  settings: Settings;
  modes: Mode[];
  currentMode: Mode;
  updateSettings: (newSettings: Partial<Settings>) => void;
  addMode: (mode: Omit<Mode, 'id'>) => void;
  updateMode: (id: string, mode: Omit<Mode, 'id'>) => void;
  deleteMode: (id: string) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [modes, setModesState] = useState<Mode[]>(DEFAULT_MODES);

  useEffect(() => {
    setSettingsState(getSettings());
    setModesState(getModes());
  }, []);

  const updateSettings = (partial: Partial<Settings>) => {
    const nextSettings = { ...settings, ...partial };
    setSettingsState(nextSettings);
    saveSettings(nextSettings);
  };

  const addMode = (mode: Omit<Mode, 'id'>) => {
    const newMode: Mode = { ...mode, id: Math.random().toString(36).substr(2, 9) };
    const nextModes = [...modes, newMode];
    setModesState(nextModes);
    saveModes(nextModes);
  };

  const updateMode = (id: string, mode: Omit<Mode, 'id'>) => {
    const nextModes = modes.map((m) => (m.id === id ? { ...m, ...mode } : m));
    setModesState(nextModes);
    saveModes(nextModes);
  };

  const deleteMode = (id: string) => {
    const nextModes = modes.filter((m) => m.id !== id);
    setModesState(nextModes);
    saveModes(nextModes);
    
    // Fallback if deleted current
    if (settings.currentModeId === id && nextModes.length > 0) {
      updateSettings({ currentModeId: nextModes[0].id });
    }
  };

  const currentMode = modes.find((m) => m.id === settings.currentModeId) || modes[0] || DEFAULT_MODES[0];

  return (
    <SettingsContext.Provider value={{ settings, modes, currentMode, updateSettings, addMode, updateMode, deleteMode }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};

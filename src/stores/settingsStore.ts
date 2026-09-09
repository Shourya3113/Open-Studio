import { create } from 'zustand';
import { OpenStudioSettings, DEFAULT_SETTINGS } from '../types/settings';

export const SETTINGS_CONFIG_FILE = '.openstudio/settings.json';
export const LOCAL_STORAGE_SETTINGS_KEY = 'openstudio_settings_state';

let inMemorySettingsStorage: string | null = null;

export function clearSettingsStorage(): void {
  inMemorySettingsStorage = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LOCAL_STORAGE_SETTINGS_KEY);
    }
  } catch {
    // Ignore
  }
}

export function _setRawSettingsStorageForTest(raw: string | null): void {
  inMemorySettingsStorage = raw;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (raw !== null) {
        window.localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, raw);
      } else {
        window.localStorage.removeItem(LOCAL_STORAGE_SETTINGS_KEY);
      }
    }
  } catch {
    // Ignore
  }
}

export async function saveSettingsToFile(
  settings: OpenStudioSettings,
  workspacePath?: string
): Promise<boolean> {
  const jsonContent = JSON.stringify(settings, null, 2);
  inMemorySettingsStorage = jsonContent;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, jsonContent);
    }
  } catch {
    // Ignore
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const targetPath = workspacePath
      ? `${workspacePath.replace(/[/\\]+$/, '')}/${SETTINGS_CONFIG_FILE}`
      : SETTINGS_CONFIG_FILE;

    await invoke('write_file_content', {
      path: targetPath,
      content: jsonContent,
    });
    return true;
  } catch {
    return true;
  }
}

export async function loadSettingsFromFile(
  workspacePath?: string
): Promise<OpenStudioSettings> {
  let rawContent: string | null = null;

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const targetPath = workspacePath
      ? `${workspacePath.replace(/[/\\]+$/, '')}/${SETTINGS_CONFIG_FILE}`
      : SETTINGS_CONFIG_FILE;

    rawContent = await invoke<string>('read_file_content', { path: targetPath });
  } catch {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        rawContent = window.localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
      }
    } catch {
      rawContent = null;
    }
  }

  if (!rawContent && inMemorySettingsStorage) {
    rawContent = inMemorySettingsStorage;
  }

  if (!rawContent) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const parsed = JSON.parse(rawContent);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

interface SettingsStoreState {
  settings: OpenStudioSettings;
  isModalOpen: boolean;
  isOnboardingOpen: boolean;
  isSaving: boolean;
  openModal: () => void;
  closeModal: () => void;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  updateSettings: (partial: Partial<OpenStudioSettings>) => void;
  resetToDefaults: () => void;
  setFirstRunCompleted: () => void;
  hydrateSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  isModalOpen: false,
  isOnboardingOpen: false,
  isSaving: false,

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),

  openOnboarding: () => set({ isOnboardingOpen: true }),
  closeOnboarding: () => set({ isOnboardingOpen: false }),

  updateSettings: (partial: Partial<OpenStudioSettings>) => {
    const newSettings = { ...get().settings, ...partial };
    set({ settings: newSettings });
    // Debounced or direct auto-save
    saveSettingsToFile(newSettings).catch(() => {});
  },

  resetToDefaults: () => {
    const defaults = { ...DEFAULT_SETTINGS, isFirstRun: false };
    set({ settings: defaults });
    saveSettingsToFile(defaults).catch(() => {});
  },

  setFirstRunCompleted: () => {
    const updated = { ...get().settings, isFirstRun: false };
    set({ settings: updated, isOnboardingOpen: false });
    saveSettingsToFile(updated).catch(() => {});
  },

  hydrateSettings: async () => {
    const loaded = await loadSettingsFromFile();
    set({
      settings: loaded,
      isOnboardingOpen: loaded.isFirstRun,
    });
  },
}));

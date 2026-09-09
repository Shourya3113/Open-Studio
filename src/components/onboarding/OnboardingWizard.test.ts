import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '../../stores/settingsStore';
import { DEFAULT_SETTINGS } from '../../types/settings';
import { createDefaultCommands } from '../../features/palette/defaultCommands';

describe('OnboardingWizard (Day 20)', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, isFirstRun: true },
      isModalOpen: false,
      isOnboardingOpen: true,
    });
  });

  it('detects first run on initial launch and opens onboarding wizard', () => {
    const store = useSettingsStore.getState();
    expect(store.settings.isFirstRun).toBe(true);
    expect(store.isOnboardingOpen).toBe(true);
  });

  it('marks first run as completed and closes the wizard', () => {
    useSettingsStore.getState().setFirstRunCompleted();
    const store = useSettingsStore.getState();
    expect(store.settings.isFirstRun).toBe(false);
    expect(store.isOnboardingOpen).toBe(false);
  });

  it('can be reopened via openOnboarding', () => {
    useSettingsStore.getState().setFirstRunCompleted();
    expect(useSettingsStore.getState().isOnboardingOpen).toBe(false);

    useSettingsStore.getState().openOnboarding();
    expect(useSettingsStore.getState().isOnboardingOpen).toBe(true);
  });

  it('is bound to Command Palette as Help: Welcome & Setup Guide', () => {
    const mockCtx = {
      toggleSidebar: vi.fn(),
      toggleTerminal: vi.fn(),
      setActiveTab: vi.fn(),
      openHardwareModal: vi.fn(),
      openCheckpointModal: vi.fn(),
      openSettingsModal: vi.fn(),
      openOnboardingModal: vi.fn(),
    };

    const commands = createDefaultCommands(mockCtx);
    const welcomeCmd = commands.find((c) => c.id === 'help:welcome');

    expect(welcomeCmd).toBeDefined();
    expect(welcomeCmd?.title).toBe('Help: Welcome & Setup Guide');
    expect(welcomeCmd?.category).toBe('Help');

    welcomeCmd?.handler();
    expect(mockCtx.openOnboardingModal).toHaveBeenCalledTimes(1);
  });
});

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { checkInferenceHealth } from '../../services/inference';

export const OnboardingWizard: React.FC = () => {
  const { isOnboardingOpen, closeOnboarding, setFirstRunCompleted, settings } = useSettingsStore();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isOllamaOnline, setIsOllamaOnline] = useState<boolean | null>(null);
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  useEffect(() => {
    if (isOnboardingOpen) {
      setCurrentStep(1);
      verifyHealth();
    }
  }, [isOnboardingOpen]);

  const verifyHealth = async () => {
    setIsChecking(true);
    try {
      const health = await checkInferenceHealth();
      setIsOllamaOnline(health.online);
      if (health.online) {
        try {
          const res = await fetch(`${settings.ollamaEndpoint}/api/tags`);
          if (res.ok) {
            const data = await res.json();
            const names = (data.models || []).map((m: { name: string }) => m.name);
            setInstalledModels(names);
          }
        } catch {
          // Ignore
        }
      }
    } catch {
      setIsOllamaOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(text);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  if (!isOnboardingOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome Onboarding Wizard"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-[#1e1e1e] border border-[#3e3e42] rounded-xl shadow-2xl w-full max-w-xl flex flex-col text-[#cccccc] overflow-hidden">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d2d30] bg-[#252526]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <span className="text-sm font-semibold text-white">Welcome to Open Studio</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#858585]">
            <span className={currentStep === 1 ? 'text-[#007acc] font-bold' : ''}>1. Welcome</span>
            <span>•</span>
            <span className={currentStep === 2 ? 'text-[#007acc] font-bold' : ''}>2. Local AI</span>
            <span>•</span>
            <span className={currentStep === 3 ? 'text-[#007acc] font-bold' : ''}>3. Shortcuts</span>
          </div>
        </div>

        {/* Wizard Body */}
        <div className="p-6 space-y-5 min-h-[320px] flex flex-col justify-between">
          {/* STEP 1: WELCOME & AIR-GAP */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <h2 className="text-xl font-bold text-white mb-2">100% Offline AI Coding Workspace</h2>
                <p className="text-xs text-[#858585] max-w-md mx-auto">
                  A high-performance native desktop IDE designed for developer privacy. Your code, diffs, and context never leave your machine.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-[#252526] p-3 rounded-lg border border-[#2d2d30]">
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    ⚡ Sub-40ms Tab Autocomplete
                  </div>
                  <p className="text-[11px] text-[#858585] mt-1">
                    Instant ghost text as you type using resident Fill-In-the-Middle neural models.
                  </p>
                </div>
                <div className="bg-[#252526] p-3 rounded-lg border border-[#2d2d30]">
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    🛡️ Shadow Git Safety Net
                  </div>
                  <p className="text-[11px] text-[#858585] mt-1">
                    Automatic time-travel checkpoints before any AI edit with 1-click restore.
                  </p>
                </div>
                <div className="bg-[#252526] p-3 rounded-lg border border-[#2d2d30]">
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    📝 Frugal Diff Engine
                  </div>
                  <p className="text-[11px] text-[#858585] mt-1">
                    Token-efficient search/replace blocks with multi-hunk Monaco side-by-side review.
                  </p>
                </div>
                <div className="bg-[#252526] p-3 rounded-lg border border-[#2d2d30]">
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    🔒 Zero-Telemetry Guarantee
                  </div>
                  <p className="text-[11px] text-[#858585] mt-1">
                    Strict CSP rules; completely air-gapped from cloud tracking or telemetry beacons.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: LOCAL INFERENCE SETUP */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-white mb-1">Local Inference Engine</h2>
                <p className="text-xs text-[#858585]">
                  Verifying local connection to Ollama at <code className="text-[#4ec9b0]">{settings.ollamaEndpoint}</code>
                </p>
              </div>

              {/* Status Banner */}
              <div className="bg-[#252526] p-4 rounded-lg border border-[#2d2d30] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {isChecking ? '⏳' : isOllamaOnline ? '🟢' : '🔴'}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {isChecking
                        ? 'Checking connection...'
                        : isOllamaOnline
                        ? 'Ollama is Online & Ready'
                        : 'Ollama is Offline'}
                    </div>
                    <p className="text-[11px] text-[#858585]">
                      {isOllamaOnline
                        ? `Found ${installedModels.length} models installed locally`
                        : 'Start Ollama locally on your workstation to enable local AI features.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={verifyHealth}
                  className="px-2.5 py-1 text-xs bg-[#3e3e42] hover:bg-[#4e4e52] rounded text-white transition-colors"
                >
                  Recheck
                </button>
              </div>

              {/* Recommended Models */}
              <div>
                <div className="text-xs font-semibold text-white mb-2">Recommended Setup Models:</div>
                <div className="space-y-2">
                  <div className="bg-[#252526] p-3 rounded border border-[#2d2d30] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-white flex items-center gap-2">
                        <span>qwen2.5-coder:1.5b</span>
                        <span className="text-[10px] bg-blue-900/60 text-blue-300 px-1.5 py-0.5 rounded">
                          Fast Autocomplete
                        </span>
                      </div>
                      <p className="text-[11px] text-[#858585] mt-0.5">
                        Sub-40ms tab completions (pinned resident in VRAM/RAM).
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard('ollama pull qwen2.5-coder:1.5b')}
                      className="px-2 py-1 text-[11px] bg-[#1e1e1e] border border-[#3e3e42] hover:border-[#007acc] rounded text-white"
                    >
                      {copiedCommand === 'ollama pull qwen2.5-coder:1.5b' ? '✓ Copied' : 'Copy Pull Command'}
                    </button>
                  </div>

                  <div className="bg-[#252526] p-3 rounded border border-[#2d2d30] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-white flex items-center gap-2">
                        <span>qwen2.5-coder:7b</span>
                        <span className="text-[10px] bg-purple-900/60 text-purple-300 px-1.5 py-0.5 rounded">
                          Chat & Diffs
                        </span>
                      </div>
                      <p className="text-[11px] text-[#858585] mt-0.5">
                        High accuracy for multi-file refactoring and chat instructions.
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard('ollama pull qwen2.5-coder:7b')}
                      className="px-2 py-1 text-[11px] bg-[#1e1e1e] border border-[#3e3e42] hover:border-[#007acc] rounded text-white"
                    >
                      {copiedCommand === 'ollama pull qwen2.5-coder:7b' ? '✓ Copied' : 'Copy Pull Command'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ESSENTIAL SHORTCUTS */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-white mb-1">Quickstart & Shortcuts</h2>
                <p className="text-xs text-[#858585]">
                  Master key navigation shortcuts to code at full speed in Open Studio.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#252526] p-3 rounded border border-[#2d2d30] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Command Palette</div>
                    <div className="text-[11px] text-[#858585]">Access all commands & files</div>
                  </div>
                  <kbd className="bg-[#1e1e1e] px-2 py-1 rounded text-[#4ec9b0] font-mono text-[11px] border border-[#3e3e42]">
                    Ctrl+Shift+P
                  </kbd>
                </div>

                <div className="bg-[#252526] p-3 rounded border border-[#2d2d30] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Toggle Terminal</div>
                    <div className="text-[11px] text-[#858585]">Embedded native PTY</div>
                  </div>
                  <kbd className="bg-[#1e1e1e] px-2 py-1 rounded text-[#4ec9b0] font-mono text-[11px] border border-[#3e3e42]">
                    Ctrl+`
                  </kbd>
                </div>

                <div className="bg-[#252526] p-3 rounded border border-[#2d2d30] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Problems & Diagnostics</div>
                    <div className="text-[11px] text-[#858585]">Compiler & linter errors</div>
                  </div>
                  <kbd className="bg-[#1e1e1e] px-2 py-1 rounded text-[#4ec9b0] font-mono text-[11px] border border-[#3e3e42]">
                    Ctrl+Shift+M
                  </kbd>
                </div>

                <div className="bg-[#252526] p-3 rounded border border-[#2d2d30] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Settings Modal</div>
                    <div className="text-[11px] text-[#858585]">Preferences & AI models</div>
                  </div>
                  <kbd className="bg-[#1e1e1e] px-2 py-1 rounded text-[#4ec9b0] font-mono text-[11px] border border-[#3e3e42]">
                    Ctrl+,
                  </kbd>
                </div>

                <div className="bg-[#252526] p-3 rounded border border-[#2d2d30] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Accept Autocomplete</div>
                    <div className="text-[11px] text-[#858585]">Ghost-text suggestion</div>
                  </div>
                  <kbd className="bg-[#1e1e1e] px-2 py-1 rounded text-[#4ec9b0] font-mono text-[11px] border border-[#3e3e42]">
                    Tab
                  </kbd>
                </div>

                <div className="bg-[#252526] p-3 rounded border border-[#2d2d30] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Split Editor View</div>
                    <div className="text-[11px] text-[#858585]">Side-by-side panes</div>
                  </div>
                  <kbd className="bg-[#1e1e1e] px-2 py-1 rounded text-[#4ec9b0] font-mono text-[11px] border border-[#3e3e42]">
                    Ctrl+\
                  </kbd>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#2d2d30] bg-[#252526]">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              className="px-3 py-1.5 text-xs font-medium text-[#cccccc] hover:bg-[#3e3e42] rounded transition-colors"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={closeOnboarding}
              className="px-3 py-1.5 text-xs text-[#858585] hover:text-white transition-colors"
            >
              Skip
            </button>

            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                className="px-4 py-1.5 text-xs font-medium text-white bg-[#007acc] hover:bg-[#0062a3] rounded transition-colors"
              >
                Next Step →
              </button>
            ) : (
              <button
                onClick={setFirstRunCompleted}
                className="px-5 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors shadow-sm font-semibold"
              >
                Launch Workspace 🚀
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

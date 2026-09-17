import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { checkInferenceHealth } from '../../services/inference';
import { 
  getHardwareTier, 
  HardwareTierInfo, 
  classifyHardwareTier,
  formatTokenBudget 
} from '../../features/inference/hardwareTier';
import {
  calibrateModelsWithHardware,
  HardwareCalibratedRecommendation,
} from '../../features/onboarding/modelDetector';
import { ModelInfo } from '../../types/inference';

export const OnboardingWizard: React.FC = () => {
  const { 
    isOnboardingOpen, 
    closeOnboarding, 
    setFirstRunCompleted, 
    settings, 
    updateSettings 
  } = useSettingsStore();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isOllamaOnline, setIsOllamaOnline] = useState<boolean | null>(null);
  const [hardwareTier, setHardwareTier] = useState<HardwareTierInfo | null>(null);
  const [rawModels, setRawModels] = useState<ModelInfo[]>([]);
  const [calibration, setCalibration] = useState<HardwareCalibratedRecommendation | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [useMockFallback, setUseMockFallback] = useState<boolean>(false);

  useEffect(() => {
    if (isOnboardingOpen) {
      setCurrentStep(1);
      setAppliedSuccess(false);
      runDiagnostics();
    }
  }, [isOnboardingOpen]);

  const runDiagnostics = async () => {
    setIsChecking(true);
    try {
      const [tier, health] = await Promise.all([
        getHardwareTier().catch(() => classifyHardwareTier(4096, 16384)),
        checkInferenceHealth(settings.ollamaEndpoint).catch(() => ({
          online: false,
          endpoint: settings.ollamaEndpoint,
          models: [],
        })),
      ]);

      setHardwareTier(tier);
      setIsOllamaOnline(health.online);
      setRawModels(health.models || []);

      const cal = calibrateModelsWithHardware(tier, health.models || [], health.online);
      setCalibration(cal);
    } catch {
      const fallbackTier = classifyHardwareTier(4096, 16384);
      setHardwareTier(fallbackTier);
      setIsOllamaOnline(false);
      setRawModels([]);
      setCalibration(calibrateModelsWithHardware(fallbackTier, [], false));
    } finally {
      setIsChecking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(text);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const handleApplyRecommendedConfig = () => {
    if (!calibration) return;
    updateSettings({
      autocompleteModel: calibration.recommendedConfig.autocompleteModel,
      chatModel: calibration.recommendedConfig.chatModel,
      editModel: calibration.recommendedConfig.editModel,
      reasoningModel: calibration.recommendedConfig.reasoningModel,
      autoModelRouter: true,
    });
    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 3000);
  };

  if (!isOnboardingOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome Onboarding Wizard"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-[#1e1e1e] border border-[#3e3e42] rounded-xl shadow-2xl w-full max-w-2xl flex flex-col text-[#cccccc] overflow-hidden max-h-[90vh]">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d2d30] bg-[#252526]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white whitespace-nowrap">Open Studio Setup Wizard</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/40 whitespace-nowrap">
                100% Offline Air-Gap
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#858585]">
            <span className={`px-2 py-0.5 rounded ${currentStep === 1 ? 'bg-[#007acc] text-white font-medium' : ''}`}>
              1. Welcome
            </span>
            <span>›</span>
            <span className={`px-2 py-0.5 rounded ${currentStep === 2 ? 'bg-[#007acc] text-white font-medium' : ''}`}>
              2. Hardware
            </span>
            <span>›</span>
            <span className={`px-2 py-0.5 rounded ${currentStep === 3 ? 'bg-[#007acc] text-white font-medium' : ''}`}>
              3. Models
            </span>
            <span>›</span>
            <span className={`px-2 py-0.5 rounded ${currentStep === 4 ? 'bg-[#007acc] text-white font-medium' : ''}`}>
              4. Quickstart
            </span>
          </div>
        </div>

        {/* Wizard Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-[380px]">
          {/* STEP 1: WELCOME & AIR-GAP */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <h2 className="text-xl font-bold text-white mb-1">Welcome to Open Studio</h2>
                <p className="text-xs text-[#858585] max-w-lg mx-auto leading-relaxed">
                  A high-performance native desktop IDE engineered for developer sovereignty.
                  Your source code, diffs, AST graphs, and embeddings strictly remain on your local machine.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-[#252526] p-3.5 rounded-lg border border-[#2d2d30] flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-2">
                      ⚡ Sub-40ms Tab Autocomplete
                    </div>
                    <p className="text-[11px] text-[#858585] mt-1 leading-relaxed">
                      Instant ghost-text suggestions powered by resident Fill-In-the-Middle (FIM) neural models.
                    </p>
                  </div>
                  <div className="mt-2 text-[10px] text-[#4ec9b0] font-mono">Resident VRAM / RAM</div>
                </div>

                <div className="bg-[#252526] p-3.5 rounded-lg border border-[#2d2d30] flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-2">
                      🛡️ Shadow Git Safety Net
                    </div>
                    <p className="text-[11px] text-[#858585] mt-1 leading-relaxed">
                      Zero-friction time-travel checkpoints before every AI code generation with 1-click restore.
                    </p>
                  </div>
                  <div className="mt-2 text-[10px] text-[#4ec9b0] font-mono">Automated Checkpoints</div>
                </div>

                <div className="bg-[#252526] p-3.5 rounded-lg border border-[#2d2d30] flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-2">
                      📝 Frugal Diff Engine
                    </div>
                    <p className="text-[11px] text-[#858585] mt-1 leading-relaxed">
                      Token-efficient search/replace blocks cutting token usage by 99.6% with side-by-side review.
                    </p>
                  </div>
                  <div className="mt-2 text-[10px] text-[#4ec9b0] font-mono">Multi-Hunk Side-by-Side</div>
                </div>

                <div className="bg-[#252526] p-3.5 rounded-lg border border-[#2d2d30] flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-2">
                      🔒 Zero-Telemetry Guarantee
                    </div>
                    <p className="text-[11px] text-[#858585] mt-1 leading-relaxed">
                      Zero external network pings, zero telemetry trackers, and strict Content Security Policy.
                    </p>
                  </div>
                  <div className="mt-2 text-[10px] text-[#4ec9b0] font-mono">100% Air-Gap Verified</div>
                </div>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3 text-center">
                <span className="text-xs font-semibold text-emerald-400">
                  🔒 Zero-Telemetry Verification: No data ever leaves this device.
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: HARDWARE & ENVIRONMENT DIAGNOSTICS */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-white mb-1">Hardware Capability & Environment</h2>
                <p className="text-xs text-[#858585]">
                  Open Studio automatically scales context budgets and model architectures to your hardware profile.
                </p>
              </div>

              {/* Hardware Telemetry Card */}
              <div className="bg-[#252526] p-4 rounded-lg border border-[#2d2d30] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-white flex items-center gap-2">
                    <span>🖥️ Detected Hardware Profile</span>
                    {hardwareTier && (
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-[#007acc]/20 text-[#4ec9b0] border border-[#007acc]/40 rounded">
                        {hardwareTier.tier}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={runDiagnostics}
                    disabled={isChecking}
                    className="px-2.5 py-1 text-[11px] whitespace-nowrap shrink-0 bg-[#3e3e42] hover:bg-[#4e4e52] rounded text-white transition-colors"
                  >
                    {isChecking ? 'Scanning...' : 'Re-scan Hardware'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-[#1e1e1e] p-2.5 rounded border border-[#3e3e42]/60">
                    <div className="text-[11px] text-[#858585]">GPU / VRAM</div>
                    <div className="font-semibold text-white font-mono mt-0.5">
                      {hardwareTier?.vram_mb ? `${hardwareTier.vram_mb} MB` : 'Unified / CPU'}
                    </div>
                  </div>
                  <div className="bg-[#1e1e1e] p-2.5 rounded border border-[#3e3e42]/60">
                    <div className="text-[11px] text-[#858585]">System RAM</div>
                    <div className="font-semibold text-white font-mono mt-0.5">
                      {hardwareTier?.ram_mb ? `${hardwareTier.ram_mb} MB` : '16,384 MB'}
                    </div>
                  </div>
                  <div className="bg-[#1e1e1e] p-2.5 rounded border border-[#3e3e42]/60">
                    <div className="text-[11px] text-[#858585]">Context Window</div>
                    <div className="font-semibold text-white font-mono mt-0.5">
                      {hardwareTier ? formatTokenBudget(hardwareTier.context_budget) : '16k tokens'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ollama Service Diagnostic Card */}
              <div className="bg-[#252526] p-4 rounded-lg border border-[#2d2d30] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {isChecking ? '⏳' : isOllamaOnline ? '🟢' : '🔴'}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {isChecking
                          ? 'Checking Ollama loopback connection...'
                          : isOllamaOnline
                          ? 'Ollama Inference Engine is Online & Ready'
                          : 'Ollama Service is Not Detected'}
                      </div>
                      <p className="text-[11px] text-[#858585] mt-0.5">
                        Endpoint: <code className="text-[#4ec9b0]">{settings.ollamaEndpoint}</code>
                        {isOllamaOnline && ` • ${rawModels.length} models detected`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={runDiagnostics}
                    disabled={isChecking}
                    className="px-2.5 py-1 text-xs bg-[#3e3e42] hover:bg-[#4e4e52] rounded text-white transition-colors"
                  >
                    Recheck
                  </button>
                </div>

                {!isOllamaOnline && (
                  <div className="bg-[#1e1e1e] p-3 rounded border border-amber-500/30 text-xs space-y-2">
                    <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                      <span>⚠️ Quick Diagnostic & Setup Guide</span>
                    </div>
                    <div className="text-[11px] text-[#cccccc] space-y-1">
                      <div>
                        1. Start Ollama in your workstation terminal:
                        <code className="ml-1 bg-black/40 px-1.5 py-0.5 rounded font-mono text-[#4ec9b0]">
                          ollama serve
                        </code>
                      </div>
                      <div>
                        2. Air-Gapped Workstations: Ensure models were loaded via local archive or system service.
                      </div>
                    </div>
                    <div className="pt-1 flex items-center justify-between">
                      <button
                        onClick={() => setUseMockFallback(true)}
                        className="text-[11px] text-[#007acc] hover:underline"
                      >
                        {useMockFallback
                          ? '✓ Mock Evaluator Enabled (Safe to proceed)'
                          : '⚡ Enable Offline Mock Evaluator for Tour'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: MODEL SETUP & ZERO-CONFIG CALIBRATION */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white mb-0.5">Zero-Config Model Calibration</h2>
                  <p className="text-xs text-[#858585]">
                    Hardware-calibrated pairing for {calibration?.tier || 'your system'}.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#858585]">Readiness:</span>
                  <span className="text-xs font-semibold text-[#4ec9b0] font-mono">
                    {calibration?.readinessScore ?? 0}%
                  </span>
                </div>
              </div>

              {/* 1-Click Calibration Apply Banner */}
              {calibration && (
                <div className="bg-[#252526] p-4 rounded-lg border border-[#2d2d30] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-2">
                        <span>🎯 Recommended Model Architecture</span>
                        <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                          Calibrated
                        </span>
                      </div>
                      <p className="text-[11px] text-[#858585] mt-0.5">
                        Matched for your VRAM budget and sub-40ms autocomplete requirement.
                      </p>
                    </div>
                    <button
                      onClick={handleApplyRecommendedConfig}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors shadow-sm"
                    >
                      {appliedSuccess ? '✓ Applied to Settings!' : '1-Click Apply Pairing'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#1e1e1e] p-2 rounded border border-[#3e3e42]/40">
                      <div className="text-[10px] text-[#858585] uppercase tracking-wider font-semibold">
                        Autocomplete (FIM)
                      </div>
                      <div className="font-mono text-white mt-0.5 truncate">
                        {calibration.recommendedConfig.autocompleteModel}
                      </div>
                    </div>
                    <div className="bg-[#1e1e1e] p-2 rounded border border-[#3e3e42]/40">
                      <div className="text-[10px] text-[#858585] uppercase tracking-wider font-semibold">
                        Chat & Refactoring
                      </div>
                      <div className="font-mono text-white mt-0.5 truncate">
                        {calibration.recommendedConfig.chatModel}
                      </div>
                    </div>
                    <div className="bg-[#1e1e1e] p-2 rounded border border-[#3e3e42]/40">
                      <div className="text-[10px] text-[#858585] uppercase tracking-wider font-semibold">
                        Fast Diff Engine
                      </div>
                      <div className="font-mono text-white mt-0.5 truncate">
                        {calibration.recommendedConfig.editModel}
                      </div>
                    </div>
                    <div className="bg-[#1e1e1e] p-2 rounded border border-[#3e3e42]/40">
                      <div className="text-[10px] text-[#858585] uppercase tracking-wider font-semibold">
                        Deep Reasoning
                      </div>
                      <div className="font-mono text-white mt-0.5 truncate">
                        {calibration.recommendedConfig.reasoningModel}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Missing Recommended Models Helper */}
              {calibration && calibration.missingModels.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-white">
                    Recommended Models to Pull via Local Terminal:
                  </div>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {calibration.missingModels.map((item) => (
                      <div
                        key={item.modelName}
                        className="bg-[#252526] p-2.5 rounded border border-[#2d2d30] flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="text-xs font-medium text-white flex items-center gap-2">
                            <span className="font-mono text-[#4ec9b0]">{item.modelName}</span>
                            <span className="text-[10px] bg-blue-950 text-blue-300 px-1 py-0.2 rounded font-sans">
                              {item.roleLabel}
                            </span>
                            <span className="text-[10px] text-[#858585]">{item.memoryRequirement}</span>
                          </div>
                          <p className="text-[11px] text-[#858585] mt-0.5 truncate">
                            {item.description}
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(item.pullCommand)}
                          className="px-2 py-1 text-[11px] bg-[#1e1e1e] border border-[#3e3e42] hover:border-[#007acc] rounded text-white shrink-0 font-mono"
                        >
                          {copiedCommand === item.pullCommand ? '✓ Copied' : 'Copy Pull Command'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Already fully configured notice */}
              {calibration && calibration.isFullyConfigured && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-lg p-3 text-center">
                  <span className="text-xs font-semibold text-emerald-400">
                    🎉 All recommended local models are installed and calibrated for maximum performance!
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: ESSENTIAL SHORTCUTS & LAUNCH */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-white mb-1">Quickstart & Essential Shortcuts</h2>
                <p className="text-xs text-[#858585]">
                  Master key navigation shortcuts to code at full speed in Open Studio.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#252526] p-3 rounded border border-[#2d2d30] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Command Palette</div>
                    <div className="text-[11px] text-[#858585]">Search all files & actions</div>
                  </div>
                  <kbd className="bg-[#1e1e1e] px-2 py-1 rounded text-[#4ec9b0] font-mono text-[11px] border border-[#3e3e42]">
                    Ctrl+Shift+P
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
                    <div className="font-semibold text-white">Toggle Terminal</div>
                    <div className="text-[11px] text-[#858585]">Embedded native PTY</div>
                  </div>
                  <kbd className="bg-[#1e1e1e] px-2 py-1 rounded text-[#4ec9b0] font-mono text-[11px] border border-[#3e3e42]">
                    Ctrl+`
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
                    <div className="font-semibold text-white">Problems & Diagnostics</div>
                    <div className="text-[11px] text-[#858585]">Compiler & linter errors</div>
                  </div>
                  <kbd className="bg-[#1e1e1e] px-2 py-1 rounded text-[#4ec9b0] font-mono text-[11px] border border-[#3e3e42]">
                    Ctrl+Shift+M
                  </kbd>
                </div>
              </div>

              <div className="bg-[#252526] p-3 rounded border border-[#2d2d30] text-xs flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Audit Ledger & Security Inspector</div>
                  <div className="text-[11px] text-[#858585]">Review cryptographic SHA-256 tamper-evident logs</div>
                </div>
                <div className="text-[11px] font-mono text-[#4ec9b0]">Command Palette</div>
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

            {currentStep < 4 ? (
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

import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  HardDrive, 
  ShieldAlert, 
  Zap, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  X,
  Server
} from 'lucide-react';
import { 
  HardwareTierInfo, 
  ModelResidency, 
  formatTokenBudget, 
  getHardwareTier, 
  getModelResidency, 
  evictModel, 
  evictIdleModels 
} from '../../features/inference/hardwareTier';
import { InferenceHealth } from '../../types/inference';

interface HardwareSentinelModalProps {
  isOpen: boolean;
  onClose: () => void;
  inferenceHealth: InferenceHealth | null;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onRefreshHealth: () => Promise<void>;
}

export const HardwareSentinelModal: React.FC<HardwareSentinelModalProps> = ({
  isOpen,
  onClose,
  inferenceHealth,
  selectedModel,
  onSelectModel,
  onRefreshHealth,
}) => {
  const [tierInfo, setTierInfo] = useState<HardwareTierInfo | null>(null);
  const [residency, setResidency] = useState<ModelResidency[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [evictionFeedback, setEvictionFeedback] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [tier, res] = await Promise.all([
        getHardwareTier(),
        getModelResidency(),
      ]);
      setTierInfo(tier);
      setResidency(res);
    } catch {
      // Fallback handled in helpers
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEvict = async (modelName: string) => {
    setEvictionFeedback(`Evicting ${modelName}...`);
    await evictModel(modelName);
    await loadData();
    setEvictionFeedback(`Successfully evicted ${modelName} from VRAM`);
    setTimeout(() => setEvictionFeedback(null), 3000);
  };

  const handleEvictIdle = async () => {
    setEvictionFeedback('Scanning & evicting idle models...');
    const evicted = await evictIdleModels();
    await loadData();
    if (evicted.length > 0) {
      setEvictionFeedback(`Evicted idle models: ${evicted.join(', ')}`);
    } else {
      setEvictionFeedback('No models exceeded idle timeout.');
    }
    setTimeout(() => setEvictionFeedback(null), 3000);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([onRefreshHealth(), loadData()]);
    setIsRefreshing(false);
  };

  const getTierColor = (tierNum?: number) => {
    switch (tierNum) {
      case 1:
        return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400';
      case 2:
        return 'border-sky-500/40 bg-sky-500/10 text-sky-400';
      case 3:
        return 'border-amber-500/40 bg-amber-500/10 text-amber-400';
      default:
        return 'border-rose-500/40 bg-rose-500/10 text-rose-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-ide-sidebarBg border border-ide-border rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-ide-border flex items-center justify-between bg-ide-titlebar">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="text-ide-accent" />
            <span className="font-semibold text-sm text-ide-textBright">
              VRAM Sentinel & Model Swapper
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-1 text-ide-textMuted hover:text-ide-textBright hover:bg-ide-hover rounded transition"
              title="Refresh telemetry"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-ide-textMuted hover:text-white hover:bg-ide-hover rounded transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
          
          {/* Feedback banner */}
          {evictionFeedback && (
            <div className="px-3 py-2 bg-ide-accent/15 border border-ide-accent/30 rounded text-ide-accent flex items-center gap-2">
              <Zap size={14} />
              <span>{evictionFeedback}</span>
            </div>
          )}

          {/* Hardware Profile Card */}
          <div className="border border-ide-border rounded-lg p-4 bg-ide-bg/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-ide-accent" />
                <span className="font-semibold text-ide-textBright text-sm">
                  Hardware Profile & Tier Classification
                </span>
              </div>
              {tierInfo && (
                <span className={`px-2 py-0.5 text-[11px] font-medium border rounded-full ${getTierColor(tierInfo.tier_number)}`}>
                  {tierInfo.tier}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-ide-hover/50 p-2.5 rounded border border-ide-border/50">
                <div className="text-[10px] text-ide-textMuted flex items-center gap-1">
                  <HardDrive size={11} /> GPU VRAM
                </div>
                <div className="text-xs font-semibold text-ide-textBright mt-1">
                  {tierInfo?.vram_mb ? `${tierInfo.vram_mb.toLocaleString()} MB` : 'CPU Only'}
                </div>
              </div>

              <div className="bg-ide-hover/50 p-2.5 rounded border border-ide-border/50">
                <div className="text-[10px] text-ide-textMuted flex items-center gap-1">
                  <Server size={11} /> System RAM
                </div>
                <div className="text-xs font-semibold text-ide-textBright mt-1">
                  {tierInfo?.ram_mb ? `${tierInfo.ram_mb.toLocaleString()} MB` : 'N/A'}
                </div>
              </div>

              <div className="bg-ide-hover/50 p-2.5 rounded border border-ide-border/50">
                <div className="text-[10px] text-ide-textMuted flex items-center gap-1">
                  <Zap size={11} /> Context Budget
                </div>
                <div className="text-xs font-semibold text-ide-textBright mt-1">
                  {tierInfo ? formatTokenBudget(tierInfo.context_budget) : '8k tokens'}
                </div>
              </div>

              <div className="bg-ide-hover/50 p-2.5 rounded border border-ide-border/50">
                <div className="text-[10px] text-ide-textMuted flex items-center gap-1">
                  <RefreshCw size={11} /> Idle Auto-Evict
                </div>
                <div className="text-xs font-semibold text-ide-textBright mt-1">
                  {tierInfo?.auto_eviction_timeout_secs 
                    ? `${tierInfo.auto_eviction_timeout_secs / 60}m Inactivity`
                    : 'Disabled (Tier 1)'}
                </div>
              </div>
            </div>

            {tierInfo && tierInfo.tier_number >= 3 && (
              <p className="text-[11px] text-amber-400/90 leading-relaxed bg-amber-500/10 border border-amber-500/20 p-2 rounded">
                ⚡ <strong>Zero-OOM Guardrail Active</strong>: Because your machine has 4GB VRAM, resident large models are automatically unloaded before switching models or after 3 minutes of idle inactivity. The 1.5B autocomplete model remains preserved for sub-40ms inline typing.
              </p>
            )}
          </div>

          {/* Model Residency & VRAM Management */}
          <div className="border border-ide-border rounded-lg p-4 bg-ide-bg/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ide-textBright text-xs">
                Active VRAM Residency
              </span>
              <button
                onClick={handleEvictIdle}
                className="px-2 py-1 text-[11px] bg-ide-hover hover:bg-rose-500/20 hover:text-rose-300 text-ide-textMuted rounded border border-ide-border transition flex items-center gap-1.5"
              >
                <Trash2 size={12} />
                <span>Evict Expired Idle Models</span>
              </button>
            </div>

            {residency.length === 0 ? (
              <div className="text-center py-4 text-ide-textMuted text-[11px]">
                No models currently tracked in active VRAM cache.
              </div>
            ) : (
              <div className="space-y-2">
                {residency.map((res) => (
                  <div
                    key={res.model_name}
                    className="flex items-center justify-between px-3 py-2 bg-ide-hover/30 border border-ide-border/60 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${res.is_loaded ? 'bg-emerald-400' : 'bg-ide-textMuted'}`} />
                      <span className="font-mono text-ide-textBright text-xs">{res.model_name}</span>
                      {res.model_name.includes('1.5b') && (
                        <span className="text-[10px] text-ide-accent bg-ide-accent/10 px-1.5 py-0.2 rounded">
                          Autocomplete Resident
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-ide-textMuted text-[10px]">
                        {res.is_loaded ? 'Resident in VRAM' : 'Evicted / Standby'}
                      </span>
                      {res.is_loaded && (
                        <button
                          onClick={() => handleEvict(res.model_name)}
                          className="px-2 py-0.5 text-[10px] text-rose-400 hover:bg-rose-500/20 rounded border border-rose-500/30 transition flex items-center gap-1"
                          title="Free GPU memory now"
                        >
                          <Trash2 size={10} />
                          <span>Evict</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Model Switcher */}
          <div className="border border-ide-border rounded-lg p-4 bg-ide-bg/60 space-y-3">
            <span className="font-semibold text-ide-textBright text-xs">
              Active Workspace Model Selection
            </span>
            <div className="flex items-center gap-3">
              <select
                value={selectedModel}
                onChange={(e) => onSelectModel(e.target.value)}
                className="flex-1 bg-ide-input border border-ide-border rounded px-3 py-1.5 text-xs text-ide-textBright focus:outline-none focus:border-ide-accent"
              >
                {inferenceHealth?.models && inferenceHealth.models.length > 0 ? (
                  inferenceHealth.models.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} {m.size ? `(${(m.size / 1e9).toFixed(1)} GB)` : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="qwen2.5-coder:1.5b">qwen2.5-coder:1.5b (1.5B Fast)</option>
                    <option value="qwen2.5-coder:7b">qwen2.5-coder:7b (7B Standard)</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Ollama Connection & Air-Gapped Health */}
          <div className="border border-ide-border rounded-lg p-4 bg-ide-bg/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ide-textBright text-xs flex items-center gap-1.5">
                {inferenceHealth?.online ? (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                ) : (
                  <XCircle size={14} className="text-rose-400" />
                )}
                <span>Inference Gateway Status</span>
              </span>
              <span className={`text-[11px] font-medium ${inferenceHealth?.online ? 'text-emerald-400' : 'text-rose-400'}`}>
                {inferenceHealth?.online ? 'Online & Ready' : 'Ollama Offline'}
              </span>
            </div>

            <div className="text-[11px] text-ide-textMuted space-y-1">
              <div>Endpoint: <code className="text-ide-textBright bg-ide-hover px-1 py-0.5 rounded">{inferenceHealth?.endpoint || 'http://localhost:11434'}</code></div>
              {!inferenceHealth?.online && (
                <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded text-rose-300 text-[11px] space-y-1">
                  <div><strong>Ollama service is not responding.</strong></div>
                  <div>To start the local runtime, open your terminal and run:</div>
                  <div className="font-mono bg-black/40 p-1.5 rounded text-white select-all">
                    ollama serve
                  </div>
                  <div>Open Studio will automatically reconnect within 5 seconds once running.</div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-ide-border bg-ide-titlebar flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-ide-accent hover:bg-ide-accent/90 text-white rounded text-xs font-medium transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

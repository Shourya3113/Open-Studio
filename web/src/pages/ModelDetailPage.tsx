import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Download, 
  CheckCircle, 
  ShieldCheck, 
  Terminal, 
  Copy, 
  Check, 
  HardDrive,
  Sparkles
} from 'lucide-react';
import { getModelById } from '../data/goldenModels';

interface ModelDetailPageProps {
  modelId: string;
  navigate: (path: string) => void;
}

export const ModelDetailPage: React.FC<ModelDetailPageProps> = ({ modelId, navigate }) => {
  const model = getModelById(modelId);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!model) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Model Not Found</h2>
        <p className="text-xs text-[#858585]">
          Could not locate model with ID: <code className="text-[#4ec9b0]">{modelId}</code>
        </p>
        <button
          onClick={() => navigate('/models')}
          className="px-4 py-2 text-xs bg-[#007acc] text-white rounded-lg"
        >
          Back to Model Hub
        </button>
      </div>
    );
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back Link */}
      <button
        onClick={() => navigate('/models')}
        className="inline-flex items-center gap-1.5 text-xs text-[#858585] hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Model Catalog</span>
      </button>

      {/* Model Header */}
      <div className="bg-[#1a1a1e] rounded-2xl border border-[#2a2a30] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {model.name}
              </h1>
              {model.verifiedBadge && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                  <CheckCircle className="w-3 h-3" />
                  IDE-Certified
                </span>
              )}
            </div>
            <p className="text-xs text-[#858585]">
              Published by <span className="text-white font-medium">{model.author}</span> • License:{' '}
              <span className="text-[#cccccc]">{model.license}</span> • Base Architecture:{' '}
              <span className="text-[#cccccc]">{model.baseArchitecture}</span>
            </p>
            <p className="text-sm text-[#cccccc] leading-relaxed max-w-2xl pt-1">
              {model.description}
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <a
              href={`openstudio://models/install?id=${encodeURIComponent(model.id)}`}
              className="px-5 py-2.5 text-xs font-semibold bg-[#007acc] hover:bg-[#0062a3] text-white rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
            >
              <Download className="w-4 h-4" />
              <span>1-Click Install in Open Studio</span>
            </a>

            <a
              href={model.r2DownloadUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 text-xs font-semibold bg-[#121214] border border-[#2a2a30] hover:border-[#007acc] text-[#858585] hover:text-white rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <HardDrive className="w-3.5 h-3.5 text-[#4ec9b0]" />
              <span>Direct GGUF Download (R2)</span>
            </a>
          </div>
        </div>

        {/* Spec Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-[#121214] p-3 rounded-xl border border-[#2a2a30]/60">
            <span className="text-[10px] text-[#858585] uppercase tracking-wider block">Parameters</span>
            <span className="text-sm font-bold font-mono text-white mt-0.5 block">{model.parameterCount}</span>
          </div>

          <div className="bg-[#121214] p-3 rounded-xl border border-[#2a2a30]/60">
            <span className="text-[10px] text-[#858585] uppercase tracking-wider block">Quantization</span>
            <span className="text-sm font-bold font-mono text-white mt-0.5 block">{model.quantization}</span>
          </div>

          <div className="bg-[#121214] p-3 rounded-xl border border-[#2a2a30]/60">
            <span className="text-[10px] text-[#858585] uppercase tracking-wider block">File Size</span>
            <span className="text-sm font-bold font-mono text-white mt-0.5 block">{model.fileSizeFormatted}</span>
          </div>

          <div className="bg-[#121214] p-3 rounded-xl border border-[#2a2a30]/60">
            <span className="text-[10px] text-[#858585] uppercase tracking-wider block">Target Hardware</span>
            <span className="text-xs font-bold text-emerald-400 mt-0.5 block truncate">
              {model.recommendedTier}
            </span>
          </div>
        </div>
      </div>

      {/* Verified Benchmark Scorecard */}
      <div className="bg-[#1a1a1e] rounded-2xl border border-[#2a2a30] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#4ec9b0]" />
            <h2 className="text-sm font-bold text-white">Verified IDE Operational Benchmarks</h2>
          </div>
          <span className="text-[10px] text-[#858585] font-mono">
            {model.benchmarks.evalCount.toLocaleString()} Automated Synthesized Runs
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {model.benchmarks.fimLatencyMs && (
            <div className="bg-[#121214] p-4 rounded-xl border border-[#2a2a30]/60 space-y-1">
              <span className="text-[11px] text-[#858585]">FIM Autocomplete Latency</span>
              <div className="text-2xl font-bold font-mono text-white">
                {model.benchmarks.fimLatencyMs} <span className="text-xs font-normal text-[#858585]">ms</span>
              </div>
              <span className="text-[10px] text-emerald-400">Sub-40ms keystroke threshold verified</span>
            </div>
          )}

          <div className="bg-[#121214] p-4 rounded-xl border border-[#2a2a30]/60 space-y-1">
            <span className="text-[11px] text-[#858585]">Surgical Diff Precision</span>
            <div className="text-2xl font-bold font-mono text-white">
              {model.benchmarks.patchPrecisionPct}%
            </div>
            <span className="text-[10px] text-emerald-400">Multi-hunk zero-syntax-corruption</span>
          </div>

          <div className="bg-[#121214] p-4 rounded-xl border border-[#2a2a30]/60 space-y-1">
            <span className="text-[11px] text-[#858585]">Generation Throughput</span>
            <div className="text-2xl font-bold font-mono text-white">
              {model.benchmarks.tokenThroughputTps} <span className="text-xs font-normal text-[#858585]">tok/s</span>
            </div>
            <span className="text-[10px] text-[#4ec9b0]">Evaluated on RTX 4070 (12GB)</span>
          </div>
        </div>
      </div>

      {/* CLI & Integrity Checksums */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CLI Commands */}
        <div className="bg-[#1a1a1e] rounded-2xl border border-[#2a2a30] p-6 space-y-3">
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#007acc]" />
            <span>Terminal CLI Pull Commands</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-[#858585]">Open Studio CLI:</span>
              <div className="bg-[#121214] p-2.5 rounded-lg border border-[#2a2a30] flex items-center justify-between font-mono text-[#4ec9b0]">
                <span>{model.pullCommand}</span>
                <button
                  onClick={() => copyToClipboard(model.pullCommand, 'cli')}
                  className="p-1 hover:text-white text-[#858585]"
                >
                  {copiedKey === 'cli' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-[#858585]">Ollama Direct Pull:</span>
              <div className="bg-[#121214] p-2.5 rounded-lg border border-[#2a2a30] flex items-center justify-between font-mono text-[#4ec9b0]">
                <span>ollama pull {model.id.split('/')[1] || model.id}</span>
                <button
                  onClick={() => copyToClipboard(`ollama pull ${model.id.split('/')[1] || model.id}`, 'ollama')}
                  className="p-1 hover:text-white text-[#858585]"
                >
                  {copiedKey === 'ollama' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cryptographic Attestation */}
        <div className="bg-[#1a1a1e] rounded-2xl border border-[#2a2a30] p-6 space-y-3">
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cryptographic Weight Attestation</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-[#858585]">SHA-256 Digest:</span>
              <div className="bg-[#121214] p-2 rounded-lg border border-[#2a2a30] font-mono text-[11px] text-[#cccccc] break-all flex items-center justify-between">
                <span>{model.sha256}</span>
                <button
                  onClick={() => copyToClipboard(model.sha256, 'sha')}
                  className="ml-2 p-1 hover:text-white text-[#858585] shrink-0"
                >
                  {copiedKey === 'sha' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-[#858585]">
              <span>Storage Origin: <strong className="text-white">Cloudflare R2</strong></span>
              <span>Egress Fee: <strong className="text-emerald-400">$0.00</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

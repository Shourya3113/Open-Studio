import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Search, 
  SlidersHorizontal, 
  Download, 
  CheckCircle, 
  Zap, 
  Cpu, 
  Sparkles, 
  Upload, 
  HardDrive,
  ExternalLink,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { 
  GOLDEN_MODELS, 
  queryModels, 
  HubModel, 
  HardwareTierName, 
  ModelRole 
} from '../data/goldenModels';

interface ModelHubPageProps {
  navigate: (path: string) => void;
}

export const ModelHubPage: React.FC<ModelHubPageProps> = ({ navigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<HardwareTierName | 'all'>('all');
  const [selectedRole, setSelectedRole] = useState<ModelRole | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredModels = useMemo(() => {
    return queryModels({
      search: searchTerm,
      tier: selectedTier,
      role: selectedRole,
    });
  }, [searchTerm, selectedTier, selectedRole]);

  const copyCommand = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#2a2a30]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🌐</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Open Studio Model Hub
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/40 font-mono">
              R2 Zero-Egress
            </span>
          </div>
          <p className="text-xs text-[#858585] mt-1">
            Curated, benchmark-certified open weights and community fine-tunes. 1-click installable directly into Open Studio.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/models/upload')}
            className="px-3.5 py-2 text-xs font-semibold bg-[#1a1a1e] border border-[#2a2a30] hover:border-[#007acc] text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Upload className="w-3.5 h-3.5 text-[#4ec9b0]" />
            <span>Publish Fine-Tune</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        {/* Search Input Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#858585]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search models by name, architecture (Qwen2.5, DeepSeek, Codestral), role, or specialist domain..."
            className="w-full bg-[#1a1a1e] border border-[#2a2a30] focus:border-[#007acc] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#858585] outline-none transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          {/* Hardware Tier Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[#858585] text-[11px] mr-1 font-medium">Hardware:</span>
            {[
              { id: 'all', label: 'All Tiers' },
              { id: 'Tier 1: Heavyweight', label: 'Tier 1 (24GB+)' },
              { id: 'Tier 2: Standard', label: 'Tier 2 (8GB–16GB)' },
              { id: 'Tier 3: Budget / Constrained', label: 'Tier 3 (4GB–6GB)' },
              { id: 'Tier 4: CPU Fallback', label: 'Tier 4 (CPU)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTier(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-colors text-[11px] ${
                  selectedTier === tab.id
                    ? 'bg-[#007acc] text-white font-medium shadow-sm'
                    : 'bg-[#1a1a1e] text-[#858585] hover:text-white border border-[#2a2a30]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Role Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[#858585] text-[11px] mr-1 font-medium">Role:</span>
            {[
              { id: 'all', label: 'All Roles' },
              { id: 'autocomplete', label: 'Autocomplete (FIM)' },
              { id: 'chat', label: 'Chat' },
              { id: 'edit', label: 'Surgical Diff' },
              { id: 'reasoning', label: 'Reasoning' },
              { id: 'specialist', label: 'Domain Specialist' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedRole(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-colors text-[11px] ${
                  selectedRole === tab.id
                    ? 'bg-[#4ec9b0] text-black font-semibold'
                    : 'bg-[#1a1a1e] text-[#858585] hover:text-white border border-[#2a2a30]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModels.map((model) => (
          <div
            key={model.id}
            className="bg-[#1a1a1e] rounded-2xl border border-[#2a2a30] hover:border-[#007acc]/60 transition-all p-5 flex flex-col justify-between space-y-4 shadow-lg hover:shadow-blue-500/5 group"
          >
            <div className="space-y-3">
              {/* Header: Name, Param, Verified */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span 
                      onClick={() => navigate(`/models/${model.id}`)}
                      className="font-bold text-sm text-white group-hover:text-[#4ec9b0] transition-colors cursor-pointer"
                    >
                      {model.name}
                    </span>
                    {model.verifiedBadge && (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" title="IDE Verified Benchmark" />
                    )}
                  </div>
                  <div className="text-[11px] text-[#858585] mt-0.5">
                    By <span className="text-[#cccccc]">{model.author}</span> • {model.license}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#121214] text-[#4ec9b0] border border-[#2a2a30]">
                    {model.parameterCount}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#121214] text-[#858585] border border-[#2a2a30]">
                    {model.quantization}
                  </span>
                </div>
              </div>

              {/* Tagline */}
              <p className="text-xs text-[#858585] line-clamp-2 leading-relaxed">
                {model.tagline}
              </p>

              {/* Benchmark Highlights */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="bg-[#121214] p-2 rounded-lg border border-[#2a2a30]/60">
                  <span className="text-[#858585] text-[10px] block">
                    {model.benchmarks.fimLatencyMs ? 'FIM Latency' : 'Diff Precision'}
                  </span>
                  <span className="font-mono font-bold text-white mt-0.5 block">
                    {model.benchmarks.fimLatencyMs ? `${model.benchmarks.fimLatencyMs}ms` : `${model.benchmarks.patchPrecisionPct}%`}
                  </span>
                </div>

                <div className="bg-[#121214] p-2 rounded-lg border border-[#2a2a30]/60">
                  <span className="text-[#858585] text-[10px] block">Target VRAM</span>
                  <span className="font-mono font-bold text-white mt-0.5 block truncate">
                    {model.memoryRequirement}
                  </span>
                </div>
              </div>

              {/* Hardware Tier Tag */}
              <div className="flex items-center justify-between text-[10px] pt-1 text-[#858585]">
                <span className="font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded">
                  {model.recommendedTier.split(':')[0]} Recommended
                </span>
                <span className="font-mono">{model.fileSizeFormatted}</span>
              </div>
            </div>

            {/* Card Action Footer */}
            <div className="pt-3 border-t border-[#2a2a30] flex items-center gap-2">
              <a
                href={`openstudio://models/install?id=${encodeURIComponent(model.id)}`}
                className="flex-1 py-2 text-xs font-semibold bg-[#007acc] hover:bg-[#0062a3] text-white rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>1-Click Install</span>
              </a>

              <button
                onClick={() => copyCommand(model.pullCommand, model.id)}
                className="px-2.5 py-2 text-xs font-mono bg-[#121214] border border-[#2a2a30] hover:border-[#007acc] text-[#858585] hover:text-white rounded-lg transition-colors"
                title="Copy Open Studio CLI Command"
              >
                {copiedId === model.id ? '✓' : 'CLI'}
              </button>

              <button
                onClick={() => navigate(`/models/${model.id}`)}
                className="px-2.5 py-2 text-xs bg-[#121214] border border-[#2a2a30] hover:border-white text-[#858585] hover:text-white rounded-lg transition-colors"
                title="View Full Model Specs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <div className="text-center py-16 space-y-3 bg-[#1a1a1e] rounded-2xl border border-[#2a2a30]">
          <div className="text-3xl">🔍</div>
          <h3 className="text-sm font-bold text-white">No Models Found</h3>
          <p className="text-xs text-[#858585]">
            No models matched your search query or hardware tier filters.
          </p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedTier('all'); setSelectedRole('all'); }}
            className="px-3 py-1.5 text-xs bg-[#007acc] text-white rounded-lg hover:bg-[#0062a3]"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};

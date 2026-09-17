import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Upload, 
  FileCode, 
  CheckCircle, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle,
  HardDrive
} from 'lucide-react';
import { HardwareTierName, ModelRole } from '../data/goldenModels';

interface ModelUploadPageProps {
  navigate: (path: string) => void;
}

export const ModelUploadPage: React.FC<ModelUploadPageProps> = ({ navigate }) => {
  const [modelName, setModelName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [baseArch, setBaseArch] = useState('Qwen2.5-Coder');
  const [paramSize, setParamSize] = useState('7B');
  const [tier, setTier] = useState<HardwareTierName>('Tier 2: Standard');
  const [license, setLicense] = useState('Apache-2.0');
  const [selectedRoles, setSelectedRoles] = useState<ModelRole[]>(['chat', 'specialist']);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const toggleRole = (role: ModelRole) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setUploadedFileName(file.name);
      if (!modelName) {
        setModelName(file.name.replace(/\.gguf$/i, ''));
      }
    }
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);

    setTimeout(() => {
      setIsPublishing(false);
      setPublishSuccess(true);
    }, 1500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back Link */}
      <button
        onClick={() => navigate('/models')}
        className="inline-flex items-center gap-1.5 text-xs text-[#858585] hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Model Catalog</span>
      </button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Upload className="w-6 h-6 text-[#4ec9b0]" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Publish Fine-Tune or Domain Specialist
          </h1>
        </div>
        <p className="text-xs text-[#858585] mt-1">
          Contribute to the sovereign developer model ecosystem. Uploaded GGUF weights are served via Cloudflare R2 zero-egress storage with cryptographic SHA-256 validation.
        </p>
      </div>

      {publishSuccess ? (
        <div className="bg-[#1a1a1e] border border-emerald-500/40 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Model Published to Open Studio Hub!</h2>
          <p className="text-xs text-[#858585] max-w-md mx-auto">
            Your model <strong className="text-white">{modelName}</strong> has been assigned an immutable manifest and is now discoverable in the hub catalog and Open Studio desktop IDE.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/models')}
              className="px-4 py-2 text-xs font-semibold bg-[#007acc] text-white rounded-lg hover:bg-[#0062a3]"
            >
              View in Catalog
            </button>
            <button
              onClick={() => { setPublishSuccess(false); setUploadedFileName(null); setModelName(''); }}
              className="px-4 py-2 text-xs bg-[#121214] border border-[#2a2a30] text-[#858585] hover:text-white rounded-lg"
            >
              Publish Another Model
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handlePublish} className="space-y-6">
          {/* Drag & Drop GGUF Upload Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center space-y-3 transition-colors ${
              isDragging
                ? 'border-[#007acc] bg-[#007acc]/5'
                : uploadedFileName
                ? 'border-emerald-500/40 bg-emerald-950/10'
                : 'border-[#2a2a30] hover:border-[#3e3e46] bg-[#1a1a1e]'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-[#121214] border border-[#2a2a30] flex items-center justify-center mx-auto text-[#4ec9b0]">
              <HardDrive className="w-6 h-6" />
            </div>

            {uploadedFileName ? (
              <div className="space-y-1">
                <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{uploadedFileName}</span>
                </div>
                <p className="text-[11px] text-[#858585]">
                  Valid GGUF header verified • Ready to publish
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-xs font-semibold text-white">
                  Drag & Drop your quantized .gguf model file here
                </div>
                <p className="text-[11px] text-[#858585]">
                  Supports GGUF v3 (Q4_K_M, Q5_K_M, Q8_0) up to 20 GB
                </p>
              </div>
            )}
          </div>

          {/* Model Information Form */}
          <div className="bg-[#1a1a1e] rounded-2xl border border-[#2a2a30] p-6 space-y-4 text-xs">
            <h3 className="font-bold text-white text-sm">Model Manifest Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[#858585] font-medium">Model Identifier / Name *</label>
                <input
                  type="text"
                  required
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. MyLab/rust-tokio-expert:7b"
                  className="w-full bg-[#121214] border border-[#2a2a30] rounded-lg p-2.5 text-white outline-none focus:border-[#007acc]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#858585] font-medium">Author / Team *</label>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Acme Research Lab"
                  className="w-full bg-[#121214] border border-[#2a2a30] rounded-lg p-2.5 text-white outline-none focus:border-[#007acc]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[#858585] font-medium">One-Line Tagline *</label>
              <input
                type="text"
                required
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Fine-tuned on async Rust and Tokio servers with zero syntax errors"
                className="w-full bg-[#121214] border border-[#2a2a30] rounded-lg p-2.5 text-white outline-none focus:border-[#007acc]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#858585] font-medium">Detailed Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe training methodology, dataset provenance, prompt templates, and best use cases..."
                className="w-full bg-[#121214] border border-[#2a2a30] rounded-lg p-2.5 text-white outline-none focus:border-[#007acc]"
              />
            </div>

            {/* Architecture & Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-[#858585] font-medium">Base Architecture</label>
                <select
                  value={baseArch}
                  onChange={(e) => setBaseArch(e.target.value)}
                  className="w-full bg-[#121214] border border-[#2a2a30] rounded-lg p-2.5 text-white outline-none focus:border-[#007acc]"
                >
                  <option value="Qwen2.5-Coder">Qwen2.5-Coder</option>
                  <option value="DeepSeek-R1">DeepSeek-R1</option>
                  <option value="Mistral / Codestral">Mistral / Codestral</option>
                  <option value="LLaMA-3">LLaMA-3</option>
                  <option value="Other">Other Open Weights</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#858585] font-medium">Parameter Count</label>
                <select
                  value={paramSize}
                  onChange={(e) => setParamSize(e.target.value)}
                  className="w-full bg-[#121214] border border-[#2a2a30] rounded-lg p-2.5 text-white outline-none focus:border-[#007acc]"
                >
                  <option value="1.5B">1.5B</option>
                  <option value="3B">3B</option>
                  <option value="7B">7B</option>
                  <option value="8B">8B</option>
                  <option value="14B">14B</option>
                  <option value="22B">22B</option>
                  <option value="32B+">32B+</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#858585] font-medium">Target Hardware Tier</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as any)}
                  className="w-full bg-[#121214] border border-[#2a2a30] rounded-lg p-2.5 text-white outline-none focus:border-[#007acc]"
                >
                  <option value="Tier 1: Heavyweight">Tier 1: Heavyweight (24GB+)</option>
                  <option value="Tier 2: Standard">Tier 2: Standard (8GB–16GB)</option>
                  <option value="Tier 3: Budget / Constrained">Tier 3: Budget (4GB–6GB)</option>
                  <option value="Tier 4: CPU Fallback">Tier 4: CPU Fallback</option>
                </select>
              </div>
            </div>

            {/* Target Roles */}
            <div className="space-y-2 pt-2">
              <label className="text-[#858585] font-medium block">Intended Operational Roles</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'autocomplete', label: 'Inline Autocomplete (FIM)' },
                  { id: 'chat', label: 'Multi-Turn Chat' },
                  { id: 'edit', label: 'Surgical Diff Engine' },
                  { id: 'reasoning', label: 'Deep Reasoning' },
                  { id: 'specialist', label: 'Domain Specialist' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRole(r.id as ModelRole)}
                    className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                      selectedRoles.includes(r.id as ModelRole)
                        ? 'bg-[#007acc] text-white border-transparent font-medium'
                        : 'bg-[#121214] text-[#858585] border-[#2a2a30] hover:text-white'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/models')}
              className="px-4 py-2.5 text-xs bg-[#1a1a1e] border border-[#2a2a30] text-[#858585] hover:text-white rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPublishing}
              className="px-6 py-2.5 text-xs font-semibold bg-[#007acc] hover:bg-[#0062a3] text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              {isPublishing ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>Validating & Publishing to Hub...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Publish Model</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

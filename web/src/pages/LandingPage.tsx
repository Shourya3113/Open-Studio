import React, { useState } from 'react';
import { 
  Download, 
  Terminal, 
  Zap, 
  ShieldCheck, 
  GitBranch, 
  Sliders, 
  Box, 
  Cpu, 
  ChevronRight, 
  Check, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

interface LandingPageProps {
  navigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'rust' | 'ts'>('rust');
  const [activeTier, setActiveTier] = useState<number>(2);

  return (
    <div className="flex flex-col items-center w-full">
      {/* 1. HERO SECTION */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center flex flex-col items-center">
        {/* Release Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a1a1e] border border-[#2a2a30] text-xs text-[#858585] mb-6 hover:border-[#007acc] transition-colors cursor-pointer" onClick={() => navigate('/models')}>
          <span className="w-2 h-2 rounded-full bg-[#4ec9b0] animate-pulse" />
          <span className="text-white font-medium">Open Studio v1.0.0 GA & Model Hub</span>
          <span>•</span>
          <span className="text-[#007acc] flex items-center gap-1 font-medium">
            Explore Open Weights <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl leading-tight sm:leading-none">
          The Sovereign AI IDE. <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#007acc] via-[#4ec9b0] to-emerald-400">
            Your Code. Your Weights. Zero Telemetry.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-[#858585] max-w-2xl leading-relaxed">
          A high-performance native desktop IDE engineered for developer privacy.
          Powered by sub-40ms resident FIM models, surgical frugal diffs, and our own
          sovereign model hub with zero-egress community distribution.
        </p>

        {/* Hero Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <a
            href="#download"
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold bg-[#007acc] hover:bg-[#0062a3] text-white rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          >
            <Download className="w-4 h-4" />
            <span>Download Open Studio v1.0.0</span>
          </a>

          <button
            onClick={() => navigate('/models')}
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold bg-[#1a1a1e] hover:bg-[#25252a] text-white border border-[#2a2a30] rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <Box className="w-4 h-4 text-[#4ec9b0]" />
            <span>Browse Sovereign Model Hub</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-[#858585]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Offline Air-Gap Verified</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[#dcdcaa]" />
            <span>Sub-40ms Resident Autocomplete</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#4ec9b0]" />
            <span>99.6% Token Savings via Frugal Diff</span>
          </div>
        </div>

        {/* Interactive IDE Preview Frame */}
        <div className="mt-12 w-full max-w-5xl rounded-2xl border border-[#2a2a30] bg-[#1a1a1e] shadow-2xl overflow-hidden text-left">
          {/* Editor Header */}
          <div className="px-4 py-2.5 bg-[#121214] border-b border-[#2a2a30] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <div className="ml-4 flex items-center gap-2">
                <button
                  onClick={() => setActiveCodeTab('rust')}
                  className={`px-3 py-1 text-xs rounded-md font-mono transition-colors ${
                    activeCodeTab === 'rust' ? 'bg-[#1a1a1e] text-white border border-[#2a2a30]' : 'text-[#858585] hover:text-white'
                  }`}
                >
                  main.rs
                </button>
                <button
                  onClick={() => setActiveCodeTab('ts')}
                  className={`px-3 py-1 text-xs rounded-md font-mono transition-colors ${
                    activeCodeTab === 'ts' ? 'bg-[#1a1a1e] text-white border border-[#2a2a30]' : 'text-[#858585] hover:text-white'
                  }`}
                >
                  tokenizer.ts
                </button>
              </div>
            </div>

            {/* Resident Hardware Sentinel Pill */}
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#858585]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-white font-semibold">Tier 2: Standard</span>
              <span>•</span>
              <span className="text-[#4ec9b0]">qwen2.5-coder:1.5b (Resident VRAM)</span>
              <span>•</span>
              <span>24ms TTFT</span>
            </div>
          </div>

          {/* Editor Code Body with Ghost-Text Simulation */}
          <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto bg-[#1a1a1e] text-[#cccccc]">
            {activeCodeTab === 'rust' ? (
              <pre className="space-y-1">
                <code><span className="text-purple-400">pub async fn</span> <span className="text-blue-400">verify_airgap_stream</span>(payload: &amp;Payload) -&gt; Result&lt;bool, Error&gt; &#123;</code>
                <code>    <span className="text-neutral-500">// Check loopback destination strictly</span></code>
                <code>    <span className="text-purple-400">let</span> target = payload.endpoint();</code>
                <code>    <span className="text-blue-400">assert_local_loopback</span>(target)?;</code>
                <code></code>
                <code>    <span className="text-neutral-500">// Instant Tab ghost-text suggestion</span></code>
                <code>    <span className="text-yellow-300">let</span> guard = NetworkGuard::<span className="text-blue-400">lock_inbound</span>();<span className="inline-block ml-2 px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 text-xs border border-blue-800/40">Tab ⇥</span></code>
                <code className="text-[#858585] italic">    <span className="opacity-40">guard.enforce_zero_telemetry().await?;</span></code>
                <code className="text-[#858585] italic">    <span className="opacity-40">Ok(guard.is_verified())</span></code>
                <code>&#125;</code>
              </pre>
            ) : (
              <pre className="space-y-1">
                <code><span className="text-purple-400">export async function</span> <span className="text-blue-400">pullModelFromHub</span>(modelId: string) &#123;</code>
                <code>  <span className="text-neutral-500">// Connect to Cloudflare R2 zero-egress origin</span></code>
                <code>  <span className="text-purple-400">const</span> manifest = <span className="text-purple-400">await</span> hubClient.<span className="text-blue-400">fetchManifest</span>(modelId);</code>
                <code>  <span className="text-purple-400">const</span> stream = <span className="text-purple-400">await</span> hubClient.<span className="text-blue-400">streamWeights</span>(manifest.r2Url);<span className="inline-block ml-2 px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 text-xs border border-blue-800/40">Tab ⇥</span></code>
                <code className="text-[#858585] italic">  <span className="opacity-40">await stream.verifySha256(manifest.sha256);</span></code>
                <code className="text-[#858585] italic">  <span className="opacity-40">return nativeEngine.loadResident(stream.localPath);</span></code>
                <code>&#125;</code>
              </pre>
            )}
          </div>
        </div>
      </section>

      {/* 2. THE SOVEREIGN MODEL HUB FEATURE CALLOUT */}
      <section className="w-full bg-[#161619] border-y border-[#2a2a30] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="space-y-6 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-xs text-emerald-400">
                <Box className="w-3.5 h-3.5" />
                <span>The Sovereign Model Hub</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                No Third Parties. No Corporate Lock-In. Direct Open Weights.
              </h2>
              <p className="text-sm text-[#858585] leading-relaxed">
                Why rely on external services when your IDE can have its own dedicated model ecosystem?
                Open Studio connects directly to our sovereign registry hosting the **Golden Coding Suite**
                and community fine-tunes with Cloudflare R2 zero-egress bandwidth and P2P swarm acceleration.
              </p>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-[#007acc]/20 text-[#007acc] flex items-center justify-center shrink-0 mt-0.5">✓</div>
                  <div>
                    <span className="font-semibold text-white">IDE-Verified Benchmarks:</span> Every model is pre-tested for sub-40ms FIM latency and multi-hunk diff precision.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-[#007acc]/20 text-[#007acc] flex items-center justify-center shrink-0 mt-0.5">✓</div>
                  <div>
                    <span className="font-semibold text-white">Hardware Tier Calibrated:</span> 1-click bundles matched precisely to your VRAM and RAM budget.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-[#007acc]/20 text-[#007acc] flex items-center justify-center shrink-0 mt-0.5">✓</div>
                  <div>
                    <span className="font-semibold text-white">Community Fine-Tune Marketplace:</span> Discover domain specialist weights (Rust Tokio, Next.js, Embedded C).
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate('/models')}
                  className="px-5 py-2.5 text-xs font-semibold bg-[#007acc] hover:bg-[#0062a3] text-white rounded-lg flex items-center gap-2 transition-colors shadow-md shadow-blue-500/20"
                >
                  <Box className="w-4 h-4" />
                  <span>Explore Model Hub</span>
                </button>
              </div>
            </div>

            {/* Visual Card Grid Preview */}
            <div className="w-full lg:max-w-md bg-[#1a1a1e] p-5 rounded-2xl border border-[#2a2a30] space-y-3 shadow-xl">
              <div className="text-xs font-semibold text-white flex items-center justify-between pb-2 border-b border-[#2a2a30]">
                <span>Trending on Open Studio Hub</span>
                <span className="text-[10px] text-[#4ec9b0] font-mono">hub.openstudio.com</span>
              </div>

              <div className="bg-[#121214] p-3 rounded-xl border border-[#2a2a30] space-y-1.5 hover:border-[#007acc] transition-colors cursor-pointer" onClick={() => navigate('/models/openstudio/qwen2.5-coder-1.5b-fim')}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#4ec9b0]">qwen2.5-coder:1.5b</span>
                  <span className="text-[10px] bg-blue-950 text-blue-300 px-1.5 py-0.2 rounded font-mono">28ms FIM</span>
                </div>
                <p className="text-[11px] text-[#858585]">Sub-40ms Tab ghost-text resident model • 986 MB</p>
              </div>

              <div className="bg-[#121214] p-3 rounded-xl border border-[#2a2a30] space-y-1.5 hover:border-[#007acc] transition-colors cursor-pointer" onClick={() => navigate('/models/openstudio/qwen2.5-coder-7b-instruct')}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#4ec9b0]">qwen2.5-coder:7b</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded font-mono">99.6% Diffs</span>
                </div>
                <p className="text-[11px] text-[#858585]">Surgical multi-hunk diffs & project reasoning • 4.7 GB</p>
              </div>

              <div className="bg-[#121214] p-3 rounded-xl border border-[#2a2a30] space-y-1.5 hover:border-[#007acc] transition-colors cursor-pointer" onClick={() => navigate('/models/openstudio/rust-tokio-specialist-7b')}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#4ec9b0]">ferrislabs/rust-tokio:7b</span>
                  <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.2 rounded font-mono">Community</span>
                </div>
                <p className="text-[11px] text-[#858585]">Async Rust, zero-allocation network server fine-tune</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FOUR CORE IDE CAPABILITIES */}
      <section id="features" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Engineered for Extreme Developer Speed & Control
          </h2>
          <p className="text-sm text-[#858585] max-w-2xl mx-auto">
            Open Studio replaces bloated cloud latency with sub-40ms local neural models and defense-grade safety nets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#1a1a1e] p-6 rounded-2xl border border-[#2a2a30] space-y-3 hover:border-[#007acc]/60 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#007acc] flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Sub-40ms Autocomplete</h3>
            <p className="text-xs text-[#858585] leading-relaxed">
              Permanent Fill-In-The-Middle (FIM) model resident in RAM/VRAM. Generates keystroke predictions before your finger lifts.
            </p>
            <div className="text-[11px] font-mono text-[#4ec9b0] pt-2">Resident Ghost-Text</div>
          </div>

          <div className="bg-[#1a1a1e] p-6 rounded-2xl border border-[#2a2a30] space-y-3 hover:border-[#007acc]/60 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Frugal Diff Engine</h3>
            <p className="text-xs text-[#858585] leading-relaxed">
              Token-efficient search/replace blocks slashing LLM context usage by 99.6%. Multi-hunk side-by-side verification before touching files.
            </p>
            <div className="text-[11px] font-mono text-emerald-400 pt-2">99.6% Token Reduction</div>
          </div>

          <div className="bg-[#1a1a1e] p-6 rounded-2xl border border-[#2a2a30] space-y-3 hover:border-[#007acc]/60 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <GitBranch className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Shadow Git Safety Net</h3>
            <p className="text-xs text-[#858585] leading-relaxed">
              Zero-friction time-travel checkpoints before every AI code generation. 1-click surgical rollback preserves your git clean tree.
            </p>
            <div className="text-[11px] font-mono text-purple-400 pt-2">Time-Travel Snapshots</div>
          </div>

          <div className="bg-[#1a1a1e] p-6 rounded-2xl border border-[#2a2a30] space-y-3 hover:border-[#007acc]/60 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Zero-Telemetry Air-Gap</h3>
            <p className="text-xs text-[#858585] leading-relaxed">
              Strict loopback-only CSP. Zero external pings, zero tracking beacons. Your intellectual property strictly remains on your silicon.
            </p>
            <div className="text-[11px] font-mono text-amber-400 pt-2">100% Defense-Grade</div>
          </div>
        </div>
      </section>

      {/* 4. HARDWARE CALIBRATION SELECTOR */}
      <section className="w-full bg-[#161619] border-y border-[#2a2a30] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Adaptive Hardware Calibration
            </h2>
            <p className="text-xs text-[#858585] max-w-xl mx-auto">
              Open Studio dynamically scales context budgets, model architectures, and memory swapping to your machine profile.
            </p>
          </div>

          {/* Tier Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 1, name: 'Tier 1: Heavyweight', spec: '24GB+ VRAM (RTX 3090/4090/Mac Max)' },
              { id: 2, name: 'Tier 2: Standard', spec: '8GB–16GB VRAM (RTX 3060/4070/Mac Pro)' },
              { id: 3, name: 'Tier 3: Budget', spec: '4GB–6GB VRAM / 16GB RAM (Laptops)' },
              { id: 4, name: 'Tier 4: CPU Fallback', spec: 'CPU Only / Constrained RAM' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTier(t.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
                  activeTier === t.id
                    ? 'bg-[#007acc] text-white border-transparent shadow-lg shadow-blue-500/20'
                    : 'bg-[#1a1a1e] text-[#858585] border-[#2a2a30] hover:text-white'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* Tier Spec Display */}
          <div className="max-w-3xl mx-auto bg-[#1a1a1e] p-6 rounded-2xl border border-[#2a2a30] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-[#121214] p-3.5 rounded-xl border border-[#2a2a30]/60">
              <span className="text-[#858585] block text-[11px]">Resident Autocomplete</span>
              <span className="text-white font-mono font-bold mt-1 block">
                {activeTier <= 3 ? 'qwen2.5-coder:1.5b' : 'qwen2.5-coder:1.5b (CPU)'}
              </span>
              <span className="text-emerald-400 text-[10px] font-mono mt-0.5 block">Sub-40ms • Resident</span>
            </div>

            <div className="bg-[#121214] p-3.5 rounded-xl border border-[#2a2a30]/60">
              <span className="text-[#858585] block text-[11px]">Chat & Diff Engine</span>
              <span className="text-white font-mono font-bold mt-1 block">
                {activeTier === 1 ? 'qwen2.5-coder:14b' : activeTier === 2 ? 'qwen2.5-coder:7b' : 'qwen2.5-coder:7b / 1.5b'}
              </span>
              <span className="text-[#4ec9b0] text-[10px] font-mono mt-0.5 block">Multi-hunk synthesis</span>
            </div>

            <div className="bg-[#121214] p-3.5 rounded-xl border border-[#2a2a30]/60">
              <span className="text-[#858585] block text-[11px]">Deep Reasoning</span>
              <span className="text-white font-mono font-bold mt-1 block">
                {activeTier === 1 ? 'deepseek-r1:14b' : activeTier === 2 ? 'deepseek-r1:8b' : 'deepseek-r1:7b / 1.5b'}
              </span>
              <span className="text-purple-400 text-[10px] font-mono mt-0.5 block">Chain-of-thought</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. DOWNLOAD SECTION */}
      <section id="download" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12 text-center">
        <div className="space-y-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Download Open Studio v1.0.0
          </h2>
          <p className="text-xs text-[#858585] max-w-md mx-auto">
            Available on all major platforms. Production GA release verified across 745+ tests.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
          {/* Windows */}
          <div className="bg-[#1a1a1e] p-6 rounded-2xl border border-[#2a2a30] space-y-4 hover:border-[#007acc] transition-colors flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-sm font-bold text-white flex items-center justify-between">
                <span>Windows</span>
                <span className="text-[10px] font-mono bg-[#121214] px-2 py-0.5 rounded text-[#4ec9b0]">x64 / ARM64</span>
              </div>
              <p className="text-xs text-[#858585]">
                Windows 10 / 11 64-bit. Includes native PTY terminal, DirectX/Vulkan acceleration, and MSI installer.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <a
                href="https://github.com/Shourya3113/Open-Studio/releases/tag/v1.0.0"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 text-xs font-semibold bg-[#007acc] hover:bg-[#0062a3] text-white rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .msi / .exe</span>
              </a>
              <div className="text-[10px] font-mono text-[#858585] text-center">
                SHA-256 Verified
              </div>
            </div>
          </div>

          {/* macOS */}
          <div className="bg-[#1a1a1e] p-6 rounded-2xl border border-[#2a2a30] space-y-4 hover:border-[#007acc] transition-colors flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-sm font-bold text-white flex items-center justify-between">
                <span>macOS</span>
                <span className="text-[10px] font-mono bg-[#121214] px-2 py-0.5 rounded text-[#4ec9b0]">Apple Silicon / Intel</span>
              </div>
              <p className="text-xs text-[#858585]">
                macOS 12 Monterey or later. Unified memory Metal GPU acceleration with sub-30ms prompt ingestion.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <a
                href="https://github.com/Shourya3113/Open-Studio/releases/tag/v1.0.0"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 text-xs font-semibold bg-[#007acc] hover:bg-[#0062a3] text-white rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .dmg</span>
              </a>
              <div className="text-[10px] font-mono text-[#858585] text-center">
                Universal Binary
              </div>
            </div>
          </div>

          {/* Linux */}
          <div className="bg-[#1a1a1e] p-6 rounded-2xl border border-[#2a2a30] space-y-4 hover:border-[#007acc] transition-colors flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-sm font-bold text-white flex items-center justify-between">
                <span>Linux</span>
                <span className="text-[10px] font-mono bg-[#121214] px-2 py-0.5 rounded text-[#4ec9b0]">AppImage / .deb</span>
              </div>
              <p className="text-xs text-[#858585]">
                Ubuntu, Debian, Fedora, Arch. ROCm and CUDA native GPU passthrough with sandboxed AppImage.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <a
                href="https://github.com/Shourya3113/Open-Studio/releases/tag/v1.0.0"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 text-xs font-semibold bg-[#007acc] hover:bg-[#0062a3] text-white rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .AppImage</span>
              </a>
              <div className="text-[10px] font-mono text-[#858585] text-center">
                Glibc 2.31+ Compatible
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

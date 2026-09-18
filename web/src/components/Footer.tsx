import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-[#2a2a30] bg-[#121214] py-12 text-xs text-[#858585]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#007acc] flex items-center justify-center text-white font-bold text-xs">
                OS
              </div>
              <span className="font-bold text-white text-sm">Open Studio</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#858585]">
              The Sovereign AI IDE & Open-Weight Model Ecosystem. Engineered for zero telemetry, complete air-gapping, and local developer privacy.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>100% Offline Air-Gap Certified</span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider">Ecosystem</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#download" className="hover:text-white transition-colors">Desktop IDE (v1.0.0)</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Frugal Diff Engine</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Shadow Git Safety Net</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Hardware Memory Sentinel</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider">Model Hub</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><span className="hover:text-white transition-colors cursor-pointer">Golden Coding Suite</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Community Fine-Tunes</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Cloudflare R2 Zero-Egress</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">P2P Swarm Distribution</span></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider">Developer Sovereignty</h4>
            <p className="text-[11px] leading-relaxed">
              No accounts required. No telemetry beacons. Weights and code stay resident on your local hardware.
            </p>
            <div className="pt-2 text-[10px] font-mono text-[#4ec9b0]">
              SHA-256 Verified Artifacts
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[#2a2a30]/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px]">
            &copy; {new Date().getFullYear()} Open Studio Contributors. Open Source under Apache-2.0.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <a href="https://github.com/Shourya3113/Open-Studio/blob/main/PRIVACY.md" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              Privacy Manifesto
            </a>
            <span>•</span>
            <a href="https://github.com/Shourya3113/Open-Studio/blob/main/SECURITY.md" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              Security Policy
            </a>
            <span>•</span>
            <a href="https://github.com/Shourya3113/Open-Studio" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

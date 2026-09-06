import { useEffect, useState } from 'react';
import { 
  Files, 
  Search, 
  Bot, 
  GitBranch, 
  Terminal, 
  Settings, 
  Cpu, 
  Layers, 
  ChevronRight, 
  ChevronDown, 
  Code2, 
  Sparkles,
  Zap
} from 'lucide-react';
import { AppSystemInfo } from './types/system';

export default function App() {
  const [activeTab, setActiveTab] = useState<'files' | 'search' | 'chat' | 'git' | 'settings'>('files');
  const [systemInfo, setSystemInfo] = useState<AppSystemInfo | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);

  useEffect(() => {
    async function fetchSysInfo() {
      try {
        // Dynamically import Tauri invoke so browser preview doesn't crash
        const { invoke } = await import('@tauri-apps/api/core');
        const info = await invoke<AppSystemInfo>('get_system_info');
        setSystemInfo(info);
      } catch {
        // Dev fallback in standard browser
        setSystemInfo({
          os: 'Windows 11 (Simulated)',
          arch: 'x86_64',
          tauri_version: '2.0.0',
          memory_total_mb: 16384,
        });
      }
    }
    fetchSysInfo();
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-ide-bg text-ide-textNormal">
      {/* Window Title Bar */}
      <div className="h-8 bg-ide-activityBar border-b border-ide-border flex items-center justify-between px-3 text-xs select-none">
        <div className="flex items-center gap-2">
          <Code2 size={16} className="text-ide-accent" />
          <span className="font-semibold text-ide-textBright">Open Studio</span>
          <span className="text-ide-textMuted">— Local AI IDE & Agentic Workspace</span>
        </div>
        <div className="flex items-center gap-3 text-ide-textMuted">
          <span className="flex items-center gap-1">
            <Zap size={13} className="text-amber-400" />
            <span>Air-Gapped Core</span>
          </span>
          {systemInfo && (
            <span className="bg-ide-hover px-2 py-0.5 rounded text-[11px] text-ide-textBright">
              {systemInfo.arch} • {(systemInfo.memory_total_mb / 1024).toFixed(1)} GB RAM
            </span>
          )}
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar (Leftmost Strip) */}
        <div className="w-12 bg-ide-activityBar border-r border-ide-border flex flex-col justify-between items-center py-2 z-10 select-none">
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => { setActiveTab('files'); setIsSidebarOpen(true); }}
              title="File Explorer (Ctrl+Shift+E)"
              className={`p-2 rounded hover:text-ide-textBright transition ${activeTab === 'files' && isSidebarOpen ? 'text-ide-textBright border-l-2 border-ide-accent bg-ide-hover' : 'text-ide-textMuted'}`}
            >
              <Files size={20} />
            </button>
            <button 
              onClick={() => { setActiveTab('search'); setIsSidebarOpen(true); }}
              title="Search (Ctrl+Shift+F)"
              className={`p-2 rounded hover:text-ide-textBright transition ${activeTab === 'search' && isSidebarOpen ? 'text-ide-textBright border-l-2 border-ide-accent bg-ide-hover' : 'text-ide-textMuted'}`}
            >
              <Search size={20} />
            </button>
            <button 
              onClick={() => { setActiveTab('chat'); setIsSidebarOpen(true); }}
              title="AI Assistant (Ctrl+L)"
              className={`p-2 rounded hover:text-ide-textBright transition ${activeTab === 'chat' && isSidebarOpen ? 'text-ide-textBright border-l-2 border-ide-accent bg-ide-hover' : 'text-ide-textMuted'}`}
            >
              <Bot size={20} />
            </button>
            <button 
              onClick={() => { setActiveTab('git'); setIsSidebarOpen(true); }}
              title="Source Control & Checkpoints"
              className={`p-2 rounded hover:text-ide-textBright transition ${activeTab === 'git' && isSidebarOpen ? 'text-ide-textBright border-l-2 border-ide-accent bg-ide-hover' : 'text-ide-textMuted'}`}
            >
              <GitBranch size={20} />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
              title="Toggle Terminal Panel (Ctrl+`)"
              className={`p-2 rounded hover:text-ide-textBright transition ${isBottomPanelOpen ? 'text-ide-accent' : 'text-ide-textMuted'}`}
            >
              <Terminal size={19} />
            </button>
            <button 
              onClick={() => { setActiveTab('settings'); setIsSidebarOpen(true); }}
              title="Settings (Ctrl+,)"
              className={`p-2 rounded hover:text-ide-textBright transition ${activeTab === 'settings' && isSidebarOpen ? 'text-ide-textBright border-l-2 border-ide-accent bg-ide-hover' : 'text-ide-textMuted'}`}
            >
              <Settings size={19} />
            </button>
          </div>
        </div>

        {/* Primary Sidebar */}
        {isSidebarOpen && (
          <div className="w-64 bg-ide-sidebar border-r border-ide-border flex flex-col select-none">
            <div className="h-9 px-3 flex items-center justify-between border-b border-ide-border text-xs font-semibold uppercase tracking-wider text-ide-textMuted">
              <span>{activeTab === 'files' ? 'Explorer' : activeTab === 'chat' ? 'Local AI Assistant' : activeTab === 'search' ? 'Search' : activeTab === 'git' ? 'Shadow Git Checkpoints' : 'Settings'}</span>
              <button onClick={() => setIsSidebarOpen(false)} className="text-ide-textMuted hover:text-ide-textBright">
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="flex-1 p-3 text-xs overflow-y-auto">
              {activeTab === 'files' && (
                <div>
                  <div className="flex items-center gap-1 font-semibold text-ide-textBright mb-2">
                    <ChevronDown size={14} />
                    <span>OPEN-STUDIO (WORKSPACE)</span>
                  </div>
                  <div className="pl-4 space-y-1 text-ide-textNormal">
                    <div className="flex items-center gap-2 py-1 px-1 rounded hover:bg-ide-hover cursor-pointer">
                      <Code2 size={14} className="text-blue-400" />
                      <span>README.md</span>
                    </div>
                    <div className="flex items-center gap-2 py-1 px-1 rounded hover:bg-ide-hover cursor-pointer">
                      <Layers size={14} className="text-amber-400" />
                      <span>OPEN_STUDIO_EXECUTION_MASTERPLAN.md</span>
                    </div>
                    <div className="flex items-center gap-2 py-1 px-1 rounded hover:bg-ide-hover cursor-pointer">
                      <Cpu size={14} className="text-emerald-400" />
                      <span>src-tauri/Cargo.toml</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="flex flex-col h-full justify-between">
                  <div className="text-center py-6 text-ide-textMuted">
                    <Bot size={36} className="mx-auto mb-2 text-ide-accent opacity-80" />
                    <p className="font-semibold text-ide-textBright">Local AI Assistant</p>
                    <p className="text-[11px] mt-1">100% offline inference powered by local models</p>
                  </div>
                  <div className="bg-ide-bg border border-ide-border p-2 rounded text-xs text-ide-textMuted">
                    Type <code className="text-blue-400 font-mono">@file</code> in Week 3 to attach context.
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-ide-textMuted block mb-1">Ollama Host</label>
                    <input 
                      type="text" 
                      readOnly 
                      value="http://localhost:11434" 
                      className="w-full bg-ide-bg border border-ide-border rounded px-2 py-1 text-xs text-ide-textBright" 
                    />
                  </div>
                  <div>
                    <label className="text-ide-textMuted block mb-1">Default Autocomplete Model</label>
                    <input 
                      type="text" 
                      readOnly 
                      value="qwen2.5-coder:1.5b (Resident)" 
                      className="w-full bg-ide-bg border border-ide-border rounded px-2 py-1 text-xs text-ide-textBright" 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Editor Area & Bottom Panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-ide-editor">
          {/* Tab Bar */}
          <div className="h-9 bg-ide-activityBar border-b border-ide-border flex items-center px-1 select-none overflow-x-auto">
            <div className="flex items-center gap-2 bg-ide-editor px-3 py-1.5 text-xs text-ide-textBright border-t-2 border-ide-accent cursor-pointer">
              <Code2 size={14} className="text-blue-400" />
              <span>welcome.ts</span>
            </div>
          </div>

          {/* Editor Body */}
          <div className="flex-1 p-6 font-mono text-sm overflow-auto text-ide-textNormal leading-relaxed">
            <div className="max-w-2xl bg-ide-bg border border-ide-border rounded-lg p-5 shadow-lg">
              <div className="flex items-center gap-2 text-ide-accent mb-3">
                <Sparkles size={18} />
                <span className="font-bold text-base text-ide-textBright">Welcome to Open Studio</span>
              </div>
              <p className="text-xs text-ide-textMuted mb-4 leading-normal">
                Open Studio is a native, 100% air-gapped AI code editor running on your local machine.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-ide-hover p-2.5 rounded border border-ide-border/50">
                  <span className="font-bold text-ide-textBright block mb-1">🚀 Fast Ghost-Text</span>
                  <span className="text-ide-textMuted text-[11px]">Sub-40ms Tab autocomplete with Qwen 2.5 Coder 1.5B pinned in VRAM.</span>
                </div>
                <div className="bg-ide-hover p-2.5 rounded border border-ide-border/50">
                  <span className="font-bold text-ide-textBright block mb-1">🛡️ Shadow Checkpoints</span>
                  <span className="text-ide-textMuted text-[11px]">Automatic background Git snapshots before AI edits with 1-click restore.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Panel (Terminal) */}
          {isBottomPanelOpen && (
            <div className="h-44 bg-ide-panel border-t border-ide-border flex flex-col">
              <div className="h-7 bg-ide-activityBar border-b border-ide-border flex items-center justify-between px-3 text-xs select-none">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-ide-textBright flex items-center gap-1.5">
                    <Terminal size={13} />
                    <span>TERMINAL</span>
                  </span>
                  <span className="text-ide-textMuted">OUTPUT</span>
                  <span className="text-ide-textMuted">PROBLEMS</span>
                </div>
                <button onClick={() => setIsBottomPanelOpen(false)} className="text-ide-textMuted hover:text-ide-textBright">
                  ✕
                </button>
              </div>
              <div className="flex-1 p-2 font-mono text-xs text-emerald-400 bg-ide-bg overflow-y-auto">
                <p>Open Studio Integrated Terminal Engine [Day 1 Initialized]</p>
                <p className="text-ide-textMuted">Native PTY bridge ready for Day 4 portable-pty integration.</p>
                <p className="text-ide-textBright mt-2">&gt; _</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="h-6 bg-ide-statusbarBg text-ide-textMuted border-t border-ide-border flex items-center justify-between px-3 text-[11px] select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-ide-textBright hover:text-white cursor-pointer">
            <GitBranch size={12} />
            <span>main</span>
          </span>
          <span className="hover:text-ide-textBright cursor-pointer">0 Errors • 0 Warnings</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            <span>Local AI Ready</span>
          </span>
          {systemInfo ? (
            <span className="text-ide-textBright font-mono">
              {systemInfo.os} | {(systemInfo.memory_total_mb / 1024).toFixed(1)}GB
            </span>
          ) : (
            <span>Probing Hardware...</span>
          )}
          <span>UTF-8</span>
          <span>TypeScript</span>
        </div>
      </div>
    </div>
  );
}

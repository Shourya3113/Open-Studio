import { useEffect, useState } from 'react';
import { 
  Files, 
  Search, 
  Bot, 
  GitBranch, 
  Terminal, 
  Settings, 
  ChevronRight, 
  Code2, 
  Zap
} from 'lucide-react';
import { AppSystemInfo } from './types/system';
import { EditorContainer } from './components/editor/EditorContainer';
import { FileTree } from './components/sidebar/FileTree';
import { useEditorStore } from './stores/editorStore';

const SAMPLE_WELCOME_TS = `// Open Studio: Local AI IDE & Agentic Workspace
// Day 2: Monaco Editor Core & Offline Bundling Verified

export interface ProjectConfig {
  name: string;
  version: string;
  airGapped: boolean;
  model: string;
}

export const defaultSetup: ProjectConfig = {
  name: 'Open Studio',
  version: '0.1.0-w1',
  airGapped: true,
  model: 'qwen2.5-coder:1.5b (Resident)',
};

/**
 * Executes sub-40ms tab autocompletion
 */
export async function executeTabCompletion(prefix: string, suffix: string): Promise<string> {
  // Local FIM inference scheduled for Day 8
  return \`\${prefix} /* local prediction */ \${suffix}\`;
}
`;

const SAMPLE_README_MD = `# Open Studio 🚀
### 100% Offline, Native Local AI IDE & Agentic Workspace

- **Sub-40ms Tab Autocompletion**: Resident Qwen 2.5 Coder 1.5B pinned in VRAM.
- **Frugal Search/Replace Diffs**: 98% token reduction via modified line grammar.
- **Shadow Git Checkpoints**: Automatic background commits with 1-click restore.
`;

const SAMPLE_MAIN_RS = `// Open Studio Desktop Shell (Tauri v2)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    open_studio_lib::run()
}
`;

export default function App() {
  const [activeTab, setActiveTab] = useState<'files' | 'search' | 'chat' | 'git' | 'settings'>('files');
  const [systemInfo, setSystemInfo] = useState<AppSystemInfo | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);

  const { openFile, buffers, activeBufferId } = useEditorStore();
  const activeBuffer = activeBufferId ? buffers[activeBufferId] : null;

  useEffect(() => {
    // Seed initial files into editor store
    openFile('src/welcome.ts', SAMPLE_WELCOME_TS, 'typescript');
    openFile('README.md', SAMPLE_README_MD, 'markdown');
    openFile('src-tauri/src/main.rs', SAMPLE_MAIN_RS, 'rust');

    async function fetchSysInfo() {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const info = await invoke<AppSystemInfo>('get_system_info');
        setSystemInfo(info);
      } catch {
        setSystemInfo({
          os: 'Windows (Local Engine)',
          arch: 'x86_64',
          tauri_version: '2.0.0',
          memory_total_mb: 16384,
        });
      }
    }
    fetchSysInfo();
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-ide-bg text-ide-textNormal font-sans">
      {/* Window Title Bar */}
      <div className="h-8 bg-ide-activityBar border-b border-ide-border flex items-center justify-between px-3 text-xs select-none">
        <div className="flex items-center gap-2">
          <Code2 size={16} className="text-ide-accent" />
          <span className="font-semibold text-ide-textBright">Open Studio</span>
          <span className="text-ide-textMuted">— {activeBuffer ? activeBuffer.fileName : 'Workspace'}</span>
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
        {/* Activity Bar */}
        <div className="w-12 bg-ide-activityBar border-r border-ide-border flex flex-col justify-between items-center py-2 z-10 select-none">
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => { setActiveTab('files'); setIsSidebarOpen(true); }}
              title="File Explorer"
              className={`p-2 rounded hover:text-ide-textBright transition ${activeTab === 'files' && isSidebarOpen ? 'text-ide-textBright border-l-2 border-ide-accent bg-ide-hover' : 'text-ide-textMuted'}`}
            >
              <Files size={20} />
            </button>
            <button 
              onClick={() => { setActiveTab('search'); setIsSidebarOpen(true); }}
              title="Search"
              className={`p-2 rounded hover:text-ide-textBright transition ${activeTab === 'search' && isSidebarOpen ? 'text-ide-textBright border-l-2 border-ide-accent bg-ide-hover' : 'text-ide-textMuted'}`}
            >
              <Search size={20} />
            </button>
            <button 
              onClick={() => { setActiveTab('chat'); setIsSidebarOpen(true); }}
              title="AI Assistant"
              className={`p-2 rounded hover:text-ide-textBright transition ${activeTab === 'chat' && isSidebarOpen ? 'text-ide-textBright border-l-2 border-ide-accent bg-ide-hover' : 'text-ide-textMuted'}`}
            >
              <Bot size={20} />
            </button>
            <button 
              onClick={() => { setActiveTab('git'); setIsSidebarOpen(true); }}
              title="Source Control"
              className={`p-2 rounded hover:text-ide-textBright transition ${activeTab === 'git' && isSidebarOpen ? 'text-ide-textBright border-l-2 border-ide-accent bg-ide-hover' : 'text-ide-textMuted'}`}
            >
              <GitBranch size={20} />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
              title="Toggle Terminal (Ctrl+`)"
              className={`p-2 rounded hover:text-ide-textBright transition ${isBottomPanelOpen ? 'text-ide-accent bg-ide-hover' : 'text-ide-textMuted'}`}
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
              <span>{activeTab === 'files' ? 'Explorer' : activeTab === 'chat' ? 'Local AI' : activeTab === 'search' ? 'Search' : activeTab === 'git' ? 'Shadow Git' : 'Settings'}</span>
              <button onClick={() => setIsSidebarOpen(false)} className="text-ide-textMuted hover:text-ide-textBright">
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === 'files' && <FileTree />}

              {activeTab === 'chat' && (
                <div className="flex flex-col h-full justify-between">
                  <div className="text-center py-6 text-ide-textMuted">
                    <Bot size={36} className="mx-auto mb-2 text-ide-accent opacity-80" />
                    <p className="font-semibold text-ide-textBright">Local AI Assistant</p>
                    <p className="text-[11px] mt-1">Ready for Week 3 Chat & @file integration</p>
                  </div>
                  <div className="bg-ide-bg border border-ide-border p-2 rounded text-xs text-ide-textMuted">
                    Type <code className="text-blue-400 font-mono">@file</code> to inject context.
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-ide-textMuted block mb-1">Ollama Endpoint</label>
                    <input 
                      type="text" 
                      readOnly 
                      value="http://localhost:11434" 
                      className="w-full bg-ide-bg border border-ide-border rounded px-2 py-1 text-xs text-ide-textBright" 
                    />
                  </div>
                  <div>
                    <label className="text-ide-textMuted block mb-1">Editor Theme</label>
                    <input 
                      type="text" 
                      readOnly 
                      value="open-studio-dark" 
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
          <EditorContainer />

          {/* Bottom Panel */}
          {isBottomPanelOpen && (
            <div className="h-44 bg-ide-panel border-t border-ide-border flex flex-col">
              <div className="h-7 bg-ide-activityBar border-b border-ide-border flex items-center justify-between px-3 text-xs select-none">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-ide-textBright flex items-center gap-1.5">
                    <Terminal size={13} />
                    <span>TERMINAL</span>
                  </span>
                  <span className="text-ide-textMuted">OUTPUT</span>
                </div>
                <button onClick={() => setIsBottomPanelOpen(false)} className="text-ide-textMuted hover:text-ide-textBright">
                  ✕
                </button>
              </div>
              <div className="flex-1 p-2 font-mono text-xs text-emerald-400 bg-ide-bg overflow-y-auto">
                <p>Open Studio Shell [Monaco Editor Core Online]</p>
                <p className="text-ide-textMuted">Ready for Day 4 portable-pty native terminal integration.</p>
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
          {activeBuffer && activeBuffer.isDirty && (
            <span className="text-amber-400">● Unsaved Changes (Ctrl+S to save)</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            <span>Local AI Ready</span>
          </span>
          {activeBuffer?.cursorPosition && (
            <span>
              Ln {activeBuffer.cursorPosition.line}, Col {activeBuffer.cursorPosition.column}
            </span>
          )}
          <span>UTF-8</span>
          <span className="text-ide-textBright uppercase font-mono">{activeBuffer?.language || 'Plain Text'}</span>
        </div>
      </div>
    </div>
  );
}

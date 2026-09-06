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
  Zap,
  Send,
  Square,
  Cpu
} from 'lucide-react';
import { AppSystemInfo } from './types/system';
import { InferenceHealth } from './types/inference';
import { checkInferenceHealth, streamCompletion } from './services/inference';
import { autocompleteTracker, AutocompleteMetrics } from './features/autocomplete/benchmark';
import { EditorContainer } from './components/editor/EditorContainer';
import { FileTree } from './components/sidebar/FileTree';
import { TerminalPanel } from './components/terminal/TerminalPanel';
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
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(220);

  const [inferenceHealth, setInferenceHealth] = useState<InferenceHealth | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('qwen2.5-coder:1.5b');
  const [chatPrompt, setChatPrompt] = useState('Write a concise function to reverse a string');
  const [chatResponse, setChatResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortFn, setAbortFn] = useState<(() => void) | null>(null);
  const [genStats, setGenStats] = useState<string | null>(null);

  const [autocompleteMetrics, setAutocompleteMetrics] = useState<AutocompleteMetrics | null>(null);

  const { openFile, buffers, activeBufferId } = useEditorStore();
  const activeBuffer = activeBufferId ? buffers[activeBufferId] : null;

  // Poll / check inference health and subscribe to autocomplete telemetry
  useEffect(() => {
    checkInferenceHealth().then((health) => {
      setInferenceHealth(health);
      if (health.models.length > 0) {
        setSelectedModel(health.models[0].name);
      }
    }).catch(() => {});

    return autocompleteTracker.subscribe(setAutocompleteMetrics);
  }, []);

  const handleGenerate = async () => {
    if (!chatPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setChatResponse('');
    setGenStats(null);

    try {
      const cancel = await streamCompletion(
        {
          model: selectedModel,
          prompt: chatPrompt,
          temperature: 0.2,
        },
        (token) => {
          setChatResponse((prev) => prev + token);
        },
        (stats) => {
          setIsGenerating(false);
          setAbortFn(null);
          if (stats.eval_count && stats.eval_duration) {
            const tokPerSec = (stats.eval_count / (stats.eval_duration / 1e9)).toFixed(1);
            setGenStats(`${stats.eval_count} tokens • ${tokPerSec} tok/s`);
          } else {
            setGenStats('Completed');
          }
        }
      );
      setAbortFn(() => cancel);
    } catch (err) {
      setChatResponse(`Inference error: ${err}`);
      setIsGenerating(false);
      setAbortFn(null);
    }
  };

  const handleStop = () => {
    if (abortFn) {
      abortFn();
      setAbortFn(null);
    }
    setIsGenerating(false);
  };

  // Global IDE shortcuts: Ctrl+` (Terminal), Ctrl+B (Sidebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setIsBottomPanelOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sidebar drag resizer handler
  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(180, Math.min(600, startWidth + deltaX));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Bottom panel drag resizer handler
  const handleBottomMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = bottomPanelHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.max(120, Math.min(600, startHeight + deltaY));
      setBottomPanelHeight(newHeight);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

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
          <>
            <div 
              style={{ width: `${sidebarWidth}px` }} 
              className="bg-ide-sidebar border-r border-ide-border flex flex-col select-none flex-shrink-0"
            >
              <div className="h-9 px-3 flex items-center justify-between border-b border-ide-border text-xs font-semibold uppercase tracking-wider text-ide-textMuted">
                <span>{activeTab === 'files' ? 'Explorer' : activeTab === 'chat' ? 'Local AI' : activeTab === 'search' ? 'Search' : activeTab === 'git' ? 'Shadow Git' : 'Settings'}</span>
                <button onClick={() => setIsSidebarOpen(false)} className="text-ide-textMuted hover:text-ide-textBright">
                  <ChevronRight size={15} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                {activeTab === 'files' && <FileTree />}

                {activeTab === 'chat' && (
                  <div className="flex flex-col h-full p-2.5 space-y-2 overflow-y-auto">
                    {/* Header with Model Selector */}
                    <div className="bg-ide-bg border border-ide-border rounded p-2 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ide-textBright flex items-center gap-1">
                          <Cpu size={13} className="text-ide-accent" />
                          <span>Ollama Gateway</span>
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${inferenceHealth?.online ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                          {inferenceHealth?.online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      
                      {inferenceHealth && inferenceHealth.models.length > 0 ? (
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="w-full bg-ide-panel border border-ide-border rounded px-2 py-1 text-xs text-ide-textBright focus:outline-none focus:border-ide-accent"
                        >
                          {inferenceHealth.models.map((m) => (
                            <option key={m.name} value={m.name}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-[11px] text-ide-textMuted">
                          qwen2.5-coder:1.5b (Resident Default)
                        </div>
                      )}
                    </div>

                    {/* Prompt input */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-ide-textMuted block font-medium">Prompt</label>
                      <textarea
                        value={chatPrompt}
                        onChange={(e) => setChatPrompt(e.target.value)}
                        placeholder="Enter coding task or question..."
                        rows={3}
                        className="w-full bg-ide-bg border border-ide-border rounded p-2 text-xs text-ide-textBright focus:outline-none focus:border-ide-accent resize-none font-mono"
                      />
                      <div className="flex items-center justify-between pt-1">
                        {isGenerating ? (
                          <button
                            onClick={handleStop}
                            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded text-xs transition"
                          >
                            <Square size={12} fill="white" />
                            <span>Stop</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleGenerate}
                            disabled={!chatPrompt.trim()}
                            className="flex items-center gap-1.5 bg-ide-accent hover:bg-blue-600 disabled:opacity-50 text-white px-3 py-1 rounded text-xs transition font-medium"
                          >
                            <Send size={12} />
                            <span>Generate</span>
                          </button>
                        )}
                        {genStats && (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            {genStats}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Streaming Output Viewer */}
                    <div className="flex-1 flex flex-col min-h-[140px] bg-ide-bg border border-ide-border rounded p-2 overflow-hidden">
                      <div className="text-[10px] uppercase font-semibold text-ide-textMuted tracking-wider mb-1 flex items-center justify-between">
                        <span>Streaming Output</span>
                        {isGenerating && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                            <span>Streaming...</span>
                          </span>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto font-mono text-xs text-ide-textBright whitespace-pre-wrap select-text leading-relaxed">
                        {chatResponse || (
                          <span className="text-ide-textMuted italic">
                            Tokens streamed via Ollama SSE will appear here in real-time...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="p-3 space-y-3">
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

            {/* Vertical Resizer Handle */}
            <div 
              onMouseDown={handleSidebarMouseDown}
              className="w-1 bg-transparent hover:bg-ide-accent cursor-col-resize z-20 transition-colors"
              title="Drag to resize sidebar"
            />
          </>
        )}

        {/* Editor Area & Bottom Panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-ide-editor">
          <EditorContainer />

          {/* Bottom Panel */}
          {isBottomPanelOpen && (
            <>
              {/* Horizontal Resizer Handle */}
              <div 
                onMouseDown={handleBottomMouseDown}
                className="h-1 bg-transparent hover:bg-ide-accent cursor-row-resize z-20 transition-colors"
                title="Drag to resize terminal panel"
              />
              <TerminalPanel 
                height={bottomPanelHeight} 
                onClose={() => setIsBottomPanelOpen(false)} 
              />
            </>
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
          <button 
            onClick={() => setIsBottomPanelOpen(prev => !prev)}
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded transition ${isBottomPanelOpen ? 'text-ide-accent bg-ide-hover' : 'hover:text-ide-textBright'}`}
            title="Toggle Terminal (Ctrl+`)"
          >
            <Terminal size={12} />
            <span>Terminal</span>
          </button>
          {activeBuffer && activeBuffer.isDirty && (
            <span className="text-amber-400">● Unsaved Changes (Ctrl+S to save)</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span 
            onClick={() => { setActiveTab('chat'); setIsSidebarOpen(true); }}
            className="flex items-center gap-1.5 cursor-pointer hover:underline" 
            title={inferenceHealth?.online ? `Inference Gateway: Online (${inferenceHealth.models.length} local models)` : 'Inference Gateway: Offline'}
          >
            <span className={`w-2 h-2 rounded-full ${inferenceHealth?.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
            <span className={inferenceHealth?.online ? 'text-emerald-400' : 'text-rose-400'}>
              {inferenceHealth?.online ? `AI: ${selectedModel}` : 'AI: Offline'}
            </span>
          </span>
          {autocompleteMetrics && (
            <span 
              onClick={async () => {
                await autocompleteTracker.runBenchmarkBurst(5);
              }}
              className="flex items-center gap-1 cursor-pointer hover:text-ide-textBright transition bg-ide-hover/60 px-1.5 py-0.5 rounded text-[10px]"
              title={`Inline Autocomplete Telemetry: ${autocompleteMetrics.avgLatencyMs}ms average (${autocompleteMetrics.acceptanceRate}% acceptance, ${autocompleteMetrics.acceptedCount} accepted). Click to run benchmark burst.`}
            >
              <Zap size={11} className="text-amber-400" />
              <span className="text-ide-textBright font-mono">{autocompleteMetrics.avgLatencyMs}ms</span>
              <span className="text-ide-textMuted font-mono">({autocompleteMetrics.acceptanceRate}%)</span>
            </span>
          )}
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

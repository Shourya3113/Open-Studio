import { useCallback, useEffect, useState, useRef } from 'react';
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
  History,
  AlertCircle
} from 'lucide-react';
import { AppSystemInfo } from './types/system';
import { InferenceHealth } from './types/inference';
import { checkInferenceHealth } from './services/inference';
import { autocompleteTracker, AutocompleteMetrics } from './features/autocomplete/benchmark';
import { getHardwareTier, HardwareTierInfo, formatTokenBudget } from './features/inference/hardwareTier';
import { HardwareSentinelModal } from './components/inference/HardwareSentinelModal';
import { EditorContainer } from './components/editor/EditorContainer';
import { FileTree } from './components/sidebar/FileTree';
import { TerminalPanel } from './components/terminal/TerminalPanel';
import { ChatPanel } from './components/chat/ChatPanel';
import { DiffReviewModal } from './components/diff/DiffReviewModal';
import { CheckpointModal } from './components/git/CheckpointModal';
import { CommandPalette } from './components/palette/CommandPalette';
import { usePaletteStore } from './stores/paletteStore';
import { createDefaultCommands } from './features/palette/defaultCommands';
import { useEditorStore } from './stores/editorStore';
import { useChatStore } from './stores/chatStore';
import { useDiagnosticsStore } from './stores/diagnosticsStore';
import { 
  loadWorkspaceState, 
  rehydrateWorkspace, 
  initWorkspacePersistence,
  extractCurrentWorkspaceState,
  saveWorkspaceState 
} from './stores/persistence';

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
  const [bottomPanelTab, setBottomPanelTab] = useState<'terminal' | 'problems'>('terminal');
  const diagCounts = useDiagnosticsStore((s) => s.getTotalCounts());

  const [inferenceHealth, setInferenceHealth] = useState<InferenceHealth | null>(null);
  const selectedModel = useChatStore((s) => s.selectedModel);
  const setSelectedModel = useChatStore((s) => s.setSelectedModel);

  const [autocompleteMetrics, setAutocompleteMetrics] = useState<AutocompleteMetrics | null>(null);
  const [hardwareTier, setHardwareTier] = useState<HardwareTierInfo | null>(null);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
  const [isCheckpointModalOpen, setIsCheckpointModalOpen] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const { openFile, buffers, activeBufferId } = useEditorStore();
  const activeBuffer = activeBufferId ? buffers[activeBufferId] : null;

  const refreshInferenceTelemetry = useCallback(async () => {
    try {
      setIsReconnecting(true);
      const [health, tier] = await Promise.all([
        checkInferenceHealth(),
        getHardwareTier(),
      ]);
      setInferenceHealth(health);
      setHardwareTier(tier);
      if (health.models.length > 0) {
        const currModel = useChatStore.getState().selectedModel;
        if (!health.models.some((m) => m.name === currModel)) {
          setSelectedModel(health.models[0].name);
        }
      }
    } catch {
      // Retain state
    } finally {
      setIsReconnecting(false);
    }
  }, [setSelectedModel]);

  // Poll / check inference health, fetch hardware tier, and subscribe to autocomplete telemetry
  useEffect(() => {
    refreshInferenceTelemetry();
    const unsubAutocomplete = autocompleteTracker.subscribe(setAutocompleteMetrics);

    // Auto-reconnect poll every 5s if offline
    const reconnectTimer = setInterval(() => {
      setInferenceHealth((curr) => {
        if (!curr?.online) {
          refreshInferenceTelemetry();
        }
        return curr;
      });
    }, 5000);

    return () => {
      unsubAutocomplete();
      clearInterval(reconnectTimer);
    };
  }, [refreshInferenceTelemetry]);

  // Register default IDE commands for Command Palette
  useEffect(() => {
    const unregister = usePaletteStore.getState().registerCommands(
      createDefaultCommands({
        toggleSidebar: () => setIsSidebarOpen((prev) => !prev),
        toggleTerminal: () => {
          setBottomPanelTab('terminal');
          setIsBottomPanelOpen((prev) => !prev);
        },
        openProblemsTab: () => {
          setBottomPanelTab('problems');
          setIsBottomPanelOpen(true);
        },
        setActiveTab: (tab) => {
          setActiveTab(tab);
          setIsSidebarOpen(true);
        },
        openHardwareModal: () => setIsHardwareModalOpen(true),
        openCheckpointModal: () => setIsCheckpointModalOpen(true),
        saveWorkspace: () => {
          const state = extractCurrentWorkspaceState({
            sidebarWidth,
            bottomPanelHeight,
            isSidebarOpen,
            isBottomPanelOpen,
            activeTab,
          });
          saveWorkspaceState(state);
        },
        resetLayout: () => {
          setSidebarWidth(260);
          setBottomPanelHeight(220);
          setIsSidebarOpen(true);
          setIsBottomPanelOpen(false);
          setActiveTab('files');
        },
      })
    );
    return unregister;
  }, [sidebarWidth, bottomPanelHeight, isSidebarOpen, isBottomPanelOpen, activeTab]);

  // Global IDE shortcuts: Ctrl+Shift+P / F1 (Commands), Ctrl+P (Quick Open), Ctrl+Shift+M (Problems), Ctrl+` (Terminal), Ctrl+B (Sidebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette (Commands mode): Ctrl+Shift+P, Cmd+Shift+P, F1
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') ||
        e.key === 'F1'
      ) {
        e.preventDefault();
        usePaletteStore.getState().open('commands');
        return;
      }

      // Command Palette (Quick Open Files mode): Ctrl+P, Cmd+P
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        usePaletteStore.getState().open('files');
        return;
      }

      // Toggle Problems panel: Ctrl+Shift+M
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setBottomPanelTab('problems');
        setIsBottomPanelOpen((prev) => !prev);
        return;
      }

      // Toggle integrated terminal: Ctrl+`
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setBottomPanelTab('terminal');
        setIsBottomPanelOpen((prev) => !prev);
        return;
      }

      // Toggle primary sidebar: Ctrl+B
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
        return;
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

  const layoutRef = useRef({
    sidebarWidth,
    bottomPanelHeight,
    isSidebarOpen,
    isBottomPanelOpen,
    activeTab,
  });

  useEffect(() => {
    layoutRef.current = {
      sidebarWidth,
      bottomPanelHeight,
      isSidebarOpen,
      isBottomPanelOpen,
      activeTab,
    };
  }, [sidebarWidth, bottomPanelHeight, isSidebarOpen, isBottomPanelOpen, activeTab]);

  useEffect(() => {
    let unsubPersistence: (() => void) | undefined;

    async function initWorkspace() {
      try {
        const persisted = await loadWorkspaceState();
        if (persisted && persisted.openFiles && persisted.openFiles.length > 0) {
          const { layout } = await rehydrateWorkspace(persisted);
          if (layout) {
            setSidebarWidth(layout.sidebarWidth || 260);
            setBottomPanelHeight(layout.bottomPanelHeight || 220);
            setIsSidebarOpen(layout.isSidebarOpen ?? true);
            setIsBottomPanelOpen(layout.isBottomPanelOpen ?? false);
            setActiveTab(layout.activeTab || 'files');
          }
        } else {
          // Fresh workspace fallback
          openFile('src/welcome.ts', SAMPLE_WELCOME_TS, 'typescript');
          openFile('README.md', SAMPLE_README_MD, 'markdown');
          openFile('src-tauri/src/main.rs', SAMPLE_MAIN_RS, 'rust');
        }
      } catch {
        openFile('src/welcome.ts', SAMPLE_WELCOME_TS, 'typescript');
        openFile('README.md', SAMPLE_README_MD, 'markdown');
        openFile('src-tauri/src/main.rs', SAMPLE_MAIN_RS, 'rust');
      }

      unsubPersistence = initWorkspacePersistence({
        debounceMs: 500,
        getLayout: () => layoutRef.current,
      });
    }

    initWorkspace();

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

    return () => {
      if (unsubPersistence) unsubPersistence();
    };
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

        {/* Centered Command Palette Trigger */}
        <button
          onClick={() => usePaletteStore.getState().open('files')}
          className="flex items-center gap-2 px-3 py-1 bg-ide-bg/80 hover:bg-ide-hover text-ide-textMuted hover:text-ide-textBright border border-ide-border/60 rounded-md transition text-xs shadow-inner cursor-pointer"
          title="Open Command Palette (Ctrl+P for files, Ctrl+Shift+P for commands)"
          data-testid="titlebar-palette-trigger"
        >
          <Search size={12} className="text-ide-textMuted" />
          <span className="text-[11px] hidden sm:inline">Search commands or files...</span>
          <kbd className="px-1 py-0.2 bg-ide-surface rounded border border-ide-border/80 text-[10px] font-mono text-ide-textMuted">
            Ctrl+P
          </kbd>
        </button>

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
                  <ChatPanel inferenceHealth={inferenceHealth} />
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
                activeTab={bottomPanelTab}
                onTabChange={setBottomPanelTab}
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
            onClick={() => setIsCheckpointModalOpen(true)}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:bg-ide-hover px-1.5 py-0.5 rounded transition cursor-pointer"
            title="View Shadow Git Checkpoints & 1-Click Rollback"
          >
            <History size={12} />
            <span>Checkpoints</span>
          </button>
          <button 
            onClick={() => {
              if (isBottomPanelOpen && bottomPanelTab === 'terminal') {
                setIsBottomPanelOpen(false);
              } else {
                setBottomPanelTab('terminal');
                setIsBottomPanelOpen(true);
              }
            }}
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded transition cursor-pointer ${isBottomPanelOpen && bottomPanelTab === 'terminal' ? 'text-ide-accent bg-ide-hover' : 'hover:text-ide-textBright'}`}
            title="Toggle Terminal (Ctrl+`)"
          >
            <Terminal size={12} />
            <span>Terminal</span>
          </button>
          <button 
            onClick={() => {
              if (isBottomPanelOpen && bottomPanelTab === 'problems') {
                setIsBottomPanelOpen(false);
              } else {
                setBottomPanelTab('problems');
                setIsBottomPanelOpen(true);
              }
            }}
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded transition cursor-pointer ${
              isBottomPanelOpen && bottomPanelTab === 'problems'
                ? 'bg-ide-hover text-ide-textBright'
                : 'hover:text-ide-textBright'
            }`}
            title="Toggle Problems & Diagnostics (Ctrl+Shift+M)"
          >
            <AlertCircle size={12} className={diagCounts.errors > 0 ? 'text-rose-400' : diagCounts.warnings > 0 ? 'text-amber-400' : 'text-emerald-400'} />
            <span className={diagCounts.errors > 0 ? 'text-rose-300 font-medium' : diagCounts.warnings > 0 ? 'text-amber-300' : ''}>
              {diagCounts.total > 0
                ? `${diagCounts.errors > 0 ? `${diagCounts.errors} error${diagCounts.errors > 1 ? 's' : ''}` : ''}${diagCounts.errors > 0 && diagCounts.warnings > 0 ? ', ' : ''}${diagCounts.warnings > 0 ? `${diagCounts.warnings} warning${diagCounts.warnings > 1 ? 's' : ''}` : ''}`
                : '0 Problems'}
            </span>
          </button>
          {activeBuffer && activeBuffer.isDirty && (
            <span className="text-amber-400">● Unsaved Changes (Ctrl+S to save)</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsHardwareModalOpen(true)}
            className="flex items-center gap-1.5 cursor-pointer hover:bg-ide-hover px-1.5 py-0.5 rounded transition text-left" 
            title={
              inferenceHealth?.online 
                ? `VRAM Sentinel: ${hardwareTier?.tier || 'Tier 3'} (${formatTokenBudget(hardwareTier?.context_budget || 8192)}). Click to manage VRAM & models.` 
                : 'Ollama Offline. Click to view Sentinel diagnostics and start instructions.'
            }
          >
            <span className={`w-2 h-2 rounded-full ${isReconnecting ? 'bg-amber-400 animate-spin' : inferenceHealth?.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
            <span className={isReconnecting ? 'text-amber-400' : inferenceHealth?.online ? 'text-emerald-400' : 'text-rose-400'}>
              {isReconnecting 
                ? '🟡 Reconnecting...' 
                : inferenceHealth?.online 
                  ? `AI: ${selectedModel} • Tier ${hardwareTier?.tier_number || 3} [${hardwareTier ? formatTokenBudget(hardwareTier.context_budget) : '8k'}]` 
                  : '🔴 Ollama Offline'}
            </span>
          </button>
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

      {/* Hardware Sentinel & Model Swapper Modal */}
      <HardwareSentinelModal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
        inferenceHealth={inferenceHealth}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        onRefreshHealth={refreshInferenceTelemetry}
      />

      {/* Monaco Multi-File Diff Review Modal */}
      <DiffReviewModal />

      {/* Shadow Git Checkpoint & Rollback Modal */}
      <CheckpointModal
        isOpen={isCheckpointModalOpen}
        onClose={() => setIsCheckpointModalOpen(false)}
      />

      {/* Command Palette & Quick Open Modal */}
      <CommandPalette />
    </div>
  );
}

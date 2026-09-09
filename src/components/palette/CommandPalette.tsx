import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  Terminal,
  FileText,
  Search,
  Clock,
  Sparkles,
  GitBranch,
  Settings,
  FolderOpen,
  Keyboard,
  CornerDownLeft,
} from 'lucide-react';
import { usePaletteStore, PaletteMode } from '../../stores/paletteStore';
import { useEditorStore } from '../../stores/editorStore';
import { fuzzyFilter, fuzzyHighlight } from '../../features/palette/fuzzySearch';
import { CommandCategory, PaletteCommand } from '../../types/palette';

export const CommandPalette: React.FC = () => {
  const {
    isOpen,
    mode,
    query,
    selectedIndex,
    commands,
    close,
    setMode,
    setQuery,
    setSelectedIndex,
    selectNext,
    selectPrevious,
  } = usePaletteStore();

  const { recentFiles, buffers, openFile } = useEditorStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Workspace file items (combining recent files and currently open buffers)
  const [availableFiles, setAvailableFiles] = useState<{ name: string; relPath: string; isRecent: boolean }[]>([]);

  // Load files when palette opens
  useEffect(() => {
    if (!isOpen) return;

    // Collect recent files first
    const seen = new Set<string>();
    const files: { name: string; relPath: string; isRecent: boolean }[] = [];

    // 1. Recent files
    recentFiles.forEach((p) => {
      const norm = p.replace(/\\/g, '/');
      if (!seen.has(norm)) {
        seen.add(norm);
        const name = norm.split('/').pop() || norm;
        files.push({ name, relPath: norm, isRecent: true });
      }
    });

    // 2. Open buffer files
    Object.values(buffers).forEach((buf) => {
      const norm = buf.filePath.replace(/\\/g, '/');
      if (!seen.has(norm)) {
        seen.add(norm);
        const name = norm.split('/').pop() || norm;
        files.push({ name, relPath: norm, isRecent: false });
      }
    });

    // Try scanning workspace files via Tauri if available
    const fetchTree = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const tree = await invoke<any>('get_file_tree', { path: '.' });
        if (tree) {
          const { flattenFileTree } = await import('../../features/chat/fileMention');
          const flattened = flattenFileTree(tree);
          flattened.forEach((f) => {
            const norm = f.relPath.replace(/\\/g, '/');
            if (!seen.has(norm)) {
              seen.add(norm);
              files.push({ name: f.name, relPath: norm, isRecent: false });
            }
          });
          setAvailableFiles([...files]);
        }
      } catch {
        // Fallback to currently gathered files
        setAvailableFiles(files);
      }
    };

    fetchTree();
  }, [isOpen, recentFiles, buffers]);

  // Focus input whenever palette opens or mode changes
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
    }
  }, [isOpen, mode]);

  // Filter commands
  const filteredCommands = useMemo(() => {
    if (mode !== 'commands') return [];
    return fuzzyFilter<PaletteCommand>(
      commands,
      query,
      (cmd) => cmd.title,
      (cmd) => cmd.keywords || []
    );
  }, [commands, query, mode]);

  // Filter files
  const filteredFiles = useMemo(() => {
    if (mode !== 'files') return [];
    return fuzzyFilter(
      availableFiles,
      query,
      (f) => f.name,
      (f) => [f.relPath]
    );
  }, [availableFiles, query, mode]);

  const totalResults = mode === 'commands' ? filteredCommands.length : filteredFiles.length;

  // Auto-scroll selected item into view
  useEffect(() => {
    const selectedEl = itemRefs.current[selectedIndex];
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, mode, setSelectedIndex]);

  if (!isOpen) return null;

  const handleSelectCommand = async (cmd: PaletteCommand) => {
    close();
    try {
      await cmd.handler();
    } catch (err) {
      console.error(`Error executing command ${cmd.id}:`, err);
    }
  };

  const handleSelectFile = async (filePath: string) => {
    close();
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const content = await invoke<string>('read_file_content', { path: filePath });
      openFile(filePath, content);
    } catch {
      // Check existing buffer
      const existing = Object.values(buffers).find((b) => b.filePath === filePath);
      if (existing) {
        openFile(filePath, existing.content);
      } else {
        openFile(filePath, `// ${filePath}\n// Loaded via Open Studio Quick Open\n`);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectNext(totalResults);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectPrevious(totalResults);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (totalResults === 0) return;

      if (mode === 'commands' && filteredCommands[selectedIndex]) {
        handleSelectCommand(filteredCommands[selectedIndex].item);
      } else if (mode === 'files' && filteredFiles[selectedIndex]) {
        handleSelectFile(filteredFiles[selectedIndex].item.relPath);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const nextMode: PaletteMode = mode === 'commands' ? 'files' : 'commands';
      setMode(nextMode);
    } else if (e.key === 'Backspace' && query === '') {
      // Toggle mode if backspacing on empty query
      if (mode === 'commands') {
        setMode('files');
      }
    }
  };

  const getCategoryBadgeClass = (category: CommandCategory) => {
    switch (category) {
      case 'AI Assistant':
        return 'bg-purple-900/50 text-purple-300 border-purple-600/50';
      case 'Git':
        return 'bg-amber-900/50 text-amber-300 border-amber-600/50';
      case 'File':
        return 'bg-sky-900/50 text-sky-300 border-sky-600/50';
      case 'Terminal':
        return 'bg-emerald-900/50 text-emerald-300 border-emerald-600/50';
      case 'Settings':
        return 'bg-rose-900/50 text-rose-300 border-rose-600/50';
      case 'View':
      default:
        return 'bg-slate-800/80 text-slate-300 border-slate-600/50';
    }
  };

  const getCategoryIcon = (category: CommandCategory) => {
    switch (category) {
      case 'AI Assistant':
        return <Sparkles size={13} className="text-purple-400" />;
      case 'Git':
        return <GitBranch size={13} className="text-amber-400" />;
      case 'File':
        return <FileText size={13} className="text-sky-400" />;
      case 'Terminal':
        return <Terminal size={13} className="text-emerald-400" />;
      case 'Settings':
        return <Settings size={13} className="text-rose-400" />;
      case 'View':
      default:
        return <FolderOpen size={13} className="text-slate-400" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-start pt-[10vh] bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={close}
      data-testid="command-palette-backdrop"
    >
      <div
        className="w-full max-w-2xl mx-4 bg-ide-sidebar border border-ide-border rounded-xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[72vh] text-ide-text border-t-ide-accent/40"
        onClick={(e) => e.stopPropagation()}
        data-testid="command-palette-modal"
      >
        {/* Top Search Bar */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-ide-border/80 bg-ide-bg/80">
          {mode === 'commands' ? (
            <Terminal size={18} className="text-ide-accent flex-shrink-0" />
          ) : (
            <Search size={18} className="text-amber-400 flex-shrink-0" />
          )}

          <div className="flex items-center gap-1.5 flex-1">
            <button
              type="button"
              onClick={() => setMode(mode === 'commands' ? 'files' : 'commands')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider font-semibold border transition ${
                mode === 'commands'
                  ? 'bg-ide-accent/20 border-ide-accent/50 text-ide-accent hover:bg-ide-accent/30'
                  : 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
              }`}
              title="Click or press Tab to switch mode"
            >
              {mode === 'commands' ? '> Commands' : '📄 Files'}
            </button>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'commands'
                  ? 'Type a command name or category...'
                  : 'Search files by name or relative path...'
              }
              className="w-full bg-transparent border-none outline-none text-sm text-ide-textBright placeholder-ide-textMuted/60 font-sans"
              autoFocus
              data-testid="command-palette-input"
            />
          </div>

          <button
            onClick={close}
            className="p-1 text-ide-textMuted hover:text-ide-textBright rounded hover:bg-ide-hover transition text-xs font-mono"
            title="Close (Esc)"
          >
            Esc
          </button>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="overflow-y-auto flex-1 p-1.5 divide-y divide-ide-border/20 custom-scrollbar max-h-[50vh]"
          data-testid="command-palette-results"
        >
          {totalResults === 0 ? (
            <div className="py-8 text-center text-ide-textMuted text-sm flex flex-col items-center gap-2">
              <Search size={24} className="opacity-40" />
              <span>No matching {mode === 'commands' ? 'commands' : 'files'} found</span>
              <span className="text-xs text-ide-textMuted/60">
                {mode === 'commands' ? 'Try typing a keyword or press Tab to search files' : 'Type > to switch to commands'}
              </span>
            </div>
          ) : mode === 'commands' ? (
            filteredCommands.map((match, idx) => {
              const cmd = match.item;
              const isSelected = idx === selectedIndex;
              const segments = fuzzyHighlight(cmd.title, match.matchedIndices);

              return (
                <div
                  key={cmd.id}
                  ref={(el) => (itemRefs.current[idx] = el)}
                  onClick={() => handleSelectCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition text-sm ${
                    isSelected
                      ? 'bg-ide-accent/15 text-ide-textBright border-l-2 border-ide-accent pl-2.5'
                      : 'text-ide-text hover:bg-ide-hover/50'
                  }`}
                  data-testid={`palette-command-${cmd.id}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="flex-shrink-0">{getCategoryIcon(cmd.category)}</span>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="truncate">
                        {segments.map((seg, sIdx) => (
                          <span
                            key={sIdx}
                            className={seg.isMatch ? 'text-ide-accent font-semibold underline decoration-ide-accent/50' : ''}
                          >
                            {seg.text}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getCategoryBadgeClass(
                        cmd.category
                      )}`}
                    >
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 text-[11px] font-mono rounded bg-ide-surface/90 border border-ide-border text-ide-textMuted shadow-sm">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            filteredFiles.map((match, idx) => {
              const file = match.item;
              const isSelected = idx === selectedIndex;
              const segments = fuzzyHighlight(file.name, match.matchedIndices);

              return (
                <div
                  key={file.relPath}
                  ref={(el) => (itemRefs.current[idx] = el)}
                  onClick={() => handleSelectFile(file.relPath)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition text-sm ${
                    isSelected
                      ? 'bg-amber-500/15 text-ide-textBright border-l-2 border-amber-500 pl-2.5'
                      : 'text-ide-text hover:bg-ide-hover/50'
                  }`}
                  data-testid={`palette-file-${file.relPath}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <FileText size={15} className="text-amber-400 flex-shrink-0" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate font-medium">
                        {segments.map((seg, sIdx) => (
                          <span
                            key={sIdx}
                            className={seg.isMatch ? 'text-amber-300 font-semibold underline decoration-amber-400/60' : ''}
                          >
                            {seg.text}
                          </span>
                        ))}
                      </span>
                      <span className="text-[11px] text-ide-textMuted truncate font-mono">
                        {file.relPath}
                      </span>
                    </div>
                  </div>

                  {file.isRecent && (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-ide-surface/80 border border-ide-border text-ide-textMuted flex-shrink-0 ml-2">
                      <Clock size={10} />
                      Recent
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Keyboard Guide Footer */}
        <div className="px-3.5 py-2 border-t border-ide-border/80 bg-ide-bg/60 flex items-center justify-between text-[11px] text-ide-textMuted select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Keyboard size={12} className="opacity-70" />
              <kbd className="font-mono bg-ide-surface/80 px-1 rounded border border-ide-border/60">↑</kbd>
              <kbd className="font-mono bg-ide-surface/80 px-1 rounded border border-ide-border/60">↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft size={12} className="opacity-70" />
              <span>select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-ide-surface/80 px-1 rounded border border-ide-border/60">Tab</kbd>
              <span>toggle mode</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-ide-textMuted/70">
            <span>Type <strong className="text-ide-accent font-mono">&gt;</strong> for commands</span>
          </div>
        </div>
      </div>
    </div>
  );
};

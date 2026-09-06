import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { 
  Terminal as TerminalIcon, 
  Plus, 
  Trash2, 
  X, 
  Maximize2, 
  Minimize2 
} from 'lucide-react';

interface TerminalPanelProps {
  onClose?: () => void;
}

interface TabSession {
  id: string;
  name: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ onClose }) => {
  const [sessions, setSessions] = useState<TabSession[]>([
    { id: 'term_1', name: '1: shell' }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>('term_1');
  const [isMaximized, setIsMaximized] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);

  // Spawns and attaches XTerm to current active session
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous terminal instance if any
    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }

    containerRef.current.innerHTML = '';

    const term = new XTerm({
      theme: {
        background: '#181818',
        foreground: '#cccccc',
        cursor: '#007acc',
        cursorAccent: '#181818',
        selectionBackground: 'rgba(38, 79, 120, 0.7)',
        black: '#1e1e1e',
        red: '#f44747',
        green: '#6a9955',
        yellow: '#dcdcaa',
        blue: '#569cd6',
        magenta: '#c586c0',
        cyan: '#4ec9b0',
        white: '#d4d4d4',
        brightBlack: '#808080',
        brightRed: '#d16969',
        brightGreen: '#b5cea8',
        brightYellow: '#ce9178',
        brightBlue: '#9cdcfe',
        brightMagenta: '#d7ba7d',
        brightCyan: '#4fc1ff',
        brightWhite: '#ffffff',
      },
      fontSize: 12,
      fontFamily: "'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
      cursorBlink: true,
      convertEol: true,
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    let isDisposed = false;

    async function initPty() {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const { listen } = await import('@tauri-apps/api/event');

        // Spawn real native PTY session
        await invoke('spawn_terminal_session', {
          id: activeSessionId,
          cols: term.cols || 80,
          rows: term.rows || 24,
        });

        // Listen to native PTY stdout/stderr stream
        const unlisten = await listen<string>(`terminal-data-${activeSessionId}`, (event) => {
          if (!isDisposed) {
            term.write(event.payload);
          }
        });
        unlistenRef.current = unlisten;

        // Forward stdin from user keystrokes to Rust PTY
        term.onData(async (data) => {
          try {
            await invoke('write_terminal_input', {
              id: activeSessionId,
              data,
            });
          } catch (err) {
            console.error('Failed to write terminal stdin:', err);
          }
        });

      } catch {
        // Browser dev server fallback mode: simulate interactive shell
        term.writeln('\x1b[38;2;86;156;214mOpen Studio Integrated Terminal\x1b[0m [Browser Dev Mode]');
        term.writeln('\x1b[90mNative PTY is active when running in Tauri desktop shell (npm run tauri dev).\x1b[0m\r\n');
        term.write('\x1b[32mopen-studio\x1b[0m:\x1b[34m~/workspace\x1b[0m$ ');

        let currentLine = '';
        term.onData((data) => {
          if (data === '\r') { // Enter
            term.writeln('');
            const cmd = currentLine.trim();
            if (cmd === 'clear') {
              term.clear();
            } else if (cmd === 'help') {
              term.writeln('Open Studio Terminal Commands:');
              term.writeln('  help     - Show available simulated commands');
              term.writeln('  clear    - Clear terminal buffer');
              term.writeln('  status   - Show AI engine readiness');
              term.writeln('  ls       - List workspace files');
            } else if (cmd === 'status') {
              term.writeln('\x1b[32m✔ Local AI Runtime: Online (Air-gapped)\x1b[0m');
              term.writeln('  Resident Model: qwen2.5-coder:1.5b');
            } else if (cmd === 'ls') {
              term.writeln('README.md  OPEN_STUDIO_EXECUTION_MASTERPLAN.md  src/  src-tauri/');
            } else if (cmd.length > 0) {
              term.writeln(`command executed: ${cmd}`);
            }
            currentLine = '';
            term.write('\x1b[32mopen-studio\x1b[0m:\x1b[34m~/workspace\x1b[0m$ ');
          } else if (data === '\u007F') { // Backspace
            if (currentLine.length > 0) {
              currentLine = currentLine.slice(0, -1);
              term.write('\b \b');
            }
          } else {
            currentLine += data;
            term.write(data);
          }
        });
      }
    }

    initPty();

    // Auto-fit terminal on container resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const cols = xtermRef.current.cols;
        const rows = xtermRef.current.rows;
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('resize_terminal', { id: activeSessionId, cols, rows }).catch(() => {});
        }).catch(() => {});
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      if (unlistenRef.current) {
        unlistenRef.current();
      }
      term.dispose();
      xtermRef.current = null;
    };
  }, [activeSessionId]);

  const handleAddSession = () => {
    const nextIdx = sessions.length + 1;
    const newId = `term_${Date.now()}`;
    const newSession: TabSession = {
      id: newId,
      name: `${nextIdx}: shell`,
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newId);
  };

  const handleCloseSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length === 1) return; // Keep at least one session

    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke('close_terminal_session', { id }).catch(() => {});
    }).catch(() => {});

    const remaining = sessions.filter(s => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id) {
      setActiveSessionId(remaining[0].id);
    }
  };

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  return (
    <div className={`flex flex-col bg-ide-panel border-t border-ide-border select-none ${isMaximized ? 'fixed inset-x-0 bottom-0 h-[80vh] z-50 shadow-2xl' : 'h-52'}`}>
      {/* Terminal Tab Header */}
      <div className="h-7 bg-ide-activityBar border-b border-ide-border flex items-center justify-between px-2 text-xs">
        {/* Left: Terminal Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto h-full">
          <span className="flex items-center gap-1.5 font-semibold text-ide-textBright text-[11px] px-2 py-1 uppercase tracking-wider text-ide-textMuted mr-1">
            <TerminalIcon size={12} className="text-ide-accent" />
            <span>TERMINAL</span>
          </span>

          {sessions.map(s => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`group flex items-center gap-1.5 px-2.5 py-1 text-xs cursor-pointer rounded-t border-t transition-colors ${
                  isActive 
                    ? 'bg-ide-bg text-ide-textBright border-ide-accent' 
                    : 'text-ide-textMuted hover:bg-ide-hover hover:text-ide-textNormal border-transparent'
                }`}
              >
                <span>{s.name}</span>
                {sessions.length > 1 && (
                  <button 
                    onClick={(e) => handleCloseSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={handleAddSession}
            title="New Terminal"
            className="p-1 rounded text-ide-textMuted hover:text-ide-textBright hover:bg-ide-hover transition ml-1"
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 text-ide-textMuted">
          <button
            onClick={handleClear}
            title="Clear Terminal"
            className="p-1 rounded hover:text-ide-textBright hover:bg-ide-hover transition"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? "Restore Size" : "Maximize Panel"}
            className="p-1 rounded hover:text-ide-textBright hover:bg-ide-hover transition"
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Close Panel"
              className="p-1 rounded hover:text-ide-textBright hover:bg-ide-hover transition"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Canvas Container */}
      <div 
        ref={containerRef} 
        className="flex-1 w-full h-full bg-[#181818] p-2 overflow-hidden" 
      />
    </div>
  );
};

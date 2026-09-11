import { create } from 'zustand';
import { DiagnosticRepairRequest } from '../types/repair';
import { FileDiff } from '../types/diff';
import { CapturedTerminalError } from '../types/terminal';
import { DiagnosticItem } from '../types/diagnostics';
import { executeDiagnosticRepair, applyRepairDiffs } from '../features/terminal/diagnosticRepair';
import { useTerminalErrorStore } from './terminalErrorStore';

interface DiagnosticRepairState {
  isOpen: boolean;
  isGenerating: boolean;
  isApplying: boolean;
  activeRequest: DiagnosticRepairRequest | null;
  streamedContent: string;
  parsedDiffs: FileDiff[];
  explanation: string;
  modelUsed: string | null;
  error: string | null;
  applied: boolean;

  // Actions
  startRepair: (request: DiagnosticRepairRequest) => Promise<void>;
  startRepairFromTerminal: (err: CapturedTerminalError) => Promise<void>;
  startRepairFromDiagnostic: (item: DiagnosticItem) => Promise<void>;
  applyFix: () => Promise<boolean>;
  closeModal: () => void;
  retryRepair: () => Promise<void>;
}

export const useDiagnosticRepairStore = create<DiagnosticRepairState>((set, get) => ({
  isOpen: false,
  isGenerating: false,
  isApplying: false,
  activeRequest: null,
  streamedContent: '',
  parsedDiffs: [],
  explanation: '',
  modelUsed: null,
  error: null,
  applied: false,

  startRepair: async (request: DiagnosticRepairRequest) => {
    set({
      isOpen: true,
      isGenerating: true,
      isApplying: false,
      activeRequest: request,
      streamedContent: '',
      parsedDiffs: [],
      explanation: '',
      modelUsed: null,
      error: null,
      applied: false,
    });

    try {
      const result = await executeDiagnosticRepair(request, (tokenDelta) => {
        set((state) => ({
          streamedContent: state.streamedContent + tokenDelta,
        }));
      });

      set({
        isGenerating: false,
        streamedContent: result.fullContent,
        parsedDiffs: result.diffs,
        explanation: result.explanation,
        modelUsed: result.modelUsed,
      });
    } catch (err: any) {
      set({
        isGenerating: false,
        error: err?.message || 'Failed to complete diagnostic repair inference',
      });
    }
  },

  startRepairFromTerminal: async (err: CapturedTerminalError) => {
    const request: DiagnosticRepairRequest = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sourceType: 'terminal',
      terminalError: err,
      filePath: err.filePath || 'src/main.rs',
      line: err.line,
      column: err.column,
      errorMessage: err.message,
      errorCode: err.errorCode,
      contextSnippet: err.contextSnippet || err.rawOutput,
      tool: err.tool,
    };

    await get().startRepair(request);
  },

  startRepairFromDiagnostic: async (item: DiagnosticItem) => {
    const request: DiagnosticRepairRequest = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sourceType: 'problem',
      diagnosticItem: item,
      filePath: item.filePath,
      line: item.range?.startLine,
      column: item.range?.startColumn,
      errorMessage: item.message,
      errorCode: item.code ? String(item.code) : undefined,
      tool: item.source || 'compiler',
    };

    await get().startRepair(request);
  },

  applyFix: async () => {
    const { parsedDiffs, activeRequest } = get();
    if (!parsedDiffs || parsedDiffs.length === 0) return false;

    set({ isApplying: true, error: null });

    const summary = activeRequest?.errorCode
      ? `AI Auto-Fix [${activeRequest.errorCode}]: ${activeRequest.errorMessage.slice(0, 60)}`
      : `AI Auto-Fix: ${activeRequest?.filePath || 'workspace'}`;

    const res = await applyRepairDiffs(parsedDiffs, summary);

    if (res.success) {
      set({ isApplying: false, applied: true });
      if (activeRequest?.terminalError) {
        useTerminalErrorStore.getState().markAsFixed(activeRequest.terminalError.id);
      }
      return true;
    } else {
      set({
        isApplying: false,
        error: res.error || 'Failed to apply surgical diff to target file',
      });
      return false;
    }
  },

  closeModal: () => {
    set({ isOpen: false });
  },

  retryRepair: async () => {
    const { activeRequest } = get();
    if (activeRequest) {
      await get().startRepair(activeRequest);
    }
  },
}));

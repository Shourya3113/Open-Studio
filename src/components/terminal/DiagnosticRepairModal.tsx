import React, { useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Check, 
  AlertCircle, 
  RotateCcw, 
  FileCode, 
  Loader2,
  GitBranch,
  SplitSquareVertical
} from 'lucide-react';
import { useDiagnosticRepairStore } from '../../stores/diagnosticRepairStore';
import { useDiffReviewStore } from '../../stores/diffReviewStore';

export const DiagnosticRepairModal: React.FC = () => {
  const {
    isOpen,
    isGenerating,
    isApplying,
    activeRequest,
    parsedDiffs,
    explanation,
    modelUsed,
    error,
    applied,
    applyFix,
    closeModal,
    retryRepair,
  } = useDiagnosticRepairStore();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeModal]);

  if (!isOpen || !activeRequest) return null;

  const handleOpenInMonacoDiff = async () => {
    if (parsedDiffs.length > 0) {
      closeModal();
      await useDiffReviewStore.getState().openReview(parsedDiffs);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="bg-[#1e1e1e] border border-ide-border/80 rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col text-ide-text overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-ide-border bg-ide-activityBar/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded bg-ide-accent/20 text-ide-accent">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-ide-textBright tracking-wide">
                  AI Diagnostic Repair
                </h3>
                {activeRequest.tool && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 uppercase border border-rose-500/30">
                    {activeRequest.tool}
                  </span>
                )}
                {modelUsed && (
                  <span className="text-[10px] font-mono text-ide-textMuted/80 bg-ide-bg px-1.5 py-0.2 rounded border border-ide-border/40">
                    {modelUsed}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ide-textMuted truncate">
                {activeRequest.filePath}
                {activeRequest.line ? `:${activeRequest.line}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={closeModal}
            className="p-1 rounded text-ide-textMuted hover:text-ide-textBright hover:bg-ide-hover transition"
            title="Close modal (Esc)"
          >
            <X size={14} />
          </button>
        </div>

        {/* Error Context Card */}
        <div className="p-3 bg-rose-950/20 border-b border-rose-500/20 text-xs space-y-1">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-rose-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-rose-200">
                {activeRequest.errorCode ? `[${activeRequest.errorCode}] ` : ''}
                {activeRequest.errorMessage}
              </span>
            </div>
          </div>
          {activeRequest.contextSnippet && (
            <pre className="mt-1.5 p-2 rounded bg-black/40 text-[11px] font-mono text-rose-200/80 overflow-x-auto whitespace-pre leading-relaxed border border-rose-500/10">
              {activeRequest.contextSnippet}
            </pre>
          )}
        </div>

        {/* Modal Body: Generating, Explanation, or Diff Preview */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs select-text">
          {isGenerating ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 size={24} className="text-ide-accent animate-spin" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-ide-textBright">
                  Diagnosing Error & Synthesizing Frugal Diff...
                </p>
                <p className="text-[11px] text-ide-textMuted">
                  Running air-gapped code model to pinpoint root cause with minimal edits.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="p-3 rounded bg-rose-500/15 border border-rose-500/30 text-rose-200 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-rose-400" />
                <span className="text-xs">{error}</span>
              </div>
              <button
                onClick={retryRepair}
                className="px-2 py-1 rounded bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 text-xs font-medium transition flex items-center gap-1 flex-shrink-0"
              >
                <RotateCcw size={12} />
                <span>Retry</span>
              </button>
            </div>
          ) : (
            <>
              {/* Explanation */}
              {explanation && (
                <div className="p-3 rounded bg-ide-activityBar/30 border border-ide-border/60 text-ide-textBright text-xs leading-relaxed space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-ide-accent tracking-wider">
                    Root Cause Diagnosis
                  </div>
                  <p>{explanation}</p>
                </div>
              )}

              {/* Diffs Preview */}
              {parsedDiffs.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-[10px] uppercase font-semibold text-ide-textMuted tracking-wider flex items-center justify-between">
                    <span>Proposed Surgical Changes</span>
                    <span className="font-mono text-ide-accent">
                      {parsedDiffs.reduce((acc, f) => acc + f.hunks.length, 0)} hunk(s)
                    </span>
                  </div>

                  {parsedDiffs.map((fileDiff, fIdx) => (
                    <div 
                      key={fIdx} 
                      className="border border-ide-border rounded overflow-hidden bg-ide-bg text-[11px]"
                    >
                      <div className="px-2.5 py-1.5 bg-ide-activityBar/80 border-b border-ide-border flex items-center gap-1.5 text-ide-textBright font-mono">
                        <FileCode size={13} className="text-sky-400" />
                        <span>{fileDiff.filePath}</span>
                      </div>

                      <div className="divide-y divide-ide-border/40 font-mono">
                        {fileDiff.hunks.map((hunk, hIdx) => (
                          <div key={hIdx} className="p-2 space-y-1 bg-[#141414]">
                            {/* SEARCH BLOCK (REMOVAL) */}
                            <div className="p-1.5 rounded bg-rose-950/40 border border-rose-500/30 text-rose-200 whitespace-pre overflow-x-auto">
                              <span className="select-none text-rose-500 font-bold mr-2">-</span>
                              {hunk.search}
                            </div>

                            {/* REPLACE BLOCK (ADDITION) */}
                            <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 whitespace-pre overflow-x-auto">
                              <span className="select-none text-emerald-500 font-bold mr-2">+</span>
                              {hunk.replace}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-ide-textMuted text-xs">
                  No structured diffs could be parsed from the model response.
                </div>
              )}

              {/* Success state */}
              {applied && (
                <div className="p-3 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex items-center gap-2 text-xs">
                  <Check size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>
                    Fix successfully applied to workspace! Shadow git checkpoint created.
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-4 py-2.5 border-t border-ide-border bg-ide-activityBar/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-ide-textMuted">
            <GitBranch size={12} className="text-emerald-400" />
            <span>Safety Snapshot Active</span>
          </div>

          <div className="flex items-center gap-2">
            {applied ? (
              <button
                onClick={closeModal}
                className="px-3 py-1 rounded bg-ide-accent hover:bg-ide-accent/90 text-white text-xs font-semibold transition shadow"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  onClick={closeModal}
                  disabled={isApplying}
                  className="px-3 py-1 rounded bg-ide-hover hover:bg-ide-hover/80 text-ide-text text-xs transition"
                >
                  Cancel
                </button>

                {parsedDiffs.length > 0 && (
                  <button
                    onClick={handleOpenInMonacoDiff}
                    disabled={isApplying}
                    className="px-3 py-1 rounded bg-ide-hover hover:bg-ide-hover/80 text-ide-textBright text-xs transition flex items-center gap-1.5 border border-ide-border"
                    title="Open side-by-side Monaco diff inspector"
                  >
                    <SplitSquareVertical size={13} />
                    <span>Review in Editor</span>
                  </button>
                )}

                <button
                  onClick={applyFix}
                  disabled={isGenerating || isApplying || parsedDiffs.length === 0}
                  className="px-3.5 py-1 rounded bg-ide-accent hover:bg-ide-accent/90 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow"
                >
                  {isApplying ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Applying...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>⚡ Apply Fix (1-Click)</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

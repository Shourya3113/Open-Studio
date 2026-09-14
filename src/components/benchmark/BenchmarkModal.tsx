import React, { useEffect, useState } from 'react';
import {
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  Play,
  Download,
  RefreshCw,
  Clock,
  ShieldCheck,
  FileCode,
  Database,
  Cpu,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useBenchmarkStore } from '../../stores/benchmarkStore';
import { BenchmarkCategoryResult, BenchmarkMetric } from '../../features/benchmark/benchmarkRunner';

export const BenchmarkModal: React.FC = () => {
  const {
    isOpen,
    isRunning,
    currentStage,
    lastReport,
    history,
    close,
    runSuite,
    exportReportJson,
    clearHistory,
  } = useBenchmarkStore();

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    fim: true,
    frugal_diff: true,
    bm25_index: true,
    vector_store: true,
    audit_ledger: true,
    memory_sentinel: true,
  });

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleRunSuite = async () => {
    try {
      await runSuite();
    } catch (err) {
      console.error('Failed to run benchmark suite:', err);
    }
  };

  const handleExport = () => {
    const jsonStr = exportReportJson();
    if (!jsonStr || jsonStr === '{}') {
      setExportNotice('No benchmark report available yet. Run the suite first.');
      setTimeout(() => setExportNotice(null), 3000);
      return;
    }

    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `benchmark-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportNotice('Benchmark report exported successfully!');
      setTimeout(() => setExportNotice(null), 3000);
    } catch {
      // Fallback to clipboard
      navigator.clipboard.writeText(jsonStr);
      setExportNotice('Report copied to clipboard!');
      setTimeout(() => setExportNotice(null), 3000);
    }
  };

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'fim':
      case 'fim_inference':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'frugal_diff':
        return <FileCode className="w-4 h-4 text-blue-400" />;
      case 'bm25_index':
      case 'bm25_indexing':
      case 'vector_store':
        return <Database className="w-4 h-4 text-teal-400" />;
      case 'audit_ledger':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'memory_sentinel':
        return <Cpu className="w-4 h-4 text-purple-400" />;
      default:
        return <Activity className="w-4 h-4 text-sky-400" />;
    }
  };

  // Helper to grab specific metric from report
  const findMetric = (metricId: string): BenchmarkMetric | undefined => {
    if (!lastReport) return undefined;
    for (const cat of lastReport.categories) {
      const found = cat.metrics.find((m) => m.id === metricId);
      if (found) return found;
    }
    return undefined;
  };

  const fimTtft = findMetric('fim_ttft');
  const diffTime = findMetric('diff_apply_latency') || findMetric('diff_apply_time');
  const diffSavings = findMetric('diff_token_savings');
  const searchLatency = findMetric('bm25_query_latency') || findMetric('bm25_search_latency');
  const ledgerThroughput = findMetric('audit_hash_rate');
  const memLatency = findMetric('memory_profile_latency') || findMetric('memory_profile_time');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Performance Benchmark Modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="bg-[#1e1e1e] border border-[#3e3e42] rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col text-[#cccccc] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d2d30] bg-[#252526]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-wide">
                  IDE Performance Benchmarks & SLO Diagnostics
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 rounded-full">
                  100% Offline
                </span>
              </div>
              <p className="text-xs text-[#858585] mt-0.5">
                Verify sub-40ms FIM TTFT, frugal diff latency, RAG indexing, and cryptographic ledger hash rates.
              </p>
            </div>
          </div>
          <button
            onClick={close}
            className="text-[#858585] hover:text-white p-1.5 rounded-md hover:bg-[#333333] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Status Toolbar */}
        <div className="px-6 py-3 border-b border-[#2d2d30] bg-[#202022] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isRunning ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-medium animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Benchmarking IDE subsystems...</span>
              </div>
            ) : lastReport ? (
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold ${
                    lastReport.overallPassed
                      ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-400'
                      : 'bg-rose-950/50 border border-rose-500/40 text-rose-400'
                  }`}
                >
                  {lastReport.overallPassed ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{lastReport.overallPassed ? 'ALL SLOS PASSED' : 'SLO BREACHED'}</span>
                </div>
                <div className="text-xs text-[#858585] flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#6e6e6e]" />
                  <span>Total duration: {lastReport.totalDurationMs}ms</span>
                  <span>•</span>
                  <span>
                    Passed: {lastReport.summary.passedCount}/{lastReport.summary.totalTests}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#858585]">
                Suite has not been executed in this session. Click &quot;Run Benchmark Suite&quot; to begin.
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunSuite}
              disabled={isRunning}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#0e639c] hover:bg-[#1177bb] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium shadow transition-colors"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Benchmark Suite</span>
                </>
              )}
            </button>

            <button
              onClick={handleExport}
              disabled={!lastReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#2d2d30] hover:bg-[#3e3e42] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-[#cccccc] hover:text-white border border-[#3e3e42] transition-colors"
              title="Export report as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>

            {history.length > 1 && (
              <button
                onClick={clearHistory}
                className="p-1.5 rounded hover:bg-[#333333] text-[#858585] hover:text-rose-400 transition-colors"
                title="Clear Benchmark History"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Stage Progress Alert */}
        {isRunning && currentStage && (
          <div className="px-6 py-2 bg-sky-950/30 border-b border-sky-800/30 text-sky-300 text-xs flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 animate-pulse text-sky-400" />
            <span>Active Stage: {currentStage}</span>
          </div>
        )}

        {/* Notice Message */}
        {exportNotice && (
          <div className="px-6 py-2 bg-emerald-950/40 border-b border-emerald-800/30 text-emerald-300 text-xs flex items-center justify-between">
            <span>{exportNotice}</span>
            <button onClick={() => setExportNotice(null)} className="text-emerald-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Card 1: FIM TTFT */}
            <div className="bg-[#252526] p-3 rounded-lg border border-[#2d2d30] flex flex-col justify-between">
              <div className="text-[11px] font-medium text-[#858585] flex items-center justify-between">
                <span>FIM TTFT (P50)</span>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="my-2">
                <div className="text-lg font-bold text-white tracking-tight">
                  {fimTtft ? `${fimTtft.value} ms` : '—'}
                </div>
                <div className="text-[10px] text-[#71717a]">Target: &lt; 40ms</div>
              </div>
              <div
                className={`text-[10px] font-semibold flex items-center gap-1 ${
                  fimTtft?.passed ? 'text-emerald-400' : fimTtft ? 'text-rose-400' : 'text-[#71717a]'
                }`}
              >
                {fimTtft?.passed ? '✓ PASSED' : fimTtft ? '✗ BREACHED' : 'PENDING'}
              </div>
            </div>

            {/* Card 2: Diff Latency */}
            <div className="bg-[#252526] p-3 rounded-lg border border-[#2d2d30] flex flex-col justify-between">
              <div className="text-[11px] font-medium text-[#858585] flex items-center justify-between">
                <span>Diff Application</span>
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="my-2">
                <div className="text-lg font-bold text-white tracking-tight">
                  {diffTime ? `${diffTime.value} ms` : '—'}
                </div>
                <div className="text-[10px] text-[#71717a]">Target: &lt; 15ms</div>
              </div>
              <div
                className={`text-[10px] font-semibold flex items-center gap-1 ${
                  diffTime?.passed ? 'text-emerald-400' : diffTime ? 'text-rose-400' : 'text-[#71717a]'
                }`}
              >
                {diffTime?.passed ? '✓ PASSED' : diffTime ? '✗ BREACHED' : 'PENDING'}
              </div>
            </div>

            {/* Card 3: Token Reduction */}
            <div className="bg-[#252526] p-3 rounded-lg border border-[#2d2d30] flex flex-col justify-between">
              <div className="text-[11px] font-medium text-[#858585] flex items-center justify-between">
                <span>Token Savings</span>
                <span className="text-emerald-400 font-bold text-xs">%</span>
              </div>
              <div className="my-2">
                <div className="text-lg font-bold text-emerald-400 tracking-tight">
                  {diffSavings ? `${diffSavings.value}%` : '—'}
                </div>
                <div className="text-[10px] text-[#71717a]">Target: &gt; 90%</div>
              </div>
              <div
                className={`text-[10px] font-semibold flex items-center gap-1 ${
                  diffSavings?.passed ? 'text-emerald-400' : diffSavings ? 'text-rose-400' : 'text-[#71717a]'
                }`}
              >
                {diffSavings?.passed ? '✓ PASSED' : diffSavings ? '✗ BREACHED' : 'PENDING'}
              </div>
            </div>

            {/* Card 4: Search Latency */}
            <div className="bg-[#252526] p-3 rounded-lg border border-[#2d2d30] flex flex-col justify-between">
              <div className="text-[11px] font-medium text-[#858585] flex items-center justify-between">
                <span>BM25 Search</span>
                <Database className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <div className="my-2">
                <div className="text-lg font-bold text-white tracking-tight">
                  {searchLatency ? `${searchLatency.value} ms` : '—'}
                </div>
                <div className="text-[10px] text-[#71717a]">Target: &lt; 10ms</div>
              </div>
              <div
                className={`text-[10px] font-semibold flex items-center gap-1 ${
                  searchLatency?.passed ? 'text-emerald-400' : searchLatency ? 'text-rose-400' : 'text-[#71717a]'
                }`}
              >
                {searchLatency?.passed ? '✓ PASSED' : searchLatency ? '✗ BREACHED' : 'PENDING'}
              </div>
            </div>

            {/* Card 5: Ledger Throughput */}
            <div className="bg-[#252526] p-3 rounded-lg border border-[#2d2d30] flex flex-col justify-between">
              <div className="text-[11px] font-medium text-[#858585] flex items-center justify-between">
                <span>Audit SHA-256</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="my-2">
                <div className="text-lg font-bold text-white tracking-tight">
                  {ledgerThroughput ? `${ledgerThroughput.value.toLocaleString()}` : '—'}
                </div>
                <div className="text-[10px] text-[#71717a]">Target: &gt; 5k ops/s</div>
              </div>
              <div
                className={`text-[10px] font-semibold flex items-center gap-1 ${
                  ledgerThroughput?.passed ? 'text-emerald-400' : ledgerThroughput ? 'text-rose-400' : 'text-[#71717a]'
                }`}
              >
                {ledgerThroughput?.passed ? '✓ PASSED' : ledgerThroughput ? '✗ BREACHED' : 'PENDING'}
              </div>
            </div>

            {/* Card 6: Sentinel Memory Profile */}
            <div className="bg-[#252526] p-3 rounded-lg border border-[#2d2d30] flex flex-col justify-between">
              <div className="text-[11px] font-medium text-[#858585] flex items-center justify-between">
                <span>Hardware Sentinel</span>
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="my-2">
                <div className="text-lg font-bold text-white tracking-tight">
                  {memLatency ? `${memLatency.value} ms` : '—'}
                </div>
                <div className="text-[10px] text-[#71717a]">Target: &lt; 25ms</div>
              </div>
              <div
                className={`text-[10px] font-semibold flex items-center gap-1 ${
                  memLatency?.passed ? 'text-emerald-400' : memLatency ? 'text-rose-400' : 'text-[#71717a]'
                }`}
              >
                {memLatency?.passed ? '✓ PASSED' : memLatency ? '✗ BREACHED' : 'PENDING'}
              </div>
            </div>
          </div>

          {/* Detailed Categories */}
          {lastReport ? (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#4ec9b0] flex items-center gap-2">
                <span>Subsystem Diagnostic Reports</span>
                <span className="text-[10px] font-normal text-[#858585]">
                  ({lastReport.categories.length} subsystems evaluated)
                </span>
              </h3>

              {lastReport.categories.map((category: BenchmarkCategoryResult) => {
                const isExpanded = expandedCategories[category.id] ?? true;
                return (
                  <div
                    key={category.id}
                    className="bg-[#252526] rounded-lg border border-[#2d2d30] overflow-hidden"
                  >
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#2a2a2d] transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#858585]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#858585]" />
                        )}
                        <div className="p-1.5 rounded bg-[#1e1e1e] border border-[#3e3e42]">
                          {getCategoryIcon(category.id)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{category.title}</div>
                          <div className="text-[11px] text-[#858585]">
                            Duration: {category.durationMs}ms • {category.metrics.length} metrics checked
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 ${
                            category.passed
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {category.passed ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>PASSED</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>BREACHED</span>
                            </>
                          )}
                        </span>
                      </div>
                    </button>

                    {/* Metrics Table */}
                    {isExpanded && (
                      <div className="border-t border-[#2d2d30] bg-[#1e1e1e]/60 divide-y divide-[#2d2d30]/60">
                        {category.metrics.map((metric) => (
                          <div
                            key={metric.id}
                            className="px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-[#252526]/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="text-xs font-medium text-white flex items-center gap-2">
                                <span>{metric.name}</span>
                                <span className="text-[10px] text-[#71717a] font-mono">[{metric.id}]</span>
                              </div>
                              <div className="text-[11px] text-[#858585] mt-0.5">{metric.description}</div>
                            </div>

                            <div className="flex items-center gap-6 justify-between md:justify-end text-xs">
                              <div>
                                <span className="text-[#858585] text-[11px] mr-1.5">Target:</span>
                                <span className="font-mono text-[#cccccc]">
                                  {metric.comparison === 'lt' ? '<' : '>'} {metric.target} {metric.unit}
                                </span>
                              </div>

                              <div className="min-w-[90px] text-right">
                                <span className="text-[#858585] text-[11px] mr-1.5">Observed:</span>
                                <span
                                  className={`font-mono font-bold ${
                                    metric.passed ? 'text-white' : 'text-rose-400'
                                  }`}
                                >
                                  {metric.value.toLocaleString()} {metric.unit}
                                </span>
                              </div>

                              <div className="min-w-[70px] text-right">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    metric.passed
                                      ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/40'
                                      : 'bg-rose-900/30 text-rose-400 border border-rose-700/40'
                                  }`}
                                >
                                  {metric.passed ? 'PASS' : 'FAIL'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#252526] border border-[#2d2d30] rounded-xl p-10 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Local IDE Performance Diagnostic Battery</h4>
                <p className="text-xs text-[#858585] max-w-md mx-auto mt-1">
                  Evaluate real-time Time-to-First-Token (TTFT), 5,000-line frugal diff patching, BM25 indexing,
                  vector store cosine search, and SHA-256 audit ledger hash rates against strict SLOs.
                </p>
              </div>
              <button
                onClick={handleRunSuite}
                disabled={isRunning}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e639c] hover:bg-[#1177bb] text-white text-xs font-semibold shadow transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Run Diagnostic Battery</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#2d2d30] bg-[#252526] flex items-center justify-between text-xs text-[#858585]">
          <div className="flex items-center gap-2">
            <span>SLO Standard: P50 &lt; 40ms TTFT • &gt; 90% Diff Token Savings • &gt; 5,000 ops/s SHA-256</span>
          </div>
          <button
            onClick={close}
            className="px-4 py-1.5 rounded bg-[#333333] hover:bg-[#3e3e42] text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import { describe, it, expect, beforeEach } from 'vitest';
import {
  benchmarkFimLatency,
  benchmarkFrugalDiff,
  benchmarkCodebaseIndexing,
  benchmarkVectorStore,
  benchmarkAuditLedger,
  benchmarkMemorySentinel,
  runFullBenchmarkSuite,
  BenchmarkMetric,
} from './benchmarkRunner';
import { useBenchmarkStore } from '../../stores/benchmarkStore';

describe('Performance Benchmarking Engine (benchmarkRunner)', () => {
  it('measures FIM latency and generation throughput with sub-40ms target', async () => {
    const result = await benchmarkFimLatency();
    expect(result.id).toBe('fim_inference');
    expect(result.title).toContain('FIM Autocomplete');
    expect(result.metrics.length).toBeGreaterThanOrEqual(3);

    const ttft = result.metrics.find((m) => m.id === 'fim_ttft') as BenchmarkMetric;
    expect(ttft).toBeDefined();
    expect(ttft.target).toBe(40.0);
    expect(ttft.comparison).toBe('lt');
    expect(ttft.unit).toBe('ms');
    expect(ttft.value).toBeGreaterThan(0);

    const throughput = result.metrics.find((m) => m.id === 'fim_throughput');
    expect(throughput).toBeDefined();
    expect(throughput!.unit).toBe('tok/s');
    expect(throughput!.value).toBeGreaterThan(0);
  });

  it('measures 5,000-line multi-hunk frugal diff application and token compression', async () => {
    const result = await benchmarkFrugalDiff();
    expect(result.id).toBe('frugal_diff');
    expect(result.metrics.length).toBe(2);

    const applyTime = result.metrics.find((m) => m.id === 'diff_apply_latency') as BenchmarkMetric;
    expect(applyTime).toBeDefined();
    expect(applyTime.target).toBe(15.0);
    expect(applyTime.passed).toBe(true); // Should easily pass sub-15ms

    const tokenSavings = result.metrics.find((m) => m.id === 'diff_token_savings') as BenchmarkMetric;
    expect(tokenSavings).toBeDefined();
    expect(tokenSavings.target).toBe(90.0);
    expect(tokenSavings.comparison).toBe('gt');
    expect(tokenSavings.value).toBeGreaterThan(90.0); // Frugal diff compresses >90% of tokens
    expect(tokenSavings.passed).toBe(true);
  });

  it('measures BM25 indexing throughput and query latency', async () => {
    const result = await benchmarkCodebaseIndexing();
    expect(result.id).toBe('bm25_indexing');
    expect(result.metrics.length).toBe(2);

    const searchLatency = result.metrics.find((m) => m.id === 'bm25_query_latency') as BenchmarkMetric;
    expect(searchLatency).toBeDefined();
    expect(searchLatency.target).toBe(10.0);
    expect(searchLatency.passed).toBe(true);

    const indexRate = result.metrics.find((m) => m.id === 'bm25_throughput') as BenchmarkMetric;
    expect(indexRate).toBeDefined();
    expect(indexRate.unit).toBe('MB/s');
    expect(indexRate.value).toBeGreaterThan(1.0);
  });

  it('measures in-memory vector store cosine search across 1,000 vectors', async () => {
    const result = await benchmarkVectorStore();
    expect(result.id).toBe('vector_store');
    expect(result.metrics.length).toBe(1);

    const searchTime = result.metrics.find((m) => m.id === 'vector_search_latency') as BenchmarkMetric;
    expect(searchTime).toBeDefined();
    expect(searchTime.target).toBe(10.0);
    expect(searchTime.passed).toBe(true);
  });

  it('measures SHA-256 audit ledger hash rate and integrity verification', async () => {
    const result = await benchmarkAuditLedger();
    expect(result.id).toBe('audit_ledger');
    expect(result.metrics.length).toBe(2);

    const hashRate = result.metrics.find((m) => m.id === 'audit_hash_rate') as BenchmarkMetric;
    expect(hashRate).toBeDefined();
    expect(hashRate.target).toBe(5000);
    expect(hashRate.unit).toBe('events/s');
    expect(hashRate.value).toBeGreaterThan(0);

    const verifyTime = result.metrics.find((m) => m.id === 'audit_verify_latency') as BenchmarkMetric;
    expect(verifyTime).toBeDefined();
    expect(verifyTime.target).toBe(15.0);
    expect(verifyTime.unit).toBe('ms');
    expect(verifyTime.passed).toBe(true);
  });

  it('measures memory sentinel profiling latency and tier classification', async () => {
    const result = await benchmarkMemorySentinel();
    expect(result.id).toBe('memory_sentinel');
    expect(result.metrics.length).toBe(1);

    const profileTime = result.metrics.find((m) => m.id === 'memory_profile_latency') as BenchmarkMetric;
    expect(profileTime).toBeDefined();
    expect(profileTime.target).toBe(5.0);
    expect(profileTime.passed).toBe(true);
  });

  it('executes full benchmark suite and triggers progress updates', async () => {
    const stages: string[] = [];
    const report = await runFullBenchmarkSuite((stage) => {
      stages.push(stage);
    });

    expect(stages.length).toBe(6);
    expect(report.categories.length).toBe(6);
    expect(report.summary.totalTests).toBeGreaterThanOrEqual(10);
    expect(report.summary.passedCount).toBeGreaterThan(0);
    expect(report.totalDurationMs).toBeGreaterThan(0);
    expect(report.version).toBe('0.1.0');
    expect(report.timestamp).toBeGreaterThan(0);
  });
});

describe('useBenchmarkStore (Zustand Store)', () => {
  beforeEach(() => {
    useBenchmarkStore.setState({
      isOpen: false,
      isRunning: false,
      currentStage: null,
      lastReport: null,
      history: [],
    });
  });

  it('controls modal visibility', () => {
    expect(useBenchmarkStore.getState().isOpen).toBe(false);
    useBenchmarkStore.getState().open();
    expect(useBenchmarkStore.getState().isOpen).toBe(true);
    useBenchmarkStore.getState().close();
    expect(useBenchmarkStore.getState().isOpen).toBe(false);
  });

  it('runs the full benchmark suite, stores report, and retains history', async () => {
    const store = useBenchmarkStore.getState();
    expect(store.lastReport).toBeNull();
    expect(store.history.length).toBe(0);

    const report = await store.runSuite();
    const updated = useBenchmarkStore.getState();

    expect(updated.isRunning).toBe(false);
    expect(updated.currentStage).toBeNull();
    expect(updated.lastReport).toBe(report);
    expect(updated.history.length).toBe(1);
    expect(updated.history[0]).toBe(report);

    // Export report as JSON string
    const jsonStr = updated.exportReportJson();
    expect(typeof jsonStr).toBe('string');
    const parsed = JSON.parse(jsonStr);
    expect(parsed.version).toBe('0.1.0');
    expect(parsed.categories.length).toBe(6);

    // Clear history
    updated.clearHistory();
    expect(useBenchmarkStore.getState().history.length).toBe(0);
  });

  it('returns empty JSON string when no report has been generated', () => {
    const store = useBenchmarkStore.getState();
    expect(store.exportReportJson()).toBe('{}');
  });
});

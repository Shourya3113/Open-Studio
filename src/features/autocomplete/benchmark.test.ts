import { describe, it, expect } from 'vitest';
import { autocompleteTracker } from './benchmark';

describe('Autocomplete Benchmark & Latency Telemetry', () => {
  it('calculates accurate percentile metrics (p50, p95, p99, mean)', () => {
    const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const stats = autocompleteTracker.calculateStats(data);

    expect(stats.samples).toBe(10);
    expect(stats.minMs).toBe(10);
    expect(stats.maxMs).toBe(100);
    expect(stats.meanMs).toBe(55);
    expect(stats.p50Ms).toBe(60);
    expect(stats.p95Ms).toBe(100);
  });

  it('maintains rolling window of max 50 latency samples', () => {
    for (let i = 1; i <= 60; i++) {
      autocompleteTracker.recordLatency(25);
    }
    const metrics = autocompleteTracker.getMetrics();
    expect(metrics.sampleCount).toBeLessThanOrEqual(50);
  });

  it('tracks acceptance rate accurately', () => {
    const initial = autocompleteTracker.getMetrics();
    autocompleteTracker.recordAccept();
    autocompleteTracker.recordDismiss();

    const updated = autocompleteTracker.getMetrics();
    expect(updated.acceptedCount).toBe(initial.acceptedCount + 1);
    expect(updated.dismissedCount).toBe(initial.dismissedCount + 1);
    expect(updated.acceptanceRate).toBeGreaterThanOrEqual(0);
    expect(updated.acceptanceRate).toBeLessThanOrEqual(100);
  });

  it('runs synthetic typing burst benchmark and measures latency within budget', async () => {
    const stats = await autocompleteTracker.runBenchmarkBurst(5);
    expect(stats.samples).toBe(5);
    expect(stats.meanMs).toBeGreaterThan(0);
    expect(stats.p50Ms).toBeLessThan(60);
  });

  it('notifies subscribers on metric updates', () => {
    let callCount = 0;
    const unsubscribe = autocompleteTracker.subscribe(() => {
      callCount++;
    });

    autocompleteTracker.recordLatency(34);
    expect(callCount).toBeGreaterThanOrEqual(2); // Initial subscribe + recordLatency

    unsubscribe();
  });
});

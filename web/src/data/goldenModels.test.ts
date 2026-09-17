import { describe, it, expect } from 'vitest';
import { GOLDEN_MODELS, queryModels, getModelById } from './goldenModels';

describe('Open Studio Sovereign Model Hub Registry', () => {
  it('contains verified Golden Coding Suite models', () => {
    expect(GOLDEN_MODELS.length).toBeGreaterThanOrEqual(6);
    expect(GOLDEN_MODELS.some((m) => m.id.includes('qwen2.5-coder-1.5b'))).toBe(true);
    expect(GOLDEN_MODELS.some((m) => m.id.includes('qwen2.5-coder-7b'))).toBe(true);
    expect(GOLDEN_MODELS.some((m) => m.id.includes('deepseek-r1-8b'))).toBe(true);
  });

  it('verifies all golden models have valid SHA-256 hashes and memory requirements', () => {
    for (const model of GOLDEN_MODELS) {
      expect(model.sha256).toMatch(/^[a-f0-9]{64}$/i);
      expect(model.memoryRequirement).toBeDefined();
      expect(model.fileSizeBytes).toBeGreaterThan(0);
      expect(model.recommendedTier).toBeDefined();
      expect(model.benchmarks.patchPrecisionPct).toBeGreaterThan(90);
    }
  });

  it('filters models by hardware tier accurately', () => {
    const tier1Models = queryModels({ tier: 'Tier 1: Heavyweight' });
    expect(tier1Models.length).toBeGreaterThan(0);
    expect(tier1Models.every((m) => m.recommendedTier === 'Tier 1: Heavyweight')).toBe(true);

    const tier3Models = queryModels({ tier: 'Tier 3: Budget / Constrained' });
    expect(tier3Models.length).toBeGreaterThan(0);
    expect(tier3Models.every((m) => m.recommendedTier === 'Tier 3: Budget / Constrained')).toBe(true);
  });

  it('filters models by operational role', () => {
    const fimModels = queryModels({ role: 'autocomplete' });
    expect(fimModels.length).toBeGreaterThan(0);
    expect(fimModels.every((m) => m.roles.includes('autocomplete'))).toBe(true);

    const reasoningModels = queryModels({ role: 'reasoning' });
    expect(reasoningModels.length).toBeGreaterThan(0);
    expect(reasoningModels.every((m) => m.roles.includes('reasoning'))).toBe(true);
  });

  it('searches models by architecture and keyword', () => {
    const qwenResults = queryModels({ search: 'qwen' });
    expect(qwenResults.length).toBeGreaterThanOrEqual(3);

    const rustResults = queryModels({ search: 'rust' });
    expect(rustResults.length).toBeGreaterThanOrEqual(1);
    expect(rustResults[0].id).toContain('rust-tokio');
  });

  it('retrieves specific model by ID', () => {
    const model = getModelById('openstudio/qwen2.5-coder-1.5b-fim');
    expect(model).toBeDefined();
    expect(model?.name).toContain('1.5B');
    expect(model?.quantization).toBe('Q4_K_M');
  });
});

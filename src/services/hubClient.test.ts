import { describe, it, expect, vi, afterEach } from 'vitest';
import { HubClient } from './hubClient';

describe('HubClient (Desktop IDE to openstudio.com Integration)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('generates valid desktop deep-link URI', () => {
    const client = new HubClient();
    const uri = client.getDeepLinkUri('openstudio/qwen2.5-coder-7b-instruct');
    expect(uri).toBe('openstudio://models/install?id=openstudio%2Fqwen2.5-coder-7b-instruct');
  });

  it('queries embedded verified catalog when offline', async () => {
    const client = new HubClient();
    global.fetch = vi.fn().mockRejectedValue(new Error('Air-gap offline mode'));

    const models = await client.fetchCatalog({ tier: 'Tier 2: Standard' });
    expect(models.length).toBeGreaterThan(0);
    expect(models.every((m) => m.recommendedTier === 'Tier 2: Standard')).toBe(true);
  });

  it('queries remote API when online', async () => {
    const client = new HubClient('https://openstudio.com'); // airgap-allow: mock testing endpoint
    const mockData = [
      {
        id: 'mock/model:7b',
        name: 'Mock Model 7B',
        parameterCount: '7B',
        recommendedTier: 'Tier 2: Standard',
        roles: ['chat'],
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as any);

    const models = await client.fetchCatalog({ search: 'mock' });
    expect(models).toEqual(mockData);
  });

  it('retrieves model details accurately', async () => {
    const client = new HubClient();
    const model = await client.getModelDetails('openstudio/qwen2.5-coder-1.5b-fim');
    expect(model).toBeDefined();
    expect(model?.name).toContain('1.5B');
    expect(model?.quantization).toBe('Q4_K_M');
  });
});

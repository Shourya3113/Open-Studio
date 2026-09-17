import { describe, it, expect } from 'vitest';
import { GOLDEN_MODELS, queryModels } from '../../../web/src/data/goldenModels';
import { HubClient } from '../../services/hubClient';

describe('ModelHubModal & Desktop Ecosystem Integration', () => {
  it('loads the golden model registry with complete metadata', () => {
    expect(GOLDEN_MODELS.length).toBeGreaterThanOrEqual(6);
    const fimModel = GOLDEN_MODELS.find((m) => m.roles.includes('autocomplete'));
    expect(fimModel).toBeDefined();
    expect(fimModel?.recommendedTier).toBeDefined();
  });

  it('filters models matching user hardware profiles', () => {
    const tier2List = queryModels({ tier: 'Tier 2: Standard' });
    expect(tier2List.length).toBeGreaterThan(0);
    expect(tier2List.some((m) => m.name.includes('7B'))).toBe(true);
  });

  it('generates working protocol deep links for desktop installs', () => {
    const client = new HubClient();
    for (const model of GOLDEN_MODELS) {
      const uri = client.getDeepLinkUri(model.id);
      expect(uri.startsWith('openstudio://models/install')).toBe(true);
      expect(uri).toContain(encodeURIComponent(model.id));
    }
  });
});

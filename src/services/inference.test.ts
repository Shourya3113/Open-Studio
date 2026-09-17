import { describe, it, expect, vi } from 'vitest';
import { checkInferenceHealth, streamCompletion } from './inference';

describe('Inference Service', () => {
  it('checks inference health and returns model list', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: 'qwen2.5-coder:1.5b', size: 986000000 },
          { name: 'qwen2.5-coder:7b', size: 4500000000 },
        ],
      }),
    } as any);

    try {
      const health = await checkInferenceHealth('http://localhost:11434');
      expect(health.online).toBe(true);
      expect(health.models.length).toBeGreaterThan(0);
      expect(health.models.some(m => m.name.includes('qwen2.5-coder'))).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('streams tokens and fires onDone completion callback', async () => {
    const tokens: string[] = [];
    let donePayload: any = null;

    await new Promise<void>(async (resolve) => {
      await streamCompletion(
        {
          model: 'qwen2.5-coder:1.5b',
          prompt: 'test prompt',
        },
        (token) => {
          tokens.push(token);
        },
        (stats) => {
          donePayload = stats;
          resolve();
        }
      );
    });

    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.join('')).toContain('Open Studio Resident AI');
    expect(donePayload).not.toBeNull();
    expect(donePayload.eval_count).toBeGreaterThan(0);
  });

  it('supports aborting stream mid-generation', async () => {
    const tokens: string[] = [];
    const onDone = vi.fn();

    const abort = await streamCompletion(
      {
        model: 'qwen2.5-coder:1.5b',
        prompt: 'test prompt',
      },
      (token) => {
        tokens.push(token);
      },
      onDone
    );

    // Abort immediately
    await abort();

    // Wait a bit to verify no more tokens or onDone fired
    await new Promise(r => setTimeout(r, 100));

    expect(onDone).not.toHaveBeenCalled();
    expect(tokens.length).toBeLessThan(8);
  });

  it('supports specifying inference priority levels', async () => {
    const tokens: string[] = [];
    await new Promise<void>(async (resolve) => {
      await streamCompletion(
        {
          model: 'qwen2.5-coder:1.5b',
          prompt: 'test autocomplete priority',
          priority: 'autocomplete',
        },
        (token) => {
          tokens.push(token);
        },
        () => resolve()
      );
    });

    expect(tokens.length).toBeGreaterThan(0);
  });
});
